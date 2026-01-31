# Initial Concept
The user wants to build a Shopping List application with integrated price scraping and comparison.

# Product Definition

## Target Audience
- **Budget-conscious shoppers:** Users looking for the best prices across multiple stores to save money.
- **Power users:** Individuals who want to automate their grocery list management and optimize their shopping trips.

## Core Goals
- **Real-time Price Comparison:** Provide up-to-date price data from various online grocery retailers (e.g., Shufersal, Tiv Taam) to enable informed purchasing decisions.
- **Collaborative Experience:** Offer a seamless shopping list that synchronizes across devices and users in real-time.
- **Extreme Performance:** Ensure a smooth, lag-free UI experience even with thousands of items, and minimize server overhead through intelligent scraping and caching.

## Performance & Reliability
- **Frontend Virtualization:** Use `react-virtuoso` to maintain 60 FPS scrolling on large lists and comparison matrices.
- **Backend Efficiency:** Streaming XML processing and bulk database operations to handle large data imports (Shufersal) without blocking the event loop.
- **Intelligent Caching:** Respect 1-hour TTL on scraper data to avoid redundant network traffic and browser overhead.
- **Resource Management:** Global concurrency limits (3 parallel browsers) to ensure system stability on low-resource environments.

## Key Features
- **Intelligent Web Scraping:** Robust scrapers for major grocery store websites (including Shufersal, Rami Levy, Tiv Taam, and more) to extract current pricing and product data.
- **Parallel Price Refresh:** True simultaneous scraping across multiple active stores with a concurrency-limited worker pool for maximum efficiency.
- **Standardized Product Names:** A unified naming engine that normalizes varied store formats into a consistent `[Description] [Weight] [Brand]` structure for clearer comparison.
- **Cheapest Cart Optimization:** Automatically calculate the most cost-effective store for a given list of items.
- **Real-time Synchronization:** Use WebSockets to ensure all participants in a shared list see updates instantly.

## User Experience (UX)
- **Modern Navigation:** A persistent bottom navigation bar for quick access to core features on mobile.
- **Responsive Configuration:** A card-based settings interface optimized for mobile ergonomics, providing clear grouping of scraper and application preferences.
- **Contextual Optimization:** A sticky bottom summary bar on mobile that opens a detailed optimization drawer, and a sticky asymmetrical side panel on desktop.
- **Interactive List:** Mobile-first interactions including swipe-to-delete and swipe-to-toggle for efficient list management.
- **Data Visualization:** A comprehensive Price Comparison Matrix allowing side-by-side store price analysis, with visual highlighting for the cheapest options per product. Granular real-time feedback via loading indicators and error icons provides transparency during parallel store refreshes. Summary cards and color-coded highlighting provide immediate insights into price comparisons.
- **Clean Layout:** Collapsible price breakdowns and constrained heights for optimization data to maintain focus on list management.
- **Efficient Input:** A Floating Action Button (FAB) that opens a focused input sheet for adding items quickly.

## Data Strategy
- **Accuracy & Freshness:** Implement scheduled daily re-scrapes and heuristic-based validation to detect and handle pricing outliers or scraping errors.
