# CommuteBrief System Specification

This document serves as the absolute source of truth for the **CommuteBrief** application system specifications.

---

## 1. Purpose

CommuteBrief is a cross-platform, full-stack, single-page application (SPA) optimized for mobile and desktop commuters. It converts pasted text and news website URLs into highly readable, structured text summaries and generates natural-sounding audio script files. This enables hands-free consumption of written content during morning and evening commutes.

---

## 2. Scope

The system encompasses:
1. **Interactive Client Application (Vite + React + Tailwind CSS)**:
   - Modern, high-contrast dashboard with responsive tabs: Home/Dashboard, Queue, Playlists, New Intake, and Profile/Settings.
   - Robust offline-first database (`IndexedDB`) cache to store summaries, downloaded audio binary arrays, playback progress, and settings.
   - Dynamic audio player supporting smooth scrub seeking, play/pause, next/previous tracks, speed control slider (`0.5x` to `2.0x`), and speed presets.
   - Custom tactile vibration feedback via `navigator.vibrate` integrated with page changes, player interaction, and playback milestones.
   - Rich search and indexing utilities for finding locally saved briefings.

2. **Backend Proxy Server (Node.js + Express + Google Gemini API)**:
   - Gemini Summarization endpoint (`/api/articles/summarize`) returning structured summary scripts formatted in user-customized length and tone style.
   - Gemini HTML Extraction & Summarization endpoint (`/api/articles/extract`) performing web fetch and summarization with Google Search integration fallback.
   - Gemini Text-to-Speech (TTS) synthesizer proxy (`/api/articles/tts`) utilizing the `gemini-3.1-flash-tts-preview` model for streaming high-quality base64 wav/mp3 narrations.
   - User Registration, Login, and Session Token generation (`/api/auth/*`).
   - Secure server-backed backup sync endpoints (`/api/sync/*`) for storing playlists, preferences, and progress states.

---

## 3. Assumptions & Constraints

- **API Access**: The backend relies on a valid `GEMINI_API_KEY` to authenticate request pipelines with Google AI endpoints.
- **Connectivity State**: The client operates in a hybrid online/offline model. Users can digest downloaded summaries and audio offline, but require an active internet connection to generate new briefings or synchronize vault backups.
- **Hardware Fallback**: Vibrations and haptic signals require a device and browser environment supporting `navigator.vibrate`. Under nonsupported systems, these calls fail silently without breaking the UI flow.
- **No Direct Mutation**: React state transitions must operate with deep read-only state structures defined in domain typings to avoid stale pointer side-effects.

---

## 4. User Stories & Use Cases

### User Story A: "The Focused Driver"
> As a driver during my morning commute, I want to listen to a customized playlist of technology articles read by a calm narrator, so that I can consume technical journals safely and hands-free without looking at my screen.

### User Story B: "The Offline Subway Commuter"
> As an underground subway commuter, I want to download audio summaries of complex papers while at home, so that I can play them back smoothly with zero buffering when I lose cell reception.

### User Story C: "The Fast Reader"
> As a fast reader, I want to speed up my narrator audio to `1.5x` playback speed and use quick presets, so that I can get through daily news headlines in half the time.

---

## 5. Acceptance Criteria

### A. AI Summarization & Scripting Customization
- **Length Scaling**:
  - `short`: High-density executive brief of approximately 100 words.
  - `medium`: Balanced script of approximately 200 words.
  - `detailed`: Expanded script of 300 to 400 words with multiple bullet points.
- **Tone Translation**:
  - `engaging`: Storytelling podcast style using conversational and natural voice.
  - `professional`: Formal corporate newsletter and objective reporting style.
  - `concise`: Straight-to-the-point, high-density facts-only delivery.
- **Output Formats**: Must return strict JSON blocks matching:
  `{"title": "...", "author": "...", "summary": "..."}` or `{"title": "...", "summary": "..."}`.

### B. Narrator Voices & Live Preview
- **Voice Selection**: Must present exactly 5 distinct prebuilt AI narrator voices in settings:
  1. **Zephyr** (Calm Narrator - Neutral Deep)
  2. **Kore** (Energetic Host - Engaging Bright)
  3. **Charon** (Mellow Storyteller - Warm Relaxed)
  4. **Puck** (Crisp Newsreader - Articulate Clear)
  5. **Fenrir** (Bold Anchor - Strong Resonant)
- **Live Auditioning**: Clicking a preview icon or play button must request a real-time short greeting from the backend TTS endpoint and play it on the client without affecting current queue states.

### C. Advanced Audio Controls
- **Slider Fine-tuning**: Fluid slider supporting precise speeds from `0.5x` to `2.0x` in steps of `0.05x`.
- **Gesture Isolation**: Must wrap the slider with the `.no-swipe` utility wrapper to prevent swipe gestures from interrupting speed adjustment.
- **Presets**: Provide visible quick-tap presets matching: `0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, and `2.0x`.

### D. Tactile Haptic Feedback (Vibration)
- Must trigger specific millisecond pulses:
  - **Tab Switch**: Light tap (`15ms`).
  - **Audio Playing / Resumed**: Snappy pulse (`30ms`).
  - **Audio Paused**: Soft pulse (`20ms`).
  - **Track skips (Next/Prev)**: Balanced skip pulse (`25ms`).
  - **Speed changes / Seeking**: Soft tick (`15ms`).
  - **Summary Completed**: Triple-pulse heartbeat rhythm: `[40ms, 80ms, 40ms]`.

### E. Cloud Backup & Sync Reconciliation
- Syncing must be secure, authenticated via JWT/HMAC tokens, and automatically scheduled.
- Local state and database (IndexedDB) must merge seamlessly with remote records without duplicating or dropping items.

---

## 6. Non-Goals

- **Real-Time Speech-to-Text**: This app will not record human speech or transcribe mic input.
- **Multilingual Synthesis**: TTS voices are explicitly constrained to English voice models supplied by Google GenAI.
- **Social Sharing**: No direct social feed integrations (e.g., Twitter, Facebook sharing) are built in.

---

## 7. Validation Steps

- Verification of Gemini endpoints returning strict compliant JSON.
- Verification that all 5 voice profiles match technical identifiers on the backend.
- Ensuring `npm run lint` and `npm run build` finish successfully.
- Executing integrated automated tests through the Profile tab diagnostics launcher.
