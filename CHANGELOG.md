# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-07-25

### 🐛 Bugs, Errors, and Defects Fixed
- **Model Alignment & Server Port Isolation**:
  - Standardized backend Gemini API model references in `server.ts` to `gemini-2.5-flash` for article extraction/summarization and `gemini-2.5-flash-preview-tts` for Text-To-Speech synthesis.
  - Guarded `startServer()` in `server.ts` to prevent automatic port binding during automated test suite runs (`NODE_ENV === "test"`).
  - Sanitized backend error responses to prevent internal stack trace leakage and added token expiry handling (7-day validity).
  - Improved extraction and summarization prompts to prevent LLM hallucinations and handled JSON escaping securely.
- **AppContext Architectural & Memory Leak Fixes**:
  - Fixed `syncWithServer` data-loss bug by removing premature snapshotting and executing atomic local/server merges.
  - Resolved memory leak in `deleteArticle` by removing deleted articles from all user playlists and purging `audioElementsCache`.
  - Converted `setPreferences` into a pure state updater to avoid stale closure race conditions.
  - Fixed speech synthesis seeking, `playPrev` speech synth playback, and cleared sleep timer intervals cleanly.
- **PodcastPlayer & Audio Scrubbing Polish**:
  - Refactored progress seek slider in `PodcastPlayer.tsx` with dedicated `isDragging` and `dragPos` states to prevent playback jitter or haptic spam while dragging.
  - Fixed 15s skip logic to calculate offset relative to `activePos` preventing stale position jumps.
  - Added full volume control slider with UI state and adjusted HTML audio element volume dynamically.
  - Added accessibility dialog semantics (`role="dialog"`, `aria-label="Podcast player overlay"`) and Escape key listener to close the expanded overlay.
- **PlaylistPanel & HomeDashboard Refinements**:
  - Fixed drag-and-drop playlist reordering when filter queries are active by mapping filtered indices back to original playlist item indices.
  - Updated "Listen Now" button in `PlaylistPanel.tsx` to clear current queue and replace it with playlist articles before starting playback.
  - Added playlist details rename modal dialog allowing users to update playlist name and description dynamically.
  - Fixed `HomeDashboard.tsx` Continue Listening card light theme styling and raw seconds formatting (`Resume from Xm Ys`).
  - Added loading state skeleton UI in `HomeDashboard.tsx` during initial data load.
- **IntakePanel & Accessibility Polish**:
  - Updated `IntakePanel.tsx` mode switching to clear `successMsg` automatically and added fallback messages for empty grounded search sources.
  - Updated navigation buttons in `App.tsx` and `HomeDashboard.tsx` to replace `aria-pressed` with `aria-current="page"` and added proper `aria-label` attributes to icon buttons.
  - Updated modal dialogs across components with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and Escape key dismissal listeners.
- **Adaptive CSS Variables & Dark Mode Refactoring**:
  - Refactored `src/index.css` and Tailwind configurations to replace hardcoded dark mode colors with CSS custom properties (`--bg-primary`, `--bg-gradient-spot`, `--text-primary`, `--glass-bg`, `--glass-border`, `--scrollbar-track`, `--scrollbar-thumb`) defined on `:root` and `.dark`.
  - Configured `@custom-variant dark (&:where(.dark, .dark *));` in Tailwind v4 to ensure seamless theme toggling.
  - Updated global `body`, `.app-shell`, and `.glass-panel` styles to dynamically adapt based on the `.dark` class on the root `<html>` element.
- **Strict Typing & Spec Compliance Verification**:
  - Replaced remaining `any` type annotations in `IntakePanel.tsx` `onChange` handlers with explicit `React.ChangeEvent<HTMLSelectElement>` and typed enum values (`SummaryLength`, `SummaryTone`, `VoiceName`).
  - Removed `as any` type cast in `ProfilePanel.tsx` and fixed invalid Tailwind classes (`zinc-850`, `w-4.5`).
  - Fixed HTML5 drag-and-drop in `QueuePanel.tsx` for Firefox by setting explicit `e.dataTransfer.setData`, removed dead imports, and adapted hardcoded dark theme classes.
  - Replaced invalid Tailwind classes (`zinc-750`, `zinc-850`) in `HomeDashboard.tsx` with valid dark scale utilities and light theme fallbacks.
  - Added comprehensive `aria-label` accessibility attributes to all icon buttons in `PodcastPlayer.tsx` and updated expanded overlay styles for seamless light/dark theme adaptation.
  - Added strict null and type guards to `tokenize`, `scoreArticle`, and `searchAndFilterArticles` in `src/utils/search.ts` to prevent runtime `TypeError` exceptions.
  - Executed full linting (`npm run lint`) and production compilation (`npm run build`) passing with zero errors.
  - Verified 100% type safety (`tsc --noEmit`) and production bundling (`vite build && esbuild server.ts`).

## [1.5.0] - 2026-07-24

### Refactored & Code Quality Hardening
- **Strict Typing & Elimination of `any` Casts**:
  - Replaced raw `any` casts in `server.ts` with explicit internal types (`GroundingChunk`, `VoiceName`, `PartWithInlineData`).
  - Replaced `any` event handlers and preference casts in `IntakePanel.tsx` and `ProfilePanel.tsx` with strict TypeScript types (`SummaryLength`, `SummaryTone`, `VoiceName`).
  - Standardized error catching across async operations using `unknown` and a centralized `getErrorMessage` helper function.
- **Playback Error Auto-Dismissal Fix**:
  - Wired up `clearPlaybackErrorLater` in `AppContext.tsx` so audio playback and speech synthesis error banners auto-dismiss after 6 seconds and clean up active timers on unmount.
- **Refactoring & Execution Safety in AppContext**:
  - Introduced `playArticleRef` in `AppContext.tsx` to resolve circular execution dependencies between `togglePlayPause` and `playArticle`.
- **Dead Code & Unused Import Removal**:
  - Removed unused destructured parameters and variables in `server.ts` (`c`, `d`).
  - Cleaned up unused imports and state variables across `PodcastPlayer.tsx`, `PlaylistPanel.tsx`, `ProfilePanel.tsx`, `QueuePanel.tsx`, and `db.ts`.
  - Fixed regex escape syntax in `src/utils/search.ts`.

## [1.4.0] - 2026-07-24

### Fixed & Security Hardening
- **Path Traversal Vulnerability Fix**:
  - Enforced strict character allowlist (`/^[a-z0-9_-]{3,32}$/`) for username registration in `server.ts`.
  - Added strict path checking (`path.resolve(syncFile).startsWith(path.resolve(DATA_DIR))`) in `/api/sync/save` and `/api/sync/get` to eliminate path traversal risks.
- **Session Token Security**:
  - Documented `TOKEN_SECRET` in `.env.example` and added startup validation in `server.ts`.
- **SSRF Mitigation**:
  - Added URL scheme check (`http:`, `https:`) and host inspection (`isPrivateOrInternalHost`) to `/api/articles/extract` to block SSRF attempts against loopback, link-local, and RFC 1918/4193 private ranges.
- **IndexedDB Key Collision Fix**:
  - Upgraded article and playlist ID generation in `AppContext.tsx` from `Date.now()` to collision-resistant `crypto.randomUUID()`.
- **Diagnostic Cloud Sync Pollution Fix**:
  - Added `deleteProgress` method in `src/lib/db.ts` and updated `runDiagnostics` in `ProfilePanel.tsx` to purge temporary test articles and progress entries in a guaranteed `finally` block before cloud sync runs.
- **Destructive Action Safety**:
  - Added user confirmation prompts before deleting briefs in `HomeDashboard.tsx` and playlists in `PlaylistPanel.tsx`.
- **Search Scoring Performance Optimization**:
  - Optimized `searchAndFilterArticles` in `src/utils/search.ts` to compute relevance scores once per item prior to sorting, eliminating O(N log N) redundant tokenization cycles.
- **External Link Defense-in-Depth**:
  - Updated web citation links in `IntakePanel.tsx` to include `rel="noopener noreferrer"`.

## [1.3.0] - 2026-07-24

### Added
- **Gemini Search Grounding Integration in IntakePanel**:
  - Integrated `@google/genai` real-time Google Search Grounding (`{ tools: [{ googleSearch: {} }] }`) with model `gemini-3.6-flash`.
  - Created Express backend endpoint `/api/articles/search-news` returning real-time news summaries grounded by live web sources and citations.
  - Added "Live Search" tab to `IntakePanel` allowing users to query topics (e.g. SpaceX launches, EV battery breakthroughs, AI industry news) before generating audio summaries.
  - Displayed grounded search result cards with live web citations, source links, and instant "Add & Play Audio Now" / "Save to Briefs" actions.
  - Extended `AppContext` with `addGroundedArticle` helper method for saving grounded briefs with tags (`["Search Grounding", "Live News"]`) and source links.

## [1.2.0] - 2026-07-24

### Added
- **Spec-Driven Development (SDD) Framework**:
  - Introduced root `/AGENTS.md` specifying mandatory spec-first development workflows, port constraints, error handling, and agent handoff protocols.
  - Created `/specs/SYSTEM_SPEC.md` formally defining system purpose, scope, Firestore cloud cross-device sync technical architecture (`UserBrief`, `UserPlaylist`, `UserSettings`), ABAC security model, offline-first sync resolution strategies, acceptance criteria (AC-1 to AC-7), non-goals, and validation protocols.
  - Created `/specs/IMPLEMENTATION_PLAN.md` mapping system architecture components (`server.ts`, `AppContext.tsx`, `PodcastPlayer.tsx`, `search.ts`, `db.ts`) directly to specification criteria and tracking completion phases.
  - Created `/specs/VALIDATION_CHECKLIST.md` establishing a formal verification protocol for linting, compilation, feature acceptance criteria, and documentation consistency.
  - Created `/scripts/verify_and_prepare_push.sh` executable script asset for automated linting, compilation, Git repository initialization, and staging.
  - Updated `/README.md` with a dedicated SDD section explaining the workflow and referencing primary spec files.

## [1.1.0] - 2026-07-10

### Added
- **AI Narrator Voice Customization**:
  - Implemented 5 distinct voice profiles in the Profile/Settings panel:
    - **Calm Narrator (Zephyr)**: Deep, reassuring, and professional tone.
    - **Energetic Host (Kore)**: Bright and enthusiastic morning show feel.
    - **Mellow Storyteller (Charon)**: Relaxing, slow-paced flow.
    - **Crisp Newsreader (Puck)**: Sharp, articulation-heavy daily updates.
    - **Bold Anchor (Fenrir)**: Authoritative and powerful editorial voice.
  - Added **Live Voice Auditioning**: Users can preview each narrator voice live directly from the Profile screen. The system generates real-time audio clips from the server-side TTS engine.
- **Granular Playback Speed Control**:
  - Replaced the simple dropdown speed selection with a custom-styled fluid **Playback Speed Slider** supporting custom speeds ranging from `0.5x` to `2.0x` in fine increments of `0.05x`.
  - Added a responsive layout wrapper that isolates swipe gesture conflicts using the `.no-swipe` class wrapper.
  - Introduced **Quick Speed Presets** buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`) for rapid tempo tuning.
- **Tactile Haptic Feedback Integration**:
  - Integrated custom tactile haptic vibration triggers via `navigator.vibrate` (with modern fallback checks for browser and device support):
    - **Page Swipe & Tab Navigation**: Light tap vibration (`15ms`).
    - **Play / Resume Audio**: Reassuring single vibration (`30ms`).
    - **Pause Audio**: Snappy halt vibration (`20ms`).
    - **Track Skips (Previous/Next)**: Fluid double-vibration (`25ms`).
    - **Scrubbing/Seeking Position**: Immediate click tick (`15ms`).
    - **Playback Speed Change**: Micro feedback click (`15ms`).
    - **Audio Article Summary Completion**: Triple-pulse heartbeat rhythm (`[40ms, 80ms, 40ms]`) announcing successful playback completion.
- **System Documentation**:
  - Created a detailed `/README.md` clarifying application features, custom voice guides, haptic behavior specs, full-stack dev setup, and custom environment variable declarations.
- **Enhanced Fuzzy/Tokenized Search Engine (`src/utils/search.ts`)**:
  - Decoupled search indexing and fuzzy matching out of the view component into a high-performance utility.
  - Implemented tokenized, scored term matching (weighting titles, categories, tags, and authors higher than summaries) with exact-match multi-term bonuses to keep filtering fast and scale-resilient.

### Changed
- **Robust Immutability Design**:
  - Toughened `src/types.ts` data structures by replacing mutable properties with deep read-only identifiers (`readonly tags: readonly string[]`, `readonly articleIds: readonly string[]`, `readonly queue: readonly string[]`, etc.) to guarantee state purity and avoid unintended mutations.
- **Decoupled API Transport & Client Domain Schemas**:
  - Separated raw network payload interface shapes (`SummarizeResponse`, `TTSResponse`, `ApiErrorBody`) from persistent, reactive frontend business entities for smoother future-proof updates.
- **Optimized Theme Styling & CSS Tokens**:
  - Configured custom design tokens, Space Grotesk/Inter/JetBrains Mono typography pairings, deep high-contrast backdrop gradients, glassmorphism panel overlays, and thin, custom purple-accented scrollbars inside `src/index.css`.
- **Context Value Memoization**:
  - Wrapped the core state values in a optimized React `useMemo` dependency array inside `src/context/AppContext.tsx` to drastically reduce unnecessary deep re-renders across all consumer panels.

### Fixed
- **Hoisting & Temporal Dead Zone Errors**:
  - Fixed a block-scoped variable reference error in `src/context/AppContext.tsx` by setting up a persistent functional ref for `playNextInQueue` to avoid closure errors within audio event listeners before the function is fully initialized.
- **Centralized API Error & Transport Safety**:
  - Standardized JSON checking and request parsing into secure helper functions (`readJson`, `readMaybeJson`, `readErrorMessage`, `requestJson`).
  - Added network status validation using `isLikelyOnline` and verified content-type headers to prevent client-side parsing crashes on HTML-based fallback error pages.
  - Isolated network-level failures from server-side HTTP validation failures.
- **Stale React Closures & Ref-backed State Access**:
  - Transitioned critical runtime values (e.g. articles list, playback state, connection status, user profile) to synchronized refs to shield callbacks from stale closure states.
- **Thread-safe Synchronization Locking**:
  - Implemented an asynchronous locking mechanism (`syncInFlightRef` and `pendingSyncRef`) inside `AppContext` to queue overlapping backup operations and prevent sync race conditions.
  - Replaced interval-polling server backup attempts with a reactive, event-driven `scheduleSync` model.
- **Memory & Resource Leak Cleanups**:
  - Enforced rigorous cleanup on component unmount to cancel and clear all active intervals, timeouts, sleep timer instances, and paused audio elements.

---

## [1.0.0] - Initial Release

### Added
- Standard single-page application (SPA) architecture utilizing custom Express backend wrapper + Vite asset bundler on Port 3000.
- Intelligent commute intake dashboard with custom curation criteria and playlists.
- Queue management and article visual summaries.

[1.6.0]: https://github.com/aistudio-build/commutenews/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/aistudio-build/commutenews/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/aistudio-build/commutenews/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/aistudio-build/commutenews/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/aistudio-build/commutenews/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aistudio-build/commutenews/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aistudio-build/commutenews/releases/tag/v1.0.0
