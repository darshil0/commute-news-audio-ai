/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FolderClosed, Plus, Trash, Music, ListMusic, 
  ChevronRight, ArrowRight, Play, Check, X, GripVertical 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PlaylistPanel: React.FC = () => {
  const { 
    playlists, 
    articles, 
    createPlaylist, 
    deletePlaylist, 
    addArticleToPlaylist, 
    removeArticleFromPlaylist, 
    reorderPlaylist,
    playArticle,
    addToQueue
  } = useApp();

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  const activePlaylistArticles = activePlaylist 
    ? activePlaylist.articleIds.map(id => articles.find(a => a.id === id)).filter(Boolean) as typeof articles
    : [];

  // Articles that are NOT currently in the active playlist (for quick additions)
  const remainingArticles = activePlaylist
    ? articles.filter(a => !activePlaylist.articleIds.includes(a.id))
    : [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowCreateModal(false);
  };

  // HTML5 Drag and Drop event handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !activePlaylistId) return;
    reorderPlaylist(activePlaylistId, draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const handlePlayEntirePlaylist = () => {
    if (!activePlaylist || activePlaylist.articleIds.length === 0) return;
    // Add all articles to queue and play the first one
    activePlaylist.articleIds.forEach(id => addToQueue(id));
    playArticle(activePlaylist.articleIds[0]);
  };

  return (
    <div id="playlist-panel-container" className="max-w-2xl mx-auto p-4 md:p-6 text-white pb-32">
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
          playlists.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl py-12 px-6 text-center">
              <FolderClosed className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="font-semibold text-zinc-300">No playlists yet</h3>
              <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                Create a customized playlist to organize articles into single-stream listens.
              </p>
              <button
                id="create-first-playlist-btn"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Create Your First Playlist
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map(pl => (
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
                      <h4 className="font-semibold text-zinc-200 truncate">{pl.name}</h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{pl.description || 'No description'}</p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1">{pl.articleIds.length} tracks</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </div>
              ))}
            </div>
          )
        ) : (
          /* Active Playlist Details View */
          activePlaylist && (
            <div className="space-y-6">
              {/* Back Navigation Bar */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <button
                  id="playlist-back-btn"
                  onClick={() => setActivePlaylistId(null)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>Back to Playlists</span>
                </button>
                <button
                  id="delete-playlist-btn"
                  onClick={() => {
                    deletePlaylist(activePlaylist.id);
                    setActivePlaylistId(null);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-all"
                  title="Delete playlist"
                >
                  <Trash className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Cover Card */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/60 border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-10 h-10" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-zinc-100">{activePlaylist.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{activePlaylist.description || 'No custom description'}</p>
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

              {/* Tracks List with HTML5 Drag & Drop Reordering */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 font-mono">
                  Playlist Queue (Drag items to reorder)
                </h4>
                {activePlaylistArticles.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4">This playlist has no articles yet. Add some below!</p>
                ) : (
                  <div className="space-y-2">
                    {activePlaylistArticles.map((art, index) => (
                      <div
                        key={art.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`bg-zinc-900/30 border border-zinc-900 rounded-xl p-3 flex items-center justify-between transition-all ${draggedIndex === index ? 'opacity-40 border-dashed border-zinc-700 bg-zinc-800/20' : 'hover:bg-zinc-900/60'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Drag handle */}
                          <div className="cursor-grab text-zinc-600 hover:text-zinc-400 p-1 flex-shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-zinc-200 text-sm truncate">{art.title}</h5>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{art.author || 'AI Voiceover'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => playArticle(art.id)}
                            className="p-1.5 bg-zinc-800 hover:bg-emerald-500 hover:text-black rounded-lg text-zinc-300 transition-colors"
                            title="Play now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => removeArticleFromPlaylist(activePlaylist.id, art.id)}
                            className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Remove from playlist"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add More Articles Section */}
              {remainingArticles.length > 0 && (
                <div className="border-t border-zinc-900 pt-5 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 font-mono">
                    Add briefs to playlist
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {remainingArticles.map(art => (
                      <div
                        key={art.id}
                        className="bg-zinc-900/10 hover:bg-zinc-900/40 border border-zinc-900/50 rounded-lg p-2.5 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <h5 className="font-medium text-zinc-300 text-xs truncate">{art.title}</h5>
                          <span className="text-[9px] font-mono text-emerald-400 bg-zinc-800/80 px-1 py-0.5 rounded mt-1 inline-block uppercase">
                            {art.category}
                          </span>
                        </div>
                        <button
                          onClick={() => addArticleToPlaylist(activePlaylist.id, art.id)}
                          className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-all"
                          title="Add to playlist"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative text-white"
            >
              <button
                id="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FolderClosed className="w-5 h-5 text-emerald-400" />
                <span>Create Playlist</span>
              </h3>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="pname" className="block text-xs font-semibold text-zinc-400 mb-1">Playlist Name</label>
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
                  <label htmlFor="pdesc" className="block text-xs font-semibold text-zinc-400 mb-1">Description (Optional)</label>
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
    </div>
  );
};
