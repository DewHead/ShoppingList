const LevyBaseScraper = require('../scrapers/LevyBaseScraper');
const zlib = require('zlib');
const xml2js = require('xml2js');

describe('LevyBaseScraper', () => {
    let mockScraper;
    let mockPage;
    let levyBase;

    beforeEach(() => {
        mockScraper = {
            supermarket: { id: 1, url: 'http://test-portal.com' },
            emitStatus: jest.fn(),
            log: jest.fn(),
            error: jest.fn()
        };
        mockPage = {
            goto: jest.fn().mockResolvedValue({}),
            fill: jest.fn().mockResolvedValue({}),
            waitForSelector: jest.fn().mockResolvedValue({}),
            click: jest.fn().mockResolvedValue({}),
            waitForURL: jest.fn().mockResolvedValue({}),
            context: jest.fn().mockReturnValue({
                cookies: jest.fn().mockResolvedValue([{ name: 'test', value: 'val' }])
            }),
            $$eval: jest.fn()
        };
        levyBase = new LevyBaseScraper(mockScraper);
    });

    describe('login', () => {
        it('should perform login steps and return cookie header', async () => {
            const cookieHeader = await levyBase.login(mockPage, 'testuser');
            expect(mockPage.goto).toHaveBeenCalledWith('http://test-portal.com', expect.any(Object));
            expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'testuser');
            expect(cookieHeader).toBe('test=val');
        });
    });

    describe('filterLatestFiles', () => {
        it('should pick the latest PriceFull and PromoFull for given store', () => {
            const links = [
                { name: 'PriceFull-001-20260101.gz' },
                { name: 'PriceFull-001-20260102.gz' },
                { name: 'PromoFull-001-20260101.gz' },
                { name: 'PriceFull-002-20260101.gz' }
            ];
            const filtered = levyBase.filterLatestFiles(links, '001');
            expect(filtered).toHaveLength(2);
            expect(filtered[0].name).toBe('PriceFull-001-20260102.gz');
            expect(filtered[1].name).toBe('PromoFull-001-20260101.gz');
        });
    });

    describe('parsePriceItems', () => {
        it('should correctly map XML root to normalized items', () => {
            const root = {
                Items: {
                    Item: [
                        { ItemCode: '101', ItemName: 'Apple', ItemPrice: '5.5', Quantity: '1', UnitOfMeasure: 'kg' }
                    ]
                }
            };
            const items = levyBase.parsePriceItems(root, 'Branch A');
            expect(items).toHaveLength(1);
            expect(items[0].remote_name).toBe('Apple 1 kg');
            expect(items[0].price).toBe(5.5);
        });
    });
});
