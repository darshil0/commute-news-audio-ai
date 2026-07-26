/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, FileText, Sparkles, AlertCircle, Search, ExternalLink, Play, Radio, CheckCircle2 } from 'lucide-react';
import { ApiService, SearchNewsResponse } from '../lib/api';
import { SummaryLength, SummaryTone, VoiceName } from '../types';

export const IntakePanel: React.FC = () => {
  const { preferences, setPreferences, addArticleText, importArticleUrl, addGroundedArticle, playArticle, isOnline } = useApp();

  const [mode, setMode] = useState<'url' | 'text' | 'search'>('url');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchNewsResponse | null>(null);

  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isOnline) {
      setErrorMsg('You must be online to import and summarize articles.');
      return;
    }

    setLocalLoading(true);

    try {
      if (mode === 'url') {
        if (!url || !url.startsWith('http')) {
          throw new Error('Please enter a valid URL starting with http:// or https://');
        }
        await importArticleUrl(url);
        setSuccessMsg('URL fetched, summarized, and voiceover script created!');
        setUrl('');
      } else if (mode === 'text') {
        if (!pastedText || pastedText.length < 50) {
          throw new Error('Pasted news text must be at least 50 characters.');
        }
        await addArticleText(title || 'Pasted News Brief', pastedText);
        setSuccessMsg('News article summarized and compiled successfully!');
        setPastedText('');
        setTitle('');
      } else if (mode === 'search') {
        if (!searchQuery.trim()) {
          throw new Error('Please enter a news topic or topic search query.');
        }
        const res = await ApiService.searchNews(searchQuery, preferences);
        setSearchResult(res);
        setSuccessMsg('Live search grounded news summary generated!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed. Please check the network or try another source.';
      setErrorMsg(msg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAddAndPlayGrounded = async () => {
    if (!searchResult) return;
    try {
      setLocalLoading(true);
      const article = await addGroundedArticle(
        searchResult.title,
        searchResult.category,
        searchResult.summary,
        searchResult.sources[0]?.url
      );
      setSuccessMsg('Grounded news brief saved! Starting playback...');
      await playArticle(article.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to play audio brief.';
      setErrorMsg(msg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSaveGroundedOnly = async () => {
    if (!searchResult) return;
    try {
      setLocalLoading(true);
      await addGroundedArticle(
        searchResult.title,
        searchResult.category,
        searchResult.summary,
        searchResult.sources[0]?.url
      );
      setSuccessMsg('Grounded news brief saved to your library!');
      setSearchResult(null);
      setSearchQuery('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save brief.';
      setErrorMsg(msg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div id="intake-panel-container" className="max-w-2xl mx-auto p-4 md:p-6 text-white pb-32">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <span>New Audio Intake</span>
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Search live news with Gemini Search Grounding, paste article text, or import URLs to generate audio briefings.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex border-b border-zinc-800 mb-6 bg-zinc-900/50 p-1 rounded-lg">
        <button
          id="intake-mode-url"
          type="button"
          onClick={() => { setMode('url'); setErrorMsg(null); setSuccessMsg(null); setSearchResult(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${mode === 'url' ? 'bg-zinc-800 text-emerald-400 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <Globe className="w-4 h-4" />
          <span>Web URL</span>
        </button>
        <button
          id="intake-mode-search"
          type="button"
          onClick={() => { setMode('search'); setErrorMsg(null); setSuccessMsg(null); setSearchResult(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${mode === 'search' ? 'bg-zinc-800 text-emerald-400 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <Search className="w-4 h-4" />
          <span className="flex items-center gap-1">
            <span>Live Search</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">Grounding</span>
          </span>
        </button>
        <button
          id="intake-mode-text"
          type="button"
          onClick={() => { setMode('text'); setErrorMsg(null); setSuccessMsg(null); setSearchResult(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${mode === 'text' ? 'bg-zinc-800 text-emerald-400 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Text</span>
        </button>
      </div>

      <form onSubmit={handleProcess} className="space-y-6">
        {/* Mode Inputs */}
        {mode === 'url' && (
          <div>
            <label htmlFor="url-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Article Web Address
            </label>
            <div className="relative">
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://news.ycombinator.com/item?id=..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm transition-all"
                disabled={localLoading}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 italic">
              * Supports most major news websites, blog posts, and text-heavy columns.
            </p>
          </div>
        )}

        {mode === 'search' && (
          <div>
            <label htmlFor="search-query-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Real-Time News Topic / Search Query
            </label>
            <div className="relative">
              <input
                id="search-query-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., SpaceX Starship launch, EV battery breakthroughs, AI regulations..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm transition-all"
                disabled={localLoading}
              />
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Uses Gemini Search Grounding to aggregate live web sources in real-time.</span>
            </p>
          </div>
        )}

        {mode === 'text' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="text-title" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Article Title (Optional)
              </label>
              <input
                id="text-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Breakthrough in Battery Storage Technology"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm transition-all"
                disabled={localLoading}
              />
            </div>
            <div>
              <label htmlFor="text-body" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Raw Article Content
              </label>
              <textarea
                id="text-body"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full article text body here..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 px-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-sm leading-relaxed transition-all resize-none"
                disabled={localLoading}
              />
              <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                <span>Minimum 50 characters required</span>
                <span>{pastedText.length} characters</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Voiceover Preferences Configurator Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Voice & Audio Settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Length Preference */}
            <div>
              <label htmlFor="pref-length" className="block text-xs text-zinc-400 mb-1.5 font-medium">Summary Length</label>
              <select
                id="pref-length"
                value={preferences.summaryLength}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreferences({ summaryLength: e.target.value as SummaryLength })}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                disabled={localLoading}
              >
                <option value="short">Brief Briefing (~100 words)</option>
                <option value="medium">Standard Commute (~200 words)</option>
                <option value="detailed">In-depth Script (~300-400 words)</option>
              </select>
            </div>

            {/* Tone Preference */}
            <div>
              <label htmlFor="pref-tone" className="block text-xs text-zinc-400 mb-1.5 font-medium">Script Tone / Style</label>
              <select
                id="pref-tone"
                value={preferences.summaryTone}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreferences({ summaryTone: e.target.value as SummaryTone })}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                disabled={localLoading}
              >
                <option value="engaging">Podcast Storytelling (Engaging)</option>
                <option value="professional">Professional Newsletter (Formal)</option>
                <option value="concise">Bullet Brief (Straight-to-the-point)</option>
              </select>
            </div>

            {/* Voice Preference */}
            <div>
              <label htmlFor="pref-voice" className="block text-xs text-zinc-400 mb-1.5 font-medium">TTS voice narrator</label>
              <select
                id="pref-voice"
                value={preferences.voiceName}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreferences({ voiceName: e.target.value as VoiceName })}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                disabled={localLoading}
              >
                <option value="Zephyr">Zephyr (Deep & Professional)</option>
                <option value="Kore">Kore (Warm & Enthusiastic)</option>
                <option value="Puck">Puck (Crisp & Articulate)</option>
                <option value="Charon">Charon (Calm & Informative)</option>
                <option value="Fenrir">Fenrir (Bold & Grounded)</option>
              </select>
            </div>

            {/* Speeds */}
            <div>
              <label htmlFor="pref-speed" className="block text-xs text-zinc-400 mb-1.5 font-medium">Default Narrator Speed</label>
              <select
                id="pref-speed"
                value={preferences.playbackSpeed}
                onChange={(e) => setPreferences({ playbackSpeed: parseFloat(e.target.value) })}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                disabled={localLoading}
              >
                <option value="0.75">Slower (0.75x)</option>
                <option value="1.0">Normal (1.0x)</option>
                <option value="1.25">Slightly Fast (1.25x)</option>
                <option value="1.5">Fast (1.5x)</option>
                <option value="2.0">Sprint (2.0x)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-4 flex items-start gap-3 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Generation Error</p>
              <p className="text-xs text-red-300/90 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-4 flex items-start gap-3 text-sm text-emerald-400">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/90 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          id="intake-submit-btn"
          type="submit"
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-[0.99]"
          disabled={localLoading || (mode === 'url' ? !url : mode === 'text' ? !pastedText : !searchQuery)}
        >
          {localLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{mode === 'search' ? 'Grounding Real-Time Search...' : 'Generating Audio Brief...'}</span>
            </>
          ) : (
            <>
              {mode === 'search' ? <Search className="w-4 h-4" /> : <Sparkles className="w-4 h-4 fill-current" />}
              <span>{mode === 'search' ? 'Search Live News Grounding' : 'Generate Audio Brief'}</span>
            </>
          )}
        </button>
      </form>

      {/* Grounded Search Result Preview Card */}
      {searchResult && (
        <div id="grounded-search-result-card" className="mt-8 bg-zinc-900 border border-emerald-900/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/60">
                <Radio className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Search Grounded Summary</span>
                <h3 className="text-base font-bold text-zinc-100">{searchResult.title}</h3>
              </div>
            </div>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700/50">
              {searchResult.category}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-4 rounded-lg border border-zinc-800/80">
            {searchResult.summary}
          </div>

          {/* Sources / Grounding Citations */}
          {searchResult.sources && searchResult.sources.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Grounded Web Sources ({searchResult.sources.length}):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchResult.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 p-2 bg-zinc-800/50 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-emerald-400 rounded border border-zinc-700/40 transition-all truncate"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 text-zinc-500" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No explicit web sources returned for this summary.</p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="add-play-grounded-btn"
              type="button"
              onClick={handleAddAndPlayGrounded}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              disabled={localLoading}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Add & Play Audio Now</span>
            </button>
            <button
              id="save-grounded-btn"
              type="button"
              onClick={handleSaveGroundedOnly}
              className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg text-sm flex items-center justify-center gap-2 border border-zinc-700/60 transition-all cursor-pointer"
              disabled={localLoading}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Save to Briefs</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

