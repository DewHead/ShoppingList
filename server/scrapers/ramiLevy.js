const BaseScraper = require('./BaseScraper');
const LevyBaseScraper = require('./LevyBaseScraper');
const { randomDelay } = require('../utils/scraperUtils');

class RamiLevyScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
    this.levyBase = new LevyBaseScraper(this);
  }

  async scrape(page) {
    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      // 1. Login
      const cookieHeader = await this.levyBase.login(page, 'RamiLevi');
      await randomDelay(5000, 8000); 

      // 2. Discover Files
      this.emitStatus('Scanning for price files...');
      const fileLinks = await this.levyBase.getFileLinks(page);
      this.log(`Found ${fileLinks.length} .gz files in Rami Levy portal.`);
      
      const targetStoreId = '039';
      const filesToProcess = this.levyBase.filterLatestFiles(fileLinks, targetStoreId);
      this.log(`Processing ${filesToProcess.length} latest Full files for Rami Levy.`);

      // 3. Process Files
      const branchInfo = this.supermarket.name; 
      for (const file of filesToProcess) {
        const type = file.name.toLowerCase().includes('price') ? 'PRICE' : 'PROMO';
        try {
          this.emitStatus(`Downloading ${type} file for ${branchInfo}`);
          const results = await this.levyBase.processFile(file.url, type, cookieHeader, branchInfo, page);
          
          if (type === 'PRICE') {
            allDiscoveredProducts.push(...results);
          } else {
            allDiscoveredPromos.push(...results);
          }
        } catch (fileError) {
          console.warn(`Error processing Rami Levy file:`, fileError.message);
        }
      }

      this.log(`Final Tally for Rami Levy: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          this.log('No new files found. This is expected if files have not been uploaded yet today.');
          this.emitStatus('No new files yet. Using existing data.');
          return { products: [], promos: [] };
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleRamiLevy:`, err);
      this.emitStatus('Error in Rami Levy handler: ' + err.message);
      throw err;
    }
  }
}

module.exports = RamiLevyScraper;