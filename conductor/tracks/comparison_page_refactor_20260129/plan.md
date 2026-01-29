# Implementation Plan: Comparison Page Refactor

## Phase 1: Preparation & Component Architecture [checkpoint: d1df149]
- [x] Task: Review existing `ComparisonPage.tsx` and `comparisonUtils.ts` to identify reusable logic.
- [x] Task: Define TypeScript interfaces for the new table data structure (Matrix row: `productName`, `prices: Record<storeId, price>`).
- [x] Task: Conductor - User Manual Verification 'Preparation' (Protocol in workflow.md)

## Phase 2: Core Table Logic & State Management [checkpoint: 9bb54f7]
- [x] Task: Update `comparisonUtils.ts` to transform scraped data into a matrix format suitable for the table.
    - [x] Write tests for `transformToMatrix` function.
    - [x] Implement `transformToMatrix` handling "N/A" values.
- [x] Task: Implement sorting logic for the matrix data.
    - [x] Write tests for sorting by product name and store price.
    - [x] Implement sorting function.
- [x] Task: Conductor - User Manual Verification 'Core Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation (Desktop) [checkpoint: d4819a7]
- [x] Task: Create `ComparisonTable` component using MUI `Table` components.
    - [x] Implement header row with active stores.
    - [x] Implement data rows with hover highlighting.
- [x] Task: Implement "Cheapest Price" highlighting logic.
    - [x] Create `PriceCell` component that determines if it is the minimum in its row.
    - [x] Style cheapest price with bold green text and a badge.
- [x] Task: Integrate Settings state to filter columns based on active stores.
- [x] Task: Conductor - User Manual Verification 'UI Desktop' (Protocol in workflow.md)

## Phase 4: Mobile Optimization & Refinement [checkpoint: a8e0614]
- [x] Task: Implement sticky first column for the product name using CSS/MUI.
- [x] Task: Add horizontal scrolling for the store columns on mobile breakpoints.
- [x] Task: Final styling polish to ensure "modern" look (padding, typography, colors).
- [x] Task: Conductor - User Manual Verification 'Mobile & Polish' (Protocol in workflow.md)

## Phase 5: Verification & Cleanup
- [ ] Task: Run full suite of unit and integration tests.
- [ ] Task: Verify responsive behavior on simulated mobile devices.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
