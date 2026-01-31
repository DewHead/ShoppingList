const { SaxesParser } = require('saxes');
const zlib = require('zlib');
const BaseScraper = require('./BaseScraper');
const { randomDelay, axiosGetWithRetry, fixSpacing, formatPromo } = require('../utils/scraperUtils');

class ShufersalScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
  }

  async parseXmlStreaming(buffer, type, fileLinkName, allDiscoveredProducts, _allDiscoveredPromos) {
    return new Promise((resolve, reject) => {
      const parser = new SaxesParser();
      let currentTag = null;
      let currentItem = {};
      let inItem = false;
      let textContent = '';

      parser.on('opentag', (node) => {
        currentTag = node.name;
        if (node.name === 'Item' || node.name === 'Promotion') {
          inItem = true;
          currentItem = {};
        }
        textContent = '';
      });

      parser.on('text', (text) => {
        textContent += text;
      });

      parser.on('closetag', (node) => {
        if (node.name === 'Item' || node.name === 'Promotion') {
          inItem = false;
          if (type === 'PRICE_FULL') {
            allDiscoveredProducts.push({
              supermarket_id: this.supermarket.id,
              item_id: null,
              remote_id: currentItem.ItemCode,
              remote_name: fixSpacing(currentItem.ItemName),
              branch_info: fileLinkName,
              price: parseFloat(currentItem.ItemPrice),
              unit_of_measure: currentItem.UnitOfMeasure || null,
              unit_of_measure_price: parseFloat(currentItem.UnitOfMeasurePrice) || null,
              manufacturer: currentItem.ManufacturerName || null,
              country: currentItem.ManufactureCountry || null,
              last_updated: new Date().toISOString(),
            });
            if (allDiscoveredProducts.length % 500 === 0) {
                this.emitStatus(`Processed ${allDiscoveredProducts.length} items...`);
            }
          }
        } else if (inItem) {
          currentItem[node.name] = textContent.trim();
        }
      });

      parser.on('end', () => resolve());
      parser.on('error', (err) => reject(err));

      try {
        const decompressed = zlib.gunzipSync(buffer);
        parser.write(decompressed.toString('utf8')).close();
      } catch (err) {
        reject(err);
      }
    });
  }

  async scrape(page) {
    const transparencyWebsiteUrl = 'https://prices.shufersal.co.il/';
    this.emitStatus(`Navigating to price transparency website: ${transparencyWebsiteUrl}`);

    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      await page.goto(transparencyWebsiteUrl, { waitUntil: 'networkidle', timeout: 60000 });

      // Target Store: 413
      this.emitStatus(`Filtering for store 413...`);
      await page.selectOption('#ddlStore', '413'); 
      await randomDelay(3000, 5000); 

      await page.selectOption('#ddlCategory', '0'); // "All" categories
      await randomDelay(2000, 3000);

      const pageFileLinks = await page.$$eval('table.webgrid tbody tr', (rows) => {
        const links = [];
        rows.forEach(row => {
          const downloadLink = row.querySelector('td:first-child a[href*=".gz"]');
          const branchCell = row.querySelector('td:nth-child(6)');
          const branchText = branchCell ? branchCell.innerText.trim() : '';
          
          if (downloadLink) {
            const href = downloadLink.href;
            let type = 'OTHER';
            if (href.includes('PriceFull')) type = 'PRICE_FULL';
            else if (href.includes('Price')) type = 'PRICE';
            else if (href.includes('PromoFull')) type = 'PROMO_FULL';
            else if (href.includes('Promo')) type = 'PROMO';
            
            if (type !== 'OTHER' && !href.includes('Stores')) {
                const tsMatch = href.match(/-(\d{12})\.gz/);
                const timestamp = tsMatch ? tsMatch[1] : '0';
                links.push({ url: href, branchName: branchText, type, timestamp });
            }
          }
        });
        return links;
      });

      const latestPriceFull = pageFileLinks
        .filter(l => l.type === 'PRICE_FULL')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      
      const latestPromoFull = pageFileLinks
        .filter(l => l.type === 'PROMO_FULL')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

      const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);

      this.log(`Found ${filesToProcess.length} target files for store 413`);
      
      for (const fileLink of filesToProcess) {
        this.emitStatus(`Downloading ${fileLink.type} for ${fileLink.branchName}`);
        try {
          const response = await axiosGetWithRetry(fileLink.url);
          
          if (fileLink.type === 'PRICE_FULL') {
              await this.parseXmlStreaming(response.data, 'PRICE_FULL', fileLink.branchName, allDiscoveredProducts, allDiscoveredPromos);
          } else if (fileLink.type === 'PROMO_FULL') {
              const decompressed = zlib.gunzipSync(response.data);
              const xml = decompressed.toString('utf8');
              const xml2js = require('xml2js');
              const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
              const result = await parser.parseStringPromise(xml);
              const root = result.root || result.Root;
              const promos = root && root.Promotions ? root.Promotions.Promotion : [];
              const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);

              for (const promo of promoArray) {
                  try {
                      let promoItems = [];
                      if (promo.PromotionItems && promo.PromotionItems.Item) {
                          promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
                      }
                      
                      if (promoItems.length > 0) {
                          for (const pi of promoItems) {
                            if (pi && pi.ItemCode) {
                                allDiscoveredPromos.push({
                                    supermarket_id: this.supermarket.id,
                                    branch_info: fileLink.branchName,
                                    remote_id: pi.ItemCode,
                                    promo_id: promo.PromotionId,
                                    description: formatPromo(promo.PromotionDescription),
                                    last_updated: new Date().toISOString()
                                });
                            }
                          }
                      } else if (promo.ItemCode) {
                        allDiscoveredPromos.push({
                            supermarket_id: this.supermarket.id,
                            branch_info: fileLink.branchName,
                            remote_id: promo.ItemCode,
                            promo_id: promo.PromotionId,
                            description: formatPromo(promo.PromotionDescription),
                            last_updated: new Date().toISOString()
                        });
                      }
                  } catch (e) {}
              }
          }
        } catch (fileError) {
          this.error(`Error processing file ${fileLink.url}:`, fileError.message);
        }
      }

      this.log(`Final Tally for Shufersal: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          this.log('No new files found. This is expected if files have not been uploaded yet today.');
          this.emitStatus('No new files yet. Using existing data.');
          return { products: [], promos: [] };
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleShufersal:`, err);
      this.emitStatus('Error in Shufersal handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = ShufersalScraper;
