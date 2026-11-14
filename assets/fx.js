/* Animasi landing page: judul per huruf, parallax kursor, marquee, reveal saat scroll, progress bar. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mk = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

  // judul: pecah per huruf (teks tetap terbaca screen reader lewat aria-label)
  const h1 = $('#hero-title');
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    $$('span,em', h1).forEach(line => {
      const txt = line.textContent; line.textContent = '';
      txt.split(' ').forEach((w, wi, arr) => {
        const word = mk('span', null); word.style.cssText = 'display:inline-block;white-space:nowrap'; word.setAttribute('aria-hidden', 'true');
        [...w].forEach(c => { const s = mk('span', 'ch', c); s.style.setProperty('--i', i++); word.append(s); });
        line.append(word); if (wi < arr.length - 1) line.append(document.createTextNode(' '));
      });
    });
  }
  root.classList.add('fx');

  const hero = $('.hero');
  if (hero) {
    // blob warna
    ['b1', 'b2', 'b3'].forEach(c => hero.prepend(mk('span', 'fx-blob ' + c)));
    // stiker melayang
    const FL = ['✦', '✳', '♥', '✧', '★', '✿'], COL = ['var(--pink)', 'var(--violet)', 'var(--orange)', 'var(--blue)', 'var(--yellow)', 'var(--red)'];
    for (let k = 0; k < 9; k++) {
      const f = mk('span', 'fx-float', FL[k % FL.length]); f.setAttribute('aria-hidden', 'true');
      f.style.cssText = `left:${6 + (k * 11) % 88}%;top:${12 + (k * 23) % 70}%;--s:${20 + (k * 7) % 22}px;--c:${COL[k % COL.length]};--t:${7 + (k * 3) % 6}s;--dl:${-k}s;--dx:${(k % 2 ? 1 : -1) * (20 + k * 4)}px`;
      hero.append(f);
    }
    // parallax kursor
    const photo = $('.hero-photo', hero);
    if (photo && matchMedia('(hover:hover) and (min-width:901px)').matches) {
      let raf = 0;
      hero.addEventListener('pointermove', e => {
        if (raf) return; raf = requestAnimationFrame(() => {
          raf = 0; const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          photo.style.setProperty('--px', (x * -22).toFixed(1) + 'px'); photo.style.setProperty('--py', (y * -16).toFixed(1) + 'px');
          $$('.fx-float', hero).forEach((f, i) => { f.style.translate = (x * (14 + i * 4)).toFixed(1) + 'px ' + (y * (10 + i * 3)).toFixed(1) + 'px'; });
        });
      });
      hero.addEventListener('pointerleave', () => { photo.style.setProperty('--px', '0px'); photo.style.setProperty('--py', '0px'); });
    }
    // marquee
    const mq = mk('div', 'fx-marquee'); mq.setAttribute('aria-hidden', 'true');
    const line = ['ETHICS FRAME STUDIO', 'TIM 6', 'DIFFERENT PATH, SAME DREAM', 'ETIKA ADMINISTRASI DAN KEPEGAWAIAN', 'VOTE · COMMENT · SHARE'].map(t => t + '  ✦  ').join('');
    const inner = mk('div', null, line + line + line + line); mq.append(inner);
    hero.after(mq);
  }

  // progress scroll
  const bar = mk('div'); bar.id = 'fx-progress'; document.body.append(bar);
  let tick = false;
  const upd = () => { tick = false; const h = root.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')'; };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true }); upd();

  // reveal saat scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('main > section:not(.hero) .page-width > *, .site-footer .page-width > *').forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--rd', (i % 3) * .08 + 's'); io.observe(el); });
    // jaga-jaga: jangan sembunyikan permanen
    setTimeout(() => $$('.rv:not(.in)').forEach(e => { const r = e.getBoundingClientRect(); if (r.top < innerHeight) e.classList.add('in'); }), 2500);
  }
})();
