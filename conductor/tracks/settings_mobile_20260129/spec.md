# Specification: Mobile-Friendly Settings Page Refactor

## Overview
This track involves refactoring the existing Settings page to be fully responsive and mobile-friendly. The goal is to transition from a desktop-centric layout to a modern, touch-optimized experience that aligns with the project's "Material Design / Clean Utility" aesthetic and supports the Hebrew language (RTL).

## Functional Requirements
- **Responsive Layout:** Implement a single-column, vertically stacked layout for mobile screens. Use **Material Design Cards** to group related settings (e.g., General, Scrapers, Appearance).
- **Touch Optimization:** Ensure all interactive elements (buttons, toggles, list items) have a minimum touch target size of **44x44px** with appropriate spacing.
- **Full Configuration Support:**
    - **Background Selection:** Users must be able to preview and select application backgrounds on mobile.
    - **Scraper Configuration:** All technical fields (URLs, CSS selectors) must remain editable on mobile, using responsive inputs or focused editing modes to facilitate mobile keyboard usage.
    - **Theme & Preferences:** Dark/Light mode toggles and Language/RTL settings must be easily accessible.
- **Navigation Integration:** The page must integrate seamlessly with the mobile bottom navigation bar and provide a clear, accessible "Back" button if navigated to from a sub-menu.

## Non-Functional Requirements
- **UI Consistency:** Follow the established "Material Design / Clean Utility" theme, including color palettes, typography, and elevation.
- **RTL Support:** Full support for Hebrew layout and right-to-left text direction.
- **Performance:** Ensure smooth scrolling and transitions between setting groups.

## Acceptance Criteria
- [ ] Settings page layout adapts to mobile screen widths without horizontal scrolling.
- [ ] All buttons and input fields meet the 44x44px touch target requirement.
- [ ] Users can successfully update Scraper URLs and Selectors using a mobile device.
- [ ] Background selection previews are visible and functional on mobile.
- [ ] Language and Theme changes persist and update the UI instantly.
- [ ] Layout remains correct in both LTR (English) and RTL (Hebrew) modes.

## Out of Scope
- Adding new settings or configuration options not present in the current implementation.
- Backend changes to the settings storage mechanism (unless required for UI functionality).
