const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const handleShufersal = require('./scrapers/shufersal');
const handleRamiLevy = require('./scrapers/ramiLevy');
const handleMahsaneyHashuk = require('./scrapers/mahsaneyHashuk');

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
    
    if (supermarket.url.includes('shufersal')) {
      await handleShufersal(page, supermarket, items, io, onResults);
    } else if (supermarket.url.includes('publishedprices.co.il') || supermarket.name.includes('רמי לוי')) {
      await handleRamiLevy(page, supermarket, items, io, onResults, context);
    } else if (supermarket.url.includes('mahsaneyshak')) {
      await handleMahsaneyHashuk(page, supermarket, items, io, onResults);
    }
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Done' }); // Emit Done status on success

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