import { FILM } from '../content/media';

/**
 * Film chapters: each full-bleed <video> gets its source lazily (H.264 with
 * a VP9 fallback), plays while its chapter is on screen and pauses off
 * screen. Films are baked as forward-then-reverse loops, so playback never
 * jumps. Each service chapter links to its own full page; the title and
 * tagline invite the same tap as the button.
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
          if (e.intersectionRatio >= 0.25 && v.src) {
            if (v.ended) v.currentTime = 0;
            void v.play().catch(() => {});
          } else if (!v.paused) v.pause();
        }
      },
      { threshold: [0, 0.25] }
    );
    const smallScreen = window.matchMedia('(max-width: 700px)').matches;
    films.forEach((v) => {
      loader.observe(v);
      if (smallScreen || !v.closest('.chapters')) player.observe(v);
    });
    const hero = films.find((v) => v.dataset.film === 'herofilm');
    if (hero) attach(hero);
  }

  if (!lite) {
    initCrossfade();
    if (!window.matchMedia('(max-width: 700px)').matches) initStack();
  }
  initPageTransitions(lite);
  initChapterLinks();
  initProcessLine();
}

/**
 * Films crossfade as chapters hand over: each film's opacity follows how
 * much of its chapter is on screen, so scrolling dips through the page's
 * dark ground instead of hard-cutting from one film to the next.
 */
function initCrossfade(): void {
  const films = Array.from(
    document.querySelectorAll<HTMLVideoElement>('.chapter-hero .film, .chapter-cta .film')
  );
  if (!films.length) return;
  let ticking = false;
  const update = (): void => {
    ticking = false;
    const vh = innerHeight;
    const zone = vh * 0.35;
    for (const film of films) {
      const r = film.parentElement!.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      const o = Math.max(0, Math.min(1, Math.min((vh - r.top) / zone, r.bottom / zone)));
      film.style.opacity = o.toFixed(3);
    }
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
  window.addEventListener('resize', update);
  update();
}


/**
 * The service chapters are a sticky deck: each next chapter slides over
 * the pinned previous one. This keeps only the visible films playing and
 * hides fully covered chapters so the GPU isn't compositing nine films.
 */
function initStack(): void {
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('.chapters .chapter'));
  if (!chapters.length) return;
  let ticking = false;
  const revealed = chapters.map(() => false);
  const update = (): void => {
    ticking = false;
    const vh = innerHeight;
    const tops = chapters.map((c) => c.getBoundingClientRect().top);
    chapters.forEach((c, i) => {
      const covered = i + 1 < chapters.length && tops[i + 1] <= 2;
      c.classList.toggle('covered', covered);
      const v = c.querySelector<HTMLVideoElement>('.film');
      if (!v || !v.src) return;
      // A film starts once its chapter is truly revealed (over half the
      // viewport), not the moment its edge appears — otherwise a
      // play-once film can finish before anyone sees it. Coming back to
      // a finished chapter restarts its film.
      const shown = !covered && tops[i] < vh * 0.55 && tops[i] > -vh * 1.5;
      if (shown) {
        if (!revealed[i]) {
          revealed[i] = true;
          if (v.ended) v.currentTime = 0;
          void v.play().catch(() => {});
        } else if (v.paused && !v.ended) {
          void v.play().catch(() => {});
        }
      } else {
        revealed[i] = false;
        if (!v.paused) v.pause();
      }
    });
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
  window.addEventListener('resize', update);
  // Films get their src lazily, sometimes after the last scroll event
  // (a fast fling, a jump). Re-check when media becomes ready and on a
  // slow heartbeat so a revealed chapter never sits on a frozen poster.
  document.addEventListener('canplay', () => update(), true);
  window.setInterval(update, 500);
  update();
}

let leaveTo: ((href: string, chapter?: HTMLElement | null) => void) | null = null;

/**
 * Leaving for another page zooms into the chapter's film and fades the
 * screen to the page ground; the service page answers by settling its
 * hero film out of the same zoom. Modified clicks (new tab etc.) are
 * left alone, and bfcache restores reset the effect.
 */
function initPageTransitions(lite: boolean): void {
  const fade = document.createElement('div');
  fade.id = 'page-fade';
  document.body.appendChild(fade);

  const go = (href: string, chapter?: HTMLElement | null): void => {
    if (document.body.classList.contains('page-leave')) return;
    if (lite) {
      location.href = href;
      return;
    }
    chapter?.classList.add('zooming');
    document.body.classList.add('page-leave');
    window.setTimeout(() => {
      location.href = href;
    }, 640);
  };
  leaveTo = go;

  const plain = (e: MouseEvent): boolean =>
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

  document.querySelectorAll<HTMLAnchorElement>('a[href$=".html"]').forEach((a) => {
    if (a.host !== location.host) return;
    a.addEventListener('click', (e) => {
      if (!plain(e)) return;
      e.preventDefault();
      go(a.href, a.closest<HTMLElement>('.chapter'));
    });
  });

  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) {
      document.body.classList.remove('page-leave');
      document.querySelectorAll('.chapter.zooming').forEach((c) => c.classList.remove('zooming'));
    }
  });
}

/** The chapter's title and tagline lead to the same page as its button. */
function initChapterLinks(): void {
  document.querySelectorAll<HTMLElement>('.chapter[data-service]').forEach((chapter) => {
    const link = chapter.querySelector<HTMLAnchorElement>('.chapter-actions a.btn');
    if (!link) return;
    chapter.querySelectorAll<HTMLElement>('.chapter-copy h2, .chapter-copy .tagline').forEach((el) => {
      el.dataset.link = '1';
      el.addEventListener('click', () => {
        if (leaveTo) leaveTo(link.href, chapter);
        else location.href = link.href;
      });
    });
  });
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
