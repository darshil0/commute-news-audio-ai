# IMPLEMENTATION_PLAN.md - SDD Implementation Plan & Roadmap

This document maps the **CommuteBrief / CommuteNews** codebase components to the requirements defined in `/specs/SYSTEM_SPEC.md` and outlines the Spec-Driven Development roadmap for future agent iterations.

---

## 🏛️ System Architecture Mapping

| Component / File | Purpose | Corresponding Spec Criteria |
|---|---|---|
| `server.ts` | Express backend proxy handling Gemini API summarization (`/api/summarize`, `/api/extract`) and TTS synthesis (`/api/tts`, `/api/tts-preview`). Handles robust JSON cleaning (`cleanAndParseJson`). | AC-1.1, AC-1.2, AC-2.2 |
| `src/context/AppContext.tsx` | Centralized React state management for articles, playback state, queue, playlists, user profile settings, and haptic triggers. Includes automatic fallback to `window.speechSynthesis`. | AC-3.1, AC-3.2, AC-4.1, AC-6.1, AC-6.2 |
| `src/components/PodcastPlayer.tsx` | Persistent audio player panel with expanded view, speed slider (`0.5x`-`2.0x`), quick presets, sleep timer, seek bar, and voice badge. | AC-3.1, AC-3.2 |
| `src/components/HomeDashboard.tsx` | Main briefing feed with tokenized search bar, category filter chips ("All", "Saved", "Downloaded"), audio card interactions, and queue management. | AC-5.1, AC-5.2 |
| `src/components/PlaylistPanel.tsx` | Playlist manager featuring creation, track reordering (HTML5 drag-and-drop), and inline search across playlists and briefs. | AC-4.1, AC-4.2, AC-5.1 |
| `src/components/IntakePanel.tsx` | Article submission interface supporting URL extraction, raw text input, and voice/summary customization. | AC-1.1, AC-1.2 |
| `src/components/ProfilePanel.tsx` | Settings & voice profile selector (Zephyr, Kore, Charon, Puck, Fenrir) with live audition preview capabilities. | AC-2.1, AC-2.2 |
| `src/utils/search.ts` | High-performance tokenized fuzzy search utility scoring article titles, categories, authors, tags, and summaries. | AC-5.1, AC-5.2 |
| `src/lib/db.ts` | IndexedDB client wrapper managing durable local persistence for articles, playlists, listening history, and playback progress. | AC-6.1 |
| `scripts/verify_and_prepare_push.sh` | Automated verification and Git push preparation script executing linting, compilation, git initialization, and staging. | AC-1 to AC-6 |

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
- [x] Create `/specs/SYSTEM_SPEC.md` defining purpose, scope, Firestore cloud sync technical architecture, acceptance criteria, non-goals, and validation protocols.
- [x] Create `/specs/IMPLEMENTATION_PLAN.md` mapping architecture to spec criteria.
- [x] Create `/specs/VALIDATION_CHECKLIST.md` providing a verification protocol for future agents.
- [x] Create `/scripts/verify_and_prepare_push.sh` executable asset for automated verification and Git setup.
- [x] Update `/README.md` to explain the SDD workflow to human developers and AI tools.

### Phase 4: Cloud Cross-Device Synchronization Architecture (Current Phase)
- [x] Formally define Firestore data models (`UserBrief`, `UserPlaylist`, `UserSettings`) in `/specs/SYSTEM_SPEC.md`.
- [x] Define Firestore ABAC Security Rules & access model in `/specs/SYSTEM_SPEC.md` for `/users/{userId}` path scope.
- [x] Outline offline-first bi-directional sync strategy (IndexedDB cache + Firestore `onSnapshot` listener reconciliation).

---

## 🔄 Agent Handoff Protocol

When a new task or issue is assigned:
1. **Check Spec**: Open `/specs/SYSTEM_SPEC.md` and verify if the requirement is defined.
2. **Update Spec First**: If changing existing behavior or adding a new feature, update `/specs/SYSTEM_SPEC.md` before making code changes.
3. **Execute & Test**: Implement changes incrementally and run verification (`npm run lint` and `npm run build`).
4. **Validate**: Perform checks against `/specs/VALIDATION_CHECKLIST.md`.
5. **Update Roadmap**: Mark completed tasks in this plan and update `CHANGELOG.md`.
