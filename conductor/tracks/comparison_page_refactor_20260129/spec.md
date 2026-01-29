# Track Specification: Comparison Page Refactor

## Overview
Refactor the existing Comparison Page into a modern, intuitive, and high-performance comparison table. The goal is to provide a clear matrix view of prices across all active stores, highlighting the cheapest options to facilitate quick decision-making for budget-conscious users.

## Functional Requirements
- **Price Comparison Matrix:**
    - Rows: Individual products from the shopping list.
    - Columns: Stores that are marked as "active" in the application settings.
- **Cheapest Store Highlighting:**
    - For each product (row), the lowest price among active stores must be visually emphasized.
    - Visual style: Bold green text and a "Best Price" badge/icon.
- **Data Handling:**
    - If a store does not have data for a specific product, the cell should display "N/A" or a dash ("-").
- **Interactivity:**
    - **Sorting:** Users can click column headers to sort by product name or price for a specific store.
    - **Hover Effects:** Rows should highlight on hover to improve readability and tracking across columns.
- **Dynamic Updates:**
    - The table must automatically update its columns based on the "Active Stores" configuration in the Settings Page.

## Non-Functional Requirements
- **Modern Aesthetic:** Clean UI using Material Design principles, consistent with the project's "Material Design / Clean Utility" philosophy.
- **Performance:** Efficient rendering of the table even with large lists of products.
- **Mobile Responsiveness:** Implement "Sticky Columns" (freezing the product name) to allow horizontal scrolling of store prices on smaller screens.

## Acceptance Criteria
- [ ] Comparison page displays a table with products as rows and active stores as columns.
- [ ] The lowest price in each row is bold, green, and has a "Best Price" badge.
- [ ] Columns correctly reflect the active/inactive state of stores from the settings.
- [ ] Table is sortable by product name and store price.
- [ ] Mobile view allows horizontal scrolling while keeping the product name visible.
- [ ] Hovering over a row highlights it visually.

## Out of Scope
- Adding items to the shopping list directly from the comparison page.
- Modifying scraper configurations from this view.
