export interface ComparisonResult {
  price: string | number;
  rawPrice: number;
  quantity: number;
  [key: string]: any;
}

export const PENALTY_PRICE = 15 * 1.2;

export const calculateSmartTotal = (results: ComparisonResult[] | undefined) => {
  if (!results) return { total: '0.00', missing: 0, isValid: false };
  
  let currentTotal = 0;
  let missingCount = 0;

  results.forEach((r) => {
    let itemPrice = 0;
    let isMissing = false;

    const priceStr = String(r.price);
    if (priceStr === 'N/A' || priceStr === 'NA' || r.rawPrice === 0) {
        isMissing = true;
    } else {
        const priceVal = parseFloat(priceStr.replace(/[^\d.]/g, ''));
        if (isNaN(priceVal) || priceVal === 0) {
            isMissing = true;
        } else {
            itemPrice = priceVal;
        }
    }

    if (isMissing) {
        missingCount++;
        itemPrice = PENALTY_PRICE * (r.quantity || 1);
    }

    currentTotal += itemPrice;
  });

  const isValid = results.length > 0 && (missingCount / results.length) <= 0.40;
  return { 
    total: currentTotal.toFixed(2), 
    missing: missingCount, 
    isValid 
  };
};
