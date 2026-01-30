import { describe, it, expect } from 'vitest';
import { calculateSmartTotal, PENALTY_PRICE, transformToMatrix, sortComparisonMatrix, calculateBestPrice } from './comparisonUtils';
import type { ComparisonMatrixRow } from './comparisonUtils';

describe('calculateBestPrice', () => {
  const mockMatch = {
    price: 49.9,
    remote_name: 'אורז בסמטי 5 ק"ג מחנה יהודה',
    promo_description: '*אורז בסמטי 5 קג מחנה יהודה השני ב₪2 ש מוגבל מנה'
  };

  it('calculates original price when quantity is 1 and promo is "second for"', () => {
    const result = calculateBestPrice(mockMatch, 1);
    expect(result.total).toBe(49.9);
    expect(result.isPromo).toBe(false);
  });

  it('calculates promo price when quantity is 2 and promo is "second for"', () => {
    const result = calculateBestPrice(mockMatch, 2);
    // 49.9 + 2.0 = 51.9
    expect(result.total).toBe(51.9);
    expect(result.isPromo).toBe(true);
  });

  it('calculates promo price when quantity is 3 and promo is "second for"', () => {
    const result = calculateBestPrice(mockMatch, 3);
    // (49.9 + 2.0) + 49.9 = 101.8
    expect(result.total).toBeCloseTo(101.8);
    expect(result.isPromo).toBe(true);
  });

  it('handles standard "X ב ₪Y" promos', () => {
    const multiMatch = {
      price: 10,
      remote_name: 'Pasta',
      promo_description: 'Pasta 3 ב ₪20'
    };
    expect(calculateBestPrice(multiMatch, 1).total).toBe(10);
    expect(calculateBestPrice(multiMatch, 3).total).toBe(20);
    expect(calculateBestPrice(multiMatch, 4).total).toBe(30);
  });
});

describe('calculateSmartTotal', () => {
  it('calculates total for valid items', () => {
    const results = [
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: '₪11.00', rawPrice: 11, quantity: 2 }, 
    ];
    const { total, missing, isValid } = calculateSmartTotal(results);
    expect(total).toBe('21.00'); 
    expect(missing).toBe(0);
    expect(isValid).toBe(true);
  });

  it('applies penalty for missing items', () => {
    const results = [
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: '₪10.00', rawPrice: 10, quantity: 1 },
      { price: 'N/A', rawPrice: 0, quantity: 1 },
    ];
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
    const { isValid } = calculateSmartTotal(results);
    expect(isValid).toBe(false);
  });

  it('handles empty or undefined results', () => {
    expect(calculateSmartTotal(undefined)).toEqual({ total: '0.00', missing: 0, isValid: false });
    expect(calculateSmartTotal([])).toEqual({ total: '0.00', missing: 0, isValid: false });
  });
});

describe('transformToMatrix', () => {
  const mockStoreResults = {
    1: { // Store 1
      results: [
        { item: { itemName: 'Milk' }, price: '₪5.00', rawPrice: 5 },
        { item: { itemName: 'Bread' }, price: '₪10.00', rawPrice: 10 },
      ]
    },
    2: { // Store 2
      results: [
        { item: { itemName: 'Milk' }, price: '₪6.00', rawPrice: 6 },
        { item: { itemName: 'Bread' }, price: '₪9.00', rawPrice: 9 },
      ]
    }
  };

  const shoppingList = [
    { itemName: 'Milk' },
    { itemName: 'Bread' },
    { itemName: 'Cheese' } // Missing in both
  ];

  it('transforms store results into a product matrix', () => {
    const matrix = transformToMatrix(shoppingList, mockStoreResults);
    
    expect(matrix).toHaveLength(3);
    
    const milkRow = matrix.find(r => r.productName === 'Milk');
    expect(milkRow).toBeDefined();
    expect(milkRow?.prices[1].price).toBe(5);
    expect(milkRow?.prices[2].price).toBe(6);
  });

  it('correctly identifies the cheapest price', () => {
    const matrix = transformToMatrix(shoppingList, mockStoreResults);
    
    const milkRow = matrix.find(r => r.productName === 'Milk');
    expect(milkRow?.prices[1].isCheapest).toBe(true);
    expect(milkRow?.prices[2].isCheapest).toBe(false);

    const breadRow = matrix.find(r => r.productName === 'Bread');
    expect(breadRow?.prices[1].isCheapest).toBe(false);
    expect(breadRow?.prices[2].isCheapest).toBe(true);
  });

  it('handles missing items (N/A)', () => {
    const matrix = transformToMatrix(shoppingList, mockStoreResults);
    const cheeseRow = matrix.find(r => r.productName === 'Cheese');
    
    expect(cheeseRow?.prices[1].status).toBe('missing');
    expect(cheeseRow?.prices[2].status).toBe('missing');
  });

  it('handles stores with no data for an item', () => {
     // Store 2 is missing Bread in this case
     const partialMock = {
         1: mockStoreResults[1],
         2: { results: [{ item: { itemName: 'Milk' }, price: '₪6.00', rawPrice: 6 }] }
     };
     const matrix = transformToMatrix(shoppingList, partialMock);
     const breadRow = matrix.find(r => r.productName === 'Bread');
     
     expect(breadRow?.prices[1].status).toBe('available');
     expect(breadRow?.prices[2].status).toBe('missing');
  });
});

describe('sortComparisonMatrix', () => {
  const matrix: ComparisonMatrixRow[] = [
    {
      productName: 'Milk',
      prices: {
        1: { price: 5, displayPrice: '5', isCheapest: true, status: 'available' },
        2: { price: 6, displayPrice: '6', isCheapest: false, status: 'available' }
      }
    },
    {
      productName: 'Bread',
      prices: {
        1: { price: 10, displayPrice: '10', isCheapest: false, status: 'available' },
        2: { price: 9, displayPrice: '9', isCheapest: true, status: 'available' }
      }
    },
    {
      productName: 'Apple',
      prices: {
        1: { price: 3, displayPrice: '3', isCheapest: true, status: 'available' },
        2: { price: 0, displayPrice: 'N/A', isCheapest: false, status: 'missing' }
      }
    }
  ];

  it('sorts by product name ascending', () => {
    const sorted = sortComparisonMatrix([...matrix], 'product', 'asc');
    expect(sorted[0].productName).toBe('Apple');
    expect(sorted[1].productName).toBe('Bread');
    expect(sorted[2].productName).toBe('Milk');
  });

  it('sorts by product name descending', () => {
    const sorted = sortComparisonMatrix([...matrix], 'product', 'desc');
    expect(sorted[0].productName).toBe('Milk');
    expect(sorted[1].productName).toBe('Bread');
    expect(sorted[2].productName).toBe('Apple');
  });

  it('sorts by store price ascending', () => {
    // Store 1: Apple(3) < Milk(5) < Bread(10)
    const sorted = sortComparisonMatrix([...matrix], 1, 'asc');
    expect(sorted[0].productName).toBe('Apple');
    expect(sorted[1].productName).toBe('Milk');
    expect(sorted[2].productName).toBe('Bread');
  });

  it('sorts by store price descending', () => {
    // Store 1: Bread(10) > Milk(5) > Apple(3)
    const sorted = sortComparisonMatrix([...matrix], 1, 'desc');
    expect(sorted[0].productName).toBe('Bread');
    expect(sorted[1].productName).toBe('Milk');
    expect(sorted[2].productName).toBe('Apple');
  });

  it('handles missing prices when sorting', () => {
     // Store 2: Apple(N/A)
     const sorted = sortComparisonMatrix([...matrix], 2, 'asc');
     // Milk(6), Bread(9), Apple(Missing)
     expect(sorted[0].productName).toBe('Milk');
     expect(sorted[1].productName).toBe('Bread');
     expect(sorted[2].productName).toBe('Apple');
  });
});
