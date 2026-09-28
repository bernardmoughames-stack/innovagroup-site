import * as THREE from 'three';
import type { Quality } from './stage';
import type { ServiceDef } from '../content/copy';

/**
 * The nine service worlds. Each is a compact, procedural cinematic scene
 * (no downloaded assets) sharing one contract so the WorldManager can
 * mount, update and dispose them. Approved Higgsfield footage can later be
 * layered behind these scenes as video planes — see ASSETS.md.
 */
export interface World {
  group: THREE.Group;
  update(dt: number, t: number): void;
}

const GOLD = 0xd9b44a;
const GOLD_HI = 0xf2d57e;
const NAVY = 0x1b2c4f;

/* ---------- shared helpers ---------- */

function ground(radius = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          vec3 c = mix(vec3(0.075,0.11,0.21), vec3(0.039,0.071,0.141), d);
          gl_FragColor = vec4(c, smoothstep(1.0, 0.45, d));
        }`,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function glowPlane(size: number, color: number, opacity: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main(){
          float d = length(vUv - 0.5) * 2.0;
          gl_FragColor = vec4(uColor, pow(smoothstep(1.0, 0.0, d), 2.4) * uOpacity);
        }`,
    })
  );
  return mesh;
}

function edgesOf(geo: THREE.BufferGeometry, opacity = 0.5): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

const solidMat = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.55, metalness: 0.15 });

export function disposeWorld(world: World): void {
  world.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
  world.group.removeFromParent();
}

/* ---------- 1 · Turnkey Contracting: shell builds itself into a home ---------- */

function contractingWorld(): World {
  const group = new THREE.Group();
  group.add(ground());

  // Villa massing: [x, y, z, w, h, d, buildOrder, hasWindow]
  const parts: Array<[number, number, number, number, number, number, number, boolean]> = [
    [0, 0.1, 0, 6.4, 0.2, 4.4, 0, false],           // ground slab
    [-2.55, 1.05, 0, 1.3, 1.9, 4.2, 1, true],       // left wing
    [0.6, 1.05, -1.5, 5, 1.9, 1.1, 2, true],        // back wall block
    [1.4, 1.05, 1.3, 3.4, 1.9, 1.4, 3, true],       // front block
    [0, 2.1, 0, 6.6, 0.18, 4.6, 4, false],          // first-floor slab
    [-1.2, 3, -0.4, 3.6, 1.7, 2.8, 5, true],        // upper volume
    [1.9, 2.85, 0.6, 2.2, 1.4, 2, 6, true],         // upper terrace volume
    [-1.2, 3.95, -0.4, 3.9, 0.16, 3.1, 7, false],   // roof slab
    [2.9, 1, 1.9, 0.16, 1.8, 0.16, 3, false],       // porch column
    [2.1, 1, 1.9, 0.16, 1.8, 0.16, 3, false],       // porch column
  ];

  const items: Array<{ solid: THREE.Mesh; win?: THREE.Mesh; order: number; h: number; y: number }> = [];
  for (const [x, y, z, w, h, d, order, hasWin] of parts) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const solid = new THREE.Mesh(geo, solidMat());
    solid.position.set(x, y, z);
    solid.add(edgesOf(geo, 0.45));
    group.add(solid);
    let win: THREE.Mesh | undefined;
    if (hasWin) {
      win = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w, d) * 0.55, h * 0.42),
        new THREE.MeshBasicMaterial({ color: 0xffd27f, transparent: true, opacity: 0 })
      );
      win.position.set(x, y + 0.1, z + d / 2 + 0.02);
      group.add(win);
    }
    items.push({ solid, win, order, h, y });
  }

  const warm = new THREE.PointLight(0xffc87a, 0, 14, 1.6);
  warm.position.set(0, 2.2, 3);
  group.add(warm);

  return {
    group,
    update(_dt, t) {
      // Perpetual construction wave: the shell rises, glows warm, breathes back
      const cycle = (t % 11) / 11;
      for (const it of items) {
        const local = THREE.MathUtils.clamp(cycle * 1.55 - it.order * 0.09, 0, 1);
        const s = THREE.MathUtils.smoothstep(local, 0, 0.35);
        it.solid.scale.y = Math.max(s, 0.001);
        it.solid.position.y = it.y - (it.h * (1 - s)) / 2;
        if (it.win) {
          (it.win.material as THREE.MeshBasicMaterial).opacity =
            THREE.MathUtils.smoothstep(cycle, 0.62, 0.8) * (1 - THREE.MathUtils.smoothstep(cycle, 0.94, 1)) * 0.85;
        }
      }
      warm.intensity = THREE.MathUtils.smoothstep(cycle, 0.6, 0.85) * (1 - THREE.MathUtils.smoothstep(cycle, 0.94, 1)) * 26;
    },
  };
}

/* ---------- 2 · Project Management: blueprint grid folds into a tower ---------- */

function pmWorld(): World {
  const group = new THREE.Group();
  group.add(ground());

  // Blueprint grid
  const gridVerts: number[] = [];
  const N = 11;
  const S = 9;
  for (let i = 0; i <= N; i++) {
    const p = (i / N - 0.5) * S;
    gridVerts.push(-S / 2, 0.01, p, S / 2, 0.01, p);
    gridVerts.push(p, 0.01, -S / 2, p, 0.01, S / 2);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridVerts), 3));
  const gridMat = new THREE.LineBasicMaterial({
    color: GOLD,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(gridGeo, gridMat));

  // Tower of floors rising out of the grid
  const floors: THREE.Mesh[] = [];
  const F = 13;
  for (let i = 0; i < F; i++) {
    const w = 2.4 - i * 0.09;
    const geo = new THREE.BoxGeometry(w, 0.34, w);
    const mesh = new THREE.Mesh(geo, solidMat());
    mesh.add(edgesOf(geo, 0.6));
    mesh.position.y = 0.25 + i * 0.42;
    group.add(mesh);
    floors.push(mesh);
  }
  const beacon = glowPlane(1.6, GOLD_HI, 0.8);
  beacon.position.y = 0.25 + F * 0.42 + 0.3;
  group.add(beacon);

  return {
    group,
    update(_dt, t) {
      const cycle = (t % 10) / 10;
      floors.forEach((f, i) => {
        const local = THREE.MathUtils.clamp(cycle * 1.6 - i * 0.075, 0, 1);
        const s = THREE.MathUtils.smoothstep(local, 0, 0.4);
        f.scale.setScalar(Math.max(s, 0.001));
        f.rotation.y = (1 - s) * 0.7;
      });
      gridMat.opacity = 0.16 + 0.1 * Math.sin(t * 1.1);
      const done = THREE.MathUtils.smoothstep(cycle, 0.78, 0.9);
      beacon.scale.setScalar(0.6 + done * 0.6);
      (beacon.material as THREE.ShaderMaterial).uniforms.uOpacity.value = done * 0.8;
      beacon.lookAt(0, beacon.position.y, 8);
    },
  };
}

/* ---------- 3 · Facility Management: a building with a heartbeat ---------- */

function facilityWorld(quality: Quality): World {
  const group = new THREE.Group();
  group.add(ground());

  const towerGeo = new THREE.BoxGeometry(2.4, 6.2, 2.4);
  const tower = new THREE.Mesh(
    towerGeo,
    new THREE.MeshStandardMaterial({ color: 0x0e1a33, roughness: 0.7, metalness: 0.2 })
  );
  tower.position.y = 3.1;
  tower.add(edgesOf(towerGeo, 0.35));
  group.add(tower);

  // Instanced windows on two visible faces
  const rows = 13;
  const cols = quality === 'high' ? 5 : 4;
  const count = rows * cols * 2;
  const win = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.3, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    count
  );
  const dummy = new THREE.Object3D();
  const rowsOf: number[] = [];
  let idx = 0;
  for (let face = 0; face < 2; face++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * 1.8;
        const y = 0.55 + r * 0.44;
        if (face === 0) {
          dummy.position.set(x, y, 1.21);
          dummy.rotation.set(0, 0, 0);
        } else {
          dummy.position.set(1.21, y, x);
          dummy.rotation.set(0, Math.PI / 2, 0);
        }
        dummy.updateMatrix();
        win.setMatrixAt(idx, dummy.matrix);
        rowsOf.push(r);
        idx++;
      }
    }
  }
  group.add(win);

  const halo = glowPlane(9, GOLD, 0.16);
  halo.position.set(0, 3, -2.5);
  group.add(halo);

  const color = new THREE.Color();
  const ecg = (x: number): number => {
    const f = x - Math.floor(x);
    return (
      Math.exp(-Math.pow((f - 0.16) * 11, 2)) +
      0.55 * Math.exp(-Math.pow((f - 0.3) * 11, 2)) +
      0.07
    );
  };

  return {
    group,
    update(_dt, t) {
      for (let i = 0; i < count; i++) {
        const beat = ecg(t * 0.45 - rowsOf[i] * 0.045 + (i % 5) * 0.01);
        const g = THREE.MathUtils.clamp(beat, 0.05, 1);
        color.setRGB(0.85 * g + 0.05, 0.68 * g + 0.05, 0.25 * g + 0.06);
        win.setColorAt(i, color);
      }
      win.instanceColor!.needsUpdate = true;
      (halo.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
        0.1 + ecg(t * 0.45) * 0.14;
      halo.lookAt(0, 3, 8);
    },
  };
}

/* ---------- 4 · Cinema: the screen lights up ---------- */

function cinemaWorld(quality: Quality): World {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a1224, roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Screen
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uLight; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
      void main(){
        float vig = smoothstep(1.05, 0.45, length(vUv - 0.5) * 1.6);
        float sweep = smoothstep(0.0, 0.6, vUv.x + sin(uTime * 0.4) * 0.4);
        float grain = hash(vUv * 800.0 + uTime) * 0.06;
        vec3 warm = mix(vec3(0.06, 0.09, 0.17), vec3(1.0, 0.88, 0.62), uLight * vig * (0.75 + 0.25 * sweep));
        gl_FragColor = vec4(warm + grain * uLight, 1.0);
      }`,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.7), screenMat);
  screen.position.set(0, 1.9, -4.4);
  group.add(screen);
  const frame = edgesOf(new THREE.BoxGeometry(6.6, 2.9, 0.05), 0.7);
  frame.position.copy(screen.position);
  group.add(frame);

  // Seats (low silhouettes so the screen stays the hero of the frame)
  const seatGeo = new THREE.BoxGeometry(0.5, 0.3, 0.42);
  const backGeo = new THREE.BoxGeometry(0.5, 0.34, 0.1);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x101d3a, roughness: 0.8 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set((c - 2) * 0.8, 0.15 + r * 0.12, 1.1 + r * 1.15);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 0.3, 0.18);
      seat.add(back);
      group.add(seat);
    }
  }

  // Projector beam
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 8.6, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe9c0,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.position.set(0, 2.6, 0);
  beam.rotation.x = Math.PI / 2 - 0.06;
  group.add(beam);

  // Dust in the beam
  const dustCount = quality === 'high' ? 160 : 70;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 2.4;
    dustPos[i * 3 + 1] = 1.4 + Math.random() * 1.6;
    dustPos[i * 3 + 2] = -4 + Math.random() * 8;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xffe9c0,
      size: 0.018,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(dust);

  const glow = new THREE.PointLight(0xffd9a0, 0, 16, 1.8);
  glow.position.set(0, 2, -3);
  group.add(glow);

  return {
    group,
    update(_dt, t) {
      const cycle = (t % 9) / 9;
      const light =
        THREE.MathUtils.smoothstep(cycle, 0.06, 0.4) *
        (1 - THREE.MathUtils.smoothstep(cycle, 0.93, 1)) *
        (0.92 + 0.08 * Math.sin(t * 9.0));
      screenMat.uniforms.uTime.value = t;
      screenMat.uniforms.uLight.value = light;
      (beam.material as THREE.MeshBasicMaterial).opacity = light * 0.07;
      glow.intensity = light * 30;
      dust.rotation.y = t * 0.02;
    },
  };
}

/* ---------- 5 · Snagging: the gold laser sweep ---------- */

function snaggingWorld(): World {
  const group = new THREE.Group();
  group.add(ground());

  const room = edgesOf(new THREE.BoxGeometry(8, 3.4, 5.6), 0.4);
  room.position.y = 1.7;
  group.add(room);

  // Sweeping laser sheet
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 3.4),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uOpacity: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uOpacity; varying vec2 vUv;
        void main(){
          float core = smoothstep(0.5, 0.0, abs(vUv.x - 0.5)) * 0.5;
          float lines = smoothstep(0.03, 0.0, abs(fract(vUv.y * 14.0) - 0.5) * 0.08);
          gl_FragColor = vec4(vec3(0.85, 0.71, 0.29), (core + lines * 0.12) * uOpacity);
        }`,
    })
  );
  sheet.rotation.y = Math.PI / 2;
  sheet.position.y = 1.7;
  group.add(sheet);

  // Defect pins revealed by the sweep
  const pinDefs: Array<[number, number, number]> = [
    [-3.1, 2.6, -1.9], [-2.2, 0.7, 1.6], [-0.9, 1.9, -2.4],
    [0.3, 0.5, 2.2], [1.2, 2.9, -0.8], [2.4, 1.2, 1.9], [3.3, 2.2, -1.4],
  ];
  const pins = pinDefs.map(([x, y, z]) => {
    const pin = new THREE.Group();
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      new THREE.MeshBasicMaterial({ color: GOLD_HI })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.008, 8, 32),
      new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    pin.add(dot, ring);
    pin.position.set(x, y, z);
    pin.scale.setScalar(0.001);
    group.add(pin);
    return { pin, ring, x };
  });

  return {
    group,
    update(_dt, t) {
      const cycle = (t % 8) / 8;
      const sweepX = THREE.MathUtils.lerp(-4.2, 4.2, THREE.MathUtils.smoothstep(cycle, 0.05, 0.75));
      sheet.position.x = sweepX;
      (sheet.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
        (1 - THREE.MathUtils.smoothstep(cycle, 0.75, 0.85)) * THREE.MathUtils.smoothstep(cycle, 0, 0.05);
      const reset = THREE.MathUtils.smoothstep(cycle, 0.92, 1);
      for (const p of pins) {
        const found = sweepX > p.x;
        const target = found ? 1 - reset : 0.001;
        p.pin.scale.setScalar(THREE.MathUtils.lerp(p.pin.scale.x, Math.max(target, 0.001), 0.18));
        p.ring.lookAt(0, 1.6, 8);
        p.ring.scale.setScalar(1 + 0.25 * Math.sin(t * 4 + p.x));
      }
    },
  };
}

/* ---------- 6 · Marketing: a mark shatters into light and reforms ---------- */

function marketingWorld(quality: Quality): World {
  const group = new THREE.Group();

  const count = quality === 'high' ? 700 : 350;
  const base = new Float32Array(count * 3);
  const rand = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Base shape: a diamond outline + surrounding halo ring
    const useRing = i % 3 === 0;
    let x = 0;
    let y = 0;
    if (useRing) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.1 + Math.random() * 0.08;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r * 0.92;
    } else {
      // diamond (rhombus) outline
      const e = (Math.random() * 4) | 0;
      const f = Math.random();
      const pts = [
        [0, 1.5], [1.15, 0], [0, -1.5], [-1.15, 0],
      ];
      const [ax, ay] = pts[e];
      const [bx, by] = pts[(e + 1) % 4];
      x = ax + (bx - ax) * f;
      y = ay + (by - ay) * f;
    }
    base[i * 3] = x;
    base[i * 3 + 1] = y + 1.7;
    base[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    const dir = new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 3.2);
    rand[i * 3] = dir.x;
    rand[i * 3 + 1] = dir.y;
    rand[i * 3 + 2] = dir.z;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPhase: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aBase; attribute vec3 aRand; attribute float aSeed;
      uniform float uPhase; uniform float uTime;
      varying float vHot;
      void main(){
        // uPhase: 0 formed → 1 fully shattered (and back)
        float p = uPhase;
        float drift = p * (1.0 + aSeed * 0.7);
        vec3 pos = aBase + aRand * drift;
        pos.x += sin(uTime * 1.2 + aSeed * 20.0) * 0.05 * p;
        pos.y += cos(uTime * 1.5 + aSeed * 26.0) * 0.05 * p;
        vHot = p;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (1.4 + aSeed * 2.2) * (0.8 + p * 0.7) * (120.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vHot;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.06, d);
        vec3 c = mix(vec3(0.85, 0.71, 0.29), vec3(1.0, 0.97, 0.85), vHot);
        gl_FragColor = vec4(c, a * 0.9);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  const flare = glowPlane(5, GOLD_HI, 0);
  flare.position.set(0, 1.7, -0.3);
  group.add(flare);

  return {
    group,
    update(_dt, t) {
      const cycle = (t % 9) / 9;
      // hold formed → burst → hang → reform
      let phase = 0;
      if (cycle < 0.22) phase = 0;
      else if (cycle < 0.34) phase = THREE.MathUtils.smoothstep(cycle, 0.22, 0.34);
      else if (cycle < 0.6) phase = 1;
      else phase = 1 - THREE.MathUtils.smoothstep(cycle, 0.6, 0.88);
      mat.uniforms.uPhase.value = phase;
      mat.uniforms.uTime.value = t;
      const burst = Math.exp(-Math.pow((cycle - 0.24) * 18, 2));
      (flare.material as THREE.ShaderMaterial).uniforms.uOpacity.value = burst * 0.9;
      flare.scale.setScalar(1 + burst * 1.4);
      flare.lookAt(0, 1.7, 8);
      points.rotation.y = Math.sin(t * 0.12) * 0.25;
    },
  };
}

/* ---------- 7 · Consultancy: disorder resolves into order ---------- */

function consultancyWorld(): World {
  const group = new THREE.Group();
  group.add(ground());

  const COUNT = 48;
  const boxGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const mesh = new THREE.InstancedMesh(boxGeo, solidMat(), COUNT);
  group.add(mesh);
  const frame = edgesOf(new THREE.BoxGeometry(2.6, 2.6, 2.6), 0.0);
  frame.position.y = 1.9;
  group.add(frame);

  const scattered: THREE.Vector3[] = [];
  const ordered: THREE.Vector3[] = [];
  const rot: number[] = [];
  let n = 0;
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 3; z++) {
        ordered.push(new THREE.Vector3((x - 1.5) * 0.62, 1.05 + y * 0.62, (z - 1) * 0.62));
        const s = new THREE.Vector3(
          (Math.random() - 0.5) * 7,
          0.6 + Math.random() * 3.6,
          (Math.random() - 0.5) * 5
        );
        scattered.push(s);
        rot.push(Math.random() * Math.PI * 2);
        n++;
        if (n >= COUNT) break;
      }
      if (n >= COUNT) break;
    }
    if (n >= COUNT) break;
  }

  const dummy = new THREE.Object3D();
  return {
    group,
    update(_dt, t) {
      const mix = 0.5 + 0.5 * Math.sin(t * 0.45 - Math.PI / 2); // slow breathe: chaos ↔ order
      const eased = mix * mix * (3 - 2 * mix);
      for (let i = 0; i < COUNT; i++) {
        dummy.position.lerpVectors(scattered[i], ordered[i], eased);
        const wob = (1 - eased) * 0.6;
        dummy.position.y += Math.sin(t * 1.1 + i) * 0.12 * (1 - eased);
        dummy.rotation.set(rot[i] * wob, rot[i] * 1.3 * wob + eased * 0, rot[i] * 0.6 * wob);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      (frame.material as THREE.LineBasicMaterial).opacity = eased * 0.6;
      frame.rotation.y = t * 0.08;
    },
  };
}

/* ---------- 8 · AI: a gold neural lattice grows ---------- */

function aiWorld(quality: Quality): World {
  const group = new THREE.Group();

  interface Node { pos: THREE.Vector3; depth: number }
  const nodes: Node[] = [{ pos: new THREE.Vector3(0, 1.8, 0), depth: 0 }];
  const edges: Array<[number, number]> = [];
  const perShell = quality === 'high' ? [7, 12, 18] : [6, 9, 12];
  let prevStart = 0;
  let prevCount = 1;
  perShell.forEach((countInShell) => {
    const shellStart = nodes.length;
    for (let i = 0; i < countInShell; i++) {
      const parentIdx = prevStart + ((Math.random() * prevCount) | 0);
      const parent = nodes[parentIdx];
      const dir = new THREE.Vector3().randomDirection();
      dir.y *= 0.75;
      const child = parent.pos.clone().addScaledVector(dir, 1.05 + Math.random() * 0.7);
      child.y = Math.max(0.25, child.y);
      nodes.push({ pos: child, depth: nodes[parentIdx].depth + 1 });
      edges.push([parentIdx, nodes.length - 1]);
    }
    prevStart = shellStart;
    prevCount = countInShell;
    // a few cross-links inside the shell
    for (let i = 0; i < Math.floor(countInShell / 3); i++) {
      const a = shellStart + ((Math.random() * countInShell) | 0);
      const b = shellStart + ((Math.random() * countInShell) | 0);
      if (a !== b) edges.push([a, b]);
    }
  });

  const positions = new Float32Array(edges.length * 6);
  const order = new Float32Array(edges.length * 2);
  const along = new Float32Array(edges.length * 2);
  edges.forEach(([a, b], i) => {
    nodes[a].pos.toArray(positions, i * 6);
    nodes[b].pos.toArray(positions, i * 6 + 3);
    const o = Math.max(nodes[a].depth, nodes[b].depth) / 4 + Math.random() * 0.05;
    order[i * 2] = o;
    order[i * 2 + 1] = o;
    along[i * 2] = 0;
    along[i * 2 + 1] = 1;
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lineGeo.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  lineGeo.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  const lineMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uGrow: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aOrder; attribute float aAlong;
      varying float vOrder; varying float vAlong;
      void main(){
        vOrder = aOrder; vAlong = aAlong;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGrow; uniform float uTime;
      varying float vOrder; varying float vAlong;
      void main(){
        float vis = smoothstep(vOrder + 0.12, vOrder, uGrow);
        float pulse = exp(-pow(fract(uTime * 0.22 - vOrder - vAlong * 0.25) * 9.0, 2.0));
        vec3 c = mix(vec3(0.5, 0.4, 0.14), vec3(1.0, 0.92, 0.6), pulse);
        gl_FragColor = vec4(c, vis * (0.35 + pulse * 0.65));
      }`,
  });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  // Node points
  const nodePos = new Float32Array(nodes.length * 3);
  const nodeOrder = new Float32Array(nodes.length);
  nodes.forEach((nd, i) => {
    nd.pos.toArray(nodePos, i * 3);
    nodeOrder[i] = nd.depth / 4;
  });
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('aOrder', new THREE.BufferAttribute(nodeOrder, 1));
  const nodeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uGrow: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aOrder; varying float vVis; uniform float uGrow; uniform float uTime;
      void main(){
        vVis = smoothstep(aOrder + 0.1, aOrder, uGrow);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (2.0 + 2.0 * sin(uTime * 2.0 + aOrder * 40.0)) * vVis * (90.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vVis;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(1.0, 0.9, 0.6, smoothstep(0.5, 0.1, d) * vVis);
      }`,
  });
  const pts = new THREE.Points(nodeGeo, nodeMat);
  pts.frustumCulled = false;
  group.add(pts);

  const core = glowPlane(2.4, GOLD_HI, 0.5);
  core.position.set(0, 1.8, 0);
  group.add(core);

  return {
    group,
    update(_dt, t) {
      const cycle = (t % 11) / 11;
      const grow =
        THREE.MathUtils.smoothstep(cycle, 0.02, 0.55) *
        (1 - THREE.MathUtils.smoothstep(cycle, 0.94, 1));
      lineMat.uniforms.uGrow.value = grow;
      lineMat.uniforms.uTime.value = t;
      nodeMat.uniforms.uGrow.value = grow;
      nodeMat.uniforms.uTime.value = t;
      group.rotation.y = t * 0.1;
      core.lookAt(new THREE.Vector3(Math.sin(t * 0.1) * 8, 1.8, Math.cos(t * 0.1) * 8));
      (core.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
        0.35 + 0.2 * Math.sin(t * 1.3);
    },
  };
}

/* ---------- 9 · Home Watch: the guarded villa at dusk ---------- */

function homewatchWorld(quality: Quality): World {
  const group = new THREE.Group();
  group.add(ground());

  // Dusk horizon
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 16),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {},
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        void main(){
          vec3 top = vec3(0.028, 0.05, 0.11);
          vec3 mid = vec3(0.078, 0.11, 0.22);
          vec3 horizon = vec3(0.55, 0.34, 0.16);
          vec3 c = mix(mid, top, smoothstep(0.25, 0.9, vUv.y));
          c = mix(horizon, c, smoothstep(0.02, 0.3, vUv.y));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  sky.position.set(0, 6, -12);
  group.add(sky);

  // Villa silhouette
  const villaMat = new THREE.MeshStandardMaterial({ color: 0x0c1730, roughness: 0.8 });
  const main = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.2), villaMat);
  main.position.y = 0.8;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.8), villaMat);
  wing.position.set(2.2, 0.55, 0.3);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.1, 4), villaMat);
  roof.position.y = 2.15;
  roof.rotation.y = Math.PI / 4;
  group.add(main, wing, roof);

  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc87a, transparent: true, opacity: 0.85 });
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), winMat);
  w1.position.set(-0.7, 0.85, 1.11);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.35), winMat);
  w2.position.set(2.2, 0.6, 1.21);
  group.add(w1, w2);

  // Protective dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  group.add(dome);
  const domeGlow = glowPlane(9, GOLD, 0.12);
  domeGlow.position.y = 1.4;
  group.add(domeGlow);

  // Stars
  const starCount = quality === 'high' ? 220 : 100;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 36;
    starPos[i * 3 + 1] = 3 + Math.random() * 10;
    starPos[i * 3 + 2] = -11.8;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xf4efe6,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  );
  group.add(stars);

  return {
    group,
    update(_dt, t) {
      const breathe = 0.045 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.7));
      (dome.material as THREE.MeshBasicMaterial).opacity = breathe;
      dome.scale.setScalar(1 + Math.sin(t * 0.7) * 0.012);
      (domeGlow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = breathe * 2.2;
      domeGlow.lookAt(0, 1.4, 8);
      winMat.opacity = 0.75 + 0.1 * Math.sin(t * 2.1);
      (stars.material as THREE.PointsMaterial).opacity = 0.55 + 0.2 * Math.sin(t * 0.9);
    },
  };
}

/* ---------- factory ---------- */

export function createWorld(id: ServiceDef['world'], quality: Quality): World {
  switch (id) {
    case 'contracting': return contractingWorld();
    case 'pm': return pmWorld();
    case 'facility': return facilityWorld(quality);
    case 'cinema': return cinemaWorld(quality);
    case 'snagging': return snaggingWorld();
    case 'marketing': return marketingWorld(quality);
    case 'consultancy': return consultancyWorld();
    case 'ai': return aiWorld(quality);
    case 'homewatch': return homewatchWorld(quality);
  }
}
