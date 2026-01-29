# Implementation Plan - Fix and Separate Scrapers

## Phase 1: Discovery & Strategy
- [x] Task: Analyze `ramiLevy.js` structure and dependencies to identify logic to extract for Yohananof. 0ec2b8d
- [x] Task: Analyze `mahsaneyHashuk.js` structure to identify logic to extract for Victory. 172cd48
- [x] Task: Audit `shufersal.js` to identify the specific cause of failure (selectors, auth, API change). 172cd48
- [x] Task: Search git history/logs for previous existence of `carrefour.js` to potentially restore it. 172cd48
- [x] Task: Conductor - User Manual Verification 'Discovery & Strategy' (Protocol in workflow.md) [checkpoint: 537963e]

## Phase 2: The "Levy" Family (Rami Levy & Yohananof)
- [x] Task: Create `LevyBaseScraper` (or equivalent utility) extracting authentication and navigation logic from `ramiLevy.js`. f1df54e
    - [x] Create test file `tests/levy_base.test.js` to verify shared logic.
    - [x] Implement `LevyBaseScraper.js`.
- [x] Task: Refactor `ramiLevy.js` to use the new shared base/utility. 154ef9f
    - [x] Update `tests/ramiLevy.test.js` to ensure no regression.
    - [x] Implement refactor.
- [x] Task: Implement `yohananof.js` using the shared base/utility. a705922
    - [x] Create `tests/yohananof.test.js`.
    - [x] Implement `yohananof.js`.
- [ ] Task: Conductor - User Manual Verification 'The "Levy" Family' (Protocol in workflow.md)

## Phase 3: The "Market" Family (Mahsaney Hashuk & Victory)
- [ ] Task: Create `MarketBaseScraper` (or equivalent) extracting common filtering/API logic from `mahsaneyHashuk.js`.
    - [ ] Create `tests/market_base.test.js`.
    - [ ] Implement `MarketBaseScraper.js`.
- [ ] Task: Refactor `mahsaneyHashuk.js` to use the new shared base.
    - [ ] Ensure existing tests pass.
    - [ ] Implement refactor.
- [ ] Task: Implement `victory.js` using the shared base.
    - [ ] Create `tests/victory.test.js`.
    - [ ] Implement `victory.js`.
- [ ] Task: Conductor - User Manual Verification 'The "Market" Family' (Protocol in workflow.md)

## Phase 4: Fixing Shufersal
- [ ] Task: Fix `shufersal.js`.
    - [ ] Update `tests/shufersal_class.test.js` to reflect current site behavior (expect failure first).
    - [ ] Update selectors/logic in `shufersal.js` to make tests pass.
- [ ] Task: Conductor - User Manual Verification 'Fixing Shufersal' (Protocol in workflow.md)

## Phase 5: Carrefour Implementation
- [ ] Task: Implement `carrefour.js` (Restoration or New Implementation).
    - [ ] Create `tests/carrefour.test.js`.
    - [ ] Implement `carrefour.js` (using retrieved code or fresh logic).
- [ ] Task: Conductor - User Manual Verification 'Carrefour Implementation' (Protocol in workflow.md)

## Phase 6: Integration & Final Polish
- [ ] Task: Register new scrapers in `server/scraper.js` (or main entry point).
- [ ] Task: Verify standardized output format across all 5 scrapers.
- [ ] Task: Conductor - User Manual Verification 'Integration & Final Polish' (Protocol in workflow.md)
