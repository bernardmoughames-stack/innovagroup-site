import * as THREE from 'three';

/**
 * A cinematic video plane rendered behind a 3D scene (world backdrop or the
 * skyline finale). Lazy: the <video> is created only when load() is called,
 * fades in once it can play, and fails silently (the procedural scene is
 * always the fallback). Fully disposed on unmount — element, texture, GPU.
 */
export class VideoBackdrop {
  readonly mesh: THREE.Mesh;
  /** Called once if the file is missing or cannot play — mount a fallback. */
  onError: (() => void) | null = null;
  private video: HTMLVideoElement | null = null;
  private texture: THREE.VideoTexture | null = null;
  private material: THREE.MeshBasicMaterial;
  private targetOpacity: number;
  private loaded = false;
  private lastPlayTry = 0;

  constructor(
    private url: string,
    opts: { width?: number; y?: number; z?: number; opacity?: number } = {}
  ) {
    const width = opts.width ?? 34;
    const height = width * (9 / 21);
    this.targetOpacity = opts.opacity ?? 0.55;
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
    this.mesh.position.set(0, opts.y ?? height * 0.32, opts.z ?? -11);
    this.mesh.renderOrder = -1;
    this.mesh.visible = false;
  }

  load(): void {
    if (this.loaded || this.video) return;
    this.loaded = true;
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    // H.264 where the browser has it, else the VP9 (.webm) twin.
    const h264 = v.canPlayType('video/mp4; codecs="avc1.42E01E"');
    v.src = h264 ? this.url : this.url.replace(/\.mp4$/, '.webm');
    this.video = v;
    v.addEventListener(
      'canplay',
      () => {
        if (!this.video) return; // disposed while loading
        this.texture = new THREE.VideoTexture(v);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.material.map = this.texture;
        this.material.needsUpdate = true;
        this.mesh.visible = true;
        void v.play().catch(() => {});
      },
      { once: true }
    );
    v.addEventListener(
      'error',
      () => {
        this.disposeMedia();
        this.onError?.();
      },
      { once: true }
    );
  }

  /** True once footage is decoded and showing. */
  get playing(): boolean {
    return this.material.map !== null;
  }

  /** Call each frame: eases the fade, keeps playback paused while hidden. */
  update(dt: number, wanted: boolean): void {
    if (wanted) this.load();
    const goal = wanted && this.material.map ? this.targetOpacity : 0;
    this.material.opacity += (goal - this.material.opacity) * Math.min(1, dt * 2.5);
    if (this.video && this.material.map) {
      if (wanted && this.video.paused) {
        // At most one play() attempt per second — no rejected-promise storm
        // when iOS Low Power Mode refuses autoplay.
        const now = performance.now();
        if (now - this.lastPlayTry > 1000) {
          this.lastPlayTry = now;
          void this.video.play().catch(() => {});
        }
      } else if (!wanted && !this.video.paused && this.material.opacity < 0.01) {
        this.video.pause();
      }
    }
  }

  /** Hard pause (e.g. while a service world hides the main journey). */
  forcePause(): void {
    this.video?.pause();
  }

  private disposeMedia(): void {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
    this.texture?.dispose();
    this.texture = null;
    this.material.map = null;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.disposeMedia();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
