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
        
        // Wait for the main content to load (the table of files)
        try {
            await page.waitForSelector('table, a[href*=".gz"]', { state: 'attached', timeout: 30000 });
        } catch (e) {
            this.scraper.error("Timeout waiting for file list after login. Proceeding anyway...", e.message);
        }
        
        const cookies = await page.context().cookies();
        // Important: PublishedPrices often uses cookies from the specific subdomain where files are hosted
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
        const getLatest = (prefix) => {
            const matches = fileLinks.filter(l => 
                l.name.toLowerCase().includes(prefix.toLowerCase()) && 
                l.name.includes(`-${storeId}-`)
            );
            
            return matches.sort((a, b) => b.name.localeCompare(a.name))[0];
        };

        const latestPriceFull = getLatest('PriceFull');
        const latestPrice = getLatest('Price');
        const latestPromoFull = getLatest('PromoFull');
        const latestPromo = getLatest('Promo');

        const results = [];
        if (latestPriceFull) results.push(latestPriceFull);
        else if (latestPrice) results.push(latestPrice);
        
        if (latestPromoFull) results.push(latestPromoFull);
        else if (latestPromo) results.push(latestPromo);

        return results;
    }

    /**
     * Download and parse a .gz or tar.gz file.
     */
    async processFile(url, type, cookieHeader, branchInfo, page) {
        // Use the browser page to download to ensure session is maintained
        this.scraper.emitStatus(`Downloading ${type} via browser...`);
        
        let buffer;
        try {
            // Wait for the download event while clicking or navigating
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 60000 }),
                page.evaluate((targetUrl) => {
                    const a = document.createElement('a');
                    a.href = targetUrl;
                    a.click();
                }, url)
            ]);
            
            const stream = await download.createReadStream();
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
        } catch (e) {
            this.scraper.error(`Download failed for ${url}:`, e.message);
            throw e;
        }
        
        if (!buffer || buffer.length === 0) {
            throw new Error(`Empty response from ${url}`);
        }

        const magic = buffer.slice(0, 2);
        const magicHex = magic.toString('hex');
        this.scraper.log(`Downloaded ${buffer.length} bytes. Magic: ${magicHex}`);

        let decompressedBuffer = buffer;
        let isDecompressed = false;

        // Try GZIP (Magic: 1f 8b)
        if (magic[0] === 0x1f && magic[1] === 0x8b) {
            try {
                decompressedBuffer = zlib.gunzipSync(buffer);
                isDecompressed = true;
            } catch (e) {
                this.scraper.error(`Gunzip failed despite magic match: ${e.message}`);
            }
        } else if (magicHex === '504b') {
            // ZIP File (Magic: 50 4b)
            this.scraper.log(`Detected ZIP format for ${url}`);
            const fs = require('fs');
            const path = require('path');
            const { execSync } = require('child_process');
            const tmpDir = '/home/tal/.gemini/tmp/25d78cc60258baa0378d771a731722f289f86c80fa5a615666d6d2b261bba438';
            const tmpFile = path.join(tmpDir, `tmp_${Date.now()}.zip`);
            
            try {
                fs.writeFileSync(tmpFile, buffer);
                // unzip -p extracts the first file in the zip to stdout
                // Large XML files can exceed default 200KB buffer, so we increase it to 50MB
                decompressedBuffer = execSync(`unzip -p ${tmpFile}`, { maxBuffer: 1024 * 1024 * 50 });
                isDecompressed = true;
                fs.unlinkSync(tmpFile);
            } catch (zipErr) {
                this.scraper.error(`ZIP extraction failed for ${url}:`, zipErr.message);
                if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            }
        }
        
        if (!isDecompressed || !decompressedBuffer) {
            // Try Inflate?
            try {
                decompressedBuffer = zlib.inflateSync(buffer);
                isDecompressed = true;
            } catch (e2) {
                // Not compressed or unknown format, check if it's already XML
                const firstBytes = buffer.slice(0, 100).toString('utf8');
                if (firstBytes.trim().startsWith('<')) {
                    decompressedBuffer = buffer;
                    isDecompressed = true;
                } else {
                    this.scraper.error(`Decompression failed for ${url}. Magic: ${magicHex}. Data doesn't look like XML either.`);
                    throw new Error(`Failed to decompress or parse file: ${url}`);
                }
            }
        }

        if (!decompressedBuffer) throw new Error(`Decompression resulted in null buffer for ${url}`);

        let xmlContent = null;
        const startSnippet = decompressedBuffer.toString('utf8', 0, 200);
        
        if (startSnippet && (startSnippet.includes('<?xml') || startSnippet.includes('<Root') || startSnippet.includes('<root') || startSnippet.includes('<Prices') || startSnippet.includes('<Promos') || startSnippet.includes('<Promotions'))) {
            xmlContent = decompressedBuffer.toString('utf8');
        } else {
            // Might be a tarball
            try {
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
            } catch (tarErr) {
                this.scraper.error(`Failed to extract tarball from ${url}:`, tarErr.message);
            }
        }

        if (xmlContent && xmlContent.includes('Stores')) {
            // Skip store files if they accidentally got here
            return [];
        }

        if (!xmlContent) throw new Error(`No XML content found for ${url} (Decompressed: ${isDecompressed})`);

        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const result = await parser.parseStringPromise(xmlContent);
        const root = result.root || result.Root || result.Prices || result.Promotions || result.Promos;

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
            let fullName = product.ItemNm || product.ItemName || product.ManufacturerItemDescription || 'Unknown Item';
            if (fullName && qty && !String(fullName).includes(String(qty))) fullName += ` ${qty} ${unit}`;

            return {
                supermarket_id: this.scraper.supermarket.id,
                item_id: null,
                remote_id: product.ItemCode,
                remote_name: fixSpacing(String(fullName)),
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