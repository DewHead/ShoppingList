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
      
      // Determine target branch ID
      let branchId = '3700'; // Default to Neve Zeev as per previous logs
      // Try to find a matching branch based on supermarket name if possible
      const storeName = this.supermarket.name || '';
      // Clean up store name for matching (remove "קרפור מרקט" etc if needed, or just search)
      // The branches object keys are IDs, values are names like "002 - קרפור מרקט אשקלון חאן"
      
      let foundBranchId = null;
      
      // Simple heuristic: search for significant part of the name in the branch list
      // e.g. "נווה זאב"
      const nameParts = storeName.replace(/[()]/g, '').split(' ').filter(p => p.length > 2 && p !== 'קרפור' && p !== 'מרקט' && p !== 'סיטי' && p !== 'היפר');
      
      if (nameParts.length > 0) {
        for (const [id, name] of Object.entries(branches)) {
           if (nameParts.every(part => name.includes(part))) {
               foundBranchId = id;
               break;
           }
        }
      }

      if (foundBranchId) {
          this.emitStatus(`Identified branch ID ${foundBranchId} for "${storeName}"`);
          branchId = foundBranchId;
      } else {
          this.emitStatus(`Could not automatically identify branch for "${storeName}". Defaulting to ${branchId} (Neve Zeev).`);
      }

      this.log(`Targeting branch ID: ${branchId}`);

      // Filter and sort files for the target branch
      const branchFiles = files.map(f => {
          // Filename format example: Price7290055700007-2960-202601292300.gz
          // Format seems to be: [Type][ProviderID]-[BranchID]-[Timestamp].gz
          // Or sometimes 5 parts? verify regex.
          // Based on debug HTML: Price7290055700007-2960-202601292300.gz
          // Type: Price, Provider: 7290055700007, Branch: 2960, TS: 202601292300
          
          const match = f.name.match(/^(PriceFull|Price|PromoFull|Promo)\d+-(\d+)-(\d+)\.gz$/);
          if (match) {
              return {
                  url: `https://prices.carrefour.co.il/${match.input.split('-')[2].substring(0, 8)}/${f.name}`, // Construct URL: domain/date/filename
                  // Wait, the path in script was '20260129'. We should probably grab 'path' variable too or infer it.
                  // Let's assume the date part of timestamp is the path.
                  // Timestamp: YYYYMMDDHHMM -> 202601292300 -> date 20260129
                  
                  name: f.name,
                  type: match[1] === 'Price' ? 'PRICE' : match[1] === 'PriceFull' ? 'PRICE_FULL' : match[1] === 'Promo' ? 'PROMO' : 'PROMO_FULL',
                  branchId: match[2],
                  timestamp: match[3],
                  branchName: branches[match[2]] || 'Unknown'
              };
          }
          return null;
      }).filter(f => f && f.branchId === branchId);

      // Verify URL construction. In HTML: 
      // path = '20260129';
      // href="https://prices.carrefour.co.il/20260129/Price..."
      // So yes, it is https://prices.carrefour.co.il/<DATE_PART>/<FILENAME>
      
      branchFiles.forEach(f => {
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