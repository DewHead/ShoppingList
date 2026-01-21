const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

function fixSpacing(text) {
  if (!text) return text;
  let fixed = text;

  // 1. Normalize measurement patterns like "40*8"
  fixed = fixed.replace(/(\d+(\.\d+)?)\s*\*\s*(ג|גר|גרם|מל|מ"ל)?\s*(\d+(\.\d+)?)/g, (match, p1, p2, unit, p4, p5) => {
      let numA = parseFloat(p1);
      let numB = parseFloat(p4);
      let weight, count;
      if (numA > numB) {
          if (numB <= 30) { weight = numA; count = numB; } 
          else { weight = numB; count = numA; }
      } else {
          if (numA <= 30) { weight = numB; count = numA; } 
          else { weight = numA; count = numB; }
      }
      const finalUnit = (unit === 'מל' || unit === 'מ"ל') ? 'מ"ל' : 'גרם';
      return `${count} יח * ${weight} ${finalUnit}`;
  });

  // 2. Insert space between Hebrew/English letter and Number
  fixed = fixed.replace(/([a-zA-Z\u0590-\u05FF])(\d)/g, '$1 $2');
  fixed = fixed.replace(/(\d)([a-zA-Z\u0590-\u05FF])/g, '$1 $2');

  // 3. Specific fix for percent sign
  fixed = fixed.replace(/(%)(\S)/g, '$1 $2');

  // 4. Normalize common units
  fixed = fixed.replace(/(\d+)\s*\*\s*(ג|גר|גרם|מל|מ"ל)(\s|$)/g, '$1 $2$3');
  fixed = fixed.replace(/(\d+)\s*(ג|גר|גר')(\s|$)/g, '$1 גרם$3');
  fixed = fixed.replace(/(\d+)\s*(מל|מ"ל|מ'|מ)(\s|$)/g, '$1 מ"ל$3');

  // NEW: Normalize Liter variations
  fixed = fixed.replace(/(\d+)\s*(ליטר|ליט|ל'|ל)(\s|$)/g, '$1 ליטר$3');

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

db.serialize(() => {
  // 1. Fix supermarket_items
  db.all("SELECT id, remote_name FROM supermarket_items", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    
    console.log(`Found ${rows.length} items. Processing...`);
    
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("UPDATE supermarket_items SET remote_name = ? WHERE id = ?");
    
    let changed = 0;
    rows.forEach(row => {
      const fixedName = fixSpacing(row.remote_name);
      if (fixedName !== row.remote_name) {
        stmt.run(fixedName, row.id);
        changed++;
        if (changed <= 5) console.log(`Fixed Item: '${row.remote_name}' -> '${fixedName}'`);
      }
    });
    
    stmt.finalize();
    db.run("COMMIT", () => {
      console.log(`Finished Items. Updated ${changed} items.`);
      
      // 2. Fix supermarket_promos
      db.all("SELECT supermarket_id, remote_id, branch_info, promo_id, description FROM supermarket_promos", (err, promoRows) => {
        if (err) {
          console.error(err);
          return;
        }

        console.log(`Found ${promoRows.length} promos. Processing...`);

        db.run("BEGIN TRANSACTION");
        const promoStmt = db.prepare("UPDATE supermarket_promos SET description = ? WHERE supermarket_id = ? AND remote_id = ? AND branch_info = ? AND promo_id = ?");

        let promoChanged = 0;
        promoRows.forEach(row => {
          const fixedDesc = formatPromo(row.description);
          if (fixedDesc !== row.description) {
            promoStmt.run(fixedDesc, row.supermarket_id, row.remote_id, row.branch_info, row.promo_id);
            promoChanged++;
            if (promoChanged <= 5) console.log(`Fixed Promo: '${row.description}' -> '${fixedDesc}'`);
          }
        });

        promoStmt.finalize();
        db.run("COMMIT", () => {
          console.log(`Finished Promos. Updated ${promoChanged} promos.`);
          db.close();
        });
      });
    });
  });
});
