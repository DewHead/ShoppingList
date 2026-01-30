const { normalizeUnits, stripMarketingFluff, standardizeName } = require('../utils/nameStandardizer');

describe('Name Standardizer - Unit Normalization', () => {
    it(`should normalize "גרם" to "ג'"`, () => {
        expect(normalizeUnits('100 גרם')).toBe(`100 ג'`);
    });

    it(`should normalize "גר" to "ג'"`, () => {
        expect(normalizeUnits('100 גר')).toBe(`100 ג'`);
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

    it(`should normalize "ליטר" to "ל'"`, () => {
        expect(normalizeUnits('1 ליטר')).toBe(`1 ל'`);
    });

    it(`should handle units with punctuation`, () => {
        expect(normalizeUnits('100 גרם.')).toBe(`100 ג'.`);
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

describe('Name Standardizer - Complex Edge Cases (Regression)', () => {
    const cases = [
        { raw: `סרוולד מעודן 150 ג' 150.00 100 ג'`, expected: `סרוולד מעודן 150 ג'` },
        { raw: `פריכיות אנרג'י 30 ג' 30.00 100 ג'`, expected: `פריכיות אנרג'י 30 ג'` },
        { raw: 'אורז בסמטי 1 1.00 ק"ג יוחננוף', expected: 'אורז בסמטי 1 ק"ג יוחננוף' },
        { raw: 'אורז בסמטי לבן ארוך 1 ק"ג ק"ג', expected: 'אורז בסמטי לבן ארוך 1 ק"ג' },
        { raw: 'אורז בסמטי 1 ק"ג 1000.00 100 ג"', expected: 'אורז בסמטי 1 ק"ג' },
        { raw: "עוגיות על בסיס חלב 1% 120.00 100 ג'", expected: "עוגיות על בסיס חלב 1%" },
        { raw: `חלב 1% שומן קרטון 1% ל' פיקוח תנובה`, expected: `חלב 1% שומן קרטון ל' פיקוח תנובה` }, 
        { raw: `חלב טרי 1% ל' קרטו 1.00 ל' תנובה`, expected: `חלב טרי 1% קרטו 1 ל' תנובה` },
        { raw: `בשר עגל טחון קפוא 600.00 100 ג'`, expected: "בשר עגל טחון קפוא" },
        { raw: `טחון בקר 500 ג' 500.00 100 ג'`, expected: `טחון בקר 500 ג'` }
    ];

    cases.forEach(({ raw, expected }) => {
        it(`should correctly standardize "${raw}"`, () => {
            expect(standardizeName(raw)).toBe(expected);
        });
    });
});

describe('Name Standardizer - Batch Product Tests', () => {
    const products = [
        { raw: 'שמן זית כתית מעולה 750 מיל', expected: "שמן זית כתית מעולה 750 מ\"ל" },
        { raw: 'שופרסל אורז תאילנדי פרסי 1 קילו', expected: 'אורז תאילנדי פרסי 1 ק"ג שופרסל' },
        { raw: 'מארז 6 יחידות מעדן חלב שטראוס במבצע!', expected: 'מארז 6 יחידות מעדן חלב שטראוס' },
        { raw: `פסטה ברילה 500 גרם חדש!`, expected: `פסטה ברילה 500 ג'` },
        { raw: `לחם פרוס אחיד (750 גרם)`, expected: `לחם פרוס אחיד 750 ג'` },
        { raw: `משקה קל תפוזים 1.5 ליטר בלעדי פריגת`, expected: `משקה קל תפוזים 1.5 ל' פריגת` },
        { raw: `גבינה צהובה עמק 28% שומן 200 גרם תנובה`, expected: `גבינה צהובה עמק 28% שומן 200 ג' תנובה` },
        { raw: 'שטראוס חומוס אחלה 1 קילו', expected: 'חומוס אחלה 1 ק"ג שטראוס' }
    ];

    products.forEach(({ raw, expected }) => {
        it(`should standardize "${raw}" to "${expected}"`, () => {
            expect(standardizeName(raw)).toBe(expected);
        });
    });
});