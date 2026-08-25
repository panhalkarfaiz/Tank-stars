import * as THREE from 'three';
import { Projectile, Weapon, TankState } from '../types';
import { TerrainManager } from './terrain';

export const GRAVITY = -18.0; // Realistic arcade gravity
export const MAX_PROJECTILE_SPEED = 42.0;

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
}

export class PhysicsEngine {
  public wind: number = 0; // -5 to +5 m/s

  public setWind(w: number) {
    this.wind = w;
  }

  public randomizeWind() {
    this.wind = (Math.random() * 8 - 4); // Between -4 and +4
  }

  // Calculate muzzle initial velocity vector
  public getInitialVelocity(angleDeg: number, power: number, playerIndex: 1 | 2): THREE.Vector3 {
    const rad = (angleDeg * Math.PI) / 180;
    const speed = (power / 100) * MAX_PROJECTILE_SPEED;

    let vx: number;
    let vy: number;

    if (playerIndex === 1) {
      // Facing right: angle 0 = right, angle 90 = up, angle 180 = left
      vx = Math.cos(rad) * speed;
      vy = Math.sin(rad) * speed;
    } else {
      // Facing left: angle 0 = left, angle 90 = up, angle 180 = right
      vx = -Math.cos(rad) * speed;
      vy = Math.sin(rad) * speed;
    }

    return new THREE.Vector3(vx, vy, 0);
  }

  // Generate Trajectory prediction arc for visual guide
  public calculateTrajectory(
    startX: number,
    startY: number,
    startZ: number,
    angleDeg: number,
    power: number,
    playerIndex: 1 | 2,
    terrain: TerrainManager,
    maxSteps: number = 60,
    dt: number = 0.035
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const v = this.getInitialVelocity(angleDeg, power, playerIndex);
    
    let x = startX;
    let y = startY;
    let z = startZ;
    let vx = v.x;
    let vy = v.y;
    let vz = v.z;

    points.push({ x, y, z });

    for (let step = 0; step < maxSteps; step++) {
      // Physics step
      vx += this.wind * 0.4 * dt;
      vy += GRAVITY * dt;

      x += vx * dt;
      y += vy * dt;
      z += vz * dt;

      points.push({ x, y, z });

      // Check collision with ground
      const groundH = terrain.getHeightAt(x);
      if (y <= groundH || x < terrain.minX || x > terrain.maxX) {
        break;
      }
    }

    return points;
  }

  // Check collision between a projectile position and a tank
  public checkTankHit(proj: { x: number; y: number; z: number }, tank: TankState): boolean {
    if (tank.isDefeated) return false;
    
    const dx = proj.x - tank.x;
    const dy = proj.y - (tank.y + 0.8); // Center of mass
    const dz = proj.z - tank.z;

    // Tank elliptical bounding sphere
    const radiusX = 1.8;
    const radiusY = 1.3;
    const radiusZ = 1.6;

    const distNorm = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) + (dz * dz) / (radiusZ * radiusZ);
    return distNorm <= 1.0;
  }

  // Calculate damage and distance falloff
  public calculateExplosionDamage(
    expX: number,
    expY: number,
    expZ: number,
    radius: number,
    baseDamage: number,
    tank: TankState
  ): { damage: number; isDirect: boolean } {
    const dx = expX - tank.x;
    const dy = expY - (tank.y + 0.8);
    const dz = expZ - tank.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > radius) {
      return { damage: 0, isDirect: false };
    }

    // Direct hit bonus if within center 40% of blast
    const isDirect = dist < radius * 0.4;
    const distanceFalloff = Math.max(0.2, 1 - dist / radius);
    
    // Factor in tank armor (armor reduces damage by up to 25%)
    const armorMitigation = 1 - (tank.isFrozen ? 0 : 0.0025 * 30); // frozen tanks take full damage
    let finalDamage = Math.round(baseDamage * distanceFalloff * armorMitigation);

    if (isDirect) {
      finalDamage = Math.round(finalDamage * 1.25);
    }

    return { damage: Math.max(10, finalDamage), isDirect };
  }
}
