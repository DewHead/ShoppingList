const axios = require('axios');
const zlib = require('zlib');
const xml2js = require('xml2js');
const { randomDelay, fixSpacing, formatPromo } = require('../utils/scraperUtils');

/**
 * Shared logic for retailers using the LaibCatalog portal (Mahsaney Hashuk, Victory).
 */
class MarketBaseScraper {
    constructor(scraperInstance) {
        this.scraper = scraperInstance;
    }

    /**
     * Helper to select an option in a dropdown with fuzzy matching and logging.
     */
    async selectOption(page, partialName, labelText) {
        const selector = `select[name*="${partialName}"]`;
        try {
            await page.waitForSelector(selector, { timeout: 10000 });
            const options = await page.$$eval(`${selector} option`, opts => 
                opts.map(o => ({ text: o.innerText.trim(), value: o.value }))
            );
            
            const target = options.find(o => o.text.includes(labelText));
            if (target) {
                this.scraper.log(`Selecting '${labelText}' in ${partialName} (Value: ${target.value})`);
                await page.selectOption(selector, target.value);
                return true;
            } else {
                this.scraper.log(`Option '${labelText}' not found in ${partialName}. Available: ${options.slice(0, 5).map(o => o.text)}`);
                return false;
            }
        } catch (e) {
            this.scraper.error(`Error selecting ${labelText} in ${partialName}:`, e.message);
            return false;
        }
    }

    /**
     * Extract file links from the results table.
     */
    async getFileLinks(page) {
        this.scraper.log('Extracting file links from table...');
        const links = await page.$$eval('table tr', (rows) => {
            const links = [];
            rows.forEach(row => {
                const link = row.querySelector('a');
                const fileName = row.innerText;
                if (link && link.href) {
                    let type = 'OTHER';
                    if (fileName.includes('PriceFull') || fileName.includes('מחירים מלא')) type = 'PRICE_FULL';
                    else if (fileName.includes('Price') || fileName.includes('מחירים')) type = 'PRICE';
                    else if (fileName.includes('PromoFull') || fileName.includes('מבצעים מלא')) type = 'PROMO_FULL';
                    else if (fileName.includes('Promo') || fileName.includes('מבצעים')) type = 'PROMO';
                    
                    if (type !== 'OTHER') {
                        links.push({ url: link.href, type, name: fileName.trim() });
                    }
                }
            });
            return links;
        });
        
        if (links.length === 0) {
            this.scraper.log('WARNING: No transparency files found in the results table for the selected filters.');
        } else {
            this.scraper.log(`Extracted ${links.length} potential files.`);
        }
        return links;
    }

    /**
     * Download and parse a file from the portal.
     */
    async processFile(url, type, cookieHeader, branchInfo) {
        const { axiosGetWithRetry } = require('../utils/scraperUtils');
        const response = await axiosGetWithRetry(url, 3, 2000, cookieHeader);
        
        let xmlContent;
        try {
            xmlContent = zlib.gunzipSync(response.data).toString('utf8');
        } catch (e) {
            xmlContent = response.data.toString('utf8');
        }

        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const result = await parser.parseStringPromise(xmlContent);
        const root = result.root || result.Root || result.Prices || result.Promos; 
        
        if (!root) throw new Error(`XML root not found for ${url}`);

        if (type.includes('PRICE')) {
            return this.parsePriceItems(root, branchInfo);
        } else {
            return this.parsePromoItems(root, branchInfo);
        }
    }

    parsePriceItems(root, branchInfo) {
        let products = [];
        if (root.Items && root.Items.Item) products = root.Items.Item;
        else if (root.Products && root.Products.Product) products = root.Products.Product;
        
        const productArray = Array.isArray(products) ? products : [products].filter(p => p);
        return productArray.map(product => ({
            supermarket_id: this.scraper.supermarket.id,
            item_id: null,
            remote_id: product.ItemCode,
            remote_name: fixSpacing(product.ItemName),
            branch_info: branchInfo,
            price: parseFloat(product.ItemPrice),
            unit_of_measure: product.UnitOfMeasure || null,
            unit_of_measure_price: parseFloat(product.UnitOfMeasurePrice) || null,
            manufacturer: product.ManufacturerName || null,
            country: product.ManufactureCountry || null,
            last_updated: new Date().toISOString(),
        }));
    }

    parsePromoItems(root, branchInfo) {
        let promos = [];
        if (root.Promotions && root.Promotions.Promotion) promos = root.Promotions.Promotion;
        else if (root.Promotion) promos = root.Promotion;
        else if (root.Sales && root.Sales.Sale) promos = root.Sales.Sale;

        const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);
        const discoveredPromos = [];

        for (const promo of promoArray) {
            let promoItems = [];
            if (promo.ItemCode) promoItems = [promo];
            else if (promo.PromotionItems && promo.PromotionItems.Item) {
                promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
            } else if (promo.Items && promo.Items.Item) {
                promoItems = Array.isArray(promo.Items.Item) ? promo.Items.Item : [promo.Items.Item];
            }

            for (const pi of promoItems) {
                if (pi && pi.ItemCode) {
                    const pId = pi.PromotionID || promo.PromotionID;
                    const pDesc = pi.PromotionDescription || promo.PromotionDescription;
                    discoveredPromos.push({
                        supermarket_id: this.scraper.supermarket.id,
                        branch_info: branchInfo,
                        remote_id: pi.ItemCode,
                        promo_id: pId,
                        description: formatPromo(pDesc),
                        last_updated: new Date().toISOString()
                    });
                }
            }
        }
        return discoveredPromos;
    }
}

module.exports = MarketBaseScraper;