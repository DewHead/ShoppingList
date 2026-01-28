const axios = require('axios');
const https = require('https');
const tar = require('tar-stream');
const streamifier = require('streamifier');

// Create an HTTPS agent that ignores SSL errors
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function axiosGetWithRetry(url, retries = 3, delay = 2000, cookieHeader = null) {
  for (let i = 0; i < retries; i++) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      return await axios.get(url, { 
        responseType: 'arraybuffer', 
        timeout: 30000,
        httpsAgent: httpsAgent,
        headers: headers
      });
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1} for ${url} due to: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

function extractTarballInMemory(buffer) {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const files = {};

    extract.on('entry', (header, stream, next) => {
      let chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files[header.name] = Buffer.concat(chunks);
        next();
      });
      stream.on('error', (err) => {
          next(err);
      });
      stream.resume();
    });

    extract.on('finish', () => {
      resolve(files);
    });

    extract.on('error', (err) => {
      reject(err);
    });

    streamifier.createReadStream(buffer).pipe(extract);
  });
}

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
          // Explicitly avoid count units
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

module.exports = {
  randomDelay,
  axiosGetWithRetry,
  extractTarballInMemory,
  fixSpacing,
  formatPromo
};
