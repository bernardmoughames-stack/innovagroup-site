import { setLang, initialLang } from './i18n';
import { setMuted, isMuted } from './audio';
import type { Lang } from '../content/copy';

/** Shared chrome: header, menu, language switch, cursor, reveals, sound toggle. */
export function initChrome(): void {
  setLang(initialLang());

  document.getElementById('year')!.textContent = String(new Date().getFullYear());

  // Header background after scroll
  const onScroll = (): void => {
    document.body.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Language switch
  document.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang as Lang));
  });

  // Sound toggle (preference works even before the audio engine starts)
  document.getElementById('sound-toggle')?.addEventListener('click', () => {
    setMuted(!isMuted());
  });

  initMenu();
  initReveals();
  initCursor();
}

function initMenu(): void {
  const btn = document.getElementById('menu-toggle');
  const nav = document.querySelector<HTMLElement>('.site-nav');
  if (!btn || !nav) return;

  const close = (): void => {
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
    if (open) nav.querySelector<HTMLElement>('a')?.focus();
    else btn.focus();
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  window.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('menu-open')) return;
    if (e.key === 'Escape') {
      close();
      (btn as HTMLElement).focus();
      return;
    }
    if (e.key === 'Tab') {
      // Contain focus inside the open menu (links + the close button)
      const items = [...nav.querySelectorAll<HTMLElement>('a'), btn as HTMLElement];
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
}

function initReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>(
    '.scene-copy, .service-card, .why-grid li, .process-steps li, .contact-lines'
  );
  targets.forEach((el) => el.classList.add('reveal'));
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );
  targets.forEach((el) => io.observe(el));
}

function initCursor(): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced || document.documentElement.classList.contains('lite')) return;

  document.documentElement.classList.add('has-cursor');
  const dot = document.createElement('div');
  dot.id = 'cursor-dot';
  const ring = document.createElement('div');
  ring.id = 'cursor-ring';
  document.body.append(dot, ring);

  // Parked offscreen until the pointer first moves
  let mx = -100;
  let my = -100;
  let rx = mx;
  let ry = my;
  dot.style.transform = ring.style.transform = 'translate(-100px, -100px)';
  window.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    },
    { passive: true }
  );
  const loop = (): void => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  loop();

  const interactive = 'a, button, [role="button"], input, .service-card';
  document.addEventListener('pointerover', (e) => {
    if ((e.target as HTMLElement).closest(interactive)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if ((e.target as HTMLElement).closest(interactive)) document.body.classList.remove('cursor-hover');
  });
}
