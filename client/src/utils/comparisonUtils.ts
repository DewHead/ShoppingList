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
          // Strip any % or other non-price chars before parsing
          const priceMatch = lastPart.replace(/%/g, '').match(/^[\d.]+/);
          
          if (priceMatch) {
              const promoPrice = parseFloat(priceMatch[0]);
              const namePart = parts.slice(0, -1).join(' ב ').trim();
              
              // Try to find quantity: either "Name Qty" or just "Qty" (strip % just in case)
              const qtyMatch = namePart.replace(/%/g, '').match(/(\s|^)(\d+)$/);
              
              const isSecondAt = namePart.endsWith('השני') || namePart.endsWith('ה-2');

              if (isSecondAt) {
                  if (quantity >= 2) {
                      const pairs = Math.floor(quantity / 2);
                      const remaining = quantity % 2;
                      const currentTotal = (pairs * (unitPrice + promoPrice)) + (remaining * unitPrice);
                      
                      if (currentTotal < bestResult.total) {
                          bestResult = { 
                              total: currentTotal, 
                              isPromo: true, 
                              originalTotal, 
                              displayName: namePart || bestResult.displayName 
                          };
                      }
                  }
              } else if (qtyMatch && parseInt(qtyMatch[2]) > 1) {
                  const requiredQty = parseInt(qtyMatch[2]);
                  const cleanedName = namePart.replace(/(\s|^)\d+$/, '').trim();
                  if (quantity >= requiredQty) {
                      const promoGroups = Math.floor(quantity / requiredQty);
                      const remaining = quantity % requiredQty;
                      const currentTotal = (promoGroups * promoPrice) + (remaining * unitPrice);
                      
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

export const transformToMatrix = (
  shoppingList: any[],
  storeResults: Record<number, any>
): ComparisonMatrixRow[] => {
  return shoppingList.map((listItem) => {
    const prices: Record<number, PriceInfo> = {};
    const validPrices: number[] = [];

    Object.values(storeResults).forEach((data) => {
      const results = data.results || [];
      const match = results.find((r: any) => r.item.itemName === listItem.itemName);
      
      if (match) {
        let priceVal = 0;
        const priceStr = String(match.price);
        
        if (priceStr !== 'N/A' && priceStr !== 'NA' && match.rawPrice !== 0) {
           priceVal = parseFloat(priceStr.replace(/[^\d.]/g, ''));
           if (!isNaN(priceVal) && priceVal > 0) {
             validPrices.push(priceVal);
           }
        }
      }
    });

    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

    // Second pass: Build the PriceInfo objects
    Object.entries(storeResults).forEach(([storeId, data]) => {
      const results = data.results || [];
      const match = results.find((r: any) => r.item.itemName === listItem.itemName);
      const id = parseInt(storeId);

      if (!match) {
        prices[id] = {
          price: 0,
          displayPrice: '-',
          isCheapest: false,
          status: 'missing'
        };
        return;
      }

      let priceVal = 0;
      let displayPrice = match.price;
      let status: PriceInfo['status'] = 'available';
      const priceStr = String(match.price);

      if (priceStr === 'N/A' || priceStr === 'NA' || match.rawPrice === 0) {
        status = 'missing';
        displayPrice = 'N/A';
      } else {
        priceVal = parseFloat(priceStr.replace(/[^\d.]/g, ''));
        if (isNaN(priceVal) || priceVal === 0) {
          status = 'missing';
        }
      }

      prices[id] = {
        price: priceVal,
        displayPrice: displayPrice,
        isCheapest: minPrice !== null && priceVal === minPrice,
        status,
        promo: match.promo_description,
        link: match.link
      };
    });

    return {
      productName: listItem.itemName,
      prices
    };
  });
};

export const sortComparisonMatrix = (
  matrix: ComparisonMatrixRow[],
  columnId: 'product' | number,
  direction: 'asc' | 'desc'
): ComparisonMatrixRow[] => {
  return [...matrix].sort((a, b) => {
    if (columnId === 'product') {
      return direction === 'asc' 
        ? a.productName.localeCompare(b.productName)
        : b.productName.localeCompare(a.productName);
    }

    const priceA = a.prices[columnId];
    const priceB = b.prices[columnId];

    const isAMissing = !priceA || priceA.status !== 'available';
    const isBMissing = !priceB || priceB.status !== 'available';

    if (isAMissing && isBMissing) return 0;
    if (isAMissing) return 1; // Always put missing at the bottom
    if (isBMissing) return -1;

    const valA = priceA.price;
    const valB = priceB.price;

    return direction === 'asc' ? valA - valB : valB - valA;
  });
};

export const cleanStoreName = (name: string): string => {
  return name.replace(/\s*\(.*?\)/g, '').trim();
};

export const getStoreLogo = (name: string): string | null => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('שופרסל') || lowerName.includes('shufersal')) return '/logos/shufersal.png';
  if (lowerName.includes('רמי לוי') || lowerName.includes('rami levy')) return '/logos/rami_levy.png';
  if (lowerName.includes('יוחננוף') || lowerName.includes('yochananof')) return '/logos/yohananof.png';
  if (lowerName.includes('ויקטורי') || lowerName.includes('victory')) return '/logos/victory.png';
  if (lowerName.includes('קרפור') || lowerName.includes('carrefour')) return '/logos/carrefour.png';
  if (lowerName.includes('קשת טעמים') || lowerName.includes('keshet')) return '/logos/keshet_teamim.png';
  if (lowerName.includes('טיב טעם') || lowerName.includes('tiv taam')) return '/logos/tiv_taam.png';
  if (lowerName.includes('מחסני השוק') || lowerName.includes('mahsaney')) return '/logos/mahsaney_hashuk.png';
  return null;
};

