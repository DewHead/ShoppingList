# Track: Replace Tayo with Tiv Taam

## Overview
Replace the "Tayo" supermarket with "Tiv Taam" in the backend system. This involves removing the Tayo configuration and implementing a new scraper for Tiv Taam using the existing Levy/Cerberus platform infrastructure.

## Functional Requirements
1.  **Remove Tayo**
    -   Remove the "Tayo" entry from `server/db.js`.
    -   Remove any specific scraper logic for Tayo if present.

2.  **Add Tiv Taam**
    -   Add a new entry for "Tiv Taam" in `server/db.js`.
        -   Display Name: 'טיב טעם'
        -   Logo: None (as requested).
    -   Implement `server/scrapers/tivTaam.js`:
        -   Must extend `BaseScraper`.
        -   Must utilize `LevyBaseScraper` for shared logic (login, file discovery).
        -   **Login Username:** `TivTaam`
        -   **Target Store ID:** `515`

3.  **Integration**
    -   Register the new scraper in `server/scraper.js` (or wherever scrapers are instantiated).

## Non-Functional Requirements
-   **Reusability:** Strictly adhere to the `LevyBaseScraper` pattern used by Rami Levy and Keshet Teamim.
-   **Performance:** Scraper should use standard delays and error handling mechanisms.

## Acceptance Criteria
-   [ ] "Tayo" is removed from the database seed/config.
-   [ ] "Tiv Taam" is successfully seeded/available in the database.
-   [ ] The Tiv Taam scraper successfully logs in using username `TivTaam`.
-   [ ] The scraper identifies and downloads files for Store ID `515`.
-   [ ] Data from Tiv Taam is successfully parsed and inserted into the database.

## Out of Scope
-   Frontend UI design changes.
-   Adding a logo for Tiv Taam.
