# Implementation Plan - Fix and Separate Scrapers

## Phase 1: Discovery & Strategy
- [x] Task: Analyze `ramiLevy.js` structure and dependencies to identify logic to extract for Yohananof. 0ec2b8d
- [x] Task: Analyze `mahsaneyHashuk.js` structure to identify logic to extract for Victory. 172cd48
- [x] Task: Audit `shufersal.js` to identify the specific cause of failure (selectors, auth, API change). 172cd48
- [x] Task: Search git history/logs for previous existence of `carrefour.js` to potentially restore it. 172cd48
- [x] Task: Conductor - User Manual Verification 'Discovery & Strategy' (Protocol in workflow.md) [checkpoint: 537963e]

## Phase 2: The "Levy" Family (Rami Levy & Yohananof) [checkpoint: 2de2341]
- [x] Task: Create `LevyBaseScraper` (or equivalent utility) extracting authentication and navigation logic from `ramiLevy.js`. f1df54e
    - [x] Create test file `tests/levy_base.test.js` to verify shared logic.
    - [x] Implement `LevyBaseScraper.js`.
- [x] Task: Refactor `ramiLevy.js` to use the new shared base/utility. 154ef9f
    - [x] Update `tests/ramiLevy.test.js` to ensure no regression.
    - [x] Implement refactor.
- [x] Task: Implement `yohananof.js` using the shared base/utility. a705922
    - [x] Create `tests/yohananof.test.js`.
    - [x] Implement `yohananof.js`.
- [x] Task: Conductor - User Manual Verification 'The "Levy" Family' (Protocol in workflow.md) [checkpoint: 2de2341]

## Phase 3: The "Market" Family (Mahsaney Hashuk & Victory) [checkpoint: 266ad77]
- [x] Task: Create `MarketBaseScraper` (or equivalent) extracting common filtering/API logic from `mahsaneyHashuk.js`. 3048c21
    - [x] Create `tests/market_base.test.js`.
    - [x] Implement `MarketBaseScraper.js`.
- [x] Task: Refactor `mahsaneyHashuk.js` to use the new shared base. a58fec0
    - [x] Ensure existing tests pass.
    - [x] Implement refactor.
- [x] Task: Implement `victory.js` using the shared base. 6e319bf
    - [x] Create `tests/victory.test.js`.
    - [x] Implement `victory.js`.
- [x] Task: Conductor - User Manual Verification 'The "Market" Family' (Protocol in workflow.md) [checkpoint: 266ad77]

## Phase 4: Fixing Shufersal [checkpoint: 473576e]
- [x] Task: Fix `shufersal.js`. 25caa28
    - [x] Update `tests/shufersal_class.test.js` to reflect current site behavior (expect failure first).
    - [x] Update selectors/logic in `shufersal.js` to make tests pass.
- [x] Task: Conductor - User Manual Verification 'Fixing Shufersal' (Protocol in workflow.md) [checkpoint: 473576e]

## Phase 5: Carrefour Implementation [checkpoint: f459a4b]
- [x] Task: Implement `carrefour.js` (Restoration or New Implementation). 3a260bc
    - [x] Create `tests/carrefour.test.js`.
    - [x] Implement `carrefour.js` (using retrieved code or fresh logic).
- [x] Task: Conductor - User Manual Verification 'Carrefour Implementation' (Protocol in workflow.md) [checkpoint: f459a4b]

## Phase 6: Integration & Final Polish
- [x] Task: Register new scrapers in `server/scraper.js` (or main entry point). f8e5777
- [x] Task: Verify standardized output format across all 5 scrapers. f8e5777
- [ ] Task: Conductor - User Manual Verification 'Integration & Final Polish' (Protocol in workflow.md)
