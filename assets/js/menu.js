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
  AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reduced });

  /* Header: menu, active link, solid-on-scroll */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu'), bar = $('#menuBar');
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); lenis.start(); }
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

  /* Keep the sticky menu bar directly under the header as the header shrinks */
  const setNavH = () => {
    document.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
    document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px');
  };
  new ResizeObserver(setNavH).observe(nav); new ResizeObserver(setNavH).observe(bar); setNavH();
  const offset = () => -(nav.offsetHeight + (getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0) + 10);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault(); closeMenu(); lenis.scrollTo(id, { offset: id === '#top' ? 0 : offset() });
  }));

  /* Scroll-spy for the section links */
  const links = $$('#cats a');
  const setActive = id => links.forEach(l => {
    const on = l.getAttribute('href') === '#' + id;
    l.classList.toggle('on', on);
    if (on) { const c = $('#cats'); c.scrollTo({ left: l.offsetLeft - 24, behavior: reduced ? 'auto' : 'smooth' }); }
  });
  links.forEach(l => {
    const sec = $(l.getAttribute('href'));
    ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: s => s.isActive && setActive(sec.id) });
  });
  ScrollTrigger.create({ trigger: '.m-hero', start: 'top top', end: 'bottom 45%', onToggle: s => s.isActive && links.forEach(l => l.classList.remove('on')) });

  /* Tasting menu: progress thread, active course and live course counter */
  const tList = $('#courseList');
  if (tList) {
    const courses = $$('.course', tList), tNow = $('#tNow'), tNowBar = $('.t-now-bar');
    let shown = 1;
    tList.classList.add('spy');
    const updateTasting = () => {
      const line = innerHeight * 0.6, box = tList.getBoundingClientRect();
      let count = 0;
      courses.forEach(c => {
        const r = c.getBoundingClientRect();
        const done = r.bottom <= line, on = r.top <= line && r.bottom > line;
        c.classList.toggle('is-done', done);
        c.classList.toggle('is-on', on);
        if (done || on) count++;
      });
      tList.style.setProperty('--prog', Math.min(1, Math.max(0, (line - box.top) / box.height)).toFixed(4));
      if (tNowBar) tNowBar.style.setProperty('--tp', (count / courses.length).toFixed(3));
      const n = Math.max(1, count);
      if (tNow && n !== shown) {
        shown = n;
        tNow.textContent = String(n).padStart(2, '0');
        if (!reduced) gsap.fromTo(tNow, { yPercent: -35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: true });
      }
    };
    ScrollTrigger.create({ trigger: tList, start: 'top bottom', end: 'bottom top', onUpdate: updateTasting, onRefresh: updateTasting });
    updateTasting();
  }

  /* Today's date on the menu card */
  const now = new Date();
  const todayEl = $('#today');
  if (todayEl) todayEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  /* Diet filter: dims dishes that do not match */
  const dishes = $$('.dish'), note = $('#filterNote'), btns = $$('[data-filter]');
  btns.forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const f = b.dataset.filter;
    btns.forEach(x => x.setAttribute('aria-pressed', x.dataset.filter === f));
    let n = 0;
    dishes.forEach(d => {
      const ok = f === 'all' || d.dataset.diet.split(' ').includes(f);
      d.classList.toggle('dim', !ok);
      if (ok) n++;
    });
    if (note) note.textContent = f === 'all' ? 'Showing every dish.' : `${n} dishes match your choice.`;
  }));

  /* Accordion */
  const faq = $$('.faq-item');
  const toggle = (item, open) => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
    item.classList.toggle('is-open', open);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  faq.forEach(item => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.addEventListener('click', e => {
      e.preventDefault();
      const open = q.getAttribute('aria-expanded') !== 'true';
      faq.forEach(i => i !== item && toggle(i, false));
      toggle(item, open);
    });
  });
  if (faq.length > 0) {
    toggle(faq[0], true);
  }

  if (!reduced) {
    /* Hero: lines rise, the photo scales in, the menu card drops onto the table */
    heroTL = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true })
      .from('.line span', { yPercent: 110, duration: 1.2, stagger: 0.14 })
      .from('.m-hero-bg', { scale: 1.25, duration: 1.8 }, 0.1)
      .from('.m-hero-visual', { opacity: 0, y: 36, duration: 1.2 }, 0.45)
      .from('.crumbs, .m-kicker, .lead, .hero-cta', { opacity: 0, y: 20, duration: 1, stagger: 0.12 }, 0.7)
      .from('#paper', { y: -120, rotation: -8, opacity: 0, duration: 1.4, ease: 'bounce.out' }, 0.85)
      .from('.facts li', { opacity: 0, y: 20, duration: 0.9, stagger: 0.12 }, 1.1);

    /* Hero photo drifts on scroll */
    gsap.to('.m-hero-bg', { yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.m-hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* Courses and dishes arrive in order; leader lines draw across */
    gsap.set('.course, .entry', { opacity: 0, y: 28 });
    ScrollTrigger.batch('.course, .entry', { start: 'top 90%', once: true,
      onEnter: b => gsap.to(b, { opacity: 1, y: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', clearProps: 'opacity,transform' }) });
    $$('.ll').forEach(l => gsap.from(l, { scaleX: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: l, start: 'top 92%', once: true } }));
  }

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
})();