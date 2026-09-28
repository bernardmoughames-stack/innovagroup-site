import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Stage } from './stage';
import type { Diamond } from './diamond';
import type { PortalRing } from './orbit';
import type { AuraParticles } from './particles';
import { glowPlane } from './worlds';
import { VideoBackdrop } from './videoBackdrop';
import { SKYLINE_VIDEO } from '../content/media';

gsap.registerPlugin(ScrollTrigger);

/**
 * Maps native page scroll to the 3D journey. One deterministic camera track
 * (keyframes at each section, linear-smoothstep interpolation on measured
 * offsets — correct in both directions, after resize, refresh, or a jump)
 * plus per-section effects driven by scrubbed ScrollTriggers:
 *   gaps    → the diamond splits open along its facets and reseals
 *   orbit   → the portal ring fades in and becomes interactive
 *   why     → six facets of light ignite around the diamond
 *   process → the gold SVG line travels through the four stations
 *   cta     → the Dubai skyline rises; the diamond takes its place above it
 */

interface CamKey {
  y: number; // absolute scroll position of this key (viewport-center space)
  pos: THREE.Vector3;
  look: THREE.Vector3;
  dScale: number;
  dPos: THREE.Vector3;
  edge: number;
}

const STATES: Record<string, Omit<CamKey, 'y'>> = {
  hero: {
    pos: new THREE.Vector3(0, 0.55, 6.2),
    look: new THREE.Vector3(0, 0.35, 0),
    dScale: 1.16,
    dPos: new THREE.Vector3(0, 0.45, 0),
    edge: 0.85,
  },
  gaps: {
    pos: new THREE.Vector3(0, 0.2, 5.6),
    look: new THREE.Vector3(0, 0, 0),
    dScale: 1,
    dPos: new THREE.Vector3(0, 0, 0),
    edge: 0.95,
  },
  orbit: {
    pos: new THREE.Vector3(0, 5.6, 10.2),
    look: new THREE.Vector3(0, -0.9, 0),
    dScale: 0.8,
    dPos: new THREE.Vector3(0, 0, 0),
    edge: 0.6,
  },
  why: {
    pos: new THREE.Vector3(-1.7, 0.9, 8.6),
    look: new THREE.Vector3(0, 0.45, 0),
    dScale: 0.78,
    dPos: new THREE.Vector3(0, 0.75, -1),
    edge: 0.45,
  },
  process: {
    pos: new THREE.Vector3(0, 0.9, 11),
    look: new THREE.Vector3(0, 1.1, 0),
    dScale: 0.52,
    dPos: new THREE.Vector3(0, 2.3, -2.5),
    edge: 0.35,
  },
  cta: {
    pos: new THREE.Vector3(0, 2.5, 12.8),
    look: new THREE.Vector3(0, 1.1, 0),
    dScale: 0.9,
    dPos: new THREE.Vector3(0, 2.7, -3),
    edge: 0.75,
  },
};

export class ScrollRig {
  private keys: CamKey[] = [];
  private progress: Record<string, number> = {
    gaps: 0, orbit: 0, orbitBand: 0, grid: 0, why: 0, process: 0, cta: 0,
  };
  /** Aura fade-in level, tweened by the experience on Enter. */
  auraBase = 0;
  private skyline: THREE.Group;
  private skyWindows: THREE.Points;
  private skyVideo: VideoBackdrop;
  private whyLights: THREE.Group;
  private processPath: SVGPathElement | null;
  private processLen = 0;
  private processSteps: HTMLElement[] = [];
  private lastDrawn = -1;
  private enabled = false;

  constructor(
    private stage: Stage,
    private diamond: Diamond,
    private ring: PortalRing,
    readonly mainGroup: THREE.Group,
    private aura?: AuraParticles
  ) {
    this.skyline = buildSkyline();
    this.skyWindows = this.skyline.getObjectByName('windows') as THREE.Points;
    this.skyline.visible = false;
    mainGroup.add(this.skyline);

    // Generated aerial footage replaces the procedural skyline once decoded
    this.skyVideo = new VideoBackdrop(SKYLINE_VIDEO, { width: 32, y: 3.0, z: -14, opacity: 0.85 });
    this.skyline.add(this.skyVideo.mesh);

    this.whyLights = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const g = glowPlane(0.85, 0xf2d57e, 0);
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      g.position.set(Math.cos(a) * 4.8, 1.5 + Math.sin(a) * 2.1, -1.5);
      this.whyLights.add(g);
    }
    mainGroup.add(this.whyLights);

    this.processPath = document.getElementById('process-path') as SVGPathElement | null;
    if (this.processPath) {
      this.processLen = this.processPath.getTotalLength();
      this.processPath.style.strokeDasharray = String(this.processLen);
      this.processPath.style.strokeDashoffset = String(this.processLen);
    }
    this.processSteps = Array.from(document.querySelectorAll('.process-steps li'));

    window.addEventListener('resize', () => this.measure());
  }

  /** Called while a service world hides the main journey. */
  suspendVideo(): void {
    this.skyVideo.forcePause();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    for (const name of Object.keys(this.progress)) {
      const el =
        name === 'orbitBand'
          ? document.getElementById('orbit-head')
          : name === 'grid'
            ? document.getElementById('services-grid')
            : document.querySelector(`[data-scene="${name}"]`);
      if (!el) continue;
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          this.progress[name] = self.progress;
        },
      });
    }
    this.measure();
    ScrollTrigger.refresh();
  }

  measure(): void {
    const vh = innerHeight;
    this.keys = [];
    document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
      const name = el.dataset.scene!;
      const state = STATES[name];
      if (!state) return;
      const top = el.offsetTop;
      const h = el.offsetHeight;
      if (h > vh * 1.6) {
        // Tall pinned band: hold the state across it
        this.keys.push({ y: top + vh * 0.55, ...cloneState(state) });
        this.keys.push({ y: top + h - vh * 0.55, ...cloneState(state) });
      } else {
        this.keys.push({ y: top + h / 2, ...cloneState(state) });
      }
    });
    this.keys.sort((a, b) => a.y - b.y);
  }

  /** Called every frame while the main journey is on screen. */
  frame(dt: number): void {
    if (!this.keys.length) return;
    const y = scrollY + innerHeight / 2;

    let a = this.keys[0];
    let b = this.keys[0];
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i].y <= y) a = this.keys[i];
      if (this.keys[i].y >= y) {
        b = this.keys[i];
        break;
      }
      b = this.keys[i];
    }
    const span = Math.max(b.y - a.y, 1);
    let f = THREE.MathUtils.clamp((y - a.y) / span, 0, 1);
    f = f * f * (3 - 2 * f);

    const cam = this.stage.camera;
    cam.position.lerpVectors(a.pos, b.pos, f);
    // Pointer parallax on top of the track
    const p = this.stage.pointerSmooth;
    cam.position.x += p.x * 0.35;
    cam.position.y += p.y * 0.2;
    const look = new THREE.Vector3().lerpVectors(a.look, b.look, f);
    cam.lookAt(look);

    // -- per-section effects --
    const P = this.progress;

    // While the service cards are on screen the diamond steps aside —
    // nothing may float behind or between the cards.
    const gv = Math.sin(THREE.MathUtils.clamp(P.grid, 0, 1) * Math.PI);

    const dg = this.diamond.group;
    dg.position.lerpVectors(a.dPos, b.dPos, f);
    const s = THREE.MathUtils.lerp(a.dScale, b.dScale, f) * (1 - gv * 0.35);
    dg.scale.setScalar(Math.max(s, 0.001));
    this.diamond.setEdgeOpacity(THREE.MathUtils.lerp(a.edge, b.edge, f) * (1 - gv * 0.95));
    this.diamond.setBodyOpacity(0.98 * (1 - gv * 0.92));
    this.aura?.setOpacity(this.auraBase * (1 - gv * 0.97));

    // The gaps: sealed while the words arrive, split at the heart of the
    // band, resealed before the orbit — and the camera leans into the light.
    const gp = THREE.MathUtils.clamp((P.gaps - 0.12) / 0.76, 0, 1);
    const explode = Math.sin(gp * Math.PI);
    this.diamond.setExplode(explode);
    this.diamond.rotateSpeed = 0.14 + explode * 0.12;
    cam.position.z -= explode * 1.05;
    cam.lookAt(look);

    // Orbit ring visibility — bound to the orbit heading band only, so the
    // portals never bleed over the service cards or later sections
    const rv =
      THREE.MathUtils.smoothstep(P.orbitBand, 0.18, 0.42) *
      (1 - THREE.MathUtils.smoothstep(P.orbitBand, 0.78, 0.92));
    this.ring.setVisibility(rv);

    // Why: six facets of light
    const wv = Math.sin(THREE.MathUtils.clamp(P.why, 0, 1) * Math.PI);
    this.whyLights.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.ShaderMaterial;
      const local = THREE.MathUtils.clamp(wv * 1.6 - i * 0.09, 0, 1);
      m.uniforms.uOpacity.value = local * 0.5;
      child.lookAt(this.stage.camera.position);
    });

    // Process: draw the gold line, light the stations (DOM writes only on change)
    if (this.processPath) {
      const drawn = THREE.MathUtils.smoothstep(P.process, 0.15, 0.75);
      if (Math.abs(drawn - this.lastDrawn) > 0.0015) {
        this.lastDrawn = drawn;
        this.processPath.style.strokeDashoffset = String(this.processLen * (1 - drawn));
        this.processSteps.forEach((li, i) => {
          li.classList.toggle('lit', drawn > 0.12 + i * 0.25);
        });
      }
    }

    // CTA: the real aerial footage takes over once decoded; the procedural
    // towers appear only until then (or if the clip fails), never both.
    const cv = THREE.MathUtils.smoothstep(P.cta, 0.05, 0.6);
    if (P.cta > 0.02) this.skyVideo.load(); // decode before the reveal
    this.skyline.visible = cv > 0.01;
    this.skyline.position.y = THREE.MathUtils.lerp(-4.5, -1.6, cv);
    this.skyVideo.update(dt, cv > 0.15);
    const footage = this.skyVideo.playing;
    for (const child of this.skyline.children) {
      if (child === this.skyVideo.mesh) continue;
      child.visible = !footage;
    }
    (this.skyWindows.material as THREE.PointsMaterial).opacity = footage ? 0 : cv * 0.9;
  }
}

function cloneState(s: Omit<CamKey, 'y'>): Omit<CamKey, 'y'> {
  return {
    pos: s.pos.clone(),
    look: s.look.clone(),
    dScale: s.dScale,
    dPos: s.dPos.clone(),
    edge: s.edge,
  };
}

/** Low-poly Dubai-night skyline silhouette with lit windows. */
function buildSkyline(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b1530, roughness: 0.9, metalness: 0.1 });
  const rng = mulberry32(7);

  const winPositions: number[] = [];
  const towers = 24;
  for (let i = 0; i < towers; i++) {
    const x = (i - towers / 2) * 1.35 + (rng() - 0.5) * 0.6;
    const h = 1.2 + rng() * 4.2 + (Math.abs(i - towers / 2) < 3 ? 2.2 : 0);
    const w = 0.55 + rng() * 0.7;
    const d = 0.55 + rng() * 0.5;
    const z = -6 - rng() * 3;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    tower.position.set(x, h / 2, z);
    group.add(tower);

    const winCount = Math.floor(h * 4);
    for (let k = 0; k < winCount; k++) {
      winPositions.push(
        x + (rng() - 0.5) * w * 0.8,
        0.3 + rng() * (h - 0.4),
        z + d / 2 + 0.02
      );
    }
  }

  const winGeo = new THREE.BufferGeometry();
  winGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(winPositions), 3));
  const windows = new THREE.Points(
    winGeo,
    new THREE.PointsMaterial({
      color: 0xffd9a0,
      size: 0.05,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  windows.name = 'windows';
  group.add(windows);
  return group;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
