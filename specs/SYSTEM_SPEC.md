# SYSTEM_SPEC.md - CommuteBrief System Specification

## 1. Purpose

**CommuteBrief (CommuteNews)** is a full-stack, audio-first single-page web application (SPA) designed to optimize daily commutes. It accepts pasted text articles or web news URLs, converts them into concise, structured summaries using server-side Gemini AI models, synthesizes natural-sounding audio briefings using AI voice models or browser-native Text-to-Speech (TTS) fallbacks, and provides **cloud-based cross-device synchronization** for playlists and user briefs powered by an Express backend with file-based JSON storage and HMAC-signed session tokens.

---

## 2. Scope

### In-Scope Capabilities

1. **Article, Link & Live Search Intake**:
   - URL extraction and text summarization via Express `/api/articles/extract` and `/api/articles/summarize` proxy routes.
   - Real-time Gemini Search Grounding via Express `/api/articles/search-news` proxy route, allowing users to search real-time news articles or topics before generating audio summaries.
   - Grounded web sources / citations extraction and display.
   - Voice profile customization (Zephyr, Kore, Charon, Puck, Fenrir) with live audition preview capabilities.
2. **Audio Synthesis & Playback**:
   - Server-side TTS synthesis via Gemini / `@google/genai` API (`/api/articles/tts`).
   - Browser-native `window.speechSynthesis` graceful fallback when offline or when API limits/errors occur.
   - Custom audio player controls: Play/Pause, Seek Bar, Volume, Skip Next/Previous, Sleep Timer, and Speed Control (`0.5x` to `2.0x` with quick presets).
3. **Queue & Playlist Management**:
   - Interactive playlist creation, track reordering (HTML5 drag-and-drop), track additions, and removal.
   - Up-next queue playback sequence with automatic track progression upon completion.
4. **Search & Category Filtering**:
   - Tokenized fuzzy search utility (`src/utils/search.ts`) filtering articles across titles, summaries, authors, categories, tags, and saved/downloaded states in `HomeDashboard` and `PlaylistPanel`.
5. **Persistence & Offline Support**:
   - Client-side IndexedDB persistence (`src/lib/db.ts`) for local audio caching, articles, playlists, listening history, and audio progress tracking.
   - Offline detection and seamless state fallback.
6. **Cloud Cross-Device Synchronization (Express File-Based Sync)**:
   - Cloud sync across devices for user briefs, custom playlists, listening history, and playback progress via the Express backend.
   - HMAC-signed session tokens anchoring user isolation scope at per-user JSON sync files (`data/sync_<username>.json`).
   - Event-driven sync triggered on mutations and network reconnection (no real-time `onSnapshot` listeners).
   - Offline-first architecture where local IndexedDB operations sync to the server upon network reconnection.
7. **Haptic Feedback**:
   - Hardware/browser `navigator.vibrate` haptic pulses for tab switches, playback actions, track skips, speed changes, and track completion.

---

## 3. Cloud Architecture & Sync Integration Spec

### 3.1 Data Hierarchy & Schema

Sync data is stored as a single JSON document per user at `data/sync_<username>.json`. The document mirrors the `SyncData` interface defined in `src/types.ts`:

#### Entity: `UserBrief` (Article)

- **Properties**:
  - `id` (`string`, required): Unique identifier (UUID).
  - `title` (`string`, required): Title of the article or news brief.
  - `summary` (`string`, required): Gemini-generated concise summary text.
  - `originalText` (`string`, optional): Extracted raw article text.
  - `url` (`string`, optional): Original source website URL.
  - `category` (`string`, required): News category (e.g. Technology, Business, Science, World).
  - `tags` (`readonly string[]`, max ~10 items): Topic search tags.
  - `voiceName` (`VoiceName`, required): Selected TTS voice profile (Zephyr, Kore, Charon, Puck, Fenrir).
  - `isDownloaded` (`boolean`, required): Whether audio is cached locally.
  - `isSaved` (`boolean`, required): Whether the brief is bookmarked.
  - `createdAt` (`string`, required): Creation ISO timestamp.
  - `playCount` (`number`, required): Number of times played.

#### Entity: `UserPlaylist`

- **Properties**:
  - `id` (`string`, required): Unique playlist identifier (UUID).
  - `name` (`string`, required): User-defined playlist title.
  - `description` (`string`, optional): Optional playlist overview.
  - `articleIds` (`readonly string[]`): Ordered list of `Article` IDs in the playlist.
  - `tags` (`readonly string[]`, optional): Optional playlist tags.
  - `createdAt` (`string`, required): Creation ISO timestamp.

#### Entity: `UserProgress`

- **Properties**:
  - `articleId` (`string`, required): The article this progress tracks.
  - `position` (`number`, required): Saved playback offset in seconds.
  - `duration` (`number`, required): Audio duration in seconds.
  - `completed` (`boolean`, required): Whether playback finished.
  - `lastPlayed` (`string`, required): Last played ISO timestamp.

#### Entity: `UserPreferences`

- **Properties**:
  - `summaryLength` (`SummaryLength`, required): "short" | "medium" | "detailed".
  - `summaryTone` (`SummaryTone`, required): "professional" | "engaging" | "concise".
  - `voiceName` (`VoiceName`, required): Default voice profile.
  - `playbackSpeed` (`number`, required): Preferred speed factor (`0.5` to `2.0`).
  - `theme` (`Theme`, required): "dark" | "light".

---

### 3.2 Security Model

The Express backend enforces zero-trust access control:

1. **User Scope Isolation**: All sync reads and writes require a valid HMAC-signed bearer token (`/api/sync/save`, `/api/sync/get`). The token resolves to a single username, and sync files are scoped to `data/sync_<username>.json`.
2. **Username Character Allowlist**: Registration enforces `/^[a-z0-9_-]{3,32}$/`, eliminating path traversal risks in sync file paths.
3. **Path Traversal Guard**: Sync handlers verify `path.resolve(syncFile).startsWith(path.resolve(DATA_DIR))` before any filesystem access.
4. **Password Storage**: Passwords are hashed with PBKDF2 (100,000 iterations, SHA-256, 64-byte digest) with a per-user random salt.
5. **Token Security**: Session tokens are HMAC-SHA256 signed with `TOKEN_SECRET` and expire after 7 days. Production startup halts if `TOKEN_SECRET` is unset.
6. **Rate Limiting**: Sliding-window in-memory rate limiters (60 req/min global, 15 req/min AI routes) return HTTP 429 when exceeded, with a 10-minute periodic sweep to purge stale keys.
7. **SSRF Defense**: `/api/articles/extract` enforces HTTP/HTTPS scheme checks and blocks private RFC 1918/4193 IP ranges, loopback, and link-local addresses.

---

### 3.3 Synchronization Logic & Conflict Resolution

1. **Offline-First Local Writes**: Client mutations immediately write to local IndexedDB (`src/lib/db.ts`) for zero-latency UI reactivity.
2. **Bi-Directional Server Sync**:
   - On login, registration, network reconnection, or manual refresh, `syncWithServer` pulls the remote sync document and merges it with local state.
   - When online, mutations flush to the server via `ApiService.backupData` (POST `/api/sync/save`).
3. **Conflict Resolution Strategy**: Last-Write-Wins (LWW) based on `createdAt` timestamps for articles; remote playlists overwrite local on match.
4. **Audio Binary Handling**: Raw synthesized audio buffers are stored locally in IndexedDB (`audioStore`), keeping the sync document lean.
5. **Concurrency Safety**: An asynchronous locking mechanism (`syncInFlightRef` and `pendingSyncRef`) queues overlapping sync operations to prevent race conditions.

---

## 4. User Stories & Use Cases

### US-1: Article Intake & Briefing Generation

- **As a** daily commuter,
- **I want to** paste an article URL or text body,
- **So that** I can generate a concise audio brief for my commute.

### US-2: Personalized Voice Selection & Auditioning

- **As a** listener,
- **I want to** preview and select different AI narrator voice profiles (Calm, Energetic, Mellow, Crisp, Bold),
- **So that** my audio briefings match my preferred listening tone.

### US-3: Adaptive Audio Playback & Speed Controls

- **As a** user on the go,
- **I want to** adjust playback speed smoothly between 0.5x and 2.0x and use quick speed presets,
- **So that** I can listen at my ideal pacing.

### US-4: Playlist & Queue Organization

- **As a** power listener,
- **I want to** create custom playlists and reorder tracks via drag-and-drop,
- **So that** I can stream multiple briefs back-to-back during long rides.

### US-5: Fast Tokenized Search & Filtering

- **As a** user with a growing library of briefs,
- **I want to** quickly search through saved audio summaries in Home Dashboard and Playlist Panel,
- **So that** I can find specific topics instantly.

### US-6: Resilient Offline Playback & Speech Fallback

- **As a** commuter passing through low-connectivity areas,
- **I want** audio playback to continue seamlessly using local storage or browser Web Speech synthesis,
- **So that** my commute stream is never interrupted.

### US-7: Cloud Cross-Device Synchronization

- **As a** multi-device commuter (e.g. laptop at work, phone on train),
- **I want** my briefs, playlists, and listening progress to synchronize automatically via the Express backend,
- **So that** I can seamlessly switch devices and pick up playback right where I stopped.

---

## 5. Acceptance Criteria

| ID         | Category       | Acceptance Criteria                                                                                                                                                           |
| ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC-1.1** | Intake         | Submitting a valid text or URL invokes server endpoints `/api/articles/extract` or `/api/articles/summarize` and returns a structured brief title and summary.                |
| **AC-1.2** | Intake         | Missing or invalid URLs present user-friendly error feedback without crashing the application.                                                                               |
| **AC-2.1** | Voice          | The Profile panel displays 5 distinct voice profiles (Zephyr, Kore, Charon, Puck, Fenrir) with tone descriptions.                                                             |
| **AC-2.2** | Voice          | Clicking "Audition" generates and plays a short audio preview clip from `/api/articles/tts`.                                                                                |
| **AC-3.1** | Playback       | The podcast player supports Play/Pause, Seek, Volume, 15s Skip Forward/Backward, and Sleep Timer.                                                                            |
| **AC-3.2** | Playback       | The speed slider allows smooth adjustments from `0.5x` to `2.0x` in `0.05x` steps, alongside quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`).         |
| **AC-4.1** | Playlist       | Users can create, rename, and delete custom playlists.                                                                                                                       |
| **AC-4.2** | Playlist       | Tracks inside a playlist can be reordered using HTML5 drag-and-drop handles.                                                                                                 |
| **AC-5.1** | Search         | The search input in `HomeDashboard` and `PlaylistPanel` filters articles in real-time across titles, categories, authors, summaries, and tags.                              |
| **AC-5.2** | Search         | Category filters include "All", "Saved", "Downloaded", and topic categories.                                                                                                 |
| **AC-6.1** | Fallback       | If the server TTS endpoint fails or the device is offline, playback automatically falls back to browser `window.speechSynthesis`.                                            |
| **AC-6.2** | Haptics        | Supported actions (tab changes, play/pause, track completion) trigger distinct haptic vibration patterns via `navigator.vibrate`.                                            |
| **AC-7.1** | Cloud Sync     | User authentication anchors per-user sync file paths `data/sync_<username>.json` via HMAC-signed bearer tokens.                                                              |
| **AC-7.2** | Cloud Sync     | Creating, updating, or deleting briefs/playlists on one device syncs to the server and is reconciled on secondary devices upon login or network reconnection.                 |
| **AC-7.3** | Cloud Sync     | Playback progress offsets are saved to the sync document and synchronized to allow cross-device resume.                                                                      |
| **AC-7.4** | Cloud Sync     | Sync handlers strictly restrict file access to the authenticated user's own sync file and enforce path traversal guards.                                                    |
| **AC-8.1** | Security       | Registration enforces username character allowlist (`/^[a-z0-9_-]{3,32}$/`) to eliminate path traversal risks in user sync file storage.                                      |
| **AC-8.2** | Security       | `TOKEN_SECRET` environment variable is documented in `.env.example` and validated for token signature security.                                                             |
| **AC-8.3** | Security       | URL extraction (`/api/articles/extract`) enforces HTTP/HTTPS scheme check and blocks private IP, loopback, and link-local ranges against SSRF.                               |
| **AC-8.4** | Data Integrity | Articles and playlists generate collision-resistant UUIDs (`crypto.randomUUID()`) to preserve IndexedDB key safety.                                                           |
| **AC-8.5** | Data Integrity | Diagnostic tests purge temporary progress records and test entries to prevent cloud sync pollution.                                                                          |
| **AC-8.6** | UX / Safety    | Permanent deletion of briefs and playlists requires user confirmation to prevent accidental loss.                                                                            |
| **AC-8.7** | Performance    | Search filtering precomputes relevance scores once per item rather than recomputing inside sorting comparators.                                                              |

---

## 6. Non-Goals

- **External RSS Feed Crawler**: Background automatic crawling of arbitrary third-party RSS feeds is out of scope.
- **Public Community Brief Sharing**: Public brief social feeds or uncontrolled cross-user document reads are excluded; data access is strictly locked to the authenticated owner's sync file.
- **Binary Audio Storage in Sync Documents**: Raw audio blob binaries are NOT stored inside the sync document; audio streams and local audio files are cached in IndexedDB to preserve sync payload performance.
- **Real-Time Push Sync**: Live `onSnapshot`-style push listeners are out of scope; sync is event-driven (pull-on-login + push-on-mutation).

---

## 7. Bugs, Errors, and Defects Fixed

### 7.1 Backend, Server & API Security Defects

- **Model Alignment & Deprecated API Removal**: Updated `@google/genai` model aliases in `server.ts` to `gemini-2.5-flash` (summarization, extraction, search grounding) and `gemini-2.5-flash-preview-tts` (audio synthesis).
- **Server Port Isolation in Tests**: Guarded `startServer()` in `server.ts` to prevent automatic port binding on port 3000 during test execution (`NODE_ENV === "test"`).
- **SSRF Defense Vulnerability Fix**: Implemented strict HTTP/HTTPS protocol checks and blocked private RFC 1918/4193 IP ranges, loopback (`127.0.0.1`), and link-local addresses in `/api/articles/extract`.
- **JSON Parsing & Prompt Security**: Fixed markdown code block stripping and string escaping in `cleanAndParseJson` to prevent JSON syntax exceptions from LLM responses.
- **JWT & Auth Security**: Fixed token expiration validation (7-day validity) and sanitized error responses to prevent internal stack trace leakage.

### 7.2 State Engine, Memory Leak & Sync Defects

- **Sync Data-Loss Bug**: Resolved data overwrite bug in `syncWithServer` by eliminating premature local snapshotting and implementing atomic bi-directional merges between IndexedDB and the server sync document.
- **Article Deletion Memory Leak**: Purged deleted articles from user playlists and cleared invalid HTML Audio objects in `audioElementsCache`.
- **Stale Closure Race Conditions**: Converted `setPreferences` to a functional state updater to eliminate race conditions during rapid settings toggles.
- **Audio Speech Synthesis Fixes**: Fixed speech synthesis seeking, `playPrev` speech synth playback, and cleared sleep timer interval handles cleanly.
- **Error Banner Auto-Dismissal**: Added 6-second auto-dismissal (`clearPlaybackErrorLater`) for audio playback error banners.

### 7.3 Player, UI & Accessibility Defects

- **Audio Seek Slider Jitter**: Isolated slider drag state (`isDragging`, `dragPos`) in `PodcastPlayer.tsx` to prevent position jitter and haptic spam during scrubbing.
- **15-Second Skip Offset Calculation**: Fixed skip backward/forward calculations to evaluate relative to `activePos` rather than stale audio DOM timestamps.
- **Drag-and-Drop Filter Indexing Defect**: Fixed playlist reordering when search filters are active by mapping filtered indices back to original array indices.
- **Invalid Tailwind Classes**: Replaced non-existent Tailwind utility classes (`zinc-750`, `zinc-850`, `w-4.5`) with standard dark/light theme utilities across `HomeDashboard.tsx` and `ProfilePanel.tsx`.
- **Firefox HTML5 Drag Bug**: Added `e.dataTransfer.setData('text/plain', String(index))` in `QueuePanel.tsx` to ensure cross-browser drag support.
- **Strict Typing Hardening**: Replaced remaining `any` types in `IntakePanel.tsx` and `ProfilePanel.tsx` with explicit domain unions (`SummaryLength`, `SummaryTone`, `VoiceName`).
- **Null Safety in Search**: Added strict null and array guards to `tokenize`, `scoreArticle`, and `searchAndFilterArticles` in `src/utils/search.ts` to prevent `TypeError` exceptions.
- **Accessibility & Theme Contrast**: Updated expanded player overlay for seamless light/dark mode contrast and added `aria-label`, `role="dialog"`, and `aria-current="page"` across player buttons and navigation.
- **Adaptive Light/Dark Surface Contrast (DEF-22)**: Refactored `IntakePanel.tsx` and `PlaylistPanel.tsx` with white card surfaces (`bg-white dark:bg-zinc-900`) and dark text (`text-zinc-900 dark:text-white`) in light mode for crisp legibility and high contrast.
- **Color Standard Enforcement (DEF-23)**: Removed prohibited purple/indigo accents from `PodcastPlayer.tsx` and `HomeDashboard.tsx`, aligning with primary `emerald` brand palette.

### 7.4 Audit Report Resolutions & Production Hardening

- **Production Secret Management (TOKEN_SECRET)**: Configured mandatory `validateEnvironment()` startup check that halts server execution if `TOKEN_SECRET` is unset in production (`NODE_ENV === "production"`).
- **Startup Environment Validation**: Added startup validation for `GEMINI_API_KEY` presence and format warnings to fail fast before binding listeners.
- **API Rate Limiting Middleware**: Implemented sliding-window in-memory rate limiters (60 req/min global, 15 req/min AI routes) returning HTTP 429 when thresholds are exceeded.
- **Input Length Bounds Enforcement**: Added strict character limits across AI endpoints (`/api/articles/extract` url <= 2000 chars, `/api/articles/summarize` text <= 50,000 chars, `/api/articles/search-news` query <= 200 chars, `/api/articles/tts` text <= 10,000 chars).
- **Structured Error Logging & Observability**: Replaced raw `console.error` with a structured `logStructured` logger providing JSON timestamps, paths, status codes, and masked internal stack traces.
- **Auth Server Log Context**: Added server-side security warnings for invalid login attempts without leaking detailed error states to clients.
- **HTML Title & OpenGraph Metadata**: Replaced generic template title in `index.html` with `"CommuteBrief — Smart Commute Audio Briefings"` and complete OpenGraph meta tags.
- **Source Control Security (.gitignore)**: Added `data/` and `*.db` to `.gitignore` to prevent secret or user database leaks in git commits.
- **Rate Limiter Memory Sweep (DEF-21)**: Added periodic 10-minute cleanup sweep in `server.ts` to purge expired IP entries from `rateLimitStore` and prevent memory growth.

---

## 8. Verification Protocol

1. **Type Safety**: Run `npm run lint` (`tsc --noEmit`) to confirm zero compilation or type errors.
2. **Production Bundle**: Run `npm run build` to verify Vite and esbuild server bundler success.
3. **Runtime Verification**: Verify that port `3000` serves the SPA and Express backend proxy cleanly.
