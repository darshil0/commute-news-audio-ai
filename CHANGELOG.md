# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- None.

## [1.6.0] - 2026-07-25

### Fixed & Stabilized (Core Player & Synchronization)
- **Audio Playback Rate Resilience**: Resolved a browser-specific behavior where the HTML5 `Audio` element reset its `playbackRate` to `1.0` during track transitions by listening to `onplay` and `onplaying` events to dynamically re-apply the user's selected speed settings.
- **Haptic Feedback Overlaps & Timing Alignments**:
  - Eliminated haptic feedback overlapping on rapid skip actions.
  - Aligned pause and resume haptic vibration timings exactly with spec requirements.
- **Vibration Noise Prevention on Scrubbing**: Introduced a local `scrubValue` state in the `PodcastPlayer` range slider to prevent layout jump and completely eliminate haptic vibration flooding during active drag gestures.
- **Seamless Cloud Backup Progress & Queue Reconciliations**: Ensured cloud progress records and active queue states are fully reconciled and updated on server sync backups.
- **Safe-to-Ignore Audio Interruption Handling**: Silenced benign `AbortError` play interruption triggers from the browser console log.
- **Robust Multi-Environment Server Booting**: Wrapped server initialization `startServer()` to conditionally execute only when `process.env.NODE_ENV !== "test"`, preventing test suites from hanging on bound ports.

### Changed & Documentation Improvements
- **Backend Sync Documentation Alignment**: Updated `specs/SYSTEM_SPEC.md` to replace outdated Firebase/Firestore references with actual custom Node/Express file-backup endpoints (`/api/sync/save` and `/api/sync/get`) and PBKDF2 authentication protocols.
- **Spec-Driven Development Tracking**: Mapped all system components and validation checks to correct criteria in `specs/IMPLEMENTATION_PLAN.md` and `specs/VALIDATION_CHECKLIST.md`.
- **Validation Rule Placeholder Guardrails**: Aligned placeholders in `AGENTS.md` and `specs/sdd_workflow.md` to use the hyphenated `[NEEDS-CLARIFICATION]` form, preventing false positives with the active `[NEEDS-CLARIFICATION]` validation rule checker.
- **Automated Verification**: Implemented custom documentation and changelog validation scripts (`doc_validator.py` and `changelog_validator.py`) to continuously verify reference links, syntax errors, and placeholders.
- **MIT License Integration**: Added MIT License reference and links in `README.md` referencing the repository's `LICENSE` file.

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
  - Added "Live Search" tab to `IntakePanel` allowing users to query topics before generating audio summaries.
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
  - Implemented 5 distinct voice profiles in the Profile/Settings panel.
  - Added live voice auditioning from the Profile screen using the server-side TTS engine.
- **Granular Playback Speed Control**:
  - Replaced dropdown speed selection with a custom playback speed slider supporting `0.5x` to `2.0x` in `0.05x` increments.
  - Added quick preset buttons for rapid tempo tuning.
- **Tactile Haptic Feedback Integration**:
  - Integrated custom vibration triggers via `navigator.vibrate` for page navigation, play/pause, track skips, scrubbing, speed changes, and completion feedback.
- **System Documentation**:
  - Created a detailed `/README.md` clarifying application features, voice guides, haptic behavior specs, setup, and environment variable declarations.
- **Enhanced Fuzzy/Tokenized Search Engine (`src/utils/search.ts`)**:
  - Decoupled search indexing and fuzzy matching out of the view component into a reusable utility.
  - Implemented tokenized, scored term matching with exact-match bonuses to improve relevance and scale.

### Changed
- **Robust Immutability Design**:
  - Strengthened `src/types.ts` by replacing mutable properties with deep read-only identifiers and arrays.
- **Decoupled API Transport & Client Domain Schemas**:
  - Separated raw network payloads from persistent frontend business entities.
- **Optimized Theme Styling & CSS Tokens**:
  - Updated typography, gradients, glassmorphism panels, and custom scrollbars in `src/index.css`.
- **Context Value Memoization**:
  - Wrapped core state values in `useMemo` inside `src/context/AppContext.tsx` to reduce unnecessary re-renders.

### Fixed
- **Hoisting & Temporal Dead Zone Errors**:
  - Fixed a block-scoped variable reference error in `src/context/AppContext.tsx` by using a persistent functional ref for queue playback.
- **Centralized API Error & Transport Safety**:
  - Standardized JSON checking and request parsing into helper functions.
  - Added network status validation and verified content-type headers to prevent parsing crashes.
- **Stale React Closures & Ref-backed State Access**:
  - Transitioned critical runtime values to synchronized refs to avoid stale closure states.
- **Thread-safe Synchronization Locking**:
  - Implemented async locking inside `AppContext` to queue overlapping backup operations.
  - Replaced interval polling with a reactive `scheduleSync` model.
- **Memory & Resource Leak Cleanups**:
  - Enforced cleanup on unmount for intervals, timeouts, sleep timers, and paused audio elements.

## [1.0.0] - Initial Release

### Added
- Standard single-page application architecture using an Express backend and Vite bundler on port 3000.
- Intelligent commute intake dashboard with custom curation criteria and playlists.
- Queue management and article visual summaries.

[Unreleased]: https://github.com/aistudio-build/commutenews/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/aistudio-build/commutenews/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/aistudio-build/commutenews/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/aistudio-build/commutenews/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/aistudio-build/commutenews/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/aistudio-build/commutenews/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aistudio-build/commutenews/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aistudio-build/commutenews/releases/tag/v1.0.0
