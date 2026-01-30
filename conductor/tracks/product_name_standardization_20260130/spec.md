# Specification: Product Name Standardization

## Overview
Currently, different grocery stores (Shufersal, Tiv Taam, etc.) format product names inconsistently. This leads to a fragmented user experience in the Comparison Table and makes searching more difficult. This track aims to implement a standardization engine at the API layer to normalize product names into a consistent format.

## Functional Requirements
- **Standardized Format:** All product names served via the API will follow the structure: `[Product Description] [Weight/Volume] [Brand]`.
- **Unit Normalization:** Convert various unit representations into a unified set (e.g., "גרם"/"גר" -> "ג'", "קילוגרם"/"קילו" -> "ק"ג", "מיל" -> "מ"ל").
- **Noise Removal:** Strip away marketing buzzwords (e.g., "במבצע", "חדש", "בלעדי") and redundant punctuation.
- **Brand Extraction:** Use a keyword-based list of popular brands (e.g., תנובה, שטראוס, אסם, עלית) to identify and isolate the brand name from the raw string.
- **On-the-fly Transformation:** The standardization logic will reside in the Backend (API layer), transforming database records before they are sent to the Frontend.

## Non-Functional Requirements
- **Performance:** The transformation logic must be highly efficient to avoid adding latency to API responses (especially for large lists).
- **Maintainability:** The brand list and unit mappings should be easily updatable.

## Acceptance Criteria
- [ ] Product names in the Comparison Table appear uniform regardless of the source store.
- [ ] Brand names consistently appear at the end of the product string.
- [ ] Units like "100 גרם" and "100 גר" both display as "100 ג'".
- [ ] Marketing fluff like "מבצע!" is removed from displayed names.

## Out of Scope
- Modifying the raw data in the SQLite database.
- Deep NLP or AI-based parsing for this initial version.
