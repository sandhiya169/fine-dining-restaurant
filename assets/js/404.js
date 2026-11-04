(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Go back (falls back to home if there is no history) ---------- */
  const back = document.getElementById('goBack');
  if (back) back.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  });

  if (!window.gsap || reduced) return;

  /* ---------- One orchestrated entrance ---------- */
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.arch-bg', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'power3.inOut' }, 0)
    .from('.plate .draw', { strokeDashoffset: 1, duration: 1.8, stagger: 0.25, ease: 'power2.inOut' }, 0.2)
    .from('.plate .ring', { opacity: 0, duration: 1.2 }, 0.8)
    .from('.code > *', { yPercent: 70, opacity: 0, duration: 1.3, stagger: 0.18 }, 0.4)
    .from('#lid', { opacity: 0, y: -14, duration: 1 }, 1.2)
    .from('.title .line span', { yPercent: 110, duration: 1.2, stagger: 0.14 }, 1)
    .from('.kicker, .msg, .cta > *, .help', { opacity: 0, y: 20, duration: 1, stagger: 0.1 }, 1.4);

  /* ---------- Cloche lifts now and then: nothing underneath ---------- */
  gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 3.4 })
    .to('#lid', { y: -9, rotation: -9, svgOrigin: '28 62', duration: 0.9, ease: 'power2.out' })
    .to('#lid', { y: 0, rotation: 0, svgOrigin: '28 62', duration: 1, ease: 'power2.inOut' }, '+=1.1');

  /* ---------- Gentle pointer parallax (desktop with a mouse only) ---------- */
  if (matchMedia('(hover: hover) and (min-width: 861px)').matches) {
    const archX = gsap.quickTo('.arch-bg', 'x', { duration: 1.2, ease: 'power3.out' });
    const archY = gsap.quickTo('.arch-bg', 'y', { duration: 1.2, ease: 'power3.out' });
    const codeX = gsap.quickTo('.code', 'x', { duration: 1.2, ease: 'power3.out' });
    const codeY = gsap.quickTo('.code', 'y', { duration: 1.2, ease: 'power3.out' });
    addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      archX(x * -30); archY(y * -20);
      codeX(x * 14);  codeY(y * 10);
    });
  }
})();