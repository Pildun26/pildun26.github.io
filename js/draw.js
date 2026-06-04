/* PILDUN 26 — Spinwheel Undian
   Pot 1: 25 orang ↔ 25 tim unggulan · Pot 2: 15 orang ↔ 23 tim hore-hore.
   Progres tersimpan di localStorage. Param debug: ?demo=1 (auto-spin cepat, tanpa save). */

const $ = (s) => document.querySelector(s);

const POTS = {
  1: {
    label: 'Pot 1 — Tim Unggulan',
    people: ['Harry', 'Bintang', 'Ade', 'Bang Anto', 'Deila', 'Irsha', 'Melvin', 'Dwi', 'Yusran', 'Jepe',
      'Rommy Adams', 'Bang Adit', 'Indramuf', 'Bang Dedy', 'Ahmad', 'Luqman', 'Bang Ade Armando', 'Irwan',
      'Yana', 'Om Goen', 'Ryan', 'Azer', 'Bima', 'Fajar Kultur', 'Faiz'],
    teams: ['FRA', 'ESP', 'ARG', 'ENG', 'NED', 'GER', 'POR', 'BRA', 'SEN', 'SWE', 'BEL', 'MEX', 'NOR',
      'JPN', 'USA', 'COL', 'CRO', 'SUI', 'MAR', 'URU', 'SCO', 'TUR', 'IRN', 'AUT', 'KOR'],
  },
  2: {
    label: 'Pot 2 — Tim Hore-hore',
    people: ['Bung Ben', 'Azis', 'Ito', 'Agam', 'Putra', 'Helen', 'Domi', 'Irfan BTW', 'Mutma', 'Eno',
      'Safa', 'Ikhsan', 'Lee', 'Bang Max', 'Ibod'],
    teams: ['CAN', 'AUS', 'CIV', 'EGY', 'GHA', 'COD', 'PAR', 'ALG', 'BIH', 'RSA', 'ECU', 'HAI', 'UZB',
      'TUN', 'CZE', 'PAN', 'KSA', 'IRQ', 'NZL', 'CPV', 'QAT', 'JOR', 'CUW'],
  },
};

const COLORS = ['#29b56a', '#e84855', '#3f8efc', '#9b5de5', '#b69769'];
const STORAGE_KEY = 'pildun-draw-v1';
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';

let TEAMS = null; // dari data/teams.json
let state = {
  pot: 1,
  // assignments[pot] = [{person, code}] urut sesuai giliran
  assignments: { 1: [], 2: [] },
};
let spinning = false;
let rotation = 0; // radian

function load() {
  if (DEMO) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.assignments) state = saved;
    }
  } catch (e) { /* abaikan */ }
}
function save() {
  if (DEMO) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const cfg = () => POTS[state.pot];
const done = () => state.assignments[state.pot];
const remainingTeams = () => cfg().teams.filter((c) => !done().some((a) => a.code === c));
const currentPerson = () => cfg().people[done().length] ?? null;

/* ===== RODA ===== */
const canvas = $('#wheel');
const ctx = canvas.getContext('2d');
const SIZE = canvas.width;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 14;

function drawWheel() {
  const teams = remainingTeams();
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (!teams.length) {
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a8a86';
    ctx.font = 'bold 40px "Noto Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pot selesai 🎉', CENTER, CENTER + 14);
    return;
  }
  const seg = (Math.PI * 2) / teams.length;
  teams.forEach((code, i) => {
    const start = rotation + i * seg;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, RADIUS, start, start + seg);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // label kode tim
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(start + seg / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0a0a0a';
    ctx.font = `bold ${teams.length > 20 ? 30 : 36}px "Noto Sans", sans-serif`;
    ctx.fillText(code, RADIUS - 24, 11);
    ctx.restore();
  });
  // ring luar
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#b69769';
  ctx.lineWidth = 8;
  ctx.stroke();
}

/* Sudut akhir supaya segmen index `i` mendarat di pointer (atas, -90°) */
function targetRotation(index, count) {
  const seg = (Math.PI * 2) / count;
  const pointer = -Math.PI / 2;
  const base = pointer - (index + 0.5) * seg;
  const extraSpins = (DEMO ? 1 : 6 + Math.floor(Math.random() * 3)) * Math.PI * 2;
  // mulai dari rotation sekarang, selalu maju
  const current = rotation % (Math.PI * 2);
  let delta = base - current;
  while (delta > 0) delta -= Math.PI * 2;
  return rotation + delta + extraSpins;
}

function spin() {
  if (spinning) return;
  const person = currentPerson();
  const teams = remainingTeams();
  if (!person || !teams.length) return;

  spinning = true;
  $('#btn-spin').disabled = true;

  const winnerIdx = Math.floor(Math.random() * teams.length);
  const winner = teams[winnerIdx];
  const from = rotation;
  const to = targetRotation(winnerIdx, teams.length);
  const dur = DEMO ? 300 : 4800;
  const t0 = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - t0) / dur);
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    rotation = from + (to - from) * ease;
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      spinning = false;
      done().push({ person, code: winner });
      save();
      showResult(person, winner);
      render();
    }
  }
  requestAnimationFrame(frame);
}

/* ===== MODAL HASIL ===== */
function showResult(person, code) {
  const t = TEAMS[code];
  const div = document.createElement('div');
  div.className = 'modal-backdrop';
  div.innerHTML = `
    <div class="modal-card">
      <img src="https://flagcdn.com/w160/${t.flag}.png" alt="${t.name}">
      <div class="m-team">${t.name}</div>
      <div class="m-arrow">jatuh ke tangan</div>
      <div class="m-person">${person} 🎉</div>
      <button>Lanjut →</button>
    </div>`;
  div.querySelector('button').addEventListener('click', () => div.remove());
  document.body.appendChild(div);
}

/* ===== RENDER ===== */
function render() {
  const c = cfg();
  const a = done();

  // tabs progress
  $('#prog-1').textContent = `${state.assignments[1].length}/${POTS[1].people.length}`;
  $('#prog-2').textContent = `${state.assignments[2].length}/${POTS[2].people.length}`;
  document.querySelectorAll('.pot-tab').forEach((b) =>
    b.classList.toggle('active', Number(b.dataset.pot) === state.pot));

  // giliran
  const person = currentPerson();
  $('#turn-name').textContent = person ?? 'Pot selesai! 🎉';
  $('#turn-count').textContent = person
    ? `Orang ke-${a.length + 1} dari ${c.people.length} · sisa ${remainingTeams().length} negara di roda`
    : `Semua ${c.people.length} orang sudah dapat negara.`;
  $('#btn-spin').disabled = !person || spinning;
  $('#btn-undo').hidden = !a.length;

  // daftar hasil + antrean
  $('#panel-title').textContent = `HASIL — ${c.label.toUpperCase()}`;
  $('#panel-sub').textContent = state.pot === 2
    ? `${c.teams.length} negara untuk ${c.people.length} orang — ${c.teams.length - c.people.length} negara akan tanpa pemilik.`
    : `${c.teams.length} negara untuk ${c.people.length} orang.`;
  $('#result-list').innerHTML = c.people.map((p, i) => {
    const got = a[i];
    if (got) {
      const t = TEAMS[got.code];
      return `<div class="result-row">
        <span class="rr-num">${i + 1}</span>
        <img src="https://flagcdn.com/w40/${t.flag}.png" alt="">
        <span class="rr-person">${p}</span>
        <span class="rr-team">${t.name}</span>
      </div>`;
    }
    return `<div class="result-row pending${i === a.length ? ' current' : ''}">
      <span class="rr-num">${i + 1}</span>
      <span class="rr-person">${p}</span>
      <span class="rr-team">${i === a.length ? '⬅ giliran berikutnya' : 'menunggu'}</span>
    </div>`;
  }).join('');

  drawWheel();
}

/* ===== EXPORT & RESET ===== */
function exportJson() {
  const all = { ...state.assignments[1].reduce((o, a) => (o[a.code] = a.person, o), {}),
    ...state.assignments[2].reduce((o, a) => (o[a.code] = a.person, o), {}) };
  const out = { _keterangan: 'Hasil undian PILDUN 26. Kosong = tanpa pemilik.' };
  for (const code of Object.keys(TEAMS)) out[code] = all[code] ?? '';
  const text = JSON.stringify(out, null, 2) + '\n';
  const area = $('#export-area');
  area.hidden = false;
  area.value = text;
  area.select();
  navigator.clipboard?.writeText(text).then(
    () => { $('#btn-export').textContent = '✅ Tersalin! Paste ke data/participants.json'; },
    () => { $('#btn-export').textContent = '⚠ Salin manual dari kotak di bawah'; });
}

function reset() {
  if (!confirm('Yakin reset SEMUA hasil undian? Tidak bisa dibatalkan.')) return;
  state = { pot: 1, assignments: { 1: [], 2: [] } };
  rotation = 0;
  save();
  render();
}

function undo() {
  if (spinning || !done().length) return;
  const last = done().pop();
  save();
  render();
  alert(`Dibatalkan: ${last.person} ↩ (negara kembali ke roda)`);
}

/* ===== INIT ===== */
async function init() {
  TEAMS = await fetch('data/teams.json').then((r) => r.json());
  load();

  document.querySelectorAll('.pot-tab').forEach((b) =>
    b.addEventListener('click', () => {
      if (spinning) return;
      state.pot = Number(b.dataset.pot);
      save();
      render();
    }));
  $('#btn-spin').addEventListener('click', spin);
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-export').addEventListener('click', exportJson);
  $('#btn-reset').addEventListener('click', reset);

  render();
  if (DEMO) spin();
}

init().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<p style="background:#e84855;color:#fff;padding:12px;text-align:center">Gagal memuat data tim — buka lewat http server.</p>');
});
