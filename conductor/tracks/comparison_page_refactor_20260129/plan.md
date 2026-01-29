# Implementation Plan: Comparison Page Refactor

## Phase 1: Preparation & Component Architecture [checkpoint: d1df149]
- [x] Task: Review existing `ComparisonPage.tsx` and `comparisonUtils.ts` to identify reusable logic.
- [x] Task: Define TypeScript interfaces for the new table data structure (Matrix row: `productName`, `prices: Record<storeId, price>`).
- [x] Task: Conductor - User Manual Verification 'Preparation' (Protocol in workflow.md)

## Phase 2: Core Table Logic & State Management
- [ ] Task: Update `comparisonUtils.ts` to transform scraped data into a matrix format suitable for the table.
    - [ ] Write tests for `transformToMatrix` function.
    - [ ] Implement `transformToMatrix` handling "N/A" values.
- [ ] Task: Implement sorting logic for the matrix data.
    - [ ] Write tests for sorting by product name and store price.
    - [ ] Implement sorting function.
- [ ] Task: Conductor - User Manual Verification 'Core Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation (Desktop)
- [ ] Task: Create `ComparisonTable` component using MUI `Table` components.
    - [ ] Implement header row with active stores.
    - [ ] Implement data rows with hover highlighting.
- [ ] Task: Implement "Cheapest Price" highlighting logic.
    - [ ] Create `PriceCell` component that determines if it is the minimum in its row.
    - [ ] Style cheapest price with bold green text and a badge.
- [ ] Task: Integrate Settings state to filter columns based on active stores.
- [ ] Task: Conductor - User Manual Verification 'UI Desktop' (Protocol in workflow.md)

## Phase 4: Mobile Optimization & Refinement
- [ ] Task: Implement sticky first column for the product name using CSS/MUI.
- [ ] Task: Add horizontal scrolling for the store columns on mobile breakpoints.
- [ ] Task: Final styling polish to ensure "modern" look (padding, typography, colors).
- [ ] Task: Conductor - User Manual Verification 'Mobile & Polish' (Protocol in workflow.md)

## Phase 5: Verification & Cleanup
- [ ] Task: Run full suite of unit and integration tests.
- [ ] Task: Verify responsive behavior on simulated mobile devices.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
