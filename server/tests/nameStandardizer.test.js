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

    it('should clean redundant spaces', () => {
        expect(stripMarketingFluff('לחם  לבן ')).toBe('לחם לבן');
    });
});

describe('Name Standardizer - Full Standardization (Phase 1/2)', () => {
    it('should combine cleaning and normalization', () => {
        // This will evolve in Phase 2, but for now just check basic flow
        const raw = 'חלב במבצע 1 קילוגרם';
        const expected = 'חלב 1 ק"ג';
        expect(standardizeName(raw)).toBe(expected);
    });
});
