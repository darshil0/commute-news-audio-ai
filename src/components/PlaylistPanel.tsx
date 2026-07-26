/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  FolderClosed,
  Plus,
  Trash,
  Music,
  ListMusic,
  ChevronRight,
  ArrowRight,
  Play,
  Check,
  X,
  GripVertical,
  Search,
  Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { searchAndFilterArticles } from "../utils/search";

export const PlaylistPanel: React.FC = () => {
  const {
    playlists,
    articles,
    createPlaylist,
    deletePlaylist,
    updatePlaylistDetails,
    addArticleToPlaylist,
    removeArticleFromPlaylist,
    reorderPlaylist,
    playArticle,
    addToQueue,
    clearQueue,
  } = useApp();

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [renameName, setRenameName] = useState("");
  const [renameDesc, setRenameDesc] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const activePlaylistArticles = useMemo(() => {
    return activePlaylist
      ? (activePlaylist.articleIds
          .map((id) => articles.find((a) => a.id === id))
          .filter(Boolean) as typeof articles)
      : [];
  }, [activePlaylist, articles]);

  // Articles that are NOT currently in the active playlist (for quick additions)
  const remainingArticles = useMemo(() => {
    return activePlaylist
      ? articles.filter((a) => !activePlaylist.articleIds.includes(a.id))
      : [];
  }, [activePlaylist, articles]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase().trim();
    return playlists.filter((pl) => {
      const nameMatch = pl.name.toLowerCase().includes(q);
      const descMatch = pl.description?.toLowerCase().includes(q) ?? false;
      const trackMatch = pl.articleIds.some((id) => {
        const art = articles.find((a) => a.id === id);
        return (
          art &&
          (art.title.toLowerCase().includes(q) ||
            art.summary.toLowerCase().includes(q) ||
            art.category.toLowerCase().includes(q) ||
            (art.author?.toLowerCase().includes(q) ?? false))
        );
      });
      return nameMatch || descMatch || trackMatch;
    });
  }, [playlists, articles, searchQuery]);

  const filteredActiveArticles = useMemo(() => {
    return searchAndFilterArticles(activePlaylistArticles, searchQuery, "All");
  }, [activePlaylistArticles, searchQuery]);

  const filteredRemainingArticles = useMemo(() => {
    return searchAndFilterArticles(remainingArticles, searchQuery, "All");
  }, [remainingArticles, searchQuery]);

  const matchingGlobalArticles = useMemo(() => {
    if (!searchQuery.trim() || activePlaylistId) return [];
    return searchAndFilterArticles(articles, searchQuery, "All");
  }, [articles, searchQuery, activePlaylistId]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCreateModal(false);
        setShowRenameModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setShowCreateModal(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlaylist || !renameName.trim()) return;
    updatePlaylistDetails(
      activePlaylist.id,
      renameName.trim(),
      renameDesc.trim(),
    );
    setShowRenameModal(false);
  };

  const openRenameModal = () => {
    if (!activePlaylist) return;
    setRenameName(activePlaylist.name);
    setRenameDesc(activePlaylist.description || "");
    setShowRenameModal(true);
  };

  // HTML5 Drag and Drop event handlers mapping filtered list to original article indices
  const handleDragStart = (e: React.DragEvent, filteredIndex: number) => {
    setDraggedIndex(filteredIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetFilteredIndex: number) => {
    e.preventDefault();
    if (
      draggedIndex === null ||
      draggedIndex === targetFilteredIndex ||
      !activePlaylistId
    )
      return;

    const draggedArticle = filteredActiveArticles[draggedIndex];
    const targetArticle = filteredActiveArticles[targetFilteredIndex];
    if (!draggedArticle || !targetArticle) return;

    const originalStartIndex = activePlaylistArticles.findIndex(
      (a) => a.id === draggedArticle.id,
    );
    const originalEndIndex = activePlaylistArticles.findIndex(
      (a) => a.id === targetArticle.id,
    );

    if (originalStartIndex !== -1 && originalEndIndex !== -1) {
      reorderPlaylist(activePlaylistId, originalStartIndex, originalEndIndex);
    }
    setDraggedIndex(null);
  };

  const handlePlayEntirePlaylist = () => {
    if (!activePlaylist || activePlaylist.articleIds.length === 0) return;
    clearQueue();
    activePlaylist.articleIds.forEach((id) => addToQueue(id));
    playArticle(activePlaylist.articleIds[0]);
  };

  return (
    <div
      id="playlist-panel-container"
      className="max-w-2xl mx-auto p-4 md:p-6 text-white pb-32"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-emerald-400" />
            <span>Playlists</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Group commute-bites by theme or category to listen continuously.
          </p>
        </div>
        <button
          id="create-playlist-btn"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Playlists List Side */}
        {!activePlaylistId ? (
          <div className="space-y-4">
            {/* Search Input Field in Playlist Panel */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="playlist-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playlists or saved audio summaries..."
                aria-label="Search playlists or saved audio summaries"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-9 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {playlists.length === 0 ? (
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl py-12 px-6 text-center">
                <FolderClosed className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="font-semibold text-zinc-300">
                  No playlists yet
                </h3>
                <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                  Create a customized playlist to organize articles into
                  single-stream listens.
                </p>
                <button
                  id="create-first-playlist-btn"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Create Your First Playlist
                </button>
              </div>
            ) : filteredPlaylists.length === 0 &&
              !matchingGlobalArticles.length ? (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl py-8 px-4 text-center">
                <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">
                  No playlists or saved summaries match "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPlaylists.length > 0 && (
                  <div className="space-y-3">
                    {searchQuery.trim() && (
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                        Playlists ({filteredPlaylists.length})
                      </h4>
                    )}
                    {filteredPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        id={`playlist-card-${pl.id}`}
                        onClick={() => setActivePlaylistId(pl.id)}
                        className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 bg-zinc-800 text-emerald-400 rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-zinc-200 truncate">
                              {pl.name}
                            </h4>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {pl.description || "No description"}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-500 mt-1">
                              {pl.articleIds.length} tracks
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>
                    ))}
                  </div>
                )}

                {matchingGlobalArticles.length > 0 && (
                  <div className="border-t border-zinc-900/80 pt-4 space-y-2">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Matching Audio Summaries (
                        {matchingGlobalArticles.length})
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {matchingGlobalArticles.map((art) => (
                        <div
                          key={art.id}
                          className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded uppercase">
                                {art.category}
                              </span>
                              {art.isSaved && (
                                <span className="text-[9px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded">
                                  Saved
                                </span>
                              )}
                            </div>
                            <h5 className="font-medium text-zinc-200 text-xs truncate mt-1">
                              {art.title}
                            </h5>
                            <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                              {art.summary}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => playArticle(art.id)}
                            className="p-2 bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-200 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                            title="Play audio summary"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Active Playlist Details View */
          activePlaylist && (
            <div className="space-y-6">
              {/* Back Navigation Bar */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <button
                  id="playlist-back-btn"
                  onClick={() => {
                    setActivePlaylistId(null);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>Back to Playlists</span>
                </button>
                <button
                  id="delete-playlist-btn"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete "${activePlaylist.name}" playlist?`,
                      )
                    ) {
                      deletePlaylist(activePlaylist.id);
                      setActivePlaylistId(null);
                      setSearchQuery("");
                    }
                  }}
                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-all cursor-pointer"
                  title="Delete playlist"
                  aria-label="Delete playlist"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              {/* Cover Card */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/60 border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-10 h-10" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-xl font-bold text-zinc-100">
                      {activePlaylist.name}
                    </h3>
                    <button
                      type="button"
                      onClick={openRenameModal}
                      className="text-xs text-zinc-400 hover:text-emerald-400 underline font-medium cursor-pointer"
                      title="Rename or edit details"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {activePlaylist.description || "No custom description"}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start mt-3.5">
                    <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">
                      {activePlaylist.articleIds.length} audio tracks
                    </span>
                    {activePlaylist.articleIds.length > 0 && (
                      <button
                        id="play-playlist-btn"
                        onClick={handlePlayEntirePlaylist}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-black" />
                        <span>Listen Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail View Search Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="playlist-detail-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tracks or search briefs to add..."
                  aria-label="Filter tracks or search briefs to add"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-9 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-xs transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tracks List with HTML5 Drag & Drop Reordering */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 font-mono">
                  Playlist Queue ({filteredActiveArticles.length} of{" "}
                  {activePlaylistArticles.length})
                </h4>
                {filteredActiveArticles.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-3">
                    {searchQuery
                      ? `No playlist tracks match "${searchQuery}"`
                      : "This playlist has no articles yet. Add some below!"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredActiveArticles.map((art, idx) => {
                      return (
                        <div
                          key={art.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={`bg-zinc-900/30 border border-zinc-900 rounded-xl p-3 flex items-center justify-between transition-all ${draggedIndex === idx ? "opacity-40 border-dashed border-zinc-700 bg-zinc-800/20" : "hover:bg-zinc-900/60"}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Drag handle */}
                            <div className="cursor-grab text-zinc-600 hover:text-zinc-400 p-1 flex-shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-semibold text-zinc-200 text-sm truncate">
                                {art.title}
                              </h5>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {art.author || "AI Voiceover"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playArticle(art.id)}
                              className="p-1.5 bg-zinc-800 hover:bg-emerald-500 hover:text-black rounded-lg text-zinc-300 transition-colors cursor-pointer"
                              title="Play now"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeArticleFromPlaylist(
                                  activePlaylist.id,
                                  art.id,
                                )
                              }
                              className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Remove from playlist"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add More Articles Section */}
              {remainingArticles.length > 0 && (
                <div className="border-t border-zinc-900 pt-5 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 font-mono">
                    Add briefs to playlist ({filteredRemainingArticles.length})
                  </h4>
                  {filteredRemainingArticles.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2">
                      No available briefs match "{searchQuery}"
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {filteredRemainingArticles.map((art) => (
                        <div
                          key={art.id}
                          className="bg-zinc-900/10 hover:bg-zinc-900/40 border border-zinc-900/50 rounded-lg p-2.5 flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <h5 className="font-medium text-zinc-300 text-xs truncate">
                              {art.title}
                            </h5>
                            <span className="text-[9px] font-mono text-emerald-400 bg-zinc-800/80 px-1 py-0.5 rounded mt-1 inline-block uppercase">
                              {art.category}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              addArticleToPlaylist(activePlaylist.id, art.id)
                            }
                            className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer"
                            title="Add to playlist"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Create Playlist Modal Dialog */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-playlist-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative text-white"
            >
              <button
                id="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <h3
                id="create-playlist-title"
                className="text-lg font-bold mb-4 flex items-center gap-2"
              >
                <FolderClosed className="w-5 h-5 text-emerald-400" />
                <span>Create Playlist</span>
              </h3>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="pname"
                    className="block text-xs font-semibold text-zinc-400 mb-1"
                  >
                    Playlist Name
                  </label>
                  <input
                    id="pname"
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g., Tech Drive Briefing"
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="pdesc"
                    className="block text-xs font-semibold text-zinc-400 mb-1"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="pdesc"
                    rows={2.5}
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    placeholder="Briefly summarize what this playlist holds..."
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    id="modal-cancel"
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="modal-submit"
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Create Playlist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Playlist Modal Dialog */}
      <AnimatePresence>
        {showRenameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-playlist-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative text-white"
            >
              <button
                id="rename-modal-close-btn"
                onClick={() => setShowRenameModal(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <h3
                id="rename-playlist-title"
                className="text-lg font-bold mb-4 flex items-center gap-2"
              >
                <FolderClosed className="w-5 h-5 text-emerald-400" />
                <span>Edit Playlist Details</span>
              </h3>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="rename-pname"
                    className="block text-xs font-semibold text-zinc-400 mb-1"
                  >
                    Playlist Name
                  </label>
                  <input
                    id="rename-pname"
                    type="text"
                    required
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="Playlist name"
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="rename-pdesc"
                    className="block text-xs font-semibold text-zinc-400 mb-1"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="rename-pdesc"
                    rows={2.5}
                    value={renameDesc}
                    onChange={(e) => setRenameDesc(e.target.value)}
                    placeholder="Description..."
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRenameModal(false)}
                    className="px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!renameName.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
