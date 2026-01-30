const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db');
const { validateProduct } = require('./utils/validation');
const { standardizeName } = require('./utils/nameStandardizer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let db;

// Helper to map English keyboard input to Hebrew
function toHebrew(str) {
  const map = {
    'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו', 'i': 'ן', 'o': 'ם', 'p': 'פ',
    'a': 'ש', 's': 'ד', 'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך', ';': 'ף', "'": ',',
    'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ', 'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
  };
  return str.split('').map(char => map[char.toLowerCase()] || char).join('');
}

// Backend version of calculateBestPrice to ensure alignment with frontend
const calculateBestPrice = (match, quantity) => {
  const unitPrice = match.price;
  const originalTotal = unitPrice * quantity;
  let bestResult = { total: originalTotal, isPromo: false, originalTotal, displayName: match.remote_name };
  
  if (!match.promo_description) {
      return bestResult;
  }

  const promoList = match.promo_description.split(' | ');
  
  promoList.forEach(promoDesc => {
      const parts = promoDesc.split(/\s+ב-?\s*₪?/);
      if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          // Strip any % or other non-price chars before parsing
          const priceMatch = lastPart.replace(/%/g, '').match(/^[\d.]+/);
          
          if (priceMatch) {
              const promoPrice = parseFloat(priceMatch[0]);
              const namePart = parts.slice(0, -1).join(' ב ').trim();
              
              // Try to find quantity: either "Name Qty" or just "Qty" (strip % just in case)
              const qtyMatch = namePart.replace(/%/g, '').match(/(\s|^)(\d+)$/);
              
              // Handle "השני ב..." (the second for...)
              const isSecondAt = namePart.endsWith('השני') || namePart.endsWith('ה-2');

              if (isSecondAt) {
                  if (quantity >= 2) {
                      const pairs = Math.floor(quantity / 2);
                      const remaining = quantity % 2;
                      const currentTotal = (pairs * (unitPrice + promoPrice)) + (remaining * unitPrice);
                      
                      if (currentTotal < bestResult.total) {
                          bestResult = { 
                              total: currentTotal, 
                              isPromo: true, 
                              originalTotal,
                              displayName: namePart || bestResult.displayName 
                          };
                      }
                  }
              } else if (qtyMatch && parseInt(qtyMatch[2]) > 1) {
                  const requiredQty = parseInt(qtyMatch[2]);
                  const cleanedName = namePart.replace(/(\s|^)\d+$/, '').trim();
                  if (quantity >= requiredQty) {
                      const promoGroups = Math.floor(quantity / requiredQty);
                      const remaining = quantity % requiredQty;
                      const currentTotal = (promoGroups * promoPrice) + (remaining * unitPrice);
                      
                      if (currentTotal < bestResult.total) {
                          bestResult = { 
                              total: currentTotal, 
                              isPromo: true, 
                              originalTotal,
                              displayName: cleanedName || bestResult.displayName 
                          };
                      }
                  }
              } else {
                  // Only apply single-price promos if it's not a "second at" or "X for" type
                  const currentTotal = promoPrice * quantity;
                  if (currentTotal < bestResult.total) {
                      bestResult = { 
                          total: currentTotal, 
                          isPromo: true, 
                          originalTotal,
                          displayName: namePart || bestResult.displayName 
                      };
                  }
              }
          }
      }
  });
  
  return bestResult;
};

// Helper to update the FTS index for a store
async function updateFtsIndex(storeId) {
    try {
        console.log(`Updating FTS index for store ${storeId}...`);
        
        const items = await db.all(`
            SELECT remote_name, remote_id, supermarket_id, price, branch_info 
            FROM supermarket_items 
            WHERE supermarket_id = ?
        `, [storeId]);
        
        if (items.length > 0) {
            await db.run('BEGIN IMMEDIATE');
            try {
                await db.run('DELETE FROM items_fts WHERE supermarket_id = ?', [storeId]);
                const insert = await db.prepare(`
                    INSERT INTO items_fts (remote_name, remote_id, supermarket_id, price, branch_info)
                    VALUES (?, ?, ?, ?, ?)
                `);
                for (const item of items) {
                    await insert.run(item.remote_name, item.remote_id, item.supermarket_id, item.price, item.branch_info);
                }
                await insert.finalize();
                await db.run('COMMIT');
                console.log(`FTS index updated for store ${storeId} with ${items.length} items.`);
            } catch (innerErr) {
                await db.run('ROLLBACK');
                throw innerErr;
            }
        } else {
            console.log(`No items found for store ${storeId}, skipping FTS update.`);
        }
    } catch (err) {
        console.error(`Error updating FTS index for store ${storeId}:`, err);
    }
}

// Queue for database operations to avoid concurrent transaction errors
const dbQueue = [];
let isProcessingQueue = false;

async function processDbQueue() {
  if (isProcessingQueue || dbQueue.length === 0) return;
  isProcessingQueue = true;
  while (dbQueue.length > 0) {
    const { storeId, products, promos, resolve, reject } = dbQueue.shift();
    try {
      await performSaveDiscoveryResults(storeId, products, promos);
      resolve();
    } catch (err) {
      reject(err);
    }
  }
  isProcessingQueue = false;
}

// Helper to save discovery results directly from server-side scraper
async function saveDiscoveryResults(storeId, products, promos) {
  return new Promise((resolve, reject) => {
    dbQueue.push({ storeId, products, promos, resolve, reject });
    processDbQueue();
  });
}

async function performSaveDiscoveryResults(storeId, products, promos) {
  try {
    if (products && products.length > 0) {
      console.log(`Directly saving ${products.length} discovered items from store ${storeId}...`);
      
      const uniqueProducts = new Map();
      for (const item of products) {
        const validation = validateProduct(item);
        if (validation.isValid) {
          const key = `${item.remote_id}_${item.branch_info}`;
          uniqueProducts.set(key, item);
        } else {
          console.warn(`Skipping invalid product: ${item.remote_name} (ID: ${item.remote_id}). Reason: ${validation.reason}`);
        }
      }

      await db.run('BEGIN IMMEDIATE');
      try {
        await db.run('DELETE FROM supermarket_items WHERE supermarket_id = ?', [storeId]);
        const insertItemStmt = await db.prepare('INSERT OR IGNORE INTO items (name) VALUES (?)');
        const insertSupermarketItemStmt = await db.prepare(`
            INSERT INTO supermarket_items (
            supermarket_id, item_id, remote_id, remote_name, branch_info, 
            price, unit_of_measure, unit_of_measure_price, manufacturer, country, last_updated
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of uniqueProducts.values()) {
            await insertItemStmt.run(item.remote_name);
            const itemRow = await db.get('SELECT id FROM items WHERE name = ?', [item.remote_name]);
            if (itemRow) {
            await insertSupermarketItemStmt.run(
                storeId,
                itemRow.id,
                item.remote_id,
                item.remote_name,
                item.branch_info,
                item.price,
                item.unit_of_measure,
                item.unit_of_measure_price,
                item.manufacturer,
                item.country,
                item.last_updated || new Date().toISOString()
            );
            }
        }
        await insertItemStmt.finalize();
        await insertSupermarketItemStmt.finalize();
        await db.run('COMMIT');
        await db.run('UPDATE supermarkets SET last_scrape_time = ? WHERE id = ?', [new Date().toISOString(), storeId]);
        console.log(`Successfully saved ${uniqueProducts.size} items to supermarket_items for store ${storeId}.`);
      } catch (innerErr) {
          await db.run('ROLLBACK');
          throw innerErr;
      }
    }

    if (promos && promos.length > 0) {
      console.log(`Saving ${promos.length} discovered promos from store ${storeId}...`);
      
      const uniquePromos = new Map();
      for (const promo of promos) {
          const key = `${promo.remote_id}_${promo.promo_id}_${promo.branch_info}`;
          uniquePromos.set(key, promo);
      }

      await db.run('BEGIN IMMEDIATE');
      try {
        await db.run('DELETE FROM supermarket_promos WHERE supermarket_id = ?', [storeId]);
        const insertPromoStmt = await db.prepare(`
            INSERT INTO supermarket_promos (supermarket_id, branch_info, remote_id, promo_id, description, last_updated)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const promo of uniquePromos.values()) {
            await insertPromoStmt.run(
            storeId,
            promo.branch_info,
            promo.remote_id,
            promo.promo_id,
            promo.description,
            promo.last_updated || new Date().toISOString()
            );
        }
        await insertPromoStmt.finalize();
        await db.run('COMMIT');
      } catch (innerErr) {
          await db.run('ROLLBACK');
          throw innerErr;
      }
    }
    await updateFtsIndex(storeId);
  } catch (err) {
    console.error('Error saving discovery data:', err.message);
    throw err;
  }
}

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('results', async (data) => {
     await saveDiscoveryResults(data.storeId, data.discoveryResults, data.promos);
  });
});

// Supermarkets
app.get('/api/supermarkets', async (req, res) => {
  const supermarkets = await db.all('SELECT * FROM supermarkets');
  res.json(supermarkets);
});

// Get items for a specific supermarket (with pagination and filtering)
app.get('/api/supermarkets/:id/items', async (req, res) => {
  const { id } = req.params;
  const { 
    page = 1, 
    limit = 50, 
    branch = 'all', 
    onlyPromos = 'false',
    showSbox = 'false',
    showClubPromos = 'false',
    search = ''
  } = req.query;
  const offset = (page - 1) * limit;

  try {
    let filteredQuery = `
      FROM supermarket_items si
      LEFT JOIN supermarket_promos sp ON 
        si.supermarket_id = sp.supermarket_id AND 
        si.remote_id = sp.remote_id AND 
        si.branch_info = sp.branch_info
      WHERE si.supermarket_id = ?
    `;
    const countParams = [id];

    if (branch !== 'all') {
      filteredQuery += ` AND si.branch_info = ?`;
      countParams.push(branch);
    }
    
    if (search) {
      const cleanNameExpr = `
        ' ' || 
        REPLACE(REPLACE(REPLACE(REPLACE(si.remote_name, ',', ' '), '-', ' '), ')', ' '), '(', ' ')
        || ' '
      `;
      
      const termsOriginal = search.trim().split(/\s+/);
      const hebrewQuery = toHebrew(search);
      const termsHebrew = hebrewQuery !== search ? hebrewQuery.trim().split(/\s+/) : [];

      const buildConditions = (terms) => {
          const termConditions = terms.map(term => {
              const variations = getTermVariations(term);
              const variationClause = variations.map(() => `${cleanNameExpr} LIKE ? ESCAPE '\\'`).join(' OR ');
              return `(${variationClause})`;
          });
          return termConditions.join(' AND ');
      };

      const buildParams = (terms) => {
          const params = [];
          terms.forEach(term => {
              const variations = getTermVariations(term);
              variations.forEach(v => {
                  const escaped = escapeLike(v);
                  params.push(`% ${escaped} %`);
              });
          });
          return params;
      };

      const conditionsOriginal = buildConditions(termsOriginal);
      let queryParams = buildParams(termsOriginal);
      let conditionClause = `(${conditionsOriginal})`;
      if (termsHebrew.length > 0) {
          const conditionsHebrew = buildConditions(termsHebrew);
          conditionClause = `((${conditionsOriginal}) OR (${conditionsHebrew}))`;
          queryParams = [...queryParams, ...buildParams(termsHebrew)];
      }
      // Match (ALL name terms STRICTLY - Original OR Hebrew) OR (exact ID) OR (exact promo)
      filteredQuery += ` AND (${conditionClause} OR si.remote_id LIKE ? ESCAPE '\\' OR sp.description LIKE ? ESCAPE '\\')`;
      
      countParams.push(...queryParams);
      const escapedSearch = `%${escapeLike(search)}%`;
      countParams.push(escapedSearch, escapedSearch);
    }

    filteredQuery += ` GROUP BY si.id`;
    const wrapperQuery = `
      SELECT si.id, 
      GROUP_CONCAT(
          CASE 
            WHEN (? = 'true' OR sp.description NOT LIKE '%SBOX%') 
                 AND (? = 'true' OR sp.description NOT LIKE '%מבצע מועדון%')
                 AND sp.description != si.remote_name
            THEN sp.description 
            ELSE NULL 
          END,
          ' | '
      ) as promo_description
      ${filteredQuery}
    `;
    const wrapperParams = [showSbox, showClubPromos, ...countParams];
    const finalCountQuery = `SELECT COUNT(*) as total FROM (${wrapperQuery}) ${onlyPromos === 'true' ? 'WHERE promo_description IS NOT NULL' : ''}`;
    const countResult = await db.get(finalCountQuery, wrapperParams);
    const total = countResult ? countResult.total : 0;

        let dataQuery = `
          SELECT si.*, 
          GROUP_CONCAT(
              CASE 
                WHEN (? = 'true' OR sp.description NOT LIKE '%SBOX%') 
                     AND (? = 'true' OR sp.description NOT LIKE '%מבצע מועדון%')
                     AND sp.description != si.remote_name
                THEN sp.description 
                ELSE NULL 
              END, 
              ' | '
          ) as promo_description
          ${filteredQuery}
        `;    if (onlyPromos === 'true') {
        dataQuery += ` HAVING promo_description IS NOT NULL`;
    }
    dataQuery += ` 
      ORDER BY 
        CASE 
          WHEN si.remote_name LIKE ? THEN 1 
          ELSE 2 
        END,
        LENGTH(si.remote_name) ASC, 
        si.remote_name ASC 
      LIMIT ? OFFSET ?
    `;
    const dataParams = [showSbox, showClubPromos, ...countParams, `${search}%`, parseInt(limit), parseInt(offset)];
    const items = await db.all(dataQuery, dataParams);
    
    // Standardize product names before sending to frontend
    const standardizedItems = items.map(item => ({
      ...item,
      remote_name: standardizeName(item.remote_name)
    }));

    res.json({ 
      items: standardizedItems, 
      pagination: { 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(total / limit) 
      } 
    });
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Unique branches
app.get('/api/supermarkets/:id/branches', async (req, res) => {
  try {
    const branches = await db.all(`SELECT DISTINCT branch_info FROM supermarket_items WHERE supermarket_id = ? AND branch_info IS NOT NULL`, [req.params.id]);
    res.json(branches.map(b => b.branch_info));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/supermarkets/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  await db.run('UPDATE supermarkets SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
  res.json({ success: true });
});

// Shopping List
app.get('/api/shopping-list', async (req, res) => {
  const list = await db.all(`SELECT sl.id, sl.quantity, sl.is_done, i.name as itemName, i.id as itemId FROM shopping_list sl JOIN items i ON sl.item_id = i.id`);
  res.json(list);
});

app.post('/api/shopping-list', async (req, res) => {
  const { itemName, quantity } = req.body;
  let item = await db.get('SELECT id FROM items WHERE name = ?', [itemName]);
  if (!item) {
    const result = await db.run('INSERT INTO items (name) VALUES (?)', [itemName]);
    item = { id: result.lastID };
  }
  await db.run('INSERT INTO shopping_list (item_id, quantity) VALUES (?, ?)', [item.id, quantity || 1]);
  res.json({ success: true });
});

app.delete('/api/shopping-list/:id', async (req, res) => {
  await db.run('DELETE FROM shopping_list WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.put('/api/shopping-list/:id', async (req, res) => {
  const { quantity, itemName, is_done } = req.body;
  try {
    if (quantity !== undefined) {
      await db.run('UPDATE shopping_list SET quantity = ? WHERE id = ?', [quantity, req.params.id]);
    }
    if (is_done !== undefined) {
      await db.run('UPDATE shopping_list SET is_done = ? WHERE id = ?', [is_done ? 1 : 0, req.params.id]);
    }
    if (itemName) {
      let item = await db.get('SELECT id FROM items WHERE name = ?', [itemName]);
      if (!item) {
        const result = await db.run('INSERT INTO items (name) VALUES (?)', [itemName]);
        item = { id: result.lastID };
      }
      await db.run('UPDATE shopping_list SET item_id = ? WHERE id = ?', [item.id, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

require('dotenv').config();

// Autocomplete suggestions
app.get('/api/items', async (req, res) => {
  const items = await db.all('SELECT * FROM items');
  res.json(items);
});

function escapeLike(str) { return str.replace(/[\\%_]/g, '\\$&'); }

function getTermVariations(term) {
    const res = [term];
    const unitGroups = [
        ['ל\'', 'ליטר', 'ליט', 'ל', 'liter', 'l', 'ml', 'מ"ל', 'מל'],
        ['ק"ג', 'קג', 'קילו', 'קילוגרם', 'kg', 'kilo'],
        ['גרם', 'ג\'', 'g', 'gr', 'gm']
    ];
    
    // Meat synonyms: Searching for 'בשר' should match any of these meat indicators
    const meatTerms = ['בשר', 'בקר', 'עגל', 'כבש', 'כתף', 'צלעות', 'צוואר', 'סינטה', 'פילה', 'שייטל', 'אסאדו', 'אנטריקוט', 'מנתח'];

    const lowerTerm = term.toLowerCase();
    for (const group of unitGroups) {
        if (group.includes(lowerTerm)) {
            group.forEach(v => { if (v !== lowerTerm) res.push(v); });
        }
    }

    if (meatTerms.includes(lowerTerm)) {
        meatTerms.forEach(v => { if (v !== lowerTerm) res.push(v); });
    }

    if (!/[\u0590-\u05FF]/.test(term)) return res;
    if (term.length < 3) return res;
    const end1 = term.slice(-1);
    const end2 = term.slice(-2);
    if (end1 === 'ה') {
        res.push(term.slice(0, -1) + 'א');
        if (term.endsWith('יה')) {
            res.push(term.slice(0, -1) + 'ות');
            res.push(term.slice(0, -2) + 'יית');
        } else {
            res.push(term.slice(0, -1) + 'ת');
            res.push(term.slice(0, -1) + 'ות');
        }
    } else if (end1 === 'א') { res.push(term.slice(0, -1) + 'ה'); }
    else if (end1 === 'ת') { res.push(term.slice(0, -1) + 'ה'); }
    else if (end2 === 'ות') { res.push(term.slice(0, -2) + 'ה'); }
    return res;
}

const buildFtsQuery = (terms) => {
    return terms.map((term) => {
        const variations = getTermVariations(term);
        const hebTerm = toHebrew(term);
        if (hebTerm !== term) variations.push(...getTermVariations(hebTerm));
        const unique = [...new Set(variations)];
        const parts = unique.map(v => {
            const escaped = v.replace(/"/g, '""');
            if (v.endsWith('%')) return `"${escaped}"`;
            return `"${escaped}"*`;
        });
        return `(${parts.join(' OR ')})`;
    }).join(' AND ');
};

// Search all products
app.post('/api/search-all-products', async (req, res) => {
  const { query } = req.body;
  if (!query || query.length < 2) return res.json([]);
  try {
    const rawTerms = query.trim().split(/\s+/);
    const ftsQuery = buildFtsQuery(rawTerms);
    const { showSbox = 'false', showClubPromos = 'false' } = req.query;

    const results = await db.all(`
      SELECT items_fts.supermarket_id, s.name as supermarket_name, items_fts.remote_name, items_fts.price, items_fts.remote_id, GROUP_CONCAT(
          CASE 
            WHEN (? = 'true' OR sp.description NOT LIKE '%SBOX%') 
                 AND (? = 'true' OR sp.description NOT LIKE '%מבצע מועדון%')
                 AND sp.description != items_fts.remote_name
            THEN sp.description 
            ELSE NULL 
          END, 
          ' | '
      ) as promo_description, items_fts.branch_info
      FROM items_fts
      JOIN supermarkets s ON items_fts.supermarket_id = s.id
      LEFT JOIN supermarket_promos sp ON sp.supermarket_id = items_fts.supermarket_id AND sp.remote_id = items_fts.remote_id AND sp.branch_info = items_fts.branch_info
      WHERE items_fts MATCH ? AND s.is_active = 1
      GROUP BY items_fts.supermarket_id, items_fts.remote_id
      LIMIT 100
    `, [showSbox, showClubPromos, ftsQuery]);

    // Standardize product names
    const standardizedResults = results.map(item => ({
      ...item,
      remote_name: standardizeName(item.remote_name)
    }));

    res.json(standardizedResults);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Comparison endpoint
app.get('/api/comparison', async (req, res) => {
  try {
    const { showSbox = 'false', showClubPromos = 'false' } = req.query;
    const activeSupermarkets = await db.all('SELECT id, name FROM supermarkets WHERE is_active = 1');
    const shoppingList = await db.all(`SELECT sl.id as listId, sl.quantity, i.name as itemName, i.id as itemId FROM shopping_list sl JOIN items i ON sl.item_id = i.id`);
    const comparisonResults = {};

    const findBestMatchForStore = async (itemName, storeId, showCreditCardPromos, showClubPromos, itemId, quantity) => {
        try {
            const pinned = await db.get(`SELECT remote_id FROM item_matches WHERE shopping_list_item_id = ? AND supermarket_id = ?`, [itemId, storeId]);
            if (pinned) {
                const pinnedItem = await db.get(`
                    SELECT si.remote_name, si.price, si.remote_id, GROUP_CONCAT(
                        CASE 
                            WHEN (? = 'true' OR sp.description NOT LIKE '%SBOX%') 
                                 AND (? = 'true' OR sp.description NOT LIKE '%מבצע מועדון%')
                                 AND sp.description != si.remote_name
                            THEN sp.description 
                            ELSE NULL 
                        END, 
                        ' | '
                    ) as promo_description
                    FROM supermarket_items si
                    LEFT JOIN supermarket_promos sp ON sp.supermarket_id = si.supermarket_id AND si.remote_id = sp.remote_id AND (sp.branch_info IS NULL OR sp.branch_info = si.branch_info)
                    WHERE si.supermarket_id = ? AND si.remote_id = ?
                    GROUP BY si.remote_id
                `, [showCreditCardPromos, showClubPromos, storeId, pinned.remote_id]);
                if (pinnedItem) return { 
                    ...pinnedItem, 
                    remote_name: standardizeName(pinnedItem.remote_name),
                    is_pinned: true 
                };
            }
        } catch (e) { console.error("Pin check failed:", e); }

        try {
            const cleanQuery = itemName.replace(/["']/g, '');
            const terms = cleanQuery.trim().split(/\s+/);
            const ftsQuery = buildFtsQuery(terms);
            const matches = await db.all(`
                SELECT items_fts.remote_name, items_fts.price, items_fts.remote_id, GROUP_CONCAT(
                    CASE 
                        WHEN (? = 'true' OR sp.description NOT LIKE '%SBOX%') 
                             AND (? = 'true' OR sp.description NOT LIKE '%מבצע מועדון%')
                             AND sp.description != items_fts.remote_name
                        THEN sp.description 
                        ELSE NULL 
                    END, 
                    ' | '
                ) as promo_description
                FROM items_fts
                LEFT JOIN supermarket_promos sp ON sp.supermarket_id = items_fts.supermarket_id AND sp.remote_id = items_fts.remote_id AND (sp.branch_info IS NULL OR sp.branch_info = items_fts.branch_info)
                WHERE items_fts.supermarket_id = ? AND items_fts MATCH ?
                GROUP BY items_fts.remote_id
                ORDER BY items_fts.rank
                LIMIT 10
            `, [showCreditCardPromos, showClubPromos, storeId, ftsQuery]);
            
            if (matches.length === 0) return null;
            let bestCandidate = null;
            let lowestTotal = Infinity;
            for (const m of matches) {
                const { total } = calculateBestPrice(m, quantity);
                if (total < lowestTotal) {
                    lowestTotal = total;
                    bestCandidate = { 
                        ...m, 
                        remote_name: standardizeName(m.remote_name),
                        is_pinned: false 
                    };
                }
            }
            return bestCandidate;
        } catch (err) { console.error("FTS Matching failed:", err); return null; }
    };

    for (const store of activeSupermarkets) {
      const results = [];
      for (const item of shoppingList) {
          const match = await findBestMatchForStore(item.itemName, store.id, showSbox, showClubPromos, item.itemId, item.quantity);
          const bestPriceInfo = match ? calculateBestPrice(match, item.quantity) : null;
          results.push({
              item: { itemName: item.itemName, id: item.listId }, 
              name: match ? match.remote_name : 'Not Found',
              price: bestPriceInfo ? `₪${bestPriceInfo.total.toFixed(2)}` : 'N/A',
              rawPrice: match ? match.price : 0,
              effectivePrice: bestPriceInfo ? (bestPriceInfo.total / item.quantity) : 0,
              quantity: item.quantity,
              promo_description: match ? match.promo_description : null,
              remote_id: match ? match.remote_id : null,
              supermarket_id: store.id,
              is_pinned: !!match?.is_pinned
          });
      }
      comparisonResults[store.id] = { results, coupons: [] };
    }
    res.json(comparisonResults);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/shopping-list/match', async (req, res) => {
  const { shoppingListItemId, supermarketId, remoteId } = req.body;
  if (!shoppingListItemId || !supermarketId || !remoteId) return res.status(400).json({ error: 'Missing fields' });
  try {
    await db.run(`REPLACE INTO item_matches (shopping_list_item_id, supermarket_id, remote_id) VALUES (?, ?, ?)`, [shoppingListItemId, supermarketId, remoteId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shopping-list/matches', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM item_matches')); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/shopping-list/match', async (req, res) => {
  const { shoppingListItemId, supermarketId } = req.query;
  if (!shoppingListItemId || !supermarketId) return res.status(400).json({ error: 'Missing fields' });
  try {
    await db.run('DELETE FROM item_matches WHERE shopping_list_item_id = ? AND supermarket_id = ?', [shoppingListItemId, supermarketId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const { scrapeStore } = require('./scraper');
const { scrapeAllStores } = require('./utils/scrapeScheduler');

app.post('/api/scrape', async (req, res) => {
  const supermarkets = await db.all('SELECT * FROM supermarkets WHERE is_active = 1');
  const shoppingList = await db.all(`SELECT sl.quantity, i.name as itemName, i.id as itemId FROM shopping_list sl JOIN items i ON sl.item_id = i.id`);
  scrapeAllStores(supermarkets, shoppingList, io, saveDiscoveryResults);
  res.json({ message: 'Comparison started' });
});

app.post('/api/scrape/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const supermarket = await db.get('SELECT * FROM supermarkets WHERE id = ?', [id]);
    if (!supermarket) return res.status(404).json({ error: 'Supermarket not found' });
    const shoppingList = await db.all(`SELECT sl.quantity, i.name as itemName, i.id as itemId FROM shopping_list sl JOIN items i ON sl.item_id = i.id`);
    
    // Start scraping in background
    scrapeStore(supermarket, shoppingList, io, saveDiscoveryResults)
      .catch(err => console.error(`Background scrape error for ${supermarket.name}:`, err));

    res.json({ message: `Scrape for ${supermarket.name} started` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function start() {
  db = await initDb();
  try {
    const ftsCount = await db.get('SELECT COUNT(*) as count FROM items_fts');
    if (ftsCount && ftsCount.count === 0) {
      console.log("FTS index empty, populating...");
      const items = await db.all('SELECT remote_name, remote_id, supermarket_id, price, branch_info FROM supermarket_items');
      if (items.length > 0) {
        await db.run('BEGIN TRANSACTION');
        const insert = await db.prepare('INSERT INTO items_fts (remote_name, remote_id, supermarket_id, price, branch_info) VALUES (?, ?, ?, ?, ?)');
        for (const item of items) await insert.run(item.remote_name, item.remote_id, item.supermarket_id, item.price, item.branch_info);
        await insert.finalize();
        await db.run('COMMIT');
        console.log(`Population complete. Indexed ${items.length} items.`);
      }
    }
  } catch (err) { console.error("Error during startup FTS check:", err); }
  server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}
start();
