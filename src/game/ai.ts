import { TankState, AIDifficulty, Weapon } from '../types';
import { PhysicsEngine, GRAVITY, MAX_PROJECTILE_SPEED } from './physics';
import { TerrainManager } from './terrain';

export interface AIDecision {
  targetAngle: number;
  targetPower: number;
  selectedWeaponIndex: number;
  moveDirection: 'left' | 'right' | 'none';
  moveDistance: number;
}

export function computeAITurn(
  aiTank: TankState,
  playerTank: TankState,
  aiWeapons: Weapon[],
  difficulty: AIDifficulty,
  physics: PhysicsEngine,
  terrain: TerrainManager
): AIDecision {
  // 1. Weapon selection strategy
  let selectedWeaponIndex = 0;
  const availableSpecialWeapons = aiWeapons
    .map((w, idx) => ({ weapon: w, index: idx }))
    .filter((item) => item.index > 0 && (aiTank.weaponAmmo[item.weapon.id] ?? item.weapon.ammo ?? 1) > 0);

  if (availableSpecialWeapons.length > 0) {
    if (difficulty === 'hard') {
      // Pick highest damage available weapon or nuke/freeze
      availableSpecialWeapons.sort((a, b) => b.weapon.damage - a.weapon.damage);
      // 85% chance to use best weapon
      if (Math.random() < 0.85) {
        selectedWeaponIndex = availableSpecialWeapons[0].index;
      }
    } else if (difficulty === 'medium') {
      if (Math.random() < 0.6) {
        const pick = availableSpecialWeapons[Math.floor(Math.random() * availableSpecialWeapons.length)];
        selectedWeaponIndex = pick.index;
      }
    } else {
      // Easy AI uses specials 30% of time
      if (Math.random() < 0.3) {
        selectedWeaponIndex = availableSpecialWeapons[0].index;
      }
    }
  }

  // 2. Repositioning strategy (driving)
  let moveDirection: 'left' | 'right' | 'none' = 'none';
  let moveDistance = 0;

  if (aiTank.fuel > 30 && !aiTank.isFrozen) {
    const currentSlope = Math.abs(terrain.getSlopeAngleAt(aiTank.x));
    // If in a steep ditch or too close, drive towards better ground
    const distToPlayer = Math.abs(aiTank.x - playerTank.x);

    if (distToPlayer < 12) {
      // Too close, back away
      moveDirection = aiTank.playerIndex === 2 ? 'right' : 'left';
      moveDistance = Math.min(aiTank.fuel * 0.05, 3.5);
    } else if (currentSlope > 0.6) {
      // In a hole, move toward flatter ground
      moveDirection = Math.random() > 0.5 ? 'left' : 'right';
      moveDistance = 2.0;
    }
  }

  // 3. Trajectory Ballistic Solver
  const dx = playerTank.x - aiTank.x;
  const dy = playerTank.y - aiTank.y;
  
  // AI aims right if p1, left if p2
  let bestAngle = 45;
  let bestPower = 60;
  let minMissDistance = 999;

  // Search candidate angles from 20 to 80 degrees
  const angleSteps = difficulty === 'hard' ? 25 : 12;
  for (let i = 0; i <= angleSteps; i++) {
    const candidateAngle = 25 + (i / angleSteps) * 50;

    // Simulate power from 20 to 100
    for (let p = 25; p <= 100; p += 5) {
      const traj = physics.calculateTrajectory(
        aiTank.x,
        aiTank.y + 1.2,
        0,
        candidateAngle,
        p,
        aiTank.playerIndex,
        terrain,
        70,
        0.03
      );

      // Find closest approach to player tank
      for (const pt of traj) {
        const dist = Math.hypot(pt.x - playerTank.x, pt.y - playerTank.y);
        if (dist < minMissDistance) {
          minMissDistance = dist;
          bestAngle = candidateAngle;
          bestPower = p;
        }
      }
    }
  }

  // 4. Inject human-like imperfection based on difficulty
  let angleJitter = 0;
  let powerJitter = 0;

  if (difficulty === 'easy') {
    angleJitter = (Math.random() - 0.5) * 16;
    powerJitter = (Math.random() - 0.5) * 18;
  } else if (difficulty === 'medium') {
    angleJitter = (Math.random() - 0.5) * 6;
    powerJitter = (Math.random() - 0.5) * 8;
  } else {
    // Hard AI is sniper-like
    angleJitter = (Math.random() - 0.5) * 1.8;
    powerJitter = (Math.random() - 0.5) * 2.5;
  }

  const finalAngle = Math.max(10, Math.min(85, Math.round(bestAngle + angleJitter)));
  const finalPower = Math.max(15, Math.min(100, Math.round(bestPower + powerJitter)));

  return {
    targetAngle: finalAngle,
    targetPower: finalPower,
    selectedWeaponIndex,
    moveDirection,
    moveDistance,
  };
}
