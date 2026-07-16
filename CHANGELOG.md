# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-16

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

[1.1.0]: https://github.com/aistudio-build/commutenews/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aistudio-build/commutenews/releases/tag/v1.0.0
