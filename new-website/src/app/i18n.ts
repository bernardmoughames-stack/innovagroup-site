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

  document.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });

  try { localStorage.setItem(STORE_KEY, lang); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('innova:lang', { detail: lang }));
}
