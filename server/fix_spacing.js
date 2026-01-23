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

  // NEW: Add % to trailing fat content numbers (e.g. "גאודה 28" -> "גאודה 28%")
  // REFINED: Only if it looks like a dairy product AND not followed by count units
  const isDairyProduct = /(גבינה|גבינ|שמנת|יוגורט|חלב|לאבנה|קוטג|בוראטה|גאודה|טל העמק|עמק)/i.test(text);
  if (isDairyProduct) {
      fixed = fixed.replace(/(\D\s)(\d{1,2})(\s|$)/g, (match, p1, p2, p3) => {
          if (p3.includes('%') || p3.includes('יחידות') || p3.includes('יח') || p3.includes('גרם') || p3.includes('מל')) return match;
          return `${p1}${p2}%${p3}`;
      });
  }

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
  fixed = fixed.replace(/(\d+)\s+ב-?\s*(?!₪)([2-9]\d*(\.\d+)?|1\d+(\.\d+)?)/g, '$1 ב ₪$2');
  fixed = fixed.replace(/(\sב-?)\s*(?!₪)(\d+(\.\d+)?)(?!\d)(?!\s*(%|₪|ש"ח|שח))/g, '$1₪$2');

  // Normalize ₪ position
  fixed = fixed.replace(/(\d+(\.\d+)?)\s*₪/g, '₪$1');
  fixed = fixed.replace(/₪\s+/g, '₪');
  fixed = fixed.replace(/₪+/g, '₪');

  return fixed;
}

db.serialize(() => {
  console.log("Starting cleanup of incorrect % signs...");
  
  const badPatterns = ['% יחידות', '% יח', '% גרם', '% ג"', '% מל', '% מ"ל', '% ליטר'];
  
  db.run("BEGIN TRANSACTION");
  badPatterns.forEach(pattern => {
    const replacement = pattern.replace('% ', ' ');
    db.run("UPDATE supermarket_items SET remote_name = REPLACE(remote_name, ?, ?) WHERE remote_name LIKE ?", [pattern, replacement, `%${pattern}%`]);
    db.run("UPDATE supermarket_promos SET description = REPLACE(description, ?, ?) WHERE description LIKE ?", [pattern, replacement, `%${pattern}%`]);
  });
  db.run("COMMIT", () => {
    console.log("Cleanup complete. Starting refined normalization...");

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
});
