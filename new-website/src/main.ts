import './styles/main.css';
import { initChrome } from './app/ui';
import { initChapters } from './app/chapters';

/**
 * Film-first site: full-bleed generated films with the copy over them.
 * Lite mode (reduced motion, Save-Data, ?lite=1) shows the poster frames
 * instead of playing film — same page, same content, no motion.
 */

const params = new URLSearchParams(location.search);

function isLite(): boolean {
  if (params.get('lite') === '1') return true;
  if (params.get('full') === '1') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return Boolean(nav.connection?.saveData);
}

const lite = isLite();
if (lite) document.documentElement.classList.add('lite');

// Arriving over a link always starts at the top (browsers sometimes carry
// the previous page's scroll position over); back/forward keeps its place.
const navEntry = performance.getEntriesByType('navigation')[0] as
  | PerformanceNavigationTiming
  | undefined;
if (navEntry?.type === 'navigate' && !location.hash) {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
}

initChrome();
initChapters(lite);
document.body.classList.remove('preload');
