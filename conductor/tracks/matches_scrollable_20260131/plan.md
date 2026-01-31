# Implementation Plan - Shopping List Matches Scrollable Card

## Phase 1: Infrastructure & Style Updates [checkpoint: f175c87]
Update the `ShoppingListSidePanel` component to support a scrollable container and a sticky header for the matches section.

- [x] Task: Modify `ShoppingListSidePanel.tsx` to wrap the matches list in a scrollable `Box`. [55f8f95]
    - [ ] Add `maxHeight` and `overflowY: 'auto'` to the results container within the "Matches for" `Paper` component.
    - [ ] Set `position: 'sticky'`, `top: 0`, and `zIndex: 1` on the header `Box` to keep it fixed.
    - [ ] Ensure the "Matches for" `Paper` container has `display: 'flex'` and `flexDirection: 'column'` to correctly support the sticky header and scrollable body.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure & Style Updates' (Protocol in workflow.md)

## Phase 2: Responsive Refinement [checkpoint: 7d9b33b]
Adjust the maximum height dynamically based on the platform (Mobile vs. Desktop) to ensure optimal usability.

- [x] Task: Refine `maxHeight` for the matches container in `ShoppingListSidePanel.tsx`. [ae481b5]
    - [ ] Use a responsive value for `maxHeight` (e.g., `70vh` or `calc(100vh - 300px)`).
    - [ ] Verify that the card fits within the desktop side panel without overlapping the global header.
    - [ ] Verify that the card remains usable within the mobile drawer.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Responsive Refinement' (Protocol in workflow.md)

## Phase 3: Verification & Cleanup
Final check of the scrolling behavior and ensuring no regression on the "Cheapest Store" card.

- [ ] Task: Verify that the "Cheapest Store" card structure remains untouched and non-scrollable as per spec.
- [ ] Task: Audit scrolling performance with `react-virtuoso` if the list grows excessively large (though likely not needed for standard match counts).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification & Cleanup' (Protocol in workflow.md)
