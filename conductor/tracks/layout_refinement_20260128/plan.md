# Implementation Plan: Shopping List Layout Refinement

## Phase 1: Layout Restructuring
- [x] Task: Reorder DOM for Mobile Hierarchy (f82e576)
    - [ ] Write Vitest tests to verify element order in mobile vs. desktop media queries.
    - [ ] Move the "Main List" `<Box>` above the "Side Panel" `<Box>` in the `ShoppingListPage` component.
- [ ] Task: Implement Asymmetrical Grid
    - [ ] Update `gridTemplateColumns` to use an asymmetrical split (e.g., `1.8fr 1fr`) instead of `1fr 1fr`.
    - [ ] Adjust container `maxWidth` and `gap` for better spacing on large screens.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Layout Restructuring' (Protocol in workflow.md)

## Phase 2: Visual Refinement & RTL Verification
- [ ] Task: Side Panel Cohesion
    - [ ] Apply a subtle background color or border to the secondary column to distinguish it from the main list.
    - [ ] Ensure consistent elevation and padding across all cards in the side panel.
- [ ] Task: RTL & Theme Audit
    - [ ] Verify the layout in Hebrew (RTL) mode ensures the Primary list is correctly positioned.
    - [ ] Verify contrast and legibility in Dark Mode for the new secondary column styles.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Visual Refinement & RTL Verification' (Protocol in workflow.md)
