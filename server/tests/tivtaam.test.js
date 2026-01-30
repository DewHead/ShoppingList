const TivTaamScraper = require('../scrapers/tivTaam');
const { chromium } = require('playwright-extra');
const axios = require('axios');
const zlib = require('zlib');
const { randomDelay } = require('../utils/scraperUtils');

jest.mock('playwright-extra');
jest.mock('axios');
jest.mock('../utils/scraperUtils', () => ({
    ...jest.requireActual('../utils/scraperUtils'),
    randomDelay: jest.fn().mockResolvedValue()
}));

describe('TivTaamScraper Tests', () => {
    let mockPage;
    let mockIo;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            fill: jest.fn().mockResolvedValue({}),
            click: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            waitForURL: jest.fn().mockResolvedValue({}),
            $$eval: jest.fn(),
            context: jest.fn().mockReturnValue({
                cookies: jest.fn().mockResolvedValue([{ name: 'test', value: 'cookie' }])
            }),
        };
        mockIo = { emit: jest.fn() };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should complete the login navigation flow with TivTaam username', async () => {
        const supermarket = { id: 7, name: 'טיב טעם', url: 'https://url.publishedprices.co.il/login', branch_remote_id: '515' };
        const scraper = new TivTaamScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-515.gz', name: 'PriceFull-515.gz' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>1</ItemCode>
                        <ItemName>Test Product</ItemName>
                        <ItemPrice>10.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        await scraper.scrape(mockPage);

        expect(mockPage.goto).toHaveBeenCalledWith(supermarket.url, expect.any(Object));
        expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'TivTaam');
        expect(mockPage.click).toHaveBeenCalledWith('button#login-button');
    });

    it('should filter files by branch_remote_id 515', async () => {
        const supermarket = { id: 7, name: 'טיב טעם', url: 'https://url.publishedprices.co.il/login', branch_remote_id: '515' };
        const scraper = new TivTaamScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' },
            { url: 'http://example.com/PriceFull-515.gz', name: 'PriceFull-515.gz' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>515-1</ItemCode>
                        <ItemName>Tiv Taam Product</ItemName>
                        <ItemPrice>15.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('515-1');
    });
});
