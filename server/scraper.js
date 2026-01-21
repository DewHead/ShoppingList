const axios = require('axios');
const https = require('https');
const xml2js = require('xml2js');
const zlib = require('zlib');
const tar = require('tar-stream');
const streamifier = require('streamifier');

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

// Create an HTTPS agent that ignores SSL errors
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

// Helper function for random delays to mimic human behavior
async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper for axios with retries (simplified as it will not be used for Rami Levy .gz downloads directly)
async function axiosGetWithRetry(url, retries = 3, delay = 2000, cookieHeader = null) {
  for (let i = 0; i < retries; i++) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      return await axios.get(url, { 
        responseType: 'arraybuffer', 
        timeout: 30000,
        httpsAgent: httpsAgent,
        headers: headers
      });
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1} for ${url} due to: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

function extractTarballInMemory(buffer) {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const files = {};

    extract.on('entry', (header, stream, next) => {
      let chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files[header.name] = Buffer.concat(chunks);
        next();
      });
      stream.on('error', (err) => {
          next(err);
      });
      stream.resume();
    });

    extract.on('finish', () => {
      resolve(files);
    });

    extract.on('error', (err) => {
      reject(err);
    });

    streamifier.createReadStream(buffer).pipe(extract);
  });
}

function fixSpacing(text) {
  if (!text) return text;
  let fixed = text;

  // 1. Normalize measurement patterns like "40*8" or "8*40"
  // Try to identify if it's "Weight * Count" or "Count * Weight" and turn it into "Count יח * Weight Units"
  fixed = fixed.replace(/(\d+(\.\d+)?)\s*\*\s*(ג|גר|גרם|מל|מ"ל)?\s*(\d+(\.\d+)?)/g, (match, p1, p2, unit, p4, p5) => {
      let numA = parseFloat(p1);
      let numB = parseFloat(p4);
      
      let weight, count;
      // Heuristic: for most items, weight is the larger number (e.g., 40g vs 8 units)
      // Except for small things like tea bags (1.5g vs 100 units)
      if (numA > numB) {
          if (numB <= 30) { // Likely count
              weight = numA;
              count = numB;
          } else { // e.g., 100 * 1.5
              weight = numB;
              count = numA;
          }
      } else {
          if (numA <= 30) { // Likely count
              weight = numB;
              count = numA;
          } else {
              weight = numA;
              count = numB;
          }
      }
      
      const finalUnit = (unit === 'מל' || unit === 'מ"ל') ? 'מ"ל' : 'גרם';
      return `${count} יח * ${weight} ${finalUnit}`;
  });

  // 2. Insert space between Hebrew/English letter and Number
  fixed = fixed.replace(/([a-zA-Z\u0590-\u05FF])(\d)/g, '$1 $2');
  fixed = fixed.replace(/(\d)([a-zA-Z\u0590-\u05FF])/g, '$1 $2');
  
  // 3. Specific fix for percent sign
  fixed = fixed.replace(/(%)(\S)/g, '$1 $2');

  // 4. Normalize common units and their placement
  // "60* גרם" -> "60 גרם"
  fixed = fixed.replace(/(\d+)\s*\*\s*(ג|גר|גרם|מל|מ"ל)(\s|$)/g, '$1 $2$3');
  
  // Normalize units to full words or standard forms
  fixed = fixed.replace(/(\d+)\s*(ג|גר|גר')(\s|$)/g, '$1 גרם$3');
  fixed = fixed.replace(/(\d+)\s*(מל|מ"ל|מ'|מ)(\s|$)/g, '$1 מ"ל$3');

  // 5. Final space normalization
  fixed = fixed.replace(/\s+/g, ' ').trim();
  return fixed;
}

function formatPromo(text) {
  if (!text) return text;
  let fixed = fixSpacing(text);
  
  // Replace ש"ח or שח with ₪
  fixed = fixed.replace(/ש"ח/g, '₪');
  fixed = fixed.replace(/(\s|^)שח(\s|$)/g, '$1₪$2');
  fixed = fixed.replace(/(\d)שח/g, '$1 ₪');

  // Handle "X ב Y" and ensure ₪ is present
  // Matches "2 ב 13" but avoids "2 ב 1" which is often product type (2-in-1)
  fixed = fixed.replace(/(\d+)\s+ב-?\s*(?!₪)([2-9]\d*(\.\d+)?|1\d+(\.\d+)?)/g, '$1 ב ₪$2');
  
  // Handle "ב Y" at the end or after a space (for single item promos)
  // Ensure it's not followed by a % or already has a currency symbol
  fixed = fixed.replace(/(\sב-?)\s*(?!₪)(\d+(\.\d+)?)(?!\d)(?!\s*(%|₪|ש"ח|שח))/g, '$1₪$2');

  // Normalize ₪ position
  fixed = fixed.replace(/(\d+(\.\d+)?)\s*₪/g, '₪$1');
  fixed = fixed.replace(/₪\s+/g, '₪');
  fixed = fixed.replace(/₪+/g, '₪');

  return fixed;
}

async function scrapeStore(supermarket, items, io, onResults) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Starting scrape...' });
    
    if (supermarket.url.includes('shufersal')) {
      await handleShufersal(page, supermarket, items, io, onResults);
    } else if (supermarket.url.includes('publishedprices.co.il') || supermarket.name.includes('רמי לוי')) {
      await handleRamiLevy(page, supermarket, items, io, onResults, context);
    } else if (supermarket.url.includes('mahsaneyshak')) {
      await handleMahsaneyHashuk(page, supermarket, items, io);
    }
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Done' }); // Emit Done status on success

  } catch (err) {
    console.error(`Error scraping ${supermarket.name}:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error: ' + err.message });
  } finally {
    try {
      if (browser) await browser.close();
    } catch (closeErr) {
      console.error(`Error closing browser for ${supermarket.name}:`, closeErr);
    }
  }
}

async function handleMahsaneyHashuk(page, supermarket, items, io) {
  io.emit('storeStatus', { storeId: supermarket.id, status: 'Mahsaney Hashuk scraper is a placeholder.' });
  io.emit('results', { storeId: supermarket.id, results: [], coupons: [] });
}

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
    
    // Filter: Only take the LATEST PriceFull and PROMO_FULL from all available files (no branch filter)
    const latestPriceFull = fileLinks
      .filter(l => l.name.includes('PriceFull'))
      .sort((a, b) => b.name.localeCompare(a.name))[0];
    
    const latestPromoFull = fileLinks
      .filter(l => l.name.includes('PromoFull'))
      .sort((a, b) => b.name.localeCompare(a.name))[0];

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
              allDiscoveredProducts.push({
                supermarket_id: supermarket.id,
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
    if (onResults) {
        await onResults(supermarket.id, allDiscoveredProducts, allDiscoveredPromos);
    }
    io.emit('results', { storeId: supermarket.id, results: [], coupons: [], discoveryResults: allDiscoveredProducts, promos: allDiscoveredPromos });

  } catch (err) {
    console.error(`Error in handleRamiLevy:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error in Rami Levy handler: ' + err.message });
  }
}

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
            const products = result.root && result.root.Items ? result.root.Items.Item : []; 
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
            const promos = result.root && result.root.Promotions ? result.root.Promotions.Promotion : [];
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
    if (onResults) {
        await onResults(supermarket.id, allDiscoveredProducts, allDiscoveredPromos);
    }
    io.emit('results', { storeId: supermarket.id, results: [], coupons: [], discoveryResults: allDiscoveredProducts, promos: allDiscoveredPromos });

  } catch (err) {
    console.error(`Error in handleShufersal:`, err);
    io.emit('storeStatus', { storeId: supermarket.id, status: 'Error in Shufersal handler: ' + err.message });
  }
}

module.exports = { scrapeStore };
