import { MESSAGES, type Lang } from '../content/copy';

const STORE_KEY = 'innova-lang';

/**
 * In production every page exists twice: English at /<page>/ and Arabic at
 * /ar/<page>/, each with its own HTML (tools/prepare-deploy.mjs marks them
 * with data-localized). The language then follows the URL, and the switch
 * goes to the other page. In development there is one page holding both
 * languages, and the switch flips it in place as before.
 */
const localized = document.documentElement.hasAttribute('data-localized');

/** URL of this page in the other language, from its hreflang link. */
function alternate(lang: Lang): string | null {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${lang}"]`);
  return link ? new URL(link.href).pathname + location.hash : null;
}

/** Old links like /snagging/?lang=ar go to the Arabic page. */
export function redirectLegacyLang(): boolean {
  if (!localized) return false;
  const asked = new URLSearchParams(location.search).get('lang');
  if ((asked === 'ar' || asked === 'en') && asked !== document.documentElement.lang) {
    const target = alternate(asked);
    if (target) {
      location.replace(target);
      return true;
    }
  }
  return false;
}

export function initialLang(): Lang {
  if (localized) return document.documentElement.lang === 'ar' ? 'ar' : 'en';
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

/** The language switch: another page in production, in place in development. */
export function switchLang(lang: Lang): void {
  if (localized && lang !== current) {
    const target = alternate(lang);
    if (target) {
      try { localStorage.setItem(STORE_KEY, lang); } catch { /* ignore */ }
      location.href = target;
      return;
    }
  }
  setLang(lang);
}

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

  try { localStorage.setItem(STORE_KEY, lang); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('innova:lang', { detail: lang }));
}
