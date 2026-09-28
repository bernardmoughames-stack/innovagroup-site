import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1224, 0.028);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camera.position.set(0, 0.35, 6.2);

    // Environment for glass/metal reflections (procedural, no HDR download)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

    // Luxury-watch lighting: warm gold key, cool navy fill, gold rim
    this.keyLight = new THREE.SpotLight(0xffe3ac, 190, 0, Math.PI / 5, 0.4, 1.6);
    this.keyLight.position.set(4.5, 5.5, 5.5);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.DirectionalLight(0x6f8fca, 1.4);
    this.fillLight.position.set(-4, 1.5, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xd9b44a, 40, 24, 1.8);
    this.rimLight.position.set(-2.5, 2.2, -4);
    this.scene.add(this.rimLight);

    this.scene.add(new THREE.AmbientLight(0x1d3157, 1.1));

    window.addEventListener('resize', this.resize);
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
      this.renderer.render(this.scene, this.camera);
    });
  }
}

function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return 'low';
  if (coarse && Math.min(innerWidth, innerHeight) < 500) return 'low';
  return 'high';
}
