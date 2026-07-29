/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------------------------
// Primitive / union types
// ---------------------------------------------------------------------------

/** Length variant for AI-generated article summaries. */
export type SummaryLength = "short" | "medium" | "detailed";

/** Tone variant for AI-generated article summaries. */
export type SummaryTone = "professional" | "engaging" | "concise";

/**
 * Available Gemini TTS voice names.
 * Each voice has a distinct narration style:
 * - `"Zephyr"` – Calm Narrator
 * - `"Kore"` – Energetic Host
 * - `"Charon"` – Mellow Storyteller
 * - `"Puck"` – Crisp Newsreader
 * - `"Fenrir"` – Bold Anchor
 */
export type VoiceName = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";

/** UI color theme. */
export type Theme = "dark" | "light";

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

/**
 * A single article record stored in IndexedDB and held in React state.
 * All fields are `readonly` to enforce immutable update patterns via
 * `setArticles` / `localDB.saveArticle`.
 */
export interface Article {
  /** Unique article identifier (UUID). */
  readonly id: string;
  /** Human-readable article title. */
  readonly title: string;
  /** Optional author name or byline. */
  readonly author?: string;
  /** Raw source text before AI summarization. */
  readonly originalText?: string;
  /** AI-generated structured summary used for TTS playback. */
  readonly summary: string;
  /** Original source URL, if the article was imported from a web page. */
  readonly url?: string;
  /** Content category label (e.g. "Technology", "Finance"). */
  readonly category: string;
  /** Searchable tag tokens associated with the article. */
  readonly tags: readonly string[];
  /** TTS voice profile assigned to this article. */
  readonly voiceName: VoiceName;
  /** Estimated audio playback duration in seconds, if known. */
  readonly duration?: number;
  /** Object URL or data URI pointing to the cached audio blob. */
  readonly audioUrl?: string;
  /** Whether the audio has been persisted in `audioStore` (IndexedDB). */
  readonly isDownloaded: boolean;
  /** Whether the article is bookmarked by the user. */
  readonly isSaved: boolean;
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** Number of times the article has been played to completion. */
  readonly playCount: number;
}

/**
 * Per-article listening progress record keyed by `articleId`.
 * Persisted in the `progress` IndexedDB object store.
 */
export interface PlaybackProgress {
  /** ID of the associated {@link Article}. */
  readonly articleId: string;
  /** Last known playback position in seconds. */
  readonly position: number;
  /** Total audio duration in seconds. */
  readonly duration: number;
  /** `true` if the article has been played to the end at least once. */
  readonly completed: boolean;
  /** ISO 8601 timestamp of the most recent play event. */
  readonly lastPlayed: string;
}

/**
 * A user-curated ordered collection of article IDs.
 * Persisted in the `playlists` IndexedDB object store.
 */
export interface Playlist {
  /** Unique playlist identifier (UUID). */
  readonly id: string;
  /** Display name of the playlist. */
  readonly name: string;
  /** Optional user-written description. */
  readonly description?: string;
  /** Ordered list of article IDs contained in this playlist. */
  readonly articleIds: readonly string[];
  /** Optional searchable tag tokens for the playlist. */
  readonly tags?: readonly string[];
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
}

/**
 * User-configurable playback and presentation preferences.
 * Persisted under the `"preferences"` key in the `settings` IndexedDB store
 * and synced to the Express backend via `/api/sync`.
 */
export interface UserPreferences {
  /** Target length for AI-generated summaries. */
  readonly summaryLength: SummaryLength;
  /** Writing tone for AI-generated summaries. */
  readonly summaryTone: SummaryTone;
  /** Default TTS voice profile for newly created articles. */
  readonly voiceName: VoiceName;
  /** Default audio playback speed multiplier (e.g. `1.0`, `1.5`, `2.0`). */
  readonly playbackSpeed: number;
  /** Active UI color theme. */
  readonly theme: Theme;
}

/**
 * Runtime playback state managed by {@link AppContext}.
 * Held in a React state variable and kept in sync with
 * `currentAudioRef` / `currentSpeechUtteranceRef` for immediate
 * hardware-level effect.
 */
export interface PlaybackState {
  /** ID of the currently active article, or `null` when idle. */
  readonly currentArticleId: string | null;
  /** `true` when audio is actively playing. */
  readonly isPlaying: boolean;
  /** Ordered queue of article IDs awaiting playback. */
  readonly queue: readonly string[];
  /** Current playback speed multiplier (range `0.5`–`2.0`). */
  readonly speed: number;
  /** Sleep timer duration in minutes, or `null` if not set. */
  readonly sleepTimerDuration: number | null;
  /** Unix epoch timestamp (ms) when the sleep timer expires, or `null`. */
  readonly sleepTimerEndTimestamp: number | null;
  /** Most recent playback error message, or `null` when error-free. */
  readonly playbackError: string | null;
  /**
   * Master audio gain level in the range `0.0` (muted) to `1.0` (full volume).
   * Applied directly to `HTMLAudioElement.volume` and
   * `SpeechSynthesisUtterance.volume` on every change.
   */
  readonly volume: number;
}

// ---------------------------------------------------------------------------
// Auth & sync models
// ---------------------------------------------------------------------------

/**
 * Authenticated user identity returned by `/api/auth/login` and
 * `/api/auth/register`. Persisted in `localStorage` for session resumption.
 */
export interface UserProfile {
  /** Validated lowercase username (regex `^[a-z0-9_-]{3,32}$`). */
  readonly username: string;
  /** JWT bearer token for authenticated `/api/sync` requests. */
  readonly token: string;
}

/**
 * Full application data snapshot transmitted to and from
 * `/api/sync/save` and `/api/sync/get`.
 * All arrays are `readonly` to prevent accidental mutation during serialization.
 */
export interface SyncData {
  readonly articles: readonly Article[];
  readonly playlists: readonly Playlist[];
  readonly progress: readonly PlaybackProgress[];
  readonly preferences: UserPreferences;
  readonly queue: readonly string[];
}
