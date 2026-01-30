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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };
      
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      // Add Referer if it's a file download from PublishedPrices
      if (url.includes('publishedprices.co.il')) {
          headers['Referer'] = 'https://url.publishedprices.co.il/file/d/';
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
  // REFINED: Only if it looks like a dairy product AND not a promo string
  const isDairyProduct = /(גבינה|גבינ|שמנת|יוגורט|חלב|לאבנה|קוטג|בוראטה|גאודה|טל העמק|עמק)/i.test(text);
  const isPromo = /(ב|קופון|מבצע|השני|השלישי)/i.test(text);
  
  if (isDairyProduct && !isPromo) {
      fixed = fixed.replace(/(\D\s)(\d{1,2})(\s|$)/g, (match, p1, p2, p3) => {
          // Explicitly avoid count units
          if (p3 && (
              p3.includes('%') || 
              p3.includes('יחידות') || 
              p3.includes('יח') || 
              p3.includes('גרם') || 
              p3.includes('מל')
          )) return match;
          return `${p1}${p2}%${p3}`;
      });
  }

  // 5. Final space normalization
  fixed = fixed.replace(/\s+/g, ' ').trim();
  return fixed;
}

function formatPromo(text) {
  if (!text) return text;
  
  // Strip any existing "₪" to avoid double-processing
  let fixed = String(text).replace(/₪/g, '').replace(/ש"ח/g, '').replace(/שח/g, '');
  
  fixed = fixSpacing(fixed);
  
  // Restore/Add ₪ in correct places
  // Handle "X ב Y"
  if (fixed) {
    fixed = fixed.replace(/(\d+)\s+ב-?\s*(\d+(\.\d+)?)/g, '$1 ב ₪$2');
    
    // Handle "קופון ... ב Y"
    if (fixed.includes('קופון')) {
        fixed = fixed.replace(/ב-?\s*(\d+(\.\d+)?)$/, 'ב ₪$1');
    }

    // Handle single "ב Y" if not already caught
    fixed = fixed.replace(/(\sב-?)\s*(\d+(\.\d+)?)(?!\d)(?!\s*%)/g, '$1₪$2');

    // Normalize ₪ position
    fixed = fixed.replace(/(\d+(\.\d+)?)\s*₪/g, '₪$1');
    fixed = fixed.replace(/₪\s+/g, '₪');
    fixed = fixed.replace(/₪+/g, '₪');
  }

  return fixed;
}

module.exports = {
  randomDelay,
  axiosGetWithRetry,
  extractTarballInMemory,
  fixSpacing,
  formatPromo
};
