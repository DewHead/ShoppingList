const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb(filename = 'database.sqlite') {
  const db = await open({
    filename: path.join(__dirname, filename),
    driver: sqlite3.Database
  });

  // Optimize for concurrency
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.configure('busyTimeout', 5000);

  // Auto-fix: Rebuild if tokenizer settings are missing '%' or single quote
  try {
      const ftsDef = await db.get("SELECT sql FROM sqlite_master WHERE name = 'items_fts'");
      if (ftsDef && (!ftsDef.sql.includes('tokenchars') || !ftsDef.sql.includes('%'))) {
          console.log('FTS tokenizer settings outdated. Rebuilding FTS table...');
          await db.exec('DROP TABLE items_fts');
      }
  } catch (e) { console.log('Table check skipped'); }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS supermarkets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      last_scrape_time DATETIME,
      branch_remote_id TEXT
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
      is_done BOOLEAN DEFAULT 0,
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
      tokenize="unicode61 tokenchars '%'''"
    );

    CREATE TABLE IF NOT EXISTS item_matches (
      shopping_list_item_id INTEGER,
      supermarket_id INTEGER,
      remote_id TEXT,
      PRIMARY KEY (shopping_list_item_id, supermarket_id)
    );
  `);

  // Migrations
  try {
    const tableInfo = await db.all("PRAGMA table_info(supermarket_items)");
    if (!tableInfo.some(col => col.name === 'branch_info')) {
      await db.exec('ALTER TABLE supermarket_items ADD COLUMN branch_info TEXT');
    }
    const newCols = ['unit_of_measure', 'unit_of_measure_price', 'manufacturer', 'country'];
    for (const col of newCols) {
        if (!tableInfo.some(c => c.name === col)) {
            await db.exec(`ALTER TABLE supermarket_items ADD COLUMN ${col} TEXT`); 
        }
    }
    
    const smInfo = await db.all("PRAGMA table_info(supermarkets)");
    if (!smInfo.some(c => c.name === 'branch_remote_id')) {
        await db.exec('ALTER TABLE supermarkets ADD COLUMN branch_remote_id TEXT');
    }

    const slInfo = await db.all("PRAGMA table_info(shopping_list)");
    if (!slInfo.some(c => c.name === 'is_done')) {
        await db.exec('ALTER TABLE shopping_list ADD COLUMN is_done BOOLEAN DEFAULT 0');
    }

    // Remove Tayo if it exists (Replacement with Tiv Taam)
    const tayo = await db.get('SELECT id FROM supermarkets WHERE name LIKE ?', ['%טאיו%']);
    if (tayo) {
        console.log('Removing Tayo (replaced by Tiv Taam)...');
        await db.run('DELETE FROM supermarket_items WHERE supermarket_id = ?', [tayo.id]);
        await db.run('DELETE FROM supermarket_promos WHERE supermarket_id = ?', [tayo.id]);
        await db.run('DELETE FROM item_matches WHERE supermarket_id = ?', [tayo.id]);
        await db.run('DELETE FROM items_fts WHERE supermarket_id = ?', [tayo.id]);
        await db.run('DELETE FROM supermarkets WHERE id = ?', [tayo.id]);
    }

    // Ensure Tiv Taam exists
    const tivTaam = await db.get('SELECT id FROM supermarkets WHERE name LIKE ?', ['%טיב טעם%']);
    if (!tivTaam) {
        console.log('Adding Tiv Taam to supermarkets...');
        await db.run('INSERT INTO supermarkets (name, url, branch_remote_id) VALUES (?, ?, ?)', 
            ['טיב טעם', 'https://url.publishedprices.co.il/login', '515']);
    }

    // Cleanup legacy triggers and tables that cause performance issues
    const triggers = ['supermarket_items_ai', 'supermarket_items_ad', 'supermarket_items_au'];
    for (const trigger of triggers) {
        await db.exec(`DROP TRIGGER IF EXISTS ${trigger}`);
    }
    await db.exec('DROP TABLE IF EXISTS products_fts');

  } catch (err) { console.error('Migration error:', err.message); }

  // Seed default supermarkets if empty
  const count = await db.get('SELECT COUNT(*) as count FROM supermarkets');
  if (count.count === 0) {
    const defaults = [
      { name: 'שופרסל (כללי)', url: 'https://www.shufersal.co.il/online/he/' },
      { name: 'רמי לוי (כללי)', url: 'https://url.publishedprices.co.il/login' },
      { name: 'יוחננוף (דיזיין פלוס)', url: 'https://yochananof.co.il/', branch_remote_id: '040' },
      { name: 'ויקטורי (שדרות דויד בן גוריון)', url: 'https://www.victoryonline.co.il/', branch_remote_id: '97' },
      { name: 'קרפור מרקט (נווה זאב)', url: 'https://www.carrefour.co.il/', branch_remote_id: '5304' },
      { name: 'קשת טעמים (ישפרו פלאנט)', url: 'https://url.publishedprices.co.il/login', branch_remote_id: '018' },
      { name: 'טיב טעם', url: 'https://url.publishedprices.co.il/login', branch_remote_id: '515' },
      { name: 'מחסני השוק (כללי)', url: 'https://www.mahsaneyshak.co.il/online', branch_remote_id: '97' } 
    ];

    for (const s of defaults) {
      await db.run('INSERT INTO supermarkets (name, url, branch_remote_id) VALUES (?, ?, ?)', [s.name, s.url, s.branch_remote_id || null]);
    }
  }

  return db;
}

module.exports = { initDb };