const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.get("SELECT count(*) as count FROM supermarket_items WHERE supermarket_id = 1", (err, row) => {
    if (err) console.error(err);
    else console.log(`Total items for store 1: ${row.count}`);
  });

  db.all("SELECT remote_name FROM supermarket_items WHERE supermarket_id = 1 LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log("Sample items:");
        rows.forEach(r => console.log(r.remote_name));
    }
  });
});

db.close();
