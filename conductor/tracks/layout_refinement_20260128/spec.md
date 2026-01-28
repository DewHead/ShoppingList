# Specification: Shopping List Layout Refinement

## Overview
This track addresses two primary UI issues: the incorrect stacking order on mobile (where the price summary preceded the list) and the "stuffed" visual feeling on desktop. The goal is to establish a clear hierarchy that prioritizes list management while providing comparison data as contextual information.

## Functional Requirements

### 1. Mobile Hierarchy Correction
-   **Requirement:** The Shopping List must appear above the "Cheapest Store" summary and "Item Matches" when viewing on mobile devices.
-   **Implementation:** Reorder the DOM structure so the primary list is rendered first.

### 2. Desktop Layout Optimization
-   **Requirement:** Transition from a symmetrical 50/50 split to a modern "Primary/Secondary" layout to reduce visual density.
-   **Implementation:**
    -   Use an asymmetrical grid split (e.g., 65% for the List, 35% for Comparison data).
    -   Limit the maximum width of the overall container to prevent the layout from stretching too thin on ultra-wide screens.
    -   Increase the `gap` between the primary list and the side panels to provide "visual breathing room."

### 3. Visual Grouping & Polish
-   **Requirement:** Ensure the side panel (Cheapest Store + Matches) feels like a cohesive unit.
-   **Implementation:**
    -   Ensure consistent border-radius and elevation for cards in both columns.
    -   Add a slight background tint or distinct border to the secondary column to visually separate it from the primary action area.

## Technical Constraints
-   **RTL Support:** The layout must naturally adapt to Hebrew (RTL). In RTL, the "Primary" list should be on the right and the "Secondary" panel on the left.
-   **Theme:** Full support for Dark Mode must be maintained.
-   **Performance:** No impact on interaction speed or data fetching.

## Out of Scope
-   Changes to the Comparison Page (this track is specific to the Shopping List view).
-   New features or logic changes.
