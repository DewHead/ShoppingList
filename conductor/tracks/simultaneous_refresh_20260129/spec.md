# Track Specification: Simultaneous Store Refresh

## Overview
This track implements a true simultaneous price refresh for all active stores in the Comparison Page. Currently, the system iterates through stores sequentially, leading to long wait times. This change will enable parallel scraping on the backend and provide granular, real-time feedback in the UI for each store's progress.

## Functional Requirements
- **Parallel Scraping:** The backend `/api/scrape` endpoint must initiate scraping for all active stores concurrently rather than sequentially.
- **Granular Real-time UI:** 
    - The "Refresh Prices" button should transition to a disabled "Refreshing..." state during the process.
    - A global loading indicator (spinner or progress bar) should be visible.
    - Individual stores in the Comparison Table should display loading skeletons or spinners while their specific data is being fetched/processed.
- **Partial Success Handling:** If a specific store's scraper fails, the UI should display an error indicator for that column while still showing updated data for stores that succeeded.
- **Resource Management:** Run all active scrapers immediately in parallel (as per user preference).

## Non-Functional Requirements
- **Performance:** Significant reduction in total time to refresh prices for the entire shopping list across all stores.
- **Robustness:** Ensure that a crash in one scraper process does not affect the execution of other parallel scrapers.

## Acceptance Criteria
- [ ] Clicking "Refresh Prices" disables the button and shows a global loading state.
- [ ] Multiple store columns show loading indicators simultaneously.
- [ ] Backend initiates all scrapers at once (verified via logs).
- [ ] Store columns update independently as their respective scraper finishes.
- [ ] Failed scrapes show an error icon in the table header or cells, rather than hanging or breaking the whole view.

## Out of Scope
- Implementing a persistent scraping queue or historical price tracking.
- Modification of individual scraper logic (only how they are invoked).