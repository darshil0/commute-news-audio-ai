/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Trash, X, Music, GripVertical, PlayCircle } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { Article } from "../types";

export const QueuePanel: React.FC = () => {
  const {
    playbackState,
    articles,
    playArticle,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    triggerHaptic,
  } = useApp();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { queue, currentArticleId } = playbackState;
  const queueArticles = queue
    .map((id) => articles.find((a) => a.id === id))
    .filter(Boolean) as Article[];

  // HTML5 Drag and Drop events for reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderQueue(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  const handleSwipeDelete = (artId: string, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -250) {
      triggerHaptic(35);
      removeFromQueue(artId);
    }
  };

  return (
    <div
      id="queue-panel-container"
      className="max-w-xl mx-auto p-4 md:p-6 text-zinc-900 dark:text-white pb-32"
    >
      <div className="flex justify-between items-center mb-6 border-b border-zinc-200 dark:border-zinc-900 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            <span>Up Next Queue</span>
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Drag vertical handle to reorder, or{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              swipe left
            </span>{" "}
            to delete tracks.
          </p>
        </div>
        {queue.length > 0 && (
          <button
            id="clear-queue-btn"
            onClick={() => {
              triggerHaptic(20);
              clearQueue();
            }}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {queueArticles.length === 0 ? (
        <div className="bg-white/60 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-2xl py-12 px-6 text-center shadow-sm">
          <Music className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          <h4 className="font-semibold text-zinc-700 dark:text-zinc-400">
            Queue is empty
          </h4>
          <p className="text-zinc-500 dark:text-zinc-600 text-xs mt-1">
            Browse the Commuter Feed and click "Add Queue" to build your custom
            playlist stream.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {queueArticles.map((art, index) => {
              const isCurrent = currentArticleId === art.id;

              return (
                <motion.div
                  key={`${art.id}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -250, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="relative rounded-xl overflow-hidden group"
                >
                  {/* Red Action Reveal Behind Swipe */}
                  <div className="absolute inset-0 bg-red-500 dark:bg-red-600/90 rounded-xl px-5 flex items-center justify-end text-white font-medium text-xs gap-2 shadow-inner">
                    <Trash className="w-4 h-4 animate-pulse" />
                    <span className="font-mono uppercase text-[10px] tracking-wider font-bold">
                      Delete
                    </span>
                  </div>

                  {/* Draggable Front Card */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -140, right: 0 }}
                    dragElastic={0.15}
                    dragSnapToOrigin={true}
                    onDragEnd={(_, info) => handleSwipeDelete(art.id, info)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`relative z-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/90 rounded-xl p-3.5 flex items-center justify-between transition-shadow shadow-sm ${
                      isCurrent
                        ? "border-emerald-500/50 bg-emerald-50/20 dark:bg-zinc-900 shadow-md"
                        : "hover:border-zinc-300 dark:hover:border-zinc-700"
                    } ${draggedIndex === index ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 flex-shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {art.category}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              NOW PLAYING
                            </span>
                          )}
                        </div>
                        <h4
                          className={`font-semibold text-sm truncate mt-1 ${isCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"}`}
                        >
                          {art.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {art.author || "Audio Brief"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(20);
                          playArticle(art.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-emerald-500 text-black shadow"
                            : "bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {isCurrent
                          ? playbackState.isPlaying
                            ? "Pause"
                            : "Play"
                          : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(25);
                          removeFromQueue(art.id);
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Remove from queue"
                        aria-label={`Remove ${art.title} from queue`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
