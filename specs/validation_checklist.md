# CommuteBrief Validation & Verification Checklist

This document details the deterministic, reproducible checklists and tests required to ensure the CommuteBrief application is fully operational and correct.

---

## 1. Automated Verification Checks

Always run these commands in the terminal before committing any changes or handing off code.

### A. Code Style and Type Safety
Ensure there are no TypeScript compile-time errors:
```bash
npm run lint
```
*Verification criteria: Command exits with status code `0` and prints no compilation errors.*

### B. Production Compiler and Bundler
Verify that both client-side assets and backend bundles compile successfully:
```bash
npm run build
```
*Verification criteria: Creates a `dist/` folder containing built assets and compiles the backend into `dist/server.cjs`.*

### C. Custom Document and Links Verification
Run the Python doc validator to make sure there are no broken link references or unhandled placeholders:
```bash
python3 /home/jules/self_created_tools/doc_validator.py
```
*Verification criteria: Command exits with status code `0` and outputs success messages.*

---

## 2. Integrated Front-End Verification Checklist

Run the application locally via:
```bash
npm run dev
```
Open the browser at `http://localhost:3000` and manually confirm the following scenarios.

### Scenario A: Intake and AI Generation
1. Navigate to the **New Intake** tab.
2. Select **Paste News Text**.
3. Paste a block of text containing more than 50 characters, specify a title, and select a tone style.
4. Click **Generate Audio Commute Summary**.
5. Verify that the loading indicator triggers, Gemini processes the summarization, and a success message appears.
6. Verify that the new brief appears at the top of the **Home/Dashboard** panel.

### Scenario B: AI Voice Preview & Configuration
1. Navigate to the **Profile** tab.
2. Find the **AI Narrator Voice Settings** card.
3. Tap the play/pause preview icon on the right side of **Calm Narrator (Zephyr)**.
4. Verify that the loading spinner rotates, TTS audio generates, and Zephyr's greeting plays successfully through your speaker.
5. Tap the preview icon again during playback to verify that audio stops immediately.
6. Switch your preferred voice narrator to **Energetic Host (Kore)**.
7. Verify that the local radio toggle shifts and updates your default preferences.

### Scenario C: Adaptive Player & Speeds
1. Select any briefing from the Home panel to start playback.
2. Verify that the bottom **Podcast Player** triggers, playing synthesized voice briefs.
3. Click and slide the custom Playback Speed Slider.
4. Verify that the narration rate changes smoothly (from `0.5x` up to `2.0x`).
5. Tap a quick-tap speed preset (e.g., `1.5x`).
6. Verify that the speed indicator matches `1.5x` immediately.

### Scenario D: Diagnostics Launcher
1. Navigate to the **Profile** tab.
2. Scroll to the bottom card: **CommuteNews Test & Diagnostics Suite**.
3. Click **Run Automated Test Diagnostics**.
4. Verify that the console log stream prints, verifying IndexedDB read/write, audio downloads caching, playback position trackers, and cloud connection checks.
5. Confirm that the final message is: `🎉 All core application integration tests PASSED successfully!`.
