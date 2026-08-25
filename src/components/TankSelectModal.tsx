import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Gauge,
  Flame,
  Snowflake,
  Crosshair,
  Check,
  Play,
  ArrowRight,
  Globe,
  Award,
  Sparkles,
  Eye,
} from 'lucide-react';
import { TankConfig } from '../types';
import { TANK_ROSTER, BIOMES, BiomeConfig } from '../game/constants';
import { soundManager } from '../audio/soundManager';
import { Hangar3DViewer } from './Hangar3DViewer';

interface TankSelectModalProps {
  mode: 'single' | 'twoplayer' | 'practice';
  initialP1TankId: string;
  initialP2TankId: string;
  initialBiomeId: string;
  onStartMatch: (p1TankId: string, p2TankId: string, biomeId: string) => void;
  onCancel: () => void;
}

export const TankSelectModal: React.FC<TankSelectModalProps> = ({
  mode,
  initialP1TankId,
  initialP2TankId,
  initialBiomeId,
  onStartMatch,
  onCancel,
}) => {
  const [selectedP1, setSelectedP1] = useState<string>(initialP1TankId);
  const [selectedP2, setSelectedP2] = useState<string>(initialP2TankId);
  const [selectedBiome, setSelectedBiome] = useState<string>(initialBiomeId);
  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'biome'>('p1');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const p1Tank = TANK_ROSTER.find((t) => t.id === selectedP1) || TANK_ROSTER[0];
  const p2Tank = TANK_ROSTER.find((t) => t.id === selectedP2) || TANK_ROSTER[1];
  const currentTank = activeTab === 'p1' ? p1Tank : p2Tank;
  const currentSelectedId = activeTab === 'p1' ? selectedP1 : selectedP2;

  const categories = ['All', 'Modern', 'Heavy', 'Historical', 'Energy', 'Biohazard'];
  const filteredTanks = selectedCategory === 'All'
    ? TANK_ROSTER
    : TANK_ROSTER.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  const handleStart = () => {
    soundManager.playClick();
    onStartMatch(selectedP1, selectedP2, selectedBiome);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[96vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                3D ARMORY & HANGAR
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                {mode === 'single' ? 'CHOOSE YOUR WAR MACHINE & ARENA' : 'PASS & PLAY TANK DRAFT'}
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Inspect 3D realistic tanks, test fire weapon payloads, and deploy into dynamic weather battlefields.
            </p>
          </div>

          {/* TAB TOGGLES */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto shrink-0">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('p1');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 ${
                activeTab === 'p1' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Player 1 (Blue)
            </button>
            {mode === 'twoplayer' && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab('p2');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 ${
                  activeTab === 'p2' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Player 2 (Red)
              </button>
            )}
            {mode === 'single' && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab('p2');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 ${
                  activeTab === 'p2' ? 'bg-red-600/80 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Enemy AI Tank
              </button>
            )}
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('biome');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 ${
                activeTab === 'biome' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Arena & Weather
            </button>
          </div>
        </div>

        {/* TAB 1 & 2: TANK ROSTER SELECTION WITH EMBEDDED 3D HANGAR */}
        {activeTab !== 'biome' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: TANK CARDS GRID & CATEGORY FILTER */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Roster Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto p-1">
                {filteredTanks.map((tank) => {
                  const isSelected = activeTab === 'p1' ? selectedP1 === tank.id : selectedP2 === tank.id;
                  return (
                    <button
                      key={tank.id}
                      id={`select-tank-${tank.id}`}
                      onClick={() => {
                        soundManager.playClick();
                        if (activeTab === 'p1') setSelectedP1(tank.id);
                        else setSelectedP2(tank.id);
                      }}
                      className={`relative p-3 rounded-2xl border flex flex-col items-start gap-1.5 text-left transition-all active:scale-95 group ${
                        isSelected
                          ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      {/* Tank Accent Color Strip */}
                      <div className="w-full flex items-center justify-between">
                        <span
                          className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider"
                          style={{ backgroundColor: `${tank.glowColor}25`, color: tank.glowColor }}
                        >
                          {tank.category}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="font-black text-sm text-white group-hover:text-amber-300 transition">
                          {tank.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{tank.tagline}</div>
                      </div>

                      {/* Mini Stats Indicator */}
                      <div className="w-full flex items-center justify-between mt-auto pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-0.5 text-orange-300">
                          <Flame className="w-2.5 h-2.5 text-orange-400" />
                          {tank.stats.damage}
                        </span>
                        <span className="flex items-center gap-0.5 text-blue-300">
                          <Shield className="w-2.5 h-2.5 text-blue-400" />
                          {tank.stats.health}
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-300">
                          <Gauge className="w-2.5 h-2.5 text-emerald-400" />
                          {tank.stats.mobility}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: INTEGRATED 3D HANGAR & WEAPON ARSENAL INSPECTOR */}
            <div className="lg:col-span-6 bg-slate-950/95 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
              {/* Integrated 3D Hangar Viewer with 360 rotation & Test Fire */}
              <div className="w-full rounded-2xl overflow-hidden border border-slate-800/80 shadow-lg">
                <Hangar3DViewer tankConfig={currentTank} />
              </div>

              {/* Tank Meta */}
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: currentTank.glowColor }}
                    />
                    {currentTank.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-400">{currentTank.tagline}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentTank.description}</p>
              </div>

              {/* ARSENAL LIST */}
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  ORDNANCE SPECIFICATIONS
                </div>
                {currentTank.weapons.map((w, idx) => (
                  <div
                    key={w.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex items-start gap-2 text-xs"
                  >
                    <div
                      className="p-1.5 rounded-lg font-black text-xs shrink-0"
                      style={{ backgroundColor: `${w.color}25`, color: w.color }}
                    >
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{w.name}</span>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">
                          {w.damage} DMG • RAD {w.blastRadius}m {w.isSabotDart ? '• SABOT DART' : ''}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{w.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: ARENA & WEATHER SELECTION */
          <div className="flex flex-col gap-4 py-2">
            <div className="text-xs text-slate-300">
              Select an operational biome with realistic atmospheric weather, procedural terrain deformation, and custom lighting.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BIOMES.map((b) => {
                const isSelected = selectedBiome === b.id;
                return (
                  <button
                    key={b.id}
                    id={`select-biome-${b.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedBiome(b.id);
                    }}
                    className={`p-4 rounded-2xl border flex flex-col gap-3 text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className="w-full h-24 rounded-xl border border-slate-700/60 shadow-inner flex flex-col justify-between p-3"
                      style={{
                        background: `linear-gradient(to bottom, ${b.skyColor}, ${b.groundColor})`,
                      }}
                    >
                      <span className="self-end px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-sm text-[10px] font-black text-amber-300 uppercase tracking-wider">
                        {b.weatherName}
                      </span>
                      <span className="text-sm font-black uppercase text-white drop-shadow">{b.name}</span>
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center justify-between">
                        <span>{b.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Atmosphere: <strong className="text-emerald-300">{b.weatherName}</strong> with full particle simulation and destructible 3D terrain.
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition active:scale-95"
          >
            Back to Menu
          </button>

          <button
            id="btn-confirm-start-battle"
            onClick={handleStart}
            className="px-7 py-3 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition active:scale-95 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" /> START BATTLE
          </button>
        </div>
      </div>
    </div>
  );
};
