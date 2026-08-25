export type GameMode = 'menu' | 'single' | 'twoplayer' | 'practice' | 'tournament';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface Weapon {
  id: string;
  name: string;
  description: string;
  icon: string;
  damage: number;
  blastRadius: number;
  cooldown?: number; // uses per match or infinite
  ammo?: number; // remaining ammo (-1 for infinite)
  maxAmmo: number;
  type: 'standard' | 'cluster' | 'split' | 'nuke' | 'freeze' | 'laser' | 'mortar' | 'plasma' | 'bouncing' | 'airstrike';
  splitCount?: number;
  color: string;
  trailColor: string;
  explosionColor: string;
  craterDepthScale?: number;
  soundType: 'cannon' | 'rocket' | 'laser' | 'plasma' | 'nuke' | 'freeze';
  isSabotDart?: boolean;
}

export type WeatherType = 'clear' | 'rain' | 'snow' | 'sandstorm' | 'volcanic';

export interface TankConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  category: 'Heavy' | 'Energy' | 'Cryo' | 'Artillery' | 'Biohazard' | 'Future' | 'Historical';
  stats: {
    health: number;
    damage: number;
    mobility: number;
    armor: number;
  };
  weapons: Weapon[];
  modelType: 'abrams' | 'frost' | 'buratino' | 'spectre' | 'atomic' | 'helios' | 'coalition' | 'toxicator' | 'dubstep' | 'tiger';
}

export interface TankState {
  id: string;
  tankConfigId: string;
  playerIndex: 1 | 2; // 1 = Left / Blue, 2 = Right / Red
  isAI: boolean;
  name: string;
  x: number;
  y: number;
  z: number;
  angle: number; // 0 to 180 degrees (aiming angle)
  pitch: number; // ground slope angle
  power: number; // 10 to 100
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  selectedWeaponIndex: number;
  weaponAmmo: { [weaponId: string]: number };
  isFrozen: boolean;
  frozenTurns: number;
  isDefeated: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  weapon: Weapon;
  ownerPlayerIndex: 1 | 2;
  spawnTime: number;
  hasSplit?: boolean;
  bouncesLeft?: number;
  isSubProjectile?: boolean;
  trailParticlesTimer?: number;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  weapon: Weapon;
  damage: number;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCrit: boolean;
  createdAt: number;
  text?: string;
  color?: string;
}

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface GameSettings {
  showTrajectory: boolean;
  trajectoryLength: number; // 0 to 100
  windEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  difficulty: AIDifficulty;
  cameraMode: 'dynamic' | 'cinematic' | 'overview';
}

export interface TournamentMatch {
  round: number;
  opponentTankId: string;
  opponentName: string;
  difficulty: AIDifficulty;
  biome: string;
  completed: boolean;
  won: boolean;
}
