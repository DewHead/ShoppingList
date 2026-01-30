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

/**
 * Normalizes weight and volume units in a string.
 * @param {string} name 
 * @returns {string}
 */
function normalizeUnits(name) {
    let normalized = name;
    for (const [key, value] of Object.entries(UNIT_MAPPINGS)) {
        // Use a regex that looks for the key surrounded by non-Hebrew characters or start/end of string
        const regex = new RegExp(`(^|[^א-ת])${key}([^א-ת]|$)`, 'g');
        normalized = normalized.replace(regex, `$1${value}$2`);
        // Run it twice to handle overlapping matches
        normalized = normalized.replace(regex, `$1${value}$2`);
    }
    return normalized;
}

/**
 * Strips common marketing terms and redundant punctuation from the string.
 * @param {string} name 
 * @returns {string}
 */
function stripMarketingFluff(name) {
    let cleaned = name;
    MARKETING_FLUFF.forEach(term => {
        // Use split/join for literal replacement to avoid regex escape issues
        cleaned = cleaned.split(term).join('');
    });
    // Clean up multiple spaces and leading/trailing spaces
    return cleaned.replace(/\s\s+/g, ' ').trim();
}

/**
 * Main entry point for name standardization.
 * @param {string} name 
 * @returns {string}
 */
function standardizeName(name) {
    if (!name) return '';
    let result = stripMarketingFluff(name);
    result = normalizeUnits(result);
    return result;
}

module.exports = {
    normalizeUnits,
    stripMarketingFluff,
    standardizeName
};