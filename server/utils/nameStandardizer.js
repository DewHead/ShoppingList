const UNIT_MAPPINGS = {
    'גרם': "ג'",
    'גר': "ג'",
    'קילוגרם': 'ק"ג',
    'קילו': 'ק"ג',
    'מיל': 'מ"ל'
};

const MARKETING_FLUFF = [
    'במבצע',
    'חדש',
    'בלעדי',
    'מבצע!'
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
        // This avoids \b which doesn't work for Hebrew in standard JS regex
        const regex = new RegExp(`(^|[^א-ת])${key}([^א-ת]|$)`, 'g');
        normalized = normalized.replace(regex, `$1${value}$2`);
        // Run it twice to handle overlapping matches if necessary
        normalized = normalized.replace(regex, `$1${value}$2`);
    }
    return normalized;
}

/**
 * Strips common marketing terms from the string.
 * @param {string} name 
 * @returns {string}
 */
function stripMarketingFluff(name) {
    let cleaned = name;
    MARKETING_FLUFF.forEach(term => {
        const regex = new RegExp(term, 'g');
        cleaned = cleaned.replace(regex, '');
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
