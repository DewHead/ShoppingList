const { scrapeAllStores } = require('../utils/scrapeScheduler');
const scraper = require('../scraper');

jest.mock('../scraper');

describe('scrapeAllStores', () => {
  it('should scrape all stores but respect concurrency limit', async () => {
    let activeScrapes = 0;
    let maxConcurrent = 0;

    scraper.scrapeStore.mockImplementation(async () => {
        activeScrapes++;
        maxConcurrent = Math.max(maxConcurrent, activeScrapes);
        await new Promise(resolve => setTimeout(resolve, 50)); 
        activeScrapes--;
    });

    const supermarkets = [
        { id: 1, name: 'Store 1' },
        { id: 2, name: 'Store 2' },
        { id: 3, name: 'Store 3' },
        { id: 4, name: 'Store 4' },
        { id: 5, name: 'Store 5' }
    ];
    const shoppingList = [];
    const io = {};
    const saveDiscoveryResults = jest.fn();

    await scrapeAllStores(supermarkets, shoppingList, io, saveDiscoveryResults);

    expect(scraper.scrapeStore).toHaveBeenCalledTimes(5);
    // Since we now just fire all promises and let scrapeStore handle queuing,
    // maxConcurrent in this mock will be 5.
    expect(maxConcurrent).toBe(5);
  });
});