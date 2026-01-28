# Implementation Plan: Shopping List Layout Refinement

## Phase 1: Layout Restructuring
- [x] Task: Reorder DOM for Mobile Hierarchy (f82e576)
    - [x] Write Vitest tests to verify element order in mobile vs. desktop media queries.
    - [x] Move the "Main List" `<Box>` above the "Side Panel" `<Box>` in the `ShoppingListPage` component.
- [x] Task: Implement Asymmetrical Grid
    - [x] Update `gridTemplateColumns` to use an asymmetrical split (e.g., `1.8fr 1fr`) instead of `1fr 1fr`.
    - [x] Adjust container `maxWidth` and `gap` for better spacing on large screens.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Layout Restructuring' (Protocol in workflow.md)

## Phase 2: Visual Refinement & RTL Verification
- [x] Task: Side Panel Cohesion
    - [x] Apply a subtle background color or border to the secondary column to distinguish it from the main list.
    - [x] Ensure consistent elevation and padding across all cards in the side panel.
- [x] Task: RTL & Theme Audit
    - [x] Verify the layout in Hebrew (RTL) mode ensures the Primary list is correctly positioned.
    - [x] Verify contrast and legibility in Dark Mode for the new secondary column styles.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Visual Refinement & RTL Verification' (Protocol in workflow.md)

## Phase 3: Iterative Refinement (User Feedback)
- [x] Task: Fix Transparency Issues
    - [x] Update Side Panel components to use an opaque background (`background.paper`) instead of transparent.
- [x] Task: Reduce Visual Density ("Stuffy" Layout)
    - [x] Increase padding within Side Panel cards.
    - [x] Adjust grid ratios if necessary to give the side panel more breathing room.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Iterative Refinement'

## Phase 4: Structural Refactor (Navigation & Visibility)
- [x] Task: Extract Side Panel Component
    - [x] Refactor the "Matches" and "Cheapest Store" logic/UI into a reusable `ShoppingListSidePanel` component.
- [x] Task: Implement Mobile Summary Bar & Drawer
    - [x] Create a `ComparisonSummaryBar` that sticks to the bottom on mobile (above nav).
    - [x] Implement a `SwipeableDrawer` to host the `ShoppingListSidePanel` on mobile.
    - [x] Ensure the FAB does not overlap with the new summary bar.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Structural Refactor'

## Phase 5: Desktop Experience Refinement (Sticky & Collapsible)
- [x] Task: Implement Sticky Sidebar
    - [x] Apply `position: sticky` to the Desktop Side Panel container so it tracks with the list.
- [x] Task: Refactor Side Panel for Clarity
    - [x] Update `ShoppingListSidePanel` to show a "Summary Card" for the cheapest store (Total, Store Name, Key Stats).
    - [x] Make the detailed item list collapsible (Accordion style) to reduce visual noise.
    - [x] Ensure "Matches" card takes priority when items are selected.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Desktop Refinement'

## Phase 6: Refine Sticky Behavior (Scrollable Content)
- [x] Task: Constrain Breakdown Height
    - [x] Apply `maxHeight` (e.g., 50vh) and `overflowY: auto` to the collapsible list in `ShoppingListSidePanel`.
    - [x] Ensure the custom scrollbar style matches the application theme.
- [x] Task: Conductor - User Manual Verification 'Phase 6: Refine Sticky Behavior'
