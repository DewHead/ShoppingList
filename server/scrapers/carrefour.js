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
      await page.goto(transparencyWebsiteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Extract data directly from the page's JavaScript variables
      const pageData = await page.evaluate(() => {
        // @ts-ignore
        if (typeof files !== 'undefined' && typeof branches !== 'undefined') {
          return { files, branches };
        }
        return null;
      });

      if (!pageData) {
        throw new Error('Could not find "files" or "branches" variables on the page.');
      }

      const { files, branches } = pageData;
      this.log(`Extracted ${files.length} files and ${Object.keys(branches).length} branches from page data.`);
      
      // Determine target branch ID
      const branchId = this.supermarket.branch_remote_id || '5304';
      this.log(`Targeting branch ID: ${branchId}`);

      // Filter and sort files for the target branch
      const branchFiles = files.map(f => {
          // Flexible regex to handle different dash counts
          // Format 1: Type[ID]-[Branch]-[TS].gz
          // Format 2: Type[ID]-[Chain]-[Branch]-[Date]-[Time].gz
          const prefixMatch = f.name.match(/^(PriceFull|Price|PromoFull|Promo)\d+/);
          if (!prefixMatch) return null;

          const typePrefix = prefixMatch[1];
          const rest = f.name.substring(prefixMatch[0].length + 1).replace('.gz', '');
          const segments = rest.split('-');
          
          let extractedBranchId = null;
          let timestamp = null;

          if (segments.length === 2) {
              // Format: [Branch]-[TS]
              extractedBranchId = segments[0];
              timestamp = segments[1];
          } else if (segments.length >= 3) {
              // Format: [Chain]-[Branch]-[Date]-[Time] (last two are date/time)
              // Or sometimes [Branch]-[Date]-[Time]
              // Heuristic: the last 8-12 digit segment is likely part of timestamp
              if (segments.length === 4) {
                  extractedBranchId = segments[1];
                  timestamp = segments[2] + (segments[3] || '');
              } else {
                  extractedBranchId = segments[0];
                  timestamp = segments[segments.length - 2];
              }
          }

          if (extractedBranchId) {
              // Normalize branch ID (remove leading zeros for matching if needed, but here we match as string)
              // Actually, branchId 3700 vs 0062. The IDs in the branches object are 3-4 digits.
              // Let's ensure extractedBranchId is padded or compared robustly.
              const normalizedExtracted = extractedBranchId.replace(/^0+/, '');
              const normalizedTarget = branchId.replace(/^0+/, '');

              if (normalizedExtracted === normalizedTarget) {
                return {
                    url: '', // Will construct below
                    name: f.name,
                    type: typePrefix === 'Price' ? 'PRICE' : typePrefix === 'PriceFull' ? 'PRICE_FULL' : typePrefix === 'Promo' ? 'PROMO' : 'PROMO_FULL',
                    branchId: extractedBranchId,
                    timestamp: timestamp,
                    branchName: branches[extractedBranchId] || 'Unknown'
                };
              }
          }
          return null;
      }).filter(f => f);

      this.log(`Filtered down to ${branchFiles.length} files for target branch ${branchId}`);

      branchFiles.forEach(f => {
         // Timestamp format can be YYYYMMDD or YYYYMMDDHHMM
         const datePart = f.timestamp.substring(0, 8);
         f.url = `https://prices.carrefour.co.il/${datePart}/${f.name}`;
      });

      const latestPriceFull = branchFiles
        .filter(l => l.type === 'PRICE_FULL')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      
      const latestPromoFull = branchFiles
        .filter(l => l.type === 'PROMO_FULL')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

      const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);

      this.log(`Found ${filesToProcess.length} target files for store ${branchId}`);
      
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
          this.log('No new files found. This is expected if files have not been uploaded yet today.');
          this.emitStatus('No new files yet. Using existing data.');
          return { products: [], promos: [] };
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