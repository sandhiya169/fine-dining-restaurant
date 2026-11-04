(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---------- Preloader: visible 1–2 s, then fades out ---------- */
  let heroTL; /* hero entrance timeline starts paused and plays once the preloader is gone */
  const preEl = $('#preloader');
  const preDone = new Promise(resolve => {
    if (!preEl) return resolve();
    const root = document.documentElement;
    let hidden = false;
    root.classList.add('is-loading');
    const hide = () => {
      if (hidden) return;
      hidden = true;
      preEl.classList.add('is-hidden');
      root.classList.remove('is-loading');
      setTimeout(() => preEl.remove(), 1000);
      setTimeout(resolve, 350);
    };
    /* performance.now() counts from navigation start: never shorter than 1 s, never longer than 2 s */
    const afterLoad = () => setTimeout(hide, Math.max(0, 1000 - performance.now()));
    document.readyState === 'complete' ? afterLoad() : addEventListener('load', afterLoad, { once: true });
    setTimeout(hide, Math.max(0, 2000 - performance.now()));
  });
  preDone.then(() => heroTL && heroTL.play());

  /* Disable menu transitions while the viewport crosses the breakpoint (no slide/flash on resize) */
  let navT;
  const freezeNav = () => {
    document.documentElement.classList.add('no-nav-anim');
    clearTimeout(navT);
    navT = setTimeout(() => document.documentElement.classList.remove('no-nav-anim'), 250);
  };
  addEventListener('resize', freezeNav, { passive: true });
  addEventListener('orientationchange', freezeNav, { passive: true });
  gsap.registerPlugin(ScrollTrigger);
  /* ---------- Section headings: word-by-word reveal ---------- */
  if (!reduced) {
    const hs = document.createElement('style');
    hs.textContent = '.hw{display:inline-block;overflow:hidden;vertical-align:top;padding:.14em .06em .16em;margin:-.14em -.06em -.16em}.hw-i{display:inline-block;will-change:transform}';
    document.head.append(hs);
    const splitWords = root => {
      const words = [];
      const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(' ');
            const w = document.createElement('span'), i = document.createElement('span');
            w.className = 'hw'; w.setAttribute('aria-hidden', 'true');
            i.className = 'hw-i'; i.textContent = part;
            w.append(i); frag.append(w); words.push(i);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
      walk(root);
      return words;
    };
    /* Runs before AOS.init, so removing data-aos here replaces the old fade-up */
    document.querySelectorAll('h2, [data-split]').forEach(h => {
      const label = h.textContent.replace(/\s+/g, ' ').trim();
      if (!label) return;
      h.removeAttribute('data-aos'); h.removeAttribute('data-aos-delay');
      h.setAttribute('aria-label', label);
      gsap.fromTo(splitWords(h), { yPercent: 115 }, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.07,
        scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none', refreshPriority: -1 }
      });
    });
  }

  /* Lenis smooth scroll synced with ScrollTrigger */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  const goTo = id => lenis.scrollTo(id, { offset: -90 });

  AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reduced });

  /* Header: menu, active link, solid-on-scroll */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); lenis.start(); }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault(); closeMenu(); goTo(id);
  }));
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('#menu a:not(.btn)').forEach(a => {
    const on = a.getAttribute('href') === page;
    a.classList.toggle('active', on);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    open ? lenis.stop() : lenis.start();
  });
  /* Close menu when viewport widens past the mobile breakpoint */
  matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  ScrollTrigger.create({ start: 80, onUpdate: s => nav.classList.toggle('solid', s.scroll() > 80) });
  if (!reduced) {
    heroTL = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true })
      .from('.line span', { yPercent: 110, duration: 1.2, stagger: 0.14 })
      .from('.c-hero-bg', { scale: 1.25, duration: 1.8 }, 0.1)
      .from('.c-hero-visual', { opacity: 0, y: 36, duration: 1.2 }, 0.45)
      .from('.crumbs, .c-kicker, .lead, .hero-cta', { opacity: 0, y: 20, duration: 1, stagger: 0.12 }, 0.7)
      .from('.facts li', { opacity: 0, y: 20, duration: 0.9, stagger: 0.12 }, 1.1);

    /* Contact cards rise in sequence */
    gsap.set('.qc', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.qc', {
      start: 'top 90%', once: true,
      onEnter: b => gsap.to(b, { opacity: 1, y: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' })
    });

    /* Map frame opens like a window */
    gsap.from('#mapFrame', {
      clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'power3.inOut',
      scrollTrigger: { trigger: '#mapFrame', start: 'top 80%', once: true }
    });

    /* Banner parallax */
    gsap.to('.banner .bg', {
      yPercent: 14, ease: 'none',
      scrollTrigger: { trigger: '.banner', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.to('.c-hero-bg', {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.c-hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* Highlight today's opening hours */
  const today = String(new Date().getDay());
  $$('#hours-list li').forEach(li => li.classList.toggle('today', li.dataset.day === today));

  /* Hero card: live open / closed status (dinner Tue–Sun, 6:30–11 pm) */
  const card = $('.c-hero-card'), statusText = $('.c-status-text');
  if (card && statusText) {
    const now = new Date(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    const OPEN = 18 * 60 + 30, CLOSE = 23 * 60;
    const isOpen = day !== 1 && mins >= OPEN && mins < CLOSE;
    statusText.textContent = isOpen ? 'Open now — dinner until 11 pm'
      : day === 1 ? 'Closed today — opens Tuesday 6:30 pm'
        : mins < OPEN ? 'Opens tonight at 6:30 pm'
          : day === 0 ? 'Closed — opens Tuesday 6:30 pm'
            : 'Closed — opens tomorrow at 6:30 pm';
    card.classList.toggle('is-closed', !isOpen);
  }

  /* FAQ accordion */
  const items = $$('.faq-item');
  const toggle = (item, open) => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.setAttribute('aria-expanded', open);
    item.classList.toggle('is-open', open);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  items.forEach(item => $('.faq-q', item).addEventListener('click', e => {
    const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
    items.forEach(i => i !== item && toggle(i, false));
    toggle(item, open);
  }));
  toggle(items[0], true);

  /* Enquiry form (front-end only) */
  const form = $('#contactForm'), el = form.elements;
  const note = $('#formNote'), body = $('#formBody'), sent = $('#sent');
  const submitBtn = $('.submit', form), submitLabel = $('.btn-label', submitBtn);
  const msg = el.message, msgField = $('#msgField'), msgOpt = $('#msgOpt'), count = $('#msgCount');
  const guests = el.guests, bigParty = $('#bigParty'), slotBox = $('#slots');

  const BUTTON_TEXT = { 'Reserve a table': 'Request a table', 'Private dining': 'Request private dining', 'Ask a question': 'Send question' };
  const PLACEHOLDER = {
    'Reserve a table': 'Anything we should know? Seating preference, celebrations, accessibility.',
    'Private dining': 'Tell us about the evening: guest count, menu ideas, set-up, budget.',
    'Ask a question': 'What would you like to know?'
  };
  const pad = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const type = () => el.type.value;
  const isOpen = node => !node.closest('.collapse:not(.open)');

  /* Time slots: 6:30 pm to 10:30 pm, every 30 minutes */
  for (let m = 18 * 60 + 30; m <= 22 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60), label = `${h > 12 ? h - 12 : h}:${pad(m % 60)} pm`;
    const l = document.createElement('label');
    l.className = 'chip';
    l.innerHTML = `<input type="radio" name="time" value="${label}" data-min="${m}"><span>${label}</span>`;
    slotBox.append(l);
  }

  /* Validation */
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const rules = {
    fullname: f => f.value.trim().length < 2 && 'Please tell us your name.',
    email: f => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()) && 'Enter a valid email so we can confirm.',
    phone: f => {
      const v = f.value.trim();
      if (!v) return false;
      const d = v.replace(/\D/g, '');
      const ok = v.startsWith('+') && !v.startsWith('+91') ? d.length >= 8 && d.length <= 15 : /^(91|0)?[6-9]\d{9}$/.test(d);
      return !ok && 'Enter a valid mobile number.';
    },
    date: f => {
      if (!f.value.trim()) return 'Please choose a date.';
      const clean = f.value.replace(/\s/g, '');
      const parts = clean.split('/');
      if (parts.length !== 3 || parts.some(p => !p)) return 'Please enter a date as DD / MM / YYYY.';
      const [dd, mm, yyyy] = parts.map(Number);
      const entered = new Date(yyyy, mm - 1, dd);
      entered.setHours(0, 0, 0, 0);
      if (isNaN(entered.getTime()) || entered.getDate() !== dd || entered.getMonth() !== mm - 1)
        return 'Please enter a valid date.';
      if (entered < startOfToday()) return 'Please pick today or a later date.';
      if (entered.getDay() === 1) return 'We are closed on Mondays. Please pick another day.';
      return false;
    },
    message: f => f.required && f.value.trim().length < 5 && 'Please write your question.'
  };
  const setErr = (f, text) => {
    const box = f.closest('label, .field, fieldset');
    $('.err', box).textContent = text;
    f.setAttribute('aria-invalid', !!text);
    box.classList.toggle('invalid', !!text);
    return !text;
  };
  const validate = f => setErr(f, (rules[f.name](f)) || '');
  const validateTime = () => {
    const on = isOpen(slotBox), ok = !on || $('input:checked', slotBox);
    $('#err-time').textContent = ok ? '' : 'Please choose a time.';
    return !!ok;
  };
  function validateAll() {
    let first = null;
    Object.keys(rules).forEach(n => {
      const f = el[n];
      if (f.disabled) return;
      if (!validate(f) && !first) first = f;
    });
    if (!validateTime() && !first) first = $('input', slotBox);
    if (first) first.focus();
    return !first;
  }
  form.addEventListener('focusout', e => { if (rules[e.target.name]) validate(e.target); });
  form.addEventListener('input', e => { if (rules[e.target.name] && e.target.closest('.invalid')) validate(e.target); });

  /* Guests stepper + large-party nudge */
  function syncGuests() {
    let n = parseInt(guests.value, 10);
    n = Math.min(20, Math.max(1, isNaN(n) ? 2 : n));
    guests.value = n;
    const on = isOpen(guests);
    $('[data-step="-1"]', form).disabled = !on || n <= 1;
    $('[data-step="1"]', form).disabled = !on || n >= 20;
    bigParty.hidden = !(on && n >= 7 && type() === 'Reserve a table');
  }
  $$('[data-step]', form).forEach(b => b.addEventListener('click', () => {
    guests.value = (parseInt(guests.value, 10) || 2) + Number(b.dataset.step);
    syncGuests();
  }));
  guests.addEventListener('change', syncGuests);
  $('#toPrivate').addEventListener('click', () => {
    $('input[name="type"][value="Private dining"]', form).checked = true;
    syncType();
    el.date.focus();
  });

  /* Today's date: hide slots that start within the next hour */
  function syncSlots() {
    if (!isOpen(slotBox)) return;
    const now = new Date(), limit = now.getHours() * 60 + now.getMinutes() + 60;
    const val = el.date.value.replace(/\s/g, '');
    const parts = val.split('/');
    let isToday = false;
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map(Number);
      const entered = new Date(yyyy, mm - 1, dd);
      const todayDate = new Date(); todayDate.setHours(0,0,0,0);
      entered.setHours(0,0,0,0);
      isToday = entered.getTime() === todayDate.getTime();
    }
    $$('input', slotBox).forEach(i => {
      i.disabled = isToday && Number(i.dataset.min) < limit;
      if (i.disabled) i.checked = false;
    });
  }
  el.date.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 2) + ' / ' + v.slice(2, 4) + ' / ' + v.slice(4);
    else if (v.length > 2) v = v.slice(0, 2) + ' / ' + v.slice(2);
    e.target.value = v;
    if (v.replace(/\D/g,'').length === 8) syncSlots();
  });
  el.date.addEventListener('change', () => { syncSlots(); validate(el.date); });
  form.addEventListener('change', e => { if (e.target.name === 'time') $('#err-time').textContent = ''; });

  /* Message: counter + auto-grow */
  const grow = () => {
    count.textContent = `${msg.value.length} / ${msg.maxLength}`;
    msg.style.height = 'auto';
    msg.style.height = Math.min(msg.scrollHeight, 320) + 'px';
  };
  msg.addEventListener('input', grow);

  /* Show only the fields that fit the chosen enquiry type */
  function syncType() {
    const t = type();
    $$('[data-types]', form).forEach(g => {
      const on = g.dataset.types.split('|').includes(t);
      g.classList.toggle('open', on);
      $$('input, select, button', g).forEach(i => { i.disabled = !on; });
    });
    const ask = t === 'Ask a question';
    msg.required = ask;
    msgField.classList.toggle('req', ask);
    msgOpt.hidden = ask;
    msg.placeholder = PLACEHOLDER[t];
    submitLabel.textContent = BUTTON_TEXT[t];
    setErr(msg, '');
    note.textContent = '';
    syncGuests();
    syncSlots();
  }
  form.addEventListener('change', e => { if (e.target.name === 'type') syncType(); });

  /* Submit */
  const setBusy = on => { submitBtn.classList.toggle('busy', on); submitBtn.disabled = on; submitBtn.setAttribute('aria-busy', on); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (el.website.value) return; /* honeypot */
    if (!validateAll()) { note.textContent = 'Please check the highlighted fields.'; return; }
    note.textContent = '';
    setBusy(true);
    /* Front-end only: simulate submission delay then redirect */
    await new Promise(r => setTimeout(r, 900));

    /* Reset form fields before leaving the page */
    form.reset();
    $$('.invalid', form).forEach(b => b.classList.remove('invalid'));
    $$('.err', form).forEach(x => { x.textContent = ''; });

    /* Redirect to confirmation / 404 page */
    window.location.href = '404.html';
  });

  $('#again').addEventListener('click', () => {
    form.reset();
    $$('.invalid', form).forEach(b => b.classList.remove('invalid'));
    $$('.err', form).forEach(x => { x.textContent = ''; });
    sent.hidden = true;
    body.hidden = false;
    syncType();
    grow();
    el.fullname.focus();
  });
  form.addEventListener('reset', () => setTimeout(syncType, 0));
  syncType();

  /* Private-dining button elsewhere on the page pre-selects the enquiry type */
  $$('[data-enquiry]').forEach(b => b.addEventListener('click', () => {
    const r = $(`input[name="type"][value="${b.dataset.enquiry}"]`, form);
    if (r) { r.checked = true; syncType(); }
    goTo('#enquire');
  }));

  /* Footer newsletter */
  $('#news').addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const note  = $('#newsNote');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
      note.textContent = 'Please enter a valid email address.';
      note.style.color = '#f2a99b';
      input.focus();
      return;
    }
    note.textContent = '';
    e.target.reset();
    window.location.href = '404.html';
  });

  addEventListener('load', () => { ScrollTrigger.refresh(); AOS.refresh(); });

  /* When user returns via back button from 404 page, restore the button to its normal state */
  addEventListener('pageshow', e => {
    if (e.persisted) {
      setBusy(false);
      note.textContent = '';
    }
  });
})();