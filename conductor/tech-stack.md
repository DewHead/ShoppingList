# Technology Stack

## Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **UI Library:** Material UI (MUI) @7.3.7, Emotion
- **Routing:** React Router 7.1.2
- **State/Communication:** Socket.io-client for real-time updates.

## Backend
- **Runtime:** Node.js
- **Framework:** Express 5.2.1
- **Database:** SQLite 5.1.1 (via sqlite3)
- **Concurrency Control:** Concurrency-limited worker pool for parallel tasks; Promise-based queue for sequential database writes.
- **Real-time:** Socket.io for bidirectional communication.

## Scraping & AI
- **Automation:** Puppeteer 24.36.0, Playwright 1.57.0 (with playwright-extra and stealth plugin).
- **AI Integration:** @google/generative-ai 0.24.1 for potential data parsing/extraction.

## Development Tools
- **Process Manager:** Concurrently (running client/server in parallel)
- **Environment:** Dotenv
- **UI Interactions:** Framer Motion (animations), React Swipeable List (mobile interactions).
- **Utilities:** Axios (HTTP client), Date-fns (date manipulation), Lucide-react (icons).
