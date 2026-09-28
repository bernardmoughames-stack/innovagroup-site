import * as THREE from 'three';
import { gsap } from 'gsap';
import { Stage } from './stage';
import { Diamond } from './diamond';
import { AssemblyParticles, AuraParticles } from './particles';
import { PortalRing } from './orbit';
import { WorldManager } from './worldManager';
import { ScrollRig } from './scrollScenes';
import { Loader } from './loader';
import { startAudio, uiTick } from './audio';
import { SERVICES } from '../content/copy';

/**
 * The full cinematic experience:
 *   loader (particles assemble the diamond) → hero → the gaps → the orbit
 *   → service worlds → why → process → skyline finale.
 */
export function startExperience(): void {
  const stage = new Stage();

  const mainGroup = new THREE.Group();
  stage.scene.add(mainGroup);

  const diamond = new Diamond(stage.quality);
  diamond.setBodyOpacity(0);
  diamond.setEdgeOpacity(0);
  mainGroup.add(diamond.group);

  const particles = new AssemblyParticles(
    diamond.samples(stage.quality === 'high' ? 3200 : 1500)
  );
  mainGroup.add(particles.points);

  const aura = new AuraParticles(stage.quality === 'high' ? 260 : 120);
  aura.points.position.y = 0.45;
  mainGroup.add(aura.points);

  const orbitEl = document.getElementById('orbit-head') ?? document.body;
  const ring = new PortalRing(orbitEl);
  mainGroup.add(ring.group);

  const rig = new ScrollRig(stage, diamond, ring, mainGroup, aura);

  const worldMgr = new WorldManager(stage, {
    hideMain: () => {
      mainGroup.visible = false;
      ring.hideLabels();
      rig.suspendVideo();
    },
    showMain: () => {
      mainGroup.visible = true;
    },
  });

  // Portal + card entry points into the worlds
  const cardButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.service-card .enter-world')
  );
  cardButtons.forEach((btn) => {
    const card = btn.closest<HTMLElement>('.service-card')!;
    const index = SERVICES.findIndex((s) => s.id === card.dataset.service);
    btn.addEventListener('click', () => worldMgr.open(index, btn));
  });
  ring.onSelect = (i) => worldMgr.open(i, cardButtons[i] ?? null);
  ring.onHoverChange = (hovered) => {
    document.body.classList.toggle('cursor-hover', hovered);
    if (hovered) uiTick(1320);
  };

  let entered = false;

  stage.onFrame((dt, t) => {
    particles.update(t);
    aura.update(t);
    if (worldMgr.active) return;
    if (entered) {
      diamond.update(dt, t);
      rig.frame(dt);
    }
    ring.update(dt, t, stage.camera);
  });
  stage.start();

  // ---- loader sequence ----
  const loader = new Loader((withSound) => {
    startAudio(withSound);
    entered = true;
    rig.enable();

    const fade = { p: 1 };
    gsap.to(fade, {
      p: 0,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => particles.setOpacity(fade.p),
    });
    const body = { o: 0, e: 0 };
    gsap.to(body, {
      o: 0.97,
      e: 0.5,
      duration: 1.6,
      ease: 'power2.out',
      delay: 0.25,
      onUpdate: () => {
        diamond.setBodyOpacity(body.o);
        diamond.setEdgeOpacity(body.e);
      },
    });
    gsap.fromTo(
      diamond.group.scale,
      { x: 0.93, y: 0.93, z: 0.93 },
      { x: 1, y: 1, z: 1, duration: 1.8, ease: 'elastic.out(1, 0.6)', delay: 0.2 }
    );
    gsap.to(rig, { auraBase: 0.42, duration: 2.4, ease: 'power2.out', delay: 0.6 });
  });

  const progress = { v: 0 };
  const assembling = gsap.to(progress, {
    v: 1,
    duration: 2.6,
    ease: 'power1.inOut',
    onUpdate: () => {
      loader.setProgress(progress.v);
      particles.setProgress(progress.v);
    },
  });

  const fontsReady: Promise<unknown> =
    'fonts' in document ? (document as Document & { fonts: FontFaceSet }).fonts.ready : Promise.resolve();
  Promise.all([assembling.then(), fontsReady.catch(() => undefined)]).then(() => loader.ready());
}
