import { FILM } from '../content/media';

/**
 * Film chapters: each full-bleed <video> gets its source lazily (H.264 with
 * a VP9 fallback), plays while its chapter is on screen and pauses off
 * screen. Films are baked as forward-then-reverse loops, so playback never
 * jumps. Story overlays are fixed panels UNDER the header (menu always
 * available) with the chapter's film still running beside them.
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
    const hero = films.find((v) => v.dataset.film === 'herofilm');
    if (hero) attach(hero);
  }

  initStories();
  initProcessLine();
}

function initStories(): void {
  let openStory: HTMLElement | null = null;
  let opener: HTMLElement | null = null;

  const close = (): void => {
    if (!openStory) return;
    openStory.hidden = true;
    document.body.classList.remove('story-open');
    opener?.focus();
    openStory = null;
    opener = null;
  };

  document.querySelectorAll<HTMLElement>('.chapter').forEach((chapter) => {
    const story = chapter.querySelector<HTMLElement>('.story');
    if (!story) return;

    const open = (from: HTMLElement): void => {
      close();
      openStory = story;
      opener = from;
      story.hidden = false;
      chapter.classList.add('story-showing');
      document.body.classList.add('story-open');
      story.querySelector<HTMLElement>('.story-close')?.focus();
    };

    const btn = chapter.querySelector<HTMLButtonElement>('.open-story');
    btn?.addEventListener('click', () => open(btn));
    // The title and tagline invite the same tap
    chapter.querySelectorAll<HTMLElement>('.chapter-copy h2, .chapter-copy .tagline').forEach((el) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => open(btn ?? el));
    });

    story.querySelector('.story-close')?.addEventListener('click', close);
    story.querySelector('.story-void')?.addEventListener('click', close);
    // Enquire inside a story: close first so the page can scroll to #contact
    story.querySelectorAll<HTMLAnchorElement>('.story-enquire').forEach((a) => {
      a.addEventListener('click', () => close());
    });
  });

  window.addEventListener('keydown', (e) => {
    if (!openStory) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      const items = Array.from(
        openStory.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Navigating anywhere (header menu, services dropdown) closes the story
  window.addEventListener('hashchange', close);
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
