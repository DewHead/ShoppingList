const { normalizeUnits, stripMarketingFluff, standardizeName } = require('../utils/nameStandardizer');

describe('Name Standardizer - Unit Normalization', () => {
    it('should normalize "גרם" to "ג\'"', () => {
        expect(normalizeUnits('100 גרם')).toBe('100 ג\'');
    });

    it('should normalize "גר" to "ג\'"', () => {
        expect(normalizeUnits('100 גר')).toBe('100 ג\'');
    });

    it('should normalize "קילוגרם" to "ק"ג"', () => {
        expect(normalizeUnits('1 קילוגרם')).toBe('1 ק"ג');
    });

    it('should normalize "קילו" to "ק"ג"', () => {
        expect(normalizeUnits('2 קילו')).toBe('2 ק"ג');
    });

    it('should normalize "מיל" to "מ"ל"', () => {
        expect(normalizeUnits('500 מיל')).toBe('500 מ"ל');
    });

    it('should normalize "ליטר" to "ל\'"', () => {
        expect(normalizeUnits('1 ליטר')).toBe('1 ל\'');
    });

    it('should handle units with punctuation', () => {
        expect(normalizeUnits('100 גרם.')).toBe('100 ג\'.');
        expect(standardizeName('חבילה (2 קילו)')).toBe('חבילה 2 ק"ג');
    });
});

describe('Name Standardizer - Marketing Fluff Removal', () => {
    it('should remove "במבצע"', () => {
        expect(stripMarketingFluff('חלב במבצע')).toBe('חלב');
    });

    it('should remove "חדש"', () => {
        expect(stripMarketingFluff('גבינה חדש')).toBe('גבינה');
    });

    it('should remove "בלעדי"', () => {
        expect(stripMarketingFluff('יוגורט בלעדי')).toBe('יוגורט');
    });

    it('should remove "מבצע!"', () => {
        expect(stripMarketingFluff('לחם מבצע!')).toBe('לחם');
    });

    it('should remove parentheses', () => {
        expect(stripMarketingFluff('יוגורט (במבצע)')).toBe('יוגורט');
    });

    it('should clean redundant spaces', () => {
        expect(stripMarketingFluff('לחם  לבן ')).toBe('לחם לבן');
    });

    it('should remove multiple fluff terms', () => {
        expect(stripMarketingFluff('יוגורט חדש במבצע בלעדי')).toBe('יוגורט');
    });
});

describe('Name Standardizer - Batch Product Tests', () => {
    const products = [
        { raw: 'שמן זית כתית מעולה 750 מיל', expected: "שמן זית כתית מעולה 750 מ\"ל" },
        { raw: 'אורז תאילנדי פרסי 1 קילו שופרסל', expected: 'אורז תאילנדי פרסי 1 ק"ג שופרסל' },
        { raw: 'מארז 6 יחידות מעדן חלב שטראוס במבצע!', expected: 'מארז 6 יחידות מעדן חלב שטראוס' },
        { raw: 'פסטה ברילה 500 גרם חדש!', expected: "פסטה ברילה 500 ג'" },
        { raw: 'לחם פרוס אחיד (750 גרם)', expected: "לחם פרוס אחיד 750 ג'" },
        { raw: 'משקה קל תפוזים 1.5 ליטר בלעדי', expected: "משקה קל תפוזים 1.5 ל'" },
        { raw: 'גבינה צהובה עמק 28% שומן 200 גרם', expected: "גבינה צהובה עמק 28% שומן 200 ג'" }
    ];

    products.forEach(({ raw, expected }) => {
        it(`should standardize "${raw}" correctly`, () => {
            expect(standardizeName(raw)).toBe(expected);
        });
    });
});
