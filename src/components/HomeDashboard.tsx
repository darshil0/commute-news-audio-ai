/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Play,
  Pause,
  Bookmark,
  Trash,
  Check,
  FileText,
  ListPlus,
  History,
  Headphones,
  Download,
} from "lucide-react";
import { Article } from "../types";
import { searchAndFilterArticles } from "../utils/search";

type InProgressItem = {
  art: Article;
  progress: {
    articleId: string;
    position: number;
    duration: number;
    completed: boolean;
    lastPlayed: string;
  };
};

export const HomeDashboard: React.FC = () => {
  const {
    articles,
    progress,
    playbackState,
    playArticle,
    downloadArticleAudio,
    toggleSaveArticle,
    deleteArticle,
    addToQueue,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { currentArticleId, isPlaying } = playbackState;

  const stats = useMemo(() => {
    const totalBriefs = articles.length;
    const completedBriefs = progress.filter((p) => p.completed).length;
    const downloadedBriefs = articles.filter((a) => a.isDownloaded).length;
    const totalSecondsListen = progress.reduce((acc, curr) => acc + Math.max(0, Math.round(curr.position)), 0);

    return {
      totalBriefs,
      completedBriefs,
      downloadedBriefs,
      totalMinListen: Math.ceil(totalSecondsListen / 60),
    };
  }, [articles, progress]);

  const categories = useMemo(() => {
    const list = new Set(articles.map((a) => a.category).filter(Boolean));
    return ["All", ...Array.from(list).sort()];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return searchAndFilterArticles(articles, searchQuery, selectedCategory);
  }, [articles, searchQuery, selectedCategory]);

  const inProgressBriefs = useMemo<InProgressItem[]>(() => {
    return progress
      .filter((p) => !p.completed && p.position > 1)
      .map((p) => {
        const art = articles.find((a) => a.id === p.articleId);
        return art ? { art, progress: p } : null;
      })
      .filter((item): item is InProgressItem => item !== null);
  }, [articles, progress]);

  const handlePlay = useCallback(
    (articleId: string) => {
      playArticle(articleId);
    },
    [playArticle]
  );

  return (
    <div id="home-dashboard-container" className="max-w-4xl mx-auto p-4 md:p-6 text-white pb-32 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 font-sans">Commuter Feed</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Seamless summaries formatted into offline-ready morning podcast streams.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-900 rounded-xl px-4 py-3 text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Listening</p>
              <p className="font-semibold text-zinc-200">{stats.totalMinListen} min</p>
            </div>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Completed</p>
              <p className="font-semibold text-zinc-200">
                {stats.completedBriefs} / {stats.totalBriefs}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
          <Search className="w-5 h-5" />
        </span>
        <input
          id="dashboard-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, author, keyword, tags, or saved/downloaded..."
          aria-label="Search articles"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm transition-all shadow-md"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar" aria-label="Category filters">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            aria-pressed={selectedCategory === cat}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-emerald-500 text-black shadow-md"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {inProgressBriefs.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Continue Listening</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgressBriefs.map(({ art, progress }) => {
              const percent = progress.duration > 0 ? Math.min(100, Math.round((progress.position / progress.duration) * 100)) : 0;

              return (
                <div
                  key={art.id}
                  id={`resume-card-${art.id}`}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {art.category}
                      </span>
                      <h4 className="font-semibold text-sm text-zinc-200 truncate mt-1.5">{art.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Resume from {Math.floor(progress.position)}s</p>
                    </div>
                    <button
                      type="button"
                      id={`resume-play-btn-${art.id}`}
                      onClick={() => handlePlay(art.id)}
                      aria-label={`Play ${art.title}`}
                      className="w-8 h-8 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer shadow"
                    >
                      <Play className="w-4 h-4 fill-current text-black ml-0.5" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-zinc-800 h-1 rounded overflow-hidden" aria-hidden="true">
                      <div className="bg-emerald-400 h-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                      <span>{percent}% listened</span>
                      <span>{Math.round(progress.duration / 60)} min</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono">
          <Headphones className="w-4 h-4 text-emerald-400" />
          <span>Commute Summaries ({filteredArticles.length})</span>
        </h3>

        {filteredArticles.length === 0 ? (
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl py-12 px-6 text-center">
            <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <h4 className="font-semibold text-zinc-400">No briefs match criteria</h4>
            <p className="text-zinc-600 text-xs mt-1">
              Add some news, saved feeds, or refine your search query or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art) => {
              const isActive = currentArticleId === art.id;
              const isComp = progress.find((p) => p.articleId === art.id)?.completed ?? false;

              return (
                <div
                  key={art.id}
                  id={`article-feed-item-${art.id}`}
                  className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isActive
                      ? "bg-zinc-900 border-emerald-500/30"
                      : "bg-zinc-900/30 border-zinc-900/80 hover:border-zinc-800/80 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      id={`play-feed-item-${art.id}`}
                      onClick={() => handlePlay(art.id)}
                      aria-label={`${isActive && isPlaying ? "Pause" : "Play"} ${art.title}`}
                      aria-pressed={isActive && isPlaying}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                        isActive && isPlaying
                          ? "bg-zinc-800 text-emerald-400"
                          : "bg-zinc-800 text-zinc-300 hover:text-emerald-400"
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-zinc-850 px-2 py-0.5 rounded uppercase">
                          {art.category}
                        </span>
                        {art.isDownloaded && (
                          <span className="text-[8px] font-mono text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> offline
                          </span>
                        )}
                        {isComp && (
                          <span className="text-[8px] font-mono text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded">
                            listened
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm text-zinc-100 truncate mt-1.5">{art.title}</h4>

                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{art.summary}</p>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-zinc-500 font-mono">
                        <span>{art.author || "AI Voiceover"}</span>
                        <span className="w-1 h-1 bg-zinc-750 rounded-full" />
                        <span>{new Date(art.createdAt).toLocaleDateString()}</span>
                        {art.playCount > 0 && (
                          <>
                            <span className="w-1 h-1 bg-zinc-750 rounded-full" />
                            <span>
                              {art.playCount} {art.playCount === 1 ? "play" : "plays"}
                            </span>
                          </>
                        )}
                      </div>

                      {art.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {art.tags.map((tag) => (
                            <span key={tag} className="text-[9px] text-zinc-500 bg-zinc-800/40 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col justify-end gap-2.5 flex-shrink-0 border-t sm:border-t-0 border-zinc-900 pt-3 sm:pt-0">
                    <button
                      type="button"
                      id={`queue-add-btn-${art.id}`}
                      onClick={() => addToQueue(art.id)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      title="Add to queue"
                    >
                      <ListPlus className="w-4 h-4" />
                      <span className="sm:hidden">Add Queue</span>
                    </button>

                    <button
                      type="button"
                      id={`download-feed-item-${art.id}`}
                      onClick={() => downloadArticleAudio(art.id)}
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                      title="Download audio"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      id={`bookmark-toggle-${art.id}`}
                      onClick={() => toggleSaveArticle(art.id)}
                      aria-pressed={art.isSaved}
                      className={`p-1.5 hover:bg-zinc-800 rounded-lg transition-colors ${
                        art.isSaved ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={art.isSaved ? "Bookmarked" : "Bookmark"}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      id={`delete-feed-item-${art.id}`}
                      onClick={() => deleteArticle(art.id)}
                      className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete brief"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
