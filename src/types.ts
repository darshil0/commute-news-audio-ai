/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SummaryLength = "short" | "medium" | "detailed";
export type SummaryTone = "professional" | "engaging" | "concise";
export type VoiceName = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
export type Theme = "dark" | "light";

export interface Article {
  readonly id: string;
  readonly title: string;
  readonly author?: string;
  readonly originalText?: string;
  readonly summary: string;
  readonly url?: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly voiceName: VoiceName;
  readonly duration?: number;
  readonly audioUrl?: string;
  readonly isDownloaded: boolean;
  readonly isSaved: boolean;
  readonly createdAt: string;
  readonly playCount: number;
}

export interface PlaybackProgress {
  readonly articleId: string;
  readonly position: number;
  readonly duration: number;
  readonly completed: boolean;
  readonly lastPlayed: string;
}

export interface Playlist {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly articleIds: readonly string[];
  readonly tags?: readonly string[];
  readonly createdAt: string;
}

export interface UserPreferences {
  readonly summaryLength: SummaryLength;
  readonly summaryTone: SummaryTone;
  readonly voiceName: VoiceName;
  readonly playbackSpeed: number;
  readonly theme: Theme;
}

export interface PlaybackState {
  readonly currentArticleId: string | null;
  readonly isPlaying: boolean;
  readonly queue: readonly string[];
  readonly speed: number;
  readonly sleepTimerDuration: number | null;
  readonly sleepTimerEndTimestamp: number | null;
  readonly playbackError: string | null;
}

export interface UserProfile {
  readonly username: string;
  readonly token: string;
}

export interface SyncData {
  readonly articles: readonly Article[];
  readonly playlists: readonly Playlist[];
  readonly progress: readonly PlaybackProgress[];
  readonly preferences: UserPreferences;
  readonly queue: readonly string[];
}
