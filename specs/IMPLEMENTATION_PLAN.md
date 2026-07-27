# IMPLEMENTATION_PLAN.md - SDD Implementation Plan & Roadmap

This document maps the **CommuteBrief / CommuteNews** codebase components to the requirements defined in `/specs/SYSTEM_SPEC.md` and outlines the Spec-Driven Development roadmap for future agent iterations.

---

## 🏛️ System Architecture Mapping

| Component / File                     | Purpose                                                                                                                                                                                            | Corresponding Spec Criteria            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `server.ts`                          | Express backend proxy handling Gemini API summarization (`/api/summarize`, `/api/extract`), TTS synthesis (`/api/tts`), auth (`/api/auth`), and sync storage (`/api/sync/save`, `/api/sync/get`). | AC-1.1, AC-1.2, AC-2.2, AC-7.1 - AC-7.4 |
| `src/context/AppContext.tsx`         | Centralized React state management for articles, playback state, queue, playlists, user profile settings, and haptic triggers. Integrates `syncWithServer()` with local IndexedDB.                   | AC-3.1, AC-3.2, AC-4.1, AC-6.1, AC-7.1 - AC-7.3 |
| `src/lib/api.ts`                     | Client API service wrapper communicating with Express authentication and sync endpoints (`backupData`, `getBackupData`).                                                                           | AC-7.1, AC-7.2, AC-7.3                 |
| `src/components/PodcastPlayer.tsx`   | Persistent audio player panel with expanded view, speed slider (`0.5x`-`2.0x`), quick presets, sleep timer, seek bar, and voice badge.                                                             | AC-3.1, AC-3.2                         |
| `src/components/HomeDashboard.tsx`   | Main briefing feed with tokenized search bar, category filter chips ("All", "Saved", "Downloaded"), audio card interactions, and queue management.                                                 | AC-5.1, AC-5.2                         |
| `src/components/PlaylistPanel.tsx`   | Playlist manager featuring creation, track reordering (HTML5 drag-and-drop), and inline search across playlists and briefs.                                                                        | AC-4.1, AC-4.2, AC-5.1                 |
| `src/components/IntakePanel.tsx`     | Article submission interface supporting URL extraction, raw text input, Gemini Search Grounding real-time news search, grounded web sources preview, and voice/summary customization.              | AC-1.1, AC-1.2, AC-1.3                 |
| `src/components/ProfilePanel.tsx`    | Settings & voice profile selector (Zephyr, Kore, Charon, Puck, Fenrir) with live audition preview capabilities.                                                                                    | AC-2.1, AC-2.2                         |
| `src/utils/search.ts`                | High-performance tokenized fuzzy search utility scoring article titles, categories, authors, tags, and summaries.                                                                                  | AC-5.1, AC-5.2                         |
| `src/lib/db.ts`                      | IndexedDB client wrapper managing durable local persistence for articles, playlists, listening history, and playback progress.                                                                     | AC-6.1, AC-7.2                         |
| `scripts/verify_and_prepare_push.sh` | Automated verification and Git push preparation script executing linting, compilation, git initialization, and staging.                                                                            | AC-1 to AC-7                           |

---

## 🚀 SDD Implementation Roadmap

### Phase 1: Core Foundation & Spec Alignment (Completed)

- [x] Full-stack Node/Express + Vite architecture setup on Port `3000`.
- [x] Gemini API integration for text summarization and TTS voice synthesis.
- [x] Local IndexedDB persistence engine (`src/lib/db.ts`).
- [x] Web Speech API (`window.speechSynthesis`) fallback for offline playback.

### Phase 2: Enhanced User Experience & Search (Completed)

- [x] Custom Playback Speed Slider (`0.5x` to `2.0x`) with quick presets.
- [x] AI Narrator Voice Customization with live audition previews in Profile Panel.
- [x] Tokenized fuzzy search utility in Home Dashboard and Playlist Panel.
- [x] System-wide haptic feedback (`navigator.vibrate`) integration.

### Phase 3: SDD Documentation & Verification Assets (Completed)

- [x] Audit repository documentation and eliminate spec conflicts.
- [x] Create root `/AGENTS.md` specifying Spec-Driven Development rules.
- [x] Create `/specs/SYSTEM_SPEC.md` defining purpose, scope, Express JWT cross-device sync architecture, acceptance criteria, non-goals, and validation protocols.
- [x] Create `/specs/IMPLEMENTATION_PLAN.md` mapping architecture to spec criteria.
- [x] Create `/specs/VALIDATION_CHECKLIST.md` providing a verification protocol for future agents.
- [x] Create `/scripts/verify_and_prepare_push.sh` executable asset for automated verification and Git setup.
- [x] Update `/README.md` to explain the SDD workflow to human developers and AI tools.

### Phase 4: Express Cross-Device Synchronization Architecture (Completed)

- [x] Formally define `SyncData` payload schema (`Article`, `Playlist`, `UserPreferences`) in `/specs/SYSTEM_SPEC.md`.
- [x] Define Express JWT security model & username allowlist in `/specs/SYSTEM_SPEC.md` for `/api/sync/save` and `/api/sync/get` endpoints.
- [x] Outline offline-first bi-directional sync strategy (IndexedDB cache + Express server JSON backup reconciliation).

### Phase 5: Gemini Search Grounding Integration (Completed)

- [x] Integrate `@google/genai` Search Grounding (`{ tools: [{ googleSearch: {} }] }`) with model `gemini-2.5-flash`.
- [x] Add server API endpoint `/api/articles/search-news` returning grounded news summaries and citations/sources.
- [x] Extend `IntakePanel` with a dedicated "Live Search" tab for searching real-time news articles and topics.
- [x] Render grounded search summaries with source URL links and one-click "Add & Play Audio Now" / "Save to Briefs" actions.

### Phase 6: Security, SSRF, & Data Integrity Hardening (Completed)

- [x] Enforce strict username allowlist (`/^[a-z0-9_-]{3,32}$/`) in registration and sync handlers to eliminate path traversal vulnerabilities.
- [x] Enforce and document `TOKEN_SECRET` in `.env.example` and server startup checks for token signature security.
- [x] Implement SSRF guard in `/api/articles/extract` blocking non-HTTP/HTTPS schemes, private RFC 1918/4193 IP ranges, loopback, and link-local addresses.
- [x] Upgrade article and playlist creation in `AppContext.tsx` to use collision-resistant UUIDs (`crypto.randomUUID()`).
- [x] Add `deleteProgress` in `db.ts` and clean up diagnostic test entries in `ProfilePanel.tsx` to prevent cloud sync pollution.
- [x] Add user confirmation prompts on brief and playlist deletion in `HomeDashboard.tsx` and `PlaylistPanel.tsx`.
- [x] Optimize search scoring in `src/utils/search.ts` by precomputing scores once per item prior to sorting.
- [x] Harden external link attributes in `IntakePanel.tsx` with `rel="noopener noreferrer"`.

### Phase 7: Code Quality, Refactoring & Strict Typing Hardening (Completed)

- [x] Eliminate raw `any` types across `server.ts`, `IntakePanel.tsx`, and `ProfilePanel.tsx` with explicit domain interfaces (`SummaryLength`, `SummaryTone`, `VoiceName`, `GroundingChunk`, `PartWithInlineData`).
- [x] Standardize error handling in UI panels using `unknown` and `getErrorMessage` helper function.
- [x] Wire up `clearPlaybackErrorLater` in `AppContext.tsx` for 6-second auto-dismissal of playback error banners.
- [x] Refactor `AppContext.tsx` using `playArticleRef` to break circular dependency and hoisting fragility between `togglePlayPause` and `playArticle`.
- [x] Clean up unused imports, dead code, and unused function arguments across `server.ts`, `PodcastPlayer.tsx`, `PlaylistPanel.tsx`, `ProfilePanel.tsx`, `QueuePanel.tsx`, and `db.ts`.
- [x] Fix character class regex escape syntax in `src/utils/search.ts`.

### Phase 8: Theme Awareness & Prohibited Color Policy Refactor (Completed)

- [x] Refactor `IntakePanel.tsx` with complete light and dark theme awareness for all mode tabs, inputs, selects, cards, and grounded search citation previews.
- [x] Refactor `PlaylistPanel.tsx` with full theme adaptation across headers, search inputs, playlist cards, cover banners, track items, and creation/rename modal dialogs.
- [x] Remove prohibited `purple` and `indigo` Tailwind utility classes across `PodcastPlayer.tsx` and `HomeDashboard.tsx`, standardizing on `emerald` accents.
- [x] Polish navigation inactive button contrast in `App.tsx` and `HomeDashboard.tsx` for optimal readability in light theme.

---

## 🐛 Bugs, Errors, and Defects Fixed Thus Far

| Defect ID  | Category          | Description & Fix Summary                                                                                                                                                                                       | Impact   |
| ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **DEF-1**  | Server / Security | Express extraction endpoint `/api/articles/extract` lacked SSRF safeguards. Added scheme checks (HTTP/HTTPS only) and blocked private IP blocks (RFC 1918/4193), loopback (`127.0.0.1`), and link-local ranges. | High     |
| **DEF-2**  | Server / Model    | Deprecated model aliases broke Gemini API integration. Updated server endpoints to use `@google/genai` with `gemini-2.5-flash` and `gemini-2.5-flash-preview-tts`.                                              | High     |
| **DEF-3**  | Server / Testing  | Server auto-bound to port 3000 during test suite execution. Added `NODE_ENV === "test"` guard to `startServer()`.                                                                                               | Medium   |
| **DEF-4**  | State / Sync      | `syncWithServer` wiped unsynced local data due to premature snapshotting. Implemented atomic bi-directional merges between IndexedDB and Express `/api/sync` backend storage. | High     |
| **DEF-5**  | State / Memory    | `deleteArticle` failed to purge deleted articles from user playlists and left stale `HTMLAudioElement` objects in `audioElementsCache`. Added automatic playlist cleaning and audio element eviction.           | Medium   |
| **DEF-6**  | Player / UI       | `PodcastPlayer` seek slider scrubbed erratically due to active audio position state updates during drag. Added `isDragging` and `dragPos` state separation.                                                     | Medium   |
| **DEF-7**  | Player / Logic    | 15s skip backward/forward calculated offsets from stale audio element `currentTime`. Updated calculation to evaluate against `activePos`.                                                                       | Low      |
| **DEF-8**  | Playlists / Drag  | HTML5 drag-and-drop playlist reordering mapped to wrong items when a search query was active. Mapped filtered drag indices back to original array indices.                                                      | Medium   |
| **DEF-9**  | Browser / Drag    | Drag-and-drop failed in Firefox due to missing dataTransfer payload. Added `e.dataTransfer.setData('text/plain', String(index))`.                                                                               | Medium   |
| **DEF-10** | Styling / CSS     | Invalid non-existent Tailwind CSS utilities (`zinc-750`, `zinc-850`, `w-4.5`) broke light/dark mode contrast. Replaced with standard Tailwind scale classes.                                                    | Low      |
| **DEF-11** | Search / Guard    | `tokenize`, `scoreArticle`, and `searchAndFilterArticles` crashed on undefined/null input. Added strict null, type, and array guards in `src/utils/search.ts`.                                                  | Medium   |
| **DEF-12** | Accessibility     | Missing button labels and dialog attributes in player overlay. Added `aria-label`, `role="dialog"`, `aria-current="page"`, and Escape key listener.                                                             | Low      |
| **DEF-13** | Server / Security | Production secret `TOKEN_SECRET` missing validation. Added `validateEnvironment()` startup check to halt execution if `TOKEN_SECRET` is unset in production.                                                    | Critical |
| **DEF-14** | Server / Config   | `GEMINI_API_KEY` validation occurred on first API request instead of startup. Added startup environment checks and format verification.                                                                         | High     |
| **DEF-15** | Server / DoS      | API routes lacked rate limiting protection. Created in-memory sliding-window rate limiters (60 req/min global, 15 req/min AI routes).                                                                           | High     |
| **DEF-16** | Server / DoS      | AI endpoints lacked payload length bounds. Added length checks (`/api/articles/summarize` <= 50,000 chars, `/api/articles/search-news` <= 200 chars, `/api/articles/tts` <= 10,000 chars).                      | High     |
| **DEF-17** | Server / Logging  | Unstructured console error logging lost context. Implemented `logStructured` for JSON formatted logs with timestamps, levels, paths, status codes, and stack trace masking.                                     | Medium   |
| **DEF-18** | Server / Security | Login failure error states leaked information. Added server-side warning logs for failed auth while returning generic client errors.                                                                            | Medium   |
| **DEF-19** | HTML / Branding   | `index.html` title tag contained generic default title. Updated to `CommuteBrief — Smart Commute Audio Briefings` with OpenGraph meta tags.                                                                     | High     |
| **DEF-20** | Git / Security    | `.gitignore` lacked explicit data directory rules. Added `data/` and `*.db` to `.gitignore` to prevent database secret leaks.                                                                                   | High     |
| **DEF-21** | Server / Memory   | In-memory sliding window rate limiter (`rateLimitStore`) accumulated empty keys indefinitely over time. Added periodic 10-minute cleanup sweep to purge stale keys.                                             | Low      |
| **DEF-22** | UI / Theme        | `IntakePanel` and `PlaylistPanel` hardcoded dark mode utility classes (`bg-zinc-900`, `text-white`), causing unreadable low-contrast elements when user switched to light theme. Added adaptive light/dark classes. | High     |
| **DEF-23** | Styling / Color   | `PodcastPlayer` and `HomeDashboard` contained prohibited purple/indigo accent colors violating project standards. Replaced with `emerald` primary accent. | Medium   |
| **DEF-24** | State / Hoisting  | `AppContext.tsx` contained circular reference/hoisting fragility between `togglePlayPause` and `playArticle`. Fixed using `playArticleRef` mutable ref pattern. | Medium   |
| **DEF-25** | Codebase / Clean  | Unused types (`SettingsKey`, `SettingsStoreShape`), unused `getStore` method in `db.ts`, and unused icon/variable imports across components produced lint noise. Purged all dead code and unused imports. | Low      |

---

## 🔄 Agent Handoff Protocol

When a new task or issue is assigned:

1. **Check Spec**: Open `/specs/SYSTEM_SPEC.md` and verify if the requirement is defined.
2. **Update Spec First**: If changing existing behavior or adding a new feature, update `/specs/SYSTEM_SPEC.md` before making code changes.
3. **Execute & Test**: Implement changes incrementally and run verification (`npm run lint` and `npm run build`).
4. **Validate**: Perform checks against `/specs/VALIDATION_CHECKLIST.md`.
5. **Update Roadmap**: Mark completed tasks in this plan and update `CHANGELOG.md`.
