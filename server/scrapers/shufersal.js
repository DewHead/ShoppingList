const xml2js = require('xml2js');
const zlib = require('zlib');
const { randomDelay, axiosGetWithRetry, fixSpacing, formatPromo } = require('../utils/scraperUtils');

async function handleShufersal(page, supermarket, items, io, onResults) {
  const transparencyWebsiteUrl = 'https://prices.shufersal.co.il/';
  io.emit('storeStatus', { storeId: supermarket.id, status: `Navigating to price transparency website: ${transparencyWebsiteUrl}` });

  const allDiscoveredProducts = [];
  const allDiscoveredPromos = [];

  try {
    await page.goto(transparencyWebsiteUrl, { waitUntil: 'networkidle', timeout: 60000 });

    io.emit('storeStatus', { storeId: supermarket.id, status: `Filtering for all branches...` });
    
    await page.selectOption('#ddlStore', '0'); // "All" branches
    await randomDelay(3000, 5000); 

    await page.selectOption('#ddlCategory', '0'); // "All" categories
    await randomDelay(2000, 3000);

    const pageFileLinks = await page.$$eval('table.webgrid tbody tr', (rows) => {
      const links = [];
      rows.forEach(row => {
        const downloadLink = row.querySelector('td:first-child a[href*=".gz"]');
        const branchCell = row.querySelector('td:nth-child(6)');
        const branchText = branchCell ? branchCell.innerText.trim() : '';
        
        if (downloadLink) {
          const href = downloadLink.href;
          let type = 'OTHER';
          if (href.includes('PriceFull')) type = 'PRICE_FULL';
          else if (href.includes('Price')) type = 'PRICE';
          else if (href.includes('PromoFull')) type = 'PROMO_FULL';
          else if (href.includes('Promo')) type = 'PROMO';
          
          if (type !== 'OTHER' && !href.includes('Stores')) {
              const tsMatch = href.match(/-(\d{12})\.gz/);
              const timestamp = tsMatch ? tsMatch[1] : '0';
              links.push({ url: href, branchName: branchText, type, timestamp });
          }
        }
      });
      return links;
    });

    const latestPriceFull = pageFileLinks
      .filter(l => l.type === 'PRICE_FULL')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    
    const latestPromoFull = pageFileLinks
      .filter(l => l.type === 'PROMO_FULL')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);

    console.log(`Found ${filesToProcess.length} target files for all branches`);
    
    for (const fileLink of filesToProcess) {
      io.emit('storeStatus', { storeId: supermarket.id, status: `Downloading ${fileLink.type} for ${fileLink.branchName}` });
      try {
        const response = await axiosGetWithRetry(fileLink.url);
        const decompressed = zlib.gunzipSync(response.data);
        const xml = decompressed.toString('utf8');

        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const result = await parser.parseStringPromise(xml);
        
        if (fileLink.type === 'PRICE_FULL') {
            const root = result.root || result.Root;
            const products = root && root.Items ? root.Items.Item : []; 
            const productArray = Array.isArray(products) ? products : [products].filter(p => p);

            for (const product of productArray) {
              allDiscoveredProducts.push({
                supermarket_id: supermarket.id,
                item_id: null,
                remote_id: product.ItemCode,
                remote_name: fixSpacing(product.ItemName),
                branch_info: fileLink.branchName,
                price: parseFloat(product.ItemPrice),
                unit_of_measure: product.UnitOfMeasure || null,
                unit_of_measure_price: parseFloat(product.UnitOfMeasurePrice) || null,
                manufacturer: product.ManufacturerName || null,
                country: product.ManufactureCountry || null,
                last_updated: new Date().toISOString(),
              });
            }
            io.emit('storeStatus', { storeId: supermarket.id, status: `Processed ${productArray.length} items for ${fileLink.branchName}` });
        } else if (fileLink.type === 'PROMO_FULL') {
            const root = result.root || result.Root;
            const promos = root && root.Promotions ? root.Promotions.Promotion : [];
            const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);

            for (const promo of promoArray) {
                try {
                    let promoItems = [];
                    if (promo.PromotionItems && promo.PromotionItems.Item) {
                        promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
                    }
                    
                    if (promoItems.length > 0) {
                        for (const pi of promoItems) {
                          if (pi && pi.ItemCode) {
                              allDiscoveredPromos.push({
                                  supermarket_id: supermarket.id,
                                  branch_info: fileLink.branchName,
                                  remote_id: pi.ItemCode,
                                  promo_id: promo.PromotionId,
                                  description: formatPromo(promo.PromotionDescription),
                                  last_updated: new Date().toISOString()
                              });
                          }
                        }
                    } else if (promo.ItemCode) {
                      allDiscoveredPromos.push({
                          supermarket_id: supermarket.id,
                          branch_info: fileLink.branchName,
                          remote_id: promo.ItemCode,
                          promo_id: promo.PromotionId,
                          description: formatPromo(promo.PromotionDescription),
                          last_updated: new Date().toISOString()
                      });
                    }
                } catch (e) {}
            }
            io.emit('storeStatus', { storeId: supermarket.id, status: `Processed ${promoArray.length} promos for ${fileLink.branchName}` });
        }
      } catch (fileError) {
        console.warn(`Error processing file ${fileLink.url}:`, fileError.message);
      }
    }

    console.log(`Final Tally: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

    if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
        throw new Error('Scrape failed: No products or promos found. See server logs.');
    }

    if (onResults) {
        await onResults(supermarket.id, allDiscoveredProducts, allDiscoveredPromos);
    }
    io.emit('results', { storeId: supermarket.id, results: [], coupons: [], discoveryResults: allDiscoveredProducts, promos: allDiscoveredPromos });

  } catch (err) {
    console.error(`Error in handleShufersal:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error in Shufersal handler: ' + err.message });
  }
}

module.exports = handleShufersal;
