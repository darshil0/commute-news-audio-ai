/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { HomeDashboard } from "./components/HomeDashboard";
import { IntakePanel } from "./components/IntakePanel";
import { PlaylistPanel } from "./components/PlaylistPanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { QueuePanel } from "./components/QueuePanel";
import { PodcastPlayer } from "./components/PodcastPlayer";
import { Headphones, Sparkles, ListMusic, User, PlayCircle, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const TABS = ["home", "intake", "playlists", "queue", "profile"] as const;
type TabKey = (typeof TABS)[number];

function CommuteAppContent() {
  const { activeTab, setActiveTab, preferences, setPreferences } = useApp();

  const isDark = preferences.theme === "dark";

  const toggleTheme = useCallback(() => {
    setPreferences({ theme: isDark ? "light" : "dark" });
  }, [isDark, setPreferences]);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const firstTouch = e.touches[0];
    touchStartX.current = firstTouch.clientX;
    touchStartY.current = firstTouch.clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const firstTouch = e.changedTouches[0];
      const diffX = firstTouch.clientX - touchStartX.current;
      const diffY = firstTouch.clientY - touchStartY.current;
      const duration = Date.now() - touchStartTime.current;

      touchStartX.current = null;
      touchStartY.current = null;

      if (duration >= 450 || Math.abs(diffX) <= 60 || Math.abs(diffX) <= Math.abs(diffY) * 1.5) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input") ||
        target?.closest("textarea") ||
        target?.closest("button") ||
        target?.closest("select") ||
        target?.closest('[role="slider"]') ||
        target?.closest(".no-swipe")
      ) {
        return;
      }

      const currentIndex = TABS.indexOf(activeTab as TabKey);
      if (currentIndex === -1) return;

      if (diffX < 0 && currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (diffX > 0 && currentIndex > 0) {
        setActiveTab(TABS[currentIndex - 1]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [activeTab, setActiveTab]
  );

  const navItems = useMemo(
    () => [
      { id: "home", label: "Commuter Feed", icon: Headphones },
      { id: "intake", label: "New Audio Intake", icon: Sparkles },
      { id: "playlists", label: "Playlists", icon: ListMusic },
      { id: "queue", label: "Up Next Queue", icon: PlayCircle },
      { id: "profile", label: "Sync Account", icon: User },
    ],
    []
  );

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
        isDark ? "bg-zinc-950 text-white" : "bg-orange-50/30 text-zinc-900"
      }`}
    >
      <header
        className={`px-4 py-4 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-30 transition-colors ${
          isDark ? "bg-zinc-950/80 border-zinc-900" : "bg-white/80 border-zinc-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-md font-bold">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight font-sans flex items-center gap-1.5">
              <span>CommuteNews</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-medium">
                AUDIO AI
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-pressed={isDark}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isDark
              ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
              : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
          }`}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col md:flex-row relative">
        <aside
          className={`hidden md:flex flex-col gap-1.5 w-60 p-4 border-r transition-colors ${
            isDark ? "border-zinc-900 bg-zinc-950/30" : "border-zinc-100 bg-orange-50/10"
          }`}
          aria-label="Primary navigation"
        >
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`aside-nav-${id}`}
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-emerald-500 text-black shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <section className="flex-1 min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              {activeTab === "home" && <HomeDashboard />}
              {activeTab === "intake" && <IntakePanel />}
              {activeTab === "playlists" && <PlaylistPanel />}
              {activeTab === "queue" && <QueuePanel />}
              {activeTab === "profile" && <ProfilePanel />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <PodcastPlayer />

      <nav
        className={`md:hidden fixed bottom-14 left-0 right-0 z-30 border-t flex items-center justify-around py-2.5 px-2 backdrop-blur-md transition-colors ${
          isDark ? "bg-zinc-950/95 border-zinc-900 text-white" : "bg-white/95 border-zinc-150 text-zinc-900"
        }`}
        aria-label="Mobile navigation"
      >
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            id={`mobile-nav-${id}`}
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === id ? "text-emerald-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <CommuteAppContent />
    </AppProvider>
  );
}
