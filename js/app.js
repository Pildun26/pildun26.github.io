/* PILDUN 26 — renderer
   Sumber data: data/teams.json + data/participants.json + data/standings.json */

const $ = (sel) => document.querySelector(sel);

const state = { teams: null, participants: null, standings: null, showAllMatches: false, tab: 'upcoming' };

/* 🍀 Lucky Spot — posisi klasemen akhir fase grup yang dapat hadiah kejutan.
   Ubah angka posisinya di sini (1-48). */
const LUCKY = { ranks: [11, 26, 38], amount: 'Rp50.000' };

const PHASE_LABEL = {
  pre: '⏳ Menuju Kickoff',
  liga: '📊 Fase Liga',
  knockout: '🪜 Fase Knockout',
  selesai: '🏁 Turnamen Selesai',
};

/* Urutan kolom bracket (atas→bawah) supaya jalur pertemuan antar match berdekatan.
   Struktur resmi FIFA: M89=W73vW75, M90=W74vW77, M91=W76vW78, M92=W79vW80,
   M93=W83vW84, M94=W81vW82, M95=W86vW88, M96=W85vW87;
   QF: 97=89v90, 98=93v94, 99=91v92, 100=95v96; SF: 101=97v98, 102=99v100. */
const BRACKET_COLUMNS = [
  { title: '32 Besar', order: [73, 75, 74, 77, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87] },
  { title: '16 Besar', order: [89, 90, 93, 94, 91, 92, 95, 96] },
  { title: 'Perempat Final', order: [97, 98, 99, 100] },
  { title: 'Semifinal', order: [101, 102] },
  { title: 'Final', order: [104, 103] },
];

const flagUrl = (code, w = 'w40') => `https://flagcdn.com/${w}/${state.teams[code].flag}.png`;

/* Hasil undian live dari localStorage (sebelum di-commit ke participants.json) */
function drawLocalMap() {
  try {
    const s = JSON.parse(localStorage.getItem('pildun-draw-v1') || 'null');
    const map = {};
    for (const pot of [1, 2]) for (const a of (s?.assignments?.[pot] ?? [])) map[a.code] = a.person;
    return map;
  } catch (e) { return {}; }
}
let drawMap = drawLocalMap();
const holderOf = (code) => (state.participants[code] || drawMap[code] || '').trim();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function placeholderLabel(raw) {
  if (!raw || raw === 'To be announced') return 'TBD';
  let m = raw.match(/^1([A-L])$/);
  if (m) return `Juara Grup ${m[1]}`;
  m = raw.match(/^2([A-L])$/);
  if (m) return `Runner-up ${m[1]}`;
  m = raw.match(/^3([A-L]+)$/);
  if (m) return `Peringkat 3 (${m[1].split('').join('/')})`;
  return raw;
}

const fmtWIB = {
  time: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long' }),
  full: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
};

/* ===== HEADER ===== */
function renderHeader() {
  const { phase, generatedAt, kickoff } = state.standings;
  const badge = $('#phase-badge');
  badge.textContent = PHASE_LABEL[phase];
  badge.className = `phase-badge phase-${phase}`;
  $('#updated-at').textContent = `Update terakhir: ${fmtWIB.full.format(new Date(generatedAt))} WIB`;

  if (phase === 'pre') {
    const el = $('#countdown');
    el.hidden = false;
    const target = new Date(kickoff);
    const tick = () => {
      let diff = Math.max(0, target - new Date());
      const d = Math.floor(diff / 864e5);
      const h = Math.floor(diff / 36e5) % 24;
      const m = Math.floor(diff / 6e4) % 60;
      const s = Math.floor(diff / 1e3) % 60;
      $('#cd-d').textContent = d; $('#cd-h').textContent = h;
      $('#cd-m').textContent = m; $('#cd-s').textContent = s;
    };
    tick();
    setInterval(tick, 1000);
  }
}

/* ===== PAPAN HADIAH ===== */
function prizeWinnerHtml(code) {
  if (!code) return '<p class="prize-tbd">Belum ditentukan</p>';
  const t = state.teams[code];
  const holder = holderOf(code);
  return `<div class="prize-winner">
    <img src="${flagUrl(code, 'w80')}" alt="${esc(t.name)}">
    <div class="who"><strong>${esc(t.name)}</strong>
    <span>${holder ? esc(holder) : '<em style="color:var(--grey)">Tanpa Pemilik</em>'}</span></div>
  </div>`;
}

function renderPrizes() {
  const { league, knockout, groupComplete } = state.standings;
  const top3 = groupComplete ? league.slice(0, 3).map((r) => r.code) : [null, null, null];
  const semis = [...knockout.semifinalists];
  while (semis.length < 4) semis.push(null);

  const grupCards = [
    { icon: '🥇', label: 'Peringkat 1', amount: 'Rp100.000', code: top3[0] },
    { icon: '🥈', label: 'Peringkat 2', amount: 'Rp50.000', code: top3[1] },
    { icon: '🥉', label: 'Peringkat 3', amount: 'Rp50.000', code: top3[2] },
  ];
  const luckyCards = LUCKY.ranks.map((r) => ({
    icon: '🍀', label: `Lucky Spot · Posisi ${r}`, amount: LUCKY.amount, lucky: true,
    code: groupComplete ? league[r - 1].code : null,
  }));
  const koCards = [
    ...semis.map((c, i) => ({ icon: '🏅', label: `Semifinalis ${i + 1}`, amount: 'Rp100.000', code: c })),
    { icon: '🏆', label: 'JUARA DUNIA', amount: 'Rp500.000', extra: '+ Jersey (KW Super) negara pemenang 👕', code: knockout.champion, champion: true },
  ];

  const cardHtml = (c) => `
    <div class="prize-card${c.code ? ' won' : ''}${c.champion ? ' champion-card' : ''}${c.lucky ? ' lucky-card' : ''}">
      <span class="prize-icon">${c.icon}</span>
      <p class="prize-label">${c.label}</p>
      <p class="prize-amount">${c.amount}${c.extra ? `<small>${c.extra}</small>` : ''}</p>
      ${prizeWinnerHtml(c.code)}
    </div>`;

  $('#prize-grid-grup').innerHTML = grupCards.map(cardHtml).join('');
  $('#prize-grid-lucky').innerHTML = luckyCards.map(cardHtml).join('');
  $('#prize-grid-ko').innerHTML = koCards.map(cardHtml).join('');
}

/* ===== KLASEMEN ===== */
function renderLeague() {
  const { league, groupComplete } = state.standings;
  if (groupComplete) {
    $('#klasemen-sub').innerHTML = '✅ <strong>Fase grup selesai — klasemen final!</strong> Peringkat 1–3 resmi membawa pulang hadiah. 🥇🥈🥉';
  }
  $('#league-body').innerHTML = league.map((r) => {
    const t = state.teams[r.code];
    const holder = holderOf(r.code);
    const lucky = LUCKY.ranks.includes(r.rank);
    const zone = r.rank <= 3 ? ` zone-${r.rank}` : lucky ? ' zone-lucky' : '';
    const medal = r.rank === 1 ? ' 🥇' : r.rank === 2 ? ' 🥈' : r.rank === 3 ? ' 🥉' : lucky ? ' 🍀' : '';
    return `<tr class="${holder ? '' : 'no-owner'}${zone}">
      <td><span class="rank-num">${r.rank}</span></td>
      <td><div class="team-cell">
        <img src="${flagUrl(r.code)}" alt="" loading="lazy">
        <div>
          <div class="t-name">${esc(t.name)}${medal}</div>
          <div class="t-holder${holder ? ' has-holder' : ''}">${holder ? '👤 ' + esc(holder) : 'Tanpa Pemilik'}</div>
        </div>
      </div></td>
      <td>${r.played}</td>
      <td class="hide-sm">${r.w}</td>
      <td class="hide-sm">${r.d}</td>
      <td class="hide-sm">${r.l}</td>
      <td class="hide-sm">${r.gf}</td>
      <td class="hide-sm">${r.ga}</td>
      <td>${r.gd > 0 ? '+' : ''}${r.gd}</td>
      <td class="col-pts">${r.pts}</td>
    </tr>`;
  }).join('');
}

/* ===== BRACKET ===== */
function bracketTeamHtml(code, raw, score, isWinner, decided) {
  const cls = decided ? (isWinner ? ' bm-winner' : ' bm-loser') : '';
  if (!code) {
    return `<div class="bm-team"><span class="bm-name bm-placeholder">${esc(placeholderLabel(raw))}</span>
      <span class="bm-score">${score ?? ''}</span></div>`;
  }
  const t = state.teams[code];
  const holder = holderOf(code);
  return `<div class="bm-team${cls}">
    <img src="${flagUrl(code)}" alt="" loading="lazy">
    <span class="bm-name">${esc(t.name)}</span>
    ${holder ? `<span class="bm-holder">${esc(holder)}</span>` : ''}
    <span class="bm-score">${score ?? ''}</span>
  </div>`;
}

function renderBracket() {
  const byN = Object.fromEntries(state.standings.matches.map((m) => [m.n, m]));
  $('#bracket-grid').innerHTML = BRACKET_COLUMNS.map((col) => `
    <div class="bracket-round">
      <div class="bracket-round-title">${col.title}</div>
      <div class="bracket-matches">
        ${col.order.map((n) => {
          const m = byN[n];
          const decided = m.winner != null;
          const special = n === 104 ? ' bm-final' : n === 103 ? ' bm-bronze' : m.round === 7 ? ' bm-semi' : '';
          const tag = n === 104 ? '🏆 FINAL' : n === 103 ? 'Perebutan Juara 3' : '';
          return `<div class="bracket-match${special}">
            ${tag ? `<div class="bm-tag">${tag}</div>` : ''}
            <div class="bm-date">${fmtWIB.full.format(new Date(m.date))} WIB</div>
            ${bracketTeamHtml(m.home, m.homeRaw, m.hs, decided && m.winner === m.home, decided)}
            ${bracketTeamHtml(m.away, m.awayRaw, m.as, decided && m.winner === m.away, decided)}
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

/* ===== JADWAL & HASIL ===== */
function matchSideHtml(code, raw, right) {
  if (!code) {
    return `<div class="mc-side${right ? ' right' : ''}">
      <div class="mc-team"><div class="mc-name bm-placeholder">${esc(placeholderLabel(raw))}</div></div>
    </div>`;
  }
  const t = state.teams[code];
  const holder = holderOf(code);
  return `<div class="mc-side${right ? ' right' : ''}">
    <img src="${flagUrl(code)}" alt="" loading="lazy">
    <div class="mc-team">
      <div class="mc-name">${esc(t.name)}</div>
      <div class="mc-holder">${holder ? '👤 ' + esc(holder) : ''}</div>
    </div>
  </div>`;
}

function renderMatches() {
  const all = state.standings.matches;
  const played = all.filter((m) => m.hs != null).sort((a, b) => new Date(b.date) - new Date(a.date));
  const upcoming = all.filter((m) => m.hs == null).sort((a, b) => new Date(a.date) - new Date(b.date));
  const list = state.tab === 'results' ? played : upcoming;
  const LIMIT = 12;
  const shown = state.showAllMatches ? list : list.slice(0, LIMIT);

  if (!list.length) {
    $('#match-list').innerHTML = `<p class="section-sub">${state.tab === 'results' ? 'Belum ada pertandingan selesai.' : 'Tidak ada pertandingan tersisa.'}</p>`;
    $('#btn-more').hidden = true;
    return;
  }

  let lastDay = '';
  $('#match-list').innerHTML = shown.map((m) => {
    const day = fmtWIB.day.format(new Date(m.date));
    const label = day !== lastDay ? `<div class="match-day-label">${day}</div>` : '';
    lastDay = day;
    const center = m.hs != null
      ? `<div class="mc-score">${m.hs} – ${m.as}</div>`
      : `<div class="mc-time">${fmtWIB.time.format(new Date(m.date))}</div>`;
    const meta = m.group ? `Grup ${m.group} · ${m.roundName}` : m.roundName;
    return `${label}<div class="match-card">
      ${matchSideHtml(m.home, m.homeRaw, false)}
      <div class="mc-center">${center}<div class="mc-meta">${meta}</div></div>
      ${matchSideHtml(m.away, m.awayRaw, true)}
    </div>`;
  }).join('');

  const btn = $('#btn-more');
  btn.hidden = state.showAllMatches || list.length <= LIMIT;
  btn.textContent = `Tampilkan semua (${list.length})`;
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tab = btn.dataset.tab;
      state.showAllMatches = false;
      renderMatches();
    });
  });
  $('#btn-more').addEventListener('click', () => {
    state.showAllMatches = true;
    renderMatches();
  });
}

/* ===== PESERTA ===== */
function eliminationStatus() {
  /* code -> 'in' | 'out' | 'champion' */
  const { matches, knockout, groupComplete } = state.standings;
  const status = {};
  for (const code of Object.keys(state.teams)) status[code] = 'in';

  if (groupComplete) {
    const inR32 = new Set();
    matches.filter((m) => m.round === 4).forEach((m) => { if (m.home) inR32.add(m.home); if (m.away) inR32.add(m.away); });
    if (inR32.size) for (const code of Object.keys(status)) if (!inR32.has(code)) status[code] = 'out';
  }
  for (const m of matches) {
    if (m.n <= 72 || m.n === 103 || !m.winner) continue;
    const loser = m.winner === m.home ? m.away : m.home;
    if (loser) status[loser] = 'out';
  }
  if (knockout.champion) status[knockout.champion] = 'champion';
  return status;
}

function renderParticipants(filter = '') {
  const q = filter.trim().toLowerCase();
  const status = eliminationStatus();
  const codes = Object.keys(state.teams).sort((a, b) =>
    state.teams[a].group.localeCompare(state.teams[b].group) ||
    state.teams[a].name.localeCompare(state.teams[b].name));

  $('#participant-grid').innerHTML = codes.filter((code) => {
    if (!q) return true;
    const t = state.teams[code];
    return t.name.toLowerCase().includes(q) || code.toLowerCase().includes(q) || holderOf(code).toLowerCase().includes(q);
  }).map((code) => {
    const t = state.teams[code];
    const holder = holderOf(code);
    const st = status[code];
    const stHtml = st === 'champion' ? '<div class="p-status">🏆 JUARA DUNIA!</div>'
      : st === 'out' ? '<div class="p-status">❌ Tersingkir</div>' : '';
    return `<div class="p-card${holder ? '' : ' no-owner'}${st === 'out' ? ' eliminated' : ''}">
      <img src="${flagUrl(code, 'w80')}" alt="${esc(t.name)}" loading="lazy">
      <div class="p-country">${esc(t.name)}</div>
      <div class="p-group">GRUP ${t.group}</div>
      <div class="p-name">${holder ? esc(holder) : 'Belum ada pemilik'}</div>
      ${stHtml}
    </div>`;
  }).join('') || '<p class="section-sub">Tidak ketemu 😅 coba kata kunci lain.</p>';
}

/* ===== INIT ===== */
async function init() {
  const bust = `?v=${Math.floor(Date.now() / 60000)}`; // cache-bust per menit
  const [teams, participants, standings] = await Promise.all([
    fetch('data/teams.json' + bust).then((r) => r.json()),
    fetch('data/participants.json' + bust).then((r) => r.json()),
    fetch('data/standings.json' + bust).then((r) => r.json()),
  ]);
  delete participants._keterangan;
  Object.assign(state, { teams, participants, standings });

  renderHeader();
  renderPrizes();
  renderLeague();
  renderBracket();
  renderMatches();
  renderParticipants();
  setupTabs();
  $('#search-box').addEventListener('input', (e) => renderParticipants(e.target.value));

  /* Hook untuk draw.js: refresh nama pemegang setiap ada hasil undian baru */
  window.PILDUN_REFRESH = () => {
    drawMap = drawLocalMap();
    renderPrizes();
    renderLeague();
    renderBracket();
    renderMatches();
    renderParticipants($('#search-box').value);
  };
}

init().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<p style="background:#e84855;color:#fff;padding:12px;text-align:center;font-family:sans-serif">Gagal memuat data 😞 — coba refresh, atau buka lewat http server (bukan file://).</p>');
});
