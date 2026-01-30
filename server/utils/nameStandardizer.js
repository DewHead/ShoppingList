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
    'תנובה',
    'שטראוס',
    'טרה',
    'אסם',
    'עלית',
    'סוגת',
    'סנו',
    'נסטלה',
    'קוקה קולה',
    'פריגת',
    'יפאורה',
    'זוגלובק',
    'מעדני יחיעם',
    'טירת צבי',
    'גד',
    'יוטבתה',
    'מחלבות גד',
    'וילי פוד',
    'דיפלומט',
    'ליימן שליסל',
    'יוניליוור',
    'פרוקטר אנד גמבל',
    'שסטוביץ',
    'תלמה',
    'קנור',
    'הלמנס',
    'מזולה',
    'בייגל בייגל',
    'קליק',
    'שוקולד פרה',
    'פסק זמן',
    'כיף כף',
    'טורטית',
    'טוויסט',
    'פנטה',
    'ספרייט',
    'קינלי',
    'נסקפה',
    'טייסטרס צויס',
    'יד מרדכי',
    'אחווה',
    'מאפיית אנגל',
    'מאפיית ברמן',
    'דנור',
    'מיה',
    'הנמל',
    'תבואות',
    'הרדוף',
    'שופרסל',
    'יוחננוף',
    'ויקטורי',
    'רמי לוי',
    'קארפור',
    'מחסני השוק',
    'טיב טעם'
];

/**
 * Normalizes weight and volume units in a string.
 */
function normalizeUnits(name) {
    let normalized = name;
    for (const [key, value] of Object.entries(UNIT_MAPPINGS)) {
        const regex = new RegExp(`(^|[^א-ת])${key}([^א-ת]|$)`, 'g');
        normalized = normalized.replace(regex, `$1${value}$2`);
        normalized = normalized.replace(regex, `$1${value}$2`);
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

    // Sort brands by length descending to match longest possible brand name first (e.g., "מחלבות גד" before "גד")
    const sortedBrands = [...BRANDS].sort((a, b) => b.length - a.length);

    for (const brand of sortedBrands) {
        // Look for brand as a whole word (using non-Hebrew boundaries)
        const regex = new RegExp(`(^|[^א-ת])${brand}([^א-ת]|$)`, 'g');
        if (regex.test(remainingName)) {
            foundBrand = brand;
            remainingName = remainingName.replace(regex, '$1$2').replace(/\s\s+/g, ' ').trim();
            break; 
        }
    }

    return { foundBrand, remainingName };
}

/**
 * Main entry point for name standardization.
 * Format: [Product Description] [Weight/Volume] [Brand]
 */
function standardizeName(name) {
    if (!name) return '';
    
    // 1. Initial cleaning
    let cleaned = stripMarketingFluff(name);
    
    // 2. Normalize units first so weight is in standard format
    cleaned = normalizeUnits(cleaned);
    
    // 3. Extract brand
    const { foundBrand, remainingName } = extractBrand(cleaned);
    
    // 4. Reconstruct: [Description + Weight] [Brand]
    // Since weight is usually already at the end of the description in most store names,
    // and extractBrand removes the brand from wherever it was,
    // appending foundBrand to the end usually satisfies the requirement.
    
    let result = remainingName;
    if (foundBrand) {
        result = `${remainingName} ${foundBrand}`;
    }
    
    return result.replace(/\s\s+/g, ' ').trim();
}

module.exports = {
    normalizeUnits,
    stripMarketingFluff,
    extractBrand,
    standardizeName
};
