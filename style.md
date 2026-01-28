# Daily Driver Design System
**Version 1.0** | **Style:** Productivity / SaaS (Linear, Vercel, Todoist)

## 1. Core Philosophy
The "Daily Driver" aesthetic prioritizes **information density, clarity, and speed**. It is designed for tools that are used every day.
* **Sturdy, not floaty:** We use borders, not shadows.
* **Data, not decoration:** Every pixel must serve a purpose.
* **Scanning, not reading:** Layouts are designed for quick visual parsing.

---

## 2. Visual Foundation

### Borders vs. Shadows
We avoid "elevation" and drop shadows. Instead, we use subtle, high-quality borders to define structure.
* **Rule:** Replace `elevation={...}` with `variant="outlined"`.
* **Code:** `border: '1px solid', borderColor: 'divider'`
* **Why:** Borders work better in Dark Mode and create a cleaner, "flat" technical look.

### Spacing & Density
* **Padding:** Tighter than default Material UI.
    * Default Card Padding: `p={2}` or `p={3}` (16px/24px).
    * Avoid `p={4}` or `p={5}` unless it's a landing page.
* **Lists:** Use horizontal rows with dividers rather than massive vertical cards for simple items.

### Radius
* **Cards/Containers:** `borderRadius: 3` (12px). Soft but structured.
* **Buttons/Inputs:** `borderRadius: 2` (8px).
* **Chips/Badges:** `borderRadius: 1.5` (6px) or `borderRadius: '16px'` (Pill).

### Typography
* **Font:** System default (Inter, Roboto, San Francisco).
* **Headings:** High contrast.
    * Weight: `700` or `800`.
    * Color: `text.primary`.
    * Letter Spacing: Tight (`-0.5px`).
* **Metadata:**
    * Weight: `500`.
    * Color: `text.secondary`.
    * Size: `0.75rem` or `0.875rem`.

---

## 3. Component Standards (MUI Specifics)

### 1. The Standard Card
Used for almost all containers (products, store results, settings sections).

```tsx
<Paper 
  elevation={0} 
  sx={{ 
    border: '1px solid', 
    borderColor: 'divider', 
    borderRadius: 3,
    overflow: 'hidden', // Ensures content doesn't bleed
    bgcolor: 'background.paper' // Explicit for dark mode safety
  }}
>
  {/* Content */}
</Paper>
