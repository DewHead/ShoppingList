const { scrapeStore, getActiveWorkerCount } = require('../scraper');
const { chromium } = require('playwright-extra');

jest.mock('playwright-extra', () => ({
  chromium: {
    use: jest.fn(),
    launch: jest.fn().mockImplementation(() => new Promise(resolve => {
        // Slow launch to simulate concurrent workers
        setTimeout(() => {
            resolve({
                newContext: jest.fn().mockResolvedValue({
                    newPage: jest.fn().mockResolvedValue({
                        close: jest.fn(),
                    }),
                }),
                close: jest.fn(),
            });
        }, 100);
    })),
  },
}));

describe('Worker Pool Concurrency', () => {
  let io;
  let onResults;

  beforeEach(() => {
    io = { emit: jest.fn() };
    onResults = jest.fn();
    jest.clearAllMocks();
  });

  it('should limit active workers to CONCURRENCY_LIMIT (3)', async () => {
    const stores = [
        { id: 1, name: 'Shufersal', url: 'shufersal' },
        { id: 2, name: 'Victory', url: 'victory' },
        { id: 3, name: 'Yohananof', url: 'יוחננוף' },
        { id: 4, name: 'Rami Levy', url: 'rami levy' },
        { id: 5, name: 'Carrefour', url: 'carrefour' }
    ];

    // Trigger many scrapes simultaneously
    const promises = stores.map(s => scrapeStore(s, [], io, onResults));

    // Wait a tiny bit for the first few to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should be exactly 3 (CONCURRENCY_LIMIT)
    expect(getActiveWorkerCount()).toBe(3);

    // Wait for all to finish
    await Promise.all(promises);

    // Should be 0 when done
    expect(getActiveWorkerCount()).toBe(0);
    
    // Should have called launch exactly 5 times (one for each store)
    expect(chromium.launch).toHaveBeenCalledTimes(5);
  });
});
