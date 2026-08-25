import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  scaleDelta: number;
  rotSpeed: number;
  type: 'spark' | 'smoke' | 'debris' | 'shockwave' | 'flame' | 'plasma';
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];

  // Reusable materials & geometries for peak performance
  private sparkGeo = new THREE.SphereGeometry(0.12, 6, 6);
  private smokeGeo = new THREE.DodecahedronGeometry(0.35, 1);
  private debrisGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  private shockwaveGeo = new THREE.RingGeometry(0.1, 0.5, 32);

  // Reusable weather geometries & materials
  private rainGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.9, 0),
  ]);
  private rainMat = new THREE.LineBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.55,
  });
  private snowGeo = new THREE.SphereGeometry(0.14, 4, 4);
  private snowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  private sandGeo = new THREE.BoxGeometry(0.2, 0.1, 0.2);
  private sandMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xd97706),
    transparent: true,
    opacity: 0.45,
  });
  private emberGeo = new THREE.SphereGeometry(0.15, 4, 4);
  private emberMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff4400),
    transparent: true,
    opacity: 0.9,
  });
  private ashGeo = new THREE.SphereGeometry(0.22, 4, 4);
  private ashMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x332222),
    transparent: true,
    opacity: 0.65,
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.shockwaveGeo.rotateX(-Math.PI / 2);
  }

  public emitMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3, color: string = '#ffaa00') {
    // Flash core
    const flashMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
    });
    const flash = new THREE.Mesh(this.sparkGeo, flashMat);
    flash.position.copy(pos);
    flash.scale.set(3.0, 3.0, 3.0);
    this.scene.add(flash);

    this.particles.push({
      mesh: flash,
      vx: dir.x * 3,
      vy: dir.y * 3,
      vz: dir.z * 3,
      life: 0.08,
      maxLife: 0.08,
      gravity: 0,
      drag: 0.9,
      scaleDelta: -25,
      rotSpeed: 0,
      type: 'flame',
    });

    // Muzzle sparks
    for (let i = 0; i < 8; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
      });
      const spark = new THREE.Mesh(this.sparkGeo, sparkMat);
      spark.position.copy(pos);
      this.scene.add(spark);

      const spread = 0.5;
      this.particles.push({
        mesh: spark,
        vx: (dir.x + (Math.random() - 0.5) * spread) * (8 + Math.random() * 8),
        vy: (dir.y + (Math.random() - 0.5) * spread) * (8 + Math.random() * 8),
        vz: (dir.z + (Math.random() - 0.5) * spread) * (8 + Math.random() * 8),
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35,
        gravity: -10,
        drag: 0.92,
        scaleDelta: -2.5,
        rotSpeed: 0,
        type: 'spark',
      });
    }
  }

  public emitTrailParticle(pos: THREE.Vector3, color: string, type: string) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.2,
      pos.y + (Math.random() - 0.5) * 0.2,
      pos.z + (Math.random() - 0.5) * 0.2
    );
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.5,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      gravity: 1.0, // slight rise
      drag: 0.95,
      scaleDelta: 0.8,
      rotSpeed: Math.random() * 2 - 1,
      type: 'smoke',
    });
  }

  public emitExplosion(
    x: number,
    y: number,
    z: number,
    radius: number,
    colorHex: string,
    isColossal: boolean = false
  ) {
    const pos = new THREE.Vector3(x, y, z);
    const count = isColossal ? 70 : 35;
    const expColor = new THREE.Color(colorHex);

    // Shockwave Ring
    const shockMat = new THREE.MeshBasicMaterial({
      color: expColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const shockwave = new THREE.Mesh(this.shockwaveGeo, shockMat);
    shockwave.position.set(x, y + 0.1, z);
    shockwave.scale.set(1, 1, 1);
    this.scene.add(shockwave);

    this.particles.push({
      mesh: shockwave,
      vx: 0,
      vy: 0,
      vz: 0,
      life: isColossal ? 0.8 : 0.45,
      maxLife: isColossal ? 0.8 : 0.45,
      gravity: 0,
      drag: 1,
      scaleDelta: (radius * (isColossal ? 18 : 12)),
      rotSpeed: 0,
      type: 'shockwave',
    });

    // Fireball center core
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(this.sparkGeo, coreMat);
    core.position.copy(pos);
    core.scale.set(radius * 1.5, radius * 1.5, radius * 1.5);
    this.scene.add(core);

    this.particles.push({
      mesh: core,
      vx: 0,
      vy: isColossal ? 2 : 0.5,
      vz: 0,
      life: isColossal ? 0.6 : 0.25,
      maxLife: isColossal ? 0.6 : 0.25,
      gravity: 0,
      drag: 0.9,
      scaleDelta: isColossal ? 4 : -5,
      rotSpeed: 0,
      type: 'flame',
    });

    // Flying debris chunks
    for (let i = 0; i < count; i++) {
      const debrisMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.4 ? expColor : new THREE.Color(0x332211),
        roughness: 0.9,
      });
      const debris = new THREE.Mesh(this.debrisGeo, debrisMat);
      debris.position.copy(pos);
      this.scene.add(debris);

      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.45 + 0.1;
      const speed = (isColossal ? 14 : 9) * (0.5 + Math.random() * 0.8);

      this.particles.push({
        mesh: debris,
        vx: Math.cos(angle) * Math.cos(elevation) * speed,
        vy: Math.sin(elevation) * speed * 1.2,
        vz: Math.sin(angle) * Math.cos(elevation) * speed * 0.5,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1.6,
        gravity: -18,
        drag: 0.97,
        scaleDelta: -0.15,
        rotSpeed: (Math.random() - 0.5) * 10,
        type: 'debris',
      });
    }

    // Rising Smoke Plumes
    const smokeCount = isColossal ? 25 : 12;
    for (let i = 0; i < smokeCount; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x222222),
        transparent: true,
        opacity: 0.6,
      });
      const sMesh = new THREE.Mesh(this.smokeGeo, sMat);
      sMesh.position.set(
        x + (Math.random() - 0.5) * radius,
        y + Math.random() * (radius * 0.5),
        z + (Math.random() - 0.5) * 2
      );
      this.scene.add(sMesh);

      this.particles.push({
        mesh: sMesh,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 1,
        life: 1.0 + Math.random() * 0.8,
        maxLife: 1.8,
        gravity: 0.5, // floats up
        drag: 0.95,
        scaleDelta: 1.8,
        rotSpeed: (Math.random() - 0.5) * 2,
        type: 'smoke',
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else if (p.mesh.material) {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics update
      p.vx *= p.drag;
      p.vy += p.gravity * dt;
      p.vy *= p.drag;
      p.vz *= p.drag;

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Rotation & Scaling
      p.mesh.rotation.x += p.rotSpeed * dt;
      p.mesh.rotation.y += p.rotSpeed * dt;

      const scaleChange = 1 + p.scaleDelta * dt;
      p.mesh.scale.multiplyScalar(Math.max(0.01, scaleChange));

      // Fade out opacity
      const lifeRatio = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.Material & { opacity?: number };
      if (mat.opacity !== undefined) {
        mat.opacity = lifeRatio * 0.8;
      }
    }
  }

  // Weather Particle System (Rain, Snow, Sandstorm, Volcanic Embers)
  private weatherParticles: {
    mesh: THREE.Mesh | THREE.Line;
    vx: number;
    vy: number;
    vz: number;
    resetY: number;
    bottomY: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    rotSpeed?: number;
  }[] = [];
  private currentWeather: string = 'clear';

  public initWeather(weatherType: string) {
    // Clear previous weather particles
    this.clearWeather();
    this.currentWeather = weatherType;

    const count =
      weatherType === 'rain'
        ? 120
        : weatherType === 'snow'
        ? 100
        : weatherType === 'sandstorm'
        ? 90
        : weatherType === 'volcanic'
        ? 60
        : 0;

    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = Math.random() * 30 - 5;
      const z = (Math.random() - 0.5) * 20;

      if (weatherType === 'rain') {
        const line = new THREE.Line(this.rainGeo, this.rainMat);
        line.position.set(x, y, z);
        this.scene.add(line);

        this.weatherParticles.push({
          mesh: line,
          vx: -2.0,
          vy: -28.0,
          vz: 0,
          resetY: 28,
          bottomY: -10,
          minX: -45,
          maxX: 45,
          minZ: -12,
          maxZ: 12,
        });
      } else if (weatherType === 'snow') {
        const snow = new THREE.Mesh(this.snowGeo, this.snowMat);
        const sc = 0.8 + Math.random() * 0.6;
        snow.scale.set(sc, sc, sc);
        snow.position.set(x, y, z);
        this.scene.add(snow);

        this.weatherParticles.push({
          mesh: snow,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -2.5 - Math.random() * 2.0,
          vz: (Math.random() - 0.5) * 1.0,
          resetY: 25,
          bottomY: -8,
          minX: -45,
          maxX: 45,
          minZ: -12,
          maxZ: 12,
          rotSpeed: Math.random() * 2,
        });
      } else if (weatherType === 'sandstorm') {
        const sand = new THREE.Mesh(this.sandGeo, this.sandMat);
        sand.position.set(x, y, z);
        this.scene.add(sand);

        this.weatherParticles.push({
          mesh: sand,
          vx: 12 + Math.random() * 10,
          vy: (Math.random() - 0.5) * 2,
          vz: (Math.random() - 0.5) * 2,
          resetY: 20,
          bottomY: -8,
          minX: -45,
          maxX: 45,
          minZ: -12,
          maxZ: 12,
          rotSpeed: Math.random() * 3,
        });
      } else if (weatherType === 'volcanic') {
        const isEmber = Math.random() > 0.4;
        const ember = new THREE.Mesh(
          isEmber ? this.emberGeo : this.ashGeo,
          isEmber ? this.emberMat : this.ashMat
        );
        ember.position.set(x, y, z);
        this.scene.add(ember);

        this.weatherParticles.push({
          mesh: ember,
          vx: (Math.random() - 0.5) * 3,
          vy: isEmber ? 1.5 + Math.random() * 3 : -2 - Math.random() * 2,
          vz: (Math.random() - 0.5) * 2,
          resetY: isEmber ? -8 : 25,
          bottomY: isEmber ? 26 : -10,
          minX: -45,
          maxX: 45,
          minZ: -12,
          maxZ: 12,
          rotSpeed: Math.random() * 2,
        });
      }
    }
  }

  public updateWeather(dt: number, wind: number = 0) {
    if (this.weatherParticles.length === 0) return;

    for (let i = 0; i < this.weatherParticles.length; i++) {
      const wp = this.weatherParticles[i];
      const windInfluence = wind * 0.25;

      wp.mesh.position.x += (wp.vx + windInfluence) * dt;
      wp.mesh.position.y += wp.vy * dt;
      wp.mesh.position.z += wp.vz * dt;

      if (wp.rotSpeed) {
        wp.mesh.rotation.y += wp.rotSpeed * dt;
      }

      // Check boundaries and loop
      if (this.currentWeather === 'volcanic' && wp.vy > 0) {
        if (wp.mesh.position.y > wp.bottomY) {
          wp.mesh.position.y = wp.resetY;
          wp.mesh.position.x = (Math.random() - 0.5) * 80;
        }
      } else {
        if (wp.mesh.position.y < wp.bottomY) {
          wp.mesh.position.y = wp.resetY;
          wp.mesh.position.x = (Math.random() - 0.5) * 80;
        }
      }

      if (wp.mesh.position.x > wp.maxX) {
        wp.mesh.position.x = wp.minX;
      } else if (wp.mesh.position.x < wp.minX) {
        wp.mesh.position.x = wp.maxX;
      }
    }
  }

  public clearWeather() {
    this.weatherParticles.forEach((wp) => {
      this.scene.remove(wp.mesh);
    });
    this.weatherParticles = [];
  }

  public clear() {
    this.clearWeather();
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach((m) => m.dispose());
      } else if (p.mesh.material) {
        p.mesh.material.dispose();
      }
    });
    this.particles = [];
  }

  public destroy() {
    this.clear();
    this.sparkGeo.dispose();
    this.smokeGeo.dispose();
    this.debrisGeo.dispose();
    this.shockwaveGeo.dispose();
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.snowGeo.dispose();
    this.snowMat.dispose();
    this.sandGeo.dispose();
    this.sandMat.dispose();
    this.emberGeo.dispose();
    this.emberMat.dispose();
    this.ashGeo.dispose();
    this.ashMat.dispose();
  }
}
