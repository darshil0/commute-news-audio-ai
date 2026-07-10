/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Trash, X, Music, GripVertical, PlayCircle, AlertCircle } from 'lucide-react';

export const QueuePanel: React.FC = () => {
  const { playbackState, articles, playArticle, removeFromQueue, clearQueue, reorderQueue } = useApp();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { queue, currentArticleId } = playbackState;
  const queueArticles = queue.map(id => articles.find(a => a.id === id)).filter(Boolean) as typeof articles;

  // HTML5 Drag and Drop events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderQueue(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div id="queue-panel-container" className="max-w-xl mx-auto p-4 md:p-6 text-white pb-32">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-emerald-400" />
            <span>Up Next Queue</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Drag to reorder tracks, or clear to rebuild your commute stream.
          </p>
        </div>
        {queue.length > 0 && (
          <button
            id="clear-queue-btn"
            onClick={clearQueue}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {queueArticles.length === 0 ? (
        <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl py-12 px-6 text-center">
          <Music className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <h4 className="font-semibold text-zinc-400">Queue is empty</h4>
          <p className="text-zinc-600 text-xs mt-1">
            Browse the Commuter Feed and click "Add Queue" to build your custom playlist stream.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {queueArticles.map((art, index) => {
            const isCurrent = currentArticleId === art.id;

            return (
              <div
                key={`${art.id}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-3.5 flex items-center justify-between transition-all ${isCurrent ? 'border-emerald-500/25 bg-zinc-900' : 'hover:bg-zinc-900/80'} ${draggedIndex === index ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Drag Handle */}
                  <div className="cursor-grab text-zinc-600 hover:text-zinc-400 p-1 flex-shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase bg-zinc-800/80 px-1.5 py-0.5 rounded">
                      {art.category}
                    </span>
                    <h4 className={`font-semibold text-sm truncate mt-1.5 ${isCurrent ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {art.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{art.author || 'AI Voiceover'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playArticle(art.id)}
                    className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${isCurrent ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-200'}`}
                  >
                    {isCurrent ? 'Listening' : 'Play'}
                  </button>
                  <button
                    onClick={() => removeFromQueue(art.id)}
                    className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                    title="Remove from queue"
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
  );
};
