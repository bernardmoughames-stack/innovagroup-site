import './styles/main.css';
import { initChrome } from './app/ui';
import { HERO_STILL } from './content/media';

/**
 * Boot: decide between the FULL cinematic experience (WebGL + GSAP) and the
 * LITE fallback (static, normal document flow) — then load only what's needed.
 *
 * Lite triggers: no WebGL2, prefers-reduced-motion, Save-Data, very low-memory
 * devices, or ?lite=1. Force the full experience with ?full=1.
 */

const params = new URLSearchParams(location.search);

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

function shouldUseLite(): boolean {
  if (params.get('lite') === '1') return true;
  if (params.get('full') === '1') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
  return !supportsWebGL2();
}

function enableLite(): void {
  document.documentElement.classList.add('lite');
  document.documentElement.classList.remove('has-webgl');
  // Static diamond in the hero so the brand subject is still present.
  const hero = document.querySelector('.scene-hero');
  if (hero && !hero.querySelector('.lite-diamond')) {
    const img = document.createElement('img');
    // Generated key-art when present; the logo mark as fallback.
    img.src = HERO_STILL;
    img.onerror = () => {
      img.onerror = null;
      img.src = './logo-mark-inverse.png';
      img.classList.remove('is-art');
    };
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = 'lite-diamond is-art';
    hero.appendChild(img);
  }
}

const lite = shouldUseLite();
if (lite) enableLite();
else document.documentElement.classList.add('has-webgl');

initChrome();

if (lite) {
  document.body.classList.remove('preload');
} else {
  import('./app/experience')
    .then((m) => m.startExperience())
    .catch((err) => {
      console.error('[innova] full experience failed to start — falling back to lite.', err);
      enableLite();
    })
    .finally(() => document.body.classList.remove('preload'));
}
