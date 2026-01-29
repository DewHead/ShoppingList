# Specification: Fix and Separate Scrapers

## Overview
This track focuses on restoring the functionality of the product price scrapers. While Rami Levy and Mahsaney Hashuk are currently operational, the Shufersal scraper is broken. Additionally, the scrapers for Yohananof and Victory need to be decoupled from Rami Levy and Mahsaney Hashuk respectively, as they share underlying platforms but require distinct scraper configurations. Finally, the Carrefour scraper, which is currently missing from the codebase, needs to be restored or re-implemented.

## Functional Requirements

### 1. Fix Shufersal Scraper
- **Goal:** Repair `server/scrapers/shufersal.js` to correctly extract product and price data.
- **Input:** Search term (e.g., "milk").
- **Output:** List of products with titles, prices, and image URLs.
- **Constraint:** Must handle any recent changes to the Shufersal website structure/anti-bot measures.

### 2. Implement Yohananof Scraper
- **Goal:** Create a dedicated `server/scrapers/yohananof.js`.
- **Logic:** Refactor logic from `ramiLevy.js`. Both retailers use the same underlying platform/website but require different login credentials or configuration.
- **Requirement:** Ensure `ramiLevy.js` remains functional after refactoring/code sharing.

### 3. Implement Victory Scraper
- **Goal:** Create a dedicated `server/scrapers/victory.js`.
- **Logic:** Refactor logic from `mahsaneyHashuk.js`. Both retailers use the same underlying platform/website but require different filtering or store selection logic.
- **Requirement:** Ensure `mahsaneyHashuk.js` remains functional after refactoring/code sharing.

### 4. Restore Carrefour Scraper
- **Goal:** Create `server/scrapers/carrefour.js`.
- **Source:** Attempt to locate previous implementation from the project's history/upstream repo if possible, or implement from scratch matching the current Carrefour website flow.
- **Flow:** Unique scraping flow separate from the other retailers.

## Non-Functional Requirements
- **Code Reuse:** Where logic is shared (Rami Levy/Yohananof, Mahsaney Hashuk/Victory), use a shared base class or utility functions to adhere to DRY principles.
- **Error Handling:** All scrapers must gracefully handle network errors, selector failures, and login timeouts.
- **Performance:** Scrapers should run efficiently and not block the main event loop (using Puppeteer/Playwright context management).

## Acceptance Criteria
- [ ] `shufersal.js` successfully scrapes products and prices.
- [ ] `yohananof.js` exists and successfully scrapes products/prices (distinct from Rami Levy).
- [ ] `victory.js` exists and successfully scrapes products/prices (distinct from Mahsaney Hashuk).
- [ ] `carrefour.js` exists and successfully scrapes products/prices.
- [ ] Existing `ramiLevy.js` and `mahsaneyHashuk.js` continue to work without regression.
- [ ] All 5 scrapers return data in the standardized normalized format.

## Out of Scope
- Fixing "Keshet Teamim" or "Tayo" scrapers (explicitly ignored per user request).
