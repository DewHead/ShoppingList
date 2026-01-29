const axios = require('axios');
const zlib = require('zlib');
const xml2js = require('xml2js');
const { extractTarballInMemory, fixSpacing, formatPromo } = require('../utils/scraperUtils');

/**
 * Shared logic for retailers using the PublishedPrices portal (Rami Levy, Yohananof).
 */
class LevyBaseScraper {
    constructor(scraperInstance) {
        this.scraper = scraperInstance;
    }

    /**
     * Standard login flow for PublishedPrices.
     */
    async login(page, username) {
        this.scraper.emitStatus(`Logging in to portal as ${username}...`);
        await page.goto(this.scraper.supermarket.url, { waitUntil: 'networkidle', timeout: 60000 });
        
        await page.fill('input[name="username"]', username);
        await page.waitForSelector('button#login-button', { state: 'visible', timeout: 60000 });
        await page.click('button#login-button');
        await page.waitForURL('**/*', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const cookies = await page.context().cookies();
        return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }

    /**
     * Extract .gz file links from the portal.
     */
    async getFileLinks(page) {
        return await page.$$eval('a[href*=".gz"]', (links) => {
            return links.map(a => ({
                url: a.href,
                name: a.innerText.trim()
            }));
        });
    }

    /**
     * Filter links for the latest Price and Promo files for a specific store.
     */
    filterLatestFiles(fileLinks, storeId) {
        let latestPrice = fileLinks
            .filter(l => l.name.includes('PriceFull') && l.name.includes(`-${storeId}-`))
            .sort((a, b) => b.name.localeCompare(a.name))[0];
        
        if (!latestPrice) {
            latestPrice = fileLinks
                .filter(l => l.name.includes('PriceFull'))
                .sort((a, b) => b.name.localeCompare(a.name))[0];
        }
        
        let latestPromo = fileLinks
            .filter(l => l.name.includes('PromoFull') && l.name.includes(`-${storeId}-`))
            .sort((a, b) => b.name.localeCompare(a.name))[0];

        if (!latestPromo) {
            latestPromo = fileLinks
                .filter(l => l.name.includes('PromoFull'))
                .sort((a, b) => b.name.localeCompare(a.name))[0];
        }

        return [latestPrice, latestPromo].filter(f => f);
    }

    /**
     * Download and parse a .gz or tar.gz file.
     */
    async processFile(url, type, cookieHeader, branchInfo) {
        const { axiosGetWithRetry } = require('../utils/scraperUtils');
        const response = await axiosGetWithRetry(url, 3, 2000, cookieHeader);
        
        let decompressedBuffer;
        try {
            decompressedBuffer = zlib.gunzipSync(response.data);
        } catch (e) {
            this.scraper.error(`Decompression error for ${url}:`, e.message);
            throw e;
        }

        let xmlContent = null;
        const startSnippet = decompressedBuffer.toString('utf8', 0, 200);
        
        if (startSnippet.includes('<?xml') || startSnippet.includes('<Root') || startSnippet.includes('<root')) {
            xmlContent = decompressedBuffer.toString('utf8');
        } else {
            const extractedFiles = await extractTarballInMemory(decompressedBuffer);
            const baseName = url.split('/').pop().replace(/\.gz$/i, '');
            const expectedPath = `${baseName}/${baseName}.xml`;
            
            if (extractedFiles[expectedPath]) {
                xmlContent = extractedFiles[expectedPath].toString('utf8');
            } else {
                for (const filePath in extractedFiles) {
                    if (filePath.endsWith('.xml') && !filePath.includes('Stores')) {
                        xmlContent = extractedFiles[filePath].toString('utf8');
                        break;
                    }
                }
            }
        }

        if (!xmlContent) throw new Error(`No XML content found for ${url}`);

        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const result = await parser.parseStringPromise(xmlContent);
        const root = result.root || result.Root;

        if (type === 'PRICE') {
            return this.parsePriceItems(root, branchInfo);
        } else {
            return this.parsePromoItems(root, branchInfo);
        }
    }

    parsePriceItems(root, branchInfo) {
        const items = root && root.Items ? root.Items.Item : [];
        const itemArray = Array.isArray(items) ? items : [items].filter(i => i);
        
        return itemArray.map(product => {
            const qty = product.Quantity || product.ItemQuantity || '';
            const unit = product.UnitOfMeasure || '';
            let fullName = product.ItemName;
            if (qty && !fullName.includes(qty)) fullName += ` ${qty} ${unit}`;

            return {
                supermarket_id: this.scraper.supermarket.id,
                item_id: null,
                remote_id: product.ItemCode,
                remote_name: fixSpacing(fullName),
                branch_info: branchInfo,
                price: parseFloat(product.ItemPrice),
                unit_of_measure: unit || null,
                unit_of_measure_price: parseFloat(product.UnitOfMeasurePrice) || null,
                manufacturer: product.ManufacturerName || product.ProducerName || null,
                country: product.ManufactureCountry || null,
                last_updated: new Date().toISOString(),
            };
        });
    }

    parsePromoItems(root, branchInfo) {
        const promos = root && root.Promotions ? root.Promotions.Promotion : [];
        const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);
        const discoveredPromos = [];

        for (const promo of promoArray) {
            let promoItems = [];
            if (promo.PromotionItems && promo.PromotionItems.Item) {
                promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
            }
            for (const pi of promoItems) {
                if (pi && pi.ItemCode) {
                    discoveredPromos.push({
                        supermarket_id: this.scraper.supermarket.id,
                        branch_info: branchInfo,
                        remote_id: pi.ItemCode,
                        promo_id: promo.PromotionId,
                        description: formatPromo(promo.PromotionDescription),
                        last_updated: new Date().toISOString()
                    });
                }
            }
        }
        return discoveredPromos;
    }
}

module.exports = LevyBaseScraper;