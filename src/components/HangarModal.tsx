import React, { useState } from 'react';
import { Shield, Flame, Gauge, Crosshair, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { TANK_ROSTER } from '../game/constants';
import { soundManager } from '../audio/soundManager';
import { Hangar3DViewer } from './Hangar3DViewer';

interface HangarModalProps {
  onClose: () => void;
  onSelectTankForBattle: (tankId: string) => void;
}

export const HangarModal: React.FC<HangarModalProps> = ({ onClose, onSelectTankForBattle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  const tank = TANK_ROSTER[currentIndex];

  const handleNext = () => {
    soundManager.playClick();
    setCurrentIndex((prev) => (prev + 1) % TANK_ROSTER.length);
    setSelectedWeaponIdx(0);
  };

  const handlePrev = () => {
    soundManager.playClick();
    setCurrentIndex((prev) => (prev - 1 + TANK_ROSTER.length) % TANK_ROSTER.length);
    setSelectedWeaponIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 3D HANGAR SHOWCASE
            </span>
            <h2 className="text-lg sm:text-xl font-black">ALL {TANK_ROSTER.length} TANKS UNLOCKED</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D INTERACTIVE TANK VIEWPORT & CONTROLS */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={handlePrev}
            title="Previous Tank"
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95 shadow shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* 3D Canvas Container */}
          <div className="flex-1 min-w-0">
            <Hangar3DViewer
              tankConfig={tank}
              selectedWeaponIndex={selectedWeaponIdx}
              onSelectWeaponIndex={setSelectedWeaponIdx}
            />
          </div>

          <button
            onClick={handleNext}
            title="Next Tank"
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95 shadow shrink-0"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* TANK INFO BAR */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-black uppercase px-2 py-0.5 rounded"
                style={{ backgroundColor: `${tank.glowColor}25`, color: tank.glowColor }}
              >
                TANK {currentIndex + 1} OF {TANK_ROSTER.length} • {tank.category}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{tank.name}</h3>
            <p className="text-xs text-amber-400 font-bold">{tank.tagline}</p>
          </div>
          <p className="text-xs text-slate-300 max-w-md leading-relaxed">{tank.description}</p>
        </div>

        {/* STATS & WEAPONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STATS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">COMBAT SPECIFICATIONS</div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-300">
                <Shield className="w-4 h-4 text-blue-400" /> ARMOR & HEALTH
              </span>
              <span className="font-mono text-white">{tank.stats.health} HP</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tank.stats.health / 1400) * 100}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-orange-300">
                <Flame className="w-4 h-4 text-orange-400" /> FIREPOWER
              </span>
              <span className="font-mono text-white">{tank.stats.damage} / 100</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${tank.stats.damage}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Gauge className="w-4 h-4 text-emerald-400" /> TANK MOBILITY
              </span>
              <span className="font-mono text-white">{tank.stats.mobility} / 100</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tank.stats.mobility}%` }} />
            </div>
          </div>

          {/* WEAPONS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">SPECIAL WEAPON ARSENAL</div>
            {tank.weapons.map((w, i) => (
              <div
                key={w.id}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedWeaponIdx(i);
                }}
                className={`border rounded-xl p-2.5 flex items-start gap-2.5 cursor-pointer transition ${
                  selectedWeaponIdx === i
                    ? 'bg-slate-850 border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className="px-2 py-1 rounded font-black text-xs shrink-0"
                  style={{ backgroundColor: `${w.color}25`, color: w.color }}
                >
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{w.name}</span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {w.damage} DMG • {w.ammo === -1 ? '∞ Ammo' : `x${w.ammo}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{w.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="text-xs text-slate-400">Rotate with mouse/touch & click Test Fire to inspect weapons.</span>
          <button
            onClick={() => {
              soundManager.playClick();
              onSelectTankForBattle(tank.id);
            }}
            className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg transition active:scale-95"
          >
            SELECT {tank.name} FOR BATTLE
          </button>
        </div>
      </div>
    </div>
  );
};
