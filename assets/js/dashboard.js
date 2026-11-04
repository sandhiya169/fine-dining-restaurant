(() => {
  'use strict';
  /* ---------- AOS scroll reveals ---------- */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.AOS) AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reducedMotion });

  const $ = s => document.querySelector(s);

  /* ---------- Email ---------- */
  const params = new URLSearchParams(location.search);
  const urlEmail = params.get('email');
  if (urlEmail) {
    sessionStorage.setItem('dash_email', urlEmail);
    params.delete('email');
    const clean = location.pathname + (params.toString() ? '?' + params.toString() : '');
    history.replaceState(null, '', clean);
  }
  const email = sessionStorage.getItem('dash_email') || 'Guest';
  document.querySelectorAll('#email, #email-side').forEach(el => { el.textContent = email; el.title = email; });
  document.querySelectorAll('#av, #av-side').forEach(el => { el.textContent = email[0].toUpperCase(); });

  /* ---------- Notifications ---------- */
  const notifBtn = $('#notif'), notifPanel = $('#notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !notifPanel.hidden;
      notifPanel.hidden = isOpen;
      notifBtn.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        const badge = $('#notif-count');
        if (badge) badge.hidden = true;
      }
    });
    document.addEventListener('click', e => {
      if (!notifPanel.hidden && !notifBtn.closest('.notif-wrap').contains(e.target)) {
        notifPanel.hidden = true;
        notifBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Navigation ---------- */
  const panels = [...document.querySelectorAll('.view-panel')];
  const navBtns = [...document.querySelectorAll('[data-view]')];
  const side = $('#side'), scrim = $('#scrim'), mb = $('#mb');

  const menu = open => {
    side.classList.toggle('open', open);
    scrim.classList.toggle('on', open);
    mb.setAttribute('aria-expanded', open);
  };

  const go = id => {
    const valid = panels.find(p => p.dataset.panel === id);
    if (!valid) id = panels[0].dataset.panel;

    panels.forEach(p => { p.hidden = p.dataset.panel !== id; });

    navBtns.forEach(b => {
      const on = b.dataset.view === id;
      b.classList.toggle('on', on);
      on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    });

    const activeBtn = navBtns.find(b => b.dataset.view === id);
    if (activeBtn) {
      $('#title').textContent = activeBtn.textContent.trim();
      document.title = activeBtn.textContent.trim() + ' — Stackly';
    }

    scrollTo(0, 0);
    menu(false);

    /* Replay the reveal for the panel that was just opened */
    if (window.AOS) {
      const shown = panels.find(p => !p.hidden);
      if (shown) shown.querySelectorAll('[data-aos]').forEach(el => el.classList.remove('aos-animate'));
      requestAnimationFrame(() => AOS.refreshHard());
    }
  };

  navBtns.forEach(b => b.addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    go(b.dataset.view);
  }));

  mb.addEventListener('click', () => menu(!side.classList.contains('open')));
  scrim.addEventListener('click', () => menu(false));
  addEventListener('keydown', e => e.key === 'Escape' && menu(false));

  go(panels[0].dataset.panel);
})();
