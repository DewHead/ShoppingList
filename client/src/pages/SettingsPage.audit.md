# Settings Page Mobile Audit

## Desktop-Only Patterns Identified
1.  **Main Layout:**
    -   Uses `display: flex` with a row direction.
    -   Sidebar (Tabs) has a fixed width of `240px` (`flexShrink: 0`).
    -   Content area uses `flexGrow: 1`.
    -   This structure consumes ~250px+ horizontal space before content, leaving little room on mobile.

2.  **Supermarket List Items:**
    -   Uses `display: grid` with `gridTemplateColumns: '1fr auto auto auto auto'`.
    -   This forces 5 distinct horizontal columns. On mobile (e.g., 360px width), this will crush the text or cause overflow.

3.  **Visual Settings:**
    -   Background thumbnails are `150px` wide.
    -   On small screens, `flexWrap: 'wrap'` works, but spacing needs verification.

4.  **RTL/L2R Issues:**
    -   `borderRight: 1` on the Tabs container is hardcoded. In RTL mode, this border should be on the left.
    -   Need to use `borderInlineEnd` or conditional logic based on theme direction.

5.  **Missing Assets:**
    -   `SettingsPage.css` does not exist, though implied by the plan.
    -   Currently relying heavily on inline `sx` props.

## Refactor Strategy
-   **Layout:** Switch to `flexDirection: 'column'` on mobile (`md` breakpoint down).
-   **Tabs:** Convert vertical tabs to horizontal tabs (or a select dropdown) on mobile, or stack the sections entirely using Cards.
-   **List Items:** Change grid layout to a stacked flex layout or a 2-row grid (Name on top, controls below).
-   **CSS:** Create `SettingsPage.css` to manage complex media queries if `sx` becomes too verbose.
