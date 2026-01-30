const BaseScraper = require('./BaseScraper');
const LevyBaseScraper = require('./LevyBaseScraper');
const { randomDelay } = require('../utils/scraperUtils');

class KeshetTeamimScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
    this.levyBase = new LevyBaseScraper(this);
  }

  async scrape(page) {
    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      // 1. Login
      const cookieHeader = await this.levyBase.login(page, 'Keshet');
      await randomDelay(5000, 8000); 

      // 2. Discover Files
      this.emitStatus('Scanning for price files...');
      const fileLinks = await this.levyBase.getFileLinks(page);
      this.log(`Found ${fileLinks.length} .gz files in Keshet Teamim portal.`);
      
      const targetStoreId = this.supermarket.branch_remote_id || '018';
      const filesToProcess = this.levyBase.filterLatestFiles(fileLinks, targetStoreId);
      this.log(`Processing ${filesToProcess.length} latest Full files for Keshet Teamim for Store ID ${targetStoreId}.`);

      // 3. Process Files
      const branchInfo = this.supermarket.name; 
      for (const file of filesToProcess) {
        const type = file.name.includes('Price') ? 'PRICE' : 'PROMO';
        try {
          this.emitStatus(`Downloading ${type} file for ${branchInfo}`);
          const results = await this.levyBase.processFile(file.url, type, cookieHeader, branchInfo);
          
          if (type === 'PRICE') {
            const cleaned = results.map(p => {
              let name = p.remote_name.replace(/unknown/gi, '').replace(/\s+/g, ' ').trim();
              
              // Normalize weighted items (fruits, vegetables, meat)
              // Keshet often has Quantity 1.00 or 0.00 and UnitOfMeasure 'Unknown ' (note the space) or 'קילוגרם'
              const unit = (p.unit_of_measure || '').toLowerCase().trim();
              const isShortCode = p.remote_id && p.remote_id.length <= 4;
              
              if (unit === 'unknown' || unit === 'קג' || unit === 'ק"ג' || unit === 'קילוגרם' || !unit) {
                // Replace 1.00 with 1 ק"ג - handle various spacings
                if (name.includes('1.00')) {
                  name = name.replace(/1\.00/g, '1 ק"ג');
                } else if (name.includes(' 1.0')) {
                  name = name.replace(/\s1\.0(\s|$)/g, ' 1 ק"ג$1');
                }
                
                // Remove trailing or leading 0.00 which is often used for weighted items
                name = name.replace(/\s0\.00(\s|$)/g, '$1').replace(/^0\.00\s/g, '');

                // For short codes (produce/meat), ensure it has a weight if missing
                if (isShortCode && !name.includes('ק"ג') && !name.includes('קג')) {
                  if (!/\d+(\.\d+)?$/.test(name)) {
                    name += ' 1 ק"ג';
                  }
                }
              }

              // Final normalization: "1 קג" -> "1 ק"ג", remove redundant "1 ק"ג 1 ק"ג"
              name = name.replace(/1\s*קג/g, '1 ק"ג');
              name = name.replace(/1 ק"ג 1 ק"ג/g, '1 ק"ג');
              name = name.replace(/1 ק"ג\s*1 ק"ג/g, '1 ק"ג');
              
              return {
                ...p,
                remote_name: name.replace(/\s+/g, ' ').trim()
              };
            });
            allDiscoveredProducts.push(...cleaned);
          } else {
            const cleaned = results.map(p => ({
              ...p,
              description: p.description.replace(/unknown/gi, '').replace(/\s+/g, ' ').trim()
            }));
            allDiscoveredPromos.push(...cleaned);
          }
        } catch (fileError) {
          console.warn(`Error processing Keshet Teamim file:`, fileError.message);
        }
      }

      this.log(`Final Tally for Keshet Teamim: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found. See server logs.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleKeshetTeamim:`, err);
      this.emitStatus('Error in Keshet Teamim handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = KeshetTeamimScraper;
