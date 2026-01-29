const MarketBaseScraper = require('../scrapers/MarketBaseScraper');
const zlib = require('zlib');
const xml2js = require('xml2js');

describe('MarketBaseScraper', () => {
    let mockScraper;
    let mockPage;
    let marketBase;

    beforeEach(() => {
        mockScraper = {
            supermarket: { id: 1 },
            emitStatus: jest.fn(),
            log: jest.fn(),
            error: jest.fn()
        };
        mockPage = {
            waitForSelector: jest.fn().mockResolvedValue({}),
            $$eval: jest.fn(),
            selectOption: jest.fn().mockResolvedValue({})
        };
        marketBase = new MarketBaseScraper(mockScraper);
    });

    describe('selectOption', () => {
        it('should select the correct option based on text', async () => {
            mockPage.$$eval.mockResolvedValue([
                { text: 'Option A', value: '1' },
                { text: 'Target Option', value: '2' }
            ]);
            const success = await marketBase.selectOption(mockPage, 'chain', 'Target');
            expect(success).toBe(true);
            expect(mockPage.selectOption).toHaveBeenCalledWith(expect.stringContaining('chain'), '2');
        });
    });

    describe('parsePriceItems', () => {
        it('should correctly parse price root', () => {
            const root = {
                Items: {
                    Item: [
                        { ItemCode: '101', ItemName: 'Apple', ItemPrice: '5.5' }
                    ]
                }
            };
            const items = marketBase.parsePriceItems(root, 'Branch A');
            expect(items).toHaveLength(1);
            expect(items[0].remote_id).toBe('101');
        });
    });
});
