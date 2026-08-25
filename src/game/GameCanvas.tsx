import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { TankState, Projectile, Weapon, DamageNumber, GameSettings } from '../types';
import { TANK_ROSTER, BIOMES, BiomeConfig } from './constants';
import { TerrainManager } from './terrain';
import { Tank3DHandle, buildTank3D } from './tankModels';
import { ParticleSystem } from './particleSystem';
import { PhysicsEngine, GRAVITY } from './physics';
import { soundManager } from '../audio/soundManager';

export interface GameCanvasHandle {
  fireCurrentWeapon: () => boolean;
  driveTank: (direction: -1 | 1) => void;
  resetBattle: (t1ConfigId: string, t2ConfigId: string, biomeId: string, isAI: boolean) => void;
  setBiome: (biomeId: string) => void;
  updateActiveAim: (angle: number, power: number) => void;
  getSimulationContext: () => { physics: PhysicsEngine; terrain: TerrainManager | null; wind: number };
  executeAITurnAction: (
    moveDir: 'left' | 'right' | 'none',
    moveDist: number,
    angle: number,
    power: number,
    weaponIdx: number,
    onAimUpdate: (angle: number, power: number, weaponIdx: number) => void,
    onComplete: () => void
  ) => void;
}

interface GameCanvasProps {
  tank1State: TankState;
  tank2State: TankState;
  activePlayer: 1 | 2;
  settings: GameSettings;
  currentBiomeId: string;
  isFiring: boolean;
  onDamageApplied: (targetPlayer: 1 | 2, dmg: number, isDirect: boolean, hitX: number, hitY: number) => void;
  onTurnEnd: () => void;
  onTankPositionUpdate: (p1Pos: { x: number; y: number }, p2Pos: { x: number; y: number }) => void;
  onFuelChange: (p1Fuel: number, p2Fuel: number) => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  (
    {
      tank1State,
      tank2State,
      activePlayer,
      settings,
      currentBiomeId,
      isFiring,
      onDamageApplied,
      onTurnEnd,
      onTankPositionUpdate,
      onFuelChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    // Systems
    const terrainRef = useRef<TerrainManager | null>(null);
    const particleSystemRef = useRef<ParticleSystem | null>(null);
    const physicsRef = useRef<PhysicsEngine>(new PhysicsEngine());

    // 3D Objects
    const tank1HandleRef = useRef<Tank3DHandle | null>(null);
    const tank2HandleRef = useRef<Tank3DHandle | null>(null);
    const trajectoryLineRef = useRef<THREE.Line | null>(null);
    const projectilesRef = useRef<{ proj: Projectile; mesh: THREE.Object3D; light?: THREE.PointLight }[]>([]);
    const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
    const ambLightRef = useRef<THREE.AmbientLight | null>(null);
    const skyMeshRef = useRef<THREE.Mesh | null>(null);

    // Camera & Screen Shake
    const shakeIntensityRef = useRef<number>(0);
    const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 4, 0));
    const isTrackingBulletRef = useRef<boolean>(false);
    const trackedBulletPosRef = useRef<THREE.Vector3 | null>(null);
    const isTurnEndingRef = useRef<boolean>(false);
    const turnEndingTimerRef = useRef<number | null>(null);

    // Local mutable state for smooth 60fps rendering
    const state1Ref = useRef<TankState>(tank1State);
    const state2Ref = useRef<TankState>(tank2State);
    const activePlayerRef = useRef<1 | 2>(activePlayer);
    const settingsRef = useRef<GameSettings>(settings);
    const isFiringRef = useRef<boolean>(isFiring);

    // Sync refs
    useEffect(() => {
      state1Ref.current = tank1State;
      state2Ref.current = tank2State;
      activePlayerRef.current = activePlayer;
      settingsRef.current = settings;
      isFiringRef.current = isFiring;
      physicsRef.current.setWind(settings.windEnabled ? physicsRef.current.wind : 0);
    }, [tank1State, tank2State, activePlayer, settings, isFiring]);

    // Initialize Three.js Engine
    useEffect(() => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // 1. Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const biome = BIOMES.find((b) => b.id === currentBiomeId) || BIOMES[0];
      scene.background = new THREE.Color(biome.skyColor);
      scene.fog = new THREE.FogExp2(biome.fogColor, 0.007);

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
      camera.position.set(0, 10, 36);
      cameraRef.current = camera;

      // 3. Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Lighting
      const ambLight = new THREE.AmbientLight(biome.skyColor, biome.ambientIntensity);
      scene.add(ambLight);
      ambLightRef.current = ambLight;

      const dirLight = new THREE.DirectionalLight(biome.sunColor, 1.4);
      dirLight.position.set(20, 45, 25);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 120;
      dirLight.shadow.camera.left = -45;
      dirLight.shadow.camera.right = 45;
      dirLight.shadow.camera.top = 30;
      dirLight.shadow.camera.bottom = -20;
      scene.add(dirLight);
      dirLightRef.current = dirLight;

      // 5. Sky Dome Backdrop
      const skyGeo = new THREE.SphereGeometry(180, 24, 16);
      const skyMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(biome.skyColor),
        side: THREE.BackSide,
      });
      const skyMesh = new THREE.Mesh(skyGeo, skyMat);
      scene.add(skyMesh);
      skyMeshRef.current = skyMesh;

      // 6. Terrain Manager
      const terrain = new TerrainManager(biome);
      terrainRef.current = terrain;
      const terrainMeshGroup = terrain.createMesh();
      scene.add(terrainMeshGroup);

      // 7. Particle System
      const particleSystem = new ParticleSystem(scene);
      particleSystemRef.current = particleSystem;
      particleSystem.initWeather(biome.weather);

      // 8. Tanks Creation
      const cfg1 = TANK_ROSTER.find((t) => t.id === tank1State.tankConfigId) || TANK_ROSTER[0];
      const cfg2 = TANK_ROSTER.find((t) => t.id === tank2State.tankConfigId) || TANK_ROSTER[1];

      const t1Handle = buildTank3D(cfg1, 1);
      const t2Handle = buildTank3D(cfg2, 2);

      tank1HandleRef.current = t1Handle;
      tank2HandleRef.current = t2Handle;

      scene.add(t1Handle.root);
      scene.add(t2Handle.root);

      // Set initial tank positions on terrain
      t1Handle.root.position.set(tank1State.x, terrain.getHeightAt(tank1State.x), 0);
      t2Handle.root.position.set(tank2State.x, terrain.getHeightAt(tank2State.x), 0);

      // 9. Trajectory Line
      const trajGeo = new THREE.BufferGeometry();
      const trajPositions = new Float32Array(70 * 3);
      trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
      const trajMat = new THREE.LineDashedMaterial({
        color: 0xffff00,
        dashSize: 0.6,
        gapSize: 0.3,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const trajLine = new THREE.Line(trajGeo, trajMat);
      trajLine.computeLineDistances();
      scene.add(trajLine);
      trajectoryLineRef.current = trajLine;

      // 10. Animation Loop
      let animationFrameId: number;
      let lastTime = performance.now();

      const animate = (currentTime: number) => {
        animationFrameId = requestAnimationFrame(animate);
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        // Update particles & weather
        particleSystemRef.current?.update(dt);
        particleSystemRef.current?.updateWeather(dt, physicsRef.current.wind);

        // Update Projectiles Physics
        updateProjectiles(dt);

        // Update Tank 3D transforms & Pitch & animated parts
        updateTankTransforms();
        const timeSec = currentTime / 1000;
        tank1HandleRef.current?.updateAnimation?.(timeSec);
        tank2HandleRef.current?.updateAnimation?.(timeSec);

        // Update Trajectory Visualizer
        updateTrajectoryLine();

        // Update Camera & Shake
        updateCamera(dt);

        // Render scene
        renderer.render(scene, camera);
      };

      animate(performance.now());

      // Resize listener
      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        particleSystemRef.current?.destroy();
        renderer.dispose();
      };
    }, []);

    // Update tank transforms matching terrain slope
    const updateTankTransforms = () => {
      const terrain = terrainRef.current;
      const t1 = tank1HandleRef.current;
      const t2 = tank2HandleRef.current;
      if (!terrain || !t1 || !t2) return;

      const s1 = state1Ref.current;
      const s2 = state2Ref.current;

      // Tank 1 position & pitch
      const h1 = terrain.getHeightAt(s1.x);
      const slope1 = terrain.getSlopeAngleAt(s1.x);
      t1.root.position.set(s1.x, h1, 0);
      t1.root.rotation.z = slope1;
      t1.updateAim(s1.angle, 1);
      t1.setFrozenVisual(s1.isFrozen);

      // Tank 2 position & pitch
      const h2 = terrain.getHeightAt(s2.x);
      const slope2 = terrain.getSlopeAngleAt(s2.x);
      t2.root.position.set(s2.x, h2, 0);
      t2.root.rotation.z = slope2;
      t2.updateAim(s2.angle, 2);
      t2.setFrozenVisual(s2.isFrozen);
    };

    // Update Trajectory Preview Arc
    const updateTrajectoryLine = () => {
      const line = trajectoryLineRef.current;
      const terrain = terrainRef.current;
      if (!line || !terrain) return;

      if (!settingsRef.current.showTrajectory || isFiringRef.current) {
        line.visible = false;
        return;
      }

      const activeP = activePlayerRef.current;
      const activeState = activeP === 1 ? state1Ref.current : state2Ref.current;
      const activeHandle = activeP === 1 ? tank1HandleRef.current : tank2HandleRef.current;
      if (!activeHandle) return;

      line.visible = true;

      // Get world muzzle position
      const muzzlePos = new THREE.Vector3();
      activeHandle.muzzlePoint.getWorldPosition(muzzlePos);

      const maxSteps = Math.floor((settingsRef.current.trajectoryLength / 100) * 45) + 8;
      const points = physicsRef.current.calculateTrajectory(
        muzzlePos.x,
        muzzlePos.y,
        muzzlePos.z,
        activeState.angle,
        activeState.power,
        activeP,
        terrain,
        maxSteps,
        0.035
      );

      const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 70; i++) {
        if (i < points.length) {
          posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
        } else {
          const last = points[points.length - 1] || muzzlePos;
          posAttr.setXYZ(i, last.x, last.y, last.z);
        }
      }
      posAttr.needsUpdate = true;
      line.computeLineDistances();
    };

    // Projectiles Physics & Collision Loop
    const updateProjectiles = (dt: number) => {
      const terrain = terrainRef.current;
      const scene = sceneRef.current;
      const particles = particleSystemRef.current;
      if (!terrain || !scene || !particles) return;

      const projs = projectilesRef.current;
      if (projs.length === 0) {
        if (isTrackingBulletRef.current) {
          isTrackingBulletRef.current = false;
          trackedBulletPosRef.current = null;
        }
        return;
      }

      for (let i = projs.length - 1; i >= 0; i--) {
        const item = projs[i];
        const p = item.proj;

        // Apply physics
        const windEffect = p.weapon.isSabotDart ? 0 : physicsRef.current.wind * 0.4 * dt;
        p.vx += windEffect;
        p.vy += GRAVITY * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        item.mesh.position.set(p.x, p.y, p.z);
        if (item.light) {
          item.light.position.set(p.x, p.y, p.z);
        }

        // Align projectile mesh to velocity vector
        item.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(p.vx, p.vy, p.vz).normalize()
        );

        // Projectile trail particles
        particles.emitTrailParticle(item.mesh.position, p.weapon.trailColor, p.weapon.type);

        // Track leading projectile for cinematic camera
        if (i === 0) {
          isTrackingBulletRef.current = true;
          trackedBulletPosRef.current = new THREE.Vector3(p.x, p.y, p.z);
        }

        // Check Special Mid-Flight Mechanics
        // 1. Splitters / Cluster Bombs (at descending apex or timer)
        if (p.weapon.type === 'cluster' && !p.hasSplit && p.vy < -2.0 && performance.now() - p.spawnTime > 400) {
          p.hasSplit = true;
          spawnClusterBomblets(p, 4);
        }

        // 2. Collision with Terrain or Boundaries
        const groundH = terrain.getHeightAt(p.x);
        const hitGround = p.y <= groundH;
        const hitBoundary = p.x < terrain.minX - 5 || p.x > terrain.maxX + 5 || p.y < -15;

        // 3. Collision with Tanks
        const hitTank1 = physicsRef.current.checkTankHit(p, state1Ref.current);
        const hitTank2 = physicsRef.current.checkTankHit(p, state2Ref.current);

        // Handle Bouncing Grenade special bounce
        if (hitGround && p.weapon.type === 'bouncing' && (p.bouncesLeft ?? 2) > 0) {
          p.bouncesLeft = (p.bouncesLeft ?? 2) - 1;
          p.y = groundH + 0.3;
          const slope = terrain.getSlopeAngleAt(p.x);
          const norm = terrain.getNormalAt(p.x);
          // Reflect velocity
          const v = new THREE.Vector3(p.vx, p.vy, 0);
          v.reflect(norm).multiplyScalar(0.65);
          p.vx = v.x;
          p.vy = Math.max(4, v.y);
          soundManager.playClick();
          continue;
        }

        if (hitGround || hitTank1 || hitTank2 || hitBoundary) {
          // Detonate Explosion!
          triggerDetonation(p, p.x, Math.max(groundH, p.y), p.z);

          // Clean up projectile mesh & light
          scene.remove(item.mesh);
          if (item.light) scene.remove(item.light);
          disposeHierarchy(item.mesh);
          projs.splice(i, 1);

          // If last projectile finished, end turn after brief impact delay with single-trigger guard
          if (projs.length === 0 && !isTurnEndingRef.current) {
            isTurnEndingRef.current = true;
            if (turnEndingTimerRef.current) clearTimeout(turnEndingTimerRef.current);
            turnEndingTimerRef.current = window.setTimeout(() => {
              isTurnEndingRef.current = false;
              onTurnEnd();
            }, 1200);
          }
        }
      }
    };

    // Spawn cluster sub-projectiles
    const spawnClusterBomblets = (parent: Projectile, count: number) => {
      const scene = sceneRef.current;
      if (!scene) return;

      soundManager.playRocketLaunch();
      for (let k = 0; k < count; k++) {
        const spreadX = (Math.random() - 0.5) * 12;
        const spreadY = Math.random() * 4;

        const subProj: Projectile = {
          id: `sub_${parent.id}_${k}`,
          x: parent.x,
          y: parent.y,
          z: parent.z,
          vx: parent.vx + spreadX,
          vy: parent.vy + spreadY,
          vz: parent.vz,
          weapon: {
            ...parent.weapon,
            damage: Math.round(parent.weapon.damage * 0.8),
            blastRadius: parent.weapon.blastRadius * 0.85,
          },
          ownerPlayerIndex: parent.ownerPlayerIndex,
          spawnTime: performance.now(),
          hasSplit: true,
          isSubProjectile: true,
        };

        const subMesh = createProjectileMesh(parent.weapon);
        subMesh.scale.set(0.6, 0.6, 0.6);
        subMesh.position.set(subProj.x, subProj.y, subProj.z);
        scene.add(subMesh);

        projectilesRef.current.push({ proj: subProj, mesh: subMesh });
      }
    };

    // Detonation handler (Explosion visuals, audio, terrain carving, damage)
    const triggerDetonation = (proj: Projectile, x: number, y: number, z: number) => {
      const terrain = terrainRef.current;
      const particles = particleSystemRef.current;
      if (!terrain || !particles) return;

      const isColossal = proj.weapon.type === 'nuke' || proj.weapon.blastRadius > 4.5;

      // 1. Play synthesized explosion sound
      soundManager.playExplosion(isColossal);

      // 2. Trigger screen shake
      shakeIntensityRef.current = isColossal ? 1.6 : 0.8;

      // 3. Emit 3D visual particles & shockwaves
      particles.emitExplosion(x, y, z, proj.weapon.blastRadius, proj.weapon.explosionColor, isColossal);

      // 4. Carve Destructible Crater into 3D Terrain
      terrain.carveCrater(x, y, proj.weapon.blastRadius, proj.weapon.craterDepthScale ?? 1.0);

      // 5. Apply Damage & Blast radius to Tanks
      const res1 = physicsRef.current.calculateExplosionDamage(
        x,
        y,
        z,
        proj.weapon.blastRadius,
        proj.weapon.damage,
        state1Ref.current
      );
      if (res1.damage > 0) {
        onDamageApplied(1, res1.damage, res1.isDirect, x, y);
      }

      const res2 = physicsRef.current.calculateExplosionDamage(
        x,
        y,
        z,
        proj.weapon.blastRadius,
        proj.weapon.damage,
        state2Ref.current
      );
      if (res2.damage > 0) {
        onDamageApplied(2, res2.damage, res2.isDirect, x, y);
      }
    };

    // Helper to safely dispose a Three.js Object3D hierarchy
    const disposeHierarchy = (obj: THREE.Object3D | null | undefined) => {
      if (!obj) return;
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m?.dispose?.());
          } else if (typeof mesh.material.dispose === 'function') {
            mesh.material.dispose();
          }
        }
      });
    };

    // Helper: Create Realistic Projectile 3D Mesh
    const createProjectileMesh = (weapon: Weapon): THREE.Group => {
      const group = new THREE.Group();
      const col = new THREE.Color(weapon.color);

      if (weapon.isSabotDart) {
        // High-velocity APFSDS Long-Rod Kinetic Dart (Needle tungsten penetrator + fins)
        const dartGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
        dartGeo.rotateZ(Math.PI / 2);
        const dartMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.95,
          roughness: 0.15,
        });
        const dart = new THREE.Mesh(dartGeo, dartMat);
        group.add(dart);

        // Pointed needle tip
        const tipGeo = new THREE.ConeGeometry(0.06, 0.35, 8);
        tipGeo.rotateZ(-Math.PI / 2);
        tipGeo.translate(0.85, 0, 0);
        const tip = new THREE.Mesh(tipGeo, dartMat);
        group.add(tip);

        // Stabilizing Fin Stabilizers
        for (let f = 0; f < 4; f++) {
          const finGeo = new THREE.BoxGeometry(0.3, 0.02, 0.15);
          finGeo.rotateX((f * Math.PI) / 2);
          finGeo.translate(-0.55, 0, 0);
          const fin = new THREE.Mesh(finGeo, dartMat);
          group.add(fin);
        }

        // Glowing kinetic friction corona
        const glowGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
        glowGeo.rotateZ(Math.PI / 2);
        const glowMat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.45,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(glow);
      } else if (weapon.soundType === 'nuke' || weapon.soundType === 'rocket' || weapon.type === 'mortar') {
        // Aerodynamic Rocket / Warhead with rear exhaust nozzle
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.22, 1.5, 10);
        bodyGeo.rotateZ(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: col,
          metalness: 0.7,
          roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Conical ogive nose cone
        const noseGeo = new THREE.ConeGeometry(0.2, 0.5, 10);
        noseGeo.rotateZ(-Math.PI / 2);
        noseGeo.translate(0.95, 0, 0);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        group.add(nose);

        // 4 Tail guidance fins
        for (let f = 0; f < 4; f++) {
          const finGeo = new THREE.BoxGeometry(0.35, 0.03, 0.22);
          finGeo.rotateX((f * Math.PI) / 2);
          finGeo.translate(-0.6, 0, 0);
          const fin = new THREE.Mesh(finGeo, bodyMat);
          group.add(fin);
        }
      } else if (weapon.type === 'plasma') {
        // Pulsating Plasma Energy Core
        const coreGeo = new THREE.SphereGeometry(0.32, 14, 14);
        const coreMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 1.8,
          roughness: 0.1,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        const haloGeo = new THREE.SphereGeometry(0.48, 10, 10);
        const haloMat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.4,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        group.add(halo);
      } else {
        // Standard / Heavy APCBC / HE Military Tank Shell
        const shellGeo = new THREE.CylinderGeometry(0.13, 0.14, 0.8, 12);
        shellGeo.rotateZ(Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
          color: col,
          metalness: 0.85,
          roughness: 0.2,
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        group.add(shell);

        // Ogive ballistic cap
        const capGeo = new THREE.ConeGeometry(0.13, 0.45, 12);
        capGeo.rotateZ(-Math.PI / 2);
        capGeo.translate(0.55, 0, 0);
        const cap = new THREE.Mesh(capGeo, shellMat);
        group.add(cap);

        // Driving band (copper / brass band near base)
        const bandGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.12, 10);
        bandGeo.rotateZ(Math.PI / 2);
        bandGeo.translate(-0.25, 0, 0);
        const bandMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.9,
          roughness: 0.3,
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        group.add(band);
      }

      return group;
    };

    // Camera Smooth Tracking & Screen Shake
    const updateCamera = (dt: number) => {
      const camera = cameraRef.current;
      if (!camera) return;

      const p1 = state1Ref.current;
      const p2 = state2Ref.current;
      const activeP = activePlayerRef.current;
      const activeState = activeP === 1 ? p1 : p2;

      let targetPos = new THREE.Vector3();

      if (isTrackingBulletRef.current && trackedBulletPosRef.current) {
        // Bullet-Cam tracking projectile smoothly
        targetPos.set(trackedBulletPosRef.current.x, trackedBulletPosRef.current.y + 2, 28);
      } else if (settingsRef.current.cameraMode === 'overview') {
        // Overview of whole battlefield
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        targetPos.set(midX, midY + 4, 42);
      } else {
        // Active Player Focused Camera
        targetPos.set(activeState.x, activeState.y + 4, 30);
      }

      // Smooth camera interpolation
      camera.position.lerp(targetPos, dt * 3.5);

      // Look at battle center
      const lookTarget = isTrackingBulletRef.current && trackedBulletPosRef.current
        ? trackedBulletPosRef.current
        : new THREE.Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 + 1, 0);

      cameraTargetRef.current.lerp(lookTarget, dt * 4.0);
      camera.lookAt(cameraTargetRef.current);

      // Screen Shake application
      if (shakeIntensityRef.current > 0.01) {
        const shakeX = (Math.random() - 0.5) * shakeIntensityRef.current * 1.5;
        const shakeY = (Math.random() - 0.5) * shakeIntensityRef.current * 1.5;
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        shakeIntensityRef.current *= Math.pow(0.05, dt);
      } else {
        shakeIntensityRef.current = 0;
      }
    };

    // Fire weapon implementation
    const fireCurrentWeapon = (): boolean => {
      const terrain = terrainRef.current;
      const scene = sceneRef.current;
      const particles = particleSystemRef.current;
      const activeP = activePlayerRef.current;
      const activeState = activeP === 1 ? state1Ref.current : state2Ref.current;
      const activeHandle = activeP === 1 ? tank1HandleRef.current : tank2HandleRef.current;
      const activeConfig = TANK_ROSTER.find((t) => t.id === activeState.tankConfigId) || TANK_ROSTER[0];
      const weapon = activeConfig.weapons[activeState.selectedWeaponIndex] || activeConfig.weapons[0];

      if (!terrain || !scene || !particles || !activeHandle || projectilesRef.current.length > 0) {
        return false;
      }

      // Recoil animation & sound
      activeHandle.triggerFireRecoil();

      if (weapon.soundType === 'laser') {
        soundManager.playLaserShot();
      } else if (weapon.soundType === 'plasma') {
        soundManager.playPlasmaShot();
      } else if (weapon.soundType === 'rocket') {
        soundManager.playRocketLaunch();
      } else if (weapon.soundType === 'nuke') {
        soundManager.playNukeWarning();
        setTimeout(() => soundManager.playCannonShot(), 300);
      } else {
        soundManager.playCannonShot();
      }

      // Muzzle world position
      const muzzlePos = new THREE.Vector3();
      activeHandle.muzzlePoint.getWorldPosition(muzzlePos);

      // Initial velocity vector
      const v = physicsRef.current.getInitialVelocity(activeState.angle, activeState.power, activeP);

      // Muzzle flash particle burst
      particles.emitMuzzleFlash(muzzlePos, v.clone().normalize(), weapon.color);

      // Spawn projectile(s)
      const isMultiSalvo = weapon.type === 'split' && (weapon.splitCount ?? 1) > 1;
      const count = isMultiSalvo ? (weapon.splitCount ?? 2) : 1;

      for (let k = 0; k < count; k++) {
        setTimeout(() => {
          if (!sceneRef.current) return;

          const projMesh = createProjectileMesh(weapon);
          projMesh.position.copy(muzzlePos);

          const projLight = new THREE.PointLight(new THREE.Color(weapon.color), 1.8, 8);
          projLight.position.copy(muzzlePos);
          sceneRef.current.add(projLight);
          sceneRef.current.add(projMesh);

          // Slight spread for salvo rockets
          const angleJitter = isMultiSalvo ? (k - (count - 1) / 2) * 2.5 : 0;
          const vJitter = physicsRef.current.getInitialVelocity(
            activeState.angle + angleJitter,
            activeState.power * (1 - k * 0.04),
            activeP
          );

          const newProj: Projectile = {
            id: `proj_${Date.now()}_${k}`,
            x: muzzlePos.x,
            y: muzzlePos.y,
            z: muzzlePos.z,
            vx: vJitter.x,
            vy: vJitter.y,
            vz: 0,
            weapon,
            ownerPlayerIndex: activeP,
            spawnTime: performance.now(),
            bouncesLeft: weapon.type === 'bouncing' ? 2 : 0,
          };

          projectilesRef.current.push({
            proj: newProj,
            mesh: projMesh,
            light: projLight,
          });
        }, k * 180);
      }

      return true;
    };

    // Drive Tank along slope
    const driveTank = (direction: -1 | 1) => {
      const terrain = terrainRef.current;
      const activeP = activePlayerRef.current;
      const s = activeP === 1 ? state1Ref.current : state2Ref.current;
      const handle = activeP === 1 ? tank1HandleRef.current : tank2HandleRef.current;

      if (!terrain || !handle || s.fuel <= 0 || s.isFrozen || isFiringRef.current) {
        return;
      }

      const speed = 0.35;
      const nextX = Math.max(terrain.minX + 3, Math.min(terrain.maxX - 3, s.x + direction * speed));

      // Slope resistance (can't climb steep 70-degree cliffs effortlessly)
      const slope = terrain.getSlopeAngleAt(nextX);
      if (Math.abs(slope) > 1.25) {
        return; // too steep
      }

      const fuelCost = 1.2;
      const nextFuel = Math.max(0, s.fuel - fuelCost);

      s.x = nextX;
      s.y = terrain.getHeightAt(nextX);
      s.fuel = nextFuel;

      handle.animateDrive(direction * speed);

      if (activeP === 1) {
        onTankPositionUpdate({ x: s.x, y: s.y }, { x: state2Ref.current.x, y: state2Ref.current.y });
        onFuelChange(nextFuel, state2Ref.current.fuel);
      } else {
        onTankPositionUpdate({ x: state1Ref.current.x, y: state1Ref.current.y }, { x: s.x, y: s.y });
        onFuelChange(state1Ref.current.fuel, nextFuel);
      }
    };

    // Change Biome and update lighting/materials
    const setBiome = (biomeId: string) => {
      const biome = BIOMES.find((b) => b.id === biomeId) || BIOMES[0];
      const scene = sceneRef.current;
      const terrain = terrainRef.current;
      const particles = particleSystemRef.current;
      if (!scene || !terrain) return;

      scene.background = new THREE.Color(biome.skyColor);
      scene.fog = new THREE.FogExp2(biome.fogColor, 0.007);

      if (skyMeshRef.current) {
        (skyMeshRef.current.material as THREE.MeshBasicMaterial).color.set(biome.skyColor);
      }
      if (ambLightRef.current) {
        ambLightRef.current.color.set(biome.skyColor);
        ambLightRef.current.intensity = biome.ambientIntensity;
      }
      if (dirLightRef.current) {
        dirLightRef.current.color.set(biome.sunColor);
      }

      terrain.setBiome(biome);
      particles?.initWeather(biome.weather);
    };

    // Reset battle ground and recreate tanks
    const resetBattle = (t1ConfigId: string, t2ConfigId: string, biomeId: string, isAI: boolean) => {
      const scene = sceneRef.current;
      const terrain = terrainRef.current;
      if (!scene || !terrain) return;

      // Clear projectiles & particles
      projectilesRef.current.forEach((p) => {
        scene.remove(p.mesh);
        if (p.light) scene.remove(p.light);
        disposeHierarchy(p.mesh);
      });
      projectilesRef.current = [];
      particleSystemRef.current?.clear();

      // Reset wind
      physicsRef.current.randomizeWind();

      // Regenerate terrain
      setBiome(biomeId);
      terrain.generateInitialTerrain();

      // Remove old tank meshes
      if (tank1HandleRef.current) {
        scene.remove(tank1HandleRef.current.root);
        disposeHierarchy(tank1HandleRef.current.root);
      }
      if (tank2HandleRef.current) {
        scene.remove(tank2HandleRef.current.root);
        disposeHierarchy(tank2HandleRef.current.root);
      }

      const cfg1 = TANK_ROSTER.find((t) => t.id === t1ConfigId) || TANK_ROSTER[0];
      const cfg2 = TANK_ROSTER.find((t) => t.id === t2ConfigId) || TANK_ROSTER[1];

      const t1Handle = buildTank3D(cfg1, 1);
      const t2Handle = buildTank3D(cfg2, 2);

      tank1HandleRef.current = t1Handle;
      tank2HandleRef.current = t2Handle;

      scene.add(t1Handle.root);
      scene.add(t2Handle.root);

      updateTankTransforms();
    };

    // Execute AI turn in animated steps (move -> aim -> fire)
    const executeAITurnAction = (
      moveDir: 'left' | 'right' | 'none',
      moveDist: number,
      targetAngle: number,
      targetPower: number,
      weaponIdx: number,
      onAimUpdate: (angle: number, power: number, weaponIdx: number) => void,
      onComplete: () => void
    ) => {
      let currentStep = 0;

      // 1. Move Step
      const moveInterval = setInterval(() => {
        if (moveDir !== 'none' && currentStep < moveDist * 3) {
          driveTank(moveDir === 'left' ? -1 : 1);
          currentStep++;
        } else {
          clearInterval(moveInterval);

          // 2. Aim Step (Smooth angle & power adjustment)
          state2Ref.current.selectedWeaponIndex = weaponIdx;
          const startAngle = state2Ref.current.angle;
          const startPower = state2Ref.current.power;
          const startTime = performance.now();
          const duration = 650;

          const animateAim = (time: number) => {
            const progress = Math.min(1, (time - startTime) / duration);
            const curAngle = Math.round(startAngle + (targetAngle - startAngle) * progress);
            const curPower = Math.round(startPower + (targetPower - startPower) * progress);
            state2Ref.current.angle = curAngle;
            state2Ref.current.power = curPower;
            onAimUpdate(curAngle, curPower, weaponIdx);

            if (progress < 1) {
              requestAnimationFrame(animateAim);
            } else {
              // 3. Fire Step
              setTimeout(() => {
                activePlayerRef.current = 2;
                fireCurrentWeapon();
                onComplete();
              }, 350);
            }
          };

          requestAnimationFrame(animateAim);
        }
      }, 50);
    };

    // Expose handle methods
    useImperativeHandle(ref, () => ({
      fireCurrentWeapon,
      driveTank,
      resetBattle,
      setBiome,
      getSimulationContext: () => ({
        physics: physicsRef.current,
        terrain: terrainRef.current,
        wind: physicsRef.current.wind,
      }),
      updateActiveAim: (angle, power) => {
        const s = activePlayerRef.current === 1 ? state1Ref.current : state2Ref.current;
        s.angle = angle;
        s.power = power;
      },
      executeAITurnAction,
    }));

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative select-none overflow-hidden touch-none"
        id="webgl-tank-canvas-container"
      />
    );
  }
);
