const ShufersalScraper = require('../scrapers/shufersal');
const BaseScraper = require('../scrapers/BaseScraper');
const { chromium } = require('playwright-extra');

jest.mock('playwright-extra');
jest.mock('axios');

describe('ShufersalScraper Class Tests', () => {
    it('should be an instance of BaseScraper', () => {
        const supermarket = { id: 1, name: 'Shufersal' };
        const io = { emit: jest.fn() };
        const scraper = new ShufersalScraper(supermarket, io);
        
        expect(scraper).toBeInstanceOf(BaseScraper);
        expect(typeof scraper.scrape).toBe('function');
    });
});
