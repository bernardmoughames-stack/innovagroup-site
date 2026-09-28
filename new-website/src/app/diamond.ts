import * as THREE from 'three';
import type { Quality } from './stage';

/**
 * The Innova Diamond — procedural faceted gem modelled on the brand's
 * stacked-diamond mark: octagonal table, 16-sided girdle, pointed pavilion.
 * Built facet-by-facet so it can split open along its facets ("the gaps")
 * and reassemble. Gold facet edges, navy glass body, gold core light.
 */

interface Facet {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  dir: THREE.Vector3;
  spread: number;
  axis: THREE.Vector3;
  seed: number;
}

const GOLD = 0xd9b44a;

export class Diamond {
  /** Scroll choreography moves/scales this. */
  readonly group = new THREE.Group();
  private spin = new THREE.Group();
  private bob = new THREE.Group();
  private facets: Facet[] = [];
  private core: THREE.Mesh;
  private coreLight: THREE.PointLight;
  private glass: THREE.MeshPhysicalMaterial;
  private triangles: THREE.Triangle[] = [];
  private rays: THREE.Mesh[] = [];
  private goldRim = { value: 0.9 };
  rotateSpeed = 0.14;

  constructor(quality: Quality) {
    // Deep navy gem with a molten-gold fresnel rim: the body stays dark
    // (metalness tints reflections navy) while grazing angles catch liquid
    // gold, matching the generated key art. The uniform lets scroll dim it.
    this.glass = new THREE.MeshPhysicalMaterial({
      color: 0x0c1a38,
      metalness: 0.85,
      roughness: 0.3,
      clearcoat: 0.12,
      clearcoatRoughness: 0.6,
      envMapIntensity: quality === 'high' ? 0.18 : 0.16,
      emissive: 0x060e20,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.98,
    });
    this.glass.onBeforeCompile = (shader) => {
      shader.uniforms.uGoldRim = this.goldRim;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vWorldNormal;\nvarying vec3 vViewDir;'
        )
        .replace(
          '#include <fog_vertex>',
          `#include <fog_vertex>
           vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
           vViewDir = normalize(cameraPosition - (modelMatrix * vec4(transformed, 1.0)).xyz);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vWorldNormal;\nvarying vec3 vViewDir;\nuniform float uGoldRim;'
        )
        .replace(
          '#include <opaque_fragment>',
          `float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(vViewDir))), 2.6);
           vec3 gold = vec3(1.0, 0.78, 0.34);
           outgoingLight += gold * rim * uGoldRim;
           // faint depth gradient: crown breathes lighter navy
           outgoingLight += vec3(0.05, 0.09, 0.19) * smoothstep(-0.4, 1.0, vWorldNormal.y) * 0.35;
           #include <opaque_fragment>`
        );
    };

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xf5ce62,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (const positions of buildFacetGeometries()) {
      const centroid = new THREE.Vector3();
      for (let i = 0; i < positions.length; i += 3) {
        centroid.add(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
      }
      centroid.divideScalar(positions.length / 3);
      const dir = centroid.clone().sub(new THREE.Vector3(0, -0.1, 0)).normalize();

      orientOutward(positions, dir);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, this.glass);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 10), edgeMat.clone());
      mesh.add(edges);

      this.facets.push({
        mesh,
        edges,
        dir,
        spread: 0.4 + Math.random() * 0.5,
        axis: new THREE.Vector3().randomDirection(),
        seed: (Math.random() - 0.5) * 1.6,
      });
      this.bob.add(mesh);

      for (let i = 0; i < positions.length; i += 9) {
        this.triangles.push(
          new THREE.Triangle(
            new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]),
            new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]),
            new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8])
          )
        );
      }
    }

    // Gold core, revealed when the facets split apart
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 2),
      new THREE.MeshBasicMaterial({
        color: 0xf2d57e,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.coreLight = new THREE.PointLight(GOLD, 0, 10, 1.6);
    this.bob.add(this.core, this.coreLight);

    // Light rays that escape through the open gaps during the split
    const rayGeo = new THREE.PlaneGeometry(0.09, 5.5);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xffdf8a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 9; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat.clone());
      const a = (i / 9) * Math.PI * 2;
      ray.position.set(Math.cos(a) * 0.4, Math.sin(a * 1.7) * 0.3, Math.sin(a) * 0.4);
      ray.rotation.z = a + Math.PI / 3;
      ray.rotation.y = a * 0.7;
      this.rays.push(ray);
      this.bob.add(ray);
    }

    this.spin.add(this.bob);
    this.group.add(this.spin);
  }

  /** 0 = sealed · 1 = fully open along the facets, core glowing in the gaps */
  setExplode(k: number): void {
    const eased = k * k * (3 - 2 * k);
    for (const f of this.facets) {
      f.mesh.position.copy(f.dir).multiplyScalar(eased * f.spread * 0.55);
      f.mesh.quaternion.setFromAxisAngle(f.axis, eased * f.seed * 0.3);
    }
    (this.core.material as THREE.MeshBasicMaterial).opacity = eased * 0.55;
    this.core.scale.setScalar(1 + eased * 0.2);
    this.coreLight.intensity = eased * 50;
    this.rays.forEach((ray, i) => {
      (ray.material as THREE.MeshBasicMaterial).opacity = eased * (0.07 + (i % 3) * 0.035);
      ray.scale.y = 0.4 + eased * (0.8 + (i % 4) * 0.2);
    });
    this.goldRim.value = 0.75 + eased * 0.5;
  }

  setEdgeOpacity(v: number): void {
    for (const f of this.facets) {
      (f.edges.material as THREE.LineBasicMaterial).opacity = v;
    }
  }

  setBodyOpacity(v: number): void {
    this.glass.opacity = v;
  }

  update(dt: number, t: number): void {
    this.spin.rotation.y += dt * this.rotateSpeed;
    this.bob.position.y = Math.sin(t * 0.55) * 0.07;
  }

  /** Random points on the facet surfaces — targets for the assembly particles. */
  samples(count: number): Float32Array {
    const out = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const tri = this.triangles[(Math.random() * this.triangles.length) | 0];
      let a = Math.random();
      let b = Math.random();
      if (a + b > 1) {
        a = 1 - a;
        b = 1 - b;
      }
      v.copy(tri.a)
        .addScaledVector(new THREE.Vector3().subVectors(tri.b, tri.a), a)
        .addScaledVector(new THREE.Vector3().subVectors(tri.c, tri.a), b);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    return out;
  }
}

/** Flip any triangle whose face normal opposes the facet's outward direction. */
function orientOutward(positions: Float32Array, dir: THREE.Vector3): void {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 9) {
    a.fromArray(positions, i);
    b.fromArray(positions, i + 3);
    c.fromArray(positions, i + 6);
    n.subVectors(b, a).cross(c.clone().sub(a));
    if (n.dot(dir) < 0) {
      for (let k = 0; k < 3; k++) {
        const tmp = positions[i + 3 + k];
        positions[i + 3 + k] = positions[i + 6 + k];
        positions[i + 6 + k] = tmp;
      }
    }
  }
}

/** One Float32Array of triangle soup per facet. */
function buildFacetGeometries(): Float32Array[] {
  const R_TABLE = 0.58;
  const Y_TABLE = 0.78;
  const R_GIRDLE = 1.05;
  const Y_GIRDLE = 0.16;
  const Y_CULET = -1.18;

  const table: THREE.Vector3[] = [];
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * Math.PI * 2;
    table.push(new THREE.Vector3(Math.cos(a) * R_TABLE, Y_TABLE, Math.sin(a) * R_TABLE));
  }
  const girdle: THREE.Vector3[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    girdle.push(new THREE.Vector3(Math.cos(a) * R_GIRDLE, Y_GIRDLE, Math.sin(a) * R_GIRDLE));
  }
  const culet = new THREE.Vector3(0, Y_CULET, 0);

  const out: Float32Array[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number[] => [
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
  ];

  // Table (octagon fan — one facet)
  {
    const verts: number[] = [];
    for (let j = 1; j < 7; j++) verts.push(...tri(table[0], table[j], table[j + 1]));
    out.push(new Float32Array(verts));
  }

  // Crown: star facets (point down to the girdle) + bezel quads between them.
  // table[j] sits between girdle[(2j+15)%16] and girdle[2j] by construction.
  for (let j = 0; j < 8; j++) {
    const gPrev = girdle[(2 * j + 15) % 16];
    const gNext = girdle[2 * j];
    out.push(new Float32Array(tri(table[j], gNext, gPrev)));

    const tNext = table[(j + 1) % 8];
    const gMidA = girdle[2 * j];
    const gMidB = girdle[(2 * j + 1) % 16];
    out.push(
      new Float32Array([
        ...tri(table[j], tNext, gMidB),
        ...tri(table[j], gMidB, gMidA),
      ])
    );
  }

  // Pavilion: 16 long facets meeting at the culet
  for (let i = 0; i < 16; i++) {
    out.push(new Float32Array(tri(girdle[i], culet, girdle[(i + 1) % 16])));
  }

  return out;
}
