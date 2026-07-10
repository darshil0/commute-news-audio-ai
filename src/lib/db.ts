/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article, Playlist, PlaybackProgress, UserPreferences } from "../types";

const DB_NAME = "CommuteNewsDB";
const DB_VERSION = 1;

type SettingsKey = "preferences" | "queue";

type SettingsStoreShape = {
  preferences?: UserPreferences;
  queue?: string[];
};

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;

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

  private async getStore(
    storeName: "articles" | "playlists" | "progress" | "settings" | "audioStore",
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBObjectStore> {
    const db = await this.initDB();
    const tx = db.transaction(storeName, mode);
    tx.onerror = () => {
      tx.abort();
    };
    return tx.objectStore(storeName);
  }

  private async withStore<T>(
    storeName: "articles" | "playlists" | "progress" | "settings" | "audioStore",
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.initDB();

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = fn(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  }

  async getArticles(): Promise<Article[]> {
    try {
      return await this.withStore("articles", "readonly", (store) => store.getAll());
    } catch (err) {
      console.error("getArticles failed", err);
      return [];
    }
  }

  async saveArticle(article: Article): Promise<void> {
    await this.withStore("articles", "readwrite", (store) => store.put(article));
  }

  async deleteArticle(id: string): Promise<void> {
    await this.withStore("articles", "readwrite", (store) => store.delete(id));
    await this.deleteAudio(id);
  }

  async getPlaylists(): Promise<Playlist[]> {
    try {
      return await this.withStore("playlists", "readonly", (store) => store.getAll());
    } catch (err) {
      console.error("getPlaylists failed", err);
      return [];
    }
  }

  async savePlaylist(playlist: Playlist): Promise<void> {
    await this.withStore("playlists", "readwrite", (store) => store.put(playlist));
  }

  async deletePlaylist(id: string): Promise<void> {
    await this.withStore("playlists", "readwrite", (store) => store.delete(id));
  }

  async getProgress(): Promise<PlaybackProgress[]> {
    try {
      return await this.withStore("progress", "readonly", (store) => store.getAll());
    } catch (err) {
      console.error("getProgress failed", err);
      return [];
    }
  }

  async saveProgress(progress: PlaybackProgress): Promise<void> {
    await this.withStore("progress", "readwrite", (store) => store.put(progress));
  }

  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const prefs = await this.withStore<UserPreferences | undefined>(
        "settings",
        "readonly",
        (store) => store.get("preferences")
      );
      return prefs ?? null;
    } catch (err) {
      console.error("getPreferences failed", err);
      return null;
    }
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    await this.withStore("settings", "readwrite", (store) => store.put(prefs, "preferences"));
  }

  async getQueue(): Promise<string[]> {
    try {
      const queue = await this.withStore<string[] | undefined>(
        "settings",
        "readonly",
        (store) => store.get("queue")
      );
      return queue ?? [];
    } catch (err) {
      console.error("getQueue failed", err);
      return [];
    }
  }

  async saveQueue(queue: string[]): Promise<void> {
    await this.withStore("settings", "readwrite", (store) => store.put(queue, "queue"));
  }

  async getAudio(articleId: string): Promise<string | null> {
    try {
      const audio = await this.withStore<string | undefined>(
        "audioStore",
        "readonly",
        (store) => store.get(articleId)
      );
      return audio ?? null;
    } catch (err) {
      console.error("getAudio failed", err);
      return null;
    }
  }

  async saveAudio(articleId: string, audioBase64: string): Promise<void> {
    await this.withStore("audioStore", "readwrite", (store) => store.put(audioBase64, articleId));
  }

  async deleteAudio(articleId: string): Promise<void> {
    await this.withStore("audioStore", "readwrite", (store) => store.delete(articleId));
  }

  async clearAll(): Promise<void> {
    const db = await this.initDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["articles", "playlists", "progress", "settings", "audioStore"], "readwrite");
      tx.objectStore("articles").clear();
      tx.objectStore("playlists").clear();
      tx.objectStore("progress").clear();
      tx.objectStore("settings").clear();
      tx.objectStore("audioStore").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to clear IndexedDB"));
      tx.onabort = () => reject(tx.error ?? new Error("Clear transaction aborted"));
    });
  }
}

export const localDB = new LocalDatabase();
