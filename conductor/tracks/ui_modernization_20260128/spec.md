# Specification: UI/UX Modernization & Refactor

## Overview
This track focuses on modernizing the user interface and user experience of the Shopping List application. The goal is to make the application "easy to navigate" and "easy to understand" by adopting standard, modern mobile-first web patterns.

## Core Design Decisions (AI Selected)
Based on the goal of a "modern" and "easy to navigate" utility app, the following paradigms are selected:
-   **Navigation:** **Bottom Navigation Bar**. This is the standard for modern mobile web apps, allowing instant switching between the core views (List, Comparison, Settings) with one thumb.
-   **Shopping List:** **Swipe Actions & Visual Grouping**. Swipe-to-delete/complete is an expected behavior on mobile. Grouping items (even essentially) improves scanability.
-   **Comparison View:** **Summary Cards & Visual Highlighting**. Users need the "answer" (which store is cheapest?) immediately. A summary card provides this, while color coding helps analysis.
-   **Global Actions:** **Floating Action Button (FAB)**. A persistent "+" button for adding items is crucial for the primary use case of quickly building a list.

## Functional Requirements

### 1. Navigation Structure
-   Implement a fixed **Bottom Navigation Bar** with three destinations:
    -   **List** (Home): The shopping list.
    -   **Compare**: The price comparison view.
    -   **Settings**: Configuration and scraping triggers.
-   Ensure the active tab is visually distinct.
-   **Constraint:** Must work correctly in both LTR (English) and **RTL (Hebrew)** layouts.

### 2. Shopping List Page Refactor
-   **Add Item FAB:** Replace the top input field with a Floating Action Button that opens a bottom sheet or focused modal for adding items. This clears up vertical space.
-   **Item Rows:**
    -   Increase row height for better touch targets (min 48px).
    -   Implement **Swipe-to-Delete** (Red background, trash icon).
    -   Implement **Swipe-to-Toggle** (Green background, check icon) for marking items as "in cart" or "done".
    -   **Constraint:** Swipe directions must logically adapt or remain intuitive in **RTL** mode.

### 3. Comparison Page Refactor
-   **Best Price Summary:** Add a "Winner" card at the top of the comparison page displaying the cheapest store and the total savings compared to the most expensive store.
-   **Responsive Layout:** Ensure the comparison cards stack gracefully on mobile and use a grid on desktop.
-   **Sticky Headers:** When scrolling the comparison list, keep the store names/totals pinned to the top.

### 4. Visual Polish (Global)
-   **Typography:** Standardize font sizes using Material UI's typography scale. Increase contrast for secondary text.
-   **Spacing:** Increase padding and margins to create a "breathable" layout.
-   **Feedback:** Add micro-interactions (ripples, transitions) for all tap targets.
-   **Theme Support:** All new components and layouts MUST support **Dark Mode** and **Hebrew (RTL)** out of the box.

## Out of Scope
-   Backend logic changes (except where needed to support UI, e.g., sorting).
-   New scraping sources.
