const KeshetTeamimScraper = require('../scrapers/keshetTeamim');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('axios');

describe('KeshetTeamimScraper Navigation Tests', () => {
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

    it('should complete the login navigation flow with Keshet username', async () => {
        const supermarket = { id: 6, name: 'קשת טעמים', url: 'https://url.publishedprices.co.il/login' };
        // We expect it to fail because KeshetTeamimScraper doesn't exist yet
        const scraper = new KeshetTeamimScraper(supermarket, mockIo);

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
        expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'Keshet');
        expect(mockPage.waitForSelector).toHaveBeenCalledWith('button#login-button', expect.any(Object));
        expect(mockPage.click).toHaveBeenCalledWith('button#login-button');
    }, 20000);

    it('should correctly extract products and promos', async () => {
        const supermarket = { id: 6, name: 'קשת טעמים', url: 'https://url.publishedprices.co.il/login' };
        const scraper = new KeshetTeamimScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' },
            { url: 'http://example.com/PromoFull-001.gz', name: 'PromoFull-001.gz' }
        ]);

        const priceXml = `
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

        const promoXml = `
            <root>
                <Promotions>
                    <Promotion>
                        <PromotionId>P1</PromotionId>
                        <PromotionDescription>Buy 2 for 8</PromotionDescription>
                        <PromotionItems>
                            <Item>
                                <ItemCode>1</ItemCode>
                            </Item>
                        </PromotionItems>
                    </Promotion>
                </Promotions>
            </root>
        `;

        axios.get.mockImplementation((url) => {
            if (url.includes('PriceFull')) {
                return Promise.resolve({ data: zlib.gzipSync(priceXml) });
            } else {
                return Promise.resolve({ data: zlib.gzipSync(promoXml) });
            }
        });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(1);
        expect(result.products[0].remote_name).toBe('Milk 1 Litre');
        expect(result.products[0].price).toBe(5.0);
        
        expect(result.promos).toHaveLength(1);
        expect(result.promos[0].promo_id).toBe('P1');
        expect(result.promos[0].description).toBe('Buy 2 for 8');
    }, 20000);

    it('should remove "unknown" from product names and promo descriptions', async () => {
        const supermarket = { id: 6, name: 'קשת טעמים', url: 'https://url.publishedprices.co.il/login' };
        const scraper = new KeshetTeamimScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' },
            { url: 'http://example.com/PromoFull-001.gz', name: 'PromoFull-001.gz' }
        ]);

        const priceXml = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>2</ItemCode>
                        <ItemName>Cheese unknown</ItemName>
                        <Quantity>200</Quantity>
                        <UnitOfMeasure>unknown</UnitOfMeasure>
                        <ItemPrice>10.0</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;

        const promoXml = `
            <root>
                <Promotions>
                    <Promotion>
                        <PromotionId>P2</PromotionId>
                        <PromotionDescription>Discount unknown</PromotionDescription>
                        <PromotionItems>
                            <Item>
                                <ItemCode>2</ItemCode>
                            </Item>
                        </PromotionItems>
                    </Promotion>
                </Promotions>
            </root>
        `;

        axios.get.mockImplementation((url) => {
            if (url.includes('PriceFull')) {
                return Promise.resolve({ data: zlib.gzipSync(priceXml) });
            } else {
                return Promise.resolve({ data: zlib.gzipSync(promoXml) });
            }
        });

        const result = await scraper.scrape(mockPage);

        expect(result.products[0].remote_name).toBe('Cheese 200'); // 'unknown' removed from ItemName and UnitOfMeasure
        expect(result.promos[0].description).toBe('Discount'); // 'unknown' removed from description
    }, 20000);

    it('should add "1 ק"ג" to fruits and vegetables with weight 1.00', async () => {
        const supermarket = { id: 6, name: 'קשת טעמים', url: 'https://url.publishedprices.co.il/login' };
        const scraper = new KeshetTeamimScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' }
        ]);

        const priceXml = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>102</ItemCode>
                        <ItemName>בטטה</ItemName>
                        <Quantity>1.00</Quantity>
                        <UnitOfMeasure>Unknown</UnitOfMeasure>
                        <ItemPrice>5.5</ItemPrice>
                    </Item>
                    <Item>
                        <ItemCode>110</ItemCode>
                        <ItemName>בננה</ItemName>
                        <Quantity>1.00</Quantity>
                        <UnitOfMeasure>Unknown</UnitOfMeasure>
                        <ItemPrice>4.9</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;

        axios.get.mockResolvedValue({ data: zlib.gzipSync(priceXml) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(2);
        expect(result.products[0].remote_name).toBe('בטטה 1 ק"ג');
        expect(result.products[1].remote_name).toBe('בננה 1 ק"ג');
    }, 20000);

    it('should handle 0.00 and short codes correctly for Keshet', async () => {
        const supermarket = { id: 6, name: 'קשת טעמים', url: 'https://url.publishedprices.co.il/login' };
        const scraper = new KeshetTeamimScraper(supermarket, mockIo);

        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-001.gz', name: 'PriceFull-001.gz' }
        ]);

        const priceXml = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>6</ItemCode>
                        <ItemName>גזר</ItemName>
                        <Quantity>1.00</Quantity>
                        <UnitOfMeasure>Unknown</UnitOfMeasure>
                        <ItemPrice>4.9</ItemPrice>
                    </Item>
                    <Item>
                        <ItemCode>44</ItemCode>
                        <ItemName>לוף</ItemName>
                        <Quantity>0.00</Quantity>
                        <UnitOfMeasure>Unknown</UnitOfMeasure>
                        <ItemPrice>16.9</ItemPrice>
                    </Item>
                    <Item>
                        <ItemCode>7</ItemCode>
                        <ItemName>0.00 סלק</ItemName>
                        <Quantity>0.00</Quantity>
                        <UnitOfMeasure>Unknown </UnitOfMeasure>
                        <ItemPrice>5.90</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;

        axios.get.mockResolvedValue({ data: zlib.gzipSync(priceXml) });

        const result = await scraper.scrape(mockPage);

        expect(result.products).toHaveLength(3);
        expect(result.products[0].remote_name).toBe('גזר 1 ק"ג');
        expect(result.products[1].remote_name).toBe('לוף 1 ק"ג'); 
        expect(result.products[2].remote_name).toBe('סלק 1 ק"ג');
    }, 20000);
});
