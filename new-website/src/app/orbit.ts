import * as THREE from 'three';
import { SERVICES, t as tr } from '../content/copy';
import { getLang } from './i18n';

/**
 * The Orbit: nine glowing circular portals ringing the diamond.
 * Drag anywhere on the orbit band to spin; click a portal to dive in.
 * DOM labels are projected from the 3D portal positions each frame.
 */
export class PortalRing {
  readonly group = new THREE.Group();
  onSelect: ((index: number) => void) | null = null;
  onHoverChange: ((hovered: boolean) => void) | null = null;

  private portals: THREE.Group[] = [];
  private discs: THREE.Mesh[] = [];
  private paths: THREE.Line[] = [];
  private labels: HTMLElement[] = [];
  private spin = 0;
  private spinVel = 0;
  private dragging = false;
  private lastX = 0;
  private visibility = 0;
  private hovered = -1;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private radius = 3.8;
  private camera: THREE.PerspectiveCamera | null = null;
  private labelsCleared = false;

  constructor(private interactionEl: HTMLElement) {
    this.group.rotation.x = -0.42;
    this.group.visible = false;

    // The orbit paths themselves — thin gold ellipses, like a solar system
    const pathMat = new THREE.LineBasicMaterial({
      color: 0xd9b44a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (const r of [this.radius, this.radius * 0.62]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), pathMat.clone());
      if (r !== this.radius) (line.material as THREE.LineBasicMaterial).opacity = 0.07;
      this.paths.push(line);
      this.group.add(line);
    }

    const ringGeo = new THREE.TorusGeometry(0.34, 0.008, 10, 56);
    const discGeo = new THREE.CircleGeometry(0.33, 40);

    SERVICES.forEach((svc, i) => {
      const portal = new THREE.Group();
      const angle = (i / SERVICES.length) * Math.PI * 2;
      portal.position.set(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius);
      portal.userData.index = i;

      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xd9b44a,
          transparent: true,
          opacity: svc.soon ? 0.45 : 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const disc = new THREE.Mesh(
        discGeo,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          uniforms: {
            uHover: { value: 0 },
            uTime: { value: 0 },
            uSeed: { value: i * 1.7 },
            uDim: { value: svc.soon ? 0.45 : 1 },
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform float uHover;
            uniform float uTime;
            uniform float uSeed;
            uniform float uDim;
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              float pulse = 0.85 + 0.15 * sin(uTime * 1.4 + uSeed);
              // bright jewel core + tight halo, not a fuzzy blob
              float core = smoothstep(0.16, 0.0, d) * 1.4;
              float halo = pow(smoothstep(1.0, 0.1, d), 3.2) * (0.22 + uHover * 0.5);
              float ring = smoothstep(0.05, 0.0, abs(d - 0.94)) * 0.5;
              vec3 gold = mix(vec3(0.85, 0.7, 0.22), vec3(1.0, 0.93, 0.68), core + uHover * 0.4);
              gl_FragColor = vec4(gold, (core + halo + ring) * pulse * uDim);
            }
          `,
        })
      );
      disc.userData.index = i;
      portal.add(ring, disc);
      this.discs.push(disc);
      this.portals.push(portal);
      this.group.add(portal);

      const label = document.createElement('div');
      label.className = 'portal-label';
      this.labels.push(label);
      document.body.appendChild(label);
    });

    this.refreshLabels();
    document.addEventListener('innova:lang', () => this.refreshLabels());
    this.bindPointer();
  }

  private refreshLabels(): void {
    const lang = getLang();
    SERVICES.forEach((svc, i) => {
      this.labels[i].textContent =
        tr(lang, `svc.${svc.id}.short`) + (svc.soon ? ` · ${tr(lang, 'ui.comingSoon')}` : '');
    });
  }

  private bindPointer(): void {
    const el = this.interactionEl;
    // Vertical page scroll stays native on touch; horizontal drags spin the ring.
    el.style.touchAction = 'pan-y';
    el.style.userSelect = 'none';
    (el.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
    let downX = 0;
    let downY = 0;
    el.addEventListener('pointerdown', (e) => {
      if (this.visibility < 0.5) return;
      if (e.pointerType === 'mouse') e.preventDefault(); // no text drag-select
      this.dragging = true;
      this.lastX = e.clientX;
      downX = e.clientX;
      downY = e.clientY;
      el.setPointerCapture(e.pointerId);
      document.body.classList.add('cursor-drag');
    });
    el.addEventListener('pointermove', (e) => {
      this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.spinVel = dx * 0.0035;
      this.spin += this.spinVel;
    });
    const end = (): void => {
      this.dragging = false;
      document.body.classList.remove('cursor-drag');
    };
    el.addEventListener('pointerup', (e) => {
      end();
      if (this.visibility < 0.5) return;
      // A tap (no meaningful travel) selects whatever is under the release
      // point — raycast fresh, so touch works without ever hovering.
      const travel = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (travel < 9) {
        this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        this.raycaster.setFromCamera(this.ndc, this.camera ?? new THREE.PerspectiveCamera());
        const hits = this.camera ? this.raycaster.intersectObjects(this.discs, false) : [];
        if (hits.length) {
          e.preventDefault();
          this.onSelect?.(hits[0].object.userData.index as number);
        }
      }
    });
    el.addEventListener('pointercancel', end);
  }

  setVisibility(v: number): void {
    this.visibility = v;
    this.group.visible = v > 0.02;
    const s = 0.6 + 0.4 * v;
    this.group.scale.setScalar(s);
    this.discs.forEach((d, i) => {
      const mat = d.material as THREE.ShaderMaterial;
      mat.uniforms.uDim.value = (SERVICES[i].soon ? 0.45 : 1) * v;
      (this.portals[i].children[0] as THREE.Mesh & { material: THREE.MeshBasicMaterial })
        .material.opacity = (SERVICES[i].soon ? 0.45 : 0.9) * v;
    });
  }

  update(dt: number, t: number, camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    if (!this.dragging) {
      this.spinVel *= Math.pow(0.05, dt); // inertia decay
      this.spin += this.spinVel + dt * 0.07;
    }
    this.group.rotation.y = this.spin;

    // Off-screen: skip all projection/raycast/DOM work
    if (this.visibility < 0.02) {
      if (!this.labelsCleared) {
        this.hideLabels();
        this.labelsCleared = true;
        if (this.hovered !== -1) {
          this.hovered = -1;
          this.onHoverChange?.(false);
        }
      }
      return;
    }
    this.labelsCleared = false;

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    // Portals always face the camera; labels track their screen position.
    // Labels show only for the FRONT half of the ring — the back half would
    // collide with the diamond and each other.
    const world = new THREE.Vector3();
    const ringCenter = new THREE.Vector3();
    this.group.getWorldPosition(ringCenter);
    this.portals.forEach((portal, i) => {
      portal.getWorldPosition(world);
      portal.lookAt(camPos);
      portal.position.y = Math.sin(t * 0.7 + i * 2.1) * 0.12; // individual drift
      const mat = this.discs[i].material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uHover.value +=
        ((this.hovered === i ? 1 : 0) - mat.uniforms.uHover.value) * Math.min(1, dt * 8);

      const projected = world.clone().project(camera);
      const label = this.labels[i];
      const behind = projected.z > 1;
      const frontHalf = world.distanceTo(camPos) < ringCenter.distanceTo(camPos) + this.radius * 0.12;
      const visible = this.visibility > 0.35 && !behind && (frontHalf || this.hovered === i);
      label.classList.toggle('on', visible);
      if (visible) {
        label.style.left = `${((projected.x + 1) / 2) * innerWidth}px`;
        label.style.top = `${((-projected.y + 1) / 2) * innerHeight + 44}px`;
        label.style.opacity = String(Math.min(1, this.visibility) * (this.hovered === i ? 1 : 0.7));
      } else {
        label.style.opacity = ''; // let the CSS .on class own visibility again
      }
    });

    // Hover raycast
    if (this.visibility > 0.35 && !this.dragging) {
      this.raycaster.setFromCamera(this.ndc, camera);
      const hits = this.raycaster.intersectObjects(this.discs, false);
      const idx = hits.length ? (hits[0].object.userData.index as number) : -1;
      if (idx !== this.hovered) {
        this.hovered = idx;
        this.onHoverChange?.(idx >= 0);
      }
    } else if (this.hovered !== -1 && this.visibility <= 0.35) {
      this.hovered = -1;
      this.onHoverChange?.(false);
    }
  }

  get hoveredIndex(): number {
    return this.hovered;
  }

  portalWorldPosition(index: number, out: THREE.Vector3): THREE.Vector3 {
    return this.portals[index].getWorldPosition(out);
  }

  hideLabels(): void {
    this.labels.forEach((l) => {
      l.classList.remove('on');
      l.style.opacity = ''; // inline value would override the CSS hide
    });
  }
}
