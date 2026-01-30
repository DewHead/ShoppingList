const { standardizeName } = require('../utils/nameStandardizer');

describe('Name Standardizer - Regression & Edge Cases', () => {
    const failures = [
        { raw: "סרוולד מעודן 150 ג' 150.00 100 ג'", expected: "סרוולד מעודן 150 ג'" },
        { raw: "פריכיות אנרג'י 30 ג' 30.00 100 ג'", expected: "פריכיות אנרג'י 30 ג'" },
        { raw: 'אורז בסמטי 1 1.00 ק"ג יוחננוף', expected: 'אורז בסמטי 1 ק"ג יוחננוף' },
        { raw: 'אורז בסמטי לבן ארוך 1 ק"ג ק"ג', expected: 'אורז בסמטי לבן ארוך 1 ק"ג' },
        { raw: 'אורז בסמטי 1 ק"ג 1000.00 100 ג"', expected: 'אורז בסמטי 1 ק"ג' },
        { raw: "עוגיות על בסיס חלב 1% 120.00 100 ג'", expected: "עוגיות על בסיס חלב 1%" }, // 120.00 100 ג' is metadata
        { raw: "חלב 1% שומן קרטון 1% ל' פיקוח תנובה", expected: "חלב 1% שומן קרטון ל' פיקוח תנובה" }, 
        { raw: "חלב טרי 1% ל' קרטו 1.00 ל' תנובה", expected: "חלב טרי 1% קרטו 1 ל' תנובה" },
        { raw: "בשר עגל טחון קפוא 600.00 100 ג'", expected: "בשר עגל טחון קפוא" }, // 600.00 100 ג' is metadata
        { raw: "טחון בקר 500 ג' 500.00 100 ג'", expected: "טחון בקר 500 ג'" }
    ];

    failures.forEach(({ raw, expected }) => {
        it(`should fix "${raw}"`, () => {
            const result = standardizeName(raw);
            console.log(`Input: ${raw} -> Output: ${result}`);
            expect(result).toBe(expected);
        });
    });
});