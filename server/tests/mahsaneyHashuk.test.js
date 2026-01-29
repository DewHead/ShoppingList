const MahsaneyHashukScraper = require('../scrapers/mahsaneyHashuk');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('MahsaneyHashukScraper', () => {
    let mockPage;
    let mockIo;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            $$eval: jest.fn(),
            selectOption: jest.fn().mockResolvedValue({}),
            click: jest.fn().mockResolvedValue({}),
            $: jest.fn().mockResolvedValue({}),
            context: jest.fn().mockReturnValue({
                cookies: jest.fn().mockResolvedValue([{ name: 'test', value: 'cookie' }])
            }),
        };
        mockIo = { emit: jest.fn() };
    });

    it('should navigate and scrape products', async () => {
        const supermarket = { id: 4, name: 'Mahsaney Hashuk' };
        const scraper = new MahsaneyHashukScraper(supermarket, mockIo);

        // Mock dropdown options
        mockPage.$$eval.mockImplementation((selector, fn) => {
            if (selector.includes('option')) {
                return fn([{ innerText: 'מחסני השוק', value: '1' }, { innerText: 'בית אשל', value: '2' }, { innerText: 'הכל', value: '3' }]);
            }
            if (selector.includes('table tr')) {
                return fn([{ innerText: 'PriceFull', querySelector: () => ({ href: 'http://example.com/price.gz' }) }]);
            }
        });

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>101</ItemCode>
                        <ItemName>Apple</ItemName>
                        <ItemPrice>5.5</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('101');
    }, 20000);
});
