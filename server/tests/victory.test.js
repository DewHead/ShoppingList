const VictoryScraper = require('../scrapers/victory');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('VictoryScraper', () => {
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

    it('should navigate and scrape products for Victory', async () => {
        const supermarket = { id: 5, name: 'Victory' };
        const scraper = new VictoryScraper(supermarket, mockIo);

        mockPage.$$eval.mockImplementation((selector, fn) => {
            if (selector.includes('option')) {
                return fn([{ innerText: 'ויקטורי', value: '1' }, { innerText: '68', value: '68' }, { innerText: 'הכל', value: '3' }]);
            }
            if (selector.includes('table tr')) {
                return fn([{ innerText: 'PriceFull', querySelector: () => ({ href: 'http://example.com/price.gz' }) }]);
            }
        });

        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>201</ItemCode>
                        <ItemName>Banana</ItemName>
                        <ItemPrice>6.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        axios.get.mockResolvedValue({ data: zlib.gzipSync(xmlContent) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_id).toBe('201');
        expect(mockPage.selectOption).toHaveBeenCalledWith(expect.stringContaining('branch'), '68');
    }, 20000);
});
