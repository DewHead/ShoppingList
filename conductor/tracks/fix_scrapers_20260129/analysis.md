# Scraper Analysis & Strategy

## Rami Levy -> Yohananof (The "Levy" Family)
**Source File:** `server/scrapers/ramiLevy.js`

### Shared Logic (to extract to `LevyBaseScraper`):
1.  **Authentication:**
    -   Puppeteer/Playwright navigation.
    -   Login flow: Username input, specific login button, waiting for redirect.
    -   Cookie extraction (critical for downloading files).
2.  **File Discovery:**
    -   Scanning `<a>` tags for `.gz` files.
    -   Filtering logic (PriceFull, PromoFull).
    -   Sorting by name/date.
3.  **File Processing:**
    -   `axios` download with cookies.
    -   `zlib` decompression.
    -   Tarball extraction (handling the specific folder structure `[name]/[name].xml`).
    -   XML Parsing (`xml2js`).
4.  **Data Normalization:**
    -   Mapping XML `Item` fields to DB schema.
    -   Mapping XML `Promotion` fields to DB schema.

### Differences (Configuration):
-   **Base URL:** Distinct for each retailer.
-   **Credentials:** Username (Rami Levy uses "RamiLevi", Yohananof will likely use "Yohananof" or similar).
-   **Store Prioritization:** Rami Levy targets store '001'. Yohananof might need a different default or handle generic lists.

## Mahsaney Hashuk -> Victory (The "Market" Family)
**Source File:** `server/scrapers/mahsaneyHashuk.js`

### Shared Logic (to extract to `MarketBaseScraper`):
1.  **Navigation & Filtering:**
    -   Platform: `laibcatalog.co.il` (likely shared by Victory).
    -   Logic: Select Chain -> SubChain -> Branch -> FileType -> Search.
    -   Generic `selectAndLog` helper is reusable.
2.  **File Discovery:**
    -   Parsing results table (`table tr`).
    -   Regex/String matching for `PriceFull`, `PromoFull`.
3.  **File Processing:**
    -   `axios` download with cookies.
    -   `zlib` gunzip (no tarball).
    -   XML Parsing (`xml2js`) with flexible root detection (`Root`, `Prices`, `Promos`).
    -   Item normalization (handling `Item` vs `Product`).

### Differences:
-   **Dropdown Values:** Chain names ('מחסני השוק' vs 'ויקטורי').
-   **Branch Selection:** Need to identify a valid branch for Victory.

## Shufersal
**Source File:** `server/scrapers/shufersal.js`

### Audit:
-   **URL:** `https://prices.shufersal.co.il/`
-   **Current Logic:** Select 'All' stores (val '0') -> Select 'All' categories (val '0') -> Scrape `table.webgrid`.
-   **Potential Failures:**
    -   Selectors (`#ddlStore`, `#ddlCategory`, `table.webgrid`) changed.
    -   Anti-bot / WAF.
    -   "All" option removed, requiring specific branch selection.
    -   Site redesign (SPA/React).

## Carrefour
**Source:** None found in history.
**Strategy:** Implement from scratch.
-   **Platform Check:** Likely Yeinot Bitan platform or similar.
-   **Approach:** Start by inspecting the target site (manual or via generic scraper) to determine if it fits "Levy" or "Market" pattern, or is unique.