# Implementation Plan: Product Name Standardization

This plan outlines the steps to implement a standardization engine at the API layer to normalize product names across all stores into the format: `[Product Description] [Weight/Volume] [Brand]`.

## Phase 1: Core Logic & Unit Normalization [checkpoint: 38eca5b]
Focus on building the utility functions that handle string cleaning and unit conversion.

- [x] Task: Create `server/utils/nameStandardizer.js` with basic unit mapping and noise removal regex. bacb44f
- [x] Task: Write unit tests in `server/tests/nameStandardizer.test.js` for unit normalization (e.g., "גרם" to "ג'"). bacb44f
- [x] Task: Implement `normalizeUnits` function to pass tests. bacb44f
- [x] Task: Implement `stripMarketingFluff` function to remove terms like "במבצע", "חדש", etc. bacb44f
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core Logic' (Protocol in workflow.md) 38eca5b

## Phase 2: Brand Extraction & Structural Reordering [checkpoint: 7b71973]
Implement the brand identification logic and the final string assembly.

- [x] Task: Define a comprehensive list of common Israeli grocery brands in a configuration file or constant. 7c3d31d
- [x] Task: Write tests for `standardizeName` covering the `[Description] [Weight] [Brand]` requirement. 7c3d31d
- [x] Task: Implement `extractBrand` using keyword-based matching. 7c3d31d
- [x] Task: Implement the main `standardizeName` function that coordinates extraction, cleaning, and reordering. 7c3d31d
- [x] Task: Conductor - User Manual Verification 'Phase 2: Brand & Structure' (Protocol in workflow.md) 7b71973

## Phase 3: API Integration
Integrate the standardizer into the backend routes.

- [ ] Task: Identify all API endpoints returning product data (e.g., comparison results, search results).
- [ ] Task: Apply `standardizeName` to the product objects before sending the JSON response.
- [ ] Task: Verify that frontend components (ComparisonTable, ShoppingListPage) display the standardized names correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: API Integration' (Protocol in workflow.md)
