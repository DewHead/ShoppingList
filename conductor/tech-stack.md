# Technology Stack

## Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **UI Library:** Material UI (MUI) @7.3.7, Emotion
- **Routing:** React Router 7.1.2
- **Virtualization:** `react-virtuoso` (TableVirtuoso for comparisons, Virtuoso for lists).
- **State/Communication:** Socket.io-client for real-time updates.

## Backend
- **Runtime:** Node.js
- **Framework:** Express 5.2.1
- **Database:** SQLite 5.1.1 (via sqlite3). Optimized with bulk inserts and FTS index updates.
- **Concurrency Control:** Centralized `scrapeQueue` with a global limit of 3 browser instances.
- **Real-time:** Socket.io for bidirectional communication.

## Scraping & AI
- **Automation:** Puppeteer 24.36.0, Playwright 1.57.0 (with playwright-extra and stealth plugin).
- **Parsing:** `saxes` for streaming XML processing (Shufersal).
- **Caching:** 1-hour TTL for scraper data based on `last_scrape_time`.
- **AI Integration:** @google/generative-ai 0.24.1 for potential data parsing/extraction.

## Development Tools
- **Process Manager:** Concurrently (running client/server in parallel)
- **Environment:** Dotenv
- **UI Interactions:** Framer Motion (animations), React Swipeable List (mobile interactions).
- **Utilities:** Axios (HTTP client), Date-fns (date manipulation), Lucide-react (icons).
