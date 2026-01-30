const BaseScraper = require('./BaseScraper');
const LevyBaseScraper = require('./LevyBaseScraper');
const { randomDelay } = require('../utils/scraperUtils');

class TivTaamScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
    this.levyBase = new LevyBaseScraper(this);
  }

  async scrape(page) {
    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      // 1. Login
      const cookieHeader = await this.levyBase.login(page, 'TivTaam');
      await randomDelay(3000, 6000); 

      // 2. Discover Files
      this.emitStatus('Scanning for price files...');
      const fileLinks = await this.levyBase.getFileLinks(page);
      
      const targetStoreId = this.supermarket.branch_remote_id || '515';
      const filesToProcess = this.levyBase.filterLatestFiles(fileLinks, targetStoreId);
      this.log(`Processing ${filesToProcess.length} latest files for Store ID ${targetStoreId}.`);

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
          console.warn(`Error processing Tiv Taam file:`, fileError.message);
        }
      }

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleTivTaam:`, err);
      this.emitStatus('Error in Tiv Taam handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = TivTaamScraper;
