/* Dekorasi Y2K untuk frame: bintang, hati, kancing, pita, kupu-kupu, dll.
   Satu sumber bentuk (path SVG) dipakai untuk tampilan web (SVG) DAN ekspor PNG (Path2D),
   jadi hasil unduhan sama dengan yang terlihat. Semua bentuk dibuat sendiri, bukan salinan karya lain. */
(() => {
  const star = (n, ro, ri) => {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro, a = (-90 + i * 180 / n) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  };
  const circ = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  const HEART = 'M50 92C10 62 2 40 2 27C2 12 14 4 27 4C37 4 46 10 50 20C54 10 63 4 73 4C86 4 98 12 98 27C98 40 90 62 50 92Z';

  const SHAPES = {
    star5:     { d: star(5, 48, 23) },
    burst:     { d: star(14, 48, 37) },
    sparkle:   { d: 'M50 2Q54 46 98 50Q54 54 50 98Q46 54 2 50Q46 46 50 2Z' },
    heart:     { d: HEART },
    button:    { d: circ(50, 50, 46) + circ(39, 39, 5) + circ(61, 39, 5) + circ(39, 61, 5) + circ(61, 61, 5), eo: true },
    heartbtn:  { d: HEART + circ(40, 32, 4.5) + circ(60, 32, 4.5) + circ(40, 48, 4.5) + circ(60, 48, 4.5), eo: true },
    butterfly: { d: 'M50 50C44 20 22 6 10 20C0 34 14 50 38 52C14 56 4 76 18 88C32 98 46 78 50 56C54 78 68 98 82 88C96 76 86 56 62 52C86 50 100 34 90 20C78 6 56 20 50 50Z' + circ(30, 32, 4) + circ(70, 32, 4), eo: true },
    bow:       { d: 'M50 50C40 24 10 10 6 30C2 52 28 66 50 50C72 66 98 52 94 30C90 10 60 24 50 50ZM50 50C44 66 36 88 28 97L40 98L50 72L60 98L72 97C64 88 56 66 50 50Z' }
  };

  // [x%, y%, ukuran% dari lebar, rotasi°] — posisi kiri-atas stiker di dalam bingkai
  const SLOTS = {
    classic: [[3, 66, 15, -12], [82, 70, 13, 10], [4, 38, 10, -8]],
    collage: [[3, 66, 17, -12], [79, 6, 15, 14], [78, 66, 15, 10], [3, 8, 11, -8], [44, 85, 12, 6]],
    booth:   [[-1, 56, 20, -10], [79, 79, 17, 8], [78, 1, 14, 12], [2, 2, 12, -8], [46, 88, 10, 4]]
  };
  // [bentuk, warna 1|2] per slot
  const PACKS = {
    none:    [],
    stars:   [['star5', 1], ['sparkle', 2], ['star5', 2], ['sparkle', 1], ['star5', 1]],
    hearts:  [['heart', 1], ['heart', 2], ['heartbtn', 1], ['heart', 1], ['sparkle', 2]],
    buttons: [['butterfly', 2], ['heartbtn', 2], ['button', 2], ['star5', 1], ['sparkle', 1]],
    bows:    [['bow', 1], ['sparkle', 2], ['star5', 1], ['bow', 2], ['heart', 1]],
    mix:     [['bow', 1], ['star5', 1], ['butterfly', 2], ['sparkle', 2], ['heartbtn', 2]]
  };
  const BIG = { star: 'star5', heart: 'heart', burst: 'burst' };
  const BIG_BOX = [-12, 4, 124, -8]; // x%, y%, lebar%, rotasi

  const LAYOUTS = ['classic', 'collage', 'booth'];
  const DECORS = Object.keys(PACKS);
  const BIGS = ['none', 'star', 'heart', 'burst'];

  function items(F, which) {
    if (which === 'back') {
      const s = BIG[F.big_shape]; if (!s) return [];
      return [{ shape: s, x: BIG_BOX[0], y: BIG_BOX[1], size: BIG_BOX[2], rot: BIG_BOX[3], col: F.deco1, big: true }];
    }
    const slots = SLOTS[F.layout] || SLOTS.classic, pack = PACKS[F.decor] || [];
    return pack.slice(0, slots.length).map(([shape, c], i) => ({ shape, x: slots[i][0], y: slots[i][1], size: slots[i][2], rot: slots[i][3], col: c === 1 ? F.deco1 : F.deco2 }));
  }

  const NS = 'http://www.w3.org/2000/svg';
  function layer(F, which) {
    const list = items(F, which); if (!list.length) return null;
    const box = document.createElement('div');
    box.className = 'decor decor-' + which; box.setAttribute('aria-hidden', 'true');
    for (const it of list) {
      const sh = SHAPES[it.shape]; if (!sh) continue;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'sticker');
      svg.style.left = it.x + '%'; svg.style.top = it.y + '%'; svg.style.width = it.size + '%';
      svg.style.transform = 'rotate(' + it.rot + 'deg)';
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', sh.d); p.setAttribute('fill', it.col); p.setAttribute('stroke', F.border);
      p.setAttribute('stroke-width', it.big ? '1.1' : '3'); p.setAttribute('stroke-linejoin', 'round');
      if (sh.eo) p.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(p); box.appendChild(svg);
    }
    return box;
  }

  // r = {x, y, w, h} area bingkai pada canvas; panggil di dalam clip bingkai.
  function draw(ctx, F, r, which) {
    for (const it of items(F, which)) {
      const sh = SHAPES[it.shape]; if (!sh) continue;
      const size = it.size / 100 * r.w;
      ctx.save();
      ctx.translate(r.x + it.x / 100 * r.w + size / 2, r.y + it.y / 100 * r.h + size / 2);
      ctx.rotate(it.rot * Math.PI / 180); ctx.scale(size / 100, size / 100); ctx.translate(-50, -50);
      const p = new Path2D(sh.d);
      ctx.fillStyle = it.col; ctx.fill(p, sh.eo ? 'evenodd' : 'nonzero');
      ctx.lineWidth = it.big ? 1.1 : 3; ctx.lineJoin = 'round'; ctx.strokeStyle = F.border; ctx.stroke(p);
      ctx.restore();
    }
  }

  window.EFS_DECOR = { SHAPES, LAYOUTS, DECORS, BIGS, layer, draw };
})();
