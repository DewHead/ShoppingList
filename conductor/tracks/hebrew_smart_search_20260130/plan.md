# Implementation Plan: Robust Hebrew Search Refactor

## Phase 1: Foundation & Data Indexing (FTS5)
- [ ] Task: Set up SQLite FTS5 (Full-Text Search) virtual table for products.
    - [ ] Create a migration to initialize an FTS5 table `products_fts` that mirrors key searchable columns from `prices`.
    - [ ] Implement a trigger or service-level sync to keep `products_fts` updated with `prices`.
- [ ] Task: Implement a basic Hebrew Normalizer utility.
    - [ ] Create `server/utils/hebrewUtils.js`.
    - [ ] Add functions to strip common prefixes (ה, ו, ב, ל, כ, מ, ש).
    - [ ] Add functions to normalize characters (e.g., removing nikud, unifying final letters ך, ם, ן, ף, ץ).
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Semantic Layer & Typo Tolerance
- [ ] Task: Create a curated Hebrew Synonym/Semantic Dictionary.
    - [ ] Define `server/data/synonyms.json` with initial mappings (e.g., "ספריי": ["ניקוי", "מתז"], "בשר": ["בקר", "טחון", "עוף"]).
- [ ] Task: Develop a Query Pre-processor.
    - [ ] Implement logic to detect and correct accidental English keyboard layout input (e.g., "rxhx" -> "ניקוי").
    - [ ] Implement query expansion logic that injects synonyms from the dictionary into the search query.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Search Engine Refactor (TDD)
- [ ] Task: Write unit tests for the new search engine.
    - [ ] Test exact matches, prefix matches, and semantic matches.
    - [ ] Test phrase reordering (e.g., "טחון בשר" matches "בשר בקר טחון").
    - [ ] Test weighted ranking order.
- [ ] Task: Refactor the search endpoint/service to use the new FTS5 engine.
    - [ ] Replace simple `LIKE` queries with FTS5 `MATCH` queries.
    - [ ] Implement the `BM25` ranking function or a custom scoring algorithm for weighted results.
    - [ ] Integrate the Hebrew Normalizer and Semantic Layer into the search flow.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Integration & Optimization
- [ ] Task: Verify end-to-end search in the UI.
    - [ ] Ensure the existing frontend search components display the new ranked results correctly.
- [ ] Task: Optimize query performance.
    - [ ] Profile search execution time with 50k+ product records.
    - [ ] Add necessary indexes or optimize the FTS5 ranking weights.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
