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

// Every page open starts at the top — the owner wants this on all
// navigations, so scroll restoration is fully manual.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const toTop = (): void => {
  if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
};
toTop();
window.addEventListener('pageshow', toTop);

initChrome();
initChapters(lite);
document.body.classList.remove('preload');
