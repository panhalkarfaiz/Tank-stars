import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameCanvas, GameCanvasHandle } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { ModeSelect } from './components/ModeSelect';
import { TankSelectModal } from './components/TankSelectModal';
import { GameOverModal } from './components/GameOverModal';
import { TournamentView } from './components/TournamentView';
import { HangarModal } from './components/HangarModal';
import { SettingsModal } from './components/SettingsModal';
import { LandscapeNotice } from './components/LandscapeNotice';
import {
  GameMode,
  AIDifficulty,
  TankState,
  DamageNumber,
  GameSettings,
  TournamentMatch,
} from './types';
import { TANK_ROSTER, BIOMES } from './game/constants';
import { computeAITurn } from './game/ai';
import { PhysicsEngine } from './game/physics';
import { TerrainManager } from './game/terrain';
import { soundManager } from './audio/soundManager';

export default function App() {
  // Game Navigation State
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [showTankSelect, setShowTankSelect] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHangar, setShowHangar] = useState<boolean>(false);
  const [showTournamentView, setShowTournamentView] = useState<boolean>(false);

  // Match Config
  const [p1TankId, setP1TankId] = useState<string>('abrams');
  const [p2TankId, setP2TankId] = useState<string>('frost');
  const [currentBiomeId, setCurrentBiomeId] = useState<string>('green_hills');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    showTrajectory: true,
    trajectoryLength: 75,
    windEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.5,
    difficulty: 'medium',
    cameraMode: 'dynamic',
  });

  // Tournament Ladder State
  const [tournamentRound, setTournamentRound] = useState<number>(1);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([
    { round: 1, opponentTankId: 'buratino', opponentName: 'Commander Volkov', difficulty: 'easy', biome: 'green_hills', completed: false, won: false },
    { round: 2, opponentTankId: 'spectre', opponentName: 'Phantom Operative', difficulty: 'medium', biome: 'cyber_wasteland', completed: false, won: false },
    { round: 3, opponentTankId: 'frost', opponentName: 'General Subzero', difficulty: 'medium', biome: 'arctic_tundra', completed: false, won: false },
    { round: 4, opponentTankId: 'helios', opponentName: 'Solar Vanguard', difficulty: 'hard', biome: 'martian_desert', completed: false, won: false },
    { round: 5, opponentTankId: 'atomic', opponentName: 'Warlord Radium (BOSS)', difficulty: 'hard', biome: 'cyber_wasteland', completed: false, won: false },
  ]);

  // Tanks Dynamic Battle State
  const cfg1 = TANK_ROSTER.find((t) => t.id === p1TankId) || TANK_ROSTER[0];
  const cfg2 = TANK_ROSTER.find((t) => t.id === p2TankId) || TANK_ROSTER[1];

  const [tank1State, setTank1State] = useState<TankState>({
    id: 'p1',
    tankConfigId: cfg1.id,
    playerIndex: 1,
    isAI: false,
    name: cfg1.name,
    x: -22,
    y: 0,
    z: 0,
    angle: 45,
    pitch: 0,
    power: 65,
    health: cfg1.stats.health,
    maxHealth: cfg1.stats.health,
    fuel: 100,
    maxFuel: 100,
    selectedWeaponIndex: 0,
    weaponAmmo: {},
    isFrozen: false,
    frozenTurns: 0,
    isDefeated: false,
  });

  const [tank2State, setTank2State] = useState<TankState>({
    id: 'p2',
    tankConfigId: cfg2.id,
    playerIndex: 2,
    isAI: true,
    name: cfg2.name,
    x: 22,
    y: 0,
    z: 0,
    angle: 45,
    pitch: 0,
    power: 65,
    health: cfg2.stats.health,
    maxHealth: cfg2.stats.health,
    fuel: 100,
    maxFuel: 100,
    selectedWeaponIndex: 0,
    weaponAmmo: {},
    isFrozen: false,
    frozenTurns: 0,
    isDefeated: false,
  });

  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [isAITurn, setIsAITurn] = useState<boolean>(false);
  const [windSpeed, setWindSpeed] = useState<number>(0);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [winnerPlayerIndex, setWinnerPlayerIndex] = useState<null | 1 | 2>(null);

  // References to Canvas & Simulation
  const canvasRef = useRef<GameCanvasHandle>(null);
  const tempPhysicsRef = useRef(new PhysicsEngine());
  const tempTerrainRef = useRef(new TerrainManager(BIOMES[0]));

  // Helper: Initialize match states
  const initMatch = useCallback(
    (t1Id: string, t2Id: string, biomeId: string, mode: GameMode, diff: AIDifficulty) => {
      const c1 = TANK_ROSTER.find((t) => t.id === t1Id) || TANK_ROSTER[0];
      const c2 = TANK_ROSTER.find((t) => t.id === t2Id) || TANK_ROSTER[1];
      const isAI = mode === 'single' || mode === 'tournament';

      const initialAmmo1: { [key: string]: number } = {};
      c1.weapons.forEach((w) => {
        initialAmmo1[w.id] = mode === 'practice' ? -1 : w.maxAmmo;
      });

      const initialAmmo2: { [key: string]: number } = {};
      c2.weapons.forEach((w) => {
        initialAmmo2[w.id] = mode === 'practice' ? -1 : w.maxAmmo;
      });

      setTank1State({
        id: 'p1',
        tankConfigId: c1.id,
        playerIndex: 1,
        isAI: false,
        name: c1.name,
        x: -22,
        y: 0,
        z: 0,
        angle: 45,
        pitch: 0,
        power: 65,
        health: c1.stats.health,
        maxHealth: c1.stats.health,
        fuel: 100,
        maxFuel: 100,
        selectedWeaponIndex: 0,
        weaponAmmo: initialAmmo1,
        isFrozen: false,
        frozenTurns: 0,
        isDefeated: false,
      });

      setTank2State({
        id: 'p2',
        tankConfigId: c2.id,
        playerIndex: 2,
        isAI,
        name: isAI ? `AI ${c2.name}` : c2.name,
        x: 22,
        y: 0,
        z: 0,
        angle: 45,
        pitch: 0,
        power: 65,
        health: c2.stats.health,
        maxHealth: c2.stats.health,
        fuel: 100,
        maxFuel: 100,
        selectedWeaponIndex: 0,
        weaponAmmo: initialAmmo2,
        isFrozen: false,
        frozenTurns: 0,
        isDefeated: false,
      });

      setActivePlayer(1);
      setIsFiring(false);
      setIsAITurn(false);
      setWinnerPlayerIndex(null);
      setDamageNumbers([]);
      setCurrentBiomeId(biomeId);
      setP1TankId(t1Id);
      setP2TankId(t2Id);

      const initialWind = settings.windEnabled ? Math.round((Math.random() * 8 - 4) * 10) / 10 : 0;
      setWindSpeed(initialWind);

      canvasRef.current?.resetBattle(t1Id, t2Id, biomeId, isAI);
    },
    [settings.windEnabled]
  );

  // State refs for reliable AI and callback execution
  const activePlayerStateRef = useRef<1 | 2>(1);
  activePlayerStateRef.current = activePlayer;
  const tank1StateRef = useRef<TankState>(tank1State);
  tank1StateRef.current = tank1State;
  const tank2StateRef = useRef<TankState>(tank2State);
  tank2StateRef.current = tank2State;
  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;
  const difficultyRef = useRef<AIDifficulty>(difficulty);
  difficultyRef.current = difficulty;

  // Execute AI Turn calculations and animations
  const triggerAITurnExecution = useCallback(() => {
    const curTank2 = tank2StateRef.current;
    const curTank1 = tank1StateRef.current;
    const activeCfg2 = TANK_ROSTER.find((t) => t.id === curTank2.tankConfigId) || TANK_ROSTER[1];
    const aiWeapons = activeCfg2.weapons;

    const sim = canvasRef.current?.getSimulationContext();
    const physics = sim?.physics || tempPhysicsRef.current;
    const terrain = sim?.terrain || tempTerrainRef.current;

    const decision = computeAITurn(
      curTank2,
      curTank1,
      aiWeapons,
      difficultyRef.current,
      physics,
      terrain
    );

    canvasRef.current?.executeAITurnAction(
      decision.moveDirection,
      decision.moveDistance,
      decision.targetAngle,
      decision.targetPower,
      decision.selectedWeaponIndex,
      (aimAngle, aimPower, wIdx) => {
        setTank2State((s) => ({
          ...s,
          angle: aimAngle,
          power: aimPower,
          selectedWeaponIndex: wIdx,
        }));
      },
      () => {
        setIsFiring(true);
        setIsAITurn(false);
      }
    );
  }, []);

  // Handle Turn Switch
  const handleTurnEnd = useCallback(() => {
    setIsFiring(false);

    // Check if match already won
    if (winnerPlayerIndex !== null) return;

    const nextPlayer: 1 | 2 = activePlayerStateRef.current === 1 ? 2 : 1;
    const nextTank = nextPlayer === 1 ? tank1StateRef.current : tank2StateRef.current;

    // Handle Frozen Status & Fuel replenish
    if (nextTank.isFrozen) {
      const remaining = nextTank.frozenTurns - 1;
      if (remaining <= 0) {
        if (nextPlayer === 1) {
          setTank1State((s) => ({ ...s, isFrozen: false, frozenTurns: 0, fuel: 100 }));
        } else {
          setTank2State((s) => ({ ...s, isFrozen: false, frozenTurns: 0, fuel: 100 }));
        }
      } else {
        if (nextPlayer === 1) {
          setTank1State((s) => ({ ...s, frozenTurns: remaining, fuel: 0 }));
        } else {
          setTank2State((s) => ({ ...s, frozenTurns: remaining, fuel: 0 }));
        }
      }
    } else {
      if (nextPlayer === 1) {
        setTank1State((s) => ({ ...s, fuel: 100 }));
      } else {
        setTank2State((s) => ({ ...s, fuel: 100 }));
      }
    }

    // Wind shift
    if (settings.windEnabled) {
      const newWind = Math.round((Math.random() * 8 - 4) * 10) / 10;
      setWindSpeed(newWind);
    }

    soundManager.playTurnChange();
    setActivePlayer(nextPlayer);

    // Trigger AI turn if Player 2 is AI
    if ((gameModeRef.current === 'single' || gameModeRef.current === 'tournament') && nextPlayer === 2) {
      setIsAITurn(true);
      setTimeout(() => {
        triggerAITurnExecution();
      }, 700);
    } else {
      setIsAITurn(false);
    }
  }, [settings.windEnabled, winnerPlayerIndex, triggerAITurnExecution]);

  // Handle Player Fire
  const handleFire = () => {
    if (isFiring || isAITurn || winnerPlayerIndex !== null) return;

    const activeTank = activePlayer === 1 ? tank1State : tank2State;
    const activeCfg = TANK_ROSTER.find((t) => t.id === activeTank.tankConfigId) || TANK_ROSTER[0];
    const weapon = activeCfg.weapons[activeTank.selectedWeaponIndex] || activeCfg.weapons[0];
    const currentAmmo = activeTank.weaponAmmo[weapon.id] ?? weapon.ammo ?? -1;

    if (currentAmmo === 0) return;

    // Deduct ammo if finite
    if (currentAmmo > 0 && gameMode !== 'practice') {
      if (activePlayer === 1) {
        setTank1State((s) => ({
          ...s,
          weaponAmmo: { ...s.weaponAmmo, [weapon.id]: currentAmmo - 1 },
        }));
      } else {
        setTank2State((s) => ({
          ...s,
          weaponAmmo: { ...s.weaponAmmo, [weapon.id]: currentAmmo - 1 },
        }));
      }
    }

    setIsFiring(true);
    const fired = canvasRef.current?.fireCurrentWeapon();
    if (!fired) {
      setIsFiring(false);
    }
  };

  // Handle Tank Drive
  const handleDrive = (dir: -1 | 1) => {
    canvasRef.current?.driveTank(dir);
  };

  // Handle Aim Angle Slider
  const handleAngleChange = (angle: number) => {
    if (activePlayer === 1) {
      setTank1State((s) => ({ ...s, angle }));
    } else {
      setTank2State((s) => ({ ...s, angle }));
    }
    canvasRef.current?.updateActiveAim(angle, activePlayer === 1 ? tank1State.power : tank2State.power);
  };

  // Handle Power Slider
  const handlePowerChange = (power: number) => {
    if (activePlayer === 1) {
      setTank1State((s) => ({ ...s, power }));
    } else {
      setTank2State((s) => ({ ...s, power }));
    }
    canvasRef.current?.updateActiveAim(activePlayer === 1 ? tank1State.angle : tank2State.angle, power);
  };

  // Handle Weapon Selection
  const handleSelectWeapon = (index: number) => {
    if (activePlayer === 1) {
      setTank1State((s) => ({ ...s, selectedWeaponIndex: index }));
    } else {
      setTank2State((s) => ({ ...s, selectedWeaponIndex: index }));
    }
  };

  // Handle Damage Applied from Projectile Detonations
  const handleDamageApplied = (
    targetPlayer: 1 | 2,
    dmg: number,
    isDirect: boolean,
    hitX: number,
    hitY: number
  ) => {
    const isFreezeWeapon =
      (activePlayer === 1 ? cfg1 : cfg2).weapons[
        activePlayer === 1 ? tank1State.selectedWeaponIndex : tank2State.selectedWeaponIndex
      ]?.type === 'freeze';

    // Spawn damage number floater
    const newDamageNumber: DamageNumber = {
      id: `dmg_${Date.now()}_${Math.random()}`,
      x: hitX,
      y: hitY,
      damage: dmg,
      isCrit: isDirect,
      createdAt: performance.now(),
      text: isFreezeWeapon ? `-${dmg} FROZEN!` : undefined,
    };

    setDamageNumbers((prev) => [...prev, newDamageNumber]);
    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== newDamageNumber.id));
    }, 1400);

    if (targetPlayer === 1) {
      setTank1State((s) => {
        const nextHealth = Math.max(0, s.health - dmg);
        const isDefeated = nextHealth <= 0;
        if (isDefeated) {
          setWinnerPlayerIndex(2);
        }
        return {
          ...s,
          health: nextHealth,
          isFrozen: isFreezeWeapon ? true : s.isFrozen,
          frozenTurns: isFreezeWeapon ? 1 : s.frozenTurns,
          isDefeated,
        };
      });
    } else {
      setTank2State((s) => {
        const nextHealth = Math.max(0, s.health - dmg);
        const isDefeated = nextHealth <= 0;
        if (isDefeated) {
          setWinnerPlayerIndex(1);
          // If in tournament, advance round
          if (gameMode === 'tournament') {
            setTournamentMatches((matches) =>
              matches.map((m) =>
                m.round === tournamentRound ? { ...m, completed: true, won: true } : m
              )
            );
          }
        }
        return {
          ...s,
          health: nextHealth,
          isFrozen: isFreezeWeapon ? true : s.isFrozen,
          frozenTurns: isFreezeWeapon ? 1 : s.frozenTurns,
          isDefeated,
        };
      });
    }
  };

  // Start Mode Flow
  const handleSelectMode = (mode: GameMode) => {
    if (mode === 'tournament') {
      setShowTournamentView(true);
    } else {
      setGameMode(mode);
      setShowTankSelect(true);
    }
  };

  // Confirm Tank Draft & Start Battle
  const handleConfirmStartBattle = (t1Id: string, t2Id: string, biomeId: string) => {
    setShowTankSelect(false);
    initMatch(t1Id, t2Id, biomeId, gameMode, difficulty);
  };

  // Start Tournament Round
  const handleStartTournamentRound = (round: number) => {
    setTournamentRound(round);
    setShowTournamentView(false);
    const match = tournamentMatches.find((m) => m.round === round) || tournamentMatches[0];
    setGameMode('tournament');
    setDifficulty(match.difficulty);
    initMatch(p1TankId, match.opponentTankId, match.biome, 'tournament', match.difficulty);
  };

  // Rematch current battle
  const handleRematch = () => {
    initMatch(p1TankId, p2TankId, currentBiomeId, gameMode, difficulty);
  };

  // Toggle Camera View Mode
  const handleToggleCameraMode = () => {
    soundManager.playClick();
    setSettings((s) => ({
      ...s,
      cameraMode: s.cameraMode === 'dynamic' ? 'overview' : 'dynamic',
    }));
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden relative font-sans select-none">
      {/* 3D WebGL Canvas Layer (Runs at full native FPS with Three.js) */}
      <LandscapeNotice />
      <GameCanvas
        ref={canvasRef}
        tank1State={tank1State}
        tank2State={tank2State}
        activePlayer={activePlayer}
        settings={settings}
        currentBiomeId={currentBiomeId}
        isFiring={isFiring}
        onDamageApplied={handleDamageApplied}
        onTurnEnd={handleTurnEnd}
        onTankPositionUpdate={(p1, p2) => {
          setTank1State((s) => ({ ...s, x: p1.x, y: p1.y }));
          setTank2State((s) => ({ ...s, x: p2.x, y: p2.y }));
        }}
        onFuelChange={(p1Fuel, p2Fuel) => {
          setTank1State((s) => ({ ...s, fuel: p1Fuel }));
          setTank2State((s) => ({ ...s, fuel: p2Fuel }));
        }}
      />

      {/* ACTIVE BATTLE HUD (Visible when not in main menu) */}
      {gameMode !== 'menu' && !showTankSelect && !showTournamentView && (
        <HUD
          tank1State={tank1State}
          tank2State={tank2State}
          activePlayer={activePlayer}
          isFiring={isFiring}
          isAITurn={isAITurn}
          windSpeed={windSpeed}
          damageNumbers={damageNumbers}
          settings={settings}
          onFire={handleFire}
          onDrive={handleDrive}
          onAngleChange={handleAngleChange}
          onPowerChange={handlePowerChange}
          onSelectWeapon={handleSelectWeapon}
          onOpenSettings={() => setShowSettings(true)}
          onRestartMatch={handleRematch}
          onBackToMenu={() => {
            soundManager.playClick();
            setGameMode('menu');
          }}
          onChangeCameraMode={handleToggleCameraMode}
        />
      )}

      {/* MAIN MENU SCREEN */}
      {gameMode === 'menu' && !showHangar && (
        <ModeSelect
          onSelectMode={handleSelectMode}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHangar={() => setShowHangar(true)}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          isMuted={isMuted}
          onToggleMute={() => {
            const muted = soundManager.toggleMute();
            setIsMuted(muted);
          }}
        />
      )}

      {/* TANK & ARENA SELECT DRAFT MODAL */}
      {showTankSelect && (
        <TankSelectModal
          mode={gameMode as 'single' | 'twoplayer' | 'practice'}
          initialP1TankId={p1TankId}
          initialP2TankId={p2TankId}
          initialBiomeId={currentBiomeId}
          onStartMatch={handleConfirmStartBattle}
          onCancel={() => {
            setShowTankSelect(false);
            setGameMode('menu');
          }}
        />
      )}

      {/* TOURNAMENT LADDER VIEW */}
      {showTournamentView && (
        <TournamentView
          playerTankId={p1TankId}
          currentRound={tournamentRound}
          matches={tournamentMatches}
          onStartRound={handleStartTournamentRound}
          onBackToMenu={() => {
            setShowTournamentView(false);
            setGameMode('menu');
          }}
          onResetTournament={() => {
            setTournamentRound(1);
            setTournamentMatches((m) => m.map((item) => ({ ...item, completed: false, won: false })));
          }}
        />
      )}

      {/* TANK HANGAR SHOWCASE MODAL */}
      {showHangar && (
        <HangarModal
          onClose={() => setShowHangar(false)}
          onSelectTankForBattle={(tankId) => {
            setP1TankId(tankId);
            setShowHangar(false);
            setShowTankSelect(true);
            setGameMode('single');
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {winnerPlayerIndex !== null && (
        <GameOverModal
          winnerPlayerIndex={winnerPlayerIndex}
          p1State={tank1State}
          p2State={tank2State}
          gameMode={gameMode}
          onRematch={handleRematch}
          onSelectTanks={() => {
            setWinnerPlayerIndex(null);
            setShowTankSelect(true);
          }}
          onBackToMenu={() => {
            setWinnerPlayerIndex(null);
            if (gameMode === 'tournament') {
              setShowTournamentView(true);
            } else {
              setGameMode('menu');
            }
          }}
        />
      )}
    </div>
  );
}
