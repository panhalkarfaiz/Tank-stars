import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Home, Swords, Award, Shield, Flame, Crosshair } from 'lucide-react';
import { TankState, GameMode } from '../types';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  winnerPlayerIndex: 1 | 2;
  p1State: TankState;
  p2State: TankState;
  gameMode: GameMode;
  onRematch: () => void;
  onSelectTanks: () => void;
  onBackToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winnerPlayerIndex,
  p1State,
  p2State,
  gameMode,
  onRematch,
  onSelectTanks,
  onBackToMenu,
}) => {
  const isP1Winner = winnerPlayerIndex === 1;
  const winnerTank = isP1Winner ? p1State : p2State;
  const loserTank = isP1Winner ? p2State : p1State;

  const isUserDefeated = gameMode === 'single' && !isP1Winner;

  useEffect(() => {
    if (!isUserDefeated) {
      soundManager.playVictory();
      // Shoot festive confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isUserDefeated]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5 text-white animate-in fade-in zoom-in-95 duration-200">
        {/* BANNER ICON */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border ${
            isUserDefeated
              ? 'bg-red-950/80 border-red-500/40 text-red-400'
              : 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
          }`}
        >
          {isUserDefeated ? <Skull className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
        </div>

        {/* TITLE */}
        <div>
          <span
            className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
              isP1Winner
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                : 'bg-red-600/30 text-red-300 border-red-500/40'
            }`}
          >
            {gameMode === 'twoplayer'
              ? `${isP1Winner ? 'PLAYER 1 (BLUE)' : 'PLAYER 2 (RED)'} WINS!`
              : isP1Winner
              ? 'VICTORY!'
              : 'DEFEAT!'}
          </span>
          <h2 className="text-3xl font-black mt-2 tracking-tight">
            {winnerTank.name} <span className="text-amber-400">TRIUMPHS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isUserDefeated
              ? 'Your tank was obliterated in the artillery crossfire. Adjust your angle and retry!'
              : 'Superior ballistic calculations and tactical firepower dominated the battlefield!'}
          </p>
        </div>

        {/* MATCH STATS CARD */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-1.5">
            <span className="font-bold uppercase">WINNER HP REMAINING</span>
            <span className="font-mono font-black text-emerald-400">
              {winnerTank.health} / {winnerTank.maxHealth}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold uppercase">OPPONENT DESTROYED</span>
            <span className="font-mono font-black text-red-400">{loserTank.name}</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="w-full flex flex-col gap-2.5 mt-1">
          <button
            id="btn-gameover-rematch"
            onClick={() => {
              soundManager.playClick();
              onRematch();
            }}
            className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN (REMATCH)
          </button>
          <div className="flex items-center gap-2 w-full">
            <button
              id="btn-gameover-swap-tanks"
              onClick={() => {
                soundManager.playClick();
                onSelectTanks();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            >
              CHANGE TANKS
            </button>
            <button
              id="btn-gameover-main-menu"
              onClick={() => {
                soundManager.playClick();
                onBackToMenu();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
