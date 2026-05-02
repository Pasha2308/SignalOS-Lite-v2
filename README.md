# SignalOS Lite

AI-powered content generator for weekly batch creation.

## Features

- **Generate ideas** — Topics + sources → ranked angle cards  
- **Auto content generation** — One-click ideas → recommended idea → LinkedIn + Twitter variants  
- **Bulk post generation** — Up to 10 posts in one run, saved to your weekly list  
- **Weekly content export** — Copy or download planned posts with clear day-by-day formatting  

## Repository layout

```
SignalOS/
├── ai-engine/      # Express API (Groq)
├── signalos-web/   # Next.js 14 (App Router) UI
└── README.md
```

## How to run

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <repo-root>
```

### 2. Run the AI engine

```bash
cd ai-engine
npm install
```

Create `ai-engine/.env` with at least `GROQ_API_KEYS=...` and `PORT=5000` (matches the default frontend proxy).

```bash
npm run dev
```

Leave this process running.

### 3. Run the frontend

```bash
cd signalos-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app proxies API calls to the engine (`/api/ai/*` → `http://localhost:5000` by default via `next.config.mjs`; override with `AI_ENGINE_URL` if needed).

## Screenshots

_Add screenshots here._

## Tech stack

- **Next.js** (App Router)  
- **TypeScript**  
- **Groq API** (via `ai-engine`)
