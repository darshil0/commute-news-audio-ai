/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Play, Pause, SkipForward, SkipBack, Moon, Volume2, 
  ChevronUp, ChevronDown, Download, Check, Clock, Timer, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PodcastPlayer: React.FC = () => {
  const { 
    articles, 
    playbackState, 
    progress, 
    togglePlayPause, 
    playNextInQueue, 
    playPrev, 
    setPlaybackSpeed, 
    setSleepTimer, 
    updatePlaybackPosition,
    downloadArticleAudio,
    clearPlaybackError,
    isOnline
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const { currentArticleId, isPlaying, speed, sleepTimerDuration, sleepTimerEndTimestamp } = playbackState;
  const currentArticle = articles.find(a => a.id === currentArticleId);
  const currentProgress = progress.find(p => p.articleId === currentArticleId);

  // Computed times
  const pos = currentProgress?.position || 0;
  const dur = currentProgress?.duration || currentArticle?.duration || 120;
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Skip handlers
  const handleForward15 = () => {
    const newPos = Math.min(dur, pos + 15);
    updatePlaybackPosition(newPos);
  };

  const handleBackward15 = () => {
    const newPos = Math.max(0, pos - 15);
    updatePlaybackPosition(newPos);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPos = parseFloat(e.target.value);
    updatePlaybackPosition(newPos);
  };

  if (!currentArticle) return null;

  return (
    <>
      {/* Mini Player Bar (Persistent at bottom of screens) */}
      <div 
        id="player-mini-bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 border-t border-zinc-800 text-white backdrop-blur-md px-4 py-3 flex items-center justify-between cursor-pointer md:px-8"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Animated Waveform when playing */}
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
            {isPlaying ? (
              <div className="flex items-end gap-[2px] h-5">
                <span className="w-[3px] bg-emerald-400 animate-[bounce_1.2s_infinite_0s] h-3"></span>
                <span className="w-[3px] bg-emerald-400 animate-[bounce_1s_infinite_0.2s] h-5"></span>
                <span className="w-[3px] bg-emerald-400 animate-[bounce_1.4s_infinite_0.4s] h-4"></span>
                <span className="w-[3px] bg-emerald-400 animate-[bounce_0.8s_infinite_0.1s] h-2"></span>
              </div>
            ) : (
              <Volume2 className="w-5 h-5 text-zinc-400" />
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate text-zinc-100">{currentArticle.title}</h4>
            <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5">
              <span>{currentArticle.author || 'AI Voiceover'}</span>
              <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
              <span className="font-mono bg-zinc-800 text-emerald-400 text-[10px] px-1 rounded uppercase">
                {currentArticle.category}
              </span>
            </p>
          </div>
        </div>

        {/* Mini Controls */}
        <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button 
            id="mini-prev-btn"
            onClick={playPrev}
            className="p-1 hover:text-emerald-400 text-zinc-300 transition-colors hidden sm:block"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            id="mini-play-btn"
            onClick={togglePlayPause}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current text-black" /> : <Play className="w-5 h-5 fill-current text-black ml-0.5" />}
          </button>

          <button 
            id="mini-next-btn"
            onClick={playNextInQueue}
            className="p-1 hover:text-emerald-400 text-zinc-300 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          
          <button 
            id="mini-expand-btn"
            onClick={() => setIsExpanded(true)}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Expanded Interactive Podcast Dashboard overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            id="player-expanded-overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-zinc-950 text-white flex flex-col justify-between overflow-y-auto"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
              <button 
                id="expanded-collapse-btn"
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Now Playing Summary
              </span>
              <div className="flex items-center gap-2">
                {currentArticle.isDownloaded ? (
                  <span className="text-emerald-400 text-xs font-mono flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded">
                    <Check className="w-3.5 h-3.5" /> Offline Cached
                  </span>
                ) : (
                  <button
                    id="expanded-download-btn"
                    onClick={() => downloadArticleAudio(currentArticle.id)}
                    className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors"
                    title="Download offline audio copy"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Center Stage */}
            <div className="flex-1 max-w-xl mx-auto w-full px-6 py-8 flex flex-col justify-center items-center gap-6">
              {/* Cover Art / Vector Logo */}
              <div className="w-56 h-56 md:w-64 md:h-64 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative p-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-purple-500/10" />
                <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <Volume2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg leading-snug truncate w-full text-zinc-100">{currentArticle.title}</h3>
                <p className="text-zinc-400 text-sm mt-1">{currentArticle.author || 'AI Voiceover Studio'}</p>
                <span className="text-[10px] font-mono mt-4 tracking-widest text-emerald-400 bg-zinc-800/80 px-2 py-1 rounded-full uppercase">
                  Voice: {currentArticle.voiceName}
                </span>
              </div>

              {/* Text Summary Scroll View (Commuters can read along if desired) */}
              <div className="w-full bg-zinc-900/50 border border-zinc-900/80 rounded-xl p-4 h-36 overflow-y-auto text-zinc-300 text-sm leading-relaxed custom-scrollbar text-center">
                <p className="italic font-light">"{currentArticle.summary}"</p>
              </div>

              {/* Progress Bar & Durations */}
              <div className="w-full mt-4">
                <input 
                  type="range"
                  min="0"
                  max={dur}
                  step="0.1"
                  value={pos}
                  onChange={handleProgressChange}
                  className="w-full accent-emerald-500 cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-xs font-mono text-zinc-400 mt-2">
                  <span>{formatTime(pos)}</span>
                  <span>-{formatTime(Math.max(0, dur - pos))}</span>
                </div>
              </div>

              {/* Audio Controls Panel */}
              <div className="flex items-center justify-center gap-6 w-full py-2">
                <button 
                  id="expanded-prev-btn"
                  onClick={playPrev}
                  className="p-3 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipBack className="w-7 h-7" />
                </button>

                <button 
                  id="expanded-backward15-btn"
                  onClick={handleBackward15}
                  className="p-3 text-zinc-400 hover:text-white transition-colors relative flex items-center justify-center"
                  title="Rewind 15 seconds"
                >
                  <span className="text-[9px] font-bold font-mono absolute top-4.5">15</span>
                  <Timer className="w-6 h-6 rotate-180 text-zinc-400" />
                </button>

                <button 
                  id="expanded-play-btn"
                  onClick={togglePlayPause}
                  className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current text-black" />
                  ) : (
                    <Play className="w-7 h-7 fill-current text-black ml-1" />
                  )}
                </button>

                <button 
                  id="expanded-forward15-btn"
                  onClick={handleForward15}
                  className="p-3 text-zinc-400 hover:text-white transition-colors relative flex items-center justify-center"
                  title="Forward 15 seconds"
                >
                  <span className="text-[9px] font-bold font-mono absolute top-4.5">15</span>
                  <Timer className="w-6 h-6 text-zinc-400" />
                </button>

                <button 
                  id="expanded-next-btn"
                  onClick={playNextInQueue}
                  className="p-3 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipForward className="w-7 h-7" />
                </button>
              </div>
            </div>

            {/* Quick Actions (Sleep, Speed, Queue) */}
            <div className="bg-zinc-900/60 border-t border-zinc-900 p-6 flex items-center justify-around text-sm">
              
              {/* Playback Speed Menu */}
              <div className="relative">
                <button 
                  id="speed-menu-trigger"
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowSleepMenu(false);
                  }}
                  className={`flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-lg transition-colors ${showSpeedMenu ? 'bg-emerald-950 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{speed.toFixed(2)}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 text-left flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Playback Speed</span>
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded">
                        {speed.toFixed(2)}x
                      </span>
                    </div>

                    {/* Slider input */}
                    <div className="flex flex-col gap-1">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={speed}
                        onChange={(e) => {
                          const s = parseFloat(e.target.value);
                          setPlaybackSpeed(s);
                        }}
                        className="w-full accent-emerald-500 cursor-pointer bg-zinc-800 h-1.5 rounded-lg appearance-none no-swipe"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
                        <span>0.5x</span>
                        <span>1.0x</span>
                        <span>1.5x</span>
                        <span>2.0x</span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 my-1"></div>

                    {/* Quick Presets */}
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Presets</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0.5, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setPlaybackSpeed(s);
                          }}
                          className={`px-1.5 py-1 rounded text-center text-[11px] font-mono transition-colors ${
                            Math.abs(speed - s) < 0.01
                              ? 'bg-emerald-500 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sleep Timer Settings */}
              <div className="relative">
                <button 
                  id="sleep-timer-trigger"
                  onClick={() => {
                    setShowSleepMenu(!showSleepMenu);
                    setShowSpeedMenu(false);
                  }}
                  className={`flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-lg transition-colors ${sleepTimerDuration ? 'bg-indigo-950 text-indigo-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                >
                  <Moon className="w-4 h-4" />
                  <span>{sleepTimerDuration ? `${sleepTimerDuration}m` : 'Off'}</span>
                </button>

                {showSleepMenu && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
                    <p className="text-[10px] text-zinc-500 font-bold tracking-wider px-3 py-1.5 uppercase">Sleep Presets</p>
                    <button
                      onClick={() => {
                        setSleepTimer(null);
                        setShowSleepMenu(false);
                      }}
                      className="w-full px-4 py-2 hover:bg-zinc-800 text-left text-xs text-zinc-400"
                    >
                      Turn Off Timer
                    </button>
                    {[5, 15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSleepTimer(m);
                          setShowSleepMenu(false);
                        }}
                        className={`w-full px-4 py-2 hover:bg-zinc-800 text-left flex items-center justify-between text-xs ${sleepTimerDuration === m ? 'text-indigo-400 font-bold' : 'text-zinc-300'}`}
                      >
                        <span>{m} minutes</span>
                        {sleepTimerDuration === m && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AirPlay / Cast style decorative status */}
              <div className="flex items-center text-zinc-400 hover:text-white transition-colors cursor-pointer gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-xs font-mono">commutenews v1</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playback Error Alert Toast */}
      <AnimatePresence>
        {playbackState.playbackError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 bg-red-950/95 border border-red-800 text-red-200 rounded-xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3"
          >
            <div className="p-1 bg-red-900/50 rounded-lg text-red-400 mt-0.5 flex-shrink-0">
              <span className="text-sm font-bold">⚠️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-xs text-white">Playback Issue</h5>
              <p className="text-[11px] text-red-300 mt-1 leading-relaxed">{playbackState.playbackError}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearPlaybackError();
              }}
              className="p-1 hover:bg-red-900/30 rounded-full text-red-400 hover:text-red-200 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
