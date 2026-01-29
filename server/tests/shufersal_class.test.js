const ShufersalScraper = require('../scrapers/shufersal');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('ShufersalScraper', () => {
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

    it('should filter for specific store and scrape products', async () => {
        const supermarket = { id: 1, name: 'Shufersal' };
        const scraper = new ShufersalScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-413.gz', branchName: 'Branch 413', type: 'PRICE_FULL', timestamp: '202601011200' }
        ]);

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>301</ItemCode>
                        <ItemName>Milk</ItemName>
                        <ItemPrice>5.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(mockPage.selectOption).toHaveBeenCalledWith('#ddlStore', '413');
        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('301');
    }, 20000);
});