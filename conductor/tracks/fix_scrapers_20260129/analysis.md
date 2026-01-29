# Scraper Analysis & Strategy

## Rami Levy -> Yohananof (The "Levy" Family)
**Source File:** `server/scrapers/ramiLevy.js`
**Base URL:** `https://url.publishedprices.co.il/login`

### Shared Logic (to extract to `LevyBaseScraper`):
1.  **Authentication:**
    -   Puppeteer/Playwright navigation to the shared login URL.
    -   Login flow: 
        -   Username input: "RamiLevi" for Rami Levy, "yohananof" for Yohananof.
        -   Password: None (leave blank).
        -   Specific login button (`button#login-button`), waiting for redirect.
    -   Cookie extraction (critical for downloading files via `axios`).
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
-   **Credentials:** Username ("RamiLevi" vs "yohananof").
-   **Store Prioritization:** Rami Levy targets store '001'. Yohananof default TBD (likely '001' or generic).

## Mahsaney Hashuk -> Victory (The "Market" Family)
**Source File:** `server/scrapers/mahsaneyHashuk.js`
**Base URL:** `https://laibcatalog.co.il/`

### Shared Logic (to extract to `MarketBaseScraper`):
1.  **Navigation & Filtering:**
    -   Platform: `laibcatalog.co.il`.
    -   Logic: Select Chain -> SubChain -> Branch -> FileType -> Search.
    -   Generic `selectAndLog` helper is reusable.
2.  **File Discovery:**
    -   Parsing results table (`table tr`).
    -   Regex/String matching for `PriceFull`, `PromoFull`.
3.  **File Processing:**
    -   `axios` download with cookies.
    -   `zlib` gunzip (no tarball).
    -   XML Parsing (`xml2js`) with flexible root detection.

### Differences:
-   **Dropdown Values:** Chain names ('מחסני השוק' vs 'ויקטורי').
-   **Branch Selection:** Victory Branch '68'.

## Shufersal
**Source File:** `server/scrapers/shufersal.js`
**URL:** `https://prices.shufersal.co.il/`

### Plan:
-   **Store Selection:** Target Store '413'.
-   **Categories:** Focus on `PriceFull` and `PromoFull`.
-   **Audit:** Need to ensure selectors for `#ddlStore` and `#ddlCategory` work correctly with specific IDs.

## Carrefour
**Base URL:** `https://prices.carrefour.co.il/`
**Credentials:** None.
**Store:** '5304'.
**Categories:** `PriceFull`, `PromoFull`.

### Strategy:
-   Analyze `https://prices.carrefour.co.il/`. It likely uses the "Levy" pattern (PublishedPrices) or "Shufersal" pattern. 
-   Restoration/New Implementation based on the platform signature.
