// Smoke test UI dengan API Supabase PALSU (mock) — menguji logika/render halaman, bukan database asli.
const { chromium } = require('playwright');
const fs = require('fs');
const SB = 'https://dxhuyvvvblcivsmaldcu.supabase.co';
const OUT = process.argv[2];
const UMD = fs.readFileSync('/tmp/sbchk/package/dist/umd/supabase.js');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGOYNm0BVsQwtCQA7NxzAUwYzrgAAAAASUVORK5CYII=', 'base64');
const frames = [['bubble-pop', 'Bubble Pop', '#FA78CF'], ['cyber-grid', 'Cyber Grid', '#C9FF38'], ['chrome-kiss', 'Chrome Kiss', '#84AEF8'], ['sugar-rush', 'Sugar Rush', '#FFE36C'], ['violet-web', 'Violet Web', '#C8A1FF'], ['tangerine', 'Tangerine', '#FF9858'], ['liquid-metal', 'Liquid Metal', '#C8CDD5'], ['cherry-byte', 'Cherry Byte', '#FF5E6C']]
  .map(([id, name, bg], i) => ({ id, name, bg, border: '#17151C', accent: '#17151C', text_color: '#17151C', star: '#FFE36C', shadow: '#17151C', radius: 0, pattern: 'none', sort_order: i + 1, is_active: true, ...([{ layout: 'collage', decor: 'mix', big_shape: 'star', halftone: true, pattern: 'dots', deco1: '#FA78CF', deco2: '#FFFFFF' }, { layout: 'booth', decor: 'buttons', halftone: true, pattern: 'gingham', deco1: '#84AEF8', deco2: '#FFFFFF' }, { layout: 'collage', decor: 'stars', big_shape: 'burst', pattern: 'grid', deco1: '#FFE36C', deco2: '#FA78CF' }, { layout: 'booth', decor: 'bows', pattern: 'checker', deco1: '#FA78CF', deco2: '#FFE36C' }][i] || {}) }));
const people = [['anisa-fatimah', 'Anisa Fatimah', '@nolvless_00', 'Farfalla', 'Living on cloud nine; serene'], ['arjunna', 'Arjunna', '@2007.arj', null, 'Dreams over doubts'], ['leni-vale', 'Leni Vale', '@leni.mp3', null, 'Main character energy'], ['faye-bloom', 'Faye Bloom', '@faye.bloom', null, 'Sweet but offline'], ['ivo-day', 'Ivo Day', '@ivo.day', null, 'A little magic in the margins'], ['jess-melo', 'Jess Melo', '@jess.zip', null, 'Too bright to hide'], ['santi-noor', 'Santi Noor', '@santi.sys', null, 'Future nostalgia'], ['kira-nova', 'Kira Nova', '@kira.exe', null, 'Glitter in the cache']];
let gallery = people.map(([slug, display_name, handle, energy_label, mood_quote], i) => ({ id: '00000000-0000-4000-8000-00000000000' + (i + 1), slug, display_name, handle, energy_label, mood_quote, photo_url: i === 0 ? 'https://photos.test/a.png' : null, profile_url: i === 0 ? 'https://instagram.com/nolvless_00' : (i === 1 ? 'javascript:alert(1)' : null), frame_id: frames[i].id, status: 'published', sort_order: i + 1, created_at: '2026-10-20T10:00:00Z', vote_count: 0, comment_count: 0, voted: false }));
let comments = [];
const ADMIN = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@x.test' };
let signedIn = null, isAdminUser = false; const log = []; const errors = [];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = uid => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: uid, role: 'authenticated', exp: 4102444800, aud: 'authenticated' }) + '.sig';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
const J = (route, body, status = 200, extra = {}) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });

(async () => {
  const browser = await chromium.launch(); const results = [];
  const ok = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail && !cond ? '  -> ' + detail : '')); };

  async function newPage(viewport) {
    const ctx = await browser.newContext({ viewport }); const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/WebSocket|realtime|net::ERR|Failed to load resource/i.test(m.text())) errors.push('console: ' + m.text()); });
    await page.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.hostname === 'cdn.jsdelivr.net') return route.fulfill({ status: 200, contentType: 'application/javascript', body: UMD });
      if (u.hostname.includes('googleapis') || u.hostname.includes('gstatic')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      if (u.hostname === 'photos.test') return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: PNG });
      if (u.hostname !== 'dxhuyvvvblcivsmaldcu.supabase.co') return route.continue();
      const p = u.pathname, m = req.method(), q = u.searchParams; log.push(m + ' ' + p + u.search.slice(0, 90));
      const wantObj = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      const body = req.postData() ? (() => { try { return JSON.parse(req.postData()); } catch { return {}; } })() : {};
      if (p.startsWith('/auth/v1/token')) {
        if (!['right','rightpass'].includes(body.password)) return J(route, { error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
        signedIn = body.email === 'admin@x.test' ? ADMIN : { id: '22222222-2222-4222-8222-222222222222', email: body.email };
        isAdminUser = body.email === 'admin@x.test';
        return J(route, { access_token: jwt(signedIn.id), token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: signedIn.id, aud: 'authenticated', role: 'authenticated', email: signedIn.email, user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } });
      }
      if (p === '/auth/v1/signup' && !body.email) { // login anonim (mode tamu)
        signedIn = { id: '33333333-3333-4333-8333-333333333333', email: null }; isAdminUser = false; log.push('GUEST-SIGNIN');
        return J(route, { access_token: jwt(signedIn.id), token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'rg', user: { id: signedIn.id, aud: 'authenticated', role: 'authenticated', is_anonymous: true, user_metadata: body.data || {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' } });
      }
      if (p.startsWith('/auth/v1/logout')) { signedIn = null; isAdminUser = false; return route.fulfill({ status: 204, headers: cors }); }
      if (p.startsWith('/auth/v1/')) return J(route, {});
      if (p === '/rest/v1/rpc/ef_gallery') return J(route, gallery);
      if (p === '/rest/v1/rpc/ef_ensure_profile') return J(route, { user_id: signedIn && signedIn.id, display_name: 'Tester' });
      if (p === '/rest/v1/ef_settings') return J(route, { id: 1, voting_enabled: true, comments_enabled: true, spotlight_enabled: true, default_sort: 'all', publish_immediately: false, comments_need_approval: false });
      if (p === '/rest/v1/ef_frames') { if (m === 'PATCH') { const id = q.get('id').replace('eq.', ''); const f = frames.find(x => x.id === id); Object.assign(f, body); return J(route, wantObj ? f : [f]); } return J(route, frames); }
      if (p === '/rest/v1/ef_user_profiles') return J(route, wantObj ? { display_name: 'Tester' } : [{ display_name: 'Tester' }]);
      if (p === '/rest/v1/ef_admins') { const rows = isAdminUser && signedIn ? { user_id: signedIn.id } : null; return wantObj ? (rows ? J(route, rows) : J(route, { message: 'none' }, 406)) : J(route, rows ? [rows] : []); }
      if (p === '/rest/v1/ef_comments') {
        if (m === 'POST') { const c = { id: 'c' + (comments.length + 1), body: body.body, status: 'visible', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: signedIn.id, profile_id: body.profile_id, ef_user_profiles: { display_name: 'Tester' } }; comments.unshift(c); gallery.find(g => g.id === body.profile_id).comment_count++; return J(route, wantObj ? c : [c], 201); }
        if (m === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '*/' + comments.length } });
        const pid = (q.get('profile_id') || '').replace('eq.', ''); const rows = pid ? comments.filter(c => c.profile_id === pid) : comments.map(c => ({ ...c, ef_profiles: { display_name: 'X', slug: 'x' } }));
        return J(route, rows, 200, { 'content-range': '0-' + Math.max(0, rows.length - 1) + '/' + rows.length });
      }
      if (p === '/rest/v1/ef_votes') { if (m === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '*/0' } }); if (m === 'POST') { const g = gallery.find(x => x.id === body.profile_id); g.vote_count++; g.voted = true; return route.fulfill({ status: 201, headers: cors }); } if (m === 'DELETE') { const g = gallery.find(x => x.id === q.get('profile_id').replace('eq.', '')); g.vote_count--; g.voted = false; return route.fulfill({ status: 204, headers: cors }); } }
      if (p === '/rest/v1/ef_audit' || p === '/rest/v1/ef_comment_reports') { if (m === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'content-range': '*/0' } }); return J(route, [], 200, { 'content-range': '*/0' }); }
      return J(route, [], 200);
    });
    return page;
  }
  const base = 'http://localhost:8099/index.html';

  // ---------- Desktop, pengunjung ----------
  let page = await newPage({ width: 1366, height: 900 });
  await page.goto(base); await page.waitForSelector('#gallery-track .profile-card');
  ok('galeri: 8 kartu dirender', (await page.locator('#gallery-track .profile-card').count()) === 8);
  ok('galeri: hitungan nyata 01 / 08', (await page.textContent('#gallery-count')).trim() === '01 / 08 PLAYERS');
  ok('teks border asli "Farfalla" tampil, lainnya kosong', (await page.locator('#gallery-track .energy-name').allTextContents()).filter(Boolean).join() === 'Farfalla');
  ok('tidak ada tag ONLINE palsu', (await page.locator('text=ONLINE').count()) === 0);
  ok('foto https dimuat, lainnya placeholder', (await page.locator('#gallery-track .arch img').count()) === 1 && (await page.locator('#gallery-track .no-photo').count()) === 9);
  ok('spotlight: empty-state jujur saat 0 vote', /No votes yet/.test(await page.textContent('#spot-body')));
  ok('tidak ada badge saat 0 vote/komentar', (await page.locator('.tag.fav, .tag.disc, .tag.spot').count()) === 0);
  ok('komentar: empty state', /No comments yet/.test(await page.textContent('#comment-area')));
  ok('frame collection: 8 preset', (await page.locator('#presets .preset').count()) === 8);
  await page.screenshot({ path: OUT + '/desktop-top.png' });
  await page.locator('#profiles').screenshot({ path: OUT + '/desktop-gallery.png' });
  await page.locator('#card').screenshot({ path: OUT + '/desktop-detail.png' });

  // shuffle tidak mengubah urutan tersimpan
  const before = await page.locator('#gallery-track .profile-card').evaluateAll(n => n.map(x => x.dataset.slug).join());
  await page.click('#shuffle'); await page.waitForTimeout(100);
  ok('shuffle: tombol reset muncul', await page.isVisible('#unshuffle'));
  await page.click('#unshuffle');
  ok('reset order: urutan kembali', before === await page.locator('#gallery-track .profile-card').evaluateAll(n => n.map(x => x.dataset.slug).join()));

  // vote tanpa login -> modal tamu (cukup nama)
  page.on('dialog', d => d.accept());
  await page.locator('#gallery-track .vote-btn').first().click();
  ok('vote tanpa login membuka modal nama (mode tamu)', await page.isVisible('.modal-label:has-text("JUST YOUR NAME")'));
  ok('modal tamu menyediakan jalan ke login akun', (await page.locator('.modal button:has-text("I already have an account")').count()) === 1);
  await page.keyboard.press('Escape');
  ok('Escape menutup modal', (await page.locator('.overlay').count()) === 0);
  await page.locator('#gallery-track .vote-btn').first().click();
  await page.fill('.modal input[type=text]', 'Rani'); await page.click('.modal .submit'); await page.waitForTimeout(900);
  ok('tamu: login anonim dibuat dengan nama saja (tanpa email/password)', log.includes('GUEST-SIGNIN'));
  ok('tamu: vote langsung tercatat setelah isi nama', log.some(l => l.startsWith('POST /rest/v1/ef_votes')) && (await page.locator('#gallery-track .vote-btn').first().getAttribute('aria-pressed')) === 'true');
  ok('tamu: header menandai guest', /guest/.test(await page.textContent('#who')));
  gallery[0].vote_count = 0; gallery[0].voted = false; // kembalikan data tiruan agar tes berikutnya tidak terpengaruh
  await page.click('#member-btn'); await page.waitForTimeout(500);
  ok('tamu: bisa keluar (dengan konfirmasi)', (await page.textContent('#member-btn')) === 'Sign in');
  ok('komentar tanpa login: ada kolom nama langsung', (await page.locator('.comment-form input[aria-label="Your name"]').count()) === 1);

  // hash route
  await page.goto(base + '#card/leni-vale'); await page.waitForSelector('#gallery-track .profile-card');
  await page.waitForTimeout(400);
  ok('hash #card/leni-vale memilih kartu', (await page.textContent('#detail h3')).includes('Leni Vale'));

  // ---------- login anggota, vote, komentar + XSS ----------
  await page.click('#member-btn');
  ok('modal login punya tautan Forgot password', (await page.locator('.modal button:has-text("Forgot your password")').count()) === 1);
  await page.click('.modal button:has-text("Forgot your password")');
  ok('Forgot password membuka form reset', (await page.textContent('#modal-title')) === 'Reset your password');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.click('#member-btn'); await page.fill('.modal input[type=email]', 'user@x.test'); await page.fill('#m-pw', 'wrongpass'); await page.click('.modal .submit');
  await page.waitForSelector('.err-line:not(:empty)');
  ok('login salah: pesan umum', /Incorrect email or password/.test(await page.textContent('.err-line')));
  await page.fill('#m-pw', 'rightpass'); await page.click('.modal .submit');
  await page.waitForSelector('#who:not([hidden])');
  ok('login benar: nama tampil, tombol Sign out', (await page.textContent('#who')) === 'Tester' && (await page.textContent('#member-btn')) === 'Sign out');
  await page.locator('#detail .vote-btn').click(); await page.waitForTimeout(700);
  ok('vote tersimpan: hitungan 1 & tombol pressed', (await page.locator('#detail .vote-btn').getAttribute('aria-pressed')) === 'true' && /\b1\b/.test(await page.locator('#detail .vote-btn').textContent()));
  ok('badge COMMUNITY FAVORITE hanya karena data nyata', (await page.locator('#detail .tag.fav').count()) === 1);
  ok('spotlight: peringkat 1 Leni Vale', /Leni Vale/.test(await page.locator('#spot-body .spot-row').first().textContent()));
  await page.locator('#detail .vote-btn').click(); await page.waitForTimeout(700);
  ok('vote bisa dibatalkan', (await page.locator('#detail .vote-btn').getAttribute('aria-pressed')) === 'false');
  const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
  await page.fill('#comment-form textarea', evil); await page.click('#comment-form button[type=submit]'); await page.waitForSelector('.comment');
  ok('XSS: payload tampil sebagai teks', (await page.textContent('.comment-body')) === evil && (await page.locator('.comment-body img, .comment-body script').count()) === 0);
  ok('XSS: tidak ada eksekusi', (await page.evaluate(() => window.__xss)) === undefined);
  ok('komentar milik sendiri punya EDIT/DELETE', (await page.locator('.comment .link-btn').allTextContents()).join() === 'EDIT,DELETE');
  await page.locator('#card').screenshot({ path: OUT + '/desktop-comments.png' });

  // unduh gambar postcard
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#download-look')]);
  ok('unduh PNG postcard berjalan', !!dl && /postcard-.*\.png$/.test(dl.suggestedFilename()), dl ? dl.suggestedFilename() : 'no download');
  if (dl) { await dl.saveAs(OUT + '/exported-postcard.png'); }
  ok('link profil https jadi tautan aman', (await page.locator('#gallery-track a.handle-link').count()) === 1 && /noopener/.test(await page.locator('#gallery-track a.handle-link').first().getAttribute('rel')) && (await page.locator('#gallery-track a.handle-link').first().getAttribute('href')) === 'https://instagram.com/nolvless_00');
  ok('link profil javascript: TIDAK dirender', (await page.locator('a[href^="javascript:"]').count()) === 0);
  ok('bagian About & aturan tampil', (await page.locator('#about .about-card').count()) === 3 && (await page.locator('.site-nav a[href="#about"]').count()) === 1);
  ok('foto grup di hero + daftar 8 anggota di About', (await page.locator('.hero-photo img').count()) === 1 && (await page.locator('.about-members li').count()) === 8);
  ok('pratinjau share (og:image) ada', (await page.locator('meta[property="og:image"]').count()) === 1);
  ok('logo Tim 6 ada di setiap frame', (await page.locator('#gallery-track .profile-card .frame-logo').count()) >= 8);
  ok('stiker Y2K tampil di kartu', (await page.locator('#gallery-track .decor .sticker').count()) >= 8);
  ok('QR kecil ada di setiap kartu galeri', (await page.locator('#gallery-track .profile-card .qr-chip img').count()) >= 8);

  // ---------- Admin: password salah / bukan admin / admin ----------
  await page.click('#member-btn'); // sign out
  await page.waitForTimeout(300);
  await page.click('#admin-btn');
  ok('modal admin: label + judul + tombol', await page.isVisible('.modal-label:has-text("RESTRICTED ACCESS")') && await page.isVisible('h2:has-text("Admin Control")') && await page.isVisible('button:has-text("Unlock Studio")'));
  ok('modal admin: email diminta karena ADMIN_EMAIL kosong', await page.isVisible('.modal input[type=email]'));
  await page.fill('.modal input[type=email]', 'admin@x.test'); await page.fill('#a-pw', 'nope'); await page.click('.modal .submit');
  await page.waitForSelector('.err-line:not(:empty)');
  ok('admin: password salah ditolak (pesan generik)', /Incorrect credentials/.test(await page.textContent('.err-line')));
  await page.fill('.modal input[type=email]', 'member@x.test'); await page.fill('#a-pw', 'right'); await page.click('.modal .submit');
  await page.waitForFunction(() => /Incorrect credentials/.test(document.querySelector('.err-line').textContent));
  ok('admin: akun non-admin ditolak & di-sign-out', log.some(l => l.startsWith('POST /auth/v1/logout')) && !(await page.isVisible('.admin')));
  await page.fill('.modal input[type=email]', 'admin@x.test'); await page.fill('#a-pw', 'right'); await page.click('.modal .submit');
  await page.waitForSelector('.admin'); await page.waitForSelector('.metric');
  ok('admin: panel terbuka setelah verifikasi peran', await page.isVisible('.admin-title:has-text("Admin Control")'));
  ok('admin: 6 tab', (await page.locator('.admin-nav button').count()) === 6);
  ok('overview: angka nyata (8 published, 0 votes)', (await page.locator('.metric b').first().textContent()) === '8');
  await page.screenshot({ path: OUT + '/admin-overview.png' });
  for (const [t, sel] of [['POSTCARDS', 'table.data'], ['COMMENTS', '.toolbar'], ['SETTINGS', '.switch-row'], ['ACTIVITY', '.pager, .empty']]) {
    await page.click('.admin-nav button:has-text("' + t + '")'); await page.waitForSelector('.admin-main ' + sel.split(',')[0].trim(), { timeout: 4000 }).catch(() => {});
    ok('admin tab ' + t + ' dirender', await page.locator('.admin-main ' + sel.split(',')[0].trim()).count() > 0);
    if (t === 'POSTCARDS') await page.screenshot({ path: OUT + '/admin-postcards.png' });
    if (t === 'SETTINGS') await page.screenshot({ path: OUT + '/admin-settings.png' });
  }
  // Frame Studio
  await page.click('.admin-nav button:has-text("FRAME STUDIO")'); await page.waitForSelector('.studio .color-row');
  ok('studio: 8 kontrol warna + hex', (await page.locator('.color-row').count()) === 8);
  ok('studio: Save nonaktif sebelum ada perubahan', await page.locator('button:has-text("SAVE CHANGES")').isDisabled());
  await page.locator('.color-row').nth(1).locator('input[type=text]').fill('#84AEF8');
  ok('studio: Save aktif setelah warna border diubah (draft)', await page.locator('button:has-text("SAVE CHANGES")').isEnabled());
  ok('studio: tidak ada PATCH sebelum klik Save', !log.some(l => l.startsWith('PATCH /rest/v1/ef_frames')));
  await page.locator('.color-row').nth(1).locator('input[type=text]').fill('red;background:url(x)');
  ok('studio: hex tidak valid menonaktifkan Save + ditandai', await page.locator('button:has-text("SAVE CHANGES")').isDisabled() && (await page.locator('.color-row input.bad').count()) === 1);
  await page.locator('.color-row').nth(1).locator('input[type=text]').fill('#84AEF8');
  await page.screenshot({ path: OUT + '/admin-studio.png' });
  let patchBody = null; page.on('request', r => { if (r.method() === 'PATCH' && r.url().includes('ef_frames')) patchBody = r.postData(); });
  await page.click('button:has-text("SAVE CHANGES")'); await page.waitForTimeout(800);
  ok('studio: PATCH hanya berisi kolom yang berubah', patchBody && JSON.stringify(Object.keys(JSON.parse(patchBody))) === '["border"]', patchBody);
  await page.click('button:has-text("DUPLICATE FRAME")'); await page.waitForTimeout(500);
  ok('studio: duplicate mengirim INSERT frame baru', log.some(l => l.startsWith('POST /rest/v1/ef_frames')));
  // ---- drag stiker (mode edit layout) ----
  await page.click('button:has-text("EDIT LAYOUT")'); await page.waitForTimeout(300);
  const st0 = page.locator('.preview-stage .decor-front .sticker').first();
  ok('edit layout: stiker bisa dipegang (editable)', (await st0.getAttribute('class')).includes('editable'));
  const posBefore = await st0.evaluate(el => el.style.left + '|' + el.style.top);
  await st0.scrollIntoViewIfNeeded(); const bb = await st0.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 40, bb.y + bb.height / 2 + 25, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
  const posAfter = await page.locator('.preview-stage .decor-front .sticker').first().evaluate(el => el.style.left + '|' + el.style.top);
  ok('edit layout: drag memindahkan stiker', posBefore !== posAfter, posBefore + ' -> ' + posAfter);
  ok('edit layout: Save aktif setelah drag (draft)', await page.locator('button:has-text("SAVE CHANGES")').isEnabled());
  await page.locator('.edit-panel input[aria-label="Size"]').fill('30'); await page.waitForTimeout(200);
  await page.locator('.preview-stage .decor-front .sticker').first().focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  patchBody = null; await page.click('button:has-text("SAVE CHANGES")'); await page.waitForTimeout(800);
  let pj = null; try { pj = JSON.parse(patchBody); } catch (e) { /* noop */ }
  ok('edit layout: PATCH membawa custom posisi stiker', pj && pj.custom && pj.custom.s0 && typeof pj.custom.s0.x === 'number' && pj.custom.s0.size === 30, patchBody);
  await page.screenshot({ path: OUT + '/admin-edit.png' });
  await page.click('button:has-text("DONE")'); await page.waitForTimeout(200);
  await page.click('button:has-text("LOG OUT")'); await page.waitForTimeout(500);
  ok('logout admin menutup panel', (await page.locator('.admin').count()) === 0);

  // ---------- Mobile ----------
  const mp = await newPage({ width: 390, height: 844 }); await mp.goto(base); await mp.waitForSelector('#gallery-track .profile-card');
  ok('mobile: tidak ada scroll horizontal halaman', await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), await mp.evaluate(() => document.documentElement.scrollWidth + '>' + window.innerWidth));
  await mp.screenshot({ path: OUT + '/mobile-top.png' });
  await mp.locator('#profiles').screenshot({ path: OUT + '/mobile-gallery.png' });
  await mp.locator('#card').screenshot({ path: OUT + '/mobile-detail.png' });
  await mp.locator('#frames').screenshot({ path: OUT + '/mobile-frames.png' });
  await mp.click('#admin-btn'); await mp.screenshot({ path: OUT + '/mobile-admin-modal.png' });

  ok('tidak ada error JS/console tak terduga', errors.length === 0, errors.slice(0, 5).join(' | '));
  fs.writeFileSync(OUT + '/ui-results.json', JSON.stringify({ results, errors, requests: log.length }, null, 1));
  console.log('\nTOTAL', results.length, 'FAIL', results.filter(r => !r.ok).length);
  await browser.close();
})();
