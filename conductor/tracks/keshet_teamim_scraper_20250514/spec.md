# Specification: Keshet Teamim Scraper Integration

## Overview
This track involves implementing a new scraper for **Keshet Teamim** to provide real-time pricing and product data within the Shopping List application. The scraper will follow the established architecture used by **Rami Levi** and **Yohananof**, leveraging the `LevyBaseScraper` for portal interaction.

## Functional Requirements
- **Portal Integration:** Authenticate with the PublishedPrices portal using the username `Keshet` (no password required).
- **Data Extraction:** 
    - Scrape real-time product prices and stock status from `.gz` XML files.
    - Extract promotion/discount information.
    - Support full-text search indexing for the discovered items.
- **System Integration:**
    - Register Keshet Teamim in the parallel refresh worker pool.
    - Ensure data is compatible with the "cheapest cart" optimization algorithm.
    - Emit real-time status updates via WebSockets for UI transparency.

## Non-Functional Requirements
- **Performance:** Maintain concurrency limits within the worker pool to avoid IP blocking or portal strain.
- **Reliability:** Implement retry logic for file downloads and decompression.
- **Consistency:** Use the shared `LevyBaseScraper` logic to ensure uniform data structures for products and promos.

## Acceptance Criteria
- [ ] Successful login to the portal using the `Keshet` username.
- [ ] Successful identification and download of the latest `PriceFull` and `PromoFull` files.
- [ ] Accurate parsing of XML data into the application's database schema.
- [ ] Integration with the frontend "Price Comparison Matrix" (Keshet Teamim should appear as a store option).
- [ ] Passing automated tests for the scraping logic and data transformation.

## Out of Scope
- Historical price tracking (only current prices are required).
- User-specific accounts (only the global `Keshet` credentials will be used).
