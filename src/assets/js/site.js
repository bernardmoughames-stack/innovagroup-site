/* ============================================================
   INNOVA GROUP — site behaviour
   Header state, services dropdown, mobile drawer, theme toggle,
   scroll reveal, current year.
   ============================================================ */
(function () {
  'use strict';

  /* ---- Theme (light / dark) ---- */
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('innova-theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) {}

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('innova-theme', next); } catch (err) {}
  });

  /* ---- Sticky header state ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Services dropdown ---- */
  var menus = document.querySelectorAll('.has-menu');
  menus.forEach(function (menu) {
    var btn = menu.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.getAttribute('data-open') === 'true';
      menus.forEach(function (m) { m.setAttribute('data-open', 'false'); });
      menu.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
  document.addEventListener('click', function () {
    menus.forEach(function (m) {
      m.setAttribute('data-open', 'false');
      var b = m.querySelector('button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    menus.forEach(function (m) { m.setAttribute('data-open', 'false'); });
    closeDrawer();
  });

  /* ---- Mobile drawer ---- */
  var drawer = document.querySelector('.drawer');
  function openDrawer() {
    if (!drawer) return;
    drawer.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-drawer-open]')) { e.preventDefault(); openDrawer(); }
    else if (e.target.closest('[data-drawer-close]') || e.target.closest('.drawer a')) { closeDrawer(); }
  });

  /* ---- Scroll reveal ---- */
  var items = document.querySelectorAll('[data-reveal]');
  if (items.length) {
    document.body.classList.add('reveal-ready');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
          setTimeout(function () { el.classList.add('is-visible'); }, delay);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---- Contact form ----
     Pre-selects the service from ?service=... in the URL, then sends the
     enquiry to Web3Forms in the background (no page reload, no email app).
     If JavaScript is off, the browser posts the form normally and Web3Forms
     shows its own thank-you page. Wording comes from data- attributes so it
     follows the page language. */
  var form = document.querySelector('.contact-form');
  if (form) {
    var d = function (name, fallback) {
      return form.getAttribute('data-' + name) || fallback;
    };
    var params = new URLSearchParams(window.location.search);
    var svc = params.get('service');
    var pkg = params.get('package');
    var select = form.querySelector('#cf-service');
    if (svc && select) {
      var match = Array.prototype.find.call(select.options, function (o) { return o.value === svc; });
      if (match) select.value = svc;
    }
    var message = form.querySelector('#cf-message');
    if (pkg && message && !message.value) {
      message.value = d('package-line', 'I am interested in the "{package}" package.')
        .replace('{package}', pkg) + '\n\n';
    }

    var status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      form.appendChild(status);
    }
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!window.fetch) { form.submit(); return; }

      var data = new FormData(form);
      // Send the readable service name rather than its URL slug.
      if (select) {
        data.set('service', select.value ? select.options[select.selectedIndex].text : select.options[0].text);
      }
      var subject = d('subject', 'Website enquiry')
        + (select && select.value ? ' \u2014 ' + select.options[select.selectedIndex].text : '');
      data.set('subject', subject);
      data.set('replyto', data.get('email') || '');

      status.className = 'form-status';
      status.textContent = d('sending', 'Sending\u2026');
      if (button) button.disabled = true;

      fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res && res.success) {
          form.reset();
          status.className = 'form-status is-success';
          status.textContent = d('success', 'Thank you \u2014 your enquiry has been sent.');
        } else {
          throw new Error(res && res.message);
        }
      }).catch(function () {
        status.className = 'form-status is-error';
        status.textContent = d('error', 'Something went wrong. Please email us directly.');
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }

  /* ---- Current year ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
