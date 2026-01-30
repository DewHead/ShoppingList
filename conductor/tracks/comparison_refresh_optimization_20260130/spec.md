# Track Specification: Comparison Page Refresh Optimization

#### Overview
This track focuses on optimizing the user experience on the **Comparison Page** during price refreshes. The goal is to consolidate the loading state into a single indicator under the store logo in the header, display the total cart price for each store in the header once available, and visually highlight the cheapest total to help users make quick decisions.

#### Functional Requirements
1.  **Header Loading Indicator:**
    *   While a store is refreshing, a single `CircularProgress` indicator must be displayed directly under the store's logo in the table header.
    *   The indicator should only be visible when the store's status is "active" but not "Done".
2.  **Consolidated Cell State:**
    *   Individual item cells (PriceCell) must **not** display loading spinners during a refresh.
    *   While a refresh is in progress, the cell should continue to display previous data with a "stale" visual treatment (e.g., `opacity: 0.5`).
3.  **Store Total Display & Highlighting:**
    *   Whenever valid data is available for a store, its total cart price must be displayed in the header, directly below the logo.
    *   **The cheapest total cart price across all stores must be visually highlighted** (e.g., using a bold green color or a "Best Price" badge) to make it stand out.
    *   The total should be updated in real-time as data arrives via WebSockets.

#### User Interface (UI) Improvements
*   **Header:** Adjust `ComparisonTable` header cells to stack the logo, loading indicator/total price, and sort label vertically.
*   **Highlighting:** Apply specific styling (color/background/font-weight) to the store total that represents the lowest price.
*   **Item Cells:** Update the cell rendering logic in `ComparisonTable` to handle the "refreshing" state by fading existing data instead of showing a spinner.

#### Acceptance Criteria
*   [x] Triggering a refresh shows exactly one loading circle per active store, located in the table header.
*   [x] No loading circles appear in the individual price cells during a refresh.
*   [x] Existing prices in the table remain visible but faded while a refresh is active for their respective store.
*   [x] Upon refresh completion, the loading circle in the header is replaced by the store's total cart price.
*   [x] **The store with the lowest total cart price is clearly highlighted in the table header.**
*   [x] Total cart prices are visible on initial page load if data is already available.
