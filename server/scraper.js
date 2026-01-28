const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const ShufersalScraper = require('./scrapers/shufersal');
const RamiLevyScraper = require('./scrapers/ramiLevy');
const MahsaneyHashukScraper = require('./scrapers/mahsaneyHashuk');

chromium.use(stealth);

async function scrapeStore(supermarket, items, io, onResults) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Starting scrape...' });
    
    let scraper;
    if (supermarket.url.includes('shufersal')) {
      scraper = new ShufersalScraper(supermarket, io);
    } else if (supermarket.url.includes('publishedprices.co.il') || supermarket.name.includes('רמי לוי')) {
      scraper = new RamiLevyScraper(supermarket, io);
    } else if (supermarket.url.includes('mahsaneyshak')) {
      scraper = new MahsaneyHashukScraper(supermarket, io);
    }

    if (scraper) {
      const { products, promos } = await scraper.scrape(page);
      
      if (onResults) {
        await onResults(supermarket.id, products, promos);
      }
      
      io.emit('results', { 
        storeId: supermarket.id, 
        results: [], 
        coupons: [], 
        discoveryResults: products, 
        promos: promos 
      });
      
      io.emit('storeStatus', { storeId: supermarket.id, status: 'Done' });
    } else {
      throw new Error(`No scraper found for supermarket: ${supermarket.name}`);
    }

  } catch (err) {
    console.error(`Error scraping ${supermarket.name}:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error: ' + err.message });
  } finally {
    try {
      if (browser) await browser.close();
    } catch (closeErr) {
      console.error(`Error closing browser for ${supermarket.name}:`, closeErr);
    }
  }
}

module.exports = { scrapeStore };
