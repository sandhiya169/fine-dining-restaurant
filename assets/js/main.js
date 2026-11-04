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

  /* ---------- Lenis smooth scroll, synced with ScrollTrigger ---------- */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      e.preventDefault();
      closeMenu();
      lenis.scrollTo(id, { offset: -80 });
    })
  );

  /* ---------- AOS ---------- */
  AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reduced });

  /* ---------- Navigation ---------- */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() {
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    lenis.start();
  }
  /* Active page link */
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
  ScrollTrigger.create({
    start: 80,
    onUpdate: s => nav.classList.toggle('solid', s.scroll() > 80)
  });

  /* ---------- Hero: one orchestrated entrance ---------- */
  if (!reduced) {
    heroTL = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true })
      .from('#heroBg img', { scale: 1.3, duration: 2.2, ease: 'power2.out' }, 0)
      .from('.hero-kicker', { opacity: 0, y: 20, duration: 1 }, 0.2)
      .from('.hero .line span', { yPercent: 115, duration: 1.3, stagger: 0.14 }, 0.3)
      .from('.hero-cta', { opacity: 0, y: 20, duration: 1 }, 0.95)
      .from('.hero-facts', { opacity: 0, y: 40, duration: 1.2 }, 1.1);

    gsap.to('#heroBg img', {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* Parallax on philosophy images */
    $$('[data-speed]').forEach(el => {
      gsap.fromTo(el, { y: (1 - el.dataset.speed) * -200 }, {
        y: (1 - el.dataset.speed) * 200, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* Cellar photo drifts slowly inside its frame */
  if (!reduced && $('.cellar-photo img')) {
    gsap.fromTo('.cellar-photo img', { yPercent: -6, scale: 1.14 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.cellar-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- Count-up stats ---------- */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, {
        v: end, duration: reduced ? 0 : 2, ease: 'power2.out',
        onUpdate: () => (el.textContent = Math.round(o.v))
      })
    });
  });


  /* ---------- Signature plates: kitchen tabs + dish preview ---------- */
  const sig = $('#signatures');
  if (sig) {
    const tabs = $$('.sig-tabs [role="tab"]', sig), panels = $$('.sig-panel', sig);
    sig.classList.add('sig-js');
    const openPanel = id => {
      tabs.forEach(t => t.setAttribute('aria-selected', t.getAttribute('aria-controls') === id));
      panels.forEach(p => { p.hidden = p.id !== id; });
      ScrollTrigger.refresh();
    };
    tabs.forEach(t => t.addEventListener('click', () => openPanel(t.getAttribute('aria-controls'))));
    panels.forEach(panel => {
      const rows = $$('.dishes li', panel);
      const pick = li => rows.forEach(r => r.classList.toggle('on', r === li));
      rows.forEach(li => {
        li.tabIndex = 0;
        ['pointerenter', 'focus', 'click'].forEach(ev => li.addEventListener(ev, () => pick(li)));
      });
      pick(rows[0]);
    });
    openPanel(tabs[0].getAttribute('aria-controls'));
  }

  /* ---------- Reviews slider ---------- */
  const slides = $$('#slides figure'), dots = $$('#dots button');
  let idx = 0, timer;
  const show = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('on', n === idx));
    dots.forEach((d, n) => d.classList.toggle('on', n === idx));
  };
  const play = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => show(idx + 1), 5500); };
  dots.forEach((d, n) => d.addEventListener('click', () => { show(n); play(); }));
  const prevBtn = $('#revPrev'), nextBtn = $('#revNext');
  if (prevBtn) prevBtn.addEventListener('click', () => { show(idx - 1); play(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { show(idx + 1); play(); });
  play();

  /* ---------- Reservation form ---------- */
  const form = $('#form'), note = $('#note');
  if (form) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateField = form.elements['date'];

    /* Auto-format DD / MM / YYYY as user types */
    dateField.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 4) v = v.slice(0,2) + ' / ' + v.slice(2,4) + ' / ' + v.slice(4);
      else if (v.length > 2) v = v.slice(0,2) + ' / ' + v.slice(2);
      e.target.value = v;
    });

    const setErr = (field, msg) => {
      const parent = field.closest('label') || field.parentElement;
      const errEl = parent ? parent.querySelector('.err') : null;
      field.classList.toggle('bad', !!msg);
      if (parent) parent.classList.toggle('bad', !!msg);
      if (errEl) errEl.textContent = msg;
    };

    const validateField = field => {
      const name = field.name;
      const val = field.value.trim();
      let err = '';

      if (name === 'name') {
        if (!val) err = 'Please enter your name.';
        else if (val.length < 2) err = 'Name must be at least 2 characters.';
        else if (!/^[a-zA-Z\s.'-]+$/.test(val)) err = 'Please enter a valid name (letters only).';
      } else if (name === 'email') {
        if (!val) err = 'Please enter your email address.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) err = 'Please enter a valid email address.';
      } else if (name === 'date') {
        if (!val) err = 'Please choose a reservation date.';
        else {
          const clean = val.replace(/\s/g, '');
          const parts = clean.split('/');
          if (parts.length !== 3 || parts.some(p => !p)) {
            err = 'Please enter a date as DD / MM / YYYY.';
          } else {
            const [dd, mm, yyyy] = parts.map(Number);
            const entered = new Date(yyyy, mm - 1, dd);
            entered.setHours(0,0,0,0);
            if (isNaN(entered.getTime()) || entered.getDate() !== dd || entered.getMonth() !== mm - 1) {
              err = 'Please enter a valid date.';
            } else if (entered < today) {
              err = 'Please choose a future date.';
            }
          }
        }
      }
      setErr(field, err);
      return !err;
    };

    // Live validation on input / blur
    ['name', 'email', 'date'].forEach(fieldName => {
      const field = form.elements[fieldName];
      if (!field) return;
      field.addEventListener('input', () => {
        if (field.classList.contains('bad')) validateField(field);
      });
      field.addEventListener('blur', () => {
        if (field.value.trim()) validateField(field);
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = ['name', 'email', 'date'].map(n => form.elements[n]).filter(Boolean);
      const allValid = fields.map(validateField).every(Boolean);

      if (!allValid) {
        if (note) {
          note.textContent = 'Please check the highlighted fields.';
          note.style.color = '#f2a99b';
        }
        const firstBad = form.querySelector('.bad');
        if (firstBad) firstBad.focus();
        return;
      }

      // if (note) {
      //   note.textContent = 'Redirecting…';
      //   note.style.color = 'var(--brass)';
      // }

      // Reset all form fields
      form.reset();
      fields.forEach(f => setErr(f, ''));

      // Redirect to 404 page
      window.location.href = '404.html';
    });
  }

  /* ---------- Newsletter ---------- */
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

  /* Room gallery: drag to scroll + auto-scroll */
  const rg = document.getElementById('roomGallery');
  if (rg) {
    /* --- drag --- */
    let isDown = false, startX, scrollLeft;
    rg.addEventListener('mousedown', e => {
      isDown = true; rg.classList.add('is-dragging');
      startX = e.pageX - rg.offsetLeft; scrollLeft = rg.scrollLeft;
    });
    rg.addEventListener('mouseleave', () => { isDown = false; rg.classList.remove('is-dragging'); });
    rg.addEventListener('mouseup',    () => { isDown = false; rg.classList.remove('is-dragging'); });
    rg.addEventListener('mousemove', e => {
      if (!isDown) return; e.preventDefault();
      rg.scrollLeft = scrollLeft - (e.pageX - rg.offsetLeft - startX) * 1.4;
    });

    /* --- auto-scroll: loop continuously, pause on hover --- */
    let paused = false;
    const speed = 45; /* px per second */

    /* duplicate items so the loop is seamless (clones must not carry AOS attributes, or they stay hidden) */
    const items = [...rg.querySelectorAll('.rg-item')];
    const addSet = () => items.forEach(item => {
      const c = item.cloneNode(true);
      c.removeAttribute('data-aos'); c.removeAttribute('data-aos-delay');
      c.classList.remove('aos-init', 'aos-animate');
      c.setAttribute('aria-hidden', 'true');
      rg.appendChild(c);
    });
    addSet();
    const setWidth = () => rg.children[items.length].offsetLeft - rg.children[0].offsetLeft; /* width of one full set */

    /* Browsers round scrollLeft to whole pixels, so keep the exact position in our own variable */
    let pos = rg.scrollLeft, last = performance.now();
    function autoScroll(now) {
      const dt = Math.min(now - last, 64); last = now;
      const loop = setWidth();
      /* on wide screens one extra set is not enough to reach the jump point, so add more */
      while (loop > 0 && rg.scrollWidth - rg.clientWidth < loop + 2) addSet();
      if (paused || reduced || loop <= 0) {
        pos = rg.scrollLeft;                 /* follow the user while dragging or hovering */
      } else {
        pos += speed * dt / 1000;
        if (pos >= loop) pos -= loop;        /* jump back by exactly one set, so there is no visible jump */
        rg.scrollLeft = pos;
      }
      requestAnimationFrame(autoScroll);
    }

    rg.addEventListener('mouseenter', () => { paused = true; });
    rg.addEventListener('mouseleave', () => { paused = false; });
    rg.addEventListener('touchstart', () => { paused = true; }, { passive: true });
    rg.addEventListener('touchend',   () => { setTimeout(() => { paused = false; }, 2000); });

    requestAnimationFrame(autoScroll);
  }
})();