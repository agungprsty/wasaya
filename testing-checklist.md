# Testing Checklist — WAGateway

## 1. Auth & Session
- [x] Login — email/password valid → redirect ke dashboard
- [x] Login — email/password salah → tampil error
- [ ] Session expired → redirect ke `/login`
- [ ] Logout → cookie cleared, redirect ke `/login`
- [ ] Refresh token/blum expiry → tetap di dashboard, data user terload

## 2. Sidebar (Layout)
- [ ] Nav items aktif sesuai path (highlight hijau)
- [ ] Safety indicator dot = hijau (<50%), kuning (50-80%), merah (>80%)
- [ ] Progress bar harian sesuai persentase
- [x] Tier badge = Free / Pro / Enterprise
- [x] Free user → tombol "Upgrade" muncul
- [ ] Pro/Enterprise → tombol "Upgrade" tidak muncul
- [x] Mobile sidebar bisa buka/tutup (hamburger)
- [x] User name + email + initial avatar tampil

## 3. Dashboard Overview

### Summary Cards
- [x] Total Messages, Sent, Received, Success Rate
- [x] Angka sesuai data analitik
- [x] Success Rate hijau (≥80%), kuning (50-79%), merah (<50%)

### Message Trend Chart
- [x] Bar chart muncul untuk 7 atau 30 hari
- [x] Warna: hijau (sent), biru (received), merah (failed)
- [x] Hover tooltip menampilkan angka
- [x] Dropdown 7/30 hari → reload chart

### Distribution Donut
- [ ] Donut chart sent/received/failed muncul
- [ ] Warna sesuai (hijau/biru/merah)
- [ ] Label angka di bawah chart sesuai data

### Usage / Limits
- [ ] Progress bar harian sesuai `dailySent / dailyLimit`
- [ ] Progress bar bulanan sesuai `monthlySent / monthlyLimit`
- [ ] Limit Infinity (Enterprise) → "∞" tanpa progress bar

### Insights
- [x] Busiest Hour menampilkan jam tersibuk
- [x] Top Recipient menampilkan nomor tujuan terbanyak
- [x] Success Rate konsisten dengan summary card

### Quick Start
- [x] Checklist item centang jika sudah dilakukan
- [x] Webhook status berubah setelah setting disimpan

## 4. Settings

### Webhook
- [x] Input URL + secret tersimpan
- [x] Tombol "Test Webhook" → feedback sukses/gagal

### Auto Reply
- [ ] Toggle aktif/nonaktif
- [ ] Text tersimpan dan terkirim 1x/hari ke kontak baru

### Watermark
- [ ] Toggle aktif/nonaktif
- [ ] Text tersimpan
- [ ] Preview muncul saat text diisi

### Advanced

#### Safety Mode
- [ ] Normal / Ketat tersimpan
- [ ] Mode ketat memperlambat pengiriman

#### Admin Numbers
- [ ] Pro: maks 3 nomor (kelebihan otomatis dipotong)
- [ ] Enterprise: unlimited
- [ ] Free: input tidak muncul

#### Broadcast Mode
- [ ] Free: terkunci + modal upgrade
- [ ] Pro/Enterprise: toggle bisa diubah

#### Concurrency
- [ ] Free: maks 1
- [ ] Pro: maks 2
- [ ] Enterprise: maks 10

#### Proxy URL (Enterprise only)
- [ ] Input proxy URL tersimpan
- [ ] Tidak muncul untuk Free/Pro
- [ ] Koneksi via SocksProxyAgent berhasil

#### Human Mimicry (Enterprise only)
- [ ] Slider msPerChar (30–500) tersimpan
- [ ] Slider readDelayMs (300–10000) tersimpan
- [ ] Toggle typingEnabled tersimpan
- [ ] Tidak muncul untuk Free/Pro

## 5. Limit Enforcement

### Free Tier
- [ ] Harian >50 → 403 `{ error: "Daily limit exceeded" }`
- [ ] Bulanan >500 → 403
- [ ] Concurrency >1 → diturunkan ke 1
- [ ] Broadcast → 403

### Pro Tier
- [ ] Harian >200 → 403
- [ ] Bulanan >5.000 → 403
- [ ] Concurrency >2 → diturunkan ke 2
- [ ] Broadcast OK

### Enterprise
- [ ] Harian = Infinity → tidak pernah limit
- [ ] Bulanan = Infinity → tidak pernah limit
- [ ] Concurrency sampai 10

## 6. Safety & Quarantine

### SafetyMonitor
- [ ] Error tracking — disconnect tercatat
- [ ] Level escalation — setelah N errors, `isQuarantined = true`
- [ ] Quarantine check di `sendMessage` → throw error
- [ ] Quarantine check di message queue → worker reject

### Outbound Ratio
- [ ] Outbound-Inbound ratio tampil di settings
- [ ] Jika outbound > 3x inbound, safety level meningkat

## 7. Real-time Toast (>80% Limit)
- [ ] Jika daily >80% → toast muncul 1x
- [ ] Jika monthly >80% → toast muncul 1x
- [ ] Toast tidak muncul ulang di poll berikutnya (shownRef)
- [ ] Enterprise tidak pernah dapat toast (limit Infinity)

## 8. API Routes

### GET /api/settings
- [ ] Return `{ settings, subscription, proxyUrl, isQuarantined, safetyViolations }`
- [ ] Jika settings belum ada → auto create

### PUT /api/settings
- [ ] Semua field tersimpan (webhook, autoReply, watermark, msPerChar, etc.)
- [ ] proxyUrl tersimpan ke WhatsAppSession (bukan Settings)
- [ ] Validasi tidak ketat (field opsional)

### GET /api/analytics
- [ ] Return daily + summary data
- [ ] Parameter `days` (7/30) berfungsi
- [ ] `metric=outbound-inbound-ratio` return ratio

### POST /api/messages (send)
- [ ] Free: check daily + monthly limit → 403 jika超标
- [ ] Pro: check daily + monthly limit → 403 jika超标
- [ ] Enterprise: skip limit check
- [ ] Safety: jika `isQuarantined` → 423

## 9. WhatsApp Device
- [ ] Koneksi via pairing code / QR
- [ ] Proxy URL digunakan jika diset
- [ ] Reconnect exponential backoff (maks 5 retry)
- [ ] Auth state tersimpan di DB (BaileysAuthCred)
- [ ] Contacts di-populate via `contacts.upsert`

## 10. Edge Cases
- [ ] User tanpa subscription → auto-create default Free
- [ ] User tanpa settings → auto-create default
- [ ] Reset daily count jam 00:00
- [ ] Reset monthly count tgl 1 jam 01:00
- [ ] Akun baru (<7 hari) = `accountAge: "newborn"`
- [ ] Akun 7-30 hari = `accountAge: "growing"`
- [ ] Akun 30+ hari = `accountAge: "mature"`
