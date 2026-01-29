const xml2js = require('xml2js');
const zlib = require('zlib');
const BaseScraper = require('./BaseScraper');
const { randomDelay, axiosGetWithRetry, fixSpacing, formatPromo } = require('../utils/scraperUtils');

class CarrefourScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
  }

  async scrape(page) {
    const transparencyWebsiteUrl = 'https://prices.carrefour.co.il/';
    this.emitStatus(`Navigating to Carrefour price transparency website: ${transparencyWebsiteUrl}`);

    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      await page.goto(transparencyWebsiteUrl, { waitUntil: 'networkidle', timeout: 60000 });

      // Target Store: 5304
      this.emitStatus(`Filtering for store 5304...`);
      await page.selectOption('#ddlStore', '5304'); 
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

      this.log(`Found ${filesToProcess.length} target files for store 5304`);
      
      for (const fileLink of filesToProcess) {
        this.emitStatus(`Downloading ${fileLink.type} for ${fileLink.branchName}`);
        try {
          const response = await axiosGetWithRetry(fileLink.url);
          const decompressed = zlib.gunzipSync(response.data);
          const xml = decompressed.toString('utf8');

          const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
          const result = await parser.parseStringPromise(xml);
          const root = result.root || result.Root;
          
          if (fileLink.type === 'PRICE_FULL') {
              const products = root && root.Items ? root.Items.Item : []; 
              const productArray = Array.isArray(products) ? products : [products].filter(p => p);

              for (const product of productArray) {
                allDiscoveredProducts.push({
                  supermarket_id: this.supermarket.id,
                  item_id: null,
                  remote_id: product.ItemCode,
                  remote_name: fixSpacing(product.ItemName),
                  branch_info: fileLink.branchName,
                  price: parseFloat(product.ItemPrice),
                  unit_of_measure: product.UnitOfMeasure || null,
                  unit_of_measure_price: parseFloat(product.UnitOfMeasurePrice) || null,
                  manufacturer: product.ManufacturerName || null,
                  country: product.ManufactureCountry || null,
                  last_updated: new Date().toISOString(),
                });
              }
              this.emitStatus(`Processed ${productArray.length} items`);
          } else if (fileLink.type === 'PROMO_FULL') {
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
              this.emitStatus(`Processed ${promoArray.length} promos`);
          }
        } catch (fileError) {
          this.error(`Error processing file ${fileLink.url}:`, fileError.message);
        }
      }

      this.log(`Final Tally for Carrefour: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found. See server logs.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleCarrefour:`, err);
      this.emitStatus('Error in Carrefour handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = CarrefourScraper;