# Implementation Plan: Simultaneous Store Refresh

This plan outlines the steps to enable parallel scraping on the backend and granular, simultaneous loading feedback on the frontend.

## Phase 1: Backend Parallelization
The goal is to transition from sequential store scraping to concurrent execution.

- [x] Task: Write unit tests for parallel scraping logic in `server/index.js`.
    - Create `server/tests/scrape_parallel.test.js` to verify that `Promise.all` or equivalent initiates multiple scrapers concurrently.
- [x] Task: Refactor `/api/scrape` endpoint in `server/index.js`.
    - Replace the sequential `for...of` loop with `Promise.all` (or `Promise.allSettled` to handle partial failures) to trigger `scrapeStore` for all active supermarkets simultaneously.
- [x] Task: Ensure `scrapeStore` in `server/scraper.js` is safe for parallel execution.
    - Verify that Puppeteer/Playwright instances are properly isolated and do not share global state that could cause race conditions.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Parallelization' (Protocol in workflow.md) [checkpoint: 1b1ebe1]

## Phase 2: Frontend Granular Feedback
The goal is to update the UI to handle and display multiple stores refreshing at once.

- [ ] Task: Enhance store status management in `client/src/pages/ComparisonPage.tsx`.
    - Update `storeStatuses` and `loading` states to better handle overlapping Socket.io events.
    - Implement an `errors` state for stores that fail to refresh.
- [ ] Task: Add individual loading indicators to `client/src/components/ComparisonTable.tsx`.
    - Modify the table to show a loading state (e.g., Skeleton or Spinner) in the columns of stores currently being scraped.
- [ ] Task: Update the "Refresh Prices" button logic.
    - Ensure it remains disabled as long as *any* store is still refreshing.
- [ ] Task: Implement partial failure UI.
    - Add error icons/tooltips to store headers in the table if their last refresh failed.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Granular Feedback' (Protocol in workflow.md)

## Phase 3: Verification & Polish
- [ ] Task: Verify end-to-end simultaneous refresh.
    - Confirm that multiple store columns update independently and in parallel.
- [ ] Task: Performance and Resource Audit.
    - Observe system resource usage (RAM/CPU) while all scrapers run in parallel and ensure stability.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification & Polish' (Protocol in workflow.md)