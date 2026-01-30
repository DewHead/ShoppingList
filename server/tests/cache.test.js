const { scrapeStore } = require('../scraper');
const { chromium } = require('playwright-extra');

jest.mock('playwright-extra', () => ({
  chromium: {
    use: jest.fn(),
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn(),
        }),
      }),
      close: jest.fn(),
    }),
  },
}));

describe('Scraper Cache (TTL)', () => {
  let io;
  let onResults;

  beforeEach(() => {
    io = { emit: jest.fn() };
    onResults = jest.fn();
    jest.clearAllMocks();
  });

  it('should skip scraping if last_scrape_time is within TTL (1 hour)', async () => {
    const recently = new Date(Date.now() - 30 * 60000).toISOString(); // 30 mins ago
    const supermarket = { id: 1, name: 'Test Store', url: 'http://test.com', last_scrape_time: recently };
    
    await scrapeStore(supermarket, [], io, onResults);

    // Should NOT have launched a browser
    expect(chromium.launch).not.toHaveBeenCalled();
    // Should have sent a status message indicating cache hit
    expect(io.emit).toHaveBeenCalledWith('storeStatus', expect.objectContaining({
      status: expect.stringContaining('Skipping')
    }));
  });

  it('should scrape if last_scrape_time is older than TTL', async () => {
    const longAgo = new Date(Date.now() - 90 * 60000).toISOString(); // 90 mins ago
    const supermarket = { id: 1, name: 'Test Store', url: 'http://test.com', last_scrape_time: longAgo };
    
    // We need to mock a scraper class since it will try to instantiate one
    // But for now let's just see it reaching chromium.launch
    await scrapeStore(supermarket, [], io, onResults);

    expect(chromium.launch).toHaveBeenCalled();
  });

  it('should scrape if last_scrape_time is null', async () => {
    const supermarket = { id: 1, name: 'Test Store', url: 'http://test.com', last_scrape_time: null };
    
    await scrapeStore(supermarket, [], io, onResults);

    expect(chromium.launch).toHaveBeenCalled();
  });
});
