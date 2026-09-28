import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Stage } from './stage';
import { createWorld, disposeWorld, type World } from './worlds';
import { SERVICES, CONTACT_URL, t as tr } from '../content/copy';
import { getLang } from './i18n';
import { uiTick } from './audio';

/**
 * Handles the dive from the orbit into a service world and back:
 * gold iris transition, mounting/unmounting the procedural world scenes,
 * the copy panel (localised), the circular return button, prev/next,
 * focus trapping and Escape.
 */
export class WorldManager {
  active = false;

  private layer: HTMLDivElement;
  private veil: HTMLDivElement;
  private panel: HTMLDivElement;
  private returnBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private world: World | null = null;
  private index = 0;
  private origin: HTMLElement | null = null;
  private transitioning = false;
  private camBase = new THREE.Vector3(0, 1.5, 7.4);

  constructor(
    private stage: Stage,
    private hooks: { hideMain(): void; showMain(): void }
  ) {
    this.layer = document.createElement('div');
    this.layer.id = 'world-layer';
    this.layer.setAttribute('role', 'dialog');
    this.layer.setAttribute('aria-modal', 'true');

    this.veil = document.createElement('div');
    this.veil.className = 'world-veil';

    this.panel = document.createElement('div');
    this.panel.className = 'world-panel';

    this.returnBtn = document.createElement('button');
    this.returnBtn.className = 'world-return';
    this.returnBtn.type = 'button';
    this.returnBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

    const nav = document.createElement('div');
    nav.className = 'world-nav';
    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>';
    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>';
    nav.append(this.prevBtn, this.nextBtn);

    this.layer.append(this.panel, this.returnBtn, nav, this.veil);
    document.body.appendChild(this.layer);

    this.returnBtn.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.step(-1));
    this.nextBtn.addEventListener('click', () => this.step(1));
    this.layer.addEventListener('keydown', (e) => this.onKeydown(e));
    document.addEventListener('innova:lang', () => {
      if (this.active) this.renderPanel();
    });

    this.stage.onFrame((dt, t) => this.frame(dt, t));
  }

  open(index: number, origin: HTMLElement | null = null): void {
    if (this.active || this.transitioning) return;
    this.index = index;
    this.origin = origin;
    this.transitioning = true;
    this.active = true;
    document.body.classList.add('in-world');
    this.layer.classList.add('open');
    uiTick(880);

    const tl = gsap.timeline({
      onComplete: () => {
        this.transitioning = false;
        this.returnBtn.focus();
      },
    });
    tl.to(this.stage.camera.position, { z: this.stage.camera.position.z - 1.6, duration: 0.55, ease: 'power2.in' }, 0);
    this.veilIn(tl, 0.18);
    tl.add(() => {
      this.hooks.hideMain();
      this.mount(index);
      this.renderPanel();
    });
    this.veilOut(tl);
    tl.from(
      this.panel.children,
      { y: 34, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'all' },
      '-=0.35'
    );
  }

  close(): void {
    if (!this.active || this.transitioning) return;
    this.transitioning = true;
    uiTick(660);

    const tl = gsap.timeline({
      onComplete: () => {
        this.layer.classList.remove('open');
        document.body.classList.remove('in-world');
        this.active = false;
        this.transitioning = false;
        this.origin?.focus();
      },
    });
    this.veilIn(tl, 0);
    tl.add(() => {
      this.unmount();
      this.hooks.showMain();
    });
    this.veilOut(tl);
  }

  private step(dir: number): void {
    if (this.transitioning) return;
    this.transitioning = true;
    uiTick(dir > 0 ? 990 : 780);
    const next = (this.index + dir + SERVICES.length) % SERVICES.length;
    const tl = gsap.timeline({ onComplete: () => (this.transitioning = false) });
    this.veilIn(tl, 0);
    tl.add(() => {
      this.unmount();
      this.index = next;
      this.mount(next);
      this.renderPanel();
    });
    this.veilOut(tl);
    tl.from(
      this.panel.children,
      { y: 26, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'all' },
      '-=0.3'
    );
  }

  private veilIn(tl: gsap.core.Timeline, at: number): void {
    tl.fromTo(
      this.veil,
      { opacity: 1, clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(78% at 50% 50%)', duration: 0.6, ease: 'power3.in' },
      at
    );
  }

  private veilOut(tl: gsap.core.Timeline): void {
    tl.to(this.veil, { opacity: 0, duration: 0.75, ease: 'power2.out' });
    tl.set(this.veil, { clipPath: 'circle(0% at 50% 50%)' });
  }

  private mount(index: number): void {
    this.world = createWorld(SERVICES[index].world, this.stage.quality);
    this.stage.scene.add(this.world.group);
    this.camBase.set(0, 1.5, 7.4);
    this.stage.camera.position.copy(this.camBase);
    this.stage.camera.lookAt(0, 1.1, 0);
  }

  private unmount(): void {
    if (this.world) {
      disposeWorld(this.world);
      this.world = null;
    }
  }

  private renderPanel(): void {
    const lang = getLang();
    const svc = SERVICES[this.index];
    const soon = svc.soon
      ? `<p class="kicker"><span class="soon-badge">${tr(lang, 'ui.comingSoon')}</span></p>`
      : `<p class="kicker">${tr(lang, `svc.${svc.id}.tag`)}</p>`;
    this.panel.innerHTML = `
      ${soon}
      <h2 id="world-title">${tr(lang, `svc.${svc.id}.name`)}</h2>
      <p class="desc">${tr(lang, `svc.${svc.id}.desc`)}</p>
      <p class="packages">${tr(lang, `svc.${svc.id}.pack`)}</p>
      <div class="world-actions">
        <a class="btn btn-gold" href="${CONTACT_URL}">${tr(lang, 'cta.enquire')}</a>
        <a class="text-link" href="${svc.url}">${tr(lang, svc.soon ? 'ui.notify' : 'ui.explore')}</a>
      </div>`;
    this.layer.setAttribute('aria-labelledby', 'world-title');
    this.returnBtn.setAttribute('aria-label', tr(lang, 'world.return'));
    this.prevBtn.setAttribute('aria-label', tr(lang, 'world.prev'));
    this.nextBtn.setAttribute('aria-label', tr(lang, 'world.next'));
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(
      this.layer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private frame(dt: number, t: number): void {
    if (!this.active || !this.world) return;
    this.world.update(dt, t);
    // Gentle parallax inside a world
    const p = this.stage.pointerSmooth;
    this.stage.camera.position.x = this.camBase.x + p.x * 0.45;
    this.stage.camera.position.y = this.camBase.y + p.y * 0.25;
    this.stage.camera.lookAt(0, 1.1, 0);
  }
}
