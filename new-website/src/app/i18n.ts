import { MESSAGES, type Lang } from '../content/copy';

const STORE_KEY = 'innova-lang';

export function initialLang(): Lang {
  const url = new URLSearchParams(location.search).get('lang');
  if (url === 'ar' || url === 'en') return url;
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch { /* private mode */ }
  return 'en';
}

let current: Lang = 'en';
export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  current = lang;
  const dict = MESSAGES[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!;
    const value = dict[key] ?? MESSAGES.en[key];
    if (value !== undefined) el.textContent = value;
  });

  // Accessibility strings follow the language too
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria!;
    const value = dict[key] ?? MESSAGES.en[key];
    if (value !== undefined) el.setAttribute('aria-label', value);
  });

  document.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });

  // Keep the canonical URL in step with the language shown, so the
  // English and ?lang=ar versions are indexed as a matching hreflang pair.
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    const base = canonical.href.split('?')[0];
    canonical.href = lang === 'ar' ? `${base}?lang=ar` : base;
  }

  try { localStorage.setItem(STORE_KEY, lang); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('innova:lang', { detail: lang }));
}
