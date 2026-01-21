const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function populateFts() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  console.log('Starting FTS population...');

  try {
    // Clear existing FTS data to avoid duplicates
    await db.run('DELETE FROM items_fts');

    // Select data from source table
    const items = await db.all(`
      SELECT remote_name, remote_id, supermarket_id, price, branch_info 
      FROM supermarket_items
    `);

    console.log(`Found ${items.length} items to index.`);

    if (items.length > 0) {
      await db.run('BEGIN TRANSACTION');
      const insert = await db.prepare(`
        INSERT INTO items_fts (remote_name, remote_id, supermarket_id, price, branch_info)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        await insert.run(
          item.remote_name, 
          item.remote_id, 
          item.supermarket_id, 
          item.price, 
          item.branch_info
        );
      }
      
      await insert.finalize();
      await db.run('COMMIT');
    }

    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    try { await db.run('ROLLBACK'); } catch (e) {}
  } finally {
    await db.close();
  }
}

populateFts();
