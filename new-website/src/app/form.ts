import { getLang } from './i18n';
import { t } from '../content/copy';

/**
 * The enquiry form — same Web3Forms endpoint and access key as the
 * original innovagroup.co.ae contact page, so submissions land in the
 * same company inbox. Honeypot checkbox filters bots; on success the
 * form is replaced by the confirmation line.
 */
export function initForms(): void {
  document.querySelectorAll<HTMLFormElement>('form.enquiry-form').forEach((form) => {
    const status = form.querySelector<HTMLElement>('.form-status');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const bot = form.querySelector<HTMLInputElement>('input[name="botcheck"]');
      if (bot?.checked) return;

      const lang = getLang();
      const data = new FormData(form);
      data.set('language', lang);
      data.delete('botcheck');

      if (button) {
        button.disabled = true;
        button.textContent = t(lang, 'form.sending');
      }
      if (status) status.textContent = '';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
        .then((res) => res.json())
        .then((json: { success?: boolean }) => {
          if (!json.success) throw new Error('web3forms rejected');
          const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
          gtag?.('event', 'generate_lead', {
            form_name: 'enquiry',
            service: String(data.get('service') ?? ''),
            page_path: location.pathname,
            language: lang,
          });
          const done = document.createElement('p');
          done.className = 'form-done';
          done.setAttribute('role', 'status');
          done.textContent = t(lang, 'form.success');
          form.replaceChildren(done);
        })
        .catch(() => {
          if (status) status.textContent = t(lang, 'form.error');
          if (button) {
            button.disabled = false;
            button.textContent = t(lang, 'form.send');
          }
        });
    });
  });
}
