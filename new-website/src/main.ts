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

// WhatsApp links open with a ready-made message for the service the visitor
// is looking at (English or Arabic), so they only have to press send.
const WA_MESSAGES: Record<string, [string, string]> = {
  contracting: ['Hi Innova, I would like to inquire about the turnkey contracting service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة المقاولات المتكاملة.'],
  'project-management': ['Hi Innova, I would like to inquire about the project management service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة إدارة المشاريع.'],
  'facility-management': ['Hi Innova, I would like to inquire about the maintenance & facility management service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة الصيانة وإدارة المرافق.'],
  cinema: ['Hi Innova, I would like to inquire about the cinema & home theatre service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة السينما والمسرح المنزلي.'],
  snagging: ['Hi Innova, I would like to book a snagging service.', 'مرحباً إنوفا، أود حجز خدمة فحص السناجينج.'],
  marketing: ['Hi Innova, I would like to inquire about the marketing, PR & communication service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة التسويق والعلاقات العامة والاتصال.'],
  consultancy: ['Hi Innova, I would like to inquire about the management consultancy service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة الاستشارات الإدارية.'],
  ai: ['Hi Innova, I would like to inquire about the AI research & consultancy service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة أبحاث واستشارات الذكاء الاصطناعي.'],
  'home-watch': ['Hi Innova, I would like to inquire about the Home Watch & property concierge service.', 'مرحباً إنوفا، أود الاستفسار عن خدمة مراقبة المنازل والكونسيرج العقاري.'],
  default: ['Hi Innova, I would like to inquire about your services.', 'مرحباً إنوفا، أود الاستفسار عن خدماتكم.'],
};
function waTopic(path: string): string {
  if (path.includes('snagging')) return 'snagging';           // service page + snagging guide
  if (path.includes('cinema')) return 'cinema';               // service page + cinema cost guide
  const slug = path.split('/').filter(Boolean)[0] || '';
  return slug in WA_MESSAGES ? slug : 'default';
}
document.addEventListener('click', (e) => {
  const link = (e.target as Element | null)?.closest?.('a[href*="wa.me/"]') as HTMLAnchorElement | null;
  if (!link) return;
  const msg = WA_MESSAGES[waTopic(location.pathname)][document.documentElement.lang === 'ar' ? 1 : 0];
  const url = new URL(link.href);
  url.searchParams.set('text', msg);
  link.href = url.toString();
});

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

// Chapter posters load only as their section approaches, so the first
// screen paints without decoding every full-screen poster on the page.
const lazyPosters = document.querySelectorAll<HTMLVideoElement>('video[data-poster]');
const showPoster = (v: HTMLVideoElement): void => {
  if (v.dataset.poster) { v.poster = v.dataset.poster; delete v.dataset.poster; }
};
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { showPoster(e.target as HTMLVideoElement); io.unobserve(e.target); }
  }, { rootMargin: '150% 0px' });
  lazyPosters.forEach((v) => io.observe(v));
} else {
  lazyPosters.forEach(showPoster);
}

initChrome();
initChapters(lite);
initForms();
document.body.classList.remove('preload');
