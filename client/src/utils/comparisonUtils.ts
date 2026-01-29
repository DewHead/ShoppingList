export interface ComparisonResult {
  price: string | number;
  rawPrice: number;
  quantity: number;
  [key: string]: any;
}

export interface PriceInfo {
  price: number;
  displayPrice: string;
  promo?: string;
  isCheapest: boolean;
  status: 'available' | 'missing';
  link?: string;
}

export interface ComparisonMatrixRow {
  productName: string;
  prices: Record<number, PriceInfo>; // Key is storeId
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

export const calculateBestPrice = (match: any, quantity: number) => {
  const unitPrice = match.price;
  const originalTotal = unitPrice * quantity;
  let bestResult = { total: originalTotal, isPromo: false, originalTotal, displayName: match.remote_name };
  
  if (!match.promo_description) {
      return bestResult;
  }

  const promoList = match.promo_description.split(' | ');
  
  promoList.forEach((promoDesc: string) => {
      const parts = promoDesc.split(/\s+ב-?\s*₪?/);
      if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          const priceMatch = lastPart.match(/^[\d.]+/);
          
          if (priceMatch) {
              const promoPrice = parseFloat(priceMatch[0]);
              const namePart = parts.slice(0, -1).join(' ב ').trim();
              const qtyMatch = namePart.match(/\s(\d+)$/);
              
              let currentTotal = originalTotal;

              if (qtyMatch && parseInt(qtyMatch[1]) > 1) {
                  const requiredQty = parseInt(qtyMatch[1]);
                  const cleanedName = namePart.replace(/\s+\d+$/, '').trim();
                  if (quantity >= requiredQty) {
                      const promoGroups = Math.floor(quantity / requiredQty);
                      const remaining = quantity % requiredQty;
                      currentTotal = (promoGroups * promoPrice) + (remaining * unitPrice);
                      
                      if (currentTotal < bestResult.total) {
                          bestResult = { 
                              total: currentTotal, 
                              isPromo: true, 
                              originalTotal, 
                              displayName: cleanedName || bestResult.displayName 
                          };
                      }
                  }
              } else {
                  const currentTotal = promoPrice * quantity;
                  if (currentTotal < bestResult.total) {
                      bestResult = { 
                          total: currentTotal, 
                          isPromo: true, 
                          originalTotal, 
                          displayName: namePart || bestResult.displayName 
                      };
                  }
              }
          }
      }
  });
  
  return bestResult;
};

