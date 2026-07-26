/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Article,
  Playlist,
  PlaybackProgress,
  UserPreferences,
  PlaybackState,
  UserProfile,
  SyncData,
} from "../types";
import { localDB } from "../lib/db";
import { ApiService } from "../lib/api";

interface AppContextProps {
  articles: Article[];
  playlists: Playlist[];
  progress: PlaybackProgress[];
  preferences: UserPreferences;
  playbackState: PlaybackState;
  userProfile: UserProfile | null;
  isOnline: boolean;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  registerUser: (u: string, p: string) => Promise<void>;
  loginUser: (u: string, p: string) => Promise<void>;
  logoutUser: () => Promise<void>;

  addArticleText: (title: string, text: string) => Promise<void>;
  importArticleUrl: (url: string) => Promise<void>;
  addGroundedArticle: (title: string, category: string, summary: string, sourceUrl?: string) => Promise<Article>;
  deleteArticle: (id: string) => Promise<void>;
  downloadArticleAudio: (id: string) => Promise<void>;
  toggleSaveArticle: (id: string) => Promise<void>;

  createPlaylist: (name: string, description?: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  updatePlaylistDetails: (playlistId: string, name: string, description?: string) => Promise<void>;
  addArticleToPlaylist: (playlistId: string, articleId: string) => Promise<void>;
  removeArticleFromPlaylist: (playlistId: string, articleId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, startIndex: number, endIndex: number) => Promise<void>;

  playArticle: (id: string) => Promise<void>;
  togglePlayPause: () => void;
  playNextInQueue: () => void;
  playPrev: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  updatePlaybackPosition: (seconds: number) => void;
  addToQueue: (id: string) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  clearPlaybackError: () => void;

  setPreferences: (prefs: Partial<UserPreferences>) => void;
  syncWithServer: () => Promise<void>;
  analyticsEvent: (category: string, action: string, label?: string) => void;
  triggerHaptic: (pattern: number | number[]) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const audioElementsCache: Record<string, HTMLAudioElement> = {};

const DEFAULT_PREFERENCES: UserPreferences = {
  summaryLength: "medium",
  summaryTone: "engaging",
  voiceName: "Zephyr",
  playbackSpeed: 1.0,
  theme: "dark",
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [progress, setProgress] = useState<PlaybackProgress[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [preferences, setLocalPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentArticleId: null,
    isPlaying: false,
    queue: [],
    speed: 1.0,
    sleepTimerDuration: null,
    sleepTimerEndTimestamp: null,
    playbackError: null,
  });

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeechSynthesisActiveRef = useRef(false);
  const currentSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playNextInQueueRef = useRef<() => void>(() => {});
  const sleepTimerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playbackStateRef = useRef(playbackState);
  const articlesRef = useRef(articles);
  const playlistsRef = useRef(playlists);
  const progressRef = useRef(progress);
  const preferencesRef = useRef(preferences);
  const userProfileRef = useRef(userProfile);
  const isOnlineRef = useRef(isOnline);
  const syncInFlightRef = useRef(false);
  const pendingSyncRef = useRef(false);
  const isInitialMount = useRef(true);
  const completedTriggeredRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }, []);

  const analyticsEvent = useCallback((category: string, action: string, label?: string) => {
    console.log(`[Analytics] ${category} -> ${action}${label ? ` (${label})` : ""}`);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    triggerHaptic(15);
  }, [activeTab, triggerHaptic]);

  const clearPlaybackErrorLater = useCallback((message: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setPlaybackState((prev) =>
        prev.playbackError === message ? { ...prev, playbackError: null } : prev
      );
    }, 6000);
  }, []);

  const syncWithServer = useCallback(async () => {
    const profile = userProfileRef.current;
    if (!profile || !isOnlineRef.current) return;

    if (syncInFlightRef.current) {
      pendingSyncRef.current = true;
      return;
    }

    syncInFlightRef.current = true;
    try {
      let mergedArticles = [...articlesRef.current];
      let mergedPlaylists = [...playlistsRef.current];
      let mergedPreferences = { ...preferencesRef.current };

      const remoteData = await ApiService.getBackupData(profile.token);

      if (remoteData) {
        for (const remoteArt of remoteData.articles) {
          const index = mergedArticles.findIndex((a) => a.id === remoteArt.id);
          if (index === -1) {
            mergedArticles.push(remoteArt);
            await localDB.saveArticle(remoteArt);
          } else if (new Date(remoteArt.createdAt).getTime() > new Date(mergedArticles[index].createdAt).getTime()) {
            mergedArticles[index] = {
              ...remoteArt,
              isDownloaded: mergedArticles[index].isDownloaded || remoteArt.isDownloaded,
            };
            await localDB.saveArticle(mergedArticles[index]);
          }
        }

        for (const remotePl of remoteData.playlists) {
          const index = mergedPlaylists.findIndex((p) => p.id === remotePl.id);
          if (index === -1) {
            mergedPlaylists.push(remotePl);
            await localDB.savePlaylist(remotePl);
          } else {
            mergedPlaylists[index] = remotePl;
            await localDB.savePlaylist(remotePl);
          }
        }

        if (remoteData.preferences) {
          mergedPreferences = { ...mergedPreferences, ...remoteData.preferences };
          setLocalPreferences(mergedPreferences);
          await localDB.savePreferences(mergedPreferences);
        }

        setArticles(mergedArticles);
        setPlaylists(mergedPlaylists);
      }

      await ApiService.backupData(profile.token, {
        articles: mergedArticles,
        playlists: mergedPlaylists,
        progress: progressRef.current,
        preferences: mergedPreferences,
        queue: playbackStateRef.current.queue,
      });
    } catch (err) {
      console.warn("Sync failed:", err);
    } finally {
      syncInFlightRef.current = false;
      if (pendingSyncRef.current) {
        pendingSyncRef.current = false;
        void syncWithServer();
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      analyticsEvent("System", "Network", "Online");
      void syncWithServer();
    };
    const handleOffline = () => {
      setIsOnline(false);
      analyticsEvent("System", "Network", "Offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [analyticsEvent, syncWithServer]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);

        const savedProfileStr = localStorage.getItem("user_profile");
        if (savedProfileStr) {
          setUserProfile(JSON.parse(savedProfileStr));
        }

        const savedPrefs = await localDB.getPreferences();
        if (savedPrefs) {
          setLocalPreferences(savedPrefs);
          setPlaybackState((prev) => ({ ...prev, speed: savedPrefs.playbackSpeed }));
        }

        const [dbArticles, dbPlaylists, dbProgress, dbQueue] = await Promise.all([
          localDB.getArticles(),
          localDB.getPlaylists(),
          localDB.getProgress(),
          localDB.getQueue(),
        ]);

        if (dbArticles.length === 0) {
          const seedArticles: Article[] = [
            {
              id: "seed-1",
              title: "The AI Revolution in Daily Commutes",
              author: "Elena Vance",
              summary:
                "Artificial intelligence is reshaping morning commutes through smart navigation, adaptive speed limits, and traffic prediction engines.",
              category: "Technology",
              tags: ["AI", "Commuting", "Smart Cities"],
              voiceName: "Zephyr",
              isDownloaded: false,
              isSaved: true,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              playCount: 0,
            },
            {
              id: "seed-2",
              title: "Five Mindful Habits for a Calmer Morning",
              author: "Dr. Julian Thorne",
              summary:
                "Mornings set the tone for your day. A calm routine can help reduce stress and keep your commute focused.",
              category: "Health & Wellness",
              tags: ["Mindfulness", "Lifestyle", "Habits"],
              voiceName: "Kore",
              isDownloaded: false,
              isSaved: false,
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              playCount: 0,
            },
            {
              id: "seed-3",
              title: "Solar Transportation Gains Momentum in Urban Transit",
              author: "Marcus Lin",
              summary:
                "Cities are experimenting with solar-powered transit infrastructure to cut emissions and reduce operating costs.",
              category: "Science & Environment",
              tags: ["Solar", "Green Transit", "Sustainability"],
              voiceName: "Charon",
              isDownloaded: false,
              isSaved: true,
              createdAt: new Date(Date.now() - 14400000).toISOString(),
              playCount: 0,
            },
          ];

          await Promise.all(seedArticles.map((art) => localDB.saveArticle(art)));
          setArticles(seedArticles);

          const seedPlaylists: Playlist[] = [
            {
              id: "play-1",
              name: "My Morning Commute",
              description: "A balanced mix of technology, sustainability, and wellness.",
              articleIds: ["seed-1", "seed-3", "seed-2"],
              tags: ["Daily", "Commute"],
              createdAt: new Date().toISOString(),
            },
          ];

          await Promise.all(seedPlaylists.map((pl) => localDB.savePlaylist(pl)));
          setPlaylists(seedPlaylists);
        } else {
          setArticles(dbArticles);
          setPlaylists(dbPlaylists);
        }

        setPlaybackState((prev) => ({ ...prev, queue: dbQueue }));
        setProgress(dbProgress);
      } catch (err) {
        console.error("Failed to restore local data", err);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void localDB.saveQueue(playbackState.queue);
    }
  }, [playbackState.queue, isLoading]);

  useEffect(() => {
    return () => {
      if (sleepTimerIdRef.current) clearInterval(sleepTimerIdRef.current);
      if (audioProgressIntervalRef.current) clearInterval(audioProgressIntervalRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      currentAudioRef.current?.pause();
    };
  }, []);

  const scheduleSync = useCallback(() => {
    if (isOnlineRef.current) void syncWithServer();
  }, [syncWithServer]);

  const registerUser = useCallback(async (u: string, p: string) => {
    const profile = await ApiService.register(u, p);
    setUserProfile(profile);
    localStorage.setItem("user_profile", JSON.stringify(profile));
    analyticsEvent("Auth", "Register", u);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const loginUser = useCallback(async (u: string, p: string) => {
    const profile = await ApiService.login(u, p);
    setUserProfile(profile);
    localStorage.setItem("user_profile", JSON.stringify(profile));
    analyticsEvent("Auth", "Login", u);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const logoutUser = useCallback(async () => {
    currentAudioRef.current?.pause();
    setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentArticleId: null }));
    setUserProfile(null);
    localStorage.removeItem("user_profile");
    analyticsEvent("Auth", "Logout");
  }, [analyticsEvent]);

  const addArticleText = useCallback(async (title: string, text: string) => {
    setIsLoading(true);
    try {
      const summaryResult = await ApiService.summarizeText(text, title, preferencesRef.current);
      const newArticle: Article = {
        id: `art-${crypto.randomUUID()}`,
        title: summaryResult.title || title || "Direct paste summary",
        originalText: text,
        summary: summaryResult.summary,
        category: "Personal Feed",
        tags: ["Pasted"],
        voiceName: preferencesRef.current.voiceName,
        isDownloaded: false,
        isSaved: true,
        createdAt: new Date().toISOString(),
        playCount: 0,
      };

      await localDB.saveArticle(newArticle);
      setArticles((prev) => [newArticle, ...prev]);
      analyticsEvent("Article", "AddText", newArticle.title);
      scheduleSync();
    } finally {
      setIsLoading(false);
    }
  }, [analyticsEvent, scheduleSync]);

  const importArticleUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
      const extractResult = await ApiService.extractUrl(url, preferencesRef.current);
      const newArticle: Article = {
        id: `art-${crypto.randomUUID()}`,
        title: extractResult.title || "Extracted Article",
        summary: extractResult.summary,
        url,
        category: "Imported Feed",
        tags: ["URL Import"],
        voiceName: preferencesRef.current.voiceName,
        isDownloaded: false,
        isSaved: true,
        createdAt: new Date().toISOString(),
        playCount: 0,
      };

      await localDB.saveArticle(newArticle);
      setArticles((prev) => [newArticle, ...prev]);
      analyticsEvent("Article", "ImportURL", newArticle.title);
      scheduleSync();
    } finally {
      setIsLoading(false);
    }
  }, [analyticsEvent, scheduleSync]);

  const addGroundedArticle = useCallback(
    async (title: string, category: string, summary: string, sourceUrl?: string): Promise<Article> => {
      setIsLoading(true);
      try {
        const newArticle: Article = {
          id: `art-${crypto.randomUUID()}`,
          title: title || "Grounded News Brief",
          summary,
          category: category || "News Search",
          tags: ["Search Grounding", "Live News"],
          url: sourceUrl,
          voiceName: preferencesRef.current.voiceName,
          isDownloaded: false,
          isSaved: true,
          createdAt: new Date().toISOString(),
          playCount: 0,
        };

        await localDB.saveArticle(newArticle);
        setArticles((prev) => [newArticle, ...prev]);
        analyticsEvent("Article", "AddGrounded", newArticle.title);
        scheduleSync();
        return newArticle;
      } finally {
        setIsLoading(false);
      }
    },
    [analyticsEvent, scheduleSync]
  );

  const deleteArticle = useCallback(async (id: string) => {
    if (audioElementsCache[id]) {
      audioElementsCache[id].pause();
      delete audioElementsCache[id];
    }
    if (playbackStateRef.current.currentArticleId === id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    await localDB.deleteArticle(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.articleIds.includes(id)) {
          const updated = { ...pl, articleIds: pl.articleIds.filter((aid) => aid !== id) };
          void localDB.savePlaylist(updated);
          return updated;
        }
        return pl;
      })
    );
    setPlaybackState((prev) => ({
      ...prev,
      queue: prev.queue.filter((qid) => qid !== id),
      currentArticleId: prev.currentArticleId === id ? null : prev.currentArticleId,
      isPlaying: prev.currentArticleId === id ? false : prev.isPlaying,
    }));
    analyticsEvent("Article", "Delete", id);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const toggleSaveArticle = useCallback(async (id: string) => {
    const updatedArticle = articlesRef.current.find((a) => a.id === id);
    if (!updatedArticle) return;
    const next = { ...updatedArticle, isSaved: !updatedArticle.isSaved };
    await localDB.saveArticle(next);
    setArticles((prev) => prev.map((a) => (a.id === id ? next : a)));
    analyticsEvent("Article", "ToggleSave", id);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const downloadArticleAudio = useCallback(async (id: string) => {
    const article = articlesRef.current.find((a) => a.id === id);
    if (!article) return;

    const cached = await localDB.getAudio(id);
    if (cached) {
      setArticles((prev) => prev.map((art) => (art.id === id ? { ...art, isDownloaded: true } : art)));
      return;
    }

    try {
      analyticsEvent("Audio", "DownloadStart", article.title);
      const base64 = await ApiService.generateTTS(article.summary, article.voiceName, 1.0);
      await localDB.saveAudio(id, base64);

      const updated = { ...article, isDownloaded: true };
      await localDB.saveArticle(updated);
      setArticles((prev) => prev.map((art) => (art.id === id ? updated : art)));

      analyticsEvent("Audio", "DownloadSuccess", article.title);
      scheduleSync();
    } catch (err) {
      console.error("Audio download failed", err);
      throw new Error("Could not download audio. Check internet connection.");
    }
  }, [analyticsEvent, scheduleSync]);

  const createPlaylist = useCallback(async (name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: `play-${crypto.randomUUID()}`,
      name,
      description,
      articleIds: [],
      createdAt: new Date().toISOString(),
    };
    await localDB.savePlaylist(newPlaylist);
    setPlaylists((prev) => [...prev, newPlaylist]);
    analyticsEvent("Playlist", "Create", name);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const deletePlaylist = useCallback(async (id: string) => {
    await localDB.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    analyticsEvent("Playlist", "Delete", id);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const updatePlaylistDetails = useCallback(async (playlistId: string, name: string, description?: string) => {
    const playlist = playlistsRef.current.find((p) => p.id === playlistId);
    if (!playlist) return;
    const updatedPl = { ...playlist, name, description };
    await localDB.savePlaylist(updatedPl);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updatedPl : p)));
    analyticsEvent("Playlist", "UpdateDetails", playlistId);
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const addArticleToPlaylist = useCallback(async (playlistId: string, articleId: string) => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist || playlist.articleIds.includes(articleId)) return;
    const updatedPl = { ...playlist, articleIds: [...playlist.articleIds, articleId] };
    await localDB.savePlaylist(updatedPl);
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? updatedPl : pl)));
    analyticsEvent("Playlist", "AddArticle", articleId);
    scheduleSync();
  }, [analyticsEvent, playlists, scheduleSync]);

  const removeArticleFromPlaylist = useCallback(async (playlistId: string, articleId: string) => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) return;
    const updatedPl = { ...playlist, articleIds: playlist.articleIds.filter((id) => id !== articleId) };
    await localDB.savePlaylist(updatedPl);
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? updatedPl : pl)));
    analyticsEvent("Playlist", "RemoveArticle", articleId);
    scheduleSync();
  }, [analyticsEvent, playlists, scheduleSync]);

  const reorderPlaylist = useCallback(async (playlistId: string, startIndex: number, endIndex: number) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;
    const newIds = [...playlist.articleIds];
    const [removed] = newIds.splice(startIndex, 1);
    if (removed === undefined) return;
    newIds.splice(endIndex, 0, removed);
    const updatedPl = { ...playlist, articleIds: newIds };
    await localDB.savePlaylist(updatedPl);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updatedPl : p)));
    analyticsEvent("Playlist", "Reorder", playlistId);
    scheduleSync();
  }, [analyticsEvent, playlists, scheduleSync]);

  const startTrackingProgress = useCallback((id: string) => {
    if (audioProgressIntervalRef.current) clearInterval(audioProgressIntervalRef.current);

    audioProgressIntervalRef.current = setInterval(() => {
      const audio = currentAudioRef.current;
      if (!audio || audio.paused) return;

      const pos = audio.currentTime || 0;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 60;
      const completed = pos >= dur - 2;

      if (completed && !completedTriggeredRef.current[id]) {
        completedTriggeredRef.current[id] = true;
        triggerHaptic([40, 80, 40]);
      }

      const newProg: PlaybackProgress = {
        articleId: id,
        position: pos,
        duration: dur,
        completed,
        lastPlayed: new Date().toISOString(),
      };

      setProgress((prev) => {
        const filtered = prev.filter((p) => p.articleId !== id);
        return [...filtered, newProg];
      });

      void localDB.saveProgress(newProg);
    }, 1000);
  }, [triggerHaptic]);

  const playWithSpeechSynthesis = useCallback((article: Article) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPlaybackState((prev) => ({ ...prev, isPlaying: false, playbackError: "Audio playback unavailable." }));
      clearPlaybackErrorLater("Audio playback unavailable.");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(article.summary);
      utterance.rate = playbackStateRef.current.speed || 1.0;

      const words = article.summary.split(/\s+/).length;
      const estimatedDuration = Math.max(15, Math.round((words / 150) * 60));
      let elapsedSeconds = 0;

      if (audioProgressIntervalRef.current) clearInterval(audioProgressIntervalRef.current);

      audioProgressIntervalRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          elapsedSeconds += 1;
          const pos = elapsedSeconds;
          const dur = estimatedDuration;
          const completed = pos >= dur - 2;

          if (completed && !completedTriggeredRef.current[article.id]) {
            completedTriggeredRef.current[article.id] = true;
            triggerHaptic([40, 80, 40]);
          }

          const newProg: PlaybackProgress = {
            articleId: article.id,
            position: pos,
            duration: dur,
            completed,
            lastPlayed: new Date().toISOString(),
          };

          setProgress((prev) => {
            const filtered = prev.filter((p) => p.articleId !== article.id);
            return [...filtered, newProg];
          });
          void localDB.saveProgress(newProg);
        }
      }, 1000);

      utterance.onend = () => {
        if (audioProgressIntervalRef.current) clearInterval(audioProgressIntervalRef.current);
        isSpeechSynthesisActiveRef.current = false;
        playNextInQueueRef.current();
      };

      utterance.onerror = () => {
        if (audioProgressIntervalRef.current) clearInterval(audioProgressIntervalRef.current);
        isSpeechSynthesisActiveRef.current = false;
        setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      };

      isSpeechSynthesisActiveRef.current = true;
      currentSpeechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      setPlaybackState((prev) => ({
        ...prev,
        currentArticleId: article.id,
        isPlaying: true,
        playbackError: null,
      }));
      triggerHaptic(30);
    } catch {
      setPlaybackState((prev) => ({ ...prev, isPlaying: false, playbackError: "Audio speech synthesis failed." }));
      clearPlaybackErrorLater("Audio speech synthesis failed.");
    }
  }, [clearPlaybackErrorLater, triggerHaptic]);

  const togglePlayPause = useCallback(() => {
    if (isSpeechSynthesisActiveRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      triggerHaptic(20);
      if (playbackStateRef.current.isPlaying) {
        window.speechSynthesis.pause();
        setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
        analyticsEvent("Player", "Pause");
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
        } else {
          const currentId = playbackStateRef.current.currentArticleId;
          if (currentId) {
            const article = articlesRef.current.find((a) => a.id === currentId);
            if (article) playWithSpeechSynthesis(article);
          }
        }
        analyticsEvent("Player", "Resume");
      }
      return;
    }

    const audio = currentAudioRef.current;
    if (!audio) {
      if (articlesRef.current.length > 0) {
        const id = articlesRef.current[0].id;
        const article = articlesRef.current[0];
        if (article) {
          playArticle(id);
        }
      }
      return;
    }

    triggerHaptic(20);
    if (playbackStateRef.current.isPlaying) {
      audio.pause();
      setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      analyticsEvent("Player", "Pause");
    } else {
      audio.playbackRate = playbackStateRef.current.speed;
      void audio.play().then(() => {
        setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
        const currentId = playbackStateRef.current.currentArticleId;
        if (currentId) startTrackingProgress(currentId);
      }).catch(() => {
        const currentId = playbackStateRef.current.currentArticleId;
        if (currentId) {
          const article = articlesRef.current.find((a) => a.id === currentId);
          if (article) playWithSpeechSynthesis(article);
        }
      });
      analyticsEvent("Player", "Resume");
    }
  }, [analyticsEvent, playWithSpeechSynthesis, startTrackingProgress, triggerHaptic]);

  const playArticle = useCallback(async (id: string) => {
    const article = articlesRef.current.find((a) => a.id === id);
    if (!article) return;

    if (playbackStateRef.current.currentArticleId === id) {
      togglePlayPause();
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeechSynthesisActiveRef.current = false;

    try {
      completedTriggeredRef.current[id] = false;
      triggerHaptic(30);
      setPlaybackState((prev) => ({ ...prev, currentArticleId: id, isPlaying: true, playbackError: null }));
      analyticsEvent("Player", "PlayTrack", article.title);

      let audioObj = audioElementsCache[id];
      if (!audioObj) {
        const cachedBase64 = await localDB.getAudio(id);
        let audioSrc: string | null = null;

        if (cachedBase64) {
          audioSrc = `data:audio/mp3;base64,${cachedBase64}`;
        } else {
          if (!isOnlineRef.current) {
            playWithSpeechSynthesis(article);
            return;
          }
          try {
            const liveBase64 = await ApiService.generateTTS(article.summary, article.voiceName, 1.0);
            audioSrc = `data:audio/mp3;base64,${liveBase64}`;
          } catch {
            playWithSpeechSynthesis(article);
            return;
          }
        }

        audioObj = new Audio(audioSrc);
        audioElementsCache[id] = audioObj;
      }

      audioObj.onended = () => playNextInQueueRef.current();
      currentAudioRef.current = audioObj;
      audioObj.playbackRate = playbackStateRef.current.speed;

      const prog = progressRef.current.find((p) => p.articleId === id);
      if (prog && !prog.completed && prog.position > 0) {
        audioObj.currentTime = prog.position;
      }

      await audioObj.play();

      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, playCount: a.playCount + 1 } : a))
      );
      await localDB.saveArticle({ ...article, playCount: article.playCount + 1 });

      startTrackingProgress(id);
    } catch {
      playWithSpeechSynthesis(article);
    }
  }, [analyticsEvent, playWithSpeechSynthesis, startTrackingProgress, togglePlayPause, triggerHaptic]);

  const playNextInQueue = useCallback(() => {
    const { queue, currentArticleId } = playbackStateRef.current;
    if (queue.length === 0) return;

    let nextId: string | null = null;
    if (!currentArticleId) nextId = queue[0];
    else {
      const idx = queue.indexOf(currentArticleId);
      if (idx !== -1 && idx < queue.length - 1) nextId = queue[idx + 1];
    }

    if (nextId) {
      triggerHaptic(25);
      void playArticle(nextId);
      return;
    }

    currentAudioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeechSynthesisActiveRef.current = false;
    setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentArticleId: null }));
    analyticsEvent("Player", "QueueCompleted");
  }, [analyticsEvent, playArticle, triggerHaptic]);

  playNextInQueueRef.current = playNextInQueue;

  const playPrev = useCallback(() => {
    const { queue, currentArticleId } = playbackStateRef.current;
    if (queue.length === 0 || !currentArticleId) return;

    const idx = queue.indexOf(currentArticleId);
    if (idx > 0) {
      triggerHaptic(25);
      void playArticle(queue[idx - 1]);
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.currentTime = 0;
      } else if (isSpeechSynthesisActiveRef.current) {
        const article = articlesRef.current.find((a) => a.id === currentArticleId);
        if (article) playWithSpeechSynthesis(article);
      }
    }
  }, [playArticle, playWithSpeechSynthesis, triggerHaptic]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    triggerHaptic(15);
    setPlaybackState((prev) => ({ ...prev, speed }));
    setLocalPreferences((prev) => {
      const updated = { ...prev, playbackSpeed: speed };
      void localDB.savePreferences(updated);
      return updated;
    });
    if (currentAudioRef.current) currentAudioRef.current.playbackRate = speed;
    analyticsEvent("Player", "SetSpeed", `${speed}x`);
  }, [analyticsEvent, triggerHaptic]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerIdRef.current) {
      clearInterval(sleepTimerIdRef.current);
      sleepTimerIdRef.current = null;
    }

    if (minutes === null) {
      setPlaybackState((prev) => ({ ...prev, sleepTimerDuration: null, sleepTimerEndTimestamp: null }));
      analyticsEvent("Player", "SleepTimerCancelled");
      return;
    }

    const endMs = Date.now() + minutes * 60 * 1000;
    setPlaybackState((prev) => ({
      ...prev,
      sleepTimerDuration: minutes,
      sleepTimerEndTimestamp: endMs,
    }));

    analyticsEvent("Player", "SleepTimerStarted", `${minutes}m`);

    sleepTimerIdRef.current = setInterval(() => {
      const remainingMs = endMs - Date.now();
      if (remainingMs <= 0) {
        currentAudioRef.current?.pause();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        isSpeechSynthesisActiveRef.current = false;
        if (audioProgressIntervalRef.current) {
          clearInterval(audioProgressIntervalRef.current);
          audioProgressIntervalRef.current = null;
        }
        setPlaybackState((prev) => ({
          ...prev,
          isPlaying: false,
          sleepTimerDuration: null,
          sleepTimerEndTimestamp: null,
        }));
        if (sleepTimerIdRef.current) clearInterval(sleepTimerIdRef.current);
        sleepTimerIdRef.current = null;
        analyticsEvent("Player", "SleepTimerTriggered");
        return;
      }

      setPlaybackState((prev) => ({
        ...prev,
        sleepTimerDuration: Math.ceil(remainingMs / 60000),
      }));
    }, 10000);
  }, [analyticsEvent]);

  const updatePlaybackPosition = useCallback((seconds: number) => {
    const currentId = playbackStateRef.current.currentArticleId;
    if (currentAudioRef.current) {
      currentAudioRef.current.currentTime = seconds;
      triggerHaptic(15);
    }

    if (!currentId) return;

    setProgress((prev) => {
      const existing = prev.find((p) => p.articleId === currentId);
      const newProg: PlaybackProgress = {
        articleId: currentId,
        position: seconds,
        duration: existing?.duration || 60,
        completed: existing ? seconds >= existing.duration - 2 : false,
        lastPlayed: new Date().toISOString(),
      };
      const filtered = prev.filter((p) => p.articleId !== currentId);
      void localDB.saveProgress(newProg);
      return [...filtered, newProg];
    });
  }, [triggerHaptic]);

  const addToQueue = useCallback((id: string) => {
    setPlaybackState((prev) => {
      if (prev.queue.includes(id)) return prev;
      const queue = [...prev.queue, id];
      void localDB.saveQueue(queue);
      return { ...prev, queue };
    });
    analyticsEvent("Queue", "Add", id);
  }, [analyticsEvent]);

  const removeFromQueue = useCallback((id: string) => {
    setPlaybackState((prev) => {
      const queue = prev.queue.filter((qid) => qid !== id);
      const isCurrentActive = prev.currentArticleId === id;
      if (isCurrentActive) currentAudioRef.current?.pause();
      void localDB.saveQueue(queue);
      return {
        ...prev,
        queue,
        currentArticleId: isCurrentActive ? null : prev.currentArticleId,
        isPlaying: isCurrentActive ? false : prev.isPlaying,
      };
    });
    analyticsEvent("Queue", "Remove", id);
  }, [analyticsEvent]);

  const clearQueue = useCallback(() => {
    currentAudioRef.current?.pause();
    setPlaybackState((prev) => ({ ...prev, queue: [], currentArticleId: null, isPlaying: false }));
    void localDB.saveQueue([]);
    analyticsEvent("Queue", "Clear");
  }, [analyticsEvent]);

  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setPlaybackState((prev) => {
      const queue = [...prev.queue];
      const [removed] = queue.splice(startIndex, 1);
      if (removed === undefined) return prev;
      queue.splice(endIndex, 0, removed);
      void localDB.saveQueue(queue);
      return { ...prev, queue };
    });
    analyticsEvent("Queue", "Reorder");
  }, [analyticsEvent]);

  const clearPlaybackError = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, playbackError: null }));
  }, []);

  const setPreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferencesRef.current, ...newPrefs };
    setLocalPreferences(updated);
    void localDB.savePreferences(updated);
    analyticsEvent("Preferences", "Update", JSON.stringify(newPrefs));
    scheduleSync();
  }, [analyticsEvent, scheduleSync]);

  const value = useMemo<AppContextProps>(() => ({
    articles,
    playlists,
    progress,
    preferences,
    playbackState,
    userProfile,
    isOnline,
    isLoading,
    activeTab,
    setActiveTab,
    registerUser,
    loginUser,
    logoutUser,
    addArticleText,
    importArticleUrl,
    addGroundedArticle,
    deleteArticle,
    downloadArticleAudio,
    toggleSaveArticle,
    createPlaylist,
    deletePlaylist,
    updatePlaylistDetails,
    addArticleToPlaylist,
    removeArticleFromPlaylist,
    reorderPlaylist,
    playArticle,
    togglePlayPause,
    playNextInQueue,
    playPrev,
    setPlaybackSpeed,
    setSleepTimer,
    updatePlaybackPosition,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    clearPlaybackError,
    setPreferences,
    syncWithServer,
    analyticsEvent,
    triggerHaptic,
  }), [
    articles,
    playlists,
    progress,
    preferences,
    playbackState,
    userProfile,
    isOnline,
    isLoading,
    activeTab,
    registerUser,
    loginUser,
    logoutUser,
    addArticleText,
    importArticleUrl,
    addGroundedArticle,
    deleteArticle,
    downloadArticleAudio,
    toggleSaveArticle,
    createPlaylist,
    deletePlaylist,
    updatePlaylistDetails,
    addArticleToPlaylist,
    removeArticleFromPlaylist,
    reorderPlaylist,
    playArticle,
    togglePlayPause,
    playNextInQueue,
    playPrev,
    setPlaybackSpeed,
    setSleepTimer,
    updatePlaybackPosition,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    clearPlaybackError,
    setPreferences,
    syncWithServer,
    analyticsEvent,
    triggerHaptic,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
