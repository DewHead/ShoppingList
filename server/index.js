const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDb } = require('./db');

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

// Helper to save discovery results directly from server-side scraper
async function saveDiscoveryResults(storeId, products, promos) {
  try {
    // 1. Save Products
    if (products && products.length > 0) {
      console.log(`Directly saving ${products.length} discovered items from store ${storeId}...`);
      
      // Snapshot approach: clear old items
      await db.run('DELETE FROM supermarket_items WHERE supermarket_id = ?', [storeId]);
      
      await db.run('BEGIN TRANSACTION');
      const insertItemStmt = await db.prepare('INSERT OR IGNORE INTO items (name) VALUES (?)');
      const insertSupermarketItemStmt = await db.prepare(`
        INSERT INTO supermarket_items (
          supermarket_id, item_id, remote_id, remote_name, branch_info, 
          price, unit_of_measure, unit_of_measure_price, manufacturer, country, last_updated
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const uniqueProducts = new Map();
      for (const item of products) {
        const key = `${item.remote_id}_${item.branch_info}`;
        uniqueProducts.set(key, item);
      }

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

      // Update last_scrape_time for the supermarket
      await db.run('UPDATE supermarkets SET last_scrape_time = ? WHERE id = ?', [new Date().toISOString(), storeId]);

      console.log(`Successfully saved ${uniqueProducts.size} items to supermarket_items for store ${storeId}.`);
    }

    // 2. Save Promos
    if (promos && promos.length > 0) {
      console.log(`Saving ${promos.length} discovered promos from store ${storeId}...`);
      
      // Snapshot approach: clear old promos
      await db.run('DELETE FROM supermarket_promos WHERE supermarket_id = ?', [storeId]);
      
      await db.run('BEGIN TRANSACTION');
      const insertPromoStmt = await db.prepare(`
        INSERT INTO supermarket_promos (supermarket_id, branch_info, remote_id, promo_id, description, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Deduplicate promos to avoid exact same entries
      const uniquePromos = new Map();
      for (const promo of promos) {
          const key = `${promo.remote_id}_${promo.promo_id}_${promo.branch_info}`;
          uniquePromos.set(key, promo);
      }

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
    }
  } catch (err) {
    if (db) await db.run('ROLLBACK');
    console.error('Error saving discovery data:', err.message);
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
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(si.remote_name, ',', ' '), '-', ' '), ')', ' '), '(', ' '), '''', ' ') 
        || ' '
      `;
      
      const termsOriginal = search.trim().split(/\s+/);
      const hebrewQuery = toHebrew(search);
      const termsHebrew = hebrewQuery !== search ? hebrewQuery.trim().split(/\s+/) : [];

      // Helper to build conditions for a set of terms (with variations)
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
              variations.forEach(v => params.push(`% ${escapeLike(v)} %`));
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
      filteredQuery += ` AND (${conditionClause} OR si.remote_id LIKE ? OR sp.description LIKE ?)`;
      
      countParams.push(...queryParams);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    filteredQuery += ` GROUP BY si.id`;
    
    // We need to use the alias in HAVING, so we must include the GROUP_CONCAT in the subquery
    const wrapperQuery = `
      SELECT si.id, 
      GROUP_CONCAT(
          CASE WHEN ? = 'true' OR sp.description NOT LIKE '%SBOX%' THEN sp.description ELSE NULL END,
          ' | '
      ) as promo_description
      ${filteredQuery}
    `;
    const wrapperParams = [showSbox, ...countParams];

    const finalCountQuery = `SELECT COUNT(*) as total FROM (${wrapperQuery}) ${onlyPromos === 'true' ? 'WHERE promo_description IS NOT NULL' : ''}`;
    const countResult = await db.get(finalCountQuery, wrapperParams);
    const total = countResult ? countResult.total : 0;

    // Get paginated data
    let dataQuery = `
      SELECT si.*, 
      GROUP_CONCAT(
          CASE WHEN ? = 'true' OR sp.description NOT LIKE '%SBOX%' THEN sp.description ELSE NULL END,
          ' | '
      ) as promo_description
      ${filteredQuery}
    `;
    if (onlyPromos === 'true') {
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
    
    // Params: search term for "starts with" sort, then limit, then offset
    const dataParams = [showSbox, ...countParams, `${search}%`, parseInt(limit), parseInt(offset)];

    const items = await db.all(dataQuery, dataParams);
    
    res.json({
      items,
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

// New endpoint to get unique branches for a store
app.get('/api/supermarkets/:id/branches', async (req, res) => {
  try {
    const branches = await db.all(`
      SELECT DISTINCT branch_info FROM supermarket_items 
      WHERE supermarket_id = ? AND branch_info IS NOT NULL
    `, [req.params.id]);
    res.json(branches.map(b => b.branch_info));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/supermarkets/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  await db.run(
    'UPDATE supermarkets SET is_active = ? WHERE id = ?',
    [is_active ? 1 : 0, id]
  );
  res.json({ success: true });
});

// Shopping List
app.get('/api/shopping-list', async (req, res) => {
  const list = await db.all(`
    SELECT sl.id, sl.quantity, i.name as itemName, i.id as itemId
    FROM shopping_list sl
    JOIN items i ON sl.item_id = i.id
  `);
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
  const { quantity } = req.body;
  await db.run('UPDATE shopping_list SET quantity = ? WHERE id = ?', [quantity, req.params.id]);
  res.json({ success: true });
});

require('dotenv').config();

// Get items (for autocomplete)
app.get('/api/items', async (req, res) => {
  const items = await db.all('SELECT * FROM items');
  res.json(items);
});

// Helper to escape SQL LIKE wildcards
function escapeLike(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

function getTermVariations(term) {
    const res = [term];
    // Hebrew Construct State Heuristic (Semichut)
    // Endings: ה <-> ת
    // Plural: ה <-> ות
    
    // Only apply to Hebrew words (range \u0590-\u05FF)
    if (!/[\u0590-\u05FF]/.test(term)) return res;
    if (term.length < 3) return res;

    const end1 = term.slice(-1);
    const end2 = term.slice(-2);
    
    if (end1 === 'ה') {
        res.push(term.slice(0, -1) + 'א'); // extra variation for loan words
        if (term.endsWith('יה')) {
            // e.g. Tortilla (טורטיה) -> Tortillas (טורטיות), construct (טורטיית)
            // But NOT 'Tortit' (טורטית) which is a different word
            res.push(term.slice(0, -1) + 'ות');
            res.push(term.slice(0, -2) + 'יית');
        } else {
            res.push(term.slice(0, -1) + 'ת');
            res.push(term.slice(0, -1) + 'ות');
        }
    } else if (end1 === 'א') {
        res.push(term.slice(0, -1) + 'ה');
    } else if (end1 === 'ת') {
        res.push(term.slice(0, -1) + 'ה');
    } else if (end2 === 'ות') {
        res.push(term.slice(0, -2) + 'ה');
    }
    
    return res;
}

const buildConditions = (terms, includeVariations = true, cleanExpr) => {
    const termConditions = terms.map(term => {
        const variations = includeVariations ? getTermVariations(term) : [term];
        const variationClause = variations.map(() => `${cleanExpr} LIKE ? ESCAPE '\\'`).join(' OR ');
        return `(${variationClause})`; 
    });
    return termConditions.join(' AND ');
};

const buildParams = (terms, includeVariations = true) => {
    const params = [];
    terms.forEach(term => {
        const variations = includeVariations ? getTermVariations(term) : [term];
        variations.forEach(v => params.push(`% ${escapeLike(v)} %`));
    });
    return params;
};

// Search across all products
app.post('/api/search-all-products', async (req, res) => {
  const { query } = req.body;
  if (!query || query.length < 2) {
    return res.json([]);
  }
  
  try {
    let rawTerms = query.trim().split(/\s+/);
    
    // Auto-convert to Hebrew if input looks like English (and searching for Hebrew products)
    const hebrewQuery = toHebrew(query);
    // If the conversion is different (meaning input had mappable chars), allow searching for both
    // For simplicity, let's just search for the Hebrew version if the original yields no/low results OR just search for both always.
    // Searching for both is safer.
    if (hebrewQuery !== query) {
        rawTerms.push(...hebrewQuery.trim().split(/\s+/));
    }
    
    // De-duplicate terms
    rawTerms = [...new Set(rawTerms)];

    const cleanNameExpr = `
      ' ' || 
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(si.remote_name, ',', ' '), '-', ' '), ')', ' '), '(', ' '), '''', ' ') 
      || ' '
    `;

    // Use ESCAPE '\' for each LIKE condition.
    // For multiple terms, we usually want (term1 AND term2).
    // If we have English + Hebrew variants, we want:
    // (term1_eng OR term1_heb) AND (term2_eng OR term2_heb) ...
    // But simplified approach: just treat all distinct tokens as OR candidates? No, user usually types one phrase.
    // If user types "k,ui" -> "לחם". 
    // We should probably run two separate queries logic: "Match original" OR "Match converted".
    
    // Construct conditions for Original Query OR Converted Query
    const termsOriginal = query.trim().split(/\s+/);
    const termsHebrew = hebrewQuery !== query ? hebrewQuery.trim().split(/\s+/) : [];
    
    const condOrigExact = buildConditions(termsOriginal, false, cleanNameExpr);
    const parsOrigExact = buildParams(termsOriginal, false);
    const condOrigVar = buildConditions(termsOriginal, true, cleanNameExpr);
    const parsOrigVar = buildParams(termsOriginal, true);
    
    let whereClause = `((${condOrigVar}) OR si.remote_id LIKE ?)`;
    let queryParams = [...parsOrigVar, `%${query}%`];
    
    let condHebExact = '1=0';
    let parsHebExact = [];
    let condHebVar = '1=0';
    let parsHebVar = [];

    if (termsHebrew.length > 0) {
       condHebExact = buildConditions(termsHebrew, false, cleanNameExpr);
       parsHebExact = buildParams(termsHebrew, false);
       condHebVar = buildConditions(termsHebrew, true, cleanNameExpr);
       parsHebVar = buildParams(termsHebrew, true);
       
       whereClause = `((${condOrigVar}) OR (${condHebVar}) OR si.remote_id LIKE ?)`;
       queryParams = [...parsOrigVar, ...parsHebVar, `%${query}%`];
    }

    const finalQuery = `
      SELECT * FROM (
        SELECT 
          si.supermarket_id,
          s.name as supermarket_name,
          si.remote_name,
          si.price,
          si.remote_id,
          GROUP_CONCAT(sp.description, ' | ') as promo_description,
          (
            (CASE WHEN ${cleanNameExpr} LIKE ? ESCAPE '\\' THEN 150 ELSE 0 END) +
            (CASE WHEN ${condOrigExact} THEN 100 ELSE 0 END) +
            (CASE WHEN si.remote_name = ? THEN 50 ELSE 0 END) +
            (CASE WHEN si.remote_name LIKE ? THEN 20 ELSE 0 END) +
            (CASE WHEN ${condOrigVar} THEN 10 ELSE 0 END) +
            (CASE WHEN ${condHebVar} THEN 10 ELSE 0 END)
          ) as score
        FROM supermarket_items si
        JOIN supermarkets s ON si.supermarket_id = s.id
        LEFT JOIN supermarket_promos sp ON 
            sp.supermarket_id = si.supermarket_id AND 
            sp.remote_id = si.remote_id AND 
            sp.branch_info = si.branch_info
        WHERE (${whereClause} OR si.remote_id = ?) AND s.is_active = 1
        GROUP BY si.supermarket_id, si.remote_id
      ) WHERE score > 0
      ORDER BY 
        score DESC,
        LENGTH(remote_name) ASC,
        price ASC
    `;
    
    // Params for scoring and where clause
    const allParams = [
        `% ${escapeLike(query)} %`, // for whole phrase match score
        ...parsOrigExact,           // for condOrigExact in score
        query,                      // for exact match score
        `${query}%`,                // for starts-with score
        ...parsOrigVar,             // for condOrigVar in score
        ...parsHebVar,              // for condHebVar in score
        ...queryParams,             // for whereClause
        query                       // for remote_id match
    ];
    
    const results = await db.all(finalQuery, allParams);
    res.json(results);
  } catch (err) {
    console.error('Error searching products:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get comparison data (Calculates totals and matches shopping list items to store snapshots)
app.get('/api/comparison', async (req, res) => {
  try {
    const { showSbox = 'false' } = req.query;
    const activeSupermarkets = await db.all('SELECT id, name FROM supermarkets WHERE is_active = 1');
    const shoppingList = await db.all(`
      SELECT sl.id as listId, sl.quantity, i.name as itemName
      FROM shopping_list sl
      JOIN items i ON sl.item_id = i.id
    `);

    const comparisonResults = {};

    const findBestMatchForStore = async (query, storeId, showCreditCardPromos) => {
        const hebrewQuery = toHebrew(query);
        const termsOriginal = query.trim().split(/\s+/);
        const termsHebrew = hebrewQuery !== query ? hebrewQuery.trim().split(/\s+/) : [];

        const cleanNameExpr = `
          ' ' || 
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(si.remote_name, ',', ' '), '-', ' '), ')', ' '), '(', ' '), '''', ' ') 
          || ' '
        `;

        const condOrigExact = buildConditions(termsOriginal, false, cleanNameExpr);
        const parsOrigExact = buildParams(termsOriginal, false);
        const condOrigVar = buildConditions(termsOriginal, true, cleanNameExpr);
        const parsOrigVar = buildParams(termsOriginal, true);
        
        let whereClause = `((${condOrigVar}) OR si.remote_id LIKE ?)`;
        let queryParams = [...parsOrigVar, `%${query}%`];
        
        let condHebVar = '1=0';
        let parsHebVar = [];

        if (termsHebrew.length > 0) {
           const condHebVar = buildConditions(termsHebrew, true, cleanNameExpr);
           const parsHebVar = buildParams(termsHebrew, true);
           
           whereClause = `((${condOrigVar}) OR (${condHebVar}) OR si.remote_id LIKE ?)`;
           queryParams = [...parsOrigVar, ...parsHebVar, `%${query}%`];
        }

        const matchQuery = `
          SELECT * FROM (
            SELECT 
              si.remote_name,
              si.price,
              si.remote_id,
              GROUP_CONCAT(
                  CASE 
                      WHEN ? = 'true' OR sp.description NOT LIKE '%SBOX%' 
                      THEN sp.description 
                      ELSE NULL 
                  END, 
                  ' | '
              ) as promo_description,
              (
                (CASE WHEN ${cleanNameExpr} LIKE ? ESCAPE '\\' THEN 150 ELSE 0 END) +
                (CASE WHEN ${condOrigExact} THEN 100 ELSE 0 END) +
                (CASE WHEN si.remote_name = ? THEN 50 ELSE 0 END) +
                (CASE WHEN si.remote_name LIKE ? THEN 20 ELSE 0 END) +
                (CASE WHEN ${condOrigVar} THEN 10 ELSE 0 END) +
                (CASE WHEN ${condHebVar} THEN 10 ELSE 0 END)
              ) as score
            FROM supermarket_items si
            LEFT JOIN supermarket_promos sp ON 
                sp.supermarket_id = si.supermarket_id AND 
                sp.remote_id = si.remote_id AND 
                sp.branch_info = si.branch_info
            WHERE si.supermarket_id = ? AND (${whereClause})
            GROUP BY si.remote_id
          ) WHERE score > 0
          ORDER BY score DESC, LENGTH(remote_name) ASC, price ASC
          LIMIT 1
        `;

        const allParams = [
            showCreditCardPromos,
            `% ${escapeLike(query)} %`,
            ...parsOrigExact,
            query,
            `${query}%`,
            ...parsOrigVar,
            ...parsHebVar,
            storeId,
            ...queryParams
        ];

        return await db.get(matchQuery, allParams);
    };

    for (const store of activeSupermarkets) {
      const results = [];
      for (const item of shoppingList) {
          const match = await findBestMatchForStore(item.itemName, store.id, showSbox);
          results.push({
              item: { itemName: item.itemName },
              name: match ? match.remote_name : 'Not Found',
              price: match ? `₪${(match.price * item.quantity).toFixed(2)}` : 'N/A',
              rawPrice: match ? match.price : 0,
              quantity: item.quantity,
              promo_description: match ? match.promo_description : null
          });
      }

      comparisonResults[store.id] = {
        results,
        coupons: []
      };
    }

    res.json(comparisonResults);
  } catch (err) {
    console.error('Error fetching comparison:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const { scrapeStore } = require('./scraper');

app.post('/api/scrape', async (req, res) => {
  const supermarkets = await db.all('SELECT * FROM supermarkets WHERE is_active = 1');
  
  const shoppingList = await db.all(`
    SELECT sl.quantity, i.name as itemName, i.id as itemId
    FROM shopping_list sl
    JOIN items i ON sl.item_id = i.id
  `);
  (async () => {
    for (const s of supermarkets) {
      try {
        await scrapeStore(s, shoppingList, io, saveDiscoveryResults);
      } catch (err) {
        console.error(`Scraper background error for ${s.name}:`, err);
      }
    }
  })();
  res.json({ message: 'Comparison started' });
});

app.post('/api/scrape/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const supermarket = await db.get('SELECT * FROM supermarkets WHERE id = ?', [id]);
    if (!supermarket) {
      return res.status(404).json({ error: 'Supermarket not found' });
    }

    const shoppingList = await db.all(`
      SELECT sl.quantity, i.name as itemName, i.id as itemId
      FROM shopping_list sl
      JOIN items i ON sl.item_id = i.id
    `);

    await scrapeStore(supermarket, shoppingList, io, saveDiscoveryResults);
    res.json({ message: `Scrape for ${supermarket.name} started` });
  } catch (err) {
    console.error(`Error initiating scrape for store ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  db = await initDb();
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
start();