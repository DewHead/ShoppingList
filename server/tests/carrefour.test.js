const CarrefourScraper = require('../scrapers/carrefour');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('CarrefourScraper', () => {
    let mockPage;
    let mockIo;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            selectOption: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            $$eval: jest.fn(),
        };
        mockIo = { emit: jest.fn() };
    });

    it('should filter for specific store and scrape products for Carrefour', async () => {
        const supermarket = { id: 6, name: 'Carrefour' };
        const scraper = new CarrefourScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-5304.gz', branchName: 'Branch 5304', type: 'PRICE_FULL', timestamp: '202601011200' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>401</ItemCode>
                        <ItemName>Apple</ItemName>
                        <ItemPrice>7.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(mockPage.selectOption).toHaveBeenCalledWith('#ddlStore', '5304');
        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('401');
    }, 20000);
});
