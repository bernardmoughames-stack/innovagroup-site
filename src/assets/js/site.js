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
     Pre-selects the service from ?service=... in the URL, and sends the
     enquiry by opening the visitor's email client. To post to a real form
     endpoint instead, see CUSTOMIZE.md. */
  var form = document.querySelector('.contact-form');
  if (form) {
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
      message.value = 'I am interested in the "' + pkg + '" package.\n\n';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var get = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var serviceLabel = select && select.selectedIndex > -1 ? select.options[select.selectedIndex].text : '';
      var subject = 'Website enquiry' + (serviceLabel && select.value ? ' — ' + serviceLabel : '');
      var lines = [
        'Name: ' + get('name'),
        'Email: ' + get('email'),
        'Phone: ' + (get('phone') || '—'),
        'Service: ' + (select && select.value ? serviceLabel : 'Not specified'),
        '',
        get('message')
      ];
      window.location.href = 'mailto:Info@innovagroup.co.ae'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));

      var status = form.querySelector('.form-status');
      if (!status) {
        status = document.createElement('p');
        status.className = 'form-status';
        form.appendChild(status);
      }
      status.textContent = 'Opening your email app — press send to deliver the enquiry.';
    });
  }

  /* ---- Current year ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
