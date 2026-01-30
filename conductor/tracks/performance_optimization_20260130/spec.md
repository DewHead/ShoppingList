# Spec: Performance Optimization 20260130

## Overview
This track aims to address performance bottlenecks across the entire Shopping List application, focusing on initial load times (TTI), UI responsiveness during heavy data rendering, and the efficiency of the scraping engine.

## Functional Requirements
- **Virtualized Lists:** The `ShoppingListPage` and `ComparisonPage` must use virtualization to handle large lists without degrading scroll performance.
- **Route-based Code Splitting:** Implement `React.lazy` and `Suspense` for main page components to reduce the initial bundle size.
- **Scraper Cache Layer:** Introduce a time-to-live (TTL) mechanism in the backend to prevent redundant scraping of the same product within a short window (e.g., 1 hour).
- **Parallelization Audit:** Optimize the existing worker pool to ensure it fully utilizes system resources without hitting rate limits.

## Non-Functional Requirements
- **TTI:** Under 2 seconds on a 4G connection.
- **Frame Rate:** Maintain 60fps during scrolling on mobile devices.
- **Layout Stability:** Zero Cumulative Layout Shift (CLS) when price data updates are received via WebSockets.
- **Lighthouse Score:** Performance score >= 90.

## Acceptance Criteria
- [ ] Shopping list scrolls smoothly with 50+ items.
- [ ] Comparison matrix handles 8+ stores without UI freezing.
- [ ] Initial app load shows a meaningful skeleton or spinner immediately, followed by the app within 2s.
- [ ] Repeated "Refresh Prices" calls for the same item within the TTL window do not trigger new scraper instances.
- [ ] Background images are optimized/compressed to reduce payload.

## Out of Scope
- Migrating from SQLite to a different database engine.
- Complete redesign of the UI (only performance-related structural changes).
