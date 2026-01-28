const { scrapeStore } = require('../scraper');
const { chromium } = require('playwright-extra');
const axios = require('axios');
const zlib = require('zlib');

jest.mock('playwright-extra');
jest.mock('axios');

// Mock socket.io
const mockIo = {
    emit: jest.fn()
};

describe('Scraper Integration Tests', () => {
    let mockBrowser, mockContext, mockPage;

    beforeEach(() => {
        mockPage = {
            goto: jest.fn(),
            selectOption: jest.fn(),
            $$eval: jest.fn(),
            close: jest.fn(),
            waitForSelector: jest.fn(),
            click: jest.fn(),
        };
        mockContext = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            cookies: jest.fn().mockResolvedValue([]),
        };
        mockBrowser = {
            newContext: jest.fn().mockResolvedValue(mockContext),
            close: jest.fn(),
        };
        chromium.launch.mockResolvedValue(mockBrowser);
        mockIo.emit.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle Shufersal scraping flow', async () => {
        const supermarket = { id: 1, name: 'Shufersal', url: 'https://shufersal.co.il' };
        const items = [];
        const onResults = jest.fn();

        // Mock $$eval to return a list of files
        // The scraper expects specific structure from the page evaluation
        mockPage.$$eval.mockResolvedValue([
            { url: 'http://example.com/PriceFull-202301010000.gz', branchName: 'Branch 1', type: 'PRICE_FULL', timestamp: '202301010000' }
        ]);

        // Mock axios response for the file
        const xmlContent = `
            <root>
                <Items>
                    <Item>
                        <ItemCode>123</ItemCode>
                        <ItemName>Test Product</ItemName>
                        <ItemPrice>10.5</ItemPrice>
                    </Item>
                </Items>
            </root>
        `;
        const gzipped = zlib.gzipSync(xmlContent);
        axios.get.mockResolvedValue({ data: gzipped });

        await scrapeStore(supermarket, items, mockIo, onResults);

        expect(chromium.launch).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith(expect.stringContaining('prices.shufersal.co.il'), expect.any(Object));
        
        // Verify we tried to select options
        expect(mockPage.selectOption).toHaveBeenCalledWith('#ddlStore', '0');
        expect(mockPage.selectOption).toHaveBeenCalledWith('#ddlCategory', '0');

        // Verify results callback was called
        expect(onResults).toHaveBeenCalled();
        
        // Verify results content
        const [storeId, products, promos] = onResults.mock.calls[0];
        expect(storeId).toBe(1);
        expect(products).toHaveLength(1);
        expect(products[0].remote_name).toBe('Test Product');
        expect(products[0].price).toBe(10.5);
    }, 20000);
});
