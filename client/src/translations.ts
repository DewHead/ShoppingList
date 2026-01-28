export const translations = {
  // App.tsx
  smartCart: { en: 'Smart Cart', he: 'עגלה חכמה' },
  list: { en: 'List', he: 'רשימה' },
  compare: { en: 'Compare', he: 'השוואה' },
  settings: { en: 'Settings', he: 'הגדרות' },
  
  // ShoppingListPage.tsx
  myList: { en: 'My List', he: 'הרשימה שלי' },
  myListDescription: { en: 'Add items to begin comparing prices.', he: 'כדי להתחיל להשוות מחירים, יש להוסיף פריטים.' },
  addItemPlaceholder: { en: 'Add an item (e.g., Organic Bananas)', he: 'יש להוסיף פריט (לדוגמה, בננות אורגניות)' },
  add: { en: 'Add', he: 'הוספה' },
  itemsInCart: { en: 'Items in Cart', he: 'פריטים בעגלה' },
  quantity: { en: 'Quantity', he: 'כמות' },
  emptyList: { en: 'Your list is currently empty.', he: 'הרשימה שלך ריקה כרגע.' },
  cheapestStore: { en: 'Cheapest Store', he: 'החנות הזולה ביותר' },
  itemUpdated: { en: "'%itemName%' is already on the list. The quantity has been updated.", he: "'%itemName%' כבר ברשימה. הכמות עודכנה." },
  
  // ComparisonPage.tsx
  priceComparison: { en: 'Price Comparison', he: 'השוואת מחירים' },
  priceComparisonDescription: { en: 'Real-time price data from your selected stores.', he: 'נתוני מחירים בזמן אמת מהחנויות שבחרת.' },
  refreshPrices: { en: 'Refresh Prices', he: 'לרענן מחירים' },
  refreshing: { en: 'Refreshing...', he: 'מרענון...' },
  ready: { en: 'Ready', he: 'מוכן' },
  getDataForStore: { en: "Click 'Refresh Prices' to get data for this store.", he: "כדי לקבל נתונים עבור חנות זו, יש ללחוץ על 'לרענן מחירים'." },

  // SettingsPage.tsx
  settingsDescription: { en: 'Manage your supermarket connections and credentials.', he: 'לניהול החיבורים והאישורים של הסופרמרקטים שלך.' },
  lastScrape: { en: 'Last scrape: %date%', he: 'גרידה אחרונה: %date%' },
  neverScraped: { en: 'Never scraped', he: 'טרם נגרד' },

  username: { en: 'Username', he: 'שם משתמש' },
  password: { en: 'Password', he: 'סיסמה' },

  // ComparisonPage.tsx - Coupons
  couponsFor: { en: 'Coupons for', he: 'קופונים עבור' },
  noActiveCoupons: { en: 'No active coupons found for this store.', he: 'לא נמצאו קופונים פעילים עבור חנות זו.' },
  addItemsToScan: { en: 'Please add items to the shopping list to scan prices.', he: 'אנא הוסף פריטים לרשימת הקניות כדי לסרוק מחירים.' },
  itemsSaved: { en: 'items saved', he: 'פריטים נשמרו' },

  // ScrapedDataPage.tsx
  scrapedDataTitle: { en: 'Scraped Data %id%', he: 'נתונים שנאספו מ%id%' },
  matchesFor: { en: 'Matches for', he: 'תוצאות עבור' },
  searchPlaceholder: { en: 'Search items...', he: 'חפש מוצרים...' },
  productName: { en: 'Product Name', he: 'שם מוצר' },
  itemCode: { en: 'Item Code', he: 'מק"ט' },
  price: { en: 'Price', he: 'מחיר' },
  lastUpdated: { en: 'Last Updated', he: 'עדכון אחרון' },
  noDataFound: { en: 'No data found. Try running a scrape in Settings.', he: 'לא נמצאו נתונים. נסה לבצע סריקה בדף ההגדרות.' },
  loading: { en: 'Loading data...', he: 'טוען נתונים...' },
  error: { en: 'Error: ', he: 'שגיאה: ' },
  showOnlyPromos: { en: 'Show only items with promos', he: 'הצג רק מוצרים עם מבצע' },
  showCreditCardPromos: { en: 'Show credit card promos', he: 'הצג מבצעי כרטיס אשראי' },
  creditCardPromoTooltip: { en: 'SBOX מבצע כרטיס אשראי דיל אקספרס שלי', he: 'SBOX מבצע כרטיס אשראי דיל אקספרס שלי' },
  columns: { en: 'Columns', he: 'עמודות' },
  showHide: { en: 'Show/Hide Columns', he: 'הצג/הסתר עמודות' },
  unitPrice: { en: 'Unit Price', he: 'מחיר ליחידה' },
  branchColumn: { en: 'Branch', he: 'סניף' },
  manufacturer: { en: 'Manufacturer', he: 'יצרן' },
  country: { en: 'Country of Origin', he: 'ארץ מקור' },
  scrapeStoreButton: { en: 'Scrape This Store', he: 'גרד חנות זו' },
  scrapingStore: { en: 'Scraping...', he: 'גרידה...' },

  monochrome: { en: 'Monochrome', he: 'מונוכרום' },
  boho: { en: 'Boho', he: 'בוהו' },
  cyberpunk: { en: 'Cyberpunk', he: 'סייברפאנק' },
  lineart: { en: 'Line Art', he: 'אמנות קו' },
  nordic: { en: 'Nordic', he: 'נורדי' },
  oilpainting: { en: 'Oil Painting', he: 'ציור שמן' },
  popart: { en: 'Pop Art', he: 'פופ ארט' },
  steampunk: { en: 'Steampunk', he: 'סטימפאנק' },
  tron: { en: 'Tron', he: 'טרון' },
  watercolor: { en: 'Watercolor', he: 'צבעי מים' },

  hideCoupons: { en: 'Hide Coupons', he: 'הסתר קופונים' },
  noCouponsTooltip: { en: 'No coupons available for these items', he: 'אין קופונים זמינים עבור פריטים אלה' },
  bestPrice: { en: 'Best Price', he: 'המחיר הטוב ביותר' },
};
