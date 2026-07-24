# CommuteBrief Technical & Implementation Notes

This document provides a highly detailed overview of the application architecture, codebase layouts, data contracts, and local storage schemas. Use this as a reference when writing code or creating tests.

---

## 1. Architectural Topology

CommuteBrief is composed of:
1. **Frontend Core**:
   - Single-Page Application (SPA) driven by Vite, React, Tailwind CSS.
   - Entry point: `src/main.tsx` calling `src/App.tsx`.
   - Core state provider: `src/context/AppContext.tsx` managing synchronized context variables.
2. **Backend Engine**:
   - Express proxy in `server.ts` that acts as a proxy for Gemini content generation, HTML parsing, search fallbacks, and TTS voice generation.
   - Runs on port `3000`. In development, incorporates Vite development middleware.

---

## 2. Directory Layout

```
.
├── server.ts                       # Backend Express API and proxy logic
├── package.json                    # Configuration and dependencies
├── vite.config.ts                  # Client Vite compiler rules
├── tsconfig.json                   # TypeScript build rules
├── assets/                         # Static local assets
├── specs/                          # SDD Specs and Verification guidelines
│   ├── commute_brief_spec.md       # Core product specification
│   ├── sdd_workflow.md             # Spec-Driven Development guides
│   ├── implementation_notes.md     # Engineering & layout details
│   └── validation_checklist.md     # Pre-flight and post-flight checklists
└── src/                            # Frontend Source
    ├── main.tsx                    # React mount target
    ├── App.tsx                     # Core view routing structure
    ├── index.css                   # Custom styling tokens and scrollbars
    ├── types.ts                    # Immutable TS interfaces
    ├── components/                 # Panel components
    │   ├── HomeDashboard.tsx       # Saved feed list and categories
    │   ├── IntakePanel.tsx         # Add pasted text or website URL
    │   ├── PlaylistPanel.tsx       # Playlist manager and reordering
    │   ├── PodcastPlayer.tsx       # Interactive audio controller controls
    │   └── ProfilePanel.tsx        # Cloud backup, AI voices selection, & Test launcher
    ├── context/                    # React Context State
    │   └── AppContext.tsx          # Centralized data orchestration & sync locks
    └── lib/                        # Infrastructure layers
        ├── api.ts                  # Secure client-to-backend API wrappers
        └── db.ts                   # Local-first IndexedDB controller
```

---

## 3. Storage and Database (IndexedDB Schema)

To support offline listening, CommuteBrief leverages IndexedDB on the client through standard wrappers located in `src/lib/db.ts`.

### Stores and Schemas
1. **`articles`**: Store metadata of generated brief files.
   - Primary key: `id` (e.g. `art-1700000000000`)
   - Schema structure maps to the `Article` interface in `src/types.ts`.
2. **`audio`**: Stores binary voice recordings.
   - Primary key: `articleId` (matching article identifier).
   - Value: Base64-encoded string representing Wav or MP3 content.
3. **`playlists`**: Manages play lists.
   - Primary key: `id` (e.g. `play-1700000000000`)
   - Value: `Playlist` metadata.
4. **`progress`**: Captures resume positions.
   - Primary key: `articleId`
   - Value: `PlaybackProgress` metadata mapping position and completed state.
5. **`preferences`**: Stores user customization preferences.
   - Primary key: `config` (singleton)
   - Value: `UserPreferences`.
6. **`queue`**: Stores order list of active queues.
   - Primary key: `active_queue` (singleton)
   - Value: Array of article ID strings.

---

## 4. API Endpoints

### A. Authentication
- **`POST /api/auth/register`**: Registers a new user. Expects `username` and `password`. Returns JWT token.
- **`POST /api/auth/login`**: Sign-in, returning user profile token.

### B. Syncing & Backups
- **`POST /api/sync/save`**: Backs up a client snapshot of articles, playlists, preferences, progress, and queue. Expects `Authorization` Bearer token.
- **`GET /api/sync/get`**: Retrieves the backend backup snapshot.

### C. Gemini AI Wrappers
- **`POST /api/articles/extract`**:
  - Inputs: `url`, `preferences`.
  - Behavior: Fetches target webpage HTML, filters raw markup, prompts Google Gemini 3.5 Flash with search tools enabled, outputs structured JSON schema summary.
- **`POST /api/articles/summarize`**:
  - Inputs: `text`, `title`, `preferences`.
  - Behavior: Summarizes direct text input.
- **`POST /api/articles/tts`**:
  - Inputs: `text`, `voiceName`, `speed`.
  - Behavior: Generates high-quality base64 wav narration using the `gemini-3.1-flash-tts-preview` model.

---

## 5. Architectural Bug Fixes & Refinements

The following system design updates have been introduced to solve edge cases and polish the overall user experience:

1. **Deterministic Playback Speed Persistence**:
   - Web browsers (Chrome, Safari) frequently reset `audioElement.playbackRate` to `1.0` during audio resource initialization or inside `.play()` promises.
   - We address this by listening to `onplay` and `onplaying` events on the HTML Audio instance and reapplying the user's preferred speed rate.

2. **Haptic Pulse Sync & Overlap Prevention**:
   - Replaced duplicate haptic pulses during skips with coordinate handlers. When dragging tracks, we issue `25ms` haptic signals and suppress the standard `30ms` playback haptics during skip-driven triggers.
   - Restructured pause/resume triggers under `togglePlayPause` to issue exact specified vibrations (`20ms` for pause, `30ms` for resume) to conform to system specs.

3. **Cloud Sync Reconciliation Upgrade**:
   - Extended backend data merge handlers to properly reconcile `progress` tracking items and `queue` arrays without deleting or dropping bookmarks or current listening progress states.

4. **Interactive Scrubbing / Slider Seeking Stability**:
   - Introduced a local React `scrubValue` state inside `PodcastPlayer` to isolate current playback progress times while active dragging is occurring. This prevents the slider from jumping during audio playback and avoids rapid, continuous haptic triggers.

5. **Audio play() Interruption Protection**:
   - Silenced `AbortError` triggers in `playArticle` to prevent browser interrupt issues (caused by rapid pause/skips) from raising confusing error toasts to commuters.
