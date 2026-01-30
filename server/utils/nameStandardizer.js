const UNIT_MAPPINGS = {
    'גרם': "ג'",
    'גר': "ג'",
    'קילוגרם': 'ק"ג',
    'קילו': 'ק"ג',
    'מיל': 'מ"ל',
    'ליטר': "ל'"
};

const MARKETING_FLUFF = [
    'במבצע',
    'חדש',
    'בלעדי',
    'מבצע!',
    '!',
    '(',
    ')'
];

const BRANDS = [
    'תנובה', 'שטראוס', 'טרה', 'אסם', 'עלית', 'סוגת', 'סנו', 'נסטלה', 'קוקה קולה', 
    'פריגת', 'יפאורה', 'זוגלובק', 'מעדני יחיעם', 'טירת צבי', 'גד', 'יוטבתה', 
    'מחלבות גד', 'וילי פוד', 'דיפלומט', 'ליימן שליסל', 'יוניליוור', 'פרוקטר אנד גמבל', 
    'שסטוביץ', 'תלמה', 'קנור', 'הלמנס', 'מזולה', 'בייגל בייגל', 'קליק', 
    'שוקולד פרה', 'פסק זמן', 'כיף כף', 'טורטית', 'טוויסט', 'פנטה', 'ספרייט', 
    'קינלי', 'נסקפה', 'טייסטרס צויס', 'יד מרדכי', 'אחווה', 'מאפיית אנגל', 
    'מאפיית ברמן', 'דנור', 'מיה', 'הנמל', 'תבואות', 'הרדוף', 'שופרסל', 
    'יוחננוף', 'ויקטורי', 'רמי לוי', 'קארפור', 'מחסני השוק', 'טיב טעם'
];

/**
 * Normalizes weight and volume units in a string.
 */
function normalizeUnits(name) {
    let normalized = name;
    for (const [key, value] of Object.entries(UNIT_MAPPINGS)) {
        const regex = new RegExp(`(^|[^א-ת])${key}(?![א-ת])`, 'g');
        normalized = normalized.replace(regex, `$1${value}`);
    }
    return normalized;
}

/**
 * Strips common marketing terms and redundant punctuation.
 */
function stripMarketingFluff(name) {
    let cleaned = name;
    MARKETING_FLUFF.forEach(term => {
        cleaned = cleaned.split(term).join('');
    });
    return cleaned.replace(/\s\s+/g, ' ').trim();
}

/**
 * Extracts the brand from the name if present.
 */
function extractBrand(name) {
    let foundBrand = '';
    let remainingName = name;

    const sortedBrands = [...BRANDS].sort((a, b) => b.length - a.length);

    for (const brand of sortedBrands) {
        const regex = new RegExp(`(^|[^א-ת'"])${brand}(?![א-ת])`, 'g');
        if (regex.test(remainingName)) {
            foundBrand = brand;
            remainingName = remainingName.replace(regex, '$1').replace(/\s\s+/g, ' ').trim();
            break; 
        }
    }

    return { foundBrand, remainingName };
}

/**
 * Advanced deduplication and filtering for leaked metadata.
 */
function finalizeClean(name) {
    const units = Object.values(UNIT_MAPPINGS);
    
    // 1. Initial metadata cleanup
    let temp = name.replace(/\d+\.\d+\s+100\s*ג['"]/g, '');
    temp = temp.replace(/100\s*ג['"]/g, '');

    // 2. Word-based processing
    const words = temp.split(/\s+/);
    const uniqueWords = [];
    const seen = new Set();
    const satisfiedUnits = new Set();

    // Pass 1: Find priority unit indices (number + unit pairs)
    const unitIndices = {}; // unit -> index
    for (let i = 0; i < words.length; i++) {
        if (units.includes(words[i+1]) && /^\d+(\.\d+)?$/.test(words[i])) {
            if (unitIndices[words[i+1]] === undefined) {
                unitIndices[words[i+1]] = i; 
            }
        }
    }

    // Pass 2: Reconstruct
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (!word) continue;

        let normalized = word;
        if (/^\d+(\.\d+)?$/.test(word)) {
            normalized = parseFloat(word).toString();
        }

        const nextWord = words[i+1];
        const isFollowedByUnit = nextWord && units.includes(nextWord);

        // Handle number + unit pair
        if (isFollowedByUnit) {
            // Check if this is the priority one
            if (unitIndices[nextWord] === i) {
                if (!seen.has(normalized)) {
                    uniqueWords.push(normalized);
                    seen.add(normalized);
                }
                uniqueWords.push(nextWord);
                satisfiedUnits.add(nextWord);
                seen.add(nextWord);
                i++; // Skip unit word
                continue;
            }
            // If NOT priority, proceed to normal word processing for THIS word (number)
            // The nextWord (unit) will be processed in the next iteration
        }

        // Handle standalone unit
        if (units.includes(word)) {
            if (!satisfiedUnits.has(word) && unitIndices[word] === undefined) {
                uniqueWords.push(word);
                satisfiedUnits.add(word);
                seen.add(word);
            }
            continue;
        }

        // Deduplicate words/numbers
        if (!seen.has(normalized)) {
            uniqueWords.push(normalized);
            seen.add(normalized);
        }
    }

    let result = uniqueWords.join(' ').trim();
    result = result.replace(/(\d+%)(.*)\d+%/g, '$1$2').trim();

    return result.replace(/\s\s+/g, ' ').trim();
}

/**
 * Main entry point for name standardization.
 */
function standardizeName(name) {
    if (!name) return '';
    
    let cleaned = stripMarketingFluff(name);
    cleaned = normalizeUnits(cleaned);
    
    const { foundBrand, remainingName } = extractBrand(cleaned);
    
    let result = finalizeClean(remainingName);
    
    if (foundBrand) {
        result = `${result} ${foundBrand}`;
    }
    
    return result.replace(/\s\s+/g, ' ').trim();
}

module.exports = {
    normalizeUnits,
    stripMarketingFluff,
    extractBrand,
    standardizeName
};
