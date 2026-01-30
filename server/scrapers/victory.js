const BaseScraper = require('./BaseScraper');
const MarketBaseScraper = require('./MarketBaseScraper');
const { randomDelay } = require('../utils/scraperUtils');

class VictoryScraper extends BaseScraper {
  constructor(supermarket, io) {
    super(supermarket, io);
    this.marketBase = new MarketBaseScraper(this);
  }

  async scrape(page) {
    const url = 'https://laibcatalog.co.il/';
    this.emitStatus(`Navigating to ${url}`);

    const allDiscoveredProducts = [];
    const allDiscoveredPromos = [];

    try {
      this.log(`Victory: Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      this.emitStatus('Setting filters...');
      
      // 1. Chain
      await this.marketBase.selectOption(page, 'chain', 'ויקטורי');
      await randomDelay(2000, 3000);

      // 2. SubChain
      await this.marketBase.selectOption(page, 'subChain', 'ויקטורי');
      await randomDelay(2000, 3000);

      // 3. Branch
      const targetBranch = this.supermarket.branch_remote_id || '97';
      await this.marketBase.selectOption(page, 'branch', targetBranch); 
      await randomDelay(2000, 3000);

      // 4. Type
      await this.marketBase.selectOption(page, 'fileType', 'הכל');
      await randomDelay(1000, 2000);

      this.emitStatus('Searching...');
      const searchBtn = 'input[name*="btnSearch"]';
      if (await page.$(searchBtn)) {
          await page.click(searchBtn);
      }
      
      try {
          await page.waitForSelector('table tr', { timeout: 30000 });
      } catch(e) { this.log('Results table not found (timeout)'); }
      await randomDelay(2000, 3000);

      const fileLinks = await this.marketBase.getFileLinks(page);
      this.log(`Victory: Found ${fileLinks.length} files.`);

      const latestPriceFull = fileLinks.find(f => f.type === 'PRICE_FULL');
      const latestPromoFull = fileLinks.find(f => f.type === 'PROMO_FULL');
      const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);

      if (filesToProcess.length === 0 && fileLinks.length > 0) {
          const p = fileLinks.find(f => f.type === 'PRICE');
          if (p) filesToProcess.push(p);
          const pr = fileLinks.find(f => f.type === 'PROMO');
          if (pr) filesToProcess.push(pr);
      }

      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const branchInfo = `Victory ${targetBranch}`;

      for (const file of filesToProcess) {
          this.emitStatus(`Downloading ${file.type}...`);
          try {
              const results = await this.marketBase.processFile(file.url, file.type, cookieHeader, branchInfo);
              if (file.type.includes('PRICE')) {
                  allDiscoveredProducts.push(...results);
              } else {
                  allDiscoveredPromos.push(...results);
              }
          } catch (err) {
              console.error(`Error processing file ${file.url}:`, err);
          }
      }

      this.log(`Victory: extracted ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} promos.`);

      if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
          throw new Error('Scrape failed: No products or promos found. See server logs.');
      }

      return { products: allDiscoveredProducts, promos: allDiscoveredPromos };

    } catch (err) {
      this.error(`Error in handleVictory:`, err);
      this.emitStatus('Error: ' + err.message);
      throw err;
    }
  }
}

module.exports = VictoryScraper;