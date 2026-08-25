import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  Zap,
  Flame,
  Snowflake,
  ShieldAlert,
  Wind,
  ChevronsUp,
  Sparkles,
  Disc,
  Orbit,
  Radio,
  Biohazard,
  Atom,
  Sun,
  Target,
  Copy,
  RotateCw,
  Droplet,
  CloudRain,
  Skull,
  Volume2,
  Activity,
  Boxes,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Settings,
  Eye,
  RotateCcw,
  Swords,
} from 'lucide-react';
import { TankState, Weapon, DamageNumber, GameSettings } from '../types';
import { TANK_ROSTER } from '../game/constants';
import { soundManager } from '../audio/soundManager';

interface HUDProps {
  tank1State: TankState;
  tank2State: TankState;
  activePlayer: 1 | 2;
  isFiring: boolean;
  isAITurn: boolean;
  windSpeed: number;
  damageNumbers: DamageNumber[];
  settings: GameSettings;
  onFire: () => void;
  onDrive: (dir: -1 | 1) => void;
  onAngleChange: (angle: number) => void;
  onPowerChange: (power: number) => void;
  onSelectWeapon: (weaponIndex: number) => void;
  onOpenSettings: () => void;
  onRestartMatch: () => void;
  onBackToMenu: () => void;
  onChangeCameraMode: () => void;
}

const WEAPON_ICONS: { [key: string]: React.ElementType } = {
  Crosshair,
  Zap,
  Flame,
  Snowflake,
  ShieldAlert,
  Wind,
  ChevronsUp,
  Sparkles,
  Disc,
  Orbit,
  Radio,
  Biohazard,
  Atom,
  Sun,
  Target,
  Copy,
  RotateCw,
  Droplet,
  CloudRain,
  Skull,
  Volume2,
  Activity,
  Boxes,
};

export const HUD: React.FC<HUDProps> = ({
  tank1State,
  tank2State,
  activePlayer,
  isFiring,
  isAITurn,
  windSpeed,
  damageNumbers,
  settings,
  onFire,
  onDrive,
  onAngleChange,
  onPowerChange,
  onSelectWeapon,
  onOpenSettings,
  onRestartMatch,
  onBackToMenu,
  onChangeCameraMode,
}) => {
  const activeTank = activePlayer === 1 ? tank1State : tank2State;
  const activeConfig = TANK_ROSTER.find((t) => t.id === activeTank.tankConfigId) || TANK_ROSTER[0];
  const selectedWeapon = activeConfig.weapons[activeTank.selectedWeaponIndex] || activeConfig.weapons[0];

  const [isDrivingLeft, setIsDrivingLeft] = useState(false);
  const [isDrivingRight, setIsDrivingRight] = useState(false);

  // Continuous drive loop while holding buttons or keys
  useEffect(() => {
    let driveInterval: number | null = null;
    if (isDrivingLeft) {
      soundManager.startEngineSound();
      driveInterval = window.setInterval(() => onDrive(-1), 40);
    } else if (isDrivingRight) {
      soundManager.startEngineSound();
      driveInterval = window.setInterval(() => onDrive(1), 40);
    } else {
      soundManager.stopEngineSound();
    }

    return () => {
      if (driveInterval) clearInterval(driveInterval);
      soundManager.stopEngineSound();
    };
  }, [isDrivingLeft, isDrivingRight, onDrive]);

  // Keyboard controls listener (A/D or Arrows for movement, W/S for angle, Space for Fire)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFiring || isAITurn) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setIsDrivingLeft(true);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setIsDrivingRight(true);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        onAngleChange(Math.min(85, activeTank.angle + 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        onAngleChange(Math.max(10, activeTank.angle - 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onFire();
      } else if (e.key === '1') {
        onSelectWeapon(0);
      } else if (e.key === '2') {
        onSelectWeapon(1);
      } else if (e.key === '3') {
        onSelectWeapon(2);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setIsDrivingLeft(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setIsDrivingRight(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTank, isFiring, isAITurn, onAngleChange, onFire, onSelectWeapon]);

  const p1HealthPercent = Math.max(0, (tank1State.health / tank1State.maxHealth) * 100);
  const p2HealthPercent = Math.max(0, (tank2State.health / tank2State.maxHealth) * 100);
  const activeFuelPercent = Math.max(0, (activeTank.fuel / activeTank.maxFuel) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden font-sans">
      {/* Floating Damage Numbers Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {damageNumbers.map((d) => (
          <div
            key={d.id}
            className={`absolute font-black tracking-wider text-xl sm:text-2xl transform -translate-x-1/2 -translate-y-1/2 animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              d.isCrit ? 'text-yellow-300 scale-125' : 'text-red-400'
            }`}
            style={{
              left: `${Math.min(90, Math.max(10, ((d.x + 45) / 90) * 100))}%`,
              top: `${Math.min(80, Math.max(20, 50 - d.y * 3))}%`,
            }}
          >
            {d.text ? d.text : `-${d.damage}${d.isCrit ? ' CRIT!' : ''}`}
          </div>
        ))}
      </div>

      {/* TOP HEADER: Player Health Bars & Match Status */}
      <header className="w-full max-w-6xl mx-auto flex flex-col gap-2 pointer-events-auto" id="tankstars-top-hud">
        <div className="flex items-center justify-between gap-3">
          {/* PLAYER 1 STATS CARD */}
          <div
            id="p1-health-badge"
            className={`flex-1 bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border transition-all ${
              activePlayer === 1
                ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-blue-500/30'
                : 'border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500 text-white font-black text-xs px-2 py-0.5 rounded-md uppercase">P1</span>
                <span className="text-white font-bold text-sm sm:text-base truncate">{tank1State.name}</span>
                {tank1State.isFrozen && (
                  <span className="bg-cyan-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                    <Snowflake className="w-3 h-3" /> FROZEN
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                {tank1State.health} / {tank1State.maxHealth}
              </span>
            </div>
            {/* Health Track Bar */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                style={{ width: `${p1HealthPercent}%` }}
              />
            </div>
          </div>

          {/* CENTER MATCH / WIND BADGE */}
          <div className="flex flex-col items-center gap-1 shrink-0 px-2" id="wind-and-turn-info">
            {/* Active Turn Pill */}
            <div
              className={`px-3 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md border ${
                activePlayer === 1
                  ? 'bg-blue-600/90 text-white border-blue-400'
                  : 'bg-red-600/90 text-white border-red-400'
              }`}
            >
              <Swords className="w-3.5 h-3.5 animate-spin" />
              {isAITurn ? 'AI TARGETING...' : activePlayer === 1 ? 'PLAYER 1 TURN' : 'PLAYER 2 TURN'}
            </div>

            {/* Wind Indicator */}
            {settings.windEnabled && (
              <div
                id="wind-speed-badge"
                className="bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-300"
              >
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>WIND:</span>
                <span className="font-black text-white">
                  {Math.abs(windSpeed).toFixed(1)} m/s {windSpeed < 0 ? '←' : '→'}
                </span>
              </div>
            )}
          </div>

          {/* PLAYER 2 / AI STATS CARD */}
          <div
            id="p2-health-badge"
            className={`flex-1 bg-slate-900/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border transition-all ${
              activePlayer === 2
                ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-2 ring-red-500/30'
                : 'border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-red-500 text-white font-black text-xs px-2 py-0.5 rounded-md uppercase">
                  {tank2State.isAI ? 'AI' : 'P2'}
                </span>
                <span className="text-white font-bold text-sm sm:text-base truncate">{tank2State.name}</span>
                {tank2State.isFrozen && (
                  <span className="bg-cyan-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                    <Snowflake className="w-3 h-3" /> FROZEN
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                {tank2State.health} / {tank2State.maxHealth}
              </span>
            </div>
            {/* Health Track Bar */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-red-600 via-orange-500 to-amber-300 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                style={{ width: `${p2HealthPercent}%` }}
              />
            </div>
          </div>

          {/* QUICK TOOLBAR (Top Right) */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              id="btn-toggle-camera-mode"
              onClick={onChangeCameraMode}
              title="Toggle Camera View"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition active:scale-95 shadow"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              id="btn-settings-modal"
              onClick={onOpenSettings}
              title="Game Settings"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition active:scale-95 shadow"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              id="btn-menu-back"
              onClick={onBackToMenu}
              title="Main Menu"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-800 transition active:scale-95 shadow"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* BOTTOM ACTION DECK: Tank Stars Compact Battle Cockpit */}
      <footer className="w-full max-w-6xl mx-auto pointer-events-auto flex flex-col gap-1 z-30" id="tankstars-action-deck">
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-1.5 sm:p-2.5 shadow-2xl flex flex-row items-center justify-between gap-1.5 sm:gap-3 w-full">
          {/* SECTION 1: DRIVING & FUEL GAUGE */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" id="drive-controls-section">
            <div className="flex flex-col gap-0.5 min-w-[50px] sm:min-w-[70px]">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-0.5 uppercase tracking-wider text-amber-400">
                  <Flame className="w-2.5 h-2.5" /> FUEL
                </span>
                <span className="font-mono text-amber-300">{Math.round(activeFuelPercent)}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-150"
                  style={{ width: `${activeFuelPercent}%` }}
                />
              </div>
            </div>

            {/* Compact Drive Buttons */}
            <div className="flex items-center gap-1">
              <button
                id="btn-drive-left"
                title="Drive Left (A / Left Arrow)"
                disabled={activeTank.fuel <= 0 || activeTank.isFrozen || isFiring || isAITurn}
                onMouseDown={() => setIsDrivingLeft(true)}
                onMouseUp={() => setIsDrivingLeft(false)}
                onTouchStart={() => setIsDrivingLeft(true)}
                onTouchEnd={() => setIsDrivingLeft(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 active:bg-amber-600 disabled:opacity-30 disabled:pointer-events-none text-white border border-slate-700 transition active:scale-95 shadow shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-drive-right"
                title="Drive Right (D / Right Arrow)"
                disabled={activeTank.fuel <= 0 || activeTank.isFrozen || isFiring || isAITurn}
                onMouseDown={() => setIsDrivingRight(true)}
                onMouseUp={() => setIsDrivingRight(false)}
                onTouchStart={() => setIsDrivingRight(true)}
                onTouchEnd={() => setIsDrivingRight(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 active:bg-amber-600 disabled:opacity-30 disabled:pointer-events-none text-white border border-slate-700 transition active:scale-95 shadow shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SECTION 2: AIMING (ANGLE & POWER) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" id="aiming-controls-section">
            {/* Angle Control */}
            <div className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-1 rounded-xl border border-slate-800">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-cyan-400 tracking-wider">ANG</span>
                <span className="text-[11px] sm:text-xs font-mono font-black text-white">{activeTank.angle}°</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  id="btn-angle-up"
                  disabled={isFiring || isAITurn}
                  onClick={() => onAngleChange(Math.min(85, activeTank.angle + 2))}
                  className="w-5 h-3.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] flex items-center justify-center border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  id="btn-angle-down"
                  disabled={isFiring || isAITurn}
                  onClick={() => onAngleChange(Math.max(10, activeTank.angle - 2))}
                  className="w-5 h-3.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] flex items-center justify-center border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  ▼
                </button>
              </div>
            </div>

            {/* Power Control */}
            <div className="flex items-center gap-1 bg-slate-900/80 px-1.5 py-1 rounded-xl border border-slate-800">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase text-yellow-400 tracking-wider">PWR</span>
                <span className="text-[11px] sm:text-xs font-mono font-black text-white">{activeTank.power}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  id="btn-power-up"
                  disabled={isFiring || isAITurn}
                  onClick={() => onPowerChange(Math.min(100, activeTank.power + 5))}
                  className="w-5 h-3.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] flex items-center justify-center border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  id="btn-power-down"
                  disabled={isFiring || isAITurn}
                  onClick={() => onPowerChange(Math.max(15, activeTank.power - 5))}
                  className="w-5 h-3.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] flex items-center justify-center border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: WEAPON SELECTOR SLOTS */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-center min-w-0" id="weapon-selector-slots">
            {activeConfig.weapons.map((w, idx) => {
              const IconComp = WEAPON_ICONS[w.icon] || Crosshair;
              const isSelected = activeTank.selectedWeaponIndex === idx;
              const ammo = activeTank.weaponAmmo[w.id] ?? w.ammo ?? -1;
              const isDepleted = ammo === 0;

              return (
                <button
                  key={w.id}
                  id={`btn-weapon-slot-${idx}`}
                  disabled={isDepleted || isFiring || isAITurn}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectWeapon(idx);
                  }}
                  className={`relative px-1.5 sm:px-2.5 py-1 rounded-xl border flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-400'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-400'
                  } ${isDepleted ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                >
                  <IconComp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isSelected ? 'text-amber-300' : 'text-slate-300'}`} />
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-white truncate max-w-[48px] sm:max-w-[75px]">
                      {w.name}
                    </span>
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold mt-0.5 ${
                        ammo === -1
                          ? 'text-slate-400'
                          : ammo > 0
                          ? 'text-amber-300'
                          : 'text-red-400'
                      }`}
                    >
                      {ammo === -1 ? 'INF' : `x${ammo}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SECTION 4: GLOWING FIRE CANNON BUTTON */}
          <div className="shrink-0 flex items-center">
            <button
              id="btn-fire-cannon"
              disabled={isFiring || isAITurn}
              onClick={onFire}
              className={`h-9 sm:h-10 px-3 sm:px-5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 ${
                isFiring || isAITurn
                  ? 'bg-slate-800 opacity-50 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 border border-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-pulse'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>FIRE!</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
