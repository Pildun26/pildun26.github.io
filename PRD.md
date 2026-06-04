# PRD — PILDEON 26: Game Sweepstakes Piala Dunia 2026 Kantor

| | |
|---|---|
| **Dokumen** | Product Requirements Document |
| **Versi** | 1.0 |
| **Tanggal** | 4 Juni 2026 |
| **Status** | Draft |
| **Deadline kritis** | **11 Juni 2026** (kickoff Piala Dunia 2026) — sisa ±7 hari |

---

## 1. Latar Belakang

Untuk menyambut Piala Dunia 2026 (11 Juni – 19 Juli 2026, AS/Kanada/Meksiko, 48 negara peserta), kantor mengadakan game sweepstakes internal: **setiap karyawan mendapat 1 negara peserta lewat undian** dan mendukung negara tersebut sepanjang turnamen. Hadiah diberikan dalam 2 fase, terinspirasi format UEFA Champions League terbaru (fase liga + fase knockout).

Dibutuhkan **satu halaman web** yang bisa diakses semua karyawan untuk memantau progres game: siapa pegang negara apa, posisi klasemen, siapa yang berpeluang dapat hadiah.

## 2. Tujuan & Sasaran

### Tujuan
- Semua peserta bisa memantau posisi negaranya secara mandiri tanpa nanya panitia.
- Membangun hype & engagement kantor selama turnamen berlangsung (±6 minggu).
- Transparansi penuh: aturan poin, klasemen, dan pemenang hadiah terlihat jelas.

### Sasaran terukur
- Web live **sebelum 11 Juni 2026**.
- Klasemen ter-update maksimal **H+12 jam** setelah pertandingan selesai (target: otomatis dalam hitungan jam).
- Bisa diakses dari HP & laptop (mayoritas akses diprediksi via HP).

### Non-goals (v1)
- Tidak ada sistem login/autentikasi.
- Tidak ada fitur prediksi skor, komentar, atau chat.
- Tidak ada notifikasi push/email.
- Tidak menangani pembayaran/iuran hadiah.

## 3. Pengguna

| Persona | Kebutuhan |
|---|---|
| **Peserta** (±48 karyawan) | Lihat negara siapa pegang apa, posisi negaranya di klasemen, jadwal & hasil pertandingan negaranya, siapa yang dapat hadiah. |
| **Panitia/Admin** (1–3 orang) | Input mapping negara → karyawan sekali di awal, koreksi data manual kalau API bermasalah, tandai pemenang hadiah. |
| **Penonton** (karyawan non-peserta) | Ikut memantau keseruan. |

## 4. Aturan Game (Sumber Kebenaran)

### 4.1 Undian
- 48 negara peserta Piala Dunia 2026 diundi ke karyawan, **1 orang = 1 negara**.
- Jika peserta < 48, sisa negara berstatus *"Tanpa Pemilik"* (tetap tampil di klasemen, tidak berhak hadiah).
- Mapping final di-input ke sistem **sebelum kickoff** dan dikunci (perubahan hanya oleh admin).

### 4.2 Fase Liga (Fase Grup Piala Dunia, 11–27 Juni 2026)
- Ke-48 negara digabung jadi **satu klasemen tunggal** (gaya fase liga UCL).
- Poin diambil dari **poin asli fase grup** Piala Dunia: tiap negara main 3 kali — **Menang = 3, Seri = 1, Kalah = 0** (maksimal 9 poin).
- Urutan klasemen (tie-breaker, berurutan):
  1. Poin
  2. Selisih gol (goal difference)
  3. Gol memasukkan (goals for)
  4. Peringkat FIFA terakhir sebelum turnamen (data statis, di-input di awal)
- **Hadiah fase liga** (ditentukan setelah seluruh pertandingan fase grup selesai, 27 Juni 2026):
  - 🥇 Peringkat 1: **Rp150.000**
  - 🥈 Peringkat 2: **Rp100.000**
  - 🥉 Peringkat 3: **Rp50.000**
  - 🍀 **Lucky Spot**: posisi **11, 26, dan 38** klasemen akhir masing-masing **Rp50.000**. Posisi ditentukan & diumumkan sebelum kickoff (dikonfigurasi di `js/app.js`, const `LUCKY`), supaya peserta papan tengah tetap punya alasan mantengin klasemen sampai akhir.

### 4.3 Fase Knockout (28 Juni – 19 Juli 2026)
- Mengikuti hasil asli babak knockout Piala Dunia: 32 besar → 16 besar → perempat final → semifinal → final.
- **Hadiah fase knockout:**
  - 🏅 **4 semifinalis** → masing-masing **Rp250.000**.
  - 🏆 **Juara dunia** → **Rp500.000 + Jersey (KW Super) negara pemenang** (juara tetap menerima hadiah semifinalis + hadiah utama, kecuali panitia menentukan lain — lihat Open Questions).
- Satu orang bisa menang di kedua fase (mis. negaranya peringkat 1 fase liga lalu juara dunia).

## 5. Fitur & Requirement

### 5.1 Halaman Utama (single page, semua section scrollable)

#### F1 — Header & Status Turnamen `[P0]`
- Judul game + logo/tema kantor (opsional).
- Indikator fase berjalan: *Fase Liga* / *Fase Knockout* / *Selesai*.
- Timestamp "Terakhir di-update: …".

#### F2 — Klasemen Fase Liga `[P0]`
- Tabel 48 baris: **Peringkat, Bendera, Nama Negara, Nama Pemegang, Main, M, S, K, GF, GA, SG, Poin**.
- **Bendera + nama pemegang selalu tampil bersama negara** (requirement inti dari user).
- Highlight visual zona hadiah: baris peringkat 1–3 diberi warna/badge (🥇🥈🥉).
- Negara tanpa pemilik tampil redup/abu-abu dengan label *"Tanpa Pemilik"*.
- Di mobile: kolom diringkas (Peringkat, Bendera+Negara, Pemegang, Main, SG, Poin), detail lain bisa di-expand per baris.
- Setelah fase grup selesai, klasemen dibekukan dan pemenang peringkat 1–3 ditandai permanen.

#### F3 — Bracket Fase Knockout `[P0]`
- Visualisasi bracket 32 besar → final.
- Tiap slot: bendera + kode negara + **nama pemegang** + skor (kalau sudah main).
- Negara yang tersingkir tampil tercoret/redup.
- Badge khusus untuk 4 semifinalis (🏅) dan juara (🏆) setelah ditentukan.
- Sebelum fase knockout mulai, section ini menampilkan placeholder "Menunggu hasil fase grup".

#### F4 — Papan Pemenang Hadiah `[P0]`
- Section ringkas di bagian atas/bawah: daftar hadiah & pemenangnya.
  - 🥇 Peringkat 1 Liga — *negara (pemegang)* / "TBD"
  - 🥈 Peringkat 2 Liga — TBD
  - 🥉 Peringkat 3 Liga — TBD
  - 🏅 Semifinalis ×4 — TBD
  - 🏆 Juara Dunia — TBD
- Nominal/bentuk hadiah opsional ditampilkan (config).

#### F5 — Daftar Peserta & Pencarian `[P1]`
- Grid/list kartu: foto bendera besar + nama negara + nama karyawan.
- Search box: ketik nama karyawan atau negara → highlight/filter (biar gampang cari "negara gue di mana").

#### F6 — Hasil & Jadwal Pertandingan `[P1]`
- List pertandingan per matchday: hasil terbaru di atas, pertandingan mendatang (dengan tanggal & jam WIB).
- Tiap pertandingan menampilkan nama pemegang kedua negara — biar kerasa "duel antar karyawan".

#### F7 — Halaman Aturan `[P2]`
- Section/modal berisi ringkasan aturan game (copy dari bagian 4 dokumen ini).

### 5.2 Sistem Data (Hybrid: API + Override Manual)

#### F8 — Pipeline Data Otomatis `[P0]`
- **Sumber utama (keputusan final saat build):** feed JSON [fixturedownload.com/feed/json/fifa-world-cup-2026](https://fixturedownload.com/feed/json/fifa-world-cup-2026) — **gratis, tanpa API key**, berisi 104 pertandingan lengkap dengan skor yang ter-update selama turnamen. (Kandidat awal football-data.org tidak jadi dipakai karena butuh API key tanpa nilai tambah.)
- **Mekanisme:** GitHub Action terjadwal (cron tiap 2 jam selama Juni–Juli, bisa dipersering di hari pertandingan):
  1. Fetch hasil pertandingan dari feed; kalau feed gagal, pakai cache terakhir (`fixtures-raw.json`).
  2. Merge dengan file override manual (override menang atas feed).
  3. Hitung klasemen + status bracket.
  4. Tulis `data/standings.json` → commit → hosting auto-redeploy.
- Web di browser **hanya membaca satu file JSON statis** — tidak ada call API dari client.

#### F9 — Override & Input Manual `[P0]`
- File `data/overrides.json` di repo: admin bisa menambah/mengoreksi hasil pertandingan via edit file (format sederhana, terdokumentasi).
- Dipakai saat: API down, data API salah/telat, atau keputusan khusus panitia.
- Fallback total: kalau API mati permanen, seluruh hasil bisa diinput manual lewat file ini dan sistem tetap jalan.

#### F10 — Data Statis Awal `[P0]`
- `data/participants.json`: mapping kode negara → nama karyawan (di-input sekali oleh admin sebelum kickoff).
- `data/teams.json`: 48 negara + kode FIFA + peringkat FIFA (untuk tie-breaker) + URL bendera.
- Bendera dari [flagcdn.com](https://flagcdn.com) (gratis, tanpa API key) atau emoji bendera sebagai fallback.

## 6. Arsitektur Teknis

```
┌─────────────────┐     cron 2-3 jam      ┌──────────────────┐
│ football-data.org│ ──────────────────▶  │  GitHub Action    │
│ (API hasil match)│                       │  (fetch + merge   │
└─────────────────┘                       │   + hitung)       │
                                          └────────┬─────────┘
┌─────────────────┐    merge (prioritas)           │ commit
│ overrides.json   │ ──────────────────────────────┤ standings.json
│ (input manual)   │                               ▼
└─────────────────┘                       ┌──────────────────┐
                                          │  Static Site      │
┌─────────────────┐                       │  (Vercel/Netlify/ │
│ participants.json│ ────────────────────▶│   GitHub Pages)   │
│ teams.json       │                       └────────┬─────────┘
└─────────────────┘                                ▼
                                            Karyawan (HP/laptop)
```

| Komponen | Pilihan | Alasan |
|---|---|---|
| Frontend | HTML + CSS + vanilla JS (atau Vite + satu framework ringan) | Satu halaman, tidak butuh kompleksitas; cepat dibangun dalam seminggu |
| Hosting | GitHub Pages / Vercel / Netlify (gratis) | Auto-deploy dari repo, cukup untuk traffic kantor |
| Data pipeline | GitHub Actions (cron) + script Node.js | Gratis, API key aman di Secrets, riwayat data ter-version di git |
| Sumber skor | football-data.org (free tier) | Mencakup World Cup, gratis |
| Bendera | flagcdn.com | Gratis, kualitas bagus, tanpa key |

**Tanpa backend, tanpa database, tanpa biaya hosting.**

## 7. Panduan Style UI — Terinspirasi FIFA World Cup 26™

### 7.1 Referensi identitas visual resmi (hasil riset)

| Elemen | Identitas resmi FIFA WC26 |
|---|---|
| **Emblem** | Foto realistis trofi emas di depan angka "26" besar yang stacked — pertama kalinya trofi asli muncul di emblem Piala Dunia |
| **Bentuk geometris** | Angka "26" disusun dari **48 bentuk geometris (kotak + seperempat lingkaran)** = 48 negara peserta; lingkaran merefleksikan bola, kotak merefleksikan lapangan |
| **Palet inti** | **Hitam, putih, emas** — base monokrom yang restrained, trofi emas sebagai hero |
| **Sistem multiwarna** | 16 host city punya warna & pattern masing-masing di atas framework brand yang sama — merayakan keberagaman |
| **Tipografi** | Custom typeface **"FWC 26"** (bold, geometris, sporty, terinspirasi street soccer & poster vintage) + **Noto Sans** sebagai font sekunder resmi |
| **Kampanye** | "WE ARE 26" — tipografi stacked besar dan tebal |

### 7.2 Translasi ke UI web kita

- **Tema gelap**: background hitam pekat (`#0A0A0A`), teks putih, **aksen emas trofi** (`#B69769` → gradient emas) — emas dipakai khusus untuk zona hadiah & juara, persis filosofi brand aslinya (emas = prestige trofi).
- **Tipografi** (Google Fonts, gratis):
  - Display/heading & angka besar: **Archivo Black** atau **Anton** (bold geometris, paling mendekati karakter FWC 26).
  - Body & tabel: **Noto Sans** — otentik, karena memang font sekunder resmi FIFA WC26.
- **Motif sudut khas "26"**: elemen UI (kartu, badge, tombol, sel klasemen) memakai kombinasi **sudut siku + seperempat lingkaran** — `border-radius` penuh hanya di 1–2 sudut diagonal, sisanya siku. Ini signature shape paling recognizable dari brand WC26.
- **Pattern dekoratif**: grid kotak & seperempat lingkaran subtle (CSS murni, low-opacity) di header dan section divider — gema dari komposisi 48 bentuk di emblem.
- **Aksen multiwarna ala host city**: tiap section punya warna aksen berbeda (mis. klasemen = hijau pitch, bracket = merah, daftar peserta = biru, jadwal = ungu) di atas base hitam yang sama — merefleksikan sistem 16 host city.
- **Angka besar stacked**: peringkat klasemen, skor pertandingan, dan countdown ditampilkan dengan tipografi display ekstra besar dan tebal, gaya "26"/"WE ARE 26".
- **Zona hadiah**: peringkat 1–3 liga pakai gradient emas/perak/perunggu; juara dunia pakai treatment emas penuh + ikon trofi.
- **Trofi**: pakai emoji 🏆 atau ilustrasi/SVG bebas lisensi.

### 7.3 Batasan legal ⚠️

UI **terinspirasi**, bukan meniru aset resmi: **dilarang memakai emblem/logo resmi, foto trofi resmi, wordmark FIFA, dan font FWC 26** (semuanya berlisensi/copyright FIFA). Yang kita ambil hanya bahasa desainnya: palet hitam-putih-emas, bentuk geometris kotak + seperempat lingkaran, tipografi bold stacked, dan sistem aksen multiwarna.

## 8. Requirement Non-Fungsional

- **Mobile-first** — layout utama didesain untuk layar HP.
- **Bahasa**: Indonesia (casual, sesuai kultur kantor).
- **Zona waktu**: semua jadwal ditampilkan dalam **WIB**.
- **Performa**: satu file JSON + gambar bendera; target load < 2 detik.
- **Tanpa data sensitif**: hanya nama karyawan (bukan email/jabatan). Konfirmasi ke peserta bahwa nama mereka tampil di web. Kalau web di-deploy publik tanpa proteksi, pertimbangkan pakai nama panggilan saja.

## 9. Milestone & Timeline

| Tanggal | Milestone |
|---|---|
| **5–6 Juni** | Setup repo, data statis (48 negara, bendera, peringkat FIFA), layout dasar + klasemen (F1, F2, F10) |
| **7–8 Juni** | Pipeline data otomatis + override manual (F8, F9), papan hadiah (F4) |
| **9 Juni** | Daftar peserta + search (F5), jadwal/hasil (F6), polish mobile |
| **10 Juni** | Input mapping undian final, uji coba dengan panitia, deploy production, share link ke kantor |
| **11 Juni** | 🏆 **Kickoff Piala Dunia — web harus live** |
| **27 Juni** | Fase grup selesai → klasemen dikunci, umumkan pemenang 1–3 liga |
| **28 Juni** | Bracket knockout aktif (F3) |
| **19 Juli** | Final → umumkan semifinalis + juara, web jadi arsip kenangan |

Bracket (F3) boleh dikerjakan setelah 11 Juni (baru dibutuhkan 28 Juni) kalau waktu mepet.

## 10. Open Questions

1. **Stacking hadiah juara**: juara dunia otomatis semifinalis — dapat 2 hadiah atau hanya hadiah utama? *(Default PRD: dapat keduanya.)*
2. Berapa jumlah peserta pasti? Kalau < 48, apakah ada yang boleh pegang 2 negara, atau sisa negara dibiarkan tanpa pemilik? *(Default PRD: tanpa pemilik.)*
3. Web mau publik (siapa pun dengan link bisa akses) atau perlu proteksi sederhana (URL rahasia cukup)? *(Default PRD: URL publik tidak di-index, dianggap cukup untuk game kantor.)*
4. Apakah hasil undian sudah dilakukan, atau perlu fitur/momen undian? *(PRD ini mengasumsikan undian dilakukan offline dan hasilnya di-input admin.)*
5. ~~Nominal/bentuk hadiah mau ditampilkan di web?~~ ✅ **Sudah diputuskan & ditampilkan**: Liga 250K/100K/50K · Semifinalis @250K · Juara 500K + jersey KW super negara pemenang.

## 11. Metrik Sukses

- Web live sebelum kickoff 11 Juni. ✅/❌
- Zero komplain "klasemen telat/salah" yang tidak terselesaikan < 24 jam.
- Mayoritas peserta membuka web minimal 1× per pekan turnamen (cek via analytics ringan opsional, mis. counter sederhana — bukan P0).
