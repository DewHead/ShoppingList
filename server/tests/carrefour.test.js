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
            evaluate: jest.fn(),
        };
        mockIo = { emit: jest.fn() };
    });

    it('should filter for specific store and scrape products for Carrefour', async () => {
        const supermarket = { id: 6, name: 'קרפור מרקט (נווה זאב)' };
        const scraper = new CarrefourScraper(supermarket, mockIo);

        // Mock the page variables
        mockPage.evaluate.mockResolvedValue({
            files: [
                { name: 'PriceFull7290055700007-3700-202601011200.gz' },
                { name: 'PromoFull7290055700007-3700-202601011200.gz' }
            ],
            branches: {
                '3700': '002 - קרפור מרקט (נווה זאב)'
            }
        });

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

        expect(mockPage.goto).toHaveBeenCalled();
        expect(mockPage.evaluate).toHaveBeenCalled();
        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('401');
    }, 20000);
});
