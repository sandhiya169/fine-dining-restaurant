(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let heroTL; 
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


  let navT;
  const freezeNav = () => {
    document.documentElement.classList.add('no-nav-anim');
    clearTimeout(navT);
    navT = setTimeout(() => document.documentElement.classList.remove('no-nav-anim'), 250);
  };
  addEventListener('resize', freezeNav, { passive: true });
  addEventListener('orientationchange', freezeNav, { passive: true });

  
  (() => {
    const track = $('#recTrack');
    const original = track && track.querySelector('.rec-list');
    if (!original) return;
    const build = () => {
      track.querySelectorAll('.rec-list[data-clone]').forEach(c => c.remove());
      const w = original.getBoundingClientRect().width;
      if (!w) return;
      const copies = Math.max(1, Math.ceil((innerWidth * 2) / w));
      for (let i = 0; i < copies; i++) {
        const c = original.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('data-clone', '');
        c.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
        track.appendChild(c);
      }
      track.style.setProperty('--rec-shift', `-${w}px`);
    };
    build();
    addEventListener('load', build);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  })();
  gsap.registerPlugin(ScrollTrigger);

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

  
  const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reduced });

  
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); lenis.start(); }
  const goTo = id => lenis.scrollTo(id, { offset: id === '#top' ? 0 : -90 });
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
 
  matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  ScrollTrigger.create({ start: 80, onUpdate: s => nav.classList.toggle('solid', s.scroll() > 80) });


  const items = $$('.post-li'), chips = $$('#chips button'), q = $('#q');
  const result = $('#result'), empty = $('#empty'), moreBtn = $('#moreBtn');
  const STEP = 3;
  let cat = 'all', limit = 6, first = true;
  const matches = () => {
    const term = q.value.trim().toLowerCase();
    return items.filter(li => (cat === 'all' || li.dataset.cat === cat) && (!term || li.textContent.toLowerCase().includes(term)));
  };
  const relayout = () => { lenis.resize(); ScrollTrigger.refresh(); AOS.refresh(); };
  function render(animate = true) {
    const m = matches(), shown = m.slice(0, limit);
    const apply = () => {
      items.forEach(li => { li.hidden = !shown.includes(li); });
      empty.hidden = m.length > 0;
      moreBtn.parentElement.hidden = m.length <= limit;
      result.textContent = m.length ? `Showing ${shown.length} of ${m.length} stories` : '';
      
      shown.forEach(li => { const a = $('.post', li); if (a) a.classList.add('aos-animate'); });
      if (animate && !reduced) gsap.fromTo(shown, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'opacity,transform', onComplete: relayout });
    
      requestAnimationFrame(() => requestAnimationFrame(relayout));
    };
    const out = animate && !reduced ? items.filter(li => !li.hidden) : [];
    out.length ? gsap.to(out, { opacity: 0, y: -10, duration: 0.2, onComplete: () => { gsap.set(out, { clearProps: 'opacity,transform' }); apply(); } }) : apply();
  }
  const setCat = c => {
    cat = c; limit = 6;
    chips.forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === c));
    render();
  };
  chips.forEach(b => b.addEventListener('click', () => setCat(b.dataset.cat)));
  q.addEventListener('input', () => { limit = 6; render(); });
  moreBtn.addEventListener('click', () => { limit += STEP; render(); });
  render(false);


  $$('#topics button').forEach(b => {
    $('.cnt', b).textContent = items.filter(li => li.dataset.cat === b.dataset.cat).length;
    b.addEventListener('click', () => { q.value = ''; setCat(b.dataset.cat); goTo('#journal'); });
  });


  const bq = $('#bigQ');
  if (!reduced) {
    const words = bq.textContent.trim().split(/(\s+)/);
    bq.setAttribute('aria-label', bq.textContent.trim());
    bq.innerHTML = words.map(w => /^\s+$/.test(w) ? w : `<span class="w" aria-hidden="true">${w}</span>`).join('');
    gsap.fromTo('.note-q .w', { opacity: 0.18 }, { opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: bq, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  }

  if (!reduced) {

    heroTL = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true })
      .from('.line span', { yPercent: 110, duration: 1.2, stagger: 0.14 })
      .from('.b-hero-bg', { scale: 1.25, duration: 1.8 }, 0.1)
      .from('.b-hero-visual', { opacity: 0, y: 36, duration: 1.2 }, 0.45)
      .from('.crumbs, .b-kicker, .lead, .hero-cta', { opacity: 0, y: 20, duration: 1, stagger: 0.12 }, 0.7)
      .from('.facts li', { opacity: 0, y: 20, duration: 0.9, stagger: 0.12 }, 1.1);

  
    gsap.to('.b-hero-bg', { yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.b-hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('.feat-img img', { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.feat-img', start: 'top bottom', end: 'bottom top', scrub: true } });
  }


  $('#nlForm').addEventListener('submit', e => {
    e.preventDefault();
    const em = $('#nlEmail'), note = $('#nlNote');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) {
      note.textContent = 'Please enter a valid email address.';
      note.className = 'note nl-note is-error';
      em.focus();
      return;
    }
    note.textContent = '';
    e.target.reset();
    window.location.href = '404.html';
  });
  window.addEventListener('pageshow', () => {
    const f = $('#nlForm');
    if (f) f.reset();
    const n = $('#nlNote');
    if (n) { n.textContent = ''; n.className = 'note nl-note'; }
  });
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