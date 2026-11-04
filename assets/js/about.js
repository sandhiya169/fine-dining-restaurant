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

  preDone.then(() => {
    AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reduced });
    AOS.refresh();
  });

  /* Header: menu, active link, solid-on-scroll */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); lenis.start(); }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault(); closeMenu(); lenis.scrollTo(id, { offset: -90 });
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

  /* Timeline items light up as the drawn line reaches them */
  const items = $$('.tl-item');
  if (reduced) {
    gsap.set('.tl-line i', { scaleY: 1 });
    items.forEach(i => i.classList.add('on'));
  } else {
    gsap.to('.tl-line i', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#tl', start: 'top 70%', end: 'bottom 70%', scrub: true }
    });
    items.forEach(i => ScrollTrigger.create({
      trigger: i, start: 'top 70%',
      onEnter: () => i.classList.add('on'), onLeaveBack: () => i.classList.remove('on')
    }));
  }

  if (!reduced) {
    /* Hero entrance: one orchestrated moment */
    heroTL = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true })
      .from('.line span', { yPercent: 110, duration: 1.3, stagger: 0.14 })
      .from('#duoBig', { clipPath: 'inset(100% 0 0 0)', duration: 1.5, ease: 'power3.inOut' }, 0.1)
      .from('#duoBig img', { scale: 1.35, duration: 1.8 }, 0.1)
      .from('.duo .round', { scale: 0, duration: 1, ease: 'back.out(1.6)' }, 1)
      .from('.crumbs, .lead, .hero-cta, .hero-facts, .a-rail', { opacity: 0, y: 20, duration: 1, stagger: 0.1 }, 0.8);

    /* Seal spins with scroll; hero image drifts */
    gsap.to('#seal', { rotation: 360, ease: 'none', transformOrigin: '50% 50%',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.5 } });
    gsap.to('#duoBig img', { yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.a-hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* Timeline photos: the frame stays, the picture opens inside it and drifts as you scroll */
    $$('.tl-img').forEach(f => {
      const img = $('img', f);
      gsap.from(img, { clipPath: 'inset(100% 0 0 0)', duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
      gsap.fromTo(img, { yPercent: -6, scale: 1.15 }, { yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Distance bars grow from the kitchen outward */
    gsap.from('.gbar i', { scaleX: 0, transformOrigin: 'left', duration: 1.4, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '#growers', start: 'top 80%', once: true } });

    /* Room photos open like curtains, then drift inside their frames */
    $$('.room-grid figure').forEach(f => {
      gsap.from(f, { clipPath: 'inset(100% 0 0 0)', duration: 1.3, ease: 'power3.inOut',
        scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
      gsap.fromTo($('img', f), { yPercent: -7, scale: 1.15 }, { yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* Count-up stats */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: reduced ? 0 : 2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }) });
  });

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

  addEventListener('load', () => { ScrollTrigger.refresh(); preDone.then(() => AOS.refresh()); });
})();