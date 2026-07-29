/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file src/lib/db.ts
 * @description IndexedDB persistence layer for CommuteBrief.
 *
 * Wraps the browser `indexedDB` API behind a clean async interface using
 * Promises. All reads gracefully return empty values on failure so the UI
 * degrades safely without crashing.
 *
 * ## Object Stores
 * | Store        | Key path      | Value type             |
 * |--------------|---------------|------------------------|
 * | `articles`   | `id`          | {@link Article}        |
 * | `playlists`  | `id`          | {@link Playlist}       |
 * | `progress`   | `articleId`   | {@link PlaybackProgress} |
 * | `settings`   | manual key    | preferences / queue    |
 * | `audioStore` | manual key    | base-64 audio string   |
 *
 * @singleton Exported as {@link localDB} — a single shared instance used
 * throughout the application.
 */

import { Article, Playlist, PlaybackProgress, UserPreferences } from "../types";

const DB_NAME = "CommuteNewsDB";
/** Increment when adding new object stores or indexes. */
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wraps an {@link IDBRequest} in a Promise, resolving with `request.result`
 * on success and rejecting with `request.error` on failure.
 * @template T - The expected type of `request.result`.
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

// ---------------------------------------------------------------------------
// LocalDatabase class
// ---------------------------------------------------------------------------

/**
 * Async IndexedDB wrapper providing CRUD operations for articles, playlists,
 * playback progress, user preferences, the play queue, and cached audio blobs.
 *
 * The database is opened lazily on the first call to any public method.
 * A single in-flight open promise is shared to prevent race conditions on
 * concurrent first-access calls.
 */
class LocalDatabase {
  /** The open {@link IDBDatabase} handle, or `null` before initialization. */
  private db: IDBDatabase | null = null;
  /**
   * In-flight promise returned by `indexedDB.open()`.
   * Shared across concurrent callers to avoid multiple parallel open calls.
   */
  private openPromise: Promise<IDBDatabase> | null = null;

  // -------------------------------------------------------------------------
  // Private infrastructure
  // -------------------------------------------------------------------------

  /**
   * Opens (or returns the cached) `IDBDatabase` handle.
   * Creates all required object stores on first run or after a version bump.
   * Handles `onversionchange` to cleanly close the database when another tab
   * triggers an upgrade.
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;

        if (!db.objectStoreNames.contains("articles")) {
          db.createObjectStore("articles", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("progress")) {
          db.createObjectStore("progress", { keyPath: "articleId" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        if (!db.objectStoreNames.contains("audioStore")) {
          db.createObjectStore("audioStore");
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.openPromise = null;
        };
        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(request.error ?? new Error("Error opening IndexedDB"));
      };

      request.onblocked = () => {
        reject(new Error("IndexedDB open request blocked by another tab."));
      };
    }).finally(() => {
      this.openPromise = null;
    });

    return this.openPromise;
  }

  /**
   * Opens a single-store transaction, executes `fn` against the store, and
   * resolves with the request result. Rejects on transaction error or abort.
   *
   * @template T - Expected result type of the IDBRequest returned by `fn`.
   * @param storeName - Target object store name.
   * @param mode - Transaction mode (`"readonly"` or `"readwrite"`).
   * @param fn - Callback that receives the {@link IDBObjectStore} and returns
   *   the `IDBRequest` to await.
   */
  private async withStore<T>(
    storeName:
      "articles" | "playlists" | "progress" | "settings" | "audioStore",
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.initDB();

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = fn(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB request failed"));
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  }

  // -------------------------------------------------------------------------
  // Articles
  // -------------------------------------------------------------------------

  /**
   * Returns all stored articles. Logs and returns `[]` on IndexedDB error
   * so the UI degrades gracefully.
   */
  async getArticles(): Promise<Article[]> {
    try {
      return await this.withStore("articles", "readonly", (store) =>
        store.getAll(),
      );
    } catch (err) {
      console.error("getArticles failed", err);
      return [];
    }
  }

  /**
   * Upserts an article record in the `articles` store.
   * @param article - The {@link Article} to insert or update.
   */
  async saveArticle(article: Article): Promise<void> {
    await this.withStore("articles", "readwrite", (store) =>
      store.put(article),
    );
  }

  /**
   * Deletes an article and its associated cached audio in one operation.
   * @param id - ID of the article to remove.
   */
  async deleteArticle(id: string): Promise<void> {
    await this.withStore("articles", "readwrite", (store) => store.delete(id));
    await this.deleteAudio(id);
  }

  // -------------------------------------------------------------------------
  // Playlists
  // -------------------------------------------------------------------------

  /**
   * Returns all stored playlists. Logs and returns `[]` on IndexedDB error.
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      return await this.withStore("playlists", "readonly", (store) =>
        store.getAll(),
      );
    } catch (err) {
      console.error("getPlaylists failed", err);
      return [];
    }
  }

  /**
   * Upserts a playlist record.
   * @param playlist - The {@link Playlist} to insert or update.
   */
  async savePlaylist(playlist: Playlist): Promise<void> {
    await this.withStore("playlists", "readwrite", (store) =>
      store.put(playlist),
    );
  }

  /**
   * Deletes a playlist record by ID.
   * @param id - ID of the playlist to remove.
   */
  async deletePlaylist(id: string): Promise<void> {
    await this.withStore("playlists", "readwrite", (store) => store.delete(id));
  }

  // -------------------------------------------------------------------------
  // Playback progress
  // -------------------------------------------------------------------------

  /**
   * Returns all stored playback progress records.
   * Logs and returns `[]` on IndexedDB error.
   */
  async getProgress(): Promise<PlaybackProgress[]> {
    try {
      return await this.withStore("progress", "readonly", (store) =>
        store.getAll(),
      );
    } catch (err) {
      console.error("getProgress failed", err);
      return [];
    }
  }

  /**
   * Upserts a playback progress record.
   * @param progress - The {@link PlaybackProgress} to insert or update.
   */
  async saveProgress(progress: PlaybackProgress): Promise<void> {
    await this.withStore("progress", "readwrite", (store) =>
      store.put(progress),
    );
  }

  /**
   * Deletes the progress record for a specific article.
   * @param articleId - ID of the article whose progress should be removed.
   */
  async deleteProgress(articleId: string): Promise<void> {
    await this.withStore("progress", "readwrite", (store) =>
      store.delete(articleId),
    );
  }

  // -------------------------------------------------------------------------
  // User preferences
  // -------------------------------------------------------------------------

  /**
   * Retrieves the stored user preferences from the `settings` store.
   * Returns `null` if no preferences have been saved yet or on error.
   */
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const prefs = await this.withStore<UserPreferences | undefined>(
        "settings",
        "readonly",
        (store) => store.get("preferences"),
      );
      return prefs ?? null;
    } catch (err) {
      console.error("getPreferences failed", err);
      return null;
    }
  }

  /**
   * Persists user preferences under the `"preferences"` key in the `settings`
   * store.
   * @param prefs - The {@link UserPreferences} object to save.
   */
  async savePreferences(prefs: UserPreferences): Promise<void> {
    await this.withStore("settings", "readwrite", (store) =>
      store.put(prefs, "preferences"),
    );
  }

  // -------------------------------------------------------------------------
  // Play queue
  // -------------------------------------------------------------------------

  /**
   * Retrieves the persisted play queue (ordered array of article IDs) from the
   * `settings` store. Returns `[]` if no queue has been saved yet or on error.
   */
  async getQueue(): Promise<string[]> {
    try {
      const queue = await this.withStore<string[] | undefined>(
        "settings",
        "readonly",
        (store) => store.get("queue"),
      );
      return queue ?? [];
    } catch (err) {
      console.error("getQueue failed", err);
      return [];
    }
  }

  /**
   * Persists the play queue under the `"queue"` key in the `settings` store.
   * @param queue - Ordered array of article IDs to persist.
   */
  async saveQueue(queue: string[]): Promise<void> {
    await this.withStore("settings", "readwrite", (store) =>
      store.put(queue, "queue"),
    );
  }

  // -------------------------------------------------------------------------
  // Audio cache
  // -------------------------------------------------------------------------

  /**
   * Retrieves the base-64 encoded MP3 audio string for an article from the
   * `audioStore`. Returns `null` if no audio has been cached or on error.
   * @param articleId - ID of the article whose audio to retrieve.
   */
  async getAudio(articleId: string): Promise<string | null> {
    try {
      const audio = await this.withStore<string | undefined>(
        "audioStore",
        "readonly",
        (store) => store.get(articleId),
      );
      return audio ?? null;
    } catch (err) {
      console.error("getAudio failed", err);
      return null;
    }
  }

  /**
   * Saves a base-64 encoded MP3 audio string for an article in `audioStore`.
   * @param articleId - ID of the article the audio belongs to.
   * @param audioBase64 - Base-64 encoded MP3 audio data.
   */
  async saveAudio(articleId: string, audioBase64: string): Promise<void> {
    await this.withStore("audioStore", "readwrite", (store) =>
      store.put(audioBase64, articleId),
    );
  }

  /**
   * Removes the cached audio for an article from `audioStore`.
   * Called automatically by {@link deleteArticle}.
   * @param articleId - ID of the article whose audio cache should be removed.
   */
  async deleteAudio(articleId: string): Promise<void> {
    await this.withStore("audioStore", "readwrite", (store) =>
      store.delete(articleId),
    );
  }

  // -------------------------------------------------------------------------
  // Nuclear option
  // -------------------------------------------------------------------------

  /**
   * Clears all data from every object store in a single transaction.
   * Used when the user logs out or requests a full data reset.
   *
   * @remarks Clears: `articles`, `playlists`, `progress`, `settings`,
   * `audioStore`.
   */
  async clearAll(): Promise<void> {
    const db = await this.initDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["articles", "playlists", "progress", "settings", "audioStore"],
        "readwrite",
      );
      tx.objectStore("articles").clear();
      tx.objectStore("playlists").clear();
      tx.objectStore("progress").clear();
      tx.objectStore("settings").clear();
      tx.objectStore("audioStore").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to clear IndexedDB"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Clear transaction aborted"));
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Shared {@link LocalDatabase} instance used throughout the application. */
export const localDB = new LocalDatabase();
