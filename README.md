# PILDUN 26 ⚽🏆

Papan skor game sweepstakes Piala Dunia 2026 kantor — tiap orang pegang 1 negara, hadiah dibagi 2 fase (liga + knockout). Lihat detail aturan & desain di [PRD.md](PRD.md).

**100% static site** — tanpa backend, tanpa database, tanpa API key. Data skor ditarik otomatis dari fixturedownload.com oleh GitHub Action, lalu di-commit sebagai `data/standings.json`.

## Struktur

```
├── index.html               # Halaman utama (satu-satunya halaman)
├── css/style.css            # Style terinspirasi FIFA WC26 (dark + gold)
├── js/app.js                # Renderer (baca 3 file JSON di bawah)
├── data/
│   ├── teams.json           # 48 negara: nama, grup, bendera, peringkat FIFA
│   ├── participants.json    # ✏️ EDIT INI: negara → nama karyawan
│   ├── overrides.json       # ✏️ EDIT INI: koreksi manual hasil pertandingan
│   ├── fixtures-raw.json    # Cache feed (otomatis, jangan diedit)
│   └── standings.json       # Hasil olahan (otomatis, jangan diedit)
├── scripts/update-data.js   # Pipeline: fetch feed → override → hitung → tulis
└── .github/workflows/update-data.yml  # Cron tiap 2 jam selama Juni-Juli
```

## Setup awal (sekali saja)

1. **Isi hasil undian** — edit `data/participants.json`, isi nama karyawan per negara:
   ```json
   "BRA": "Budi Santoso",
   "ARG": "Siti Rahma",
   ```
   Negara tanpa pemilik biarkan `""`.

2. **Push ke GitHub** lalu aktifkan hosting (pilih salah satu):
   - **GitHub Pages**: Settings → Pages → Source: `main` branch → root. Selesai.
   - **Vercel/Netlify**: import repo, framework "Other", tanpa build command, output dir = root.

3. Pastikan GitHub Action boleh push: Settings → Actions → General → Workflow permissions → **Read and write permissions**.

4. Share link ke grup kantor 🎉

## Update data

- **Otomatis**: GitHub Action jalan tiap 2 jam (Juni–Juli), fetch skor terbaru, commit `standings.json` → site auto-redeploy.
- **Manual/paksa**: tab **Actions** → "Update skor & klasemen" → **Run workflow**. Atau lokal: `node scripts/update-data.js` lalu commit.

## Koreksi data (kalau API salah/telat)

Edit `data/overrides.json`, tambahkan entri ke array `overrides`:

```json
"overrides": [
  { "matchNumber": 7, "homeScore": 2, "awayScore": 0, "note": "koreksi skor, API salah" },
  { "matchNumber": 89, "homeScore": 1, "awayScore": 1, "winner": "Brazil", "note": "menang adu penalti" }
]
```

- `matchNumber`: lihat di `data/fixtures-raw.json` (1–72 fase grup, 73–104 knockout).
- `winner`: **hanya wajib untuk match knockout yang berakhir seri** (adu penalti) — isi nama tim persis seperti di feed (kolom `feedName` di `teams.json`).
- Override **selalu menang** atas data API. Commit → Action berikutnya (atau Run workflow manual) menerapkannya.
- Salah koreksi? Hapus entri-nya atau `git revert` — riwayat git adalah audit trail-nya.

## Preview lokal

```bash
node scripts/update-data.js        # refresh data (opsional)
python3 -m http.server 8000        # buka http://localhost:8000
```

> ⚠️ Harus lewat http server — buka langsung `index.html` (file://) bakal gagal fetch JSON.

## Catatan

- Peringkat FIFA di `teams.json` dipakai sebagai tie-breaker terakhir — angkanya perkiraan ranking pra-turnamen; silakan koreksi kalau perlu, jarang kepakai.
- Bukan produk resmi FIFA — UI hanya terinspirasi bahasa desainnya, tanpa aset resmi (lihat PRD bagian 7.3).

## Lucky Spot 🍀

Posisi klasemen akhir fase grup yang dapat hadiah kejutan diatur di `js/app.js` paling atas:

```js
const LUCKY = { ranks: [11, 26, 38], amount: 'Rp50.000' };
```

Ubah angka posisinya sebelum kickoff, lalu commit. Baris posisi tersebut otomatis di-highlight ungu + 🍀 di klasemen.

## Undian 🎡

Halaman spinwheel untuk acara undian live: **`/undian.html`** (tidak ada di menu utama — khusus panitia).

- **Pot 1**: 25 orang ↔ 25 tim unggulan · **Pot 2**: 15 orang ↔ 23 tim hore-hore (8 negara sisa tanpa pemilik).
- Orang diundi urut sesuai daftar; klik **PUTAR!** → roda berhenti di negara → hasil tercatat.
- Progres tersimpan otomatis di localStorage browser (refresh aman). Ada tombol **undo** untuk membatalkan hasil terakhir dan **reset** total.
- Selesai undian: klik **"Salin participants.json"** → paste seluruh isinya ke `data/participants.json` (bisa via tombol ✏️ di GitHub) → commit. Selesai.
- Daftar orang/tim per pot diatur di `js/draw.js` (const `POTS`).
- Param debug: `?demo=1` (spin otomatis super cepat, tidak menyimpan progres).
