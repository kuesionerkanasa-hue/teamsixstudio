/* ETHICS FRAME STUDIO — situs publik + autentikasi anggota.
   Semua teks dari database dirender lewat textContent (tidak ada innerHTML dengan data pengguna). */
(() => {
'use strict';
const CFG = window.EFS_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(2, '0');

/* ---------- helpers ---------- */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'attrs') for (const [a, av] of Object.entries(v)) { if (av != null) el.setAttribute(a, av); }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'object') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v, fb) => (typeof v === 'string' && HEX.test(v)) ? v : fb;
const SLUG = /^[a-z0-9-]{2,60}$/;
const DEF_FRAME = { bg: '#FA78CF', border: '#17151C', accent: '#17151C', text_color: '#17151C', star: '#FFE36C', shadow: '#17151C', radius: 0, pattern: 'none' };
const PATTERNS = ['none', 'grid', 'dots', 'stripes'];

function normFrame(f) {
  f = f || {};
  return {
    id: f.id, name: f.name || 'Frame',
    bg: safeHex(f.bg, DEF_FRAME.bg), border: safeHex(f.border, DEF_FRAME.border),
    accent: safeHex(f.accent, DEF_FRAME.accent), text_color: safeHex(f.text_color, DEF_FRAME.text_color),
    star: safeHex(f.star, DEF_FRAME.star), shadow: safeHex(f.shadow, DEF_FRAME.shadow),
    radius: Math.min(32, Math.max(0, parseInt(f.radius, 10) || 0)),
    pattern: PATTERNS.includes(f.pattern) ? f.pattern : 'none'
  };
}
function applyFrame(el, frame) {
  const f = normFrame(frame);
  el.style.setProperty('--bg', f.bg); el.style.setProperty('--bd', f.border);
  el.style.setProperty('--ac', f.accent); el.style.setProperty('--tx', f.text_color);
  el.style.setProperty('--st', f.star); el.style.setProperty('--sh', f.shadow);
  el.style.setProperty('--rad', f.radius + 'px');
  return f;
}
const httpsUrl = u => (typeof u === 'string' && /^https:\/\//i.test(u)) ? u : null;

function timeAgo(iso) {
  const d = new Date(iso), s = Math.round((Date.now() - d) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(-Math.round(s / sec), u);
  return 'just now';
}
const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

function toast(msg, isErr) {
  const t = h('div', { class: 'toast' + (isErr ? ' err' : ''), text: msg, attrs: { role: isErr ? 'alert' : 'status' } });
  $('#toasts').append(t);
  setTimeout(() => t.remove(), isErr ? 7000 : 4200);
}
function errMsg(e) {
  if (!e) return 'Something went wrong.';
  const m = e.message || String(e);
  if (e.code === '42501' || /row-level security|permission denied/i.test(m)) return 'This action is not allowed right now.';
  if (e.code === '23505') return 'That was already saved.';
  if (/Too many comments/i.test(m)) return 'Too many comments — please wait a moment.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Network problem. Please check your connection.';
  return m;
}

/* ---------- supabase ---------- */
if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) {
  $('#banner').hidden = false;
  $('#banner').textContent = 'Supabase client failed to load. Check assets/config.js and your connection.';
  return;
}
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const state = {
  settings: { voting_enabled: true, comments_enabled: true, spotlight_enabled: true, default_sort: 'all', publish_immediately: false, comments_need_approval: false },
  frames: new Map(), cards: [], order: null, shuffled: false,
  selectedSlug: null, tryFrameId: null, spotTab: 'votes',
  user: null, myName: null, isAdmin: false, dbReady: true,
  comments: [], commentsDone: false, commentsLoading: false, commentsFor: null
};
const EFS = window.EFS = { sb, state, h, $, pad, toast, errMsg, safeHex, normFrame, applyFrame, httpsUrl, timeAgo, fmtDate, DEF_FRAME, PATTERNS, SLUG, CFG };

const frameOf = id => state.frames.get(id) || normFrame(null);
const cardBySlug = s => state.cards.find(c => c.slug === s);
const selected = () => cardBySlug(state.selectedSlug) || state.cards[0] || null;

/* ---------- data ---------- */
async function loadAll() {
  const [s, f, g] = await Promise.all([
    sb.from('ef_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('ef_frames').select('*').order('sort_order').order('name'),
    sb.rpc('ef_gallery')
  ]);
  const bad = [s, f, g].find(r => r.error);
  if (bad) {
    state.dbReady = false;
    const missing = ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(bad.error.code);
    showBanner(missing
      ? 'Database not set up yet: run sql/01_schema.sql in the Supabase SQL Editor, then reload.'
      : 'Could not load data: ' + errMsg(bad.error));
    return false;
  }
  state.dbReady = true; hideBanner();
  if (s.data) state.settings = { ...state.settings, ...s.data };
  state.frames = new Map((f.data || []).map(x => [x.id, normFrame(x)]));
  state.cards = (g.data || []).filter(c => c.status === 'published').map(c => ({ ...c, vote_count: Number(c.vote_count), comment_count: Number(c.comment_count) }));
  return true;
}
async function refreshGallery() {
  const g = await sb.rpc('ef_gallery');
  if (g.error) return;
  state.cards = (g.data || []).filter(c => c.status === 'published').map(c => ({ ...c, vote_count: Number(c.vote_count), comment_count: Number(c.comment_count) }));
  if (state.selectedSlug && !cardBySlug(state.selectedSlug)) state.selectedSlug = state.cards.length ? orderedCards()[0].slug : null;
  renderGallery(true); renderSpotlight(); renderDetailMeta(); renderShowcase();
}
let rgTimer; const refreshSoon = () => { clearTimeout(rgTimer); rgTimer = setTimeout(refreshGallery, 500); };
function showBanner(t) { const b = $('#banner'); b.textContent = t; b.hidden = false; }
function hideBanner() { $('#banner').hidden = true; }

/* ---------- auth ---------- */
async function afterSignIn(user) {
  state.user = user; state.isAdmin = false; state.myName = null;
  if (!user) { renderAuthUi(); return; }
  try {
    const { data: p } = await sb.from('ef_user_profiles').select('display_name').eq('user_id', user.id).maybeSingle();
    if (p) state.myName = p.display_name;
    else {
      const nm = (user.user_metadata && user.user_metadata.display_name) || '';
      const r = await sb.rpc('ef_ensure_profile', { p_name: nm });
      if (!r.error && r.data) state.myName = r.data.display_name;
    }
    const a = await sb.from('ef_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    state.isAdmin = !!(a.data && a.data.user_id === user.id);
  } catch (e) { /* tetap sebagai pengunjung */ }
  renderAuthUi();
  if (state.cards.length) { await refreshGallery(); loadComments(true); }
}
function renderAuthUi() {
  const who = $('#who'), mb = $('#member-btn');
  if (state.user) {
    who.hidden = false; who.textContent = state.myName || 'Member';
    mb.textContent = 'Sign out';
  } else { who.hidden = true; mb.textContent = 'Sign in'; }
  renderDetailMeta(); renderCommentForm();
}

/* ---------- modal ---------- */
let modalPrev = null;
function openModal(node) {
  closeModal(true);
  modalPrev = document.activeElement;
  const ov = h('div', { class: 'overlay', on: { mousedown: e => { if (e.target === ov) closeModal(); } } }, node);
  modalKey = e => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const f = [...ov.querySelectorAll('button,input,select,textarea,a[href]')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', modalKey);
  $('#modal-root').append(ov);
  document.body.classList.add('no-scroll');
  const first = [...ov.querySelectorAll('input,button.submit')].find(x => x.offsetParent !== null); if (first) first.focus();
  return ov;
}
let modalKey = null;
function closeModal(silent) {
  if (modalKey) { document.removeEventListener('keydown', modalKey); modalKey = null; }
  const r = $('#modal-root'); r.replaceChildren();
  if (!$('#admin-root').childElementCount) document.body.classList.remove('no-scroll');
  if (!silent && modalPrev && modalPrev.focus) modalPrev.focus();
}
function pwField(id, label, autocomplete) {
  const input = h('input', { id, type: 'password', required: true, autocomplete, attrs: { minlength: 8 } });
  const tog = h('button', { type: 'button', text: 'SHOW', attrs: { 'aria-label': 'Show password', 'aria-pressed': 'false' },
    on: { click: () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; tog.textContent = show ? 'HIDE' : 'SHOW'; tog.setAttribute('aria-pressed', String(show)); tog.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); } } });
  return { input, node: h('label', { class: 'field' }, h('span', { text: label }), h('div', { class: 'pw' }, input, tog)) };
}
function modalShell(label, title, lead, ...body) {
  return h('div', { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' } },
    h('button', { class: 'circle-button close', type: 'button', text: '×', attrs: { 'aria-label': 'Close' }, on: { click: () => closeModal() } }),
    h('span', { class: 'modal-label', text: label }),
    h('h2', { id: 'modal-title', text: title }),
    lead ? h('p', { class: 'lead', text: lead }) : null, ...body);
}

function openMemberModal(reason) {
  let mode = 'in';
  const err = h('p', { class: 'err-line', attrs: { role: 'alert' } });
  const name = h('input', { type: 'text', maxLength: 40, autocomplete: 'nickname' });
  const nameF = h('label', { class: 'field', hidden: true }, h('span', { text: 'DISPLAY NAME (SHOWN PUBLICLY)' }), name);
  const email = h('input', { type: 'email', required: true, autocomplete: 'email' });
  const pw = pwField('m-pw', 'PASSWORD (MIN. 8 CHARACTERS)', 'current-password');
  const submit = h('button', { class: 'submit', type: 'submit' }, h('span', { text: 'Sign in' }), h('span', { text: '→' }));
  const sw = h('button', { class: 'link-btn', type: 'button' });
  const lead = h('p', { class: 'lead' });
  const title = h('h2', { id: 'modal-title' });
  const setMode = m => {
    mode = m; err.textContent = ''; err.classList.remove('ok-line');
    nameF.hidden = m === 'in'; name.required = m === 'up';
    pw.input.autocomplete = m === 'in' ? 'current-password' : 'new-password';
    submit.firstChild.textContent = m === 'in' ? 'Sign in' : 'Create account';
    title.textContent = m === 'in' ? 'Welcome back' : 'Join the studio';
    lead.textContent = reason || (m === 'in' ? 'Sign in to vote and comment.' : 'Create an account to vote and comment. Your email is never shown publicly.');
    sw.textContent = m === 'in' ? 'No account yet? Create one' : 'Already have an account? Sign in';
  };
  sw.addEventListener('click', () => setMode(mode === 'in' ? 'up' : 'in'));
  const form = h('form', { on: { submit: async e => {
    e.preventDefault(); err.textContent = ''; err.classList.remove('ok-line');
    submit.disabled = true; submit.firstChild.textContent = 'Please wait…';
    try {
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pw.input.value });
        if (error) throw error;
        closeModal(); toast('Signed in.');
      } else {
        const dn = name.value.trim();
        if (!dn) throw new Error('Please enter a display name.');
        const { data, error } = await sb.auth.signUp({ email: email.value.trim(), password: pw.input.value,
          options: { data: { display_name: dn }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (data.session) { closeModal(); toast('Account created.'); }
        else { setMode('in'); err.classList.add('ok-line'); err.textContent = 'Check your email to confirm your account, then sign in.'; }
      }
    } catch (ex) {
      err.textContent = /Invalid login/i.test(ex.message || '') ? 'Incorrect email or password.' : errMsg(ex);
    } finally { submit.disabled = false; submit.firstChild.textContent = mode === 'in' ? 'Sign in' : 'Create account'; }
  } } }, nameF, h('label', { class: 'field' }, h('span', { text: 'EMAIL' }), email), pw.node, err, submit);
  const shell = h('div', { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' } },
    h('button', { class: 'circle-button close', type: 'button', text: '×', attrs: { 'aria-label': 'Close' }, on: { click: () => closeModal() } }),
    h('span', { class: 'modal-label', text: 'MEMBER ACCESS' }), title, lead, form, h('p', { class: 'switch' }, sw));
  setMode('in');
  openModal(shell);
}

function openAdminModal() {
  const err = h('p', { class: 'err-line', attrs: { role: 'alert' } });
  const emailInput = h('input', { type: 'email', required: true, autocomplete: 'username' });
  const emailF = h('label', { class: 'field', hidden: !!CFG.ADMIN_EMAIL }, h('span', { text: 'ADMIN EMAIL' }), emailInput);
  const pw = pwField('a-pw', 'PASSWORD', 'current-password');
  pw.input.removeAttribute('minlength');
  const submit = h('button', { class: 'submit', type: 'submit' }, h('span', { text: 'Unlock Studio' }), h('span', { text: '→' }));
  const form = h('form', { on: { submit: async e => {
    e.preventDefault(); err.textContent = '';
    submit.disabled = true; submit.firstChild.textContent = 'Checking…';
    try {
      const email = (CFG.ADMIN_EMAIL || emailInput.value).trim();
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw.input.value });
      if (error) throw new Error('denied');
      // Verifikasi peran admin di database, bukan dari metadata/variabel klien
      const a = await sb.from('ef_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (a.error || !a.data) { await sb.auth.signOut(); throw new Error('denied'); }
      closeModal(true);
      await afterSignIn(data.user);
      EFS.admin.open();
    } catch (ex) {
      err.textContent = 'Incorrect credentials, or this account has no admin access.';
      pw.input.value = '';
    } finally { submit.disabled = false; submit.firstChild.textContent = 'Unlock Studio'; }
  } } }, emailF, pw.node, err, submit);
  openModal(modalShell('RESTRICTED ACCESS', 'Admin Control', 'Manage the studio, frames, and community.', form));
}

/* ---------- QR code (dibuat di browser; tanpa layanan luar) ---------- */
function cardUrl(card) {
  const base = ((window.EFS_CONFIG && window.EFS_CONFIG.SITE_URL) || '').trim() || (location.origin + location.pathname);
  return base + '#card/' + card.slug;
}
const _qrCache = {};
let _qrLoading = null;
function ensureQr() { // muat qr.js sendiri bila index.html lama (cache) belum memuatnya
  if (window.qrcode) return Promise.resolve(true);
  if (!_qrLoading) _qrLoading = new Promise(res => {
    const sc = document.createElement('script'); sc.src = 'assets/qr.js?v=3';
    sc.onload = () => res(!!window.qrcode); sc.onerror = () => res(false); document.head.appendChild(sc);
  });
  return _qrLoading;
}
if (!window.qrcode) ensureQr().then(ok => { if (ok && window.EFS && EFS.renderAll) { try { EFS.renderAll(); } catch (e) { /* noop */ } } });
function qrFor(url) {
  if (!_qrCache[url]) { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); _qrCache[url] = q; }
  return _qrCache[url];
}
function qrChip(card) {
  try {
    const url = cardUrl(card), q = qrFor(url);
    return h('a', { class: 'qr-chip', href: url, title: 'Scan to open this postcard', attrs: { 'aria-label': 'QR code linking to the postcard of ' + card.display_name },
      on: { click: e => e.stopPropagation() } },
      h('img', { src: q.createDataURL(4, 0), alt: '', width: 52, height: 52 }));
  } catch (e) { return null; }
}
function drawQr(x, url, px, py, size) {
  const q = qrFor(url), n = q.getModuleCount(), pad = 14, cell = (size - pad * 2) / n;
  x.fillStyle = '#FFFFFF'; x.fillRect(px, py, size, size);
  x.lineWidth = 3; x.strokeStyle = '#17151C'; x.strokeRect(px, py, size, size);
  x.fillStyle = '#17151C';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(px + pad + c * cell, py + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
}

/* ---------- postcard rendering ---------- */
const SILHOUETTE = '<svg viewBox="0 0 300 330" aria-hidden="true" focusable="false"><circle cx="150" cy="120" r="62" fill="#9d9aa3"/><path d="M30 330c0-96 54-150 120-150s120 54 120 150z" fill="#9d9aa3"/></svg>';
function photoNode(card) {
  const url = httpsUrl(card.photo_url);
  const arch = h('div', { class: 'arch' });
  if (url) {
    arch.append(h('img', { src: url, alt: 'Portrait of ' + card.display_name, loading: 'lazy', decoding: 'async', referrerPolicy: 'no-referrer',
      on: { error: e => { e.target.replaceWith(placeholder()); } } }));
  } else arch.append(placeholder());
  return arch;
}
function placeholder() {
  const d = h('div', { class: 'no-photo' });
  d.innerHTML = SILHOUETTE; // konstanta statis, bukan data pengguna
  d.append(h('span', { text: 'PHOTO PENDING' }));
  return d;
}
function maxOf(key) { return state.cards.reduce((m, c) => Math.max(m, c[key]), 0); }
function badgesFor(card) {
  const mv = maxOf('vote_count'), mc = maxOf('comment_count');
  const fav = mv > 0 && card.vote_count === mv, disc = mc > 0 && card.comment_count === mc;
  if (fav && disc) return [['SPOTLIGHT', 'spot']];
  const b = []; if (fav) b.push(['COMMUNITY FAVORITE', 'fav']); if (disc) b.push(['MOST DISCUSSED', 'disc']);
  return b;
}
function voteButton(card, extraClass) {
  const voted = !!card.voted;
  const b = h('button', { class: 'vote-btn ' + (extraClass || ''), type: 'button',
    attrs: { 'aria-pressed': String(voted), 'aria-label': (voted ? 'Remove your vote for ' : 'Vote for ') + card.display_name + '. ' + card.vote_count + ' votes.' },
    on: { click: e => { e.stopPropagation(); toggleVote(card); } } },
    h('span', { class: 'h', text: voted ? '♥' : '♡', attrs: { 'aria-hidden': 'true' } }), h('span', { text: String(card.vote_count) }));
  if (!state.settings.voting_enabled && !voted) { b.title = 'Voting is currently closed'; }
  return b;
}
function postcard(card, opts = {}) {
  const frame = opts.frame || frameOf(card.frame_id);
  const el = h('article', { class: 'profile-card' + (opts.selectable ? ' is-selectable' : '') + (opts.selected ? ' is-selected' : ''), dataset: { slug: card.slug } });
  applyFrame(el, frame);
  const shell = h('div', { class: 'portrait-shell', dataset: { pattern: normFrame(frame).pattern } }, photoNode(card),
    h('div', { class: 'portrait-bottom' },
      h('div', { class: 'badges' }, badgesFor(card).map(([t, c]) => h('span', { class: 'tag ' + c, text: t }))),
      opts.detail ? null : voteButton(card)));
  const copy = h('div', { class: 'card-copy' },
    h('span', { class: 'energy-name', text: card.energy_label || '' }),
    h('div', { class: 'identity-line' },
      h('div', {}, h('h3', { class: 'profile-name', text: card.display_name }), h('span', { class: 'handle', text: card.handle || '' })),
      h('div', { class: 'id-tools' }, qrChip(card),
        h('button', { class: 'circle-button download', type: 'button', text: '↓', attrs: { 'aria-label': 'Download postcard image of ' + card.display_name },
          on: { click: e => { e.stopPropagation(); downloadPostcard(card, frame); } } }))),
    card.mood_quote ? h('div', { class: 'quote-row' }, h('span', { class: 'mood', text: 'MOOD' }), h('p', { class: 'quote', text: card.mood_quote })) : null);
  el.append(shell, copy);
  if (opts.meta !== false) {
    el.append(h('div', { class: 'card-meta' },
      h('span', { class: 'stat', text: card.vote_count + ' VOTES · ' + card.comment_count + ' COMMENTS' }),
      h('div', { class: 'card-actions' },
        opts.detail ? null : h('button', { class: 'box-button', type: 'button', text: 'VIEW', on: { click: e => { e.stopPropagation(); openCard(card.slug); } } }),
        h('button', { class: 'box-button', type: 'button', text: 'SHARE', on: { click: e => { e.stopPropagation(); shareCard(card); } } }))));
  }
  if (opts.selectable) {
    el.tabIndex = 0; el.setAttribute('role', 'group'); el.setAttribute('aria-label', card.display_name + ' postcard');
    el.addEventListener('click', () => selectCard(card.slug));
    el.addEventListener('keydown', e => { if (e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectCard(card.slug); } });
  }
  return el;
}

/* ---------- ordering ---------- */
function defaultOrder() {
  const c = [...state.cards];
  const by = { votes: x => x.vote_count, comments: x => x.comment_count, recent: x => +new Date(x.created_at) }[state.settings.default_sort];
  if (by) c.sort((a, b) => by(b) - by(a) || a.sort_order - b.sort_order);
  return c.map(x => x.slug);
}
function orderedCards() {
  const base = state.shuffled && state.order ? state.order.filter(s => cardBySlug(s)).concat(state.cards.map(c => c.slug).filter(s => !state.order.includes(s))) : defaultOrder();
  return base.map(cardBySlug).filter(Boolean);
}

/* ---------- gallery ---------- */
function renderGallery(keepScroll) {
  const track = $('#gallery-track'), vp = $('#gallery-viewport');
  const left = vp.scrollLeft;
  const list = orderedCards();
  track.replaceChildren();
  if (!state.cards.length) {
    track.append(h('div', { class: 'empty', text: state.dbReady ? 'No postcards are published yet.' : 'Postcards will appear here once the database is set up.' }));
    $('#gallery-count').textContent = '00 / 00 PLAYERS'; return;
  }
  const sel = selected();
  list.forEach(c => track.append(postcard(c, { selectable: true, selected: sel && c.slug === sel.slug })));
  updateCount();
  if (keepScroll) vp.scrollLeft = left;
}
function updateCount() {
  const list = orderedCards(), sel = selected();
  const i = sel ? list.findIndex(c => c.slug === sel.slug) : 0;
  $('#gallery-count').textContent = pad(i + 1) + ' / ' + pad(list.length) + ' PLAYERS';
}
function selectCard(slug, scroll) {
  if (!cardBySlug(slug)) return;
  const changed = state.selectedSlug !== slug;
  state.selectedSlug = slug; state.tryFrameId = null;
  document.querySelectorAll('#gallery-track .profile-card').forEach(el => el.classList.toggle('is-selected', el.dataset.slug === slug));
  updateCount();
  if (scroll) {
    const el = $('#gallery-track .profile-card[data-slug="' + slug + '"]');
    if (el) $('#gallery-viewport').scrollTo({ left: el.offsetLeft - $('#gallery-track').firstElementChild.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  renderDetailMeta(); renderFrames();
  if (changed) { loadComments(true); if (history.replaceState) history.replaceState(null, '', '#card/' + slug); }
}
function step(d) {
  const list = orderedCards(); if (!list.length) return;
  const i = list.findIndex(c => c.slug === (selected() || {}).slug);
  selectCard(list[(i + d + list.length) % list.length].slug, true);
}
function openCard(slug) {
  selectCard(slug, true);
  $('#card').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
async function shareCard(card) {
  const url = cardUrl(card);
  try {
    if (navigator.share) { await navigator.share({ title: card.display_name + ' — Ethics Frame Studio', url }); return; }
    await navigator.clipboard.writeText(url); toast('Link copied.');
  } catch (e) { if (e && e.name === 'AbortError') return; try { prompt('Copy this link:', url); } catch (_) { /* noop */ } }
}

/* ---------- vote ---------- */
async function toggleVote(card) {
  if (!state.user) { openMemberModal('Sign in to vote for ' + card.display_name + '.'); return; }
  if (!card.voted && !state.settings.voting_enabled) { toast('Voting is currently closed.', true); return; }
  const was = card.voted;
  card.voted = !was; card.vote_count += was ? -1 : 1;
  renderGallery(true); renderDetailMeta(); renderSpotlight();
  const r = was
    ? await sb.from('ef_votes').delete().eq('profile_id', card.id).eq('user_id', state.user.id)
    : await sb.from('ef_votes').insert({ profile_id: card.id });
  if (r.error && r.error.code !== '23505') {
    card.voted = was; card.vote_count += was ? 1 : -1;
    renderGallery(true); renderDetailMeta(); renderSpotlight();
    toast(errMsg(r.error), true);
  }
  refreshSoon();
}

/* ---------- spotlight ---------- */
const SPOT_TABS = [['votes', 'MOST LOVED'], ['comments', 'MOST DISCUSSED'], ['recent', 'RECENTLY ADDED'], ['all', 'ALL POSTCARDS']];
function renderSpotlight() {
  const sec = $('#spotlight'), navLink = $('#nav-spotlight');
  const on = state.settings.spotlight_enabled && state.cards.length > 0;
  sec.hidden = !on; navLink.hidden = !on;
  if (!on) return;
  const tabs = $('#spot-tabs'); tabs.replaceChildren();
  SPOT_TABS.forEach(([k, label]) => tabs.append(h('button', { class: 'tab', type: 'button', text: label, attrs: { role: 'tab', 'aria-selected': String(state.spotTab === k) }, on: { click: () => { state.spotTab = k; renderSpotlight(); } } })));
  const tv = state.cards.reduce((a, c) => a + c.vote_count, 0), tc = state.cards.reduce((a, c) => a + c.comment_count, 0);
  const meta = $('#spot-meta'); meta.replaceChildren(
    h('span', {}, h('b', { text: String(state.cards.length) }), ' PUBLISHED POSTCARDS'),
    h('span', {}, h('b', { text: String(tv) }), ' VOTES'), h('span', {}, h('b', { text: String(tc) }), ' VISIBLE COMMENTS'));
  const rules = {
    votes: 'Ranked by saved votes, highest first. Equal votes share the same rank and are listed alphabetically. Votes and comments are counted separately and never combined into a score.',
    comments: 'Ranked by visible comments, highest first. Equal counts share the same rank. Hidden or pending comments are not counted.',
    recent: 'Newest postcards first, by the date each one was added.',
    all: 'Every published postcard, in the saved studio order.'
  };
  $('#spot-rule').textContent = rules[state.spotTab] + ' Engagement shows appreciation for a postcard — it says nothing about anyone’s ability or worth.';
  const body = $('#spot-body'); body.replaceChildren();
  let rows;
  if (state.spotTab === 'votes' || state.spotTab === 'comments') {
    const key = state.spotTab === 'votes' ? c => c.vote_count : c => c.comment_count;
    const sorted = [...state.cards].sort((a, b) => key(b) - key(a) || a.display_name.localeCompare(b.display_name));
    let rank = 0, prev = null;
    rows = sorted.map((c, i) => { if (key(c) !== prev) { rank = i + 1; prev = key(c); } return { c, rank: key(c) > 0 ? rank : null, tie: sorted.filter(x => key(x) === key(c)).length > 1 && key(c) > 0 }; });
    if (!rows.some(r => r.rank)) body.append(h('div', { class: 'empty', text: state.spotTab === 'votes' ? 'No votes yet — every postcard is level. Be the first to vote.' : 'No comments yet — start the conversation on any postcard.' }));
  } else if (state.spotTab === 'recent') {
    rows = [...state.cards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || a.display_name.localeCompare(b.display_name)).map(c => ({ c, rank: null, date: true }));
  } else rows = [...state.cards].sort((a, b) => a.sort_order - b.sort_order).map(c => ({ c, rank: null }));
  const ul = h('ul', { class: 'spot-list' });
  rows.forEach(({ c, rank, tie, date }, idx) => {
    const f = frameOf(c.frame_id);
    const thumb = h('div', { class: 'thumb' }, photoNode(c)); applyFrame(thumb, f); thumb.style.setProperty('--bg', f.bg);
    ul.append(h('li', {}, h('button', { class: 'spot-row', type: 'button', on: { click: () => openCard(c.slug) }, attrs: { 'aria-label': 'Open ' + c.display_name } },
      h('div', { class: 'rank' }, rank ? String(rank) : (state.spotTab === 'recent' || state.spotTab === 'all' ? pad(idx + 1) : '–'), tie ? h('small', { text: 'TIED' }) : null),
      thumb,
      h('div', {}, h('span', { class: 'spot-name', text: c.display_name }), h('span', { class: 'spot-handle', text: date ? 'ADDED ' + fmtDate(c.created_at) : (c.handle || '') }),
        h('div', { class: 'spot-badges' }, badgesFor(c).map(([t, k]) => h('span', { class: 'tag ' + k, text: t })))),
      h('div', { class: 'spot-num' }, h('b', { text: String(c.vote_count) }), 'VOTES'),
      h('div', { class: 'spot-num' }, h('b', { text: String(c.comment_count) }), 'COMMENTS'))));
  });
  body.append(ul);
}

/* ---------- detail ---------- */
function renderDetailMeta() {
  const box = $('#detail'), card = selected();
  if (!card) { box.replaceChildren(h('div', { class: 'empty', text: 'Select a postcard to see it here.' })); return; }
  const keepForm = $('#comment-area', box);
  const left = h('div', { class: 'detail-card' }, postcard(card, { selected: true, detail: true, meta: false }));
  const right = h('div', { class: 'detail-info' },
    h('span', { class: 'tiny-heading', text: card.energy_label ? card.energy_label.toUpperCase() : 'POSTCARD' }),
    h('h3', { text: card.display_name }),
    h('span', { class: 'handle', text: card.handle || '' }),
    h('div', { class: 'detail-stats' },
      h('span', { class: 'tag', text: card.vote_count + ' VOTES' }), h('span', { class: 'tag', text: card.comment_count + ' COMMENTS' }),
      h('span', { class: 'tag', text: 'FRAME: ' + frameOf(card.frame_id).name.toUpperCase() })),
    h('div', { class: 'detail-actions' }, voteButton(card),
      h('button', { class: 'box-button', type: 'button', text: '↓ DOWNLOAD IMAGE', on: { click: () => downloadPostcard(card, frameOf(card.frame_id)) } }),
      h('button', { class: 'box-button', type: 'button', text: 'COPY LINK', on: { click: () => shareCard(card) } })),
    keepForm || h('div', { id: 'comment-area', class: 'comments' }));
  box.replaceChildren(left, right);
  renderCommentForm(); renderCommentList();
}

/* ---------- comments ---------- */
const COMMENT_PAGE = 20;
function commentAreaParts() {
  const area = $('#comment-area'); if (!area) return {};
  if (!area.firstChild) {
    area.append(h('h4', { id: 'comments-h', text: 'COMMENTS' }), h('div', { id: 'comment-form' }), h('div', { id: 'comment-list-wrap' }));
  }
  return { form: $('#comment-form'), wrap: $('#comment-list-wrap'), head: $('#comments-h') };
}
function renderCommentForm() {
  const { form, head } = commentAreaParts(); if (!form) return;
  const card = selected(); if (!card) return;
  head.textContent = 'COMMENTS · ' + card.comment_count;
  form.replaceChildren();
  if (!state.settings.comments_enabled) { form.append(h('div', { class: 'empty', text: 'Comments are closed for now. Existing comments stay visible.' })); return; }
  if (!state.user) {
    form.append(h('div', { class: 'comment-form' }, h('p', { class: 'hint', text: 'Sign in to join the conversation.' }),
      h('button', { class: 'box-button solid', type: 'button', text: 'SIGN IN TO COMMENT', on: { click: () => openMemberModal('Sign in to comment on ' + card.display_name + '’s postcard.') } })));
    return;
  }
  const ta = h('textarea', { maxLength: 500, placeholder: 'Write something kind and honest…', attrs: { 'aria-label': 'Your comment', rows: 3 } });
  const left = h('span', { class: 'hint', text: '500 left' });
  const btn = h('button', { class: 'box-button solid', type: 'submit', text: 'POST COMMENT' });
  ta.addEventListener('input', () => { left.textContent = (500 - ta.value.length) + ' left'; });
  form.append(h('form', { class: 'comment-form', on: { submit: async e => {
    e.preventDefault();
    const body = ta.value.trim(); if (!body) { toast('Write something first.', true); return; }
    btn.disabled = true; btn.textContent = 'POSTING…';
    const r = await sb.from('ef_comments').insert({ profile_id: card.id, body })
      .select('id,body,status,created_at,updated_at,user_id,ef_user_profiles(display_name)').single();
    btn.disabled = false; btn.textContent = 'POST COMMENT';
    if (r.error) {
      toast(/foreign key|23503/.test((r.error.code || '') + r.error.message) ? 'Please sign out and in again to finish setting up your profile.' : errMsg(r.error), true); return;
    }
    ta.value = ''; left.textContent = '500 left';
    state.comments.unshift(r.data); renderCommentList();
    toast(r.data.status === 'pending' ? 'Thanks — your comment is waiting for moderator approval.' : 'Comment posted.');
    refreshSoon();
  } } }, ta, h('div', { class: 'row' }, left, btn)));
}
async function loadComments(reset) {
  const card = selected(); if (!card || !state.dbReady) return;
  if (reset) { state.comments = []; state.commentsDone = false; state.commentsFor = card.id; }
  if (state.commentsLoading && !reset) return;
  const myReq = card.id; state.commentsLoading = true; renderCommentList();
  const from = state.comments.length;
  const r = await sb.from('ef_comments').select('id,body,status,created_at,updated_at,user_id,ef_user_profiles(display_name)')
    .eq('profile_id', card.id).order('created_at', { ascending: false }).range(from, from + COMMENT_PAGE - 1);
  state.commentsLoading = false;
  if (state.commentsFor !== myReq) return;
  if (r.error) { state.commentError = errMsg(r.error); renderCommentList(); return; }
  state.commentError = null;
  state.comments = state.comments.concat(r.data || []);
  state.commentsDone = (r.data || []).length < COMMENT_PAGE;
  renderCommentList();
}
function renderCommentList() {
  const { wrap } = commentAreaParts(); if (!wrap) return;
  wrap.replaceChildren();
  if (state.commentError) { wrap.append(h('div', { class: 'empty', text: 'Could not load comments: ' + state.commentError })); return; }
  if (state.commentsLoading && !state.comments.length) { wrap.append(h('p', { class: 'hint', text: 'Loading comments…' })); return; }
  if (!state.comments.length) { wrap.append(h('div', { class: 'empty', text: 'No comments yet. Be the first to say something.' })); return; }
  const ul = h('ul', { class: 'comment-list' });
  state.comments.forEach(c => ul.append(commentNode(c)));
  wrap.append(ul);
  if (!state.commentsDone) wrap.append(h('div', { class: 'pager' }, h('button', { class: 'box-button', type: 'button', text: state.commentsLoading ? 'LOADING…' : 'LOAD MORE', disabled: state.commentsLoading, on: { click: () => loadComments(false) } })));
}
function commentNode(c) {
  const mine = state.user && c.user_id === state.user.id;
  const name = (c.ef_user_profiles && c.ef_user_profiles.display_name) || 'Member';
  const body = h('p', { class: 'comment-body', text: c.body });
  const li = h('li', { class: 'comment', dataset: { id: c.id } },
    h('div', { class: 'comment-head' }, h('b', { text: name }), h('time', { text: timeAgo(c.created_at) + (c.updated_at && c.updated_at !== c.created_at && Math.abs(new Date(c.updated_at) - new Date(c.created_at)) > 1500 ? ' · edited' : ''), attrs: { datetime: c.created_at, title: new Date(c.created_at).toLocaleString() } }),
      c.status === 'pending' ? h('span', { class: 'state-tag', text: 'PENDING APPROVAL' }) : null,
      c.status === 'hidden' ? h('span', { class: 'state-tag hid', text: 'HIDDEN' }) : null),
    body);
  const actions = h('div', { class: 'comment-actions' });
  if (mine && c.status !== 'hidden') {
    actions.append(h('button', { class: 'link-btn', type: 'button', text: 'EDIT', on: { click: () => editComment(c, li, body) } }),
      h('button', { class: 'link-btn', type: 'button', text: 'DELETE', on: { click: async () => {
        const r = await sb.from('ef_comments').delete().eq('id', c.id);
        if (r.error) { toast(errMsg(r.error), true); return; }
        state.comments = state.comments.filter(x => x.id !== c.id); renderCommentList(); toast('Comment deleted.'); refreshSoon();
      } } }));
  } else if (state.user && !mine && c.status === 'visible') {
    actions.append(h('button', { class: 'link-btn', type: 'button', text: 'REPORT', on: { click: async e => {
      e.target.disabled = true;
      const r = await sb.from('ef_comment_reports').insert({ comment_id: c.id });
      if (r.error && r.error.code !== '23505') { e.target.disabled = false; toast(errMsg(r.error), true); return; }
      e.target.textContent = 'REPORTED'; toast('Thanks — a moderator will take a look.');
    } } }));
  }
  if (actions.childElementCount) li.append(actions);
  return li;
}
function editComment(c, li, body) {
  const ta = h('textarea', { value: c.body, maxLength: 500, attrs: { 'aria-label': 'Edit comment', rows: 3 }, style: 'width:100%;border:1px solid #17151C;padding:10px;font:15px/1.5 inherit;min-height:70px' });
  const save = h('button', { class: 'box-button solid', type: 'button', text: 'SAVE', on: { click: async () => {
    const nb = ta.value.trim(); if (!nb) { toast('A comment can’t be empty.', true); return; }
    save.disabled = true;
    const r = await sb.from('ef_comments').update({ body: nb }).eq('id', c.id).select('id,body,status,created_at,updated_at,user_id,ef_user_profiles(display_name)').maybeSingle();
    if (r.error || !r.data) { save.disabled = false; toast(r.error ? errMsg(r.error) : 'This comment can no longer be edited.', true); return; }
    Object.assign(c, r.data); renderCommentList(); toast('Comment updated.');
  } } });
  const cancel = h('button', { class: 'box-button', type: 'button', text: 'CANCEL', on: { click: renderCommentList } });
  body.replaceWith(h('div', {}, ta, h('div', { class: 'comment-actions' }, save, cancel)));
  li.querySelector('.comment-actions')?.remove();
  ta.focus();
}

/* ---------- frames section ---------- */
function renderFrames() {
  const card = selected(); if (!card) return;
  const list = $('#presets'); list.replaceChildren();
  const frames = [...state.frames.values()].filter(f => f.is_active !== false);
  const cur = state.tryFrameId || card.frame_id;
  frames.forEach(f => {
    const b = h('button', { class: 'preset', type: 'button', attrs: { 'aria-pressed': String(f.id === cur) }, on: { click: () => { state.tryFrameId = f.id; renderFrames(); } } },
      h('span', { class: 'preset-art' }), h('span', { class: 'preset-name', text: f.name }), h('span', { class: 'on-label', text: f.id === card.frame_id ? 'SAVED' : 'TRYING' }));
    applyFrame(b, f); list.append(b);
  });
  const f = frameOf(cur), idx = orderedCards().findIndex(c => c.slug === card.slug);
  $('#editor-index').textContent = pad(idx + 1);
  $('#editor-name').textContent = card.display_name; $('#editor-quote').textContent = card.mood_quote || '';
  const tile = $('#preview-tile'); applyFrame(tile, f);
  const arch = $('#preview-arch'); arch.replaceWith(Object.assign(photoNode(card), { id: 'preview-arch' }));
  $('#preview-title').textContent = f.name + (f.id === card.frame_id ? ' (saved frame)' : ' (preview)');
}
$('#download-look').addEventListener('click', () => { const c = selected(); if (c) downloadPostcard(c, frameOf(state.tryFrameId || c.frame_id), $('#frame-feedback')); });

/* ---------- showcase ---------- */
function renderShowcase() {
  const g = $('#showcase-grid'); g.replaceChildren();
  [...state.cards].sort((a, b) => a.sort_order - b.sort_order).forEach(c => {
    const f = frameOf(c.frame_id);
    const art = h('div', { class: 'showcase-art' }, photoNode(c));
    const b = h('button', { class: 'showcase-card', type: 'button', attrs: { 'aria-label': 'Open ' + c.display_name }, on: { click: () => openCard(c.slug) } },
      art, h('span', { class: 'showcase-name', text: c.display_name }), h('span', { class: 'showcase-frame', text: c.energy_label || f.name }));
    applyFrame(b, f); g.append(b);
  });
}

/* ---------- export PNG (canvas; bukan screenshot halaman) ---------- */
function loadImg(url) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.referrerPolicy = 'no-referrer'; i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
}
function wrapLines(ctx, text, max) {
  const out = []; let line = '';
  for (const w of text.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
async function renderPostcardCanvas(card, frame) {
  const F = normFrame(frame), W = 900, H = 1240, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  await Promise.all(['800 40px "DM Sans"', '400 40px "DM Sans"', 'italic 400 40px Fraunces', '400 24px "Space Mono"'].map(f => document.fonts.load(f).catch(() => null)));
  let photo = null, photoFailed = false; const url = httpsUrl(card.photo_url);
  if (url) { try { photo = await loadImg(url); } catch (e) { photoFailed = true; } }
  x.fillStyle = '#FAF9F5'; x.fillRect(0, 0, W, H);
  const sx = 40, sy = 40, sw = 820, sh = 800;
  const rr = (X, Y, w, h2, r) => { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h2, r) : x.rect(X, Y, w, h2); };
  rr(sx + 14, sy + 14, sw, sh, F.radius); x.fillStyle = F.shadow; x.fill();
  rr(sx, sy, sw, sh, F.radius); x.fillStyle = F.bg; x.fill();
  x.save(); rr(sx, sy, sw, sh, F.radius); x.clip();
  x.strokeStyle = 'rgba(23,21,28,.14)'; x.fillStyle = 'rgba(23,21,28,.22)'; x.lineWidth = 2;
  if (F.pattern === 'grid') { for (let i = sx; i < sx + sw; i += 36) { x.beginPath(); x.moveTo(i, sy); x.lineTo(i, sy + sh); x.stroke(); } for (let j = sy; j < sy + sh; j += 36) { x.beginPath(); x.moveTo(sx, j); x.lineTo(sx + sw, j); x.stroke(); } }
  if (F.pattern === 'dots') for (let i = sx + 16; i < sx + sw; i += 32) for (let j = sy + 16; j < sy + sh; j += 32) { x.beginPath(); x.arc(i, j, 3, 0, 7); x.fill(); }
  if (F.pattern === 'stripes') for (let i = -sh; i < sw; i += 34) { x.beginPath(); x.moveTo(sx + i, sy + sh); x.lineTo(sx + i + sh, sy); x.lineTo(sx + i + sh + 16, sy); x.lineTo(sx + i + 16, sy + sh); x.fill(); }
  x.restore();
  rr(sx, sy, sw, sh, F.radius); x.lineWidth = 4; x.strokeStyle = F.border; x.stroke();
  // lengkung foto
  const ax = sx + 44, ay = sy + 96, aw = sw - 88, ah = sh - 140, ry = ah * 0.34;
  const arch = () => { x.beginPath(); x.moveTo(ax, ay + ah - 4); x.lineTo(ax, ay + ry); x.ellipse(ax + aw / 2, ay + ry, aw / 2, ry, 0, Math.PI, Math.PI * 2); x.lineTo(ax + aw, ay + ah - 4); x.quadraticCurveTo(ax + aw, ay + ah, ax + aw - 4, ay + ah); x.lineTo(ax + 4, ay + ah); x.quadraticCurveTo(ax, ay + ah, ax, ay + ah - 4); x.closePath(); };
  arch(); const g = x.createLinearGradient(ax, ay, ax + aw, ay + ah); g.addColorStop(0, '#e9e7df'); g.addColorStop(1, '#b8b5ad'); x.fillStyle = g; x.fill();
  x.save(); arch(); x.clip();
  if (photo) {
    const r = Math.max(aw / photo.width, ah / photo.height), dw = photo.width * r, dh = photo.height * r;
    x.drawImage(photo, ax + (aw - dw) / 2, ay + (ah - dh) * 0.3, dw, dh);
  } else {
    x.fillStyle = '#9d9aa3'; x.beginPath(); x.arc(ax + aw / 2, ay + ah * 0.52, 120, 0, 7); x.fill();
    x.beginPath(); x.ellipse(ax + aw / 2, ay + ah + 20, 250, 260, 0, Math.PI, Math.PI * 2); x.fill();
    x.fillStyle = '#5d5a62'; x.font = '400 22px "Space Mono"'; x.textAlign = 'center'; x.fillText('PHOTO PENDING', ax + aw / 2, ay + ah * 0.28);
  }
  x.restore(); arch(); x.lineWidth = 3; x.strokeStyle = F.border; x.stroke();
  x.textAlign = 'left'; x.fillStyle = F.border; x.font = '400 40px "Space Mono"'; x.fillText('◦ ◦ ◦', sx + 20, sy + 52);
  x.textAlign = 'right'; x.font = '400 120px "DM Sans"'; x.fillStyle = F.border; x.fillText('✳', sx + sw - 8 + 3, sy + 92 + 4); x.fillStyle = F.star; x.fillText('✳', sx + sw - 8, sy + 92);
  x.textAlign = 'left';
  // teks
  let y = sy + sh + 66; x.fillStyle = F.text_color;
  x.font = '400 24px "Space Mono"'; if (card.energy_label) x.fillText(card.energy_label, 50, y);
  y += 70; x.font = '400 66px "DM Sans"'; x.letterSpacing = '-3px'; x.fillText(card.display_name, 50, y); x.letterSpacing = '0px';
  y += 40; x.globalAlpha = .7; x.font = '400 24px "Space Mono"'; x.fillText(card.handle || '', 50, y); x.globalAlpha = 1;
  if (card.mood_quote) {
    y += 34; x.fillStyle = F.accent; x.fillRect(50, y, W - 100, 2); y += 38;
    x.fillRect(50, y - 22, 78, 28); x.fillStyle = '#fff'; x.font = '400 17px "Space Mono"'; x.fillText('MOOD', 62, y - 2);
    x.fillStyle = F.text_color; x.font = 'italic 400 34px Fraunces'; wrapLines(x, card.mood_quote, 540).slice(0, 2).forEach((ln, i) => x.fillText(ln, 148, y + i * 42));
  }
  let qrFailed = false;
  try {
    if (!(await ensureQr())) throw new Error('qr');
    const QS = 160, qx = W - 50 - QS, qy = sy + sh + 40;
    drawQr(x, cardUrl(card), qx, qy, QS);
    x.fillStyle = F.text_color; x.font = '400 16px "Space Mono"'; x.textAlign = 'center'; x.fillText('SCAN ME', qx + QS / 2, qy + QS + 26);
  } catch (e) { qrFailed = true; }
  x.fillStyle = '#77737a'; x.font = '400 17px "Space Mono"'; x.textAlign = 'center'; x.fillText('ETHICS FRAME STUDIO · KELOMPOK 6 · ETIKA ADMINISTRASI DAN KEPEGAWAIAN', W / 2, H - 28);
  return { canvas: c, photoFailed, qrFailed };
}
async function downloadPostcard(card, frame, feedbackEl) {
  const say = (t, e) => { if (feedbackEl) feedbackEl.textContent = t; toast(t, e); };
  try {
    say('Preparing image…');
    const { canvas, photoFailed, qrFailed } = await renderPostcardCanvas(card, frame);
    const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'));
    const a = h('a', { href: URL.createObjectURL(blob), download: 'postcard-' + (SLUG.test(card.slug) ? card.slug : 'card') + '.png' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say(qrFailed ? 'Image saved, but the QR code could not be drawn. Refresh the page (Ctrl+Shift+R) and try again.' : photoFailed ? 'Image saved, but the photo could not be embedded (blocked or unavailable).' : 'Image saved.', qrFailed || photoFailed);
  } catch (e) { say('Could not create the image on this browser/connection.', true); }
}
EFS.renderPostcardCanvas = renderPostcardCanvas;

/* ---------- events ---------- */
$('#previous').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#shuffle').addEventListener('click', () => {
  if (state.cards.length < 2) return;
  const a = state.cards.map(c => c.slug);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  state.order = a; state.shuffled = true; $('#unshuffle').hidden = false; $('#shuffle-note').hidden = false; renderGallery();
});
$('#unshuffle').addEventListener('click', () => { state.shuffled = false; state.order = null; $('#unshuffle').hidden = true; $('#shuffle-note').hidden = true; renderGallery(); });
$('#member-btn').addEventListener('click', async () => {
  if (state.user) { await sb.auth.signOut(); toast('Signed out.'); } else openMemberModal();
});
$('#admin-btn').addEventListener('click', () => { if (state.isAdmin && state.user) EFS.admin.open(); else openAdminModal(); });
$('#gallery-viewport').addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

function routeHash() {
  const m = /^#card\/([a-z0-9-]{2,60})$/.exec(location.hash);
  if (m && cardBySlug(m[1])) { selectCard(m[1], true); }
}
addEventListener('hashchange', routeHash);
Object.assign(EFS, { openModal, closeModal, modalShell, pwField, refreshGallery, loadAll, renderAll, afterSignIn, postcard, photoNode, frameOf });

/* ---------- boot ---------- */
function renderAll() {
  if (!state.selectedSlug && state.cards.length) state.selectedSlug = orderedCards()[0].slug;
  renderGallery(); renderSpotlight(); renderDetailMeta(); renderFrames(); renderShowcase();
}
let channel = null, poll = null;
function startRealtime() {
  try {
    channel = sb.channel('ef-comments-live').on('postgres_changes', { event: '*', schema: 'public', table: 'ef_comments' }, payload => {
      refreshSoon();
      const row = payload.new && payload.new.profile_id ? payload.new : payload.old;
      const sel = selected();
      if (sel && (!row || !row.profile_id || row.profile_id === sel.id)) { clearTimeout(startRealtime.t); startRealtime.t = setTimeout(() => { if (!state.commentsLoading) { const keep = state.comments.length; state.comments = []; state.commentsDone = false; loadComments(true).then(() => { if (keep > COMMENT_PAGE && !state.commentsDone) loadComments(false); }); } }, 600); }
    }).subscribe();
  } catch (e) { /* realtime opsional */ }
  poll = setInterval(() => { if (!document.hidden && state.dbReady) refreshGallery(); }, 60000);
}
addEventListener('pagehide', () => { try { sb.removeAllChannels(); } catch (e) { /* noop */ } clearInterval(poll); });

sb.auth.onAuthStateChange((event, session) => {
  setTimeout(() => {
    if (event === 'SIGNED_OUT') { state.user = null; state.isAdmin = false; state.myName = null; EFS.admin && EFS.admin.close && EFS.admin.close(); if (state.cards.length) { refreshGallery(); } renderAuthUi(); }
    else if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) { if (!state.user || state.user.id !== session.user.id) afterSignIn(session.user); }
  }, 0);
});

(async function boot() {
  const ok = await loadAll();
  renderAll();
  if (ok) {
    routeHash();
    const { data } = await sb.auth.getSession();
    if (data.session && !state.user) await afterSignIn(data.session.user);
    else if (!data.session) loadComments(true);
    startRealtime();
  }
})();
})();
