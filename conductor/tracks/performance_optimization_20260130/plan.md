# Plan: Performance Optimization 20260130

## Phase 1: Infrastructure & Asset Optimization [checkpoint: 6c81aa5]
- [x] Task: Audit and Optimize Background Images a3076cb
- [x] Task: Implement Route-based Code Splitting a3076cb
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure & Asset Optimization' (Protocol in workflow.md)

## Phase 2: Frontend List Performance
- [x] Task: Virtualize Shopping List 0fcaf63
- [x] Task: Virtualize Comparison Table 1464342
- [x] Task: Optimize MUI/Emotion Styles 1464342
    - [ ] Audit `PriceCell` and `AddItemFAB` for unnecessary re-renders.
    - [ ] Use `React.memo` or `useMemo` where expensive style calculations or components are detected.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend List Performance' (Protocol in workflow.md)

## Phase 3: Backend & Scraper Efficiency
- [x] Task: Implement Scraper Cache (TTL) 9893fd6
- [x] Task: Optimize Worker Pool Concurrency 9893fd6
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Backend & Scraper Efficiency' (Protocol in workflow.md)

## Phase 4: Final Verification & Stability
- [~] Task: Cumulative Layout Shift (CLS) Audit
- [ ] Task: Performance Benchmarking
    - [ ] Run Lighthouse in a production-like build.
    - [ ] Document final performance metrics (TTI, Speed Index).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & Stability' (Protocol in workflow.md)
