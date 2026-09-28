import { FILM } from '../content/media';

/**
 * Film chapters: each full-bleed <video> gets its source lazily as the
 * visitor approaches (H.264 with a VP9 fallback), plays only while its
 * chapter is on screen, and pauses off screen. Story overlays are native
 * <dialog>s — real page scroll, free focus trap, Escape included.
 * In lite mode nothing is wired: posters stand in for the films.
 */
export function initChapters(lite: boolean): void {
  const films = Array.from(document.querySelectorAll<HTMLVideoElement>('video.film'));

  if (!lite) {
    const probe = document.createElement('video');
    const h264 = probe.canPlayType('video/mp4; codecs="avc1.42E01E"');

    const attach = (v: HTMLVideoElement): void => {
      if (v.dataset.ready) return;
      v.dataset.ready = '1';
      const name = v.dataset.film!;
      v.src = h264 ? FILM(name, 'mp4') : FILM(name, 'webm');
    };

    // Load when a chapter comes within a viewport of the visitor
    const loader = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            attach(e.target as HTMLVideoElement);
            loader.unobserve(e.target);
          }
        }
      },
      { rootMargin: '100% 0px' }
    );
    // Play only while meaningfully visible
    const player = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.intersectionRatio >= 0.25 && v.src) void v.play().catch(() => {});
          else if (!v.paused) v.pause();
        }
      },
      { threshold: [0, 0.25] }
    );
    films.forEach((v) => {
      loader.observe(v);
      player.observe(v);
    });
    // Hero starts immediately
    const hero = films.find((v) => v.dataset.film === 'herofilm');
    if (hero) attach(hero);
  }

  // Story overlays
  document.querySelectorAll<HTMLElement>('.chapter').forEach((chapter) => {
    const dialog = chapter.querySelector<HTMLDialogElement>('dialog.story');
    const open = chapter.querySelector<HTMLButtonElement>('.open-story');
    if (!dialog || !open) return;
    open.addEventListener('click', () => {
      dialog.showModal();
      document.body.classList.add('story-open');
    });
    dialog.addEventListener('close', () => document.body.classList.remove('story-open'));
    dialog.querySelector('.story-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      // Click on the dimmed edge (the dialog element itself) closes
      if (e.target === dialog) dialog.close();
    });
  });

  initProcessLine();
}

/** The gold line draws itself as the process section crosses the viewport. */
function initProcessLine(): void {
  const path = document.getElementById('process-path') as unknown as SVGPathElement | null;
  const section = document.getElementById('process');
  if (!path || !section) return;
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
  const steps = Array.from(section.querySelectorAll('li'));

  let ticking = false;
  const update = (): void => {
    ticking = false;
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.9)));
    path.style.strokeDashoffset = String(len * (1 - p));
    steps.forEach((li, i) => li.classList.toggle('lit', p > 0.15 + i * 0.22));
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}
