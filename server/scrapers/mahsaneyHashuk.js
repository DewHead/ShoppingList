const xml2js = require('xml2js');
const zlib = require('zlib');
const BaseScraper = require('./BaseScraper');
const { randomDelay, axiosGetWithRetry, fixSpacing, formatPromo } = require('../utils/scraperUtils');

class MahsaneyHashukScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
  }

  async scrape(page) {
    const url = 'https://laibcatalog.co.il/';
    this.emitStatus(`Navigating to ${url}`);

    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      this.emitStatus('Setting filters...');

      // Helper to select and log
      const selectAndLog = async (partialName, labelText) => {
          const selector = `select[name*="${partialName}"]`;
          try {
              await page.waitForSelector(selector, { timeout: 10000 });
              const options = await page.$$eval(`${selector} option`, opts => opts.map(o => ({ text: o.innerText.trim(), value: o.value })));
              
              // Try fuzzy match
              const target = options.find(o => o.text.includes(labelText));
              if (target) {
                  this.log(`Selecting '${labelText}' in ${partialName} (Value: ${target.value})`);
                  await page.selectOption(selector, target.value);
                  return true;
              } else {
                  this.log(`Option '${labelText}' not found in ${partialName}. Available (first 5): ${options.slice(0, 5).map(o => o.text)}`);
                  return false;
              }
          } catch (e) {
              this.error(`Error selecting ${labelText} in ${partialName}:`, e.message);
              return false;
          }
      };

      // 1. Chain (name="ctl00$MainContent$chain")
      let chainSuccess = await selectAndLog('chain', 'מחסני השוק');
      if (!chainSuccess) {
          chainSuccess = await selectAndLog('chain', 'מסחני השוק');
      }
      await randomDelay(3000, 5000);

      // 2. SubChain (name="ctl00$MainContent$subChain")
      if (chainSuccess) {
          await selectAndLog('subChain', 'מחסני השוק');
          await randomDelay(3000, 5000);
      }

      // 3. Branch (name="ctl00$MainContent$branch")
      await selectAndLog('branch', 'בית אשל'); 
      await randomDelay(3000, 5000);

      // 4. Type (name="ctl00$MainContent$fileType")
      await selectAndLog('fileType', 'הכל');
      await randomDelay(1000, 2000);

      this.emitStatus('Searching...');
      
      // Click Search
      const searchBtn = 'input[name*="btnSearch"]';
      if (await page.$(searchBtn)) {
          await page.click(searchBtn);
      } else {
          console.error('Search button not found');
      }
      
      // Wait for results
      try {
          await page.waitForSelector('table tr', { timeout: 60000 });
      } catch(e) { this.log('Results table not found (timeout)'); }
      await randomDelay(2000, 3000);

      const fileLinks = await page.$$eval('table tr', (rows) => {
          const links = [];
          rows.forEach(row => {
              const link = row.querySelector('a');
              const fileName = row.innerText;
              if (link && link.href) {
                  let type = 'OTHER';
                  // Enhanced detection
                  if (fileName.includes('PriceFull') || fileName.includes('מחירים מלא')) type = 'PRICE_FULL';
                  else if (fileName.includes('Price') || fileName.includes('מחירים')) type = 'PRICE';
                  else if (fileName.includes('PromoFull') || fileName.includes('מבצעים מלא')) type = 'PROMO_FULL';
                  else if (fileName.includes('Promo') || fileName.includes('מבצעים')) type = 'PROMO';
                  
                  if (type !== 'OTHER') {
                      links.push({ url: link.href, type, name: fileName.trim() });
                  }
              }
          });
          return links;
      });

      this.log(`Mahsaney Hashuk: Found ${fileLinks.length} files.`);
      if (fileLinks.length > 0) this.log(`First 3 files: ${JSON.stringify(fileLinks.slice(0, 3))}`);

      const latestPriceFull = fileLinks.find(f => f.type === 'PRICE_FULL');
      const latestPromoFull = fileLinks.find(f => f.type === 'PROMO_FULL');
      
      const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);
      
      if (filesToProcess.length === 0 && fileLinks.length > 0) {
          this.log('No Full files found, attempting partials.');
          const p = fileLinks.find(f => f.type === 'PRICE');
          if (p) filesToProcess.push(p);
          const pr = fileLinks.find(f => f.type === 'PROMO');
          if (pr) filesToProcess.push(pr);
      }

      this.log(`Files to process: ${filesToProcess.length}`);

      const context = page.context();
      const cookies = await context.cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      for (const file of filesToProcess) {
          this.emitStatus(`Downloading ${file.type}...`);
          this.log(`Attempting to download ${file.url} (${file.type})`);
          
          try {
              const response = await axiosGetWithRetry(file.url, 3, 2000, cookieHeader);
              this.log(`Download success. Size: ${response.data.length}`);
              
              let xmlContent;
              try {
                  xmlContent = zlib.gunzipSync(response.data).toString('utf8');
              } catch (e) {
                  this.log('Gunzip failed, treating as plain text.');
                  xmlContent = response.data.toString('utf8');
              }

              const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
              const result = await parser.parseStringPromise(xmlContent);
              const root = result.root || result.Root || result.Prices || result.Promos; 
              
              if (!root) {
                  console.error('XML parsing failed: Root not found', Object.keys(result));
                  continue;
              }

              if (file.type.includes('PRICE')) {
                  let products = [];
                  if (root.Items && root.Items.Item) products = root.Items.Item;
                  else if (root.Products && root.Products.Product) products = root.Products.Product;
                  
                  const productArray = Array.isArray(products) ? products : [products].filter(p => p);
                  this.log(`Found ${productArray.length} items in PRICE file.`);

                  for (const product of productArray) {
                    allDiscoveredProducts.push({
                      supermarket_id: this.supermarket.id,
                      item_id: null,
                      remote_id: product.ItemCode,
                      remote_name: fixSpacing(product.ItemName),
                      branch_info: 'ב"ש-בית אשל',
                      price: parseFloat(product.ItemPrice),
                      unit_of_measure: product.UnitOfMeasure || null,
                      unit_of_measure_price: parseFloat(product.UnitOfMeasurePrice) || null,
                      manufacturer: product.ManufacturerName || null,
                      country: product.ManufactureCountry || null,
                      last_updated: new Date().toISOString(),
                    });
                  }
                  this.emitStatus(`Processed ${productArray.length} items`);
              } else if (file.type.includes('PROMO')) {
                  let promos = [];
                  if (root.Promotions && root.Promotions.Promotion) promos = root.Promotions.Promotion;
                  else if (root.Promotion) promos = root.Promotion;
                  else if (root.Sales && root.Sales.Sale) promos = root.Sales.Sale;
                  
                  if (!promos || (Array.isArray(promos) && promos.length === 0)) {
                      this.log(`Debug Promos Root Keys: ${Object.keys(root)}`);
                  }

                  const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);
                  this.log(`Found ${promoArray.length} promos in PROMO file.`);

                  let debugLogged = false;
                  for (const promo of promoArray) {
                      try {
                          let promoItems = [];
                          
                          if (promo.ItemCode) {
                              // Flat structure: promo is the item
                              promoItems = [promo];
                          } else if (promo.PromotionItems && promo.PromotionItems.Item) {
                              promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
                          } else if (promo.PromotionItems && Array.isArray(promo.PromotionItems)) {
                              promoItems = promo.PromotionItems;
                          } else if (promo.Items && promo.Items.Item) {
                              promoItems = Array.isArray(promo.Items.Item) ? promo.Items.Item : [promo.Items.Item];
                          }
                          
                          if (promoItems.length === 0 && !debugLogged) {
                              this.log(`Debug Promo Structure: ${JSON.stringify(promo).substring(0, 500)}`);
                              debugLogged = true;
                          }

                          if (promoItems.length > 0) {
                              for (const pi of promoItems) {
                                if (pi && pi.ItemCode) {
                                    const pId = pi.PromotionID || promo.PromotionID;
                                    const pDesc = pi.PromotionDescription || promo.PromotionDescription;

                                    allDiscoveredPromos.push({
                                        supermarket_id: this.supermarket.id,
                                        branch_info: 'ב"ש-בית אשל',
                                        remote_id: pi.ItemCode,
                                        promo_id: pId,
                                        description: formatPromo(pDesc),
                                        last_updated: new Date().toISOString()
                                    });
                                }
                              }
                          }
                      } catch (e) {}
                  }
                  this.emitStatus(`Processed ${promoArray.length} promos`);
              }

          } catch (err) {
              console.error(`Error processing file ${file.url}:`, err);
          }
      }

      this.log(`Mahsaney Hashuk: extracted ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found. See server logs.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleMahsaneyHashuk:`, err);
      this.emitStatus('Error: ' + err.message);
      throw err;
    }
  }
}

module.exports = MahsaneyHashukScraper;