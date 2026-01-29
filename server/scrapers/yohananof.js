const BaseScraper = require('./BaseScraper');
const LevyBaseScraper = require('./LevyBaseScraper');
const { randomDelay } = require('../utils/scraperUtils');

class YohananofScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
    this.levyBase = new LevyBaseScraper(this);
  }

  async scrape(page) {
    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      // 1. Login
      const cookieHeader = await this.levyBase.login(page, 'yohananof');
      await randomDelay(5000, 8000); 

      // 2. Discover Files
      this.emitStatus('Scanning for price files...');
      const fileLinks = await this.levyBase.getFileLinks(page);
      this.log(`Found ${fileLinks.length} .gz files in Yohananof portal.`);
      
      const targetStoreId = '001'; // Defaulting to 001 for now
      const filesToProcess = this.levyBase.filterLatestFiles(fileLinks, targetStoreId);
      this.log(`Processing ${filesToProcess.length} latest Full files for Yohananof.`);

      // 3. Process Files
      const branchInfo = this.supermarket.name; 
      for (const file of filesToProcess) {
        const type = file.name.includes('Price') ? 'PRICE' : 'PROMO';
        try {
          this.emitStatus(`Downloading ${type} file for ${branchInfo}`);
          const results = await this.levyBase.processFile(file.url, type, cookieHeader, branchInfo);
          
          if (type === 'PRICE') {
            allDiscoveredProducts.push(...results);
          } else {
            allDiscoveredPromos.push(...results);
          }
        } catch (fileError) {
          console.warn(`Error processing Yohananof file:`, fileError.message);
        }
      }

      this.log(`Final Tally for Yohananof: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found. See server logs.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleYohananof:`, err);
      this.emitStatus('Error in Yohananof handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = YohananofScraper;