# CommuteBrief: Smart Commute Audio Briefings

CommuteBrief is a full-stack web application designed to optimize daily commutes. It transforms real-time news search queries, web articles, and custom text into structured, audio-first briefings narrated by customizable AI voice profiles or client-side speech fallbacks. User briefs, playlists, and listening progress sync across devices via an Express backend with per-user JSON storage and HMAC-signed session tokens.

---

## 🚀 Key Features

### 📡 Real-Time News Search (Gemini Search Grounding)

- **Live Web Grounding**: Search real-time news topics using Gemini Search Grounding (`gemini-2.5-flash`).
- **Source Citations**: Preview live web citations and original source links alongside the generated summary.
- **Instant Brief Creation**: One-tap action to save grounded briefings to your queue or stream audio immediately.

### 📰 Web URL & Text Intake

- **URL Extraction**: Import news articles and blog posts directly via URL.
- **Text Summarization**: Paste custom text or notes to generate structured commute audio briefs.

### 🎧 Adaptive Audio Player & Playback Controls

- **Custom Audio Controls**: Play, pause, seek, and skip between queued briefings.
- **Fluid Speed Control**: Adjustable speed slider (`0.5x` to `2.0x`) and quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`).
- **Sleep Timer**: Configurable countdown timer (5m to 60m) that automatically pauses playback when expired.

### 🔊 AI Narrator Voice Profiles

- **5 Distinct Voice Profiles**: Tailored styles including Zephyr (Calm Narrator), Kore (Energetic Host), Charon (Mellow Storyteller), Puck (Crisp Newsreader), and Fenrir (Bold Anchor).
- **Live Audition Preview**: Audition and test each voice profile directly in the settings panel before generating briefs.

### 📴 Offline Persistence & Haptic Feedback

- **IndexedDB Local Engine**: Save articles, playlists, and listening history locally for offline playback.
- **Tactile Haptics**: Snappy vibration feedback on tap, skip, and playback completion.

### ☁️ Cross-Device Cloud Sync

- **Express File-Based Sync**: Briefs, playlists, progress, and preferences are backed up to a per-user JSON file on the server (`data/sync_<username>.json`).
- **HMAC-Signed Sessions**: Login issues a bearer token signed with `TOKEN_SECRET`; sync endpoints reject unsigned or tampered requests.
- **Event-Driven Reconciliation**: Sync runs on login, registration, manual refresh, and network reconnection, merging remote and local state atomically.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide Icons.
- **Backend**: Express server running on Node.js on port `3000` (`server.ts`), handling Gemini AI summarization, search grounding, Text-to-Speech proxying, authentication (PBKDF2 password hashing + HMAC-signed tokens), and per-user cloud sync (`/api/sync/save`, `/api/sync/get`).
- **AI Engine**: `@google/genai` TypeScript SDK utilizing `gemini-2.5-flash` with Google Search Grounding tools and `gemini-2.5-flash-preview-tts` for TTS generation.

---

## 🔑 Environment Variables

The application configures required environment variables in `.env.example`:

```env
# Server Gemini API Key (Required for AI summarization & TTS)
GEMINI_API_KEY=

# Optional Secret Key for Production Auth Tokens
TOKEN_SECRET=
```

---

## 📚 Documentation Map

This repository follows **Spec-Driven Development (SDD)** principles where specs serve as the source of truth. The complete documentation structure is organized as follows:

| Document                                                               | Description                                 | Key Focus Areas                                                                                 |
| :--------------------------------------------------------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------- |
| **[`AGENTS.md`](./AGENTS.md)**                                         | Spec-Driven Development rules & constraints | SDD lifecycle, ambiguity protocols (`[NEEDS CLARIFICATION]`), system rules                      |
| **[`specs/SYSTEM_SPEC.md`](./specs/SYSTEM_SPEC.md)**                   | Master System Specification                 | System scope, sync data schema, security model, user stories, acceptance criteria              |
| **[`specs/IMPLEMENTATION_PLAN.md`](./specs/IMPLEMENTATION_PLAN.md)**   | Architecture Mapping & Roadmap              | Component mapping, completed roadmap phases (1–9), defect tracking catalog                      |
| **[`specs/VALIDATION_CHECKLIST.md`](./specs/VALIDATION_CHECKLIST.md)** | Verification & QA Protocol                  | Type safety, production build validation, feature AC checks, defect verifications               |
| **[`CHANGELOG.md`](./CHANGELOG.md)**                                   | Release & Version History                   | Version release notes following standard [Keep a Changelog](https://keepachangelog.com/) format |
| **[`HANDOFF_LOG.md`](./HANDOFF_LOG.md)**                               | Agent Handoff & Audit Logs                  | Engineering audits, visual layout verifications, and context handoff logs                       |
| **[`LICENSE`](./LICENSE)**                                             | Open-source MIT License                     | Project license terms and permissions                                                           |

---

## 🐛 Bugs, Errors, and Defects Fixed

- **Production Secret Management**: Enforced `validateEnvironment()` startup check that halts server execution if `TOKEN_SECRET` is unset in production (`NODE_ENV === "production"`).
- **Startup Environment Validation**: Added startup validation for `GEMINI_API_KEY` presence and expected key format before binding listeners.
- **API Rate Limiting Middleware**: Implemented sliding-window in-memory rate limiters (60 req/min global, 15 req/min AI routes) returning HTTP 429 when thresholds are exceeded.
- **Input Length Bounds Enforcement**: Added strict character limits across AI endpoints (`/api/articles/extract` url <= 2000, `/api/articles/summarize` text <= 50,000, `/api/articles/search-news` query <= 200, `/api/articles/tts` text <= 10,000).
- **Structured Error Logging & Observability**: Replaced raw `console.error` with `logStructured` logger providing JSON timestamps, paths, status codes, and masked internal stack traces.
- **Auth Security & Log Warnings**: Added server-side security warnings for invalid login attempts without leaking detailed error states to clients.
- **SSRF Endpoint Safeguards**: Protected `/api/articles/extract` against SSRF by checking schemes (`http:`, `https:`) and blocking private RFC 1918/4193 IP blocks, loopbacks, and link-local ranges.
- **Model Standardizations**: Aligned Express server AI requests to `@google/genai` models `gemini-2.5-flash` and `gemini-2.5-flash-preview-tts`.
- **Atomic Cloud Synchronization**: Fixed data-loss bug in `syncWithServer` by merging IndexedDB and server sync changes atomically.
- **Memory & Resource Eviction**: Fixed memory leak on article deletion by cleaning up playlist entries and removing cached `HTMLAudioElement` instances.
- **Audio Slider Scrubbing**: Isolated seek slider drag state (`isDragging`, `dragPos`) in `PodcastPlayer` to prevent audio playback jitter.
- **Filtered Drag-and-Drop Reordering**: Fixed track reordering in playlists when search query filters are active.
- **Firefox Drag-and-Drop Fix**: Added `dataTransfer.setData` payload for cross-browser HTML5 drag compatibility.
- **Null-Safe Fuzzy Search**: Added strict null, array, and string guards to `tokenize`, `scoreArticle`, and `searchAndFilterArticles`.
- **Theme & Accessibility Polish**: Fixed non-existent Tailwind utility classes (`zinc-750`, `zinc-850`, `w-4.5`) and added `aria-label`, `role="dialog"`, and `aria-current="page"` semantics.
- **HTML Branding & OpenGraph Meta**: Replaced generic template title in `index.html` with `"CommuteBrief — Smart Commute Audio Briefings"` and OpenGraph metadata.
- **Source Control Protection**: Added `data/` and `*.db` to `.gitignore` to prevent database secret leaks.
- **Rate Limiter Memory Cleanup**: Added a periodic 10-minute sweep in `server.ts` to purge stale IP entries from `rateLimitStore` and eliminate map memory accumulation.
- **Adaptive Light/Dark Theme Surfaces (DEF-22)**: Refactored `IntakePanel.tsx` and `PlaylistPanel.tsx` containers, mode tabs, inputs, selects, and cards to use white surface cards (`bg-white`) in light mode and dark cards (`bg-zinc-900`) in dark mode, ensuring high-contrast legibility across themes.
- **Prohibited Color Policy Standardization (DEF-23)**: Removed prohibited purple and indigo accent utilities from `PodcastPlayer.tsx` and `HomeDashboard.tsx`, standardizing on primary `emerald` accents.

---

## ⚙️ Development & Build Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript linting check
npm run lint

# Format codebase with Prettier
npm run format

# Build for production
npm run build

# Start production server
npm run start
```

---

## 📄 License

This project is licensed under the [License](LICENSE).


