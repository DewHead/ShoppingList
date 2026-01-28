const xml2js = require('xml2js');
const zlib = require('zlib');
const { randomDelay, axiosGetWithRetry, extractTarballInMemory, fixSpacing, formatPromo } = require('../utils/scraperUtils');

async function handleRamiLevy(page, supermarket, items, io, onResults, context) {
  io.emit('storeStatus', { storeId: supermarket.id, status: `Navigating to Rami Levy portal: ${supermarket.url}` });

  const allDiscoveredProducts = [];
  const allDiscoveredPromos = [];

  try {
    await page.goto(supermarket.url, { waitUntil: 'networkidle', timeout: 60000 });
    
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Logging in to Rami Levy...' });
    await page.fill('input[name="username"]', 'RamiLevi');
    await page.waitForSelector('button#login-button', { state: 'visible', timeout: 60000 }); // Wait for the specific login button
    await page.click('button#login-button'); 
    await page.waitForURL('**/*', { waitUntil: 'domcontentloaded', timeout: 60000 }); 
    await randomDelay(5000, 8000); 

    // Get cookies from the authenticated Playwright session
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    io.emit('storeStatus', { storeId: supermarket.id, status: 'Scanning for price files...' });

    const fileLinks = await page.$$eval('a[href*=".gz"]', (links) => {
      return links.map(a => ({
        url: a.href,
        name: a.innerText.trim()
      }));
    });

    console.log(`Found ${fileLinks.length} .gz files in Rami Levy portal.`);
    
    // Filter: Prioritize Store 001 (Main)
    const targetStoreId = '001';

    let latestPriceFull = fileLinks
      .filter(l => l.name.includes('PriceFull') && l.name.includes(`-${targetStoreId}-`))
      .sort((a, b) => b.name.localeCompare(a.name))[0];
    
    if (!latestPriceFull) {
        latestPriceFull = fileLinks
          .filter(l => l.name.includes('PriceFull'))
          .sort((a, b) => b.name.localeCompare(a.name))[0];
    }
    
    let latestPromoFull = fileLinks
      .filter(l => l.name.includes('PromoFull') && l.name.includes(`-${targetStoreId}-`))
      .sort((a, b) => b.name.localeCompare(a.name))[0];

    if (!latestPromoFull) {
        latestPromoFull = fileLinks
          .filter(l => l.name.includes('PromoFull'))
          .sort((a, b) => b.name.localeCompare(a.name))[0];
    }

    const filesToProcess = [latestPriceFull, latestPromoFull].filter(f => f);

    console.log(`Processing ${filesToProcess.length} latest Full files for Rami Levy.`);

    for (const file of filesToProcess) {
      const type = file.name.includes('Price') ? 'PRICE' : 'PROMO';
      // Use supermarket name as branch_info since no specific branch is requested
      const branchInfo = supermarket.name; 

      try {
        io.emit('storeStatus', { storeId: supermarket.id, status: `Downloading ${type} file for ${branchInfo} using authenticated axios` });

        const response = await axiosGetWithRetry(file.url, 3, 2000, cookieHeader);
        let decompressedBuffer;
        try {
          // Attempt to decompress the .gz data
          decompressedBuffer = zlib.gunzipSync(response.data);
        } catch (decompressError) {
          console.error(`Decompression error for ${file.url}:`, decompressError);
          console.error('Raw data start (hex):', response.data.toString('hex').substring(0, 64));
          throw decompressError; 
        }

        let xmlContent = null;

        // Check if the decompressed buffer looks like XML (standard declaration or Root element, handling BOM)
        const startSnippet = decompressedBuffer.toString('utf8', 0, 200);
        if (startSnippet.includes('<?xml') || startSnippet.includes('<Root') || startSnippet.includes('<root')) {
          xmlContent = decompressedBuffer.toString('utf8');
        } else {
          // Assume it's a tarball and try to extract
          io.emit('storeStatus', { storeId: supermarket.id, status: `Extracting tarball for ${type} file for ${branchInfo}` });

          const extractedFiles = await extractTarballInMemory(decompressedBuffer);

          // User instruction: "extract the .gz file then go into the folder with the same name as the .gz file and there you will find the xml file which has the same name as the .gz file and the folder."
          // Expected structure: [filename_no_gz]/[filename_no_gz].xml
          
          const urlParts = file.url.split('/');
          const fileNameWithExt = urlParts[urlParts.length - 1];
          const baseName = fileNameWithExt.replace(/\.gz$/i, ''); // Handle .gz or .GZ
          const expectedPath = `${baseName}/${baseName}.xml`;
          
          if (extractedFiles[expectedPath]) {
             console.log(`Found XML at expected path: ${expectedPath}`);
             xmlContent = extractedFiles[expectedPath].toString('utf8');
          } else {
             console.log(`Expected path ${expectedPath} not found. Searching for any XML file...`);
             // Fallback: Find the XML file within the extracted files
             for (const filePath in extractedFiles) {
                if (filePath.endsWith('.xml') && !filePath.includes('Stores')) {
                   xmlContent = extractedFiles[filePath].toString('utf8');
                   break;
                }
             }
          }
        }

        if (!xmlContent) {
          throw new Error('No XML content found after decompression/extraction');
        }
        const xml = xmlContent;        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const result = await parser.parseStringPromise(xml);
        
        if (type === 'PRICE') {
            const root = result.root || result.Root;
            const products = root && root.Items ? root.Items.Item : []; 
            const productArray = Array.isArray(products) ? products : [products].filter(p => p);

            for (const product of productArray) {
              const qty = product.Quantity || product.ItemQuantity || '';
              const unit = product.UnitOfMeasure || '';
              let fullName = product.ItemName;
              
              // Append weight/qty to name if not already present
              if (qty && !fullName.includes(qty)) {
                  fullName += ` ${qty} ${unit}`;
              }

              allDiscoveredProducts.push({
                supermarket_id: supermarket.id,
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
              });
            }
            io.emit('storeStatus', { storeId: supermarket.id, status: `Processed ${productArray.length} items for ${branchInfo}` });
        } else { // PROMO
            const root = result.root || result.Root;
            const promos = root && root.Promotions ? root.Promotions.Promotion : [];
            const promoArray = Array.isArray(promos) ? promos : [promos].filter(p => p);

            for (const promo of promoArray) {
                let promoItems = [];
                if (promo.PromotionItems && promo.PromotionItems.Item) {
                    promoItems = Array.isArray(promo.PromotionItems.Item) ? promo.PromotionItems.Item : [promo.PromotionItems.Item];
                }
                if (promoItems.length > 0) {
                    for (const pi of promoItems) {
                      if (pi && pi.ItemCode) {
                          allDiscoveredPromos.push({
                              supermarket_id: supermarket.id,
                              branch_info: branchInfo,
                              remote_id: pi.ItemCode,
                              promo_id: promo.PromotionId,
                              description: formatPromo(promo.PromotionDescription),
                              last_updated: new Date().toISOString()
                          });
                      }
                    }
                }
            }
            io.emit('storeStatus', { storeId: supermarket.id, status: `Processed ${promoArray.length} promos for ${branchInfo}` });
        }
      } catch (fileError) {
        console.warn(`Error processing Rami Levy file:`, fileError.message);
      }
    }

    console.log(`Final Tally for Rami Levy: ${allDiscoveredProducts.length} products, ${allDiscoveredPromos.length} unique items in promos.`);

    if (allDiscoveredProducts.length === 0 && allDiscoveredPromos.length === 0) {
        throw new Error('Scrape failed: No products or promos found. See server logs.');
    }

    if (onResults) {
        await onResults(supermarket.id, allDiscoveredProducts, allDiscoveredPromos);
    }
    io.emit('results', { storeId: supermarket.id, results: [], coupons: [], discoveryResults: allDiscoveredProducts, promos: allDiscoveredPromos });

  } catch (err) {
    console.error(`Error in handleRamiLevy:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error in Rami Levy handler: ' + err.message });
  }
}

module.exports = handleRamiLevy;
