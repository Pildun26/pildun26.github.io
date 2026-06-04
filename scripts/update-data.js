#!/usr/bin/env node
/**
 * Pipeline data PILDEON 26 — Piala Dunia 2026
 *
 * 1. Fetch jadwal + skor dari fixturedownload.com (gratis, tanpa API key).
 *    Kalau gagal, pakai cache terakhir di data/fixtures-raw.json.
 * 2. Terapkan koreksi manual dari data/overrides.json (override selalu menang).
 * 3. Hitung klasemen liga gabungan (48 tim) + status bracket knockout.
 * 4. Tulis hasilnya ke data/standings.json (satu-satunya file yang dibaca web).
 *
 * Jalankan: node scripts/update-data.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = (f) => path.join(ROOT, 'data', f);
const FEED_URL = 'https://fixturedownload.com/feed/json/fifa-world-cup-2026';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const KICKOFF = '2026-06-11T19:00:00Z';
const GROUP_MATCH_COUNT = 72; // match 1-72 = fase grup
const SEMI_MATCHES = [101, 102];
const BRONZE_MATCH = 103;
const FINAL_MATCH = 104;

const ROUND_NAMES = {
  1: 'Matchday 1', 2: 'Matchday 2', 3: 'Matchday 3',
  4: '32 Besar', 5: '16 Besar', 6: 'Perempat Final',
  7: 'Semifinal', 8: 'Final',
};

async function fetchFixtures() {
  try {
    const res = await fetch(FEED_URL, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fixtures = await res.json();
    if (!Array.isArray(fixtures) || fixtures.length < 100) {
      throw new Error(`feed tidak lengkap (${fixtures.length} match)`);
    }
    fs.writeFileSync(DATA('fixtures-raw.json'), JSON.stringify(fixtures, null, 2));
    console.log(`✓ Feed OK: ${fixtures.length} pertandingan`);
    return fixtures;
  } catch (err) {
    console.warn(`⚠ Feed gagal (${err.message}) — pakai cache fixtures-raw.json`);
    return JSON.parse(fs.readFileSync(DATA('fixtures-raw.json'), 'utf8'));
  }
}

function applyOverrides(fixtures) {
  const { overrides = [] } = JSON.parse(fs.readFileSync(DATA('overrides.json'), 'utf8'));
  for (const o of overrides) {
    const m = fixtures.find((f) => f.MatchNumber === o.matchNumber);
    if (!m) {
      console.warn(`⚠ Override match #${o.matchNumber} tidak ditemukan — dilewati`);
      continue;
    }
    if (o.homeScore != null) m.HomeTeamScore = o.homeScore;
    if (o.awayScore != null) m.AwayTeamScore = o.awayScore;
    if (o.winner != null) m.Winner = o.winner;
    console.log(`✓ Override match #${o.matchNumber} diterapkan${o.note ? ` (${o.note})` : ''}`);
  }
  return fixtures;
}

function buildNameIndex(teams) {
  const byFeedName = {};
  for (const [code, t] of Object.entries(teams)) byFeedName[t.feedName] = code;
  return byFeedName;
}

function isPlayed(m) {
  return m.HomeTeamScore != null && m.AwayTeamScore != null;
}

// Pemenang match knockout: skor beda → skor; seri → field Winner (adu penalti)
function knockoutWinner(m, byFeedName) {
  if (!isPlayed(m)) return null;
  if (m.HomeTeamScore > m.AwayTeamScore) return byFeedName[m.HomeTeam] ?? null;
  if (m.AwayTeamScore > m.HomeTeamScore) return byFeedName[m.AwayTeam] ?? null;
  return byFeedName[m.Winner] ?? null; // seri: butuh Winner dari feed/override
}

function computeLeague(fixtures, teams, byFeedName) {
  const table = {};
  for (const code of Object.keys(teams)) {
    table[code] = { code, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }

  for (const m of fixtures) {
    if (m.MatchNumber > GROUP_MATCH_COUNT || !isPlayed(m)) continue;
    const h = byFeedName[m.HomeTeam];
    const a = byFeedName[m.AwayTeam];
    if (!h || !a) {
      console.warn(`⚠ Tim tidak dikenal di match #${m.MatchNumber}: ${m.HomeTeam} vs ${m.AwayTeam}`);
      continue;
    }
    const hs = m.HomeTeamScore;
    const as = m.AwayTeamScore;
    table[h].played++; table[a].played++;
    table[h].gf += hs; table[h].ga += as;
    table[a].gf += as; table[a].ga += hs;
    if (hs > as) { table[h].w++; table[h].pts += 3; table[a].l++; }
    else if (hs < as) { table[a].w++; table[a].pts += 3; table[h].l++; }
    else { table[h].d++; table[a].d++; table[h].pts++; table[a].pts++; }
  }

  const rows = Object.values(table);
  for (const r of rows) r.gd = r.gf - r.ga;
  // Tie-breaker sesuai PRD: poin → selisih gol → gol memasukkan → peringkat FIFA
  rows.sort((x, y) =>
    y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
    teams[x.code].fifaRank - teams[y.code].fifaRank
  );
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

function simplifyMatches(fixtures, byFeedName) {
  return fixtures
    .slice()
    .sort((a, b) => a.MatchNumber - b.MatchNumber)
    .map((m) => ({
      n: m.MatchNumber,
      round: m.RoundNumber,
      roundName: m.MatchNumber === BRONZE_MATCH ? 'Perebutan Juara 3'
        : m.MatchNumber === FINAL_MATCH ? 'Final'
        : ROUND_NAMES[m.RoundNumber],
      date: m.DateUtc.replace(' ', 'T'),
      venue: m.Location,
      group: m.Group ? m.Group.replace('Group ', '') : null,
      home: byFeedName[m.HomeTeam] ?? null,
      away: byFeedName[m.AwayTeam] ?? null,
      homeRaw: m.HomeTeam, // placeholder mis. "1A", "3ABCDF", "To be announced"
      awayRaw: m.AwayTeam,
      hs: m.HomeTeamScore,
      as: m.AwayTeamScore,
      winner: m.MatchNumber > GROUP_MATCH_COUNT ? knockoutWinner(m, byFeedName) : null,
    }));
}

function computeKnockout(matches) {
  const byN = Object.fromEntries(matches.map((m) => [m.n, m]));
  const semiTeams = SEMI_MATCHES.flatMap((n) => [byN[n].home, byN[n].away]).filter(Boolean);
  const final = byN[FINAL_MATCH];
  const champion = final.winner;
  const runnerUp = champion
    ? (final.home === champion ? final.away : final.home)
    : null;
  return {
    semifinalists: semiTeams,
    champion,
    runnerUp,
    third: byN[BRONZE_MATCH].winner,
  };
}

function computePhase(matches, now) {
  const groupMatches = matches.filter((m) => m.n <= GROUP_MATCH_COUNT);
  const groupComplete = groupMatches.every((m) => m.hs != null && m.as != null);
  const finalDone = matches.find((m) => m.n === FINAL_MATCH).winner != null;
  if (finalDone) return { phase: 'selesai', groupComplete: true };
  if (groupComplete) return { phase: 'knockout', groupComplete: true };
  if (now < new Date(KICKOFF)) return { phase: 'pre', groupComplete: false };
  return { phase: 'liga', groupComplete: false };
}

async function main() {
  const teams = JSON.parse(fs.readFileSync(DATA('teams.json'), 'utf8'));
  const byFeedName = buildNameIndex(teams);

  const fixtures = applyOverrides(await fetchFixtures());
  const matches = simplifyMatches(fixtures, byFeedName);
  const league = computeLeague(fixtures, teams, byFeedName);
  const knockout = computeKnockout(matches);
  const { phase, groupComplete } = computePhase(matches, new Date());

  const standings = {
    generatedAt: new Date().toISOString(),
    kickoff: KICKOFF,
    phase,           // pre | liga | knockout | selesai
    groupComplete,   // true = klasemen liga final & hadiah 1-3 sah
    league,
    knockout,
    matches,
  };

  fs.writeFileSync(DATA('standings.json'), JSON.stringify(standings, null, 2));
  const played = matches.filter((m) => m.hs != null).length;
  console.log(`✓ standings.json ditulis — fase: ${phase}, ${played}/104 match selesai`);
}

main().catch((err) => { console.error(err); process.exit(1); });
