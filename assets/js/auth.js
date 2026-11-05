(() => {
  'use strict';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.AOS) AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 80, disable: reducedMotion });

  const f = document.getElementById('auth');
  if (!f) return;
  const signup = f.dataset.mode === 'signup';


  const rules = {
    name: v => v.trim().length < 2 ? 'Enter your full name.' : '',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.',
    password: v => signup
      ? (v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Use 8+ characters with a letter and a number.' : '')
      : (v.length < 8 ? 'Password must be at least 8 characters.' : ''),
    confirm: v => v !== f.elements.password.value ? 'Passwords do not match.' : ''
  };
  const check = el => {
    const msg = rules[el.name](el.value), box = el.closest('.f');
    box.classList.toggle('bad', !!msg);
    box.querySelector('.err').textContent = msg;
    return !msg;
  };
  const fields = [...f.querySelectorAll('.f input')];
  fields.forEach(el => {
    el.addEventListener('blur', () => el.value && check(el));
    el.addEventListener('input', () => el.closest('.f').classList.contains('bad') && check(el));
  });

  f.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => {
    const i = b.previousElementSibling, show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.firstElementChild.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }));

  f.addEventListener('submit', e => {
    e.preventDefault();
    const ok = fields.map(check).every(Boolean);
    const t = f.elements.terms;
    const tOk = !t || t.checked;
    if (t) f.querySelector('.terms-err').textContent = tOk ? '' : 'Please accept the terms to continue.';
    const note = f.querySelector('.note');
    if (!ok || !tOk) { note.textContent = ''; return; }

    const email = f.elements.email.value.trim(), role = f.elements.role.value;
    note.textContent = signup ? 'Account created. Taking you to sign in…' : 'Signed in. Opening your dashboard…';
    f.reset();

    const to = signup ? 'login.html'
      : (role === 'admin' ? 'admin-dashboard.html' : 'customer-dashboard.html') + '?email=' + encodeURIComponent(email);
    setTimeout(() => { location.href = to; }, 1300);
  });
})();
