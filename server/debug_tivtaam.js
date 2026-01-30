const { initDb } = require('./db');
const TivTaamScraper = require('./scrapers/tivTaam');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { validateProduct } = require('./utils/validation');

chromium.use(stealth);

async function runDebug() {
    const db = await initDb();
    const supermarket = await db.get('SELECT * FROM supermarkets WHERE name LIKE ?', ['%טיב טעם%']);
    
    if (!supermarket) {
        console.error('Tiv Taam not found in DB. Run the migration first.');
        process.exit(1);
    }

    console.log(`Starting debug scrape for ${supermarket.name} (ID: ${supermarket.id}, Store ID: ${supermarket.branch_remote_id})`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const mockIo = {
        emit: (event, data) => console.log(`[Socket ${event}]`, data)
    };

    try {
        const scraper = new TivTaamScraper(supermarket, mockIo);
        const { products, promos } = await scraper.scrape(page);

        console.log(`Scrape finished. Found ${products.length} products and ${promos.length} promos.`);

        if (products.length > 0) {
            console.log('Sample product:', products[0]);
            
            // Minimal save logic for verification
            await db.run('BEGIN TRANSACTION');
            try {
                // Just save the first 10 for verification to keep it fast
                const insertItemStmt = await db.prepare('INSERT OR IGNORE INTO items (name) VALUES (?)');
                const insertSupermarketItemStmt = await db.prepare(`
                    INSERT OR REPLACE INTO supermarket_items (
                        supermarket_id, item_id, remote_id, remote_name, branch_info, 
                        price, unit_of_measure, unit_of_measure_price, manufacturer, country, last_updated
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                for (let i = 0; i < Math.min(10, products.length); i++) {
                    const item = products[i];
                    await insertItemStmt.run(item.remote_name);
                    const itemRow = await db.get('SELECT id FROM items WHERE name = ?', [item.remote_name]);
                    await insertSupermarketItemStmt.run(
                        supermarket.id,
                        itemRow.id,
                        item.remote_id,
                        item.remote_name,
                        item.branch_info,
                        item.price,
                        item.unit_of_measure,
                        item.unit_of_measure_price,
                        item.manufacturer,
                        item.country,
                        new Date().toISOString()
                    );
                }
                await insertItemStmt.finalize();
                await insertSupermarketItemStmt.finalize();
                await db.run('COMMIT');
                console.log('Saved first 10 items to DB successfully.');
            } catch (err) {
                await db.run('ROLLBACK');
                throw err;
            }
        }

    } catch (err) {
        console.error('Debug scrape failed:', err);
    } finally {
        await browser.close();
        await db.close();
    }
}

runDebug();
