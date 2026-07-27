# VALIDATION_CHECKLIST.md - SDD Verification Checklist

Use this checklist to validate code changes and ensure compliance with the Spec-Driven Development (SDD) standards before completing any work turn.

---

## 1. Automated Build & Type Verification

- [x] **Linter / Type Checking**:

  ```bash
  npm run lint
  ```

  _Pass Criteria_: `tsc --noEmit` completes with zero errors.

- [x] **Production Build**:
  ```bash
  npm run build
  ```
  _Pass Criteria_: `vite build` and `esbuild server.ts` complete successfully, generating `dist/` and `dist/server.cjs`.

---

## 2. Feature Acceptance Criteria Verification

- [x] **AC-1 (Intake & Summarization)**:
  - Submitting article text or URL invokes server proxy (`/api/extract` / `/api/summarize`).
  - Extracted title and summary are accurately displayed in the brief list.

- [x] **AC-2 (Voice Profiles & Audition)**:
  - All 5 voice profiles (Zephyr, Kore, Charon, Puck, Fenrir) are selectable in the Profile Panel.
  - Clicking "Audition" generates and plays a voice preview sample.

- [x] **AC-3 (Playback & Speed Controls)**:
  - Audio player plays, pauses, seeks, and skips tracks cleanly.
  - Speed slider adjusts between `0.5x` and `2.0x`. Quick preset buttons set exact speeds (`1.0x`, `1.25x`, `1.5x`, etc.).

- [x] **AC-4 (Playlists & Drag-and-Drop Reordering)**:
  - Users can create, view, and delete playlists.
  - Dragging track handles in a playlist reorders the queue correctly.

- [x] **AC-5 (Tokenized Search & Category Filters)**:
  - Search input filters articles by title, author, summary, tags, and categories in real time.
  - Filter chips ("All", "Saved", "Downloaded") filter the feed accurately.

- [x] **AC-6 (Speech Fallback & Haptic Pulse)**:
  - When offline or if TTS API fails, playback falls back to browser `window.speechSynthesis`.
  - Haptic feedback (`navigator.vibrate`) triggers on user interactions without console warnings.

---

## 3. Spec & Documentation Consistency Check

- [x] **SDD Alignment**:
  - Code changes match the definitions in `/specs/SYSTEM_SPEC.md`.
  - Any new behavior or scope change has been documented in `/specs/SYSTEM_SPEC.md` first.
  - Unclear requirements are flagged with `[NEEDS-CLARIFICATION]`.

- [x] **Documentation Updates**:
  - `/README.md` accurately reflects project architecture and SDD workflow.
  - `/AGENTS.md` provides clear guidance for future AI agents.
  - `CHANGELOG.md` records all major additions, changes, and fixes.

---

## 4. Security & Data Integrity Verification

- [x] **AC-8.1 (Username Character Allowlist)**:
  - User registration rejects usernames with illegal characters or path traversal sequences (`../`).
  - Allowed username pattern: `/^[a-z0-9_-]{3,32}$/`.

- [x] **AC-8.2 (Token Secret Security)**:
  - `TOKEN_SECRET` documented in `.env.example` and verified on server initialization.

- [x] **AC-8.3 (SSRF Defense)**:
  - Article URL extractor rejects non-HTTP/HTTPS protocols and private RFC 1918/4193 / loopback / link-local addresses.

- [x] **AC-8.4 (Collision-Resistant IDs)**:
  - Articles and playlists use `crypto.randomUUID()` to prevent key collision overwrites in IndexedDB.

- [x] **AC-8.5 (Diagnostic Data Isolation)**:
  - Diagnostic test runner purges temporary test articles and progress entries to prevent cloud sync pollution.

- [x] **AC-8.6 (Destructive Action Confirmation)**:
  - Deleting briefs in `HomeDashboard` and deleting playlists in `PlaylistPanel` requires explicit user confirmation.

- [x] **AC-8.7 (Optimized Search Scoring)**:
  - `searchAndFilterArticles` in `search.ts` precomputes relevance scores once per item to avoid redundant score computation during sorting.

---

## 5. Bugs, Errors, and Defects Verification Checklist

- [x] **DEF-1 (SSRF Protection)**: Extract endpoint rejects non-HTTP protocols, RFC 1918 private IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), RFC 4193 IPv6, loopback (`127.0.0.1`), and link-local (`169.254.0.0/16`).
- [x] **DEF-2 (Gemini API Models)**: AI endpoints utilize `@google/genai` with `gemini-2.5-flash` for summarization/extraction and `gemini-2.5-flash-preview-tts` for TTS synthesis.
- [x] **DEF-3 (Port Isolation in Tests)**: `server.ts` checks `NODE_ENV !== "test"` before binding to port 3000 to prevent port conflict errors during automated testing.
- [x] **DEF-4 (Firestore Sync Safety)**: `syncWithServer` executes atomic bidirectional updates without wiping unsynced local IndexedDB entries.
- [x] **DEF-5 (Memory Leak Cleanup)**: Deleting an article cleans playlist references and evicts cached `HTMLAudioElement` instances from `audioElementsCache`.
- [x] **DEF-6 (Audio Slider Scrubbing)**: Scrubbing audio progress bar does not cause UI jitter or haptic vibration spam.
- [x] **DEF-7 (Relative Skip Timing)**: 15s skip backward/forward operates relative to `activePos` for accurate jumping.
- [x] **DEF-8 (Filtered Drag-and-Drop)**: Drag-and-drop track reordering in playlists works accurately when a search query filter is active.
- [x] **DEF-9 (Firefox Drag-and-Drop)**: HTML5 drag-and-drop includes `dataTransfer.setData` payload for Firefox compatibility.
- [x] **DEF-10 (Tailwind Class Sanity)**: Codebase has zero invalid Tailwind class references (`zinc-750`, `zinc-850`, `w-4.5`).
- [x] **DEF-11 (Search Null Safety)**: Search tokenization and scoring handle `undefined`, `null`, and empty strings safely without throwing `TypeError`.
- [x] **DEF-12 (Accessibility Semantics)**: Audio player and navigation controls include comprehensive `aria-label`, `aria-current="page"`, `role="dialog"`, and Escape key handlers.
- [x] **DEF-13 (Production Secret Enforcer)**: Server startup halts with fatal error if `TOKEN_SECRET` is unset in production environments.
- [x] **DEF-14 (Startup Env Validation)**: Server validates `GEMINI_API_KEY` presence and expected key prefix on startup before binding listeners.
- [x] **DEF-15 (API Rate Limiting)**: Express rate limiters throttle traffic (60 req/min global, 15 req/min AI routes) with HTTP 429 status code.
- [x] **DEF-16 (Input Length Limits)**: Endpoints reject oversized input payloads (`/api/articles/summarize` > 50k, `/api/articles/search-news` > 200, `/api/articles/tts` > 10k).
- [x] **DEF-17 (Structured Error Logger)**: All server errors output JSON structured logs with ISO timestamps, endpoints, status codes, and masked internal stack traces.
- [x] **DEF-18 (Auth Warning Logging)**: Failed login attempts log server-side security warnings while returning safe generic error responses to clients.
- [x] **DEF-19 (HTML Title & Meta Tags)**: `index.html` renders `<title>CommuteBrief — Smart Commute Audio Briefings</title>` and OpenGraph description tags.
- [x] **DEF-20 (Git Ignore Data Protection)**: `.gitignore` includes `data/` and `*.db` rules to prevent user database or secret leaks in repository commits.
- [x] **DEF-21 (Rate Limiter Memory Sweep)**: `server.ts` executes a periodic 10-minute sweep purging stale IP keys from `rateLimitStore` to prevent in-memory map leakage.
