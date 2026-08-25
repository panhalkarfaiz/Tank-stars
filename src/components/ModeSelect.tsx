import React from 'react';
import {
  Swords,
  Users,
  Trophy,
  Target,
  Shield,
  Volume2,
  VolumeX,
  Settings,
  Flame,
  Zap,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { GameMode, AIDifficulty } from '../types';
import { soundManager } from '../audio/soundManager';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onOpenSettings: () => void;
  onOpenHangar: () => void;
  difficulty: AIDifficulty;
  onDifficultyChange: (diff: AIDifficulty) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({
  onSelectMode,
  onOpenSettings,
  onOpenHangar,
  difficulty,
  onDifficultyChange,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto">
      {/* TOP BAR */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)]">
            <Flame className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2">
              TANK STARS <span className="text-amber-400">3D</span>
            </h1>
            <span className="text-[11px] font-mono text-slate-400 font-bold">TURN-BASED ARTILLERY SHOWDOWN</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-main-mute-toggle"
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition active:scale-95 shadow"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
          <button
            id="btn-main-settings"
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition active:scale-95 shadow"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CENTER GAME MODE CARDS */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* SINGLE PLAYER VS AI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-5 hover:border-amber-400/60 transition group shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Swords className="w-28 h-28 text-amber-400" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Swords className="w-6 h-6" />
              </div>
              {/* AI Difficulty Stepper */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      soundManager.playClick();
                      onDifficultyChange(d);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition ${
                      difficulty === d
                        ? d === 'hard'
                          ? 'bg-red-600 text-white'
                          : d === 'medium'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <h3 className="text-xl font-black text-white mt-4 group-hover:text-amber-300 transition">SINGLE PLAYER</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Test your artillery trajectory precision against adaptive AI. Choose your tank and battle across deformable 3D arenas.
            </p>
          </div>

          <button
            id="btn-start-single-player"
            onClick={() => {
              soundManager.playClick();
              onSelectMode('single');
            }}
            className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            PLAY VS AI <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2 PLAYER PASS & PLAY (HOTSEAT) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-5 hover:border-blue-400/60 transition group shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Users className="w-28 h-28 text-blue-400" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white mt-4 group-hover:text-blue-300 transition">2 PLAYER HOTSEAT</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Pass & Play turn-based battle on the same device. Red vs Blue in an all-out tactical ballistic duel with full arsenal access.
            </p>
          </div>

          <button
            id="btn-start-2-player"
            onClick={() => {
              soundManager.playClick();
              onSelectMode('twoplayer');
            }}
            className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            PLAY 2 PLAYER <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* TOURNAMENT LADDER */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-5 hover:border-purple-400/60 transition group shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Trophy className="w-28 h-28 text-purple-400" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white mt-4 group-hover:text-purple-300 transition">TOURNAMENT ARCADE</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Climb a 5-round championship ladder against rival commanders. Defeat the final Atomic Behemoth boss to claim the trophy.
            </p>
          </div>

          <button
            id="btn-start-tournament"
            onClick={() => {
              soundManager.playClick();
              onSelectMode('tournament');
            }}
            className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            START TOURNAMENT <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* FOOTER SHORTCUTS: PRACTICE RANGE & TANK HANGAR */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-3">
          <button
            id="btn-open-hangar"
            onClick={onOpenHangar}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-300 flex items-center gap-2 transition active:scale-95 shadow"
          >
            <Shield className="w-4 h-4" /> 3D ARMORY & HANGAR (ALL 10 TANKS)
          </button>
          <button
            id="btn-practice-range"
            onClick={() => {
              soundManager.playClick();
              onSelectMode('practice');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition active:scale-95 shadow"
          >
            <Target className="w-4 h-4 text-cyan-400" /> PRACTICE SHOOTING RANGE
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          WebGL 3D Engine • Destructible Physics • Three.js
        </div>
      </footer>
    </div>
  );
};
