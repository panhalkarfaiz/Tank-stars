import React from 'react';
import { Trophy, Swords, Check, ArrowRight, Shield, Award, RotateCcw } from 'lucide-react';
import { TournamentMatch, TankConfig } from '../types';
import { TANK_ROSTER } from '../game/constants';
import { soundManager } from '../audio/soundManager';

interface TournamentViewProps {
  playerTankId: string;
  currentRound: number;
  matches: TournamentMatch[];
  onStartRound: (round: number) => void;
  onBackToMenu: () => void;
  onResetTournament: () => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  playerTankId,
  currentRound,
  matches,
  onStartRound,
  onBackToMenu,
  onResetTournament,
}) => {
  const playerTank = TANK_ROSTER.find((t) => t.id === playerTankId) || TANK_ROSTER[0];
  const isChampion = currentRound > 5 && matches.every((m) => m.won);

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 sm:p-8 text-white select-none overflow-y-auto">
      {/* HEADER */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">ARCADE TOURNAMENT BRACKET</h2>
            <p className="text-xs text-slate-400">Battle 5 opposing commanders to claim the Tank Stars Cup.</p>
          </div>
        </div>

        <button
          onClick={onBackToMenu}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition active:scale-95"
        >
          Exit to Menu
        </button>
      </header>

      {/* CENTER LADDER LIST */}
      <main className="w-full max-w-3xl mx-auto my-auto py-6 flex flex-col gap-3">
        {matches.map((match) => {
          const oppTank = TANK_ROSTER.find((t) => t.id === match.opponentTankId) || TANK_ROSTER[1];
          const isCurrent = currentRound === match.round;
          const isPassed = match.completed && match.won;
          const isLocked = match.round > currentRound;

          return (
            <div
              key={match.round}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                isPassed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-300'
                  : isCurrent
                  ? 'bg-slate-900 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-2 ring-purple-400/40 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                    isPassed
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isPassed ? <Check className="w-5 h-5 stroke-[3]" /> : `R${match.round}`}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-white">
                      {match.round === 5 ? `BOSS: ${oppTank.name}` : `Round ${match.round}: vs ${oppTank.name}`}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        match.difficulty === 'hard'
                          ? 'bg-red-500/20 text-red-400'
                          : match.difficulty === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {match.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{oppTank.tagline}</div>
                </div>
              </div>

              {isCurrent && (
                <button
                  id={`btn-tournament-fight-r${match.round}`}
                  onClick={() => {
                    soundManager.playClick();
                    onStartRound(match.round);
                  }}
                  className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  FIGHT <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {isPassed && <span className="text-xs font-black text-emerald-400 uppercase">DEFEATED</span>}
            </div>
          );
        })}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-4xl mx-auto flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">CHAMPION CANDIDATE:</span>
          <span className="text-xs font-black text-amber-300">{playerTank.name}</span>
        </div>

        <button
          onClick={onResetTournament}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Tournament
        </button>
      </footer>
    </div>
  );
};
