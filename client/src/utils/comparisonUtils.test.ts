import { describe, it, expect } from 'vitest';
import { calculateSmartTotal, PENALTY_PRICE } from './comparisonUtils';

describe('calculateSmartTotal', () => {
  it('calculates total for valid items', () => {
    const results = [
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: '₪11.00', rawPrice: 11, quantity: 2 }, // Total for 2 items
    ];
    const { total, missing, isValid } = calculateSmartTotal(results);
    expect(total).toBe('21.00'); // 10 + 11
    expect(missing).toBe(0);
    expect(isValid).toBe(true);
  });

  it('applies penalty for missing items', () => {
    const results = [
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: 'N/A', rawPrice: 0, quantity: 1 },
    ];
    // 1/3 missing = 33% <= 40% (Valid)
    const { total, missing, isValid } = calculateSmartTotal(results);
    const expectedTotal = (10 + 10 + PENALTY_PRICE).toFixed(2);
    expect(total).toBe(expectedTotal);
    expect(missing).toBe(1);
    expect(isValid).toBe(true);
  });

  it('marks as invalid if too many items are missing', () => {
    const results = [
      { price: 'N/A', rawPrice: 0, quantity: 1 },
      { price: 'N/A', rawPrice: 0, quantity: 1 },
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
    ];
    // 2/3 = 66% missing > 40% (Invalid)
    const { isValid } = calculateSmartTotal(results);
    expect(isValid).toBe(false);
  });

  it('handles empty or undefined results', () => {
    expect(calculateSmartTotal(undefined)).toEqual({ total: '0.00', missing: 0, isValid: false });
    expect(calculateSmartTotal([])).toEqual({ total: '0.00', missing: 0, isValid: false });
  });
});