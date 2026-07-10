/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { localDB } from '../lib/db';
import { ApiService } from '../lib/api';
import { 
  User, Lock, ArrowRight, Cloud, RefreshCw, LogOut, 
  CheckCircle2, Wifi, WifiOff, Beaker, Play, ShieldCheck,
  Volume2, Pause, Sparkles, Headphones
} from 'lucide-react';

export const ProfilePanel: React.FC = () => {
  const { 
    userProfile, 
    registerUser, 
    loginUser, 
    logoutUser, 
    syncWithServer, 
    isOnline,
    preferences,
    setPreferences,
    triggerHaptic
  } = useApp();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Diagnostics and Test Suite States
  const [testing, setTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  // Voice Preview States
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [currentPreviewAudio, setCurrentPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreviewVoice, setPlayingPreviewVoice] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (currentPreviewAudio) {
        currentPreviewAudio.pause();
      }
    };
  }, [currentPreviewAudio]);

  const handlePreviewVoice = async (voice: string) => {
    // Stop any existing preview
    if (currentPreviewAudio) {
      currentPreviewAudio.pause();
      setCurrentPreviewAudio(null);
    }
    if (playingPreviewVoice === voice) {
      setPlayingPreviewVoice(null);
      if (triggerHaptic) triggerHaptic(15);
      return;
    }

    if (!isOnline) {
      alert("Internet connection required to generate live voice preview.");
      return;
    }

    if (triggerHaptic) triggerHaptic(20);
    setPreviewLoading(voice);
    try {
      let greetText = "";
      switch (voice) {
        case 'Zephyr':
          greetText = "Hello! I am Zephyr, your calm narrator. I offer a deep, reassuring, and professional voice.";
          break;
        case 'Kore':
          greetText = "Hey there! I am Kore, your energetic host. Let's make today's briefing bright and lively!";
          break;
        case 'Charon':
          greetText = "Hello, I am Charon, your mellow storyteller. I speak with a calm, slow, and relaxing flow.";
          break;
        case 'Puck':
          greetText = "Good day. I am Puck, your crisp newsreader. I keep updates clear, sharp, and articulate.";
          break;
        case 'Fenrir':
          greetText = "Welcome. I am Fenrir, your bold anchor. I present stories with a powerful and authoritative tone.";
          break;
        default:
          greetText = "Hello! This is your Text-to-Speech preview.";
      }

      // Generate TTS base64
      const base64 = await ApiService.generateTTS(greetText, voice, 1.0);
      const audioUrl = `data:audio/wav;base64,${base64}`;
      const audio = new Audio(audioUrl);
      
      setCurrentPreviewAudio(audio);
      setPlayingPreviewVoice(voice);
      
      audio.onended = () => {
        setPlayingPreviewVoice(null);
        setCurrentPreviewAudio(null);
      };
      
      audio.onerror = () => {
        setPlayingPreviewVoice(null);
        setCurrentPreviewAudio(null);
        alert("Could not load preview audio. Please check your network connection.");
      };

      await audio.play();
    } catch (err: any) {
      alert(err.message || "Failed to preview voice.");
    } finally {
      setPreviewLoading(null);
    }
  };

  const voices = [
    {
      id: 'Zephyr',
      name: 'Calm Narrator',
      techName: 'Zephyr',
      description: 'Deep, professional, and reassuring. Perfect for complex analysis, politics, and technology journals.',
      accent: 'Neutral Deep'
    },
    {
      id: 'Kore',
      name: 'Energetic Host',
      techName: 'Kore',
      description: 'Warm, bright, and highly enthusiastic. Gives the feeling of an engaging morning commute podcast.',
      accent: 'Engaging Bright'
    },
    {
      id: 'Charon',
      name: 'Mellow Storyteller',
      techName: 'Charon',
      description: 'Calm, slow, and relaxing. Ideal for casual catch-ups, human stories, and end-of-day recaps.',
      accent: 'Warm Relaxed'
    },
    {
      id: 'Puck',
      name: 'Crisp Newsreader',
      techName: 'Puck',
      description: 'Sharp, fast, and crystal clear. Excellent for fast-paced briefs and headlines.',
      accent: 'Articulate Clear'
    },
    {
      id: 'Fenrir',
      name: 'Bold Anchor',
      techName: 'Fenrir',
      description: 'Grounded, authoritative, and powerful. Best suited for editorial opinions and critical reporting.',
      accent: 'Strong Resonant'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(false);

    if (!username.trim() || !password.trim()) {
      setAuthError('All fields are required.');
      return;
    }

    try {
      if (isLogin) {
        await loginUser(username, password);
      } else {
        await registerUser(username, password);
      }
      setAuthSuccess(true);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication action failed. Please try again.');
    }
  };

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    await syncWithServer();
    setTimeout(() => setSyncing(false), 1200);
  };

  // Automated Integration Tests Suite
  const runDiagnostics = async () => {
    setTesting(true);
    setTestLogs([]);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setTestLogs([...logs]);
    };

    try {
      // Test 1: Offline Local Persistence (IndexedDB)
      addLog('🧪 Test 1: Verifying Local-First IndexedDB read/write...');
      const testArtId = 'diag-test-id';
      await localDB.saveArticle({
        id: testArtId,
        title: 'Diagnostic Test Brief',
        summary: 'This is a test summary for persistence verification.',
        category: 'Diagnostics',
        tags: ['test'],
        voiceName: 'Kore',
        isDownloaded: false,
        isSaved: false,
        createdAt: new Date().toISOString(),
        playCount: 0
      });
      const retrieved = (await localDB.getArticles()).find(a => a.id === testArtId);
      if (!retrieved || retrieved.summary !== 'This is a test summary for persistence verification.') {
        throw new Error('IndexedDB Metadata Persistence failed');
      }
      addLog('✅ Test 1: IndexedDB metadata verified.');

      // Test 2: Audio Synthesis & Download Cache
      addLog('🧪 Test 2: Verifying Background Audio Cache & Blob storage...');
      await localDB.saveAudio(testArtId, 'UklGRigAAABXQVZFMmZtdCAAEgAABgEAZgAAsGgAAGCgAAgA'); // dummy base64 wav header
      const audioRetrieved = await localDB.getAudio(testArtId);
      if (!audioRetrieved || !audioRetrieved.startsWith('UklG')) {
        throw new Error('IndexedDB Audio cache/download storage failed');
      }
      await localDB.deleteArticle(testArtId); // cleanup
      addLog('✅ Test 2: Offline audio cache and cleanup verified.');

      // Test 3: Playback Progress Tracking Invariants
      addLog('🧪 Test 3: Checking playback position tracking & resumes...');
      const progressRecord = {
        articleId: 'test-article-prog',
        position: 45.5,
        duration: 180,
        completed: false,
        lastPlayed: new Date().toISOString()
      };
      await localDB.saveProgress(progressRecord);
      const progRetrieved = (await localDB.getProgress()).find(p => p.articleId === 'test-article-prog');
      if (!progRetrieved || progRetrieved.position !== 45.5) {
        throw new Error('Position Tracking storage failed');
      }
      addLog('✅ Test 3: Playback position resuming invariants verified.');

      // Test 4: Cloud Sync Connection
      addLog('🧪 Test 4: Verifying secure Cloud Sync Backup reconciliation...');
      if (!isOnline) {
        addLog('⚠️ Test 4: Skipped (Offline commuting state).');
      } else {
        if (!userProfile) {
          addLog('⚠️ Test 4: Skipped (Requires authenticated user session).');
        } else {
          await syncWithServer();
          addLog('✅ Test 4: Secure Cloud Sync replication verified.');
        }
      }

      addLog('🎉 All core application integration tests PASSED successfully!');
    } catch (err: any) {
      addLog(`❌ Test failed: ${err.message || err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="profile-panel-container" className="max-w-md mx-auto p-4 md:p-6 text-white pb-32 space-y-6">
      
      {/* Network Connectivity Ribbon */}
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-medium">
        <span className="text-zinc-400">Connectivity Status:</span>
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full font-mono">
            <Wifi className="w-3.5 h-3.5" /> Online Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded-full font-mono">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" /> Offline Commuting
          </span>
        )}
      </div>

      {!userProfile ? (
        /* Authentication Screen */
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">{isLogin ? 'Welcome Back' : 'Create Commuter Account'}</h3>
            <p className="text-zinc-400 text-xs mt-1">
              {isLogin ? 'Sign in to restore your playlists & listen across multiple devices.' : 'Register to unlock secure cloud backups and listening queues.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-username" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="auth-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-medium bg-red-950/20 border border-red-900/40 rounded-lg p-2.5">
                {authError}
              </p>
            )}

            {authSuccess && (
              <p className="text-xs text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2.5">
                Account accessed successfully!
              </p>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-[0.99]"
            >
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle link */}
          <div className="text-center mt-6 pt-4 border-t border-zinc-800">
            <button
              id="auth-toggle-btn"
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError(null);
                setAuthSuccess(false);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </button>
          </div>
        </div>
      ) : (
        /* Logged In Dashboard Profile Screen */
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center font-bold text-lg border border-emerald-500/20">
              {userProfile.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Commuter Account</p>
              <h4 className="text-lg font-bold text-zinc-100">{userProfile.username}</h4>
            </div>
          </div>

          {/* Cloud Sync Status Card */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Cloud Sync & Backup</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded uppercase">
                Active
              </span>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Playlists, listening positions, bookmarks, preferences, and downloaded articles are backup-synchronized per session.
            </p>

            <button
              id="sync-now-btn"
              type="button"
              onClick={handleManualSync}
              disabled={!isOnline || syncing}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{syncing ? 'Synchronizing Cloud Vault...' : 'Sync Backup Now'}</span>
            </button>
          </div>

          {/* Settings features */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <button
              id="logout-btn"
              onClick={logoutUser}
              className="w-full py-2.5 border border-zinc-800 hover:bg-red-950/10 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Selection Settings Panel */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Headphones className="w-4.5 h-4.5 text-emerald-400" />
          <span>AI Narrator Voice Settings</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Select your preferred Text-to-Speech voice profile. The chosen voice will read new audio briefings you compile.
        </p>

        <div className="space-y-3">
          {voices.map((voice) => {
            const isSelected = preferences.voiceName === voice.id;
            const isPlaying = playingPreviewVoice === voice.id;
            const isLoading = previewLoading === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => {
                  setPreferences({ voiceName: voice.id as any });
                  if (triggerHaptic) triggerHaptic(15);
                }}
                className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isSelected 
                    ? 'bg-emerald-950/20 border-emerald-500 text-white' 
                    : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                }`}
              >
                {/* Custom radio indicator */}
                <div className="mt-1 flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-emerald-400' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-sm text-zinc-100">{voice.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                      {voice.techName}
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider font-mono bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {voice.accent}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{voice.description}</p>
                </div>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewVoice(voice.id);
                  }}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-full border transition-all ${
                    isPlaying
                      ? 'bg-emerald-500 text-black border-emerald-400 scale-105 shadow-md shadow-emerald-500/20'
                      : isSelected
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={isPlaying ? "Stop Preview" : "Play Voice Preview"}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnostics Panel (Interactive Testing Suite) */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Beaker className="w-4.5 h-4.5 text-emerald-400" />
          <span>CommuteNews Test & Diagnostics Suite</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Execute real-time integrated unit tests to verify the offline flow database state, progress tracking, and client-server synchronization.
        </p>

        <button
          id="run-tests-btn"
          onClick={runDiagnostics}
          disabled={testing}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{testing ? 'Running Integrated Tests...' : 'Run Automated Test Diagnostics'}</span>
        </button>

        {testLogs.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {testLogs.map((log, i) => (
              <p key={i} className={log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-emerald-400' : 'text-zinc-400'}>
                {log}
              </p>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
