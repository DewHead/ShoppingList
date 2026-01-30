# Plan: Performance Optimization 20260130

## Phase 1: Infrastructure & Asset Optimization [checkpoint: 6c81aa5]
- [x] Task: Audit and Optimize Background Images a3076cb
- [x] Task: Implement Route-based Code Splitting a3076cb
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure & Asset Optimization' (Protocol in workflow.md)

## Phase 2: Frontend List Performance
- [~] Task: Virtualize Shopping List
- [ ] Task: Virtualize Comparison Table
    - [ ] Write failing tests for `ComparisonTable.tsx` focusing on horizontal and vertical scrolling performance.
    - [ ] Implement virtualization for the grid of prices.
    - [ ] Ensure that "cheapest" highlighting and sticky headers/columns still function correctly.
- [ ] Task: Optimize MUI/Emotion Styles
    - [ ] Audit `PriceCell` and `AddItemFAB` for unnecessary re-renders.
    - [ ] Use `React.memo` or `useMemo` where expensive style calculations or components are detected.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend List Performance' (Protocol in workflow.md)

## Phase 3: Backend & Scraper Efficiency
- [ ] Task: Implement Scraper Cache (TTL)
    - [ ] Write failing tests for `server/scraper.js` or a new cache utility to verify TTL logic (e.g., skip scrape if data is < 1 hour old).
    - [ ] Implement a simple memory-based or SQLite-backed cache for scraped results.
    - [ ] Update the scraper dispatch logic to check the cache before launching a browser instance.
- [ ] Task: Optimize Worker Pool Concurrency
    - [ ] Write tests to simulate high-load scraping and verify the worker pool respects limits.
    - [ ] Refactor the scraping queue in `server/index.js` or `server/scraper.js` for better resource utilization.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Backend & Scraper Efficiency' (Protocol in workflow.md)

## Phase 4: Final Verification & Stability
- [ ] Task: Cumulative Layout Shift (CLS) Audit
    - [ ] Verify that asynchronously arriving price updates via WebSockets do not cause layout jumps.
    - [ ] Add skeleton loaders or fixed-size containers where necessary.
- [ ] Task: Performance Benchmarking
    - [ ] Run Lighthouse in a production-like build.
    - [ ] Document final performance metrics (TTI, Speed Index).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & Stability' (Protocol in workflow.md)
