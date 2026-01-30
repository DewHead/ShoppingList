const { scrapeStore } = require('../scraper');

async function scrapeAllStores(supermarkets, shoppingList, io, saveDiscoveryResults) {
    // We can now just fire them all, and scrapeStore will handle the queuing/concurrency
    const promises = supermarkets.map(s => 
        scrapeStore(s, shoppingList, io, saveDiscoveryResults)
            .catch(err => console.error(`Scheduler error for ${s.name}:`, err))
    );
    
    await Promise.all(promises);
}

module.exports = { scrapeAllStores };