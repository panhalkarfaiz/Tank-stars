import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TankConfig, Weapon } from '../types';
import { buildTank3D, Tank3DHandle } from '../game/tankModels';
import { soundManager } from '../audio/soundManager';
import { Crosshair, Flame, Zap, Play, Sparkles, Volume2 } from 'lucide-react';

interface Hangar3DViewerProps {
  tankConfig: TankConfig;
  selectedWeaponIndex: number;
  onSelectWeaponIndex: (idx: number) => void;
}

export const Hangar3DViewer: React.FC<Hangar3DViewerProps> = ({
  tankConfig,
  selectedWeaponIndex,
  onSelectWeaponIndex,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const tankHandleRef = useRef<Tank3DHandle | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const rotationVelocityRef = useRef(0.005);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const [isFiringTest, setIsFiringTest] = useState(false);
  const [hitFeedback, setHitFeedback] = useState<{ show: boolean; text: string } | null>(null);

  const activeWeapon: Weapon =
    tankConfig.weapons[selectedWeaponIndex] || tankConfig.weapons[0];

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 320;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(42, Math.max(1, width) / Math.max(1, height), 0.1, 100);
    camera.position.set(0, 3.0, 7.5);
    camera.lookAt(0, 0.6, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(Math.max(10, width), Math.max(10, height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambLight = new THREE.AmbientLight(0xdbeafe, 1.2);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Rim back light for dramatic edge silhouette
    const rimLight = new THREE.DirectionalLight(tankConfig.glowColor, 2.5);
    rimLight.position.set(-8, 5, -8);
    scene.add(rimLight);

    // Spotlight directly over pedestal
    const spotLight = new THREE.SpotLight(tankConfig.primaryColor, 3.5, 20, Math.PI / 4, 0.4);
    spotLight.position.set(0, 8, 0);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // 5. High-Tech Rotating Pedestal
    const pedestalGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.35, 36);
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.85,
    });
    const diskMesh = new THREE.Mesh(diskGeo, diskMat);
    diskMesh.position.y = -0.18;
    diskMesh.receiveShadow = true;
    pedestalGroup.add(diskMesh);

    // Glowing rim ring
    const ringGeo = new THREE.TorusGeometry(3.65, 0.07, 12, 48);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: tankConfig.glowColor,
      emissive: tankConfig.glowColor,
      emissiveIntensity: 1.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.01;
    pedestalGroup.add(ringMesh);

    // Tech Grid pattern inside pedestal
    const innerGridGeo = new THREE.RingGeometry(0.6, 3.4, 32);
    innerGridGeo.rotateX(-Math.PI / 2);
    const innerGridMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    const innerGrid = new THREE.Mesh(innerGridGeo, innerGridMat);
    innerGrid.position.y = 0.02;
    pedestalGroup.add(innerGrid);

    // Target Drone Dummy across the hangar
    const targetGroup = new THREE.Group();
    targetGroup.position.set(9.0, 1.2, 0);
    const targetBodyGeo = new THREE.OctahedronGeometry(0.7, 1);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x7f1d1d,
      roughness: 0.2,
      metalness: 0.9,
    });
    const targetMesh = new THREE.Mesh(targetBodyGeo, targetMat);
    targetMesh.castShadow = true;
    targetGroup.add(targetMesh);

    // Floating rings around target
    const tRingGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 24);
    const tRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    const tRing = new THREE.Mesh(tRingGeo, tRingMat);
    targetGroup.add(tRing);
    scene.add(targetGroup);
    targetGroupRef.current = targetGroup;

    // 6. Tank Model
    const tankHandle = buildTank3D(tankConfig, 1);
    tankHandleRef.current = tankHandle;
    tankHandle.root.position.set(0, 0, 0);
    tankHandle.updateAim(18, 1);
    pedestalGroup.add(tankHandle.root);
    scene.add(pedestalGroup);

    // 7. Dynamic Particles & Projectiles in Hangar
    const hangarParticles: {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
    }[] = [];

    const hangarProjectiles: {
      mesh: THREE.Mesh;
      light?: THREE.PointLight;
      startX: number;
      targetX: number;
      progress: number;
      speed: number;
      weapon: Weapon;
    }[] = [];

    // Helper: spawn explosion sparks
    const spawnHangarExplosion = (x: number, y: number, z: number, color: string) => {
      const col = new THREE.Color(color);
      for (let i = 0; i < 28; i++) {
        const pGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: col });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(x, y, z);
        scene.add(pMesh);

        const angle = Math.random() * Math.PI * 2;
        const speed = 3.0 + Math.random() * 5.0;
        hangarParticles.push({
          mesh: pMesh,
          vx: Math.cos(angle) * speed,
          vy: (Math.random() - 0.2) * speed * 0.8,
          vz: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
        });
      }
    };

    // 8. Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const timeSec = currentTime / 1000;

      // Rotate Pedestal if not dragging
      if (!isDraggingRef.current) {
        pedestalGroup.rotation.y += rotationVelocityRef.current;
        rotationVelocityRef.current *= 0.98;
        if (Math.abs(rotationVelocityRef.current) < 0.003) {
          rotationVelocityRef.current = 0.004;
        }
      }

      // Animated tank sub-parts (rings, reactors, subwoofers)
      tankHandle.updateAnimation?.(timeSec);

      // Idle float for target drone
      if (targetGroupRef.current) {
        targetGroupRef.current.position.y = 1.2 + Math.sin(timeSec * 3) * 0.15;
        targetGroupRef.current.rotation.y += dt * 1.5;
        targetGroupRef.current.rotation.x = Math.sin(timeSec * 2) * 0.2;
      }

      // Update Hangar Projectiles
      for (let i = hangarProjectiles.length - 1; i >= 0; i--) {
        const hp = hangarProjectiles[i];
        hp.progress += dt * hp.speed;
        const currentX = THREE.MathUtils.lerp(hp.startX, hp.targetX, hp.progress);
        const arcY = 0.8 + Math.sin(hp.progress * Math.PI) * 1.2;
        hp.mesh.position.set(currentX, arcY, 0);
        if (hp.light) hp.light.position.copy(hp.mesh.position);

        if (hp.progress >= 1.0) {
          // Detonate at target
          scene.remove(hp.mesh);
          if (hp.light) scene.remove(hp.light);
          hangarProjectiles.splice(i, 1);

          spawnHangarExplosion(hp.targetX, 1.2, 0, hp.weapon.explosionColor || hp.weapon.color);
          soundManager.playExplosion(hp.weapon.type === 'nuke');
          setHitFeedback({
            show: true,
            text: `DIRECT HIT! -${hp.weapon.damage} DMG`,
          });
          setTimeout(() => setHitFeedback(null), 1800);
        }
      }

      // Update Particles
      for (let i = hangarParticles.length - 1; i >= 0; i--) {
        const p = hangarParticles[i];
        p.life += dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9.8 * dt; // gravity

        const scale = Math.max(0.01, 1 - p.life / p.maxLife);
        p.mesh.scale.set(scale, scale, scale);

        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          hangarParticles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

    // Expose Fire Test Weapon trigger
    (mountRef.current as any).__fireHangarWeapon = (weapon: Weapon) => {
      tankHandle.triggerFireRecoil();

      // Sound
      if (weapon.soundType === 'laser') {
        soundManager.playLaserShot();
      } else if (weapon.soundType === 'plasma') {
        soundManager.playPlasmaShot();
      } else if (weapon.soundType === 'rocket') {
        soundManager.playRocketLaunch();
      } else if (weapon.soundType === 'nuke') {
        soundManager.playNukeWarning();
        setTimeout(() => soundManager.playCannonShot(), 250);
      } else {
        soundManager.playCannonShot();
      }

      // Create Projectile Mesh
      const col = new THREE.Color(weapon.color);
      let pGeo: THREE.BufferGeometry;
      if (weapon.type === 'nuke') {
        pGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.2, 8);
        pGeo.rotateZ(Math.PI / 2);
      } else if (weapon.type === 'plasma') {
        pGeo = new THREE.SphereGeometry(0.3, 10, 10);
      } else {
        pGeo = new THREE.ConeGeometry(0.18, 0.8, 8);
        pGeo.rotateZ(-Math.PI / 2);
      }

      const pMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 1.5,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(1.5, 1.0, 0);
      scene.add(pMesh);

      const pLight = new THREE.PointLight(col, 2.0, 5);
      scene.add(pLight);

      hangarProjectiles.push({
        mesh: pMesh,
        light: pLight,
        startX: 1.5,
        targetX: 9.0,
        progress: 0,
        speed: 2.2,
        weapon,
      });

      // Muzzle spark
      spawnHangarExplosion(1.5, 1.0, 0, weapon.color);
    };

    // 9. Mouse / Touch Drag Handlers (Drag to Rotate 360°)
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      pedestalGroup.rotation.y += deltaX * 0.008;
      rotationVelocityRef.current = deltaX * 0.004;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;
      pedestalGroup.rotation.y += deltaX * 0.008;
      rotationVelocityRef.current = deltaX * 0.004;
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Resize observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 280;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [tankConfig.id]);

  const handleTestFire = () => {
    if (isFiringTest) return;
    setIsFiringTest(true);
    if (mountRef.current && (mountRef.current as any).__fireHangarWeapon) {
      (mountRef.current as any).__fireHangarWeapon(activeWeapon);
    }
    setTimeout(() => setIsFiringTest(false), 800);
  };

  return (
    <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col group select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative"
        title="Click on tank to test fire, or drag to rotate 360°!"
      />

      {/* Top Floating Badge */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
        <span
          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md border border-white/20"
          style={{ backgroundColor: `${tankConfig.glowColor}40`, color: '#ffffff' }}
        >
          LIVE 3D HANGAR BAY
        </span>
        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
          (DRAG TO ROTATE 360°)
        </span>
      </div>

      {/* Hit Feedback floating banner */}
      {hitFeedback && hitFeedback.show && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 pointer-events-none bg-red-600/90 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-full border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-bounce">
          🎯 {hitFeedback.text}
        </div>
      )}

      {/* Weapon Selector Wheel & Test Fire Action Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800">
        {/* Weapon Tabs */}
        <div className="flex items-center gap-1.5">
          {tankConfig.weapons.map((w, idx) => {
            const isSel = selectedWeaponIndex === idx;
            return (
              <button
                key={w.id}
                onClick={() => {
                  soundManager.playClick();
                  onSelectWeaponIndex(idx);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: w.color }}
                />
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{w.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Click-To-Fire Button */}
        <button
          onClick={handleTestFire}
          disabled={isFiringTest}
          className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95 ${
            isFiringTest
              ? 'bg-slate-700 text-slate-400 opacity-50'
              : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          TEST FIRE WEAPON
        </button>
      </div>
    </div>
  );
};
