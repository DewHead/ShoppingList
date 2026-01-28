const RamiLevyScraper = require('../scrapers/ramiLevy');
const { chromium } = require('playwright-extra');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('playwright-extra');
jest.mock('axios');

describe('RamiLevyScraper Navigation Tests', () => {
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

    it('should complete the login navigation flow', async () => {
        const supermarket = { id: 2, name: 'Rami Levy', url: 'https://publishedprices.co.il' };
        const scraper = new RamiLevyScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>1</ItemCode>
                        <ItemName>Milk</ItemName>
                        <ItemPrice>5.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        await scraper.scrape(mockPage);

        expect(mockPage.goto).toHaveBeenCalledWith(supermarket.url, expect.any(Object));
        expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'RamiLevi');
        expect(mockPage.waitForSelector).toHaveBeenCalledWith('button#login-button', expect.any(Object));
        expect(mockPage.click).toHaveBeenCalledWith('button#login-button');
        expect(mockPage.waitForURL).toHaveBeenCalled();
    }, 20000);

    it('should correctly extract products with quantities', async () => {
        const supermarket = { id: 2, name: 'Rami Levy', url: 'https://publishedprices.co.il' };
        const scraper = new RamiLevyScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>1</ItemCode>
                        <ItemName>Milk</ItemName>
                        <Quantity>1</Quantity>
                        <UnitOfMeasure>Litre</UnitOfMeasure>
                        <ItemPrice>5.0</ItemPrice>
                        <UnitOfMeasurePrice>5.0</UnitOfMeasurePrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_name).toBe('Milk 1 Litre');
        expect(result.products[0].price).toBe(5.0);
    }, 20000);
});
