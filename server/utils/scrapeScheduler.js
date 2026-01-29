const { scrapeStore } = require('../scraper');

async function scrapeAllStores(supermarkets, shoppingList, io, saveDiscoveryResults) {
    const CONCURRENCY_LIMIT = 3; // Prevent resource exhaustion
    const queue = [...supermarkets];
    
    const worker = async () => {
        while (queue.length > 0) {
            const s = queue.shift();
            if (s) { // Double check inside loop
                try {
                    await scrapeStore(s, shoppingList, io, saveDiscoveryResults);
                } catch (err) {
                     console.error(`Scheduler error for ${s.name}:`, err);
                }
            }
        }
    };

    const workers = [];
    const workerCount = Math.min(CONCURRENCY_LIMIT, supermarkets.length);
    
    for (let i = 0; i < workerCount; i++) {
        workers.push(worker());
    }
    
    await Promise.all(workers);
}

module.exports = { scrapeAllStores };