# Specification: Robust Hebrew Search Refactor

## Overview
Refactor the search engine to provide "smart" and relevant product results in Hebrew. The goal is to move beyond simple substring matching to a semantically aware system that handles phrase reordering, typos, and related terms (synonyms) without relying on LLMs for every query.

## Functional Requirements
- **Semantic Mapping:** Implement a curated dictionary to link related grocery terms (e.g., "ספריי" <-> "ניקוי", "מתז").
- **Typo Tolerance & Fuzzy Search:** Implement fuzzy matching to handle common Hebrew spelling variations and accidental English keyboard input (e.g., "rxhx" -> "ניקוי").
- **Advanced Phrase Matching:** Support phrase reordering so that "בשר טחון" successfully matches "טחון בשר" or products containing both terms non-adjacently.
- **Weighted Ranking:** Prioritize results based on relevance (Exact Match > Start of String > Contains Phrase > Semantic Match).
- **SQLite FTS5 Integration:** Utilize SQLite's Full-Text Search (FTS5) for high-performance indexing and querying of product data.

## Non-Functional Requirements
- **Performance:** Search queries should remain sub-100ms for a better user experience.
- **Local-First:** Minimize external API calls; the core search logic should reside within the backend using the local SQLite database.
- **Scalability:** The search logic should handle the increasing number of products from multiple scrapers (currently 18k+ per store).

## Acceptance Criteria
- Searching for "בשר טחון" returns products like "בשר בקר טחון" and "טחון טרי" at the top.
- Searching for "ספריי חלונות" returns products related to "ניקוי חלונות" via semantic mapping.
- Search handles common Hebrew prefixes (ה, ו, ב, ל) gracefully via stemming or normalization.
- The UI remains unchanged, displaying the improved results in the existing components.

## Out of Scope
- Integration of an LLM for real-time query expansion (reserved as a last resort).
- Changes to the frontend search bar or result cards UI.
- Personalization based on user purchase history.
