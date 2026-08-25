import * as THREE from 'three';
import { BiomeConfig } from './constants';

export class TerrainManager {
  public width: number = 90;
  public depth: number = 24;
  public resolutionX: number = 360;
  public resolutionZ: number = 24;
  public heights: Float32Array;
  public minX: number = -45;
  public maxX: number = 45;
  public minZ: number = -12;
  public maxZ: number = 12;
  
  public mesh: THREE.Mesh | null = null;
  public cliffMesh: THREE.Mesh | null = null;
  public geometry: THREE.BufferGeometry | null = null;
  public biome: BiomeConfig;

  // Crater impact tracking for burn marks
  private craterCenters: { x: number; y: number; r: number }[] = [];

  constructor(biome: BiomeConfig) {
    this.biome = biome;
    this.heights = new Float32Array(this.resolutionX);
    this.generateInitialTerrain();
  }

  public setBiome(biome: BiomeConfig) {
    this.biome = biome;
    this.updateMeshColors();
  }

  public generateInitialTerrain(seed: number = Math.random()) {
    this.craterCenters = [];
    const stepX = this.width / (this.resolutionX - 1);
    
    // Perlin-style harmonious hills with natural valleys and plateaus
    const f1 = 0.035;
    const f2 = 0.085;
    const f3 = 0.17;
    const offset1 = seed * 100;
    const offset2 = seed * 237;

    for (let i = 0; i < this.resolutionX; i++) {
      const x = this.minX + i * stepX;
      
      // Keep boundaries slightly elevated so tanks don't easily drive off cliffs
      const edgeFactor = Math.pow(Math.abs(x) / this.maxX, 4) * 6;
      
      const h1 = Math.sin(x * f1 + offset1) * 5.0;
      const h2 = Math.cos(x * f2 + offset2) * 2.5;
      const h3 = Math.sin(x * f3 + seed * 50) * 1.0;
      
      // Base ground elevation around y = 0
      let y = h1 + h2 + h3 + edgeFactor;
      
      // Smooth valley in the middle for exciting line of sight
      if (Math.abs(x) < 8) {
        y *= 0.85;
      }

      this.heights[i] = Math.max(-10, y);
    }

    if (this.geometry) {
      this.rebuildGeometry();
    }
  }

  public getHeightAt(x: number): number {
    if (x <= this.minX) return this.heights[0];
    if (x >= this.maxX) return this.heights[this.resolutionX - 1];

    const t = (x - this.minX) / this.width;
    const idxExact = t * (this.resolutionX - 1);
    const idx0 = Math.floor(idxExact);
    const idx1 = Math.min(this.resolutionX - 1, idx0 + 1);
    const frac = idxExact - idx0;

    return this.heights[idx0] * (1 - frac) + this.heights[idx1] * frac;
  }

  public getSlopeAngleAt(x: number): number {
    const delta = 0.5;
    const hLeft = this.getHeightAt(x - delta);
    const hRight = this.getHeightAt(x + delta);
    return Math.atan2(hRight - hLeft, delta * 2);
  }

  public getNormalAt(x: number): THREE.Vector3 {
    const angle = this.getSlopeAngleAt(x);
    // 2D normal rotated by slope
    return new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).normalize();
  }

  // Carve a blast crater into the terrain
  public carveCrater(centerX: number, centerY: number, radius: number, depthScale: number = 1.0): boolean {
    const stepX = this.width / (this.resolutionX - 1);
    const minIndex = Math.max(0, Math.floor((centerX - radius - this.minX) / stepX));
    const maxIndex = Math.min(this.resolutionX - 1, Math.ceil((centerX + radius - this.minX) / stepX));
    
    let modified = false;
    this.craterCenters.push({ x: centerX, y: centerY, r: radius });
    if (this.craterCenters.length > 20) {
      this.craterCenters.shift();
    }

    for (let i = minIndex; i <= maxIndex; i++) {
      const x = this.minX + i * stepX;
      const dx = x - centerX;
      const distSq = dx * dx;
      const radSq = radius * radius;

      if (distSq < radSq) {
        // Spherical hollow cutout
        const sphereDepth = Math.sqrt(radSq - distSq) * depthScale;
        const craterBottom = centerY - sphereDepth;
        
        if (craterBottom < this.heights[i]) {
          // Smooth blend toward crater bottom
          this.heights[i] = Math.max(-12, craterBottom);
          modified = true;
        }
      }
    }

    // Add slight dirt lip rim on outer edges
    const lipWidth = radius * 0.25;
    const leftLipIdx = Math.max(0, Math.floor((centerX - radius - lipWidth - this.minX) / stepX));
    const rightLipIdx = Math.min(this.resolutionX - 1, Math.ceil((centerX + radius + lipWidth - this.minX) / stepX));
    
    for (let i = leftLipIdx; i < minIndex; i++) {
      const x = this.minX + i * stepX;
      const distFromEdge = Math.abs(x - (centerX - radius));
      if (distFromEdge < lipWidth) {
        this.heights[i] += (1 - distFromEdge / lipWidth) * 0.3 * depthScale;
      }
    }
    for (let i = maxIndex + 1; i <= rightLipIdx; i++) {
      const x = this.minX + i * stepX;
      const distFromEdge = Math.abs(x - (centerX + radius));
      if (distFromEdge < lipWidth) {
        this.heights[i] += (1 - distFromEdge / lipWidth) * 0.3 * depthScale;
      }
    }

    if (modified && this.geometry) {
      this.rebuildGeometry();
    }

    return modified;
  }

  public createMesh(): THREE.Group {
    const group = new THREE.Group();

    // Top surface with 3D width & depth grid
    this.geometry = new THREE.BufferGeometry();
    this.rebuildGeometry();

    const topMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, topMat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    group.add(this.mesh);

    return group;
  }

  public rebuildGeometry() {
    if (!this.geometry) return;

    const nx = this.resolutionX;
    const nz = this.resolutionZ;
    const stepX = this.width / (nx - 1);
    const stepZ = this.depth / (nz - 1);

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const groundCol = new THREE.Color(this.biome.groundColor);
    const grassCol = new THREE.Color(this.biome.grassColor);
    const cliffCol = new THREE.Color(this.biome.cliffColor);
    const burnCol = new THREE.Color(0x110c08);
    const snowCapCol = new THREE.Color(0xf1f8ff);
    const magmaCol = new THREE.Color(0xff3b00);

    // Build grid vertices with fine micro-features
    for (let iz = 0; iz < nz; iz++) {
      const z = this.minZ + iz * stepZ;
      // Crown curvature with natural ridge fluctuation
      const zNorm = iz / (nz - 1);
      const zEdge = Math.sin(zNorm * Math.PI);
      const zFactor = 0.92 + 0.08 * zEdge;

      for (let ix = 0; ix < nx; ix++) {
        const x = this.minX + ix * stepX;
        
        // Micro-relief noise for detailed terrain depth
        const microNoise = Math.sin(x * 0.8 + z * 1.2) * 0.12 + Math.cos(x * 1.5 - z * 0.7) * 0.08;
        let y = this.heights[ix] * zFactor + (iz === 0 || iz === nz - 1 ? 0 : microNoise);

        // Front and back skirts drop to bottom for solid 3D cliff look
        if (iz === 0 || iz === nz - 1) {
          y = -14;
        }

        positions.push(x, y, z);

        // Vertex coloring based on slope, height, weather, and crater burn
        const slope = Math.abs(this.getSlopeAngleAt(x));
        const color = new THREE.Color();

        if (iz === 0 || iz === nz - 1) {
          // Bottom bedrock skirt
          color.copy(cliffCol).multiplyScalar(0.75);
        } else if (slope > 0.7) {
          // Steep cliff rock strata
          color.copy(cliffCol);
          // Add subtle strata banding
          const strata = (Math.sin(y * 2.2) + 1) * 0.08;
          color.addScalar(strata);
        } else if (slope < 0.3) {
          // Flat plateau or lush valley
          color.copy(grassCol);
        } else {
          // Intermediate slope
          color.copy(groundCol);
        }

        // Weather-specific terrain styling
        if (this.biome.weather === 'snow') {
          // Snow frosting on high peaks and gentle slopes
          if (y > 2.0 && slope < 0.6) {
            const snowMix = Math.min(1.0, (y - 2.0) * 0.35 + (0.6 - slope) * 0.5);
            color.lerp(snowCapCol, snowMix * 0.85);
          }
        } else if (this.biome.weather === 'volcanic') {
          // Glowing magma fissures in deep valleys
          if (y < -1.5) {
            const magmaMix = Math.min(1.0, (-1.5 - y) * 0.4);
            color.lerp(magmaCol, magmaMix * 0.65);
          }
        } else if (this.biome.weather === 'sandstorm') {
          // Dune ripples
          const ripple = Math.sin(x * 1.8 + z * 2.5) * 0.06;
          color.addScalar(ripple);
        } else if (this.biome.weather === 'rain') {
          // Darker wet earth sheen
          color.multiplyScalar(0.88);
        }

        // Crater blast burn marks & ash discoloration
        for (const crater of this.craterCenters) {
          const dx = x - crater.x;
          const dy = y - crater.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < crater.r * 1.2) {
            const burnRatio = Math.max(0, 1 - dist / (crater.r * 1.2));
            color.lerp(burnCol, burnRatio * 0.85);
          }
        }

        colors.push(color.r, color.g, color.b);
      }
    }

    // Build indices for the surface grid
    for (let iz = 0; iz < nz - 1; iz++) {
      for (let ix = 0; ix < nx - 1; ix++) {
        const i0 = iz * nx + ix;
        const i1 = iz * nx + (ix + 1);
        const i2 = (iz + 1) * nx + ix;
        const i3 = (iz + 1) * nx + (ix + 1);

        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public updateMeshColors() {
    if (this.geometry) {
      this.rebuildGeometry();
    }
  }
}
