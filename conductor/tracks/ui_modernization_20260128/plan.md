# Implementation Plan: UI/UX Modernization & Refactor

## Phase 1: Navigation & Layout Foundation [checkpoint: 41a930e]
- [x] Task: Implement Bottom Navigation Bar 86c3fe5
    - [x] Write Vitest tests for Navigation component (Active states, RTL).
    - [x] Create `BottomNav` component using MUI `BottomNavigation`.
    - [x] Integrate `BottomNav` into `App.tsx` and ensure it only shows on mobile/tablet.
- [x] Task: Global Layout Adjustments 6908d6d
    - [x] Write CSS tests or visual regression checks for spacing/typography.
    - [x] Standardize typography across all pages using MUI Theme.
    - [x] Adjust global container padding for better mobile "breathability".
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Navigation & Layout Foundation' (Protocol in workflow.md)

## Phase 2: Shopping List Page Modernization [checkpoint: a7144f0]
- [x] Task: Floating Action Button (FAB) for adding items cd32bdb
    - [x] Write tests for FAB interaction and Add Item dialog.
    - [x] Implement `AddItemFAB` component.
    - [x] Create Bottom Sheet / Modal for item input (replacing top search bar).
- [x] Task: Interactive List Rows 6f337b2
    - [x] Write integration tests for swipe interactions (using `react-swipeable-list` or similar).
    - [x] Implement Swipe-to-Delete functionality.
    - [x] Implement Swipe-to-Toggle (Mark as Done) functionality.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Shopping List Page Modernization' (Protocol in workflow.md)

## Phase 3: Comparison Page Refactor [checkpoint: 6ba496d]
- [x] Task: Best Price Summary Card ec05b67
    - [x] Write unit tests for "Cheapest Store" calculation logic (ensuring savings are correct).
    - [x] Implement `ComparisonSummary` card at the top of the page.
- [x] Task: Sticky Headers & Grid Layout ffba383
    - [x] Write tests for sticky positioning and responsive stacking.
    - [x] Implement sticky headers for store names/totals.
    - [x] Refactor comparison grid for better desktop/mobile parity.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Comparison Page Refactor' (Protocol in workflow.md)

## Phase 4: Polish & Theme Consistency
- [ ] Task: Animation & Feedback
    - [ ] Add micro-animations for page transitions and button taps.
- [ ] Task: Dark Mode & RTL Audit
    - [ ] Verify all new components in Dark Mode and Hebrew RTL.
    - [ ] Fix any contrast or alignment issues.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Polish & Theme Consistency' (Protocol in workflow.md)
