/* ETHICS FRAME STUDIO — panel admin.
   Catatan keamanan: panel ini hanya antarmuka. Setiap operasi ditegakkan oleh RLS/RPC di database
   (lihat sql/01_schema.sql); menyembunyikan tombol bukan kontrol akses. */
(() => {
'use strict';
const E = window.EFS; if (!E) return;
const { sb, state, h, $, pad, toast, errMsg, safeHex, normFrame, applyFrame, httpsUrl, fmtDate, timeAgo, DEF_FRAME, PATTERNS, SLUG, CFG } = E;

let root = null, view = 'overview', idle = null, token = 0;
const TABS = [['overview', 'OVERVIEW'], ['postcards', 'POSTCARDS'], ['studio', 'FRAME STUDIO'], ['comments', 'COMMENTS'], ['settings', 'SETTINGS'], ['activity', 'ACTIVITY']];

/* ---------- util ---------- */
const slugify = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
function confirmDialog({ title, text, confirm = 'Confirm', danger = false }) {
  return new Promise(res => {
    const done = v => { ov.remove(); document.removeEventListener('keydown', onKey, true); if (prev && prev.focus) prev.focus(); res(v); };
    const prev = document.activeElement;
    const ok = h('button', { class: 'box-button ' + (danger ? 'danger' : 'solid'), type: 'button', text: confirm, on: { click: () => done(true) } });
    const no = h('button', { class: 'box-button', type: 'button', text: 'CANCEL', on: { click: () => done(false) } });
    const ov = h('div', { class: 'overlay', style: 'z-index:70', on: { mousedown: e => { if (e.target === ov) done(false); } } },
      h('div', { class: 'modal', attrs: { role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title } },
        h('span', { class: 'modal-label', text: 'PLEASE CONFIRM' }), h('h2', { text: title, style: 'font-size:30px' }),
        h('p', { class: 'confirm-text', text }), h('div', { class: 'row-actions' }, ok, no)));
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', onKey, true);
    document.body.append(ov); no.focus();
  });
}
async function busy(btn, label, fn) {
  const old = btn.textContent; btn.disabled = true; if (label) btn.textContent = label;
  try { return await fn(); } catch (e) { toast(errMsg(e), true); } finally { btn.disabled = false; btn.textContent = old; }
}
const statusTag = s => h('span', { class: 'status ' + s, text: s.toUpperCase() });
function thumb(card, frame) {
  const t = h('div', { class: 'thumb' }, E.photoNode(card)); applyFrame(t, frame || E.frameOf(card.frame_id)); return t;
}
async function fetchCards() { const r = await sb.rpc('ef_gallery'); if (r.error) throw r.error; return r.data.map(c => ({ ...c, vote_count: Number(c.vote_count), comment_count: Number(c.comment_count) })); }
async function fetchFrames() { const r = await sb.from('ef_frames').select('*').order('sort_order').order('name'); if (r.error) throw r.error; return r.data; }
async function syncSite() { await E.loadAll(); E.renderAll(); }
const countOf = async (q) => { const r = await q; if (r.error) throw r.error; return r.count || 0; };

/* ---------- shell ---------- */
function open() {
  if (!state.user || !state.isAdmin) { toast('Admin access required.', true); return; }
  root = $('#admin-root'); document.body.classList.add('no-scroll');
  root.replaceChildren(h('div', { class: 'admin', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Admin control' } },
    h('div', { class: 'admin-top' }, h('div', { class: 'page-width admin-bar' },
      h('div', { class: 'admin-title' }, h('span', { class: 'tiny-heading', text: 'RESTRICTED ACCESS' }), h('b', { text: 'Admin Control' })),
      h('nav', { class: 'admin-nav', attrs: { role: 'tablist', 'aria-label': 'Admin sections' } },
        TABS.map(([k, l]) => h('button', { type: 'button', text: l, dataset: { v: k }, attrs: { role: 'tab', 'aria-selected': String(k === view) }, on: { click: () => go(k) } }))),
      h('div', { class: 'row-actions' },
        h('button', { class: 'box-button', type: 'button', text: 'VIEW SITE', on: { click: close } }),
        h('button', { class: 'box-button solid', type: 'button', text: 'LOG OUT', on: { click: async () => { await sb.auth.signOut(); toast('Signed out.'); } } })))),
    h('main', { class: 'admin-main' }, h('div', { class: 'page-width', id: 'admin-view' }))));
  root.firstChild.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.overlay')) close(); });
  ['pointerdown', 'keydown'].forEach(ev => root.addEventListener(ev, bump, true));
  bump(); go(view);
}
function close() {
  if (!root) return; root.replaceChildren(); clearTimeout(idle); idle = null;
  if (!$('#modal-root').childElementCount) document.body.classList.remove('no-scroll');
  E.refreshGallery && state.dbReady && E.refreshGallery();
}
function bump() {
  clearTimeout(idle);
  idle = setTimeout(async () => { toast('Admin session ended after inactivity.', true); await sb.auth.signOut(); }, (CFG.ADMIN_IDLE_MINUTES || 30) * 60000);
}
function go(v) {
  view = v; const my = ++token;
  root.querySelectorAll('.admin-nav button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
  const box = $('#admin-view'); box.replaceChildren(h('p', { class: 'hint', text: 'Loading…' }));
  const fn = { overview, postcards, studio, comments, settings, activity }[v];
  Promise.resolve(fn(box, () => my === token)).catch(e => { if (my === token) box.replaceChildren(h('div', { class: 'empty', text: 'Could not load this section: ' + errMsg(e) })); });
}

/* ---------- OVERVIEW ---------- */
async function overview(box, alive) {
  const [cards, votes, vis, pend, hid, reps, audit] = await Promise.all([
    fetchCards(),
    countOf(sb.from('ef_votes').select('id', { count: 'exact', head: true })),
    countOf(sb.from('ef_comments').select('id', { count: 'exact', head: true }).eq('status', 'visible')),
    countOf(sb.from('ef_comments').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    countOf(sb.from('ef_comments').select('id', { count: 'exact', head: true }).eq('status', 'hidden')),
    countOf(sb.from('ef_comment_reports').select('comment_id', { count: 'exact', head: true })),
    sb.from('ef_audit').select('id,action,detail,created_at,ef_user_profiles(display_name)').like('action', 'comment.%').order('created_at', { ascending: false }).limit(5)
  ]);
  if (!alive()) return;
  const pub = cards.filter(c => c.status === 'published');
  const top = (key) => { const m = Math.max(0, ...pub.map(c => c[key])); return m > 0 ? { m, names: pub.filter(c => c[key] === m).map(c => c.display_name) } : null; };
  const tv = top('vote_count'), tc = top('comment_count');
  const recent = [...cards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const maxV = Math.max(1, ...pub.map(c => c.vote_count));
  const metric = (n, l) => h('div', { class: 'metric' }, h('b', { text: String(n) }), h('span', { text: l }));
  box.replaceChildren(
    h('h2', { text: 'Overview' }), h('p', { class: 'hint', text: 'Every number below is read live from the database.' }),
    h('div', { class: 'metrics' },
      metric(pub.length, 'PUBLISHED POSTCARDS'), metric(votes, 'VOTES'), metric(vis, 'VISIBLE COMMENTS'), metric(state.frames.size, 'FRAME PRESETS'),
      metric(pend, 'COMMENTS PENDING'), metric(hid, 'COMMENTS HIDDEN'), metric(reps, 'COMMENT REPORTS')),
    h('div', { class: 'two' },
      h('div', { class: 'panel' }, h('span', { class: 'tiny-heading', text: 'LEADERS (TIES SHOWN TOGETHER)' }),
        h('p', {}, h('b', { text: 'Most voted: ' }), tv ? tv.names.join(', ') + ' (' + tv.m + ')' : 'no votes yet'),
        h('p', {}, h('b', { text: 'Most discussed: ' }), tc ? tc.names.join(', ') + ' (' + tc.m + ')' : 'no comments yet'),
        h('span', { class: 'tiny-heading', text: 'RECENTLY ADDED' }),
        h('ul', { style: 'padding-left:18px;line-height:1.8' }, recent.map(c => h('li', { text: c.display_name + ' · ' + c.status + ' · ' + fmtDate(c.created_at) })))),
      h('div', { class: 'panel' }, h('span', { class: 'tiny-heading', text: 'VOTES PER POSTCARD (PUBLISHED)' }),
        h('div', { class: 'bars', style: 'margin-top:12px' }, pub.map(c => h('div', { class: 'bar-row' },
          h('span', { text: c.display_name, style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }),
          h('div', { class: 'track' }, h('div', { class: 'fill', style: 'width:' + (c.vote_count / maxV * 100) + '%' })), h('span', { class: 'n', text: String(c.vote_count) })))))),
    h('div', { class: 'panel' }, h('span', { class: 'tiny-heading', text: 'RECENT MODERATION ACTIVITY' }),
      audit.error || !audit.data.length ? h('p', { class: 'hint', text: 'No moderation actions recorded yet.' })
        : h('ul', { class: 'log', style: 'margin-top:10px' }, audit.data.map(logRow))));
}

/* ---------- POSTCARDS ---------- */
async function postcards(box, alive) {
  let cards = await fetchCards(), frames = await fetchFrames();
  if (!alive()) return;
  const f = { q: '', s: 'all' };
  const list = h('div'), drawer = h('div');
  const search = h('input', { type: 'search', placeholder: 'Search name or username…', attrs: { 'aria-label': 'Search postcards' }, on: { input: () => { f.q = search.value.trim().toLowerCase(); draw(); } } });
  const sel = h('select', { attrs: { 'aria-label': 'Filter by status' }, on: { change: () => { f.s = sel.value; draw(); } } },
    ['all', 'published', 'draft', 'archived'].map(s => h('option', { value: s, text: s === 'all' ? 'ALL STATUSES' : s.toUpperCase() })));
  const reload = async () => { cards = await fetchCards(); frames = await fetchFrames(); draw(); await syncSite(); };

  async function move(c, d) {
    const all = [...cards].sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
    const i = all.findIndex(x => x.id === c.id), j = i + d; if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    const ups = all.map((x, k) => ({ x, n: k + 1 })).filter(({ x, n }) => x.sort_order !== n);
    const rs = await Promise.all(ups.map(({ x, n }) => sb.from('ef_profiles').update({ sort_order: n }).eq('id', x.id)));
    const bad = rs.find(r => r.error); if (bad) toast(errMsg(bad.error), true);
    await reload();
  }
  async function setStatus(c, s, msg) {
    const r = await sb.from('ef_profiles').update({ status: s }).eq('id', c.id);
    if (r.error) { toast(errMsg(r.error), true); draw(); return; }
    toast(msg || 'Status updated.'); await reload();
  }
  async function del(c) {
    const ok = await confirmDialog({ title: 'Delete ' + c.display_name + '?', danger: true, confirm: 'Delete permanently',
      text: 'This permanently removes the postcard together with its ' + c.vote_count + ' vote(s) and all comments on it. Uploaded photo files stay in storage. Archiving hides the postcard without losing anything — consider that instead.' });
    if (!ok) return;
    const r = await sb.from('ef_profiles').delete().eq('id', c.id);
    if (r.error) { toast(errMsg(r.error), true); return; }
    toast('Postcard deleted.'); await reload();
  }
  function preview(c) {
    const ov = h('div', { class: 'overlay', style: 'z-index:70', on: { mousedown: e => { if (e.target === ov) ov.remove(); } } },
      h('div', { class: 'modal', style: 'width:min(100%,400px);padding:20px' }, h('button', { class: 'circle-button close', type: 'button', text: '×', attrs: { 'aria-label': 'Close' }, on: { click: () => ov.remove() } }),
        h('div', { style: 'margin-top:36px' }, E.postcard(c, { selected: true, meta: false }))));
    document.body.append(ov);
  }
  function draw() {
    const rows = [...cards].sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
    const shown = rows.filter(c => (f.s === 'all' || c.status === f.s) && (!f.q || (c.display_name + ' ' + (c.handle || '')).toLowerCase().includes(f.q)));
    const canMove = f.s === 'all' && !f.q;
    list.replaceChildren(shown.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, ['#', '', 'NAME', 'FRAME', 'STATUS', 'VOTES', 'COMMENTS', 'ACTIONS'].map(t => h('th', { text: t })))),
      h('tbody', {}, shown.map((c, idx) => {
        const st = h('select', { attrs: { 'aria-label': 'Status of ' + c.display_name }, on: { change: () => setStatus(c, st.value) } },
          ['published', 'draft', 'archived'].map(s => h('option', { value: s, text: s.toUpperCase(), selected: s === c.status })));
        return h('tr', {},
          h('td', { class: 'mono', text: pad(rows.indexOf(c) + 1) }), h('td', {}, thumb(c, frames.find(x => x.id === c.frame_id) && normFrame(frames.find(x => x.id === c.frame_id)))),
          h('td', {}, h('b', { text: c.display_name }), h('br'), h('span', { class: 'handle', text: c.handle || '' })),
          h('td', { text: (E.frameOf(c.frame_id) || {}).name || c.frame_id }), h('td', {}, st),
          h('td', { text: String(c.vote_count) }), h('td', { text: String(c.comment_count) }),
          h('td', {}, h('div', { class: 'row-actions' },
            h('button', { class: 'box-button', type: 'button', text: '↑', disabled: !canMove, attrs: { 'aria-label': 'Move up' }, on: { click: () => move(c, -1) } }),
            h('button', { class: 'box-button', type: 'button', text: '↓', disabled: !canMove, attrs: { 'aria-label': 'Move down' }, on: { click: () => move(c, 1) } }),
            h('button', { class: 'box-button', type: 'button', text: 'PREVIEW', on: { click: () => preview(c) } }),
            h('button', { class: 'box-button', type: 'button', text: 'EDIT', on: { click: () => editor(c) } }),
            c.status === 'archived'
              ? h('button', { class: 'box-button', type: 'button', text: 'RESTORE', on: { click: () => setStatus(c, 'published', 'Restored and published.') } })
              : h('button', { class: 'box-button', type: 'button', text: 'ARCHIVE', on: { click: () => setStatus(c, 'archived', 'Archived — hidden from the public.') } }),
            h('button', { class: 'box-button danger', type: 'button', text: 'DELETE', on: { click: () => del(c) } }))));
      })))) : h('div', { class: 'empty', text: cards.length ? 'No postcards match this filter.' : 'No postcards yet. Create the first one.' }),
      canMove ? null : h('p', { class: 'hint', text: 'Clear the search and status filter to reorder.' }));
  }

  function editor(c) {
    const isNew = !c; const d = c || { display_name: '', handle: '', profile_url: '', energy_label: '', mood_quote: '', frame_id: (frames[0] || {}).id, status: state.settings.publish_immediately ? 'published' : 'draft', photo_url: null };
    const err = h('p', { class: 'err-line', attrs: { role: 'alert' } });
    const inp = (k, label, max, full) => { const i = h('input', { type: 'text', value: d[k] || '', maxLength: max }); return { i, n: h('label', { class: 'field' + (full ? ' full' : '') }, h('span', { text: label }), i) }; };
    const name = inp('display_name', 'DISPLAY NAME *', 60), handle = inp('handle', 'USERNAME (e.g. @name)', 40), plink = inp('profile_url', 'PROFILE LINK (https://… — makes the username clickable)', 200, true),
      label = inp('energy_label', 'BORDER TEXT (shown above the name)', 40), mood = inp('mood_quote', 'MOOD QUOTE', 140, true);
    const fr = h('select', {}, frames.map(x => h('option', { value: x.id, text: x.name + (x.is_active ? '' : ' (inactive)'), selected: x.id === d.frame_id })));
    const st = h('select', {}, ['published', 'draft', 'archived'].map(s => h('option', { value: s, text: s.toUpperCase(), selected: s === d.status })));
    const file = h('input', { type: 'file', attrs: { accept: 'image/jpeg,image/png,image/webp' } });
    const cur = h('p', { class: 'hint', text: d.photo_url ? 'Current photo is kept unless you choose a new file.' : 'No photo yet — a placeholder is shown on the card.' });
    const save = h('button', { class: 'box-button solid', type: 'submit', text: isNew ? 'CREATE POSTCARD' : 'SAVE CHANGES' });
    const form = h('form', { class: 'drawer', on: { submit: async e => {
      e.preventDefault(); err.textContent = '';
      const dn = name.i.value.trim(); if (!dn) { err.textContent = 'Display name is required.'; return; }
      const fl = file.files[0];
      if (fl) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(fl.type)) { err.textContent = 'Photo must be JPG, PNG or WebP.'; return; } if (fl.size > 5 * 1024 * 1024) { err.textContent = 'Photo must be 5 MB or smaller.'; return; } }
      await busy(save, 'SAVING…', async () => {
        let slug = d.slug;
        if (isNew) {
          slug = slugify(dn); if (slug.length < 2) slug = 'card-' + Date.now().toString(36);
          const taken = new Set(cards.map(x => x.slug)); let s = slug, n = 2; while (taken.has(s)) s = (slug + '-' + n++).slice(0, 60); slug = s;
        }
        let photo_url;
        if (fl) {
          const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[fl.type];
          const path = slug + '/' + Date.now() + '.' + ext;
          const up = await sb.storage.from('ef-photos').upload(path, fl, { contentType: fl.type, upsert: false });
          if (up.error) throw up.error;
          photo_url = sb.storage.from('ef-photos').getPublicUrl(path).data.publicUrl;
        }
        const pl = plink.i.value.trim();
        if (pl && !/^https:\/\/[^\s<>"]+$/.test(pl)) { err.textContent = 'Profile link must start with https:// and contain no spaces.'; return; }
        const next = { profile_url: pl || null, display_name: dn, handle: handle.i.value.trim() || null, energy_label: label.i.value.trim() || null, mood_quote: mood.i.value.trim() || null, frame_id: fr.value, status: st.value };
        if (photo_url) next.photo_url = photo_url;
        let r;
        if (isNew) { next.slug = slug; next.sort_order = Math.max(0, ...cards.map(x => x.sort_order)) + 1; r = await sb.from('ef_profiles').insert(next); }
        else {
          const diff = {}; for (const k of Object.keys(next)) if ((next[k] ?? null) !== (d[k] ?? null)) diff[k] = next[k];
          if (!Object.keys(diff).length) { toast('Nothing changed.'); drawer.replaceChildren(); return; }
          r = await sb.from('ef_profiles').update(diff).eq('id', d.id);
        }
        if (r.error) { err.textContent = errMsg(r.error); return; }
        toast(isNew ? 'Postcard created.' : 'Postcard saved.'); drawer.replaceChildren(); await reload();
      });
    } } },
      h('span', { class: 'tiny-heading', text: isNew ? 'NEW POSTCARD' : 'EDITING · ' + d.display_name.toUpperCase() }),
      h('p', { class: 'hint', text: isNew ? 'New postcards follow your “publish immediately” setting by default.' : 'Only the fields you change are written. Photo and border text stay exactly as they are unless edited here.' }),
      h('div', { class: 'form-grid', style: 'margin-top:14px' }, name.n, handle.n, plink.n, label.n,
        h('label', { class: 'field' }, h('span', { text: 'FRAME' }), fr), mood.n,
        h('label', { class: 'field' }, h('span', { text: 'STATUS' }), st),
        h('label', { class: 'field full' }, h('span', { text: 'PHOTO (JPG/PNG/WebP, max 5 MB)' }), file, cur)),
      err, h('div', { class: 'row-actions' }, save, h('button', { class: 'box-button', type: 'button', text: 'CANCEL', on: { click: () => drawer.replaceChildren() } })));
    drawer.replaceChildren(form); form.scrollIntoView({ block: 'nearest' }); name.i.focus();
  }

  box.replaceChildren(h('h2', { text: 'Postcards' }),
    h('p', { class: 'hint', text: 'Archive hides a postcard without deleting anything. Deleting also removes its votes and comments.' }),
    h('div', { class: 'toolbar' }, search, sel, h('button', { class: 'box-button solid', type: 'button', text: '+ NEW POSTCARD', on: { click: () => editor(null) } })),
    drawer, list);
  draw();
}

/* ---------- FRAME STUDIO ---------- */
const COLOR_FIELDS = [['bg', 'Frame background'], ['border', 'Frame border'], ['accent', 'Accent'], ['text_color', 'Primary text'], ['star', 'Star / sticker'], ['shadow', 'Shadow'], ['deco1', 'Sticker color A'], ['deco2', 'Sticker color B']];
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

async function studio(box, alive) {
  let frames = await fetchFrames(), cards = await fetchCards();
  if (!alive()) return;
  let curId = (frames[0] || {}).id, draft = null, saved = null, sampleId = null;
  let editMode = false, selId = null, refocus = null, syncFn = () => {};
  const D = window.EFS_DECOR, editPanel = h('div', { class: 'edit-panel' });
  const listEl = h('div', { class: 'frame-list' }), form = h('div'), stage = h('div', { class: 'preview-stage' }), notes = h('div');
  const usage = id => cards.filter(c => c.frame_id === id).length;
  const dirty = () => saved && draft && JSON.stringify(saved) !== JSON.stringify(draft);
  const valid = () => draft && COLOR_FIELDS.every(([k]) => /^#[0-9a-fA-F]{6}$/.test(draft[k])) && draft.name.trim().length >= 1 && draft.name.trim().length <= 40;
  const pick = f => { selId = null; curId = f.id; saved = { id: f.id, name: f.name, bg: f.bg, border: f.border, accent: f.accent, text_color: f.text_color, star: f.star, shadow: f.shadow, radius: f.radius, pattern: f.pattern, layout: f.layout || 'classic', decor: f.decor || 'none', big_shape: f.big_shape || 'none', halftone: !!f.halftone, deco1: f.deco1 || '#FA78CF', deco2: f.deco2 || '#84AEF8', custom: JSON.parse(JSON.stringify(f.custom || {})), is_active: f.is_active }; draft = JSON.parse(JSON.stringify(saved)); sampleId = (cards.find(c => c.frame_id === f.id) || cards[0] || {}).id; };
  if (frames[0]) pick(frames[0]);

  function drawList() {
    listEl.replaceChildren(...frames.map(f => { const b = h('button', { class: 'frame-item', type: 'button', attrs: { 'aria-pressed': String(f.id === curId) }, on: { click: async () => {
      if (f.id === curId) return;
      if (dirty() && !(await confirmDialog({ title: 'Discard unsaved changes?', text: 'You have unsaved edits to “' + saved.name + '”. Switching frames will discard them.', confirm: 'Discard & switch', danger: true }))) return;
      pick(f); drawAll();
    } } }, h('span', { class: 'sw' }), h('span', {}, h('b', { text: f.name }), h('small', { text: f.id + ' · ' + usage(f.id) + ' postcard(s)' + (f.is_active ? '' : ' · inactive') }))); applyFrame(b, f); return b; }));
  }
  function drawPreview() {
    stage.replaceChildren();
    const sample = cards.find(c => c.id === sampleId); if (!sample) { stage.append(h('div', { class: 'empty', text: 'Add a postcard to preview frames.' })); return; }
    const pv = normFrame({ ...draft, id: curId });
    const cardEl = E.postcard(sample, { frame: pv, selected: true, meta: false, edit: editMode });
    stage.append(cardEl);
    if (editMode) bindEdit(cardEl, pv);
  }
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const curItem = id => { const pv = normFrame({ ...draft, id: curId }); return D.all(pv).find(i => i.id === id); };
  function setItem(id, patch) {
    const it = curItem(id); if (!it) return;
    draft.custom = draft.custom || {};
    const base = id === 't' ? { x: it.x, y: it.y } : { x: it.x, y: it.y, size: it.size, rot: it.rot, off: !!it.off };
    const next = { ...base, ...(draft.custom[id] || {}), ...patch };
    if (!next.off) delete next.off;
    draft.custom[id] = next;
  }
  function select(id) { selId = id; stage.querySelectorAll('.editable').forEach(el => el.classList.toggle('sel', el.dataset.id === id)); drawEditPanel(); }
  function bindEdit(cardEl) {
    const shell = cardEl.querySelector('.portrait-shell'); if (!shell) return;
    shell.querySelectorAll('.editable').forEach(el => {
      const id = el.dataset.id; el.classList.toggle('sel', id === selId);
      if (refocus === id) { el.focus({ preventScroll: true }); }
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); select(id);
        const r = shell.getBoundingClientRect(), it = curItem(id); if (!it || !r.width) return;
        const sx = e.clientX, sy = e.clientY; let pend = null;
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        const mv = ev => { const x = cl(it.x + (ev.clientX - sx) / r.width * 100, -25, 105), y = cl(it.y + (ev.clientY - sy) / r.height * 100, -25, 105); el.style.left = x + '%'; el.style.top = y + '%'; pend = { x, y }; };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (pend) { setItem(id, pend); refocus = id; syncFn(); refocus = null; } };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
      el.addEventListener('focus', () => { if (selId !== id) select(id); });
      el.addEventListener('keydown', e => {
        const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k) return;
        e.preventDefault(); const it = curItem(id), st = e.shiftKey ? 5 : 1;
        setItem(id, { x: cl(it.x + k[0] * st, -25, 105), y: cl(it.y + k[1] * st, -25, 105) }); refocus = id; syncFn(); refocus = null;
      });
    });
  }
  function drawEditPanel() {
    editPanel.replaceChildren();
    if (!D) return;
    if (!editMode) {
      editPanel.append(h('button', { class: 'box-button', type: 'button', text: '✥ EDIT LAYOUT — DRAG STICKERS', on: { click: () => { editMode = true; drawPreview(); drawEditPanel(); } } }),
        h('p', { class: 'hint', text: 'Move, resize, rotate or hide the stickers, the big shape and the name label right on the preview.' }));
      return;
    }
    const it = selId ? curItem(selId) : null;
    editPanel.append(h('p', { class: 'hint', text: 'Drag any sticker to move it (arrow keys nudge the focused one; Shift = bigger steps). Changes are a draft until Save Changes.' }));
    if (!it) editPanel.append(h('p', { class: 'hint', text: 'Click a sticker to adjust its size and rotation.' }));
    else {
      const label = it.tag ? 'Name label' : it.id === 'b' ? 'Big shape' : 'Sticker · ' + it.shape;
      editPanel.append(h('span', { class: 'tiny-heading', text: 'SELECTED · ' + label.toUpperCase() }));
      if (!it.tag) {
        const sz = h('input', { type: 'range', min: 4, max: 140, value: Math.round(it.size), attrs: { 'aria-label': 'Size' } });
        const rt = h('input', { type: 'range', min: -180, max: 180, value: Math.round(it.rot), attrs: { 'aria-label': 'Rotation' } });
        sz.addEventListener('input', () => { setItem(selId, { size: +sz.value }); syncFn(); });
        rt.addEventListener('input', () => { setItem(selId, { rot: +rt.value }); syncFn(); });
        const off = h('input', { type: 'checkbox', checked: !!it.off });
        off.addEventListener('change', () => { setItem(selId, { off: off.checked }); syncFn(); });
        editPanel.append(h('div', { class: 'form-grid' }, h('label', { class: 'field' }, h('span', { text: 'SIZE' }), sz), h('label', { class: 'field' }, h('span', { text: 'ROTATION' }), rt)),
          h('label', { class: 'switch-row' }, off, h('span', {}, h('b', { text: 'Hide this element', style: 'font-size:14px' }))));
      }
      editPanel.append(h('button', { class: 'box-button', type: 'button', text: 'RESET THIS ELEMENT', on: { click: () => { if (draft.custom) delete draft.custom[selId]; syncFn(); drawEditPanel(); } } }));
    }
    editPanel.append(h('div', { class: 'row-actions' },
      h('button', { class: 'box-button', type: 'button', text: 'RESET ALL POSITIONS', on: { click: () => { draft.custom = {}; selId = null; syncFn(); drawEditPanel(); } } }),
      h('button', { class: 'box-button solid', type: 'button', text: 'DONE', on: { click: () => { editMode = false; selId = null; drawPreview(); drawEditPanel(); } } })));
  }
  function drawNotes() {
    notes.replaceChildren();
    const n = usage(curId);
    notes.append(h('p', { class: 'hint', text: 'Saving updates all ' + n + ' postcard(s) using this frame. To restyle just one postcard, duplicate this frame and assign the copy to that postcard under Postcards.' }));
    if (draft) { const r = contrast(safeHex(draft.text_color, '#17151C'), '#FAF9F5'); if (r < 4.5) notes.append(h('p', { class: 'field-err', text: 'Low contrast: text color vs. card background is ' + r.toFixed(1) + ':1 (aim for 4.5:1+).' })); }
  }
  function drawForm() {
    form.replaceChildren(); if (!draft) { form.append(h('div', { class: 'empty', text: 'No frames found.' })); return; }
    const err = h('p', { class: 'err-line', attrs: { role: 'alert' } });
    const saveBtn = h('button', { class: 'box-button solid', type: 'button', text: 'SAVE CHANGES' });
    const resetBtn = h('button', { class: 'box-button', type: 'button', text: 'RESET TO SAVED' });
    const dupBtn = h('button', { class: 'box-button', type: 'button', text: 'DUPLICATE FRAME' });
    syncFn = () => sync();
    const sync = () => { const ok = valid(); saveBtn.disabled = !(ok && dirty()); resetBtn.disabled = !dirty(); err.textContent = ok ? '' : 'Fix the highlighted fields before saving.'; drawPreview(); drawNotes(); };
    const nameIn = h('input', { type: 'text', value: draft.name, maxLength: 40, on: { input: () => { draft.name = nameIn.value; sync(); } } });
    const rows = COLOR_FIELDS.map(([k, label]) => {
      const pickEl = h('input', { type: 'color', value: safeHex(draft[k], '#000000'), attrs: { 'aria-label': label + ' color picker' } });
      const txt = h('input', { type: 'text', value: draft[k].toUpperCase(), maxLength: 7, attrs: { 'aria-label': label + ' hex value', spellcheck: 'false' } });
      pickEl.addEventListener('input', () => { draft[k] = pickEl.value.toUpperCase(); txt.value = draft[k]; txt.classList.remove('bad'); sync(); });
      txt.addEventListener('input', () => { let v = txt.value.trim(); if (v && v[0] !== '#') v = '#' + v; draft[k] = v.toUpperCase(); const ok = /^#[0-9A-F]{6}$/.test(draft[k]); txt.classList.toggle('bad', !ok); if (ok) pickEl.value = draft[k].toLowerCase(); sync(); });
      return h('div', { class: 'color-row' }, h('label', { text: label.toUpperCase() }), pickEl, txt);
    });
    const rad = h('input', { type: 'range', min: 0, max: 32, value: draft.radius, attrs: { 'aria-label': 'Corner radius' }, on: { input: () => { draft.radius = +rad.value; radOut.textContent = rad.value + 'px'; sync(); } } });
    const radOut = h('span', { class: 'hint', text: draft.radius + 'px' });
    const pat = h('select', { on: { change: () => { draft.pattern = pat.value; sync(); } } }, PATTERNS.map(p => h('option', { value: p, text: p.toUpperCase(), selected: p === draft.pattern })));
    const opt = (key, list, label) => h('label', { class: 'field' }, h('span', { text: label }),
      h('select', { on: { change: e => { draft[key] = e.target.value; sync(); } } }, list.map(v => h('option', { value: v, text: v.toUpperCase(), selected: v === draft[key] }))));
    const ht = h('input', { type: 'checkbox', checked: !!draft.halftone, on: { change: () => { draft.halftone = ht.checked; sync(); } } });
    const act = h('input', { type: 'checkbox', checked: !!draft.is_active, on: { change: () => { draft.is_active = act.checked; sync(); } } });
    saveBtn.addEventListener('click', () => busy(saveBtn, 'SAVING…', async () => {
      if (!valid()) return;
      const diff = {}; for (const k of Object.keys(draft)) if (k !== 'id' && JSON.stringify(draft[k]) !== JSON.stringify(saved[k])) diff[k] = k === 'custom' ? (D ? D.clean(draft[k]) : draft[k]) : k === 'name' ? draft[k].trim() : (k === 'bg' || COLOR_FIELDS.some(([c]) => c === k) ? draft[k].toUpperCase() : draft[k]);
      const r = await sb.from('ef_frames').update(diff).eq('id', curId).select().single();
      if (r.error) { err.textContent = errMsg(r.error); return; }
      toast('Frame saved. Postcards using it are updated.'); frames = await fetchFrames(); const f = frames.find(x => x.id === curId); pick(f); drawAll(); await syncSite();
    }));
    resetBtn.addEventListener('click', () => { draft = JSON.parse(JSON.stringify(saved)); selId = null; drawForm(); drawPreview(); drawNotes(); });
    dupBtn.addEventListener('click', () => busy(dupBtn, 'DUPLICATING…', async () => {
      const src = frames.find(x => x.id === curId); const base = (slugify(src.id) || 'frame').replace(/-copy(-\d+)?$/, '').slice(0, 50);
      let id = base + '-copy', n = 2; while (frames.some(x => x.id === id)) id = base + '-copy-' + n++;
      const row = { id, name: (src.name + ' Copy').slice(0, 40), bg: src.bg, border: src.border, accent: src.accent, text_color: src.text_color, star: src.star, shadow: src.shadow, radius: src.radius, pattern: src.pattern, layout: src.layout, decor: src.decor, big_shape: src.big_shape, halftone: src.halftone, deco1: src.deco1, deco2: src.deco2, custom: src.custom || {}, sort_order: Math.max(0, ...frames.map(x => x.sort_order)) + 1, is_active: true };
      const r = await sb.from('ef_frames').insert(row); if (r.error) { err.textContent = errMsg(r.error); return; }
      toast('Frame duplicated as “' + row.name + '”.'); frames = await fetchFrames(); pick(frames.find(x => x.id === id) || frames[0]); drawAll(); await syncSite();
    }));
    const sample = h('select', { attrs: { 'aria-label': 'Preview with postcard' }, on: { change: () => { sampleId = sample.value; drawPreview(); } } }, cards.map(c => h('option', { value: c.id, text: c.display_name, selected: c.id === sampleId })));
    form.append(h('span', { class: 'tiny-heading', text: 'EDITING FRAME · ' + saved.id }),
      h('label', { class: 'field', style: 'margin-top:12px' }, h('span', { text: 'FRAME NAME' }), nameIn), ...rows,
      h('div', { class: 'form-grid' }, h('label', { class: 'field' }, h('span', { text: 'CORNER RADIUS' }), rad, radOut), h('label', { class: 'field' }, h('span', { text: 'BACKGROUND PATTERN' }), pat)),
      h('span', { class: 'tiny-heading', text: 'Y2K DECOR', style: 'display:block;margin:14px 0 6px' }),
      h('div', { class: 'form-grid' }, opt('layout', E.LAYOUTS, 'LAYOUT (CLASSIC / COLLAGE / BOOTH)'), opt('decor', E.DECORS, 'STICKER PACK')),
      h('div', { class: 'form-grid' }, opt('big_shape', E.BIGS, 'BIG SHAPE BEHIND PHOTO')),
      h('label', { class: 'switch-row', style: 'padding:6px 0' }, ht, h('span', {}, h('b', { text: 'Halftone photo', style: 'font-size:14px' }), h('small', { text: 'Black-and-white dotted print look on the photo (also in the downloaded image).' }))),
      h('label', { class: 'switch-row', style: 'padding:6px 0' }, act, h('span', {}, h('b', { text: 'Active', style: 'font-size:14px' }), h('small', { text: 'Inactive frames are hidden from the public frame collection; postcards already using them keep their look.' }))),
      notes, err, h('div', { class: 'row-actions' }, saveBtn, resetBtn, dupBtn),
      h('label', { class: 'field', style: 'margin-top:18px' }, h('span', { text: 'PREVIEW ON' }), sample));
    sync();
  }
  function drawAll() { drawList(); drawForm(); }
  box.replaceChildren(h('h2', { text: 'Frame Studio' }),
    h('p', { class: 'hint', text: 'Edits are a draft until you press Save Changes. Photos, names and border text are never touched here.' }),
    h('div', { class: 'studio', style: 'margin-top:18px' }, h('div', {}, h('span', { class: 'tiny-heading', text: 'FRAMES' }), h('div', { style: 'margin-top:10px' }, listEl)), h('div', { class: 'panel shadow' }, form), h('div', {}, h('span', { class: 'tiny-heading', text: 'LIVE PREVIEW' }), stage, editPanel)));
  drawAll(); drawEditPanel();
}

/* ---------- COMMENTS ---------- */
async function comments(box, alive) {
  const f = { s: 'all', q: '', page: 0 }, PER = 25;
  const body = h('div');
  const sel = h('select', { attrs: { 'aria-label': 'Filter comments' }, on: { change: () => { f.s = sel.value; f.page = 0; load(); } } },
    [['all', 'ALL'], ['visible', 'VISIBLE'], ['reported', 'REPORTED'], ['pending', 'PENDING'], ['hidden', 'HIDDEN']].map(([v, l]) => h('option', { value: v, text: l })));
  let t; const search = h('input', { type: 'search', placeholder: 'Search comment text…', attrs: { 'aria-label': 'Search comments' }, on: { input: () => { clearTimeout(t); t = setTimeout(() => { f.q = search.value.trim(); f.page = 0; load(); }, 300); } } });
  async function act(btn, label, fn) { await busy(btn, label, async () => { await fn(); await load(); E.refreshGallery(); }); }
  async function load() {
    body.replaceChildren(h('p', { class: 'hint', text: 'Loading…' }));
    try {
      let q = sb.from('ef_comments').select('id,body,status,created_at,ef_profiles(display_name,slug),ef_user_profiles(display_name)', { count: 'exact' }).order('created_at', { ascending: false }).range(f.page * PER, f.page * PER + PER - 1);
      if (f.s === 'reported') { const rr = await sb.from('ef_comment_reports').select('comment_id').limit(1000); if (rr.error) throw rr.error; const ids = [...new Set(rr.data.map(x => x.comment_id))]; q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']); }
      else if (f.s !== 'all') q = q.eq('status', f.s);
      if (f.q) q = q.ilike('body', '%' + f.q.replace(/[\\%_]/g, m => '\\' + m) + '%');
      const r = await q; if (r.error) throw r.error; if (!alive()) return;
      const ids = r.data.map(x => x.id); const rep = new Map();
      if (ids.length) { const rs = await sb.from('ef_comment_reports').select('comment_id,reason').in('comment_id', ids); (rs.data || []).forEach(x => { const a = rep.get(x.comment_id) || []; a.push(x.reason || '(no reason)'); rep.set(x.comment_id, a); }); }
      if (!r.data.length) { body.replaceChildren(h('div', { class: 'empty', text: 'Nothing here — no comments match this view.' })); return; }
      const total = r.count || 0;
      body.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['WHEN', 'AUTHOR', 'POSTCARD', 'COMMENT', 'STATUS', 'ACTIONS'].map(x => h('th', { text: x })))),
        h('tbody', {}, r.data.map(c => {
          const reps = rep.get(c.id) || [], bs = [];
          const mk = (txt, cls, fn, lab) => { const b = h('button', { class: 'box-button ' + (cls || ''), type: 'button', text: txt }); b.addEventListener('click', () => fn(b)); bs.push(b); return b; };
          if (c.status === 'visible') mk('HIDE', '', b => act(b, '…', async () => { const x = await sb.rpc('ef_moderate_comment', { p_id: c.id, p_status: 'hidden' }); if (x.error) throw x.error; toast('Comment hidden.'); }));
          if (c.status === 'hidden') mk('RESTORE', '', b => act(b, '…', async () => { const x = await sb.rpc('ef_moderate_comment', { p_id: c.id, p_status: 'visible' }); if (x.error) throw x.error; toast('Comment restored.'); }));
          if (c.status === 'pending') mk('APPROVE', 'solid', b => act(b, '…', async () => { const x = await sb.rpc('ef_moderate_comment', { p_id: c.id, p_status: 'visible' }); if (x.error) throw x.error; toast('Comment approved.'); }));
          if (reps.length) mk('DISMISS REPORTS', '', b => act(b, '…', async () => { const x = await sb.from('ef_comment_reports').delete().eq('comment_id', c.id); if (x.error) throw x.error; toast('Reports cleared.'); }));
          mk('DELETE', 'danger', async b => { if (!(await confirmDialog({ title: 'Delete this comment?', text: 'It will be removed permanently. Hiding keeps a record and can be undone.', confirm: 'Delete', danger: true }))) return; await act(b, '…', async () => { const x = await sb.from('ef_comments').delete().eq('id', c.id); if (x.error) throw x.error; toast('Comment deleted.'); }); });
          return h('tr', {}, h('td', { class: 'mono', text: timeAgo(c.created_at), attrs: { title: new Date(c.created_at).toLocaleString() } }),
            h('td', { text: (c.ef_user_profiles || {}).display_name || 'Member' }), h('td', { text: (c.ef_profiles || {}).display_name || '—' }),
            h('td', { style: 'min-width:240px;white-space:pre-wrap;overflow-wrap:anywhere', text: c.body }),
            h('td', {}, statusTag(c.status), reps.length ? h('div', { class: 'hint', text: reps.length + ' report(s): ' + reps.join('; '), style: 'margin-top:6px' }) : null),
            h('td', {}, h('div', { class: 'row-actions' }, bs)));
        })))),
        h('div', { class: 'pager' },
          h('button', { class: 'box-button', type: 'button', text: '← PREV', disabled: f.page === 0, on: { click: () => { f.page--; load(); } } }),
          h('span', { class: 'hint', text: 'Page ' + (f.page + 1) + ' of ' + Math.max(1, Math.ceil(total / PER)) + ' · ' + total + ' comment(s)' }),
          h('button', { class: 'box-button', type: 'button', text: 'NEXT →', disabled: (f.page + 1) * PER >= total, on: { click: () => { f.page++; load(); } } })));
    } catch (e) { body.replaceChildren(h('div', { class: 'empty', text: 'Could not load comments: ' + errMsg(e) })); }
  }
  box.replaceChildren(h('h2', { text: 'Comment moderation' }), h('p', { class: 'hint', text: 'Hidden comments disappear for everyone except admins. Critical is not the same as inappropriate — hide only what breaks the community rules.' }),
    h('div', { class: 'toolbar' }, search, sel), body);
  load();
}

/* ---------- SETTINGS ---------- */
async function fetchAllRows(table, cols, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await sb.from(table).select(cols).order(order).range(from, from + 999);
    if (r.error) throw r.error; out.push(...r.data); if (r.data.length < 1000) break;
  }
  return out;
}
async function downloadBackup(btn) {
  await busy(btn, 'PREPARING…', async () => {
    const [profiles, frames, comments, votes, users, set] = await Promise.all([
      fetchAllRows('ef_profiles', '*', 'sort_order'), fetchAllRows('ef_frames', '*', 'sort_order'),
      fetchAllRows('ef_comments', 'id,profile_id,user_id,body,status,created_at,updated_at', 'created_at'),
      fetchAllRows('ef_votes', 'profile_id,user_id,created_at', 'created_at'),
      fetchAllRows('ef_user_profiles', 'user_id,display_name,created_at', 'created_at'),
      sb.from('ef_settings').select('*').eq('id', 1).single()]);
    const data = { app: 'ethics-frame-studio', exported_at: new Date().toISOString(), note: 'Tidak berisi email atau password. Foto ada di storage bucket ef-photos (URL ada di profiles.photo_url).',
      settings: set.data, frames, profiles, user_profiles: users, comments, votes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'ef-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Backup downloaded (' + profiles.length + ' postcards, ' + comments.length + ' comments, ' + votes.length + ' votes).');
  });
}
async function settings(box, alive) {
  const r = await sb.from('ef_settings').select('*').eq('id', 1).single(); if (r.error) throw r.error; if (!alive()) return;
  const s = { ...r.data }; const [v, c] = await Promise.all([countOf(sb.from('ef_votes').select('id', { count: 'exact', head: true })), countOf(sb.from('ef_comments').select('id', { count: 'exact', head: true }).eq('status', 'visible'))]);
  const defs = [['voting_enabled', 'Accept new votes', 'When off, the database rejects new votes — hiding the button is not what enforces it.'],
    ['comments_enabled', 'Accept new comments', 'When off, the database rejects new comments. Existing comments stay visible.'],
    ['comments_need_approval', 'Require approval for new comments', 'New member comments wait as PENDING until you approve them in Comments.'],
    ['spotlight_enabled', 'Show the Community Spotlight section', 'Hides the section and its navigation link on the public site.'],
    ['publish_immediately', 'Publish new postcards immediately', 'When off, new postcards start as DRAFT until you publish them.']];
  const checks = {}; const err = h('p', { class: 'err-line', attrs: { role: 'alert' } });
  const sort = h('select', {}, [['all', 'Studio order (as arranged in Postcards)'], ['votes', 'Most loved first'], ['comments', 'Most discussed first'], ['recent', 'Recently added first']].map(([k, l]) => h('option', { value: k, text: l, selected: k === s.default_sort })));
  const save = h('button', { class: 'box-button solid', type: 'button', text: 'SAVE SETTINGS' });
  save.addEventListener('click', () => busy(save, 'SAVING…', async () => {
    const patch = { default_sort: sort.value }; defs.forEach(([k]) => { patch[k] = checks[k].checked; });
    const x = await sb.from('ef_settings').update(patch).eq('id', 1).select().single();
    if (x.error) { err.textContent = errMsg(x.error); return; }
    err.textContent = ''; toast('Settings saved.'); await syncSite();
  }));
  box.replaceChildren(h('h2', { text: 'Voting & community settings' }),
    h('div', { class: 'metrics' }, h('div', { class: 'metric' }, h('b', { text: String(v) }), h('span', { text: 'TOTAL VOTES' })), h('div', { class: 'metric' }, h('b', { text: String(c) }), h('span', { text: 'VISIBLE COMMENTS' }))),
    h('div', { class: 'panel shadow' }, ...defs.map(([k, t, d]) => { checks[k] = h('input', { type: 'checkbox', checked: !!s[k] }); return h('label', { class: 'switch-row' }, checks[k], h('span', {}, h('b', { text: t }), h('small', { text: d }))); }),
      h('label', { class: 'field', style: 'margin-top:16px;max-width:420px' }, h('span', { text: 'DEFAULT GALLERY SORTING' }), sort), err, save),
    h('div', { class: 'panel shadow', style: 'margin-top:22px' }, h('span', { class: 'tiny-heading', text: 'BACKUP' }),
      h('p', { class: 'hint', text: 'Download all postcards, frames, comments and votes as a JSON file (no emails or passwords). Do this now and then — the free Supabase plan can pause an inactive project.' }),
      (() => { const b = h('button', { class: 'box-button', type: 'button', text: '↓ DOWNLOAD BACKUP (JSON)' }); b.addEventListener('click', () => downloadBackup(b)); return b; })()));
}

/* ---------- ACTIVITY ---------- */
function logRow(a) {
  const d = a.detail || {}, bits = [];
  if (d.name) bits.push(d.name); if (d.status) bits.push('status: ' + d.status);
  ['voting_enabled', 'comments_enabled', 'spotlight_enabled', 'comments_need_approval', 'publish_immediately', 'default_sort'].forEach(k => { if (k in d) bits.push(k + '=' + d[k]); });
  if (!bits.length && d.id) bits.push('id ' + String(d.id).slice(0, 8));
  return h('li', {}, h('span', { text: new Date(a.created_at).toLocaleString() }), h('span', { text: (a.ef_user_profiles || {}).display_name ? 'by ' + a.ef_user_profiles.display_name : '—' }), h('span', {}, h('b', { text: a.action }), ' ' + bits.join(' · ')));
}
async function activity(box, alive) {
  let page = 0; const PER = 30; const out = h('div');
  async function load() {
    const r = await sb.from('ef_audit').select('id,action,detail,created_at,ef_user_profiles(display_name)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PER, page * PER + PER - 1);
    if (r.error) { out.replaceChildren(h('div', { class: 'empty', text: 'Could not load activity: ' + errMsg(r.error) })); return; } if (!alive()) return;
    out.replaceChildren(r.data.length ? h('ul', { class: 'log' }, r.data.map(logRow)) : h('div', { class: 'empty', text: 'No activity recorded yet.' }),
      h('div', { class: 'pager' }, h('button', { class: 'box-button', type: 'button', text: '← NEWER', disabled: page === 0, on: { click: () => { page--; load(); } } }),
        h('span', { class: 'hint', text: 'Page ' + (page + 1) + ' of ' + Math.max(1, Math.ceil((r.count || 0) / PER)) }),
        h('button', { class: 'box-button', type: 'button', text: 'OLDER →', disabled: (page + 1) * PER >= (r.count || 0), on: { click: () => { page++; load(); } } })));
  }
  box.replaceChildren(h('h2', { text: 'Activity & audit history' }), h('p', { class: 'hint', text: 'Written by the database itself when an admin changes frames, postcards, settings or moderates comments. It never stores passwords or tokens, and members cannot add, edit or delete entries.' }), out);
  load();
}

E.admin = { open, close };
})();
