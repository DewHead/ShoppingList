const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const ShufersalScraper = require('./scrapers/shufersal');
const RamiLevyScraper = require('./scrapers/ramiLevy');
const MahsaneyHashukScraper = require('./scrapers/mahsaneyHashuk');
const YohananofScraper = require('./scrapers/yohananof');
const KeshetTeamimScraper = require('./scrapers/keshetTeamim');
const VictoryScraper = require('./scrapers/victory');
const CarrefourScraper = require('./scrapers/carrefour');
const TivTaamScraper = require('./scrapers/tivTaam');

chromium.use(stealth);

const SCRAPE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const CONCURRENCY_LIMIT = 3;

let activeWorkers = 0;
const scrapeQueue = [];

async function processQueue() {
  if (activeWorkers >= CONCURRENCY_LIMIT || scrapeQueue.length === 0) return;

  activeWorkers++;
  const { supermarket, items, io, onResults, resolve, reject } = scrapeQueue.shift();

  try {
    await performScrape(supermarket, items, io, onResults);
    resolve();
  } catch (err) {
    reject(err);
  } finally {
    activeWorkers--;
    processQueue();
  }
}

function scrapeStore(supermarket, items, io, onResults) {
  return new Promise((resolve, reject) => {
    // Cache check
    if (supermarket.last_scrape_time) {
      const lastScrape = new Date(supermarket.last_scrape_time).getTime();
      if (Date.now() - lastScrape < SCRAPE_TTL) {
        console.log(`[Cache] Skipping scrape for ${supermarket.name} (last scrape was ${Math.round((Date.now() - lastScrape) / 60000)} mins ago)`);
        io.emit('storeStatus', { storeId: supermarket.id, status: 'Done (Skipping - Recently updated)' });
        return resolve();
      }
    }

    scrapeQueue.push({ supermarket, items, io, onResults, resolve, reject });
    processQueue();
  });
}

async function performScrape(supermarket, items, io, onResults) {
  console.log(`[Worker] Starting scrape for ${supermarket.name}...`);
  io.emit('storeStatus', { storeId: supermarket.id, status: 'Launching browser...' });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Starting scrape...' });
    
    let scraper;
    const name = supermarket.name.toLowerCase();
    const url = supermarket.url.toLowerCase();

    if (url.includes('shufersal')) {
      scraper = new ShufersalScraper(supermarket, io);
    } else if (name.includes('טיב טעם')) {
      scraper = new TivTaamScraper(supermarket, io);
    } else if (name.includes('יוחננוף')) {
      scraper = new YohananofScraper(supermarket, io);
    } else if (name.includes('קשת טעמים')) {
      scraper = new KeshetTeamimScraper(supermarket, io);
    } else if (url.includes('publishedprices.co.il') || name.includes('רמי לוי')) {
      scraper = new RamiLevyScraper(supermarket, io);
    } else if (name.includes('ויקטורי')) {
      scraper = new VictoryScraper(supermarket, io);
    } else if (url.includes('mahsaneyshak') || name.includes('מחסני השוק')) {
      scraper = new MahsaneyHashukScraper(supermarket, io);
    } else if (url.includes('carrefour')) {
      scraper = new CarrefourScraper(supermarket, io);
    }

    if (scraper) {
      io.emit('storeStatus', { storeId: supermarket.id, status: 'Initializing scraper...' });
      const { products, promos } = await scraper.scrape(page);
      
      io.emit('storeStatus', { storeId: supermarket.id, status: 'Scraper started...' });
      const { products, promos } = await scraper.scrape(page);
      
      io.emit('storeStatus', { storeId: supermarket.id, status: 'Saving results to database...' });
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

function getActiveWorkerCount() {
  return activeWorkers;
}

module.exports = { scrapeStore, getActiveWorkerCount };