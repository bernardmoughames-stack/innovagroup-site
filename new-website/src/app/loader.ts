import { t as tr } from '../content/copy';
import { getLang } from './i18n';

/**
 * Intro loader: counter + gold bar while the diamond assembles from
 * particles behind it, then the Enter choice (with sound / in silence).
 * The page content stays in the document the whole time — the loader is
 * an overlay, never a gate for crawlers or no-JS visitors.
 */
export class Loader {
  private el: HTMLDivElement;
  private counter: HTMLDivElement;
  private bar: HTMLElement;
  private shown = 0;

  constructor(onEnter: (withSound: boolean) => void) {
    this.el = document.createElement('div');
    this.el.id = 'loader';
    this.el.setAttribute('role', 'status');
    this.el.innerHTML = `
      <img class="loader-mark" src="./logo-mark-inverse.png" alt="" aria-hidden="true" />
      <div class="loader-counter" aria-hidden="true">0</div>
      <div class="loader-bar" aria-hidden="true"><i></i></div>
      <div class="loader-enter">
        <button type="button" class="btn btn-gold" data-sound="1"></button>
        <button type="button" class="loader-quiet" data-sound="0"></button>
      </div>`;
    document.body.appendChild(this.el);
    this.counter = this.el.querySelector('.loader-counter')!;
    this.bar = this.el.querySelector('.loader-bar i')!;
    document.body.style.overflow = 'hidden';

    const label = (): void => {
      const lang = getLang();
      this.el.querySelector('[data-sound="1"]')!.textContent = tr(lang, 'loader.enter');
      this.el.querySelector('[data-sound="0"]')!.textContent = tr(lang, 'loader.quiet');
      this.el.setAttribute('aria-label', tr(lang, 'loader.preparing'));
    };
    label();
    document.addEventListener('innova:lang', label);

    this.el.querySelectorAll<HTMLButtonElement>('.loader-enter button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
        this.el.classList.add('done');
        onEnter(btn.dataset.sound === '1');
        setTimeout(() => this.el.remove(), 1400);
      });
    });
  }

  setProgress(p: number): void {
    const pct = Math.round(p * 100);
    if (pct !== this.shown) {
      this.shown = pct;
      this.counter.textContent = String(pct);
      this.bar.style.transform = `scaleX(${p})`;
    }
  }

  ready(): void {
    this.setProgress(1);
    this.el.classList.add('ready');
    this.el.querySelector<HTMLButtonElement>('[data-sound="1"]')?.focus();
  }
}
