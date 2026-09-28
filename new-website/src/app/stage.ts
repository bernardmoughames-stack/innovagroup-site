import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type Quality = 'high' | 'low';

/** Owns the renderer, camera, lights and the frame loop. */
export class Stage {
  readonly el: HTMLDivElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly quality: Quality;

  /** Normalised pointer (-1..1), smoothed copy used by lights/parallax. */
  readonly pointer = new THREE.Vector2(0, 0);
  readonly pointerSmooth = new THREE.Vector2(0, 0);

  readonly keyLight: THREE.SpotLight;
  readonly rimLight: THREE.PointLight;
  readonly fillLight: THREE.DirectionalLight;

  private clock = new THREE.Clock();
  private updaters = new Set<(dt: number, t: number) => void>();
  private running = false;
  private composer: EffectComposer | null = null;

  constructor() {
    this.quality = detectQuality();

    this.el = document.createElement('div');
    this.el.id = 'stage';
    document.body.prepend(this.el);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'high' ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.el.appendChild(this.renderer.domElement);

    // A lost WebGL context (iOS memory pressure) would freeze the fixed
    // canvas forever — reload straight into the static lite experience.
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      const url = new URL(location.href);
      url.searchParams.set('lite', '1');
      location.replace(url.toString());
    });

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1224, 0.028);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(0, 0.35, 6.2);

    // Environment for glass/metal reflections (procedural, no HDR download)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

    // Luxury-watch lighting: warm gold key, cool navy fill, gold rim
    this.keyLight = new THREE.SpotLight(0xffe3ac, 70, 0, Math.PI / 5, 0.4, 1.6);
    this.keyLight.position.set(4.5, 5.5, 5.5);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.DirectionalLight(0x6f8fca, 1.0);
    this.fillLight.position.set(-4, 1.5, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xd9b44a, 40, 24, 1.8);
    this.rimLight.position.set(-2.5, 2.2, -4);
    this.scene.add(this.rimLight);

    this.scene.add(new THREE.AmbientLight(0x1d3157, 1.1));

    // Bloom: what makes the gold actually glow. Desktop-tier only.
    if (this.quality === 'high') {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(innerWidth, innerHeight),
        0.55, // strength
        0.5, // radius
        0.82 // threshold — only true highlights bloom
      );
      this.composer.addPass(bloom);
      this.composer.addPass(new OutputPass());
    }

    // Debounced: mobile URL-bar show/hide fires resize storms mid-scroll
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(this.resize, 150);
    });
    window.addEventListener(
      'pointermove',
      (e) => {
        this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      },
      { passive: true }
    );
    this.resize();
  }

  resize = (): void => {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    // Pull back a little on tall/narrow screens so the diamond fits the frame
    this.camera.zoom = this.camera.aspect < 0.75 ? 0.8 : 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  };

  onFrame(fn: (dt: number, t: number) => void): () => void {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;
      this.pointerSmooth.lerp(this.pointer, 0.06);
      // Key light follows the pointer — light sweeps across the facets
      this.keyLight.position.x = 4.5 + this.pointerSmooth.x * 2.4;
      this.keyLight.position.y = 5.5 + this.pointerSmooth.y * 1.8;
      this.updaters.forEach((fn) => fn(dt, t));
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    });
  }
}

function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return 'low';
  // iOS never reports deviceMemory — treat every touch device (iPads
  // included) as the efficient tier: no bloom, capped pixel ratio.
  if (coarse) return 'low';
  return 'high';
}
