const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Check for FTS migration (trigram -> unicode61 or missing tokenchars)
  const ftsTable = await db.get("SELECT sql FROM sqlite_master WHERE name='items_fts'");
  if (ftsTable && ftsTable.sql && (ftsTable.sql.includes('trigram') || !ftsTable.sql.includes("tokenchars"))) {
    console.log('Migrating items_fts (tokenizer update)...');
    await db.exec('DROP TABLE items_fts');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS supermarkets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      last_scrape_time DATETIME
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS supermarket_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supermarket_id INTEGER,
      item_id INTEGER,
      remote_id TEXT,
      remote_name TEXT,
      branch_info TEXT,
      price REAL,
      unit_of_measure TEXT,
      unit_of_measure_price REAL,
      manufacturer TEXT,
      country TEXT,
      last_updated DATETIME,
      is_favorite BOOLEAN DEFAULT 0,
      FOREIGN KEY (supermarket_id) REFERENCES supermarkets (id),
      FOREIGN KEY (item_id) REFERENCES items (id)
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (item_id) REFERENCES items (id)
    );

    CREATE TABLE IF NOT EXISTS supermarket_promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supermarket_id INTEGER,
      branch_info TEXT,
      remote_id TEXT,
      promo_id TEXT,
      description TEXT,
      last_updated DATETIME,
      FOREIGN KEY (supermarket_id) REFERENCES supermarkets (id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      remote_name, 
      remote_id, 
      supermarket_id UNINDEXED, 
      price UNINDEXED, 
      branch_info UNINDEXED,
      tokenize='unicode61 tokenchars '''''
    );

    CREATE TABLE IF NOT EXISTS item_matches (
      shopping_list_item_id INTEGER,
      supermarket_id INTEGER,
      remote_id TEXT,
      PRIMARY KEY (shopping_list_item_id, supermarket_id)
    );
  `);

  // Migration: Add branch_info to supermarket_items if not present
  try {
    const tableInfo = await db.all("PRAGMA table_info(supermarket_items)");
    const hasBranchInfo = tableInfo.some(col => col.name === 'branch_info');
    if (!hasBranchInfo) {
      console.log('Migrating database: Adding branch_info to supermarket_items');
      await db.exec('ALTER TABLE supermarket_items ADD COLUMN branch_info TEXT');
    }

    const newCols = [
      { name: 'unit_of_measure', type: 'TEXT' },
      { name: 'unit_of_measure_price', type: 'REAL' },
      { name: 'manufacturer', type: 'TEXT' },
      { name: 'country', type: 'TEXT' }
    ];

    for (const col of newCols) {
      if (!tableInfo.some(c => c.name === col.name)) {
        console.log(`Migrating database: Adding ${col.name} to supermarket_items`);
        await db.exec(`ALTER TABLE supermarket_items ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    const supermarketTableInfo = await db.all("PRAGMA table_info(supermarkets)");
    const hasLastScrapeTime = supermarketTableInfo.some(col => col.name === 'last_scrape_time');
    if (!hasLastScrapeTime) {
      console.log('Migrating database: Adding last_scrape_time to supermarkets');
      await db.exec('ALTER TABLE supermarkets ADD COLUMN last_scrape_time DATETIME');
    }

    // Add indexes for performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_si_supermarket_id ON supermarket_items(supermarket_id);
      CREATE INDEX IF NOT EXISTS idx_si_remote_id ON supermarket_items(remote_id);
      CREATE INDEX IF NOT EXISTS idx_si_branch ON supermarket_items(branch_info);
      CREATE INDEX IF NOT EXISTS idx_sp_lookup ON supermarket_promos(supermarket_id, remote_id, branch_info);
    `);

    // Update Rami Levy URL if it exists with old URL
    await db.run(`
      UPDATE supermarkets 
      SET url = 'https://url.publishedprices.co.il/login' 
      WHERE name LIKE '%רמי לוי%' AND url LIKE '%rami-levy%'
    `);
  } catch (err) {
    console.error('Migration error:', err.message);
  }

  // Seed default supermarkets if empty
  const count = await db.get('SELECT COUNT(*) as count FROM supermarkets');
  if (count.count === 0) {
    const defaults = [
      { name: 'שופרסל (כללי)', url: 'https://www.shufersal.co.il/online/he/' },
      { name: 'רמי לוי (כללי)', url: 'https://url.publishedprices.co.il/login' },
      { name: 'יוחננוף (דיזיין פלוס)', url: 'https://yochananof.co.il/' },
      { name: 'ויקטורי (שדרות דויד בן גוריון)', url: 'https://www.victoryonline.co.il/' },
      { name: 'קרפור מרקט (נווה זאב)', url: 'https://www.carrefour.co.il/' },
      { name: 'קשת טעמים (ישפרו פלאנט)', url: 'https://www.keshet-teamim.co.il/' },
      { name: 'טאיו (חיים יחיל)', url: 'https://tayo.co.il/' },
      { name: 'מחסני השוק (כללי)', url: 'https://www.mahsaneyshak.co.il/online' } // Placeholder URL
    ];

    for (const s of defaults) {
      await db.run('INSERT INTO supermarkets (name, url) VALUES (?, ?)', [s.name, s.url]);
    }
  }

  return db;
}

module.exports = { initDb };
