const YohananofScraper = require('../scrapers/yohananof');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('YohananofScraper', () => {
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

    it('should login and extract products', async () => {
        const supermarket = { id: 3, name: 'Yohananof', url: 'https://url.publishedprices.co.il/login' };
        const scraper = new YohananofScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>2</ItemCode>
                        <ItemName>Bread</ItemName>
                        <ItemPrice>10.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'yohananof');
        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_name).toBe('Bread');
    }, 20000);
});
