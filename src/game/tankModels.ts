import * as THREE from 'three';
import { TankConfig } from '../types';

export interface Tank3DHandle {
  root: THREE.Group;
  turret: THREE.Group;
  barrel: THREE.Group;
  muzzlePoint: THREE.Object3D;
  leftTreadGroup: THREE.Group;
  rightTreadGroup: THREE.Group;
  glowMeshes: THREE.Mesh[];
  updateAim: (angleDeg: number, playerIndex: 1 | 2) => void;
  animateDrive: (distance: number) => void;
  triggerFireRecoil: () => void;
  setFrozenVisual: (isFrozen: boolean) => void;
  updateAnimation?: (timeSec: number) => void;
}

export function buildTank3D(config: TankConfig, playerIndex: 1 | 2): Tank3DHandle {
  const root = new THREE.Group();
  const turret = new THREE.Group();
  const barrel = new THREE.Group();
  const muzzlePoint = new THREE.Object3D();
  const leftTreadGroup = new THREE.Group();
  const rightTreadGroup = new THREE.Group();
  const glowMeshes: THREE.Mesh[] = [];
  const animatedParts: { mesh: THREE.Object3D; type: string; baseScale?: THREE.Vector3; basePos?: THREE.Vector3 }[] = [];

  // Team accent highlight
  const teamColor = playerIndex === 1 ? '#3b82f6' : '#ef4444'; // Blue P1, Red P2
  const primaryMat = new THREE.MeshStandardMaterial({
    color: config.primaryColor,
    roughness: 0.35,
    metalness: 0.65,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor,
    roughness: 0.55,
    metalness: 0.45,
  });

  const teamMat = new THREE.MeshStandardMaterial({
    color: teamColor,
    roughness: 0.25,
    metalness: 0.6,
    emissive: new THREE.Color(teamColor),
    emissiveIntensity: 0.35,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a24,
    roughness: 0.6,
    metalness: 0.85,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: config.accentColor,
    roughness: 0.25,
    metalness: 0.75,
    emissive: new THREE.Color(config.accentColor),
    emissiveIntensity: 0.2,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: config.glowColor,
    emissive: new THREE.Color(config.glowColor),
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
    roughness: 0.05,
  });

  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.9,
  });

  // Treads & Wheels Base (Left & Right)
  const treadLength = 3.2;
  const treadHeight = 0.8;
  const treadWidth = 0.55;
  const trackSeparation = 1.1;

  function createTreadSide(isLeft: boolean): THREE.Group {
    const group = new THREE.Group();
    const zOffset = isLeft ? trackSeparation : -trackSeparation;

    // Tread band
    const treadGeo = new THREE.BoxGeometry(treadLength, treadHeight, treadWidth);
    const treadMesh = new THREE.Mesh(treadGeo, darkMetalMat);
    treadMesh.position.set(0, treadHeight / 2, zOffset);
    treadMesh.castShadow = true;
    treadMesh.receiveShadow = true;
    group.add(treadMesh);

    // Tread wheels / rollers (4 per side with glowing hubcaps)
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, treadWidth + 0.05, 14);
    wheelGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const wx = -1.1 + (i / 3) * 2.2;
      const wheel = new THREE.Mesh(wheelGeo, secondaryMat);
      wheel.position.set(wx, 0.32, zOffset);
      wheel.castShadow = true;
      group.add(wheel);

      // Hubcap rim
      const capGeo = new THREE.CylinderGeometry(0.12, 0.12, treadWidth + 0.08, 8);
      capGeo.rotateX(Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, accentMat);
      cap.position.set(wx, 0.32, zOffset);
      group.add(cap);
    }

    // Armor skirt covering upper tread with vibrant trim
    const skirtGeo = new THREE.BoxGeometry(treadLength + 0.2, 0.25, 0.1);
    const skirt = new THREE.Mesh(skirtGeo, primaryMat);
    skirt.position.set(0, treadHeight + 0.05, zOffset + (isLeft ? 0.28 : -0.28));
    group.add(skirt);

    // Glowing skirt neon line
    const neonGeo = new THREE.BoxGeometry(treadLength, 0.05, 0.03);
    const neon = new THREE.Mesh(neonGeo, glowMat);
    neon.position.set(0, treadHeight + 0.12, zOffset + (isLeft ? 0.34 : -0.34));
    group.add(neon);
    glowMeshes.push(neon);

    return group;
  }

  const leftTread = createTreadSide(true);
  const rightTread = createTreadSide(false);
  leftTreadGroup.add(leftTread);
  rightTreadGroup.add(rightTread);
  root.add(leftTreadGroup);
  root.add(rightTreadGroup);

  // Main Hull Chassis
  const hullGeo = new THREE.BoxGeometry(2.8, 0.7, 2.0);
  const hull = new THREE.Mesh(hullGeo, primaryMat);
  hull.position.set(0, 0.85, 0);
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  // Sloped Front Glacis Plate
  const glacisGeo = new THREE.BoxGeometry(0.9, 0.55, 1.9);
  const glacis = new THREE.Mesh(glacisGeo, primaryMat);
  glacis.position.set(1.4, 0.7, 0);
  glacis.rotation.z = -Math.PI / 6;
  glacis.castShadow = true;
  root.add(glacis);

  // Front Headlights (Left & Right)
  const headlightGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 10);
  headlightGeo.rotateZ(-Math.PI / 2);
  const headlightL = new THREE.Mesh(headlightGeo, headlightMat);
  headlightL.position.set(1.8, 0.85, 0.7);
  const headlightR = new THREE.Mesh(headlightGeo, headlightMat);
  headlightR.position.set(1.8, 0.85, -0.7);
  root.add(headlightL, headlightR);
  glowMeshes.push(headlightL, headlightR);

  // Rear Engine Deck & Exhaust
  const engineDeckGeo = new THREE.BoxGeometry(0.8, 0.35, 1.8);
  const engineDeck = new THREE.Mesh(engineDeckGeo, secondaryMat);
  engineDeck.position.set(-1.1, 1.1, 0);
  root.add(engineDeck);

  // Exhaust pipes with glow tip
  const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
  exhaustGeo.rotateZ(Math.PI / 3);
  const exhaustL = new THREE.Mesh(exhaustGeo, darkMetalMat);
  exhaustL.position.set(-1.45, 1.1, 0.6);
  const exhaustR = new THREE.Mesh(exhaustGeo, darkMetalMat);
  exhaustR.position.set(-1.45, 1.1, -0.6);
  root.add(exhaustL, exhaustR);

  // Team Marker Badge Stripe on Chassis
  const badgeGeo = new THREE.BoxGeometry(1.6, 0.12, 2.05);
  const badge = new THREE.Mesh(badgeGeo, teamMat);
  badge.position.set(0, 0.92, 0);
  root.add(badge);

  // Turret Mount Base
  turret.position.set(-0.1, 1.25, 0);

  // Archetype-Specific Turret & Weapon Customization
  switch (config.modelType) {
    case 'abrams': {
      // Modern MBT Angular turret with sloped composite cheeks
      const turretGeo = new THREE.BoxGeometry(2.0, 0.65, 1.6);
      const mainTurret = new THREE.Mesh(turretGeo, primaryMat);
      mainTurret.castShadow = true;
      turret.add(mainTurret);

      // Sloped front cheek armor
      const cheekGeo = new THREE.BoxGeometry(0.8, 0.6, 0.45);
      const cheekL = new THREE.Mesh(cheekGeo, primaryMat);
      cheekL.position.set(0.65, 0.02, 0.6);
      cheekL.rotation.y = -0.35;
      const cheekR = new THREE.Mesh(cheekGeo, primaryMat);
      cheekR.position.set(0.65, 0.02, -0.6);
      cheekR.rotation.y = 0.35;
      turret.add(cheekL, cheekR);

      // Rear bustle rack & blow-out ammo storage compartment
      const bustleGeo = new THREE.BoxGeometry(0.7, 0.45, 1.4);
      const bustle = new THREE.Mesh(bustleGeo, secondaryMat);
      bustle.position.set(-1.0, 0.05, 0);
      turret.add(bustle);

      // Commander Independent Thermal Viewer (CITV) & Hatches
      const citvGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 10);
      const citv = new THREE.Mesh(citvGeo, darkMetalMat);
      citv.position.set(-0.2, 0.48, -0.45);
      const citvLensGeo = new THREE.BoxGeometry(0.15, 0.12, 0.15);
      const citvLens = new THREE.Mesh(citvLensGeo, glowMat);
      citvLens.position.set(0.08, 0.1, 0);
      citv.add(citvLens);
      turret.add(citv);
      glowMeshes.push(citvLens);

      const hatchGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12);
      const hatch = new THREE.Mesh(hatchGeo, secondaryMat);
      hatch.position.set(-0.35, 0.38, 0.4);
      turret.add(hatch);

      // Smoke Grenade Dischargers (Left & Right)
      for (let s = 0; s < 4; s++) {
        const smokeTubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8);
        smokeTubeGeo.rotateX(0.4);
        smokeTubeGeo.rotateZ(0.2);
        const smkL = new THREE.Mesh(smokeTubeGeo, darkMetalMat);
        smkL.position.set(0.3 + s * 0.1, 0.32, 0.75);
        const smkR = new THREE.Mesh(smokeTubeGeo, darkMetalMat);
        smkR.position.set(0.3 + s * 0.1, 0.32, -0.75);
        turret.add(smkL, smkR);
      }

      // M256 120mm Smoothbore Cannon Barrel assembly
      barrel.position.set(0.9, 0.08, 0);
      const barrelGeo = new THREE.CylinderGeometry(0.11, 0.13, 3.0, 14);
      barrelGeo.rotateZ(-Math.PI / 2);
      barrelGeo.translate(1.5, 0, 0);
      const mainBarrel = new THREE.Mesh(barrelGeo, darkMetalMat);
      mainBarrel.castShadow = true;
      barrel.add(mainBarrel);

      // Bore Evacuator / Fume Extractor collar (characteristic bulge in modern barrels)
      const evacuatorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12);
      evacuatorGeo.rotateZ(-Math.PI / 2);
      evacuatorGeo.translate(1.4, 0, 0);
      const evacuator = new THREE.Mesh(evacuatorGeo, primaryMat);
      barrel.add(evacuator);

      // Thermal shroud bands
      const bandGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10);
      bandGeo.rotateZ(-Math.PI / 2);
      const band1 = new THREE.Mesh(bandGeo, accentMat);
      band1.position.set(0.5, 0, 0);
      const band2 = new THREE.Mesh(bandGeo, accentMat);
      band2.position.set(2.4, 0, 0);
      barrel.add(band1, band2);

      // Muzzle reference sensor & Tip
      const mTipGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.2, 12);
      mTipGeo.rotateZ(-Math.PI / 2);
      mTipGeo.translate(3.0, 0, 0);
      const mTip = new THREE.Mesh(mTipGeo, darkMetalMat);
      barrel.add(mTip);

      muzzlePoint.position.set(3.1, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'tiger': {
      // ==========================================
      // HISTORIC GERMAN PANZER VI TIGER I (AUSF. E)
      // ==========================================
      // Horseshoe-shaped Tiger turret with flat vertical side plates
      const tigerTurretGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.75, 16);
      tigerTurretGeo.scale(1.2, 1.0, 1.0);
      const tigerTurret = new THREE.Mesh(tigerTurretGeo, primaryMat);
      tigerTurret.castShadow = true;
      turret.add(tigerTurret);

      // Thick curved gun mantlet (Walzenblende)
      const mantletGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.1, 14);
      mantletGeo.rotateX(Math.PI / 2);
      const mantlet = new THREE.Mesh(mantletGeo, secondaryMat);
      mantlet.position.set(1.0, 0.05, 0);
      mantlet.castShadow = true;
      turret.add(mantlet);

      // Authentic German Commander Cupola (Kuppel) with vision periscopes
      const cupolaGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.32, 12);
      const cupola = new THREE.Mesh(cupolaGeo, secondaryMat);
      cupola.position.set(-0.35, 0.45, 0.45);
      
      // Vision slit ring on cupola
      const slitRingGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.08, 12);
      const slitRing = new THREE.Mesh(slitRingGeo, darkMetalMat);
      slitRing.position.set(0, 0.02, 0);
      cupola.add(slitRing);

      // Cupola hatch lid
      const lidGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10);
      const lid = new THREE.Mesh(lidGeo, primaryMat);
      lid.position.set(0, 0.18, 0);
      cupola.add(lid);
      turret.add(cupola);

      // Rear Turret Equipment Stowage Box (Rommelkiste)
      const rommelGeo = new THREE.BoxGeometry(0.65, 0.42, 0.85);
      const rommel = new THREE.Mesh(rommelGeo, primaryMat);
      rommel.position.set(-1.15, 0.05, 0);
      rommel.castShadow = true;
      turret.add(rommel);

      // Spare track links mounted on turret sides (Historical Tiger I feature)
      for (let tr = 0; tr < 3; tr++) {
        const trkGeo = new THREE.BoxGeometry(0.12, 0.35, 0.08);
        const trkL = new THREE.Mesh(trkGeo, darkMetalMat);
        trkL.position.set(-0.2 + tr * 0.28, 0.05, 0.95);
        const trkR = new THREE.Mesh(trkGeo, darkMetalMat);
        trkR.position.set(-0.2 + tr * 0.28, 0.05, -0.95);
        turret.add(trkL, trkR);
      }

      // German Balkenkreuz National Emblems on turret sides
      const crossGeo = new THREE.BoxGeometry(0.3, 0.3, 0.02);
      const crossMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1,
      });
      const crossL = new THREE.Mesh(crossGeo, crossMat);
      crossL.position.set(0.3, 0.1, 1.02);
      const crossR = new THREE.Mesh(crossGeo, crossMat);
      crossR.position.set(0.3, 0.1, -1.02);
      turret.add(crossL, crossR);

      // Dual Feifel Heavy Air Cleaners on rear engine deck with intake pipes
      const feifelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 10);
      const feifelL = new THREE.Mesh(feifelGeo, secondaryMat);
      feifelL.position.set(-1.35, -0.15, 0.6);
      const feifelR = new THREE.Mesh(feifelGeo, secondaryMat);
      feifelR.position.set(-1.35, -0.15, -0.6);
      turret.add(feifelL, feifelR);

      // 8.8 cm KwK 36 L/56 Heavy Gun Barrel
      barrel.position.set(1.0, 0.05, 0);
      const kwkBarrelGeo = new THREE.CylinderGeometry(0.11, 0.15, 3.2, 14);
      kwkBarrelGeo.rotateZ(-Math.PI / 2);
      kwkBarrelGeo.translate(1.6, 0, 0);
      const kwkBarrel = new THREE.Mesh(kwkBarrelGeo, darkMetalMat);
      kwkBarrel.castShadow = true;
      barrel.add(kwkBarrel);

      // Barrel reinforcement collar at the base
      const collarGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.4, 12);
      collarGeo.rotateZ(-Math.PI / 2);
      collarGeo.translate(0.25, 0, 0);
      const collar = new THREE.Mesh(collarGeo, primaryMat);
      barrel.add(collar);

      // Characteristic Tiger I Bell-Shaped Double-Baffle Muzzle Brake (Zweikammer-Mündungsbremse)
      const muzzleBrakeBodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.48, 12);
      muzzleBrakeBodyGeo.rotateZ(-Math.PI / 2);
      muzzleBrakeBodyGeo.translate(3.1, 0, 0);
      const muzzleBrake = new THREE.Mesh(muzzleBrakeBodyGeo, secondaryMat);

      // Side gas vents on muzzle brake
      const ventGeo = new THREE.BoxGeometry(0.18, 0.15, 0.32);
      ventGeo.translate(3.1, 0, 0);
      const vent = new THREE.Mesh(ventGeo, darkMetalMat);
      muzzleBrake.add(vent);
      barrel.add(muzzleBrake);

      // Muzzle flash ring
      const tipRingGeo = new THREE.TorusGeometry(0.13, 0.04, 8, 12);
      tipRingGeo.rotateY(Math.PI / 2);
      tipRingGeo.translate(3.35, 0, 0);
      const tipRing = new THREE.Mesh(tipRingGeo, accentMat);
      barrel.add(tipRing);

      muzzlePoint.position.set(3.4, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'frost': {
      // Ice crystal faceted turret
      const turretGeo = new THREE.OctahedronGeometry(0.9, 0);
      turretGeo.scale(1.2, 0.7, 1.1);
      const mainTurret = new THREE.Mesh(turretGeo, primaryMat);
      mainTurret.castShadow = true;
      turret.add(mainTurret);

      // Glowing ice canisters
      for (let i = 0; i < 3; i++) {
        const canGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8);
        const canMesh = new THREE.Mesh(canGeo, glowMat);
        canMesh.position.set(-0.6, 0.2, -0.4 + i * 0.4);
        turret.add(canMesh);
        glowMeshes.push(canMesh);
        animatedParts.push({ mesh: canMesh, type: 'frostCanister' });
      }

      // Triple Cryo Rail Barrel
      barrel.position.set(0.6, 0.1, 0);
      const railGeo = new THREE.BoxGeometry(2.6, 0.08, 0.08);
      railGeo.translate(1.3, 0, 0);

      const rail1 = new THREE.Mesh(railGeo, accentMat);
      rail1.position.set(0, 0.1, 0.1);
      const rail2 = new THREE.Mesh(railGeo, accentMat);
      rail2.position.set(0, 0.1, -0.1);
      const rail3 = new THREE.Mesh(railGeo, accentMat);
      rail3.position.set(0, -0.1, 0);

      const coreGlowGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
      coreGlowGeo.rotateZ(-Math.PI / 2);
      coreGlowGeo.translate(1.2, 0, 0);
      const coreGlow = new THREE.Mesh(coreGlowGeo, glowMat);
      barrel.add(rail1, rail2, rail3, coreGlow);
      glowMeshes.push(coreGlow);

      muzzlePoint.position.set(2.7, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'buratino': {
      // MLRS Rocket Pod (Grid of 3x4 tubes)
      const turretBaseGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 12);
      const baseMesh = new THREE.Mesh(turretBaseGeo, secondaryMat);
      turret.add(baseMesh);

      // Pivoting rocket rack
      barrel.position.set(0, 0.3, 0);
      const podBoxGeo = new THREE.BoxGeometry(2.2, 0.9, 1.4);
      podBoxGeo.translate(0.6, 0.2, 0);
      const podBox = new THREE.Mesh(podBoxGeo, primaryMat);
      barrel.add(podBox);

      // Side hazard stripes
      const stripeGeo = new THREE.BoxGeometry(1.6, 0.1, 0.05);
      const stripeL = new THREE.Mesh(stripeGeo, accentMat);
      stripeL.position.set(0.6, 0.2, 0.73);
      const stripeR = new THREE.Mesh(stripeGeo, accentMat);
      stripeR.position.set(0.6, 0.2, -0.73);
      barrel.add(stripeL, stripeR);

      // Rocket tubes inside the front face
      const tubeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8);
      tubeGeo.rotateZ(-Math.PI / 2);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          const tube = new THREE.Mesh(tubeGeo, darkMetalMat);
          tube.position.set(1.7, -0.1 + r * 0.4, -0.45 + c * 0.3);
          barrel.add(tube);

          // Red rocket warhead tip inside tube
          const tipGeo = new THREE.ConeGeometry(0.08, 0.12, 6);
          tipGeo.rotateZ(-Math.PI / 2);
          const tip = new THREE.Mesh(tipGeo, glowMat);
          tip.position.set(1.8, -0.1 + r * 0.4, -0.45 + c * 0.3);
          barrel.add(tip);
          glowMeshes.push(tip);
        }
      }

      muzzlePoint.position.set(1.9, 0.2, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'spectre': {
      // Antigravity Sleek Hovercraft
      const hoverTurretGeo = new THREE.ConeGeometry(1.0, 1.6, 6);
      hoverTurretGeo.rotateZ(-Math.PI / 2);
      const hoverTurret = new THREE.Mesh(hoverTurretGeo, primaryMat);
      turret.add(hoverTurret);

      // Plasma focusing floating rings
      const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 8, 16);
      ringGeo.rotateY(Math.PI / 2);
      const ring1 = new THREE.Mesh(ringGeo, glowMat);
      ring1.position.set(0.9, 0, 0);
      const ring2 = new THREE.Mesh(ringGeo, glowMat);
      ring2.position.set(1.5, 0, 0);
      ring2.scale.set(0.75, 0.75, 0.75);

      barrel.position.set(0.4, 0.1, 0);
      barrel.add(ring1, ring2);
      glowMeshes.push(ring1, ring2);
      animatedParts.push({ mesh: ring1, type: 'spectreRing1' });
      animatedParts.push({ mesh: ring2, type: 'spectreRing2' });

      // Center emitter needle
      const needleGeo = new THREE.CylinderGeometry(0.04, 0.12, 2.2, 8);
      needleGeo.rotateZ(-Math.PI / 2);
      needleGeo.translate(1.1, 0, 0);
      const needle = new THREE.Mesh(needleGeo, accentMat);
      barrel.add(needle);

      // Hover anti-grav pods underneath
      for (let i = 0; i < 4; i++) {
        const podGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const pod = new THREE.Mesh(podGeo, glowMat);
        pod.position.set(i < 2 ? 1.0 : -1.0, -0.4, i % 2 === 0 ? 0.8 : -0.8);
        root.add(pod);
        glowMeshes.push(pod);
        animatedParts.push({ mesh: pod, type: 'spectreHover' });
      }

      muzzlePoint.position.set(2.3, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'atomic': {
      // Nuclear Reactor on back
      const reactorGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12);
      const reactor = new THREE.Mesh(reactorGeo, glowMat);
      reactor.position.set(-0.7, 0.6, 0);
      reactor.rotation.x = Math.PI / 2;
      turret.add(reactor);
      glowMeshes.push(reactor);
      animatedParts.push({ mesh: reactor, type: 'atomicReactor' });

      const shieldGeo = new THREE.BoxGeometry(1.4, 0.8, 1.6);
      const shield = new THREE.Mesh(shieldGeo, primaryMat);
      turret.add(shield);

      // Heavy Mega Cannon with radiation cooling vents
      barrel.position.set(0.6, 0.1, 0);
      const barrelGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.7, 12);
      barrelGeo.rotateZ(-Math.PI / 2);
      barrelGeo.translate(1.35, 0, 0);
      const mainBarrel = new THREE.Mesh(barrelGeo, darkMetalMat);
      barrel.add(mainBarrel);

      const nukeRingGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 12);
      nukeRingGeo.rotateY(Math.PI / 2);
      const ring = new THREE.Mesh(nukeRingGeo, glowMat);
      ring.position.set(2.2, 0, 0);
      barrel.add(ring);
      glowMeshes.push(ring);
      animatedParts.push({ mesh: ring, type: 'atomicRing' });

      muzzlePoint.position.set(2.8, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'helios': {
      // Solar Panels & Gold Prisms
      const domeGeo = new THREE.SphereGeometry(0.8, 8, 6);
      domeGeo.scale(1.2, 0.6, 1.0);
      const dome = new THREE.Mesh(domeGeo, accentMat);
      turret.add(dome);

      // Solar focus wings
      const wingGeo = new THREE.BoxGeometry(0.8, 0.08, 0.8);
      const wingL = new THREE.Mesh(wingGeo, glowMat);
      wingL.position.set(-0.3, 0.4, 0.9);
      wingL.rotation.x = 0.3;
      const wingR = new THREE.Mesh(wingGeo, glowMat);
      wingR.position.set(-0.3, 0.4, -0.9);
      wingR.rotation.x = -0.3;
      turret.add(wingL, wingR);
      glowMeshes.push(wingL, wingR);
      animatedParts.push({ mesh: wingL, type: 'heliosWingL' });
      animatedParts.push({ mesh: wingR, type: 'heliosWingR' });

      // Twin Solar Lenses
      barrel.position.set(0.7, 0.1, 0);
      const laserTubeGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.6, 10);
      laserTubeGeo.rotateZ(-Math.PI / 2);
      laserTubeGeo.translate(1.3, 0, 0);
      const laserTube = new THREE.Mesh(laserTubeGeo, primaryMat);
      barrel.add(laserTube);

      const lensGeo = new THREE.SphereGeometry(0.2, 10, 8);
      const lens = new THREE.Mesh(lensGeo, glowMat);
      lens.position.set(2.6, 0, 0);
      barrel.add(lens);
      glowMeshes.push(lens);

      muzzlePoint.position.set(2.8, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'coalition': {
      // Heavy Dreadnought Dual Barrel
      const dreadTurretGeo = new THREE.BoxGeometry(2.0, 0.8, 1.8);
      const dreadTurret = new THREE.Mesh(dreadTurretGeo, primaryMat);
      turret.add(dreadTurret);

      // Red LED warning bar
      const barGeo = new THREE.BoxGeometry(1.6, 0.08, 0.08);
      const bar = new THREE.Mesh(barGeo, glowMat);
      bar.position.set(0.4, 0.35, 0);
      turret.add(bar);
      glowMeshes.push(bar);

      barrel.position.set(0.8, 0.15, 0);
      const bGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.9, 10);
      bGeo.rotateZ(-Math.PI / 2);
      bGeo.translate(1.45, 0, 0);

      const b1 = new THREE.Mesh(bGeo, darkMetalMat);
      b1.position.set(0, 0, 0.3);
      const b2 = new THREE.Mesh(bGeo, darkMetalMat);
      b2.position.set(0, 0, -0.3);
      barrel.add(b1, b2);

      muzzlePoint.position.set(3.0, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'toxicator': {
      // Corrosive Acid Mortar
      const tankTurretGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.6, 10);
      const tankTurret = new THREE.Mesh(tankTurretGeo, primaryMat);
      turret.add(tankTurret);

      // Acid flask
      const flaskGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const flask = new THREE.Mesh(flaskGeo, glowMat);
      flask.position.set(-0.5, 0.5, 0);
      turret.add(flask);
      glowMeshes.push(flask);
      animatedParts.push({ mesh: flask, type: 'toxicFlask' });

      // Cone mortar nozzle
      barrel.position.set(0.5, 0.2, 0);
      const mortarGeo = new THREE.ConeGeometry(0.35, 2.0, 10, 1, true);
      mortarGeo.rotateZ(-Math.PI / 2);
      mortarGeo.translate(1.0, 0, 0);
      const mortar = new THREE.Mesh(mortarGeo, darkMetalMat);
      barrel.add(mortar);

      muzzlePoint.position.set(2.2, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }

    case 'dubstep': {
      // Boombox Speaker Tank
      const boxTurretGeo = new THREE.BoxGeometry(1.6, 0.9, 1.6);
      const boxTurret = new THREE.Mesh(boxTurretGeo, primaryMat);
      turret.add(boxTurret);

      // Side Subwoofer Cones
      const subGeo = new THREE.CylinderGeometry(0.35, 0.15, 0.2, 12);
      const subL = new THREE.Mesh(subGeo, glowMat);
      subL.position.set(0, 0.1, 0.85);
      subL.rotation.x = Math.PI / 2;
      const subR = new THREE.Mesh(subGeo, glowMat);
      subR.position.set(0, 0.1, -0.85);
      subR.rotation.x = -Math.PI / 2;
      turret.add(subL, subR);
      glowMeshes.push(subL, subR);
      animatedParts.push({ mesh: subL, type: 'dubstepSub' });
      animatedParts.push({ mesh: subR, type: 'dubstepSub' });

      // Horn Barrel
      barrel.position.set(0.6, 0.1, 0);
      const hornGeo = new THREE.CylinderGeometry(0.3, 0.12, 2.3, 10);
      hornGeo.rotateZ(-Math.PI / 2);
      hornGeo.translate(1.15, 0, 0);
      const horn = new THREE.Mesh(hornGeo, accentMat);
      barrel.add(horn);

      muzzlePoint.position.set(2.4, 0, 0);
      barrel.add(muzzlePoint);
      break;
    }
  }

  turret.add(barrel);
  root.add(turret);

  // Ice encasing mesh for frozen status effect
  const iceCageGeo = new THREE.BoxGeometry(3.6, 2.4, 2.8);
  const iceCage = new THREE.Mesh(iceCageGeo, iceMat);
  iceCage.position.set(0, 1.1, 0);
  iceCage.visible = false;
  root.add(iceCage);

  // Handle methods
  const updateAim = (angleDeg: number, pIdx: 1 | 2) => {
    // If player 2 (facing left initially), invert horizontal aim reference
    const rad = (angleDeg * Math.PI) / 180;
    if (pIdx === 1) {
      // Facing right: angle 0 is right, angle 90 is up, angle 180 is left
      turret.rotation.y = 0;
      barrel.rotation.z = rad;
    } else {
      // Facing left: angle 0 is left, angle 90 is up, angle 180 is right
      turret.rotation.y = Math.PI;
      barrel.rotation.z = rad;
    }
  };

  const animateDrive = (distance: number) => {
    // Wheel / tread animation rotation
    leftTreadGroup.children.forEach((c) => {
      c.children.forEach((sub) => {
        if (sub instanceof THREE.Mesh && sub.geometry.type === 'CylinderGeometry') {
          sub.rotation.z += distance * 0.8;
        }
      });
    });
    rightTreadGroup.children.forEach((c) => {
      c.children.forEach((sub) => {
        if (sub instanceof THREE.Mesh && sub.geometry.type === 'CylinderGeometry') {
          sub.rotation.z += distance * 0.8;
        }
      });
    });
  };

  const triggerFireRecoil = () => {
    // Smooth kickback animation on the barrel
    const originalPos = barrel.position.x;
    barrel.position.x -= 0.4;
    const startTime = performance.now();

    const animateRecoil = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / 180);
      barrel.position.x = originalPos - 0.4 * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(animateRecoil);
      } else {
        barrel.position.x = originalPos;
      }
    };
    requestAnimationFrame(animateRecoil);
  };

  const setFrozenVisual = (isFrozen: boolean) => {
    iceCage.visible = isFrozen;
  };

  const updateAnimation = (timeSec: number) => {
    animatedParts.forEach((part) => {
      if (part.type === 'spectreRing1') {
        part.mesh.rotation.x = timeSec * 3.0;
      } else if (part.type === 'spectreRing2') {
        part.mesh.rotation.x = -timeSec * 4.0;
      } else if (part.type === 'spectreHover') {
        const pulse = 1.0 + Math.sin(timeSec * 6) * 0.15;
        part.mesh.scale.set(pulse, pulse, pulse);
      } else if (part.type === 'atomicReactor') {
        part.mesh.rotation.z = timeSec * 2.0;
      } else if (part.type === 'atomicRing') {
        part.mesh.rotation.x = timeSec * 3.5;
      } else if (part.type === 'heliosWingL') {
        part.mesh.rotation.x = 0.3 + Math.sin(timeSec * 2) * 0.1;
      } else if (part.type === 'heliosWingR') {
        part.mesh.rotation.x = -0.3 - Math.sin(timeSec * 2) * 0.1;
      } else if (part.type === 'toxicFlask') {
        const s = 1.0 + Math.sin(timeSec * 4) * 0.08;
        part.mesh.scale.set(s, s, s);
      } else if (part.type === 'dubstepSub') {
        const beat = 1.0 + Math.abs(Math.sin(timeSec * 8)) * 0.3;
        part.mesh.scale.set(beat, beat, beat);
      } else if (part.type === 'frostCanister') {
        const g = 1.0 + Math.sin(timeSec * 3) * 0.1;
        part.mesh.scale.set(g, g, g);
      }
    });
  };

  return {
    root,
    turret,
    barrel,
    muzzlePoint,
    leftTreadGroup,
    rightTreadGroup,
    glowMeshes,
    updateAim,
    animateDrive,
    triggerFireRecoil,
    setFrozenVisual,
    updateAnimation,
  };
}
