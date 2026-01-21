const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

db.serialize(() => {
  console.log("--- Items Table ---");
  db.all("SELECT * FROM items LIMIT 10", (err, rows) => {
    console.log(rows);
  });

  console.log("--- Shopping List ---");
  db.all("SELECT sl.*, i.name FROM shopping_list sl JOIN items i ON sl.item_id = i.id", (err, rows) => {
    console.log(rows);
  });

  console.log("--- Supermarket Items Sample ---");
  db.all("SELECT supermarket_id, item_id, remote_id, remote_name, price FROM supermarket_items LIMIT 10", (err, rows) => {
    console.log(rows);
  });

  db.get("SELECT COUNT(*) as count FROM supermarket_items WHERE item_id IS NOT NULL", (err, row) => {
    console.log(`\nItems with item_id linked: ${row.count}`);
    db.close();
  });
});

