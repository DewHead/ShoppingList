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
**Source File:** `server/scrapers/mahsaneyHashuk.js` (Pending analysis)

## Shufersal
**Source File:** `server/scrapers/shufersal.js` (Pending analysis)

## Carrefour
**Source File:** Missing (Pending history search)
