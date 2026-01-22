const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    console.log('1. Clearing old search index...');
    await db.exec('DELETE FROM items_fts');
    
    console.log('2. Reading corrected data from database...');
    const items = await db.all('SELECT remote_name, remote_id, supermarket_id, price, branch_info FROM supermarket_items');
    
    if (items.length === 0) {
        console.log('Warning: No items found in database. Have you scraped yet?');
        return;
    }

    console.log(`3. Re-indexing ${items.length} items (this may take a moment)...`);
    
    await db.run('BEGIN TRANSACTION');
    const insert = await db.prepare('INSERT INTO items_fts (remote_name, remote_id, supermarket_id, price, branch_info) VALUES (?, ?, ?, ?, ?)');
    
    for (const item of items) {
      await insert.run(item.remote_name, item.remote_id, item.supermarket_id, item.price, item.branch_info);
    }
    
    await insert.finalize();
    await db.run('COMMIT');
    
    console.log('✅ Success! Search index is now fully synced with corrected names.');

  } catch (err) {
    console.error('Error re-indexing:', err);
  }
})();
