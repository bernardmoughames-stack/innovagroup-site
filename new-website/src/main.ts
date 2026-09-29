import './styles/main.css';
import { initChrome } from './app/ui';
import { initChapters } from './app/chapters';
import { initForms } from './app/form';

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

// Lead tracking for Google Analytics: WhatsApp, phone and email taps are
// sent as events so enquiries can be traced to the page they came from.
type Gtag = (...args: unknown[]) => void;
document.addEventListener('click', (e) => {
  const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!link || !gtag) return;
  const href = link.getAttribute('href') || '';
  let name = '';
  if (href.includes('wa.me/')) name = 'whatsapp_click';
  else if (href.startsWith('tel:')) name = 'phone_click';
  else if (href.startsWith('mailto:')) name = 'email_click';
  if (!name) return;
  gtag('event', name, {
    link_url: href,
    page_path: location.pathname,
    link_location: link.closest('header, footer, .sticky-bar, .mobile-bar, section[id]')?.id || link.className || 'page',
  });
});

initChrome();
initChapters(lite);
initForms();
document.body.classList.remove('preload');
