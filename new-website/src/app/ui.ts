import { setLang, initialLang } from './i18n';
import type { Lang } from '../content/copy';

/** Shared chrome: header, menu, language switch, cursor, reveals. */
export function initChrome(): void {
  setLang(initialLang());

  document.getElementById('year')!.textContent = String(new Date().getFullYear());

  const onScroll = (): void => {
    document.body.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang as Lang));
  });

  initTheme();
  initServicesDropdown();
  initMenu();
  initReveals();
  initCursor();
}

/** Day / night mode — remembered, defaulting to the visitor's system choice. */
function initTheme(): void {
  const KEY = 'innova-theme';
  let theme: string;
  try {
    theme = localStorage.getItem(KEY) ?? '';
  } catch {
    theme = '';
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  const apply = (t: string): void => {
    document.documentElement.dataset.theme = t;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', t === 'light' ? '#F6F1E6' : '#0C1526');
  };
  apply(theme);
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode */
    }
  });
}

/** The full services list lives in the top bar at all times. */
function initServicesDropdown(): void {
  const item = document.querySelector<HTMLElement>('.nav-item');
  const btn = item?.querySelector<HTMLButtonElement>('.nav-drop-btn');
  if (!item || !btn) return;
  const set = (open: boolean): void => {
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => set(!item.classList.contains('open')));
  document.addEventListener('click', (e) => {
    if (!item.contains(e.target as Node)) set(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && item.classList.contains('open')) {
      set(false);
      btn.focus();
    }
  });
  item.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      set(false);
      document.body.classList.remove('menu-open');
      document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
    })
  );
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
    '.chapter-copy, .manifesto > *, .why-grid li, .process-steps li, [data-reveal]'
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

  const interactive = 'a, button, [role="button"], input';
  document.addEventListener('pointerover', (e) => {
    if ((e.target as HTMLElement).closest(interactive)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if ((e.target as HTMLElement).closest(interactive)) document.body.classList.remove('cursor-hover');
  });
}
