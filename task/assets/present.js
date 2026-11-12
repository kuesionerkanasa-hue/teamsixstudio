(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const IMG = '../assets/img/';
const el = (tag, cls, text, st, at) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (st) e.style.cssText = st; if (at) for (const k in at) e.setAttribute(k, at[k]); return e; };
const img = (n, st, cls, d, a) => {
 if (cls && cls.indexOf('cat') === 0) { const w = el('div', 'cat-w', null, st); const hs = /(^|;)\s*height:/.test(st); const i = el('img', cls.indexOf('float') > 0 ? 'cat-i float' : 'cat-i', null, hs ? 'height:100%;width:auto' : 'width:100%;height:auto', { src: IMG + n, alt: '', draggable: 'false' }); w.append(i); if (a) { w.dataset.a = a; w.style.setProperty('--d', d || 0); } if (cls.indexOf('float') > 0) i.style.animationDelay = (-(d || 0) % 5) / 1 + 'ms'; return w; }
 const i = el('img', cls || 'abs', null, st, { src: IMG + n, alt: '', draggable: 'false' }); if (a) { i.dataset.a = a; i.style.setProperty('--d', d || 0); } return i; };
const foot = (name, cap, st, d) => { const f = el('figure', 'foot', null, st); f.dataset.a = 'pop'; f.style.setProperty('--d', d || 900); const i = el('img', null, null, null, { alt: cap, draggable: 'false' }); const ex = ['jpg', 'svg']; let k = 0; const nx = () => { if (k < ex.length) i.src = '../assets/footage/' + name + '.' + ex[k++]; }; i.onerror = nx; nx(); f.append(i, el('figcaption', null, cap)); return f; };
const TEAM = [['Fahrul Fahlevi', 'fahrul'], ['Icha Ayudiany', 'icha'], ['Jessica Amelia', 'jessica'], ['Santi Hagai Sihombing', 'santi'], ['Khairina Nor Hafifah', 'khairina'], ['Annisa Fatimah', 'anisa'], ['Arjunna', 'arjunna'], ['Arya Hendrik Pamorja', 'arya']];

/* ---------- konten utama (dari PPT) + tambahan (diberi label) ---------- */
const Q = [
 ['Mengapa transparansi dan akuntabilitas penting dalam good governance?', 4],
 ['Bagaimana etika aparatur dalam menyampaikan informasi?', 5],
 ['Apakah masyarakat berhak mengetahui penggunaan anggaran publik?', 6],
 ['Bagaimana mencegah manipulasi laporan kinerja dan keuangan pemerintah?', 7]];
const WHY = [
 ['🛡️', 'Mencegah korupsi dan penyalahgunaan wewenang', 'Ketika anggaran dan keputusan bisa dilihat publik, ruang untuk menyalahgunakan wewenang menyempit karena setiap rupiah dapat ditelusuri.', 'Anggaran pembangunan yang disembunyikan membuat warga tidak bisa mengecek apakah dana dipakai sesuai rencana.'],
 ['🤝', 'Membangun kepercayaan publik', 'Pemerintah yang terbuka dan mau mempertanggungjawabkan tindakannya lebih dipercaya, sehingga warga lebih mau mendukung program.', 'Penolakan memberi informasi menimbulkan kecurigaan, bahkan bila tidak ada yang disembunyikan.'],
 ['👀', 'Mendorong partisipasi dan pengawasan', 'Partisipasi dan pengawasan warga hanya mungkin bila informasinya tersedia: tanpa data, warga tidak bisa menilai atau memberi masukan.', 'Warga yang meminta data anggaran sebenarnya sedang menjalankan peran pengawasan.'],
 ['📈', 'Meningkatkan kinerja aparatur', 'Aparatur yang tahu kinerjanya akan dilihat dan dinilai publik terdorong bekerja lebih tertib dan bertanggung jawab.', 'Keterbukaan anggaran menjadi tolok ukur apakah pembangunan desa berjalan sesuai rencana.']];
const ETH = [
 ['Jujur', 'Menyampaikan informasi apa adanya, tanpa menutupi atau memutarbalikkan fakta.'],
 ['Akurat dan lengkap', 'Data yang diberikan benar dan tidak dipotong sehingga menyesatkan.'],
 ['Tepat waktu', 'Informasi diberikan dalam waktu yang wajar, tidak diulur-ulur.'],
 ['Tidak diskriminatif', 'Setiap warga dilayani sama, siapa pun yang meminta.'],
 ['Proporsional dalam pengecualian', 'Hanya informasi yang memang dikecualikan yang ditahan, tidak semuanya.']];
const LAW = [
 ['UUD 1945 Pasal 28F', 'Landasan konstitusional', 'Pasal 28F UUD 1945 menjadi dasar hak setiap orang untuk memperoleh dan menyampaikan informasi.'],
 ['UU No. 14 Tahun 2008', 'Keterbukaan Informasi Publik', 'Mengatur hak memperoleh informasi publik dan kewajiban badan publik menyediakannya. Pengecualian hanya yang diatur tegas undang-undang dan melalui pertimbangan konsekuensi (Pasal 17). Badan publik yang sengaja tidak menyediakan informasi wajib dan menimbulkan kerugian dapat dikenai sanksi pidana (Pasal 52).'],
 ['UU No. 6 Tahun 2014', 'Desa', 'Dasar pengelolaan dan keterbukaan penyelenggaraan pemerintahan desa, termasuk anggarannya.'],
 ['Permendagri No. 20 Tahun 2018', 'Pengelolaan Keuangan Desa', 'Aturan teknis pengelolaan keuangan desa, dasar bagi APBDes yang dapat diinformasikan kepada warga.']];
const LAYER = [
 ['Pencegahan', 'Mencegah sebelum terjadi: pengendalian intern, aturan dan prosedur yang jelas.', '#C4F26A'],
 ['Pengawasan', 'Memeriksa pelaksanaan: pengawasan internal, BPD, dan masyarakat.', '#8FD8F8'],
 ['Keterbukaan', 'Membuka informasi anggaran dan kinerja agar bisa dicek publik.', '#FFE68A'],
 ['Penindakan', 'Memberi sanksi bila terbukti terjadi pelanggaran.', '#FFC4C4']];
const WARGA = [
 ['Ajukan permintaan tertulis', 'Mengajukan permintaan informasi secara tertulis kepada petugas pengelola informasi desa.'],
 ['Ajukan keberatan tertulis', 'Mengajukan keberatan tertulis apabila permintaan ditolak atau tidak ditanggapi.'],
 ['Adukan ke BPD, Camat, Inspektorat', 'Mengadukan penolakan kepada BPD, Camat, atau Inspektorat.'],
 ['Sengketa di Komisi Informasi', 'Menyelesaikan sengketa informasi melalui Komisi Informasi.']];
const DESA = [
 ['Pasang APBDes', 'Memasang APBDes pada papan informasi dan baliho.'],
 ['Alasan tertulis', 'Memberikan alasan tertulis apabila suatu informasi dikecualikan.'],
 ['Musyawarah desa', 'Melibatkan warga melalui musyawarah desa.'],
 ['Layanan informasi', 'Menyiapkan petugas dan layanan informasi desa.']];
const REFS = [
 ['UUD 1945', 'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.', 6],
 ['UU No. 31 Tahun 1999 jo. UU No. 20 Tahun 2001', 'Pemberantasan Tindak Pidana Korupsi.', 4],
 ['UU No. 14 Tahun 2008', 'Keterbukaan Informasi Publik.', 6],
 ['PP No. 60 Tahun 2008', 'Sistem Pengendalian Intern Pemerintah.', 7],
 ['UU No. 25 Tahun 2009', 'Pelayanan Publik.', 5],
 ['UU No. 6 Tahun 2014', 'Desa.', 6],
 ['Permendagri No. 20 Tahun 2018', 'Pengelolaan Keuangan Desa.', 6]];

/* ---------- builders ---------- */
function ttl(text, st, d) { // judul skrip dengan animasi kata
 const h = el('h1', 'ttl', null, st); let i = 0;
 text.split(' ').forEach(w => { const s = el('span', 'w'); const x = el('i', null, w + ' '); x.style.setProperty('--i', i++); s.appendChild(x); h.appendChild(s); });
 h.style.setProperty('--d', d || 200); return h;
}
const hd = () => el('div', 'hd', null);
function head(s, light) { const h = el('div', 'hd'); h.append('TRANSPARANSI DAN AKUNTABILITAS', el('br'), 'DALAM GOOD GOVERNANCE'); const t = el('div', 'tm', 'TEAM 6'); s.append(h, t); }
const chip = (t, badge, st, fn, d) => { const b = el('button', 'chip', null, st); b.dataset.a = 'pop'; b.style.setProperty('--d', d || 0); b.append(document.createTextNode(t)); if (badge) b.append(el('small', null, badge)); b.addEventListener('click', e => { e.stopPropagation(); fn(); }); return b; };
const cta = (t, fn) => { const b = el('button', 'cta', t); b.addEventListener('click', e => { e.stopPropagation(); fn(); }); return b; };
const numRow = (n, t) => { const li = el('li'); li.append(el('span', 'num', String(n)), el('span', null, t)); return li; };
function clouds(s, a) { a.forEach(([x, y, w, o], i) => { const c = img('cloud.webp', `left:${x}px;top:${y}px;width:${w}px;opacity:${o || .9}`, 'cloud' + (i % 2 ? ' drift' : '')); c.style.animationDelay = (-i * 4) + 's'; s.append(c); }); }

const SL = [];
const add = (title, kw, build) => SL.push({ title, kw, build });

/* 1 COVER */
add('Cover — Transparansi dan Akuntabilitas dalam Good Governance', 'cover tim 6 teamsixstudio studi kasus about me', s => {
 clouds(s, [[60, 560, 380, .9], [1180, 120, 420, .8], [820, 600, 300, .6]]);
 const cp = img('grass.webp', 'left:0;bottom:90px;width:1600px', 'abs'); s.append(cp);
 s.append(el('div', 'hd', null)); s.lastChild.append('TRANSPARANSI DAN AKUNTABILITAS', el('br'), 'DALAM GOOD GOVERNANCE');
 s.lastChild.style.fontSize = '30px';
 const st = el('div', 'tm', 'STUDI KASUS'); st.style.fontSize = '28px'; s.append(st);
 s.append(ttl('Penolakan Pemerintah Desa Memberikan Informasi Anggaran Pembangunan', 'left:100px;top:170px;width:1000px;font-size:74px'));
 const t6 = el('div', 'abs', 'Tema 6', 'left:100px;top:590px;font:700 34px Inter;text-shadow:0 2px 6px #0006;color:#fff;z-index:4;letter-spacing:.12em;text-transform:uppercase'); t6.dataset.a = 'rise'; t6.style.setProperty('--d', 900); s.append(t6);
 s.append(img('cat-white.webp', 'right:130px;top:130px;height:640px;z-index:3', 'cat float', 500, 'rise'));
 const row = el('div', 'abs', null, 'left:100px;top:680px;display:flex;gap:16px;z-index:8'); 
 row.append(chip('👥 About Me', 'TIM', null, () => win('team'), 1000), chip('📌 Studi Kasus', 'SLIDE 3', null, () => go(2), 1100), chip('📁 Important Files', 'REFERENSI', null, () => go(9), 1200));
 s.append(row);
});
/* 2 TEAM 6 */
add('Team 6', 'team 6 anggota kelompok etika administrasi kepegawaian', s => {
 clouds(s, [[1100, 540, 420, .9], [100, 650, 360, .8]]);
 head(s); s.querySelector('.tm').style.display = 'none';
 s.append(el('div', 'tm', 'TEAM 6')); s.lastChild.style.cssText += ';color:#2B44C9';
 s.append(ttl('Team 6', 'left:100px;top:230px;font-size:240px;text-shadow:6px 6px 0 #2B44C9'));
 const sub = el('div', 'abs', 'ETIKA ADMINISTRASI DAN KEPEGAWAIAN', 'left:110px;top:520px;font:700 30px Inter;letter-spacing:.06em;color:#2B44C9;z-index:4'); sub.dataset.a = 'left'; sub.style.setProperty('--d', 900); s.append(sub);
 s.append(img('cat-read.webp', 'right:90px;top:210px;width:620px;z-index:3', 'cat float', 400, 'rise'));
 s.append(img('star.webp', 'left:640px;top:200px;width:110px', 'abs', 800, 'pop'));
 const row = el('div', 'abs', null, 'left:100px;top:600px;z-index:8'); row.append(chip('👥 Kenalan dengan anggota tim', '8', null, () => win('team'), 1100)); s.append(row);
});
/* 3 STUDI KASUS */
add('Studi Kasus', 'studi kasus masyarakat meminta informasi anggaran pembangunan desa menolak empat pertanyaan', s => {
 head(s);
 s.append(ttl('Studi Kasus', 'left:100px;top:100px;font-size:96px'));
 const b = el('div', 'body', null, 'left:100px;top:225px;width:800px;font-size:24px'); b.dataset.a = 'rise'; b.style.setProperty('--d', 500);
 b.append(el('p', null, 'Masyarakat meminta informasi mengenai anggaran pembangunan desa, tetapi pemerintah desa menolak memberikan informasi tersebut. Berdasarkan kasus ini, PPT ini akan menjawab empat pertanyaan, yaitu:'));
 s.append(b);
 const box = el('div', 'abs', null, 'left:100px;top:410px;width:900px;display:grid;gap:10px;z-index:6');
 Q.forEach(([q, sl], i) => { const bt = el('button', 'chip', null, 'text-align:left;font-size:21px;border-radius:18px;padding:8px 18px'); bt.dataset.a = 'left'; bt.style.setProperty('--d', 900 + i * 140); bt.append(el('span', 'num', String(i + 1), 'margin-right:4px'), document.createTextNode(q), el('small', null, 'SLIDE ' + sl)); bt.addEventListener('click', e => { e.stopPropagation(); go(sl - 1); }); box.append(bt); });
 s.append(box);
 s.append(img('cat-magnifier.webp', 'right:110px;top:170px;width:620px;z-index:3', 'cat float', 300, 'rise'));
 s.append(foot('balai-desa','Balai desa: pusat informasi warga','left:1060px;top:570px;width:190px',1100));
 s.append(cta('🔍 Alur kasus', () => win('case')));
});
/* 4 PENTINGNYA */
add('Pentingnya Transparansi dan Akuntabilitas dalam Good Governance', 'pentingnya mencegah korupsi kepercayaan publik partisipasi kinerja aparatur good governance', s => {
 head(s);
 s.append(ttl('Pentingnya Transparansi dan Akuntabilitas dalam Good Governance', 'left:100px;top:130px;width:620px;font-size:62px'));
 const b = el('div', 'body just', null, 'left:760px;top:130px;width:760px;font-size:22px'); b.dataset.a = 'rise'; b.style.setProperty('--d', 400);
 b.append(el('p', null, 'Good governance atau tata kelola pemerintahan yang baik menuntut penyelenggaraan pemerintahan yang terbuka, bertanggung jawab, dan melibatkan masyarakat. Dua prinsip yang menjadi fondasinya adalah transparansi dan akuntabilitas. Keduanya penting karena beberapa alasan berikut. (klik untuk detail)'));
 const g = el('div', null, null, 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px');
 WHY.forEach((w, i) => { const c = chip(w[0] + ' ' + w[1], null, 'text-align:left;border-radius:16px;font-size:19px', () => win('why', i), 700 + i * 120); g.append(c); });
 b.append(g);
 b.append(el('p', null, 'Jika dikaitkan dengan kasus, penolakan pemerintah desa memberikan informasi anggaran pembangunan menutup akses warga untuk mengetahui dan mengawasi penggunaan dana desa. Kondisi ini bertentangan dengan prinsip transparansi.', 'font-size:20px'));
 s.append(b);
 s.append(img('cat-keyboard.webp', 'left:60px;bottom:120px;width:460px;z-index:3', 'cat float', 300, 'rise'));
 s.append(foot('papan-informasi','Papan informasi APBDes','left:560px;top:590px;width:190px',1000));
 s.append(img('grass.webp', 'left:0;bottom:90px;width:1600px;z-index:1', 'abs'));
});
/* 5 ETIKA */
add('Etika Aparatur dalam Menyampaikan Informasi kepada Masyarakat', 'etika aparatur jujur akurat lengkap tepat waktu diskriminatif proporsional pengecualian UU 25 2009 pelayanan publik', s => {
 head(s);
 s.append(ttl('Etika Aparatur dalam Menyampaikan Informasi kepada Masyarakat', 'left:100px;top:130px;width:560px;font-size:56px'));
 const b = el('div', 'body just', null, 'left:100px;top:430px;width:530px;font-size:19px'); b.dataset.a = 'rise'; b.style.setProperty('--d', 400);
 b.append(el('p', null, 'Aparatur pemerintah, termasuk perangkat desa, adalah pelayan publik yang memegang informasi atas nama masyarakat. Etika dalam menyampaikan informasi mengharuskan aparatur untuk bersikap sebagai berikut.'));
 s.append(b);
 const ul = el('ul', 'stepl', null, 'position:absolute;left:800px;top:140px;z-index:5;gap:10px'); ul.dataset.a = 'rise'; ul.style.setProperty('--d', 600);
 ETH.forEach((e, i) => { const li = numRow(i + 1, e[0]); li.style.cursor = 'pointer'; li.title = e[1]; li.addEventListener('click', ev => { ev.stopPropagation(); win('eth', i); }); ul.append(li); });
 s.append(ul);
 const p = el('div', 'body just', null, 'left:800px;top:410px;width:720px;font-size:20px'); p.dataset.a = 'rise'; p.style.setProperty('--d', 900);
 p.append(el('p', null, 'Dalam kasus ini, aparatur desa seharusnya memberikan informasi yang diminta. Apabila sebagian informasi memang dikecualikan, aparatur tetap wajib menyampaikan alasan penolakan secara jelas dan tertulis, bukan menolak begitu saja. Penolakan tanpa dasar hukum yang jelas bertentangan dengan asas keterbukaan dan akuntabilitas dalam penyelenggaraan pelayanan publik (UU Nomor 25 Tahun 2009).'));
 s.append(p);
 s.append(img('cat-phone.webp', 'left:650px;top:450px;width:140px;z-index:3', 'cat float', 500, 'pop'));
 s.append(cta('✅ Uji: tolak yang benar vs salah', () => win('eth', 'test')));
});
/* 6 HAK */
add('Hak Masyarakat atas Informasi Anggaran Publik', 'hak masyarakat informasi anggaran publik UUD 28F UU 14 2008 UU 6 2014 permendagri 20 2018 pasal 17 pasal 52 pengecualian sanksi', s => {
 head(s);
 s.append(ttl('Hak Masyarakat atas Informasi Anggaran Publik', 'left:100px;top:120px;width:620px;font-size:62px'));
 const b = el('div', 'body just', null, 'left:760px;top:130px;width:760px;font-size:22px'); b.dataset.a = 'rise'; b.style.setProperty('--d', 400);
 b.append(el('p', null, 'Masyarakat berhak mengetahui penggunaan anggaran publik. Anggaran publik, termasuk anggaran desa. Hak ini memiliki dasar hukum sebagai berikut (klik untuk detail):'));
 const ul = el('div', null, null, 'display:grid;gap:10px;margin-bottom:14px');
 LAW.forEach((l, i) => ul.append(chip('⚖️ ' + l[0], null, 'text-align:left;font-size:20px;border-radius:14px', () => win('law', i), 700 + i * 120)));
 b.append(ul); s.append(b);
 const n = el('div', 'body just', null, 'left:430px;top:530px;width:1070px;font-size:19px;background:#fff9;border:3px solid #17151C;border-radius:18px;padding:14px 22px'); n.dataset.a = 'rise'; n.style.setProperty('--d', 1100);
 n.append(el('p', null, 'Hak ini tidak bersifat mutlak. Undang-undang keterbukaan informasi publik membolehkan pengecualian informasi tertentu, tetapi hanya yang secara tegas diatur undang-undang dan melalui pertimbangan konsekuensi (Pasal 17). Badan publik yang sengaja tidak menyediakan informasi yang wajib disediakan dan menimbulkan kerugian bagi orang lain juga dapat dikenai sanksi pidana (Pasal 52 UU Nomor 14 Tahun 2008).', 'margin:0'));
 s.append(n);
 s.append(img('cat-yarn.webp', 'left:110px;top:400px;width:250px;z-index:3', 'cat float', 400, 'pop'));
 s.append(cta('⚖️ Hak vs pengecualian', () => win('law', 'balance')));
});
/* 7 PENCEGAHAN */
add('Pencegahan Manipulasi Laporan Kinerja dan Laporan Keuangan Pemerintah', 'pencegahan manipulasi laporan kinerja keuangan pengawasan keterbukaan penindakan berlapis', s => {
 head(s);
 s.append(ttl('Pencegahan Manipulasi Laporan Kinerja dan Laporan Keuangan Pemerintah', 'left:100px;top:130px;width:700px;font-size:56px'));
 const b = el('div', 'body just', null, 'left:100px;top:400px;width:700px;font-size:21px'); b.dataset.a = 'rise'; b.style.setProperty('--d', 400);
 b.append(el('p', null, 'Manipulasi laporan kinerja dan laporan keuangan merusak akuntabilitas karena pertanggungjawaban yang disampaikan tidak mencerminkan keadaan yang sebenarnya. Pencegahannya memerlukan upaya berlapis sebagai berikut.'),
  el('p', null, 'Pengawasan oleh masyarakat menjadi pelengkap yang penting, tetapi hanya dapat berjalan apabila informasi tersedia. Karena itu, keterbukaan informasi anggaran yang ditolak dalam kasus ini justru menghilangkan salah satu mekanisme pencegahan manipulasi yang paling mendasar.', 'font-size:19px'));
 s.append(b);
 const st = el('div', 'abs', null, 'left:900px;top:150px;width:620px;z-index:6;display:grid;gap:12px');
 LAYER.forEach((l, i) => { const c = el('button', 'chip', null, `background:${l[2]};font-size:26px;border-radius:18px;padding:16px 24px;justify-content:space-between;margin-left:${i * 30}px`); c.dataset.a = 'right'; c.style.setProperty('--d', 700 + i * 180); c.append(el('span', null, (i + 1) + '. ' + l[0]), el('small', null, 'KLIK')); c.addEventListener('click', e => { e.stopPropagation(); win('layer', i); }); st.append(c); });
 s.append(st);
 s.append(img('cat-peek.webp', 'right:130px;top:580px;width:300px;z-index:3', 'cat float', 1000, 'pop'));
 s.append(foot('laporan-keuangan','Laporan keuangan yang diperiksa','right:560px;top:575px;width:190px',1100));
});
/* 8 PENYELESAIAN */
add('Penyelesaian Kasus', 'penyelesaian kasus permintaan tertulis keberatan BPD camat inspektorat komisi informasi APBDes papan informasi musyawarah desa', s => {
 head(s);
 s.append(ttl('Penyelesaian Kasus', 'left:100px;top:120px;font-size:100px'));
 const p = el('div', 'body', 'Atas penolakan tersebut, masyarakat dapat menempuh langkah-langkah berikut.', 'left:100px;top:270px;width:700px;font-size:22px'); p.dataset.a = 'rise'; p.style.setProperty('--d', 400); s.append(p);
 const l = el('div', 'abs', null, 'left:100px;top:340px;width:700px;display:grid;gap:10px;z-index:6');
 WARGA.forEach((w, i) => { const c = chip(w[0], 'LANGKAH ' + (i + 1), 'text-align:left;font-size:20px;border-radius:14px;justify-content:space-between', () => win('solve', i), 600 + i * 130); l.append(c); }); s.append(l);
 const p2 = el('div', 'body', 'Dari sisi pemerintah desa, langkah yang seharusnya dilakukan adalah', 'left:860px;top:270px;width:660px;font-size:22px'); p2.dataset.a = 'rise'; p2.style.setProperty('--d', 700); s.append(p2);
 const r = el('div', 'abs', null, 'left:860px;top:340px;width:660px;display:grid;gap:10px;z-index:6');
 DESA.forEach((w, i) => r.append(chip(w[0], '' + (i + 1), 'text-align:left;font-size:20px;border-radius:14px;justify-content:space-between;background:#FFE68A', () => win('solve', 4 + i), 900 + i * 130))); s.append(r);
 s.append(img('cat-lying.webp', 'left:820px;top:590px;width:400px;z-index:3', 'cat', 1200, 'rise'));
 s.append(foot('musyawarah-desa','Musyawarah desa','left:100px;top:585px;width:190px',1300));
 s.append(cta('🪜 Tangga penyelesaian', () => win('solve', 'ladder')));
});
/* 9 KESIMPULAN */
add('Kesimpulan', 'kesimpulan transparansi akuntabilitas kepercayaan publik pencegahan korupsi tidak dapat dibenarkan', s => {
 head(s);
 s.append(ttl('Kesimpulan', 'left:100px;top:120px;font-size:120px'));
 const b = el('div', 'body just', null, 'left:100px;top:300px;width:1040px;font-size:26px;line-height:1.6'); b.dataset.a = 'rise'; b.style.setProperty('--d', 500);
 b.append(el('p', null, 'Transparansi dan akuntabilitas merupakan dasar kepercayaan publik dan pencegahan korupsi dalam good governance. Aparatur wajib menyampaikan informasi secara jujur, akurat, tepat waktu, dan tanpa diskriminasi. Anggaran publik adalah hak informasi masyarakat, dengan pengecualian yang terbatas dan harus berdasarkan hukum. Manipulasi laporan dapat dicegah melalui pengendalian intern, pengawasan, keterbukaan, dan sanksi. Dengan demikian, penolakan pemerintah desa membuka informasi anggaran pembangunan tanpa dasar hukum yang jelas bukanlah tindakan yang dapat dibenarkan.'));
 s.append(b);
 s.append(img('cat-sleep.webp', 'right:60px;top:200px;width:430px;z-index:3', 'cat float', 700, 'rise'));
 s.append(img('cat-laptop.webp', 'right:90px;top:520px;width:380px;z-index:3', 'cat float', 900, 'rise'));
 s.append(cta('🧩 Rangkum 4 jawaban', () => win('sum')));
});
/* 10 PUSTAKA */
add('Daftar Pustaka', 'daftar pustaka referensi undang-undang peraturan', s => {
 head(s);
 s.append(ttl('Daftar Pustaka', 'left:100px;top:150px;width:430px;font-size:104px'));
 const l = el('div', 'abs', null, 'left:620px;top:140px;width:880px;display:grid;gap:8px;z-index:6');
 REFS.forEach((r, i) => { const c = el('button', 'chip', null, 'text-align:left;font-size:18px;border-radius:14px;font-weight:600;line-height:1.35;display:block;padding:7px 16px'); c.dataset.a = 'right'; c.style.setProperty('--d', 400 + i * 110); c.append(el('b', null, 'Republik Indonesia. ' + r[0] + '. '), document.createTextNode('tentang ' + r[1]), el('small', null, 'SLIDE ' + r[2], 'margin-left:10px')); c.addEventListener('click', e => { e.stopPropagation(); go(r[2] - 1); }); l.append(c); });
 s.append(l);
 s.append(el('div', 'note', 'Klik referensi untuk lompat ke slide yang memakainya (penautan = tambahan).', 'position:absolute;left:620px;top:730px;z-index:6;color:#fff;font-size:13px'));
 s.append(img('cat-peek.webp', 'left:150px;top:560px;width:330px;z-index:3', 'cat float', 900, 'pop'));
});
/* 11 THANKS */
add('Thank You — From Team 6', 'thank you terima kasih team 6 teamsixstudio', s => {
 clouds(s, [[80, 140, 380, .8], [1150, 560, 420, .8]]);
 s.append(img('grass.webp', 'left:0;bottom:90px;width:1600px', 'abs'));
 s.append(el('div', 'hd', 'ETIKA ADMINISTRASI DAN KEPEGAWAIAN')); s.append(el('div', 'tm', 'TEAM 6'));
 s.append(ttl('Thank You', 'left:100px;top:210px;font-size:230px'));
 const f = el('div', 'abs', 'From Team 6', 'left:110px;top:560px;font:italic 700 60px Lobster Two;color:#fff;z-index:4;text-shadow:0 2px 8px #0008'); f.dataset.a = 'rise'; f.style.setProperty('--d', 900); s.append(f);
 const h = el('div', 'abs', '#TEAMSIXSTUDIO', 'left:110px;top:650px;font:700 34px Space Mono;color:#FFD93D;z-index:4;letter-spacing:.05em;text-shadow:0 2px 8px #000a'); h.dataset.a = 'rise'; h.style.setProperty('--d', 1100); s.append(h);
 s.append(img('cat-white.webp', 'right:140px;top:120px;height:640px;z-index:3', 'cat float', 500, 'rise'));
 s.append(cta('🎉 Confetti!', () => confetti()));
});

/* ---------- jendela detail (infografis klik) ---------- */
const WIN = {};
function winShell(title, color, w, h) { return { title, color, w, h }; }
function mkList(items, onSel, icons) { const l = el('div', 'list'); items.forEach((it, i) => { const b = el('button'); if (icons) b.append(el('span', 'ic', icons[i])); b.append(document.createTextNode(it)); b.addEventListener('click', () => onSel(i, b)); l.append(b); }); return l; }
function selectable(items, icons, render) {
 const w = el('div', 'split'); const d = el('div', 'detail'); const l = mkList(items, (i, b) => { l.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); d.replaceWith(d2 = render(i)); d = d2; }, icons); let d2; w.append(l, d);
 return { w, pick: i => l.children[i].click() };
}
function detail(h, paras, caseTxt, jump) { const d = el('div', 'detail'); d.append(el('h3', null, h)); paras.forEach(p => d.append(el('p', null, p))); if (caseTxt) { const c = el('div', 'case'); c.append(el('b', null, 'DI KASUS INI'), document.createTextNode(caseTxt)); d.append(c); } if (jump) { const j = el('button', 'jump', '↗ Ke slide ' + jump); j.addEventListener('click', () => { closeAll(); go(jump - 1); }); d.append(j); } d.append(el('div', 'note', 'Penjelasan di atas adalah tambahan tim untuk presentasi.')); return d; }

function tabs(win, defs, start) {
 const t = el('div', 'win-tabs'); const body = el('div', 'win-body'); win.append(t, body); const bs = [];
 defs.forEach(([n, fn], i) => { const b = el('button', null, n); b.addEventListener('click', () => { bs.forEach(x => x.classList.toggle('on', x === b)); body.replaceChildren(fn()); body.scrollTop = 0; }); bs.push(b); t.append(b); });
 bs[start || 0].click(); return bs;
}
/* helpers for pick-lists */
function pickList(items, icons, render, start) {
 const w = el('div', 'split'); const l = el('div', 'list'); let d = el('div'); const bs = [];
 items.forEach((it, i) => { const b = el('button'); if (icons) b.append(el('span', 'ic', icons[i])); b.append(document.createTextNode(it)); b.addEventListener('click', () => { bs.forEach(x => x.classList.toggle('on', x === b)); const n = render(i); d.replaceWith(n); d = n; }); bs.push(b); l.append(b); });
 w.append(l, d); w._pick = i => bs[i].click(); setTimeout(() => bs[start || 0].click(), 0); return w;
}
const QUOTE = (t, c) => { const d = el('div'); d.append(el('p', null, t, 'font-size:22px')); return d; };

function buildWin(kind, arg) {
 const cfg = {};
 if (kind === 'team') { cfg.title = 'About Me — Team 6'; cfg.color = '#8FD8F8'; cfg.w = 1060; cfg.h = 640; cfg.build = b => {
   b.append(el('p', null, 'Kelompok 6 — Etika Administrasi dan Kepegawaian. Klik foto untuk membalik.', 'margin:0 0 14px;font-weight:600'));
   const g = el('div', null, null, 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px');
   TEAM.forEach(([n, k]) => { const c = el('button', null, null, 'border:3px solid #17151C;border-radius:16px;background:#FFE68A;padding:8px;box-shadow:4px 4px 0 #17151C;text-align:center'); const im = el('img', null, null, 'width:100%;border-radius:10px;display:block;aspect-ratio:177/254;object-fit:cover', { src: IMG + 'm-' + k + '.jpg', alt: n }); const nm = el('div', null, n, 'font-weight:800;font-size:16px;margin-top:6px;line-height:1.15;min-height:36px'); c.append(im, nm); c.addEventListener('click', () => { c.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }], { duration: 500 }); }); g.append(c); }); b.append(g); }; }
 else if (kind === 'case') { cfg.title = 'Alur Kasus (infografis tambahan)'; cfg.color = '#FFC4C4'; cfg.w = 1100; cfg.h = 560; cfg.build = b => {
   const steps = [['🏘️', 'Warga meminta', 'Masyarakat meminta informasi anggaran pembangunan desa.'], ['🚫', 'Desa menolak', 'Pemerintah desa menolak memberikan informasi.'], ['❓', '4 pertanyaan', 'Mengapa penting, bagaimana etikanya, apa hak warga, dan bagaimana mencegah manipulasi.'], ['✅', 'Jawaban', 'Penolakan tanpa dasar hukum yang jelas tidak dapat dibenarkan.']];
   const row = el('div', null, null, 'display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:stretch'); const info = el('div', 'detail', 'Klik salah satu langkah.', 'margin-top:20px;font-size:21px');
   steps.forEach((s, i) => { const c = el('button', 'chip', null, 'flex-direction:column;border-radius:20px;padding:22px 10px;font-size:20px;height:auto;opacity:0;animation:rise .6s both;animation-delay:' + i * 180 + 'ms'); c.append(el('span', null, s[0], 'font-size:54px'), document.createTextNode(s[1])); c.addEventListener('click', () => { info.textContent = s[2]; info.animate([{ opacity: 0 }, { opacity: 1 }], 300); }); row.append(c); if (i < 3) { } }); b.append(row, info); }; }
 else if (kind === 'why') { cfg.title = 'Mengapa penting? — slide 4'; cfg.color = '#C4F26A'; cfg.w = 1180; cfg.h = 600; cfg.build = b => { b.style.padding = '20px'; b.append(pickList(WHY.map(w => w[1]), WHY.map(w => w[0]), i => detail(WHY[i][1], [WHY[i][2]], WHY[i][3]))); b.firstChild._pick(arg || 0); }; }
 else if (kind === 'eth') { cfg.title = 'Etika Aparatur — slide 5'; cfg.color = '#FFD93D'; cfg.w = 1180; cfg.h = 620; cfg.build = b => { b.style.padding = '0'; const t = tabs(b.parentNode, [['5 Sikap Etis', () => { const w = pickList(ETH.map(e => e[0]), ['1', '2', '3', '4', '5'], i => detail(ETH[i][0], [ETH[i][1]], i === 4 ? 'Jika ada yang dikecualikan, alasan penolakan harus jelas dan tertulis, bukan menolak begitu saja.' : ''), arg === 'test' ? 0 : (arg || 0)); w.style.padding = '20px'; return w; }], ['Uji: Tolak yang Benar?', () => quizEth()]], arg === 'test' ? 1 : 0); b.remove(); }; }
 else if (kind === 'law') { cfg.title = 'Dasar Hukum — slide 6'; cfg.color = '#D4BAFF'; cfg.w = 1180; cfg.h = 620; cfg.build = b => { b.style.padding = '0'; tabs(b.parentNode, [['Dasar Hukum', () => { const w = pickList(LAW.map(l => l[0]), ['📜', '🔓', '🏘️', '💰'], i => detail(LAW[i][0], [LAW[i][1], LAW[i][2]]), typeof arg === 'number' ? arg : 0); w.style.padding = '20px'; return w; }], ['Hak vs Pengecualian', () => balance()]], arg === 'balance' ? 1 : 0); b.remove(); }; }
 else if (kind === 'layer') { cfg.title = 'Pencegahan Berlapis — slide 7'; cfg.color = '#FFE68A'; cfg.w = 1100; cfg.h = 560; cfg.build = b => layers(b, arg); }
 else if (kind === 'solve') { cfg.title = 'Penyelesaian Kasus — slide 8'; cfg.color = '#FFC4C4'; cfg.w = 1180; cfg.h = 620; cfg.build = b => { b.style.padding = '0'; tabs(b.parentNode, [['Tangga Warga', () => ladder()], ['Langkah Pemerintah Desa', () => { const w = pickList(DESA.map(d => d[0]), ['1', '2', '3', '4'], i => detail(DESA[i][0], [DESA[i][1]], i === 0 ? 'Warga bisa melihat anggaran tanpa harus meminta.' : '')); w.style.padding = '20px'; return w; }]], typeof arg === 'number' && arg >= 4 ? 1 : 0); b.remove(); }; }
 else if (kind === 'sum') { cfg.title = 'Rangkum 4 Jawaban — slide 9'; cfg.color = '#D4BAFF'; cfg.w = 1100; cfg.h = 600; cfg.build = b => summary(b); }
 return cfg;
}
function quizEth() {
 const w = el('div', null, null, 'padding:22px');
 const items = [['Perangkat desa menolak memberi data anggaran tanpa alasan apa pun.', false], ['Perangkat desa menolak sebagian data yang dikecualikan dan memberi alasan tertulis yang jelas.', true], ['Perangkat desa hanya melayani warga yang dikenalnya.', false], ['Perangkat desa memberi data lengkap tepat waktu sesuai permintaan.', true]];
 w.append(el('p', null, 'Mana yang sesuai etika penyampaian informasi? Pilih satu per satu.', 'font-weight:700;margin:0 0 12px'));
 items.forEach(([t, ok]) => { const b = el('button', 'chip', t, 'width:100%;text-align:left;margin-bottom:10px;border-radius:14px;font-size:19px'); const r = el('div', 'note', '', 'margin:0 0 10px'); b.addEventListener('click', () => { b.style.background = ok ? '#C4F26A' : '#FF9EA8'; r.textContent = ok ? '✔ Sesuai etika.' : '✘ Tidak sesuai: bertentangan dengan keterbukaan dan akuntabilitas.'; }); w.append(b, r); });
 w.append(el('div', 'note', 'Kuis ini tambahan tim berdasarkan isi slide 5.')); return w;
}
function balance() {
 const w = el('div', null, null, 'padding:22px'); w.append(el('p', null, 'Geser untuk melihat: hak masyarakat luas, pengecualian sempit.', 'font-weight:700;margin:0 0 12px'));
 const bar = el('div', null, null, 'display:flex;height:90px;border:3px solid #17151C;border-radius:16px;overflow:hidden;font-weight:800'); const a = el('div', null, 'HAK untuk tahu', 'flex:9;background:#C4F26A;display:grid;place-items:center;transition:flex .5s'); const c = el('div', null, 'Pengecualian', 'flex:1;background:#FFC4C4;display:grid;place-items:center;transition:flex .5s;font-size:13px;text-align:center');
 bar.append(a, c); const txt = el('div', 'detail', 'Klik salah satu sisi.', 'margin-top:16px'); 
 a.style.cursor = c.style.cursor = 'pointer';
 a.onclick = () => { a.style.flex = 9; c.style.flex = 1; txt.textContent = 'Pada prinsipnya informasi anggaran publik terbuka bagi masyarakat (UUD 1945 Pasal 28F; UU No. 14 Tahun 2008; UU No. 6 Tahun 2014; Permendagri No. 20 Tahun 2018).'; };
 c.onclick = () => { c.style.flex = 4; a.style.flex = 6; txt.textContent = 'Pengecualian hanya yang secara tegas diatur undang-undang dan melalui pertimbangan konsekuensi (Pasal 17). Badan publik yang sengaja tidak menyediakan informasi wajib dan menimbulkan kerugian dapat dikenai sanksi pidana (Pasal 52 UU No. 14 Tahun 2008).'; };
 w.append(bar, txt, el('div', 'note', 'Lebar bar hanya ilustrasi, bukan data.')); return w;
}
function layers(b, start) {
 b.append(el('p', null, 'Upaya berlapis: klik lapisan untuk melihat penjelasannya.', 'margin:0 0 12px;font-weight:700'));
 const st = el('div', null, null, 'display:grid;gap:10px'); const info = el('div', 'detail', '', 'margin-top:14px');
 LAYER.forEach((l, i) => { const x = el('button', 'chip', null, `background:${l[2]};width:${100 - i * 8}%;margin-left:${i * 4}%;justify-content:center;font-size:24px;border-radius:16px;opacity:0;animation:rise .5s both;animation-delay:${i * 150}ms`); x.textContent = (i + 1) + '. ' + l[0]; x.addEventListener('click', () => { info.replaceChildren(el('h3', null, l[0]), el('p', null, l[1])); info.animate([{ opacity: 0 }, { opacity: 1 }], 300); }); st.append(x); });
 b.append(st, info); st.children[start || 0].click();
 b.append(el('div', 'note', 'Penjelasan tiap lapisan adalah tambahan tim; nama keempat lapisan berasal dari slide.'));
}
function ladder() {
 const w = el('div', null, null, 'padding:22px'); w.append(el('p', null, 'Naik tangga langkah warga. Klik anak tangga untuk melihat apa yang dilakukan.', 'font-weight:700;margin:0 0 12px'));
 const g = el('div', null, null, 'display:flex;align-items:flex-end;gap:10px;height:230px'); const info = el('div', 'detail', 'Klik anak tangga.', 'margin-top:14px;font-size:21px');
 WARGA.forEach((s, i) => { const c = el('button', 'chip', null, `flex:1;height:${60 + i * 55}px;border-radius:14px 14px 0 0;flex-direction:column;justify-content:flex-end;font-size:17px;text-align:center;background:#FFE68A`); c.append(el('span', null, String(i + 1), 'font:italic 700 40px Lobster Two'), document.createTextNode(s[0])); c.addEventListener('click', () => { info.textContent = s[1]; c.animate([{ transform: 'translateY(-14px)' }, { transform: 'none' }], 300); }); g.append(c); });
 w.append(g, info); return w;
}
function summary(b) {
 b.append(el('p', null, 'Klik tiap kartu untuk melihat jawaban atas pertanyaan di slide 3.', 'margin:0 0 12px;font-weight:700'));
 const A = ['Penting untuk mencegah korupsi, membangun kepercayaan, mendorong partisipasi dan pengawasan, serta meningkatkan kinerja aparatur.', 'Jujur, akurat dan lengkap, tepat waktu, tidak diskriminatif, dan proporsional dalam pengecualian.', 'Ya. Anggaran publik adalah hak informasi masyarakat, dengan pengecualian terbatas yang berdasarkan hukum.', 'Melalui pencegahan, pengawasan, keterbukaan, dan penindakan.'];
 const g = el('div', null, null, 'display:grid;grid-template-columns:1fr 1fr;gap:14px');
 Q.forEach(([q], i) => { const c = el('button', 'chip', null, 'border-radius:18px;padding:16px;display:block;text-align:left;font-size:19px;line-height:1.3;height:auto'); c.append(el('span', 'num', String(i + 1), 'margin-right:8px'), document.createTextNode(q)); let open = false; c.addEventListener('click', () => { open = !open; c.replaceChildren(el('span', 'num', String(i + 1), 'margin-right:8px'), document.createTextNode(open ? A[i] : q)); c.style.background = open ? '#C4F26A' : '#fff'; }); g.append(c); });
 b.append(g);
}

/* ---------- engine ---------- */
const stage = $('#stage'); let cur = -1, busy = false, wins = [];
const slides = []; const TB = ['#46642d', '#A89C5C', '#3F4FA0', '#829C4D', '#D3B93B', '#D4C07A', '#7FB0C8', '#D4A5A5', '#8F7FA5', '#9A8570', '#46642d'];
const BGC = ['#4F70FF', '#FFE68A', '#4F70FF', '#C4F26A', '#FFD93D', '#FFE68A', '#8FD8F8', '#FFC4C4', '#D4BAFF', '#E3C79C', '#4F70FF'];
SL.forEach((d, i) => { const s = el('section', 'slide s' + (i + 1)); s.dataset.i = i; d.build(s); stage.insertBefore(s, $('#tb')); slides.push(s); });

const FX = [
 (n, o) => [n.animate({ clipPath: ['circle(0% at 50% 50%)', 'circle(80% at 50% 50%)'] }, { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)' }), null],
 (n, o) => [n.animate({ clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] }, { duration: 800, easing: 'cubic-bezier(.7,0,.2,1)' }), null],
 (n, o) => [n.animate({ transform: ['rotateY(-90deg)', 'none'], opacity: [0, 1] }, { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' }), o.animate({ transform: ['none', 'rotateY(90deg)'], opacity: [1, 0] }, { duration: 800 })],
 (n, o) => [n.animate({ clipPath: ['polygon(0 0,0 0,0 100%,0 100%)', 'polygon(0 0,130% 0,100% 100%,0 100%)'] }, { duration: 850, easing: 'cubic-bezier(.7,0,.2,1)' }), null],
 (n, o) => [n.animate({ transform: ['scale(1.4)', 'none'], opacity: [0, 1], filter: ['blur(18px)', 'blur(0)'] }, { duration: 850, easing: 'ease-out' }), o.animate({ transform: ['none', 'scale(.7)'], opacity: [1, 0] }, { duration: 700 })],
 (n, o) => [n.animate({ clipPath: ['inset(100% 0 0 0)', 'inset(0)'] }, { duration: 800, easing: 'cubic-bezier(.7,0,.2,1)' }), null]
];
const NAMES = ['iris', 'wipe', 'flip 3D', 'diagonal', 'zoom-blur', 'naik'];
function sparkle(x, y) { const f = $('#fx'); for (let i = 0; i < 14; i++) { const p = el('div', null, null, `position:absolute;left:${x}px;top:${y}px;width:10px;height:10px;border-radius:50%;background:${['#FFD93D', '#fff', '#C4F26A', '#FFC4C4'][i % 4]}`); f.append(p); const a = Math.random() * 6.28, d = 80 + Math.random() * 160; p.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0)`, opacity: 0 }], { duration: 700 + Math.random() * 400 }).onfinish = () => p.remove(); } }
function confetti() { const f = $('#fx'); for (let i = 0; i < 90; i++) { const p = el('div', null, null, `position:absolute;left:${Math.random() * 1600}px;top:-20px;width:12px;height:18px;background:${['#FFD93D', '#fff', '#C4F26A', '#FFC4C4', '#8FD8F8', '#D4BAFF'][i % 6]};border-radius:2px`); f.append(p); p.animate([{ transform: 'rotate(0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 300}px,980px) rotate(${Math.random() * 900}deg)`, opacity: 1 }], { duration: 1800 + Math.random() * 1600, easing: 'cubic-bezier(.3,.6,.5,1)', delay: Math.random() * 500 }).onfinish = () => p.remove(); } }
function go(n, fromUser) {
 n = Math.max(0, Math.min(slides.length - 1, n)); if (n === cur || busy) return; closeAll(true);
 const nw = slides[n], old = cur >= 0 ? slides[cur] : null; const dir = n > cur;
 document.documentElement.style.setProperty('--bg', BGC[n]); document.documentElement.style.setProperty('--tb', TB[n]);
 nw.classList.add('cur'); nw.classList.remove('play'); void nw.offsetWidth;
 if (old) { busy = true; nw.style.zIndex = 2; old.style.zIndex = 1; const fx = FX[(n + (dir ? 0 : 3)) % FX.length](nw, old); toast(NAMES[(n + (dir ? 0 : 3)) % FX.length]); nw.classList.add('play'); Promise.all(fx.filter(Boolean).map(a => a.finished)).catch(() => 0).then(() => { old.classList.remove('cur', 'play'); old.style.zIndex = nw.style.zIndex = ''; busy = false; }); sparkle(800, 450); }
 else nw.classList.add('play');
 cur = n; ui();
 if (location.hash !== '#' + (n + 1)) history.replaceState(null, '', '#' + (n + 1));
}
function ui() { $('#bar').style.width = ((cur + 1) / slides.length * 100) + '%'; $('#prev').disabled = cur === 0; $('#next').disabled = cur === slides.length - 1; document.querySelectorAll('#dots button').forEach((b, i) => b.classList.toggle('on', i === cur)); document.querySelectorAll('.tile').forEach((t, i) => t.classList.toggle('cur', i === cur)); document.title = (cur + 1) + '/' + slides.length + ' · ' + SL[cur].title + ' — Team 6'; }
let tt; function toast(t) { const e = $('#toast'); e.textContent = '✨ ' + t; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 900); }
const next = () => go(cur + 1), prev = () => go(cur - 1);

/* windows */
const layer = $('#winlayer');
function win(kind, arg) {
 closeAll(true); const cfg = buildWin(kind, arg); const w = el('div', 'win', null, `left:${(1600 - cfg.w) / 2}px;top:${Math.max(20, (790 - cfg.h) / 2)}px;width:${cfg.w}px;height:${cfg.h}px;--wc:${cfg.color}`);
 const bar = el('div', 'win-bar'); const x = el('button', 'win-x', '✕', null, { 'aria-label': 'Tutup' }); bar.append(el('div', 'win-ttl', cfg.title), x);
 const body = el('div', 'win-body'); w.append(bar, body); layer.append(w); layer.classList.add('has'); cfg.build(body);
 x.addEventListener('click', () => closeAll()); 
 let sx, sy, ox, oy, drag = false; bar.addEventListener('pointerdown', e => { if (e.target === x) return; drag = true; sx = e.clientX; sy = e.clientY; ox = w.offsetLeft; oy = w.offsetTop; bar.setPointerCapture(e.pointerId); });
 bar.addEventListener('pointermove', e => { if (!drag) return; const k = scale(); w.style.left = ox + (e.clientX - sx) / k + 'px'; w.style.top = oy + (e.clientY - sy) / k + 'px'; }); bar.addEventListener('pointerup', () => drag = false);
 layer.onclick = e => { if (e.target === layer) closeAll(); };
 wins = [w]; x.focus();
}
function closeAll(quick) { wins.forEach(w => { if (quick) w.remove(); else { w.classList.add('closing'); setTimeout(() => w.remove(), 200); } }); wins = []; layer.classList.remove('has'); layer.onclick = null; $('#menu').classList.remove('show'); $('#help').classList.remove('show'); }

/* scaling */
let K = 1; const scale = () => K;
function fit() { K = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(-50%,-50%) scale(${K})`; }
addEventListener('resize', fit); fit();

/* taskbar */
const dots = $('#dots'); slides.forEach((_, i) => { const b = el('button', null, null, null, { 'aria-label': 'Slide ' + (i + 1), title: (i + 1) + '. ' + SL[i].title }); b.addEventListener('click', () => go(i)); dots.append(b); });
const menu = $('#menu'); const grid = menu.querySelector('.grid'); slides.forEach((_, i) => { const t = el('button', 'tile', null, '--c:' + BGC[i]); t.append(el('span', 'n', 'SLIDE ' + String(i + 1).padStart(2, '0')), el('b', null, SL[i].title)); t.addEventListener('click', () => { closeAll(true); go(i); }); grid.append(t); });
$('#startbtn').addEventListener('click', e => { e.stopPropagation(); const sh = menu.classList.contains('show'); closeAll(true); if (!sh) menu.classList.add('show'); });
$('#prev').addEventListener('click', e => { e.stopPropagation(); prev(); }); $('#next').addEventListener('click', e => { e.stopPropagation(); next(); });
$('#fsbtn').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => 0); });
$('#laserbtn').addEventListener('click', () => { document.body.classList.toggle('laser'); toast(document.body.classList.contains('laser') ? 'laser ON (L)' : 'laser OFF'); });
$('#helpbtn').addEventListener('click', () => $('#help').classList.toggle('show'));
function clock() { const d = new Date(); let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; $('#clock').textContent = h + ':' + String(m).padStart(2, '0') + ' ' + ap + '\n' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); } clock(); setInterval(clock, 20000);
$('#clock').style.whiteSpace = 'pre';

/* search */
const si = $('#q'), sr = $('#searchres'); let sel = 0, hits = [];
function esc(s) { return s; }
function doSearch() { const q = si.value.trim().toLowerCase(); sr.replaceChildren(); hits = []; if (!q) { sr.classList.remove('show'); return; }
 SL.forEach((d, i) => { const hay = (d.title + ' ' + d.kw + ' ' + slides[i].textContent).toLowerCase(); const idx = hay.indexOf(q); if (idx >= 0) hits.push([i, idx, hay]); });
 hits.sort((a, b) => (SL[a[0]].title.toLowerCase().includes(q) ? 0 : 1) - (SL[b[0]].title.toLowerCase().includes(q) ? 0 : 1) || a[0] - b[0]);
 if (!hits.length) sr.append(el('div', 'none', 'Tidak ditemukan.')); hits.forEach(([i, idx, hay], k) => { const b = el('button', k === 0 ? 'sel' : ''); const t = el('b'); t.textContent = (i + 1) + '. ' + SL[i].title; const sn = el('small'); const a = Math.max(0, idx - 30), z = idx + q.length + 50; sn.append('…' + hay.slice(a, idx), (() => { const m = el('mark'); m.textContent = hay.slice(idx, idx + q.length); return m; })(), hay.slice(idx + q.length, z) + '…'); b.append(t, sn); b.addEventListener('click', () => { go(i); sr.classList.remove('show'); si.value = ''; si.blur(); }); sr.append(b); });
 sel = 0; sr.classList.add('show'); }
si.addEventListener('input', doSearch);
si.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && hits[0]) { const t = hits[sel] || hits[0]; go(t[0]); sr.classList.remove('show'); si.value = ''; si.blur(); } if (e.key === 'Escape') { si.value = ''; sr.classList.remove('show'); si.blur(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(hits.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); [...sr.querySelectorAll('button')].forEach((b, i) => b.classList.toggle('sel', i === sel)); } });
document.addEventListener('click', e => { if (!e.target.closest('#search,#searchres')) sr.classList.remove('show'); });

/* keyboard, swipe, laser */
addEventListener('keydown', e => {
 if (e.target.tagName === 'INPUT') return; const k = e.key;
 if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.target.closest('button'))) { e.preventDefault(); next(); }
 else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
 else if (k === 'Home') go(0); else if (k === 'End') go(slides.length - 1);
 else if (k === 'Escape') closeAll(); else if (k === 'f' || k === 'F') $('#fsbtn').click(); else if (k === 'l' || k === 'L') $('#laserbtn').click();
 else if (k === 'o' || k === 'O' || k === 'Tab' && false) $('#startbtn').click(); else if (k === '/' || k === 's' && e.ctrlKey) { e.preventDefault(); si.focus(); } else if (k === '?' || k === 'h' || k === 'H') $('#helpbtn').click();
 else if (/^[1-9]$/.test(k)) go(+k - 1); else if (k === '0') go(9);
});
let tx = null, ty = 0; stage.addEventListener('touchstart', e => { if (e.target.closest('.win,#tb,#menu')) { tx = null; return; } tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
stage.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) dx < 0 ? next() : prev(); tx = null; }, { passive: true });
stage.addEventListener('pointermove', e => { if (!document.body.classList.contains('laser')) return; const r = stage.getBoundingClientRect(); const l = $('#laser'); l.style.left = (e.clientX - r.left) / K + 'px'; l.style.top = (e.clientY - r.top) / K + 'px'; });
stage.addEventListener('click', e => { if (e.target.closest('button,#tb,.win,#menu,#help,input,li,a')) return; const r = stage.getBoundingClientRect(); (e.clientX - r.left) / r.width > .5 ? next() : prev(); });

const h = parseInt(location.hash.slice(1), 10); go(h >= 1 && h <= slides.length ? h - 1 : 0);
window.__present = { go, win, slides: () => slides.length };
})();
