# Specification - Shopping List Matches Scrollable Card

## Overview
This track aims to improve the user experience on the Shopping List page by making the "Matches for" results card scrollable. Currently, when multiple items are selected or many matches are found across different stores, the side panel (desktop) or drawer content (mobile) can become excessively long, making it difficult to navigate.

## Functional Requirements
- **Scrollable Content:** The list of store matches within the "Matches for" card must be scrollable when it exceeds a certain height.
- **Sticky Header:** The card's header, which displays "Matches for [Item/Count]" and includes the "Expand/Collapse All" and "Clear Selection" buttons, must remain fixed at the top of the card while the content scrolls beneath it.
- **Dynamic Max Height:** The card should grow to fit its content but must be capped at a maximum height that is relative to the viewport (e.g., `calc(100vh - 200px)` on desktop) to ensure it remains manageable.
- **Scope Limitation:** This scrollable behavior applies specifically to the "Matches for" card. The "Cheapest Store" card is explicitly excluded from this change as per user preference.

## Non-Functional Requirements
- **Responsive Design:** The implementation must work seamlessly on both mobile (within the drawer) and desktop (within the sticky side panel).
- **Visual Consistency:** The scrollbar styling should align with the project's modern Material Design theme.
- **Performance:** Ensure that scrolling remains smooth (60 FPS) even with multiple stores and items expanded.

## Acceptance Criteria
- [ ] Selecting one or more items on the Shopping List page opens the "Matches for" card.
- [ ] If the content of the "Matches for" card is long, a vertical scrollbar appears within the card.
- [ ] The header of the "Matches for" card stays visible at the top while scrolling the matches.
- [ ] The "Matches for" card does not push other critical UI elements (like the mobile bottom nav) off-screen.
- [ ] The "Cheapest Store" card remains non-scrollable (or retains its existing behavior).
