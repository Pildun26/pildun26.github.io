/* PILDUN 26 — Undian Spinwheel (section #undian di halaman utama)
   Alur per pot: 1) ACAK urutan giliran (wajib, fair) → 2) tiap orang PUTAR roda negara.
   - Hasil tersimpan di localStorage (aman dari reload) & langsung tampil di section Peserta.
   - Auto-lock kalau data/participants.json sudah terisi (hasil sudah di-commit).
   - DRAW_ENABLED = false untuk mematikan fitur secara permanen.
   - Param debug: ?demo=1 (auto acak+spin cepat, tanpa save) · ?undian=force (buka paksa saat terkunci). */

(() => {
  const DRAW_ENABLED = true; // ⬅ set false setelah undian selesai & hasil di-commit

  const q = (s) => document.querySelector(s);

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
  const DEMO = ['1', '2'].includes(params.get('demo')); // 1 = tanpa save, 2 = dengan save (tes)
  const DEMO_SAVE = params.get('demo') === '2';
  const FORCE = params.get('undian') === 'force';

  let TEAMS = null;
  let st = {
    pot: 1,
    order: { 1: null, 2: null },        // urutan giliran hasil acak (null = belum diacak)
    assignments: { 1: [], 2: [] },      // [{person, code}] urut giliran
  };
  let spinning = false;
  let shuffling = false;
  let rotation = 0;

  function load() {
    if (DEMO && !DEMO_SAVE) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.assignments) st = { order: { 1: null, 2: null }, ...saved };
      }
    } catch (e) { /* abaikan */ }
  }
  function save() {
    if (DEMO && !DEMO_SAVE) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  }
  function refreshMainPage() {
    if (window.PILDUN_REFRESH) window.PILDUN_REFRESH();
  }

  const cfg = () => POTS[st.pot];
  const order = () => st.order[st.pot];
  const done = () => st.assignments[st.pot];
  const remainingTeams = () => cfg().teams.filter((c) => !done().some((a) => a.code === c));
  const currentPerson = () => (order() ? order()[done().length] ?? null : null);

  /* ===== ACAK URUTAN GILIRAN ===== */
  function fisherYates(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffleOrder() {
    if (spinning || shuffling || done().length) return;
    shuffling = true;
    q('#btn-shuffle').disabled = true;
    const final = fisherYates(cfg().people);
    const nameEl = q('#turn-name');
    const dur = DEMO ? 200 : 2200;
    const t0 = performance.now();
    (function cycle(now) {
      if (now - t0 < dur) {
        nameEl.textContent = cfg().people[Math.floor(Math.random() * cfg().people.length)];
        setTimeout(() => requestAnimationFrame(cycle), 60);
      } else {
        st.order[st.pot] = final;
        shuffling = false;
        q('#btn-shuffle').disabled = false;
        save();
        render();
      }
    })(t0);
  }

  /* ===== RODA ===== */
  const canvas = q('#wheel');
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
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(start + seg / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0a0a0a';
      ctx.font = `bold ${teams.length > 20 ? 30 : 36}px "Noto Sans", sans-serif`;
      ctx.fillText(code, RADIUS - 24, 11);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#b69769';
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  /* Sudut akhir supaya segmen `index` mendarat di pointer (atas) */
  function targetRotation(index, count) {
    const seg = (Math.PI * 2) / count;
    const base = -Math.PI / 2 - (index + 0.5) * seg;
    const extraSpins = (DEMO ? 1 : 8 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    const current = rotation % (Math.PI * 2);
    let delta = base - current;
    while (delta > 0) delta -= Math.PI * 2;
    return rotation + delta + extraSpins;
  }

  function spin() {
    if (spinning || shuffling) return;
    const person = currentPerson();
    const teams = remainingTeams();
    if (!person || !teams.length) return;

    spinning = true;
    q('#btn-spin').disabled = true;

    const winnerIdx = Math.floor(Math.random() * teams.length);
    const winner = teams[winnerIdx];
    const from = rotation;
    const to = targetRotation(winnerIdx, teams.length);
    const dur = DEMO ? 300 : 7500;
    const t0 = performance.now();

    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      // easeOutQuint: ngebut di awal, lalu merayap pelan banget di akhir — biar deg-degan
      const ease = 1 - Math.pow(1 - t, 5);
      rotation = from + (to - from) * ease;
      drawWheel();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        done().push({ person, code: winner });
        save();
        refreshMainPage(); // langsung tercatat di section Peserta & klasemen
        showResult(person, winner);
        render();
      }
    })(t0);
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
    const ord = order();

    q('#prog-1').textContent = `${st.assignments[1].length}/${POTS[1].people.length}`;
    q('#prog-2').textContent = `${st.assignments[2].length}/${POTS[2].people.length}`;
    document.querySelectorAll('.pot-tab').forEach((b) =>
      b.classList.toggle('active', Number(b.dataset.pot) === st.pot));

    const person = currentPerson();
    if (!ord) {
      q('#turn-name').textContent = 'Acak urutan dulu!';
      q('#turn-count').textContent = `${c.people.length} orang menunggu urutan giliran.`;
    } else {
      q('#turn-name').textContent = person ?? 'Pot selesai! 🎉';
      q('#turn-count').textContent = person
        ? `Giliran ke-${a.length + 1} dari ${c.people.length} · sisa ${remainingTeams().length} negara di roda`
        : `Semua ${c.people.length} orang sudah dapat negara.`;
    }
    q('#btn-shuffle').hidden = !!ord && !!a.length;       // hilang setelah spin pertama
    q('#btn-shuffle').textContent = ord ? 'Acak ulang urutan' : 'ACAK URUTAN GILIRAN';
    q('#btn-shuffle').classList.toggle('small', !!ord);
    q('#btn-spin').hidden = !ord;
    q('#btn-spin').disabled = !person || spinning;
    q('#btn-undo').hidden = !a.length;

    // Finalisasi muncul hanya setelah SEMUA pot selesai
    const allDone = [1, 2].every((p) => st.assignments[p].length === POTS[p].people.length);
    q('#finalize-box').hidden = !allDone;

    q('#panel-title').textContent = `URUTAN & HASIL — ${c.label.toUpperCase()}`;
    q('#panel-sub').textContent = st.pot === 2
      ? `${c.teams.length} negara untuk ${c.people.length} orang — ${c.teams.length - c.people.length} negara akan tanpa pemilik.`
      : `${c.teams.length} negara untuk ${c.people.length} orang.`;

    const list = ord ?? c.people;
    q('#result-list').innerHTML = (ord
      ? list.map((p, i) => {
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
        })
      : list.map((p) => `<div class="result-row pending">
          <span class="rr-num">?</span>
          <span class="rr-person">${p}</span>
          <span class="rr-team">urutan belum diacak</span>
        </div>`)
    ).join('');

    drawWheel();
  }

  /* ===== EXPORT / RESET / UNDO ===== */
  function exportJson() {
    const all = {};
    for (const pot of [1, 2]) for (const a of st.assignments[pot]) all[a.code] = a.person;
    const out = { _keterangan: 'Hasil undian PILDUN 26. Kosong = tanpa pemilik.' };
    for (const code of Object.keys(TEAMS)) out[code] = all[code] ?? '';
    const text = JSON.stringify(out, null, 2) + '\n';
    const area = q('#export-area');
    area.hidden = false;
    area.value = text;
    area.select();
    navigator.clipboard?.writeText(text).then(
      () => { q('#btn-export').textContent = '✅ Tersalin! Paste ke data/participants.json'; },
      () => { q('#btn-export').textContent = '⚠ Salin manual dari kotak di bawah'; });
  }

  function reset() {
    if (!confirm('Yakin reset SEMUA hasil undian (termasuk urutan giliran)? Tidak bisa dibatalkan.')) return;
    st = { pot: 1, order: { 1: null, 2: null }, assignments: { 1: [], 2: [] } };
    rotation = 0;
    save();
    refreshMainPage();
    render();
  }

  function undo() {
    if (spinning || !done().length) return;
    const last = done().pop();
    save();
    refreshMainPage();
    render();
    alert(`Dibatalkan: ${last.person} ↩ (negara kembali ke roda)`);
  }

  /* ===== INIT ===== */
  async function init() {
    const section = q('#undian');
    if (!section) return;

    const [teams, participants] = await Promise.all([
      fetch('data/teams.json').then((r) => r.json()),
      fetch('data/participants.json').then((r) => r.json()),
    ]);
    TEAMS = teams;

    // Terkunci kalau dimatikan panitia, atau hasil sudah di-commit ke participants.json
    const committed = Object.entries(participants)
      .some(([k, v]) => !k.startsWith('_') && String(v).trim() !== '');
    if ((!DRAW_ENABLED || committed) && !FORCE) {
      q('#draw-app').hidden = true;
      const lock = q('#draw-locked');
      lock.hidden = false;
      if (!DRAW_ENABLED && !committed) {
        lock.innerHTML = '🔒 Fitur undian sedang dinonaktifkan panitia.';
      }
      return;
    }

    load();
    document.querySelectorAll('.pot-tab').forEach((b) =>
      b.addEventListener('click', () => {
        if (spinning || shuffling) return;
        st.pot = Number(b.dataset.pot);
        save();
        render();
      }));
    q('#btn-shuffle').addEventListener('click', shuffleOrder);
    q('#btn-spin').addEventListener('click', spin);
    q('#btn-undo').addEventListener('click', undo);
    q('#btn-export').addEventListener('click', exportJson);
    q('#btn-reset').addEventListener('click', reset);

    render();
    if (DEMO) {
      st.order[st.pot] = fisherYates(cfg().people);
      render();
      spin();
    }
  }

  init().catch((err) => console.error('draw.js:', err));
})();
