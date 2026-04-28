# 🧪 Testing Guide — BnM ILITS gRPC System

Panduan pengujian manual dan otomatis untuk memverifikasi semua fitur wajib implementasi gRPC.

---

## ⚙️ Persiapan — Jalankan Semua Server

Buka **3 terminal terpisah** dan jalankan masing-masing:

```bash
# Terminal 1 — gRPC Server (WAJIB PERTAMA)
npm run grpc
```

```bash
# Terminal 2 — REST Gateway
npm run gateway
```

```bash
# Terminal 3 — Frontend
npm run dev
```

Buka browser ke **http://localhost:8080**

> ✅ Jika ketiga server berjalan, kamu siap untuk mulai testing.

---

## 🔢 Daftar Test

| Sesi | Fitur yang Diuji | Kriteria | Metode |
|------|-----------------|----------|--------|
| [Sesi 1](#sesi-1--unary-grpc-createrequest) | CreateRequest | Unary gRPC | Browser |
| [Sesi 2](#sesi-2--unary-grpc-listrequests--state-management) | ListRequests + State | Unary + State | Browser |
| [Sesi 3](#sesi-3--unary-grpc-updaterequestStatus) | UpdateRequestStatus | Unary gRPC | Browser |
| [Sesi 4](#sesi-4--server-streaming-watchrequests) | WatchRequests Live | Server Streaming | Browser (2 tab) |
| [Sesi 5](#sesi-5--server-streaming-streamstats) | StreamStats Dashboard | Server Streaming | Browser |
| [Sesi 6](#sesi-6--bi-directional-streaming-notificationstream) | NotificationStream | Bi-dir Streaming | Browser |
| [Sesi 7](#sesi-7--error-handling) | Error Handling | Error Handling | Browser + CLI |
| [Sesi 8](#sesi-8--multi-client-demo-cli) | Multi Client CLI | Multi Client | Terminal |
| [Sesi 9](#sesi-9--automated-audit-script) | Automated Audit | Semua kriteria | Terminal |
| [Sesi 10](#sesi-10--grpc-websocket-integration) | WebSocket Gateway | Hub & Bridge | Browser |

---

## Sesi 1 — Unary gRPC: CreateRequest

**Tujuan**: Membuktikan komunikasi **Request-Response (Unary)** antara client dan gRPC server.

### Langkah-langkah

1. Buka **http://localhost:8080/request**
2. Isi form berikut:

   | Field | Nilai |
   |-------|-------|
   | Full Name | `Nama Kamu` |
   | Your Division | `Divisi Acara` |
   | Contact | `081234567890` |
   | Target Division | `Creative Design` |
   | Request Type | `Poster` |
   | Deadline | Pilih tanggal **minimal 7 hari** dari sekarang |
   | Project Title | `Test Poster Opening ILITS` |
   | Description | `Poster untuk opening ceremony, tema futuristik` |

3. Klik **Submit Request**

### ✅ Hasil yang Diharapkan

- Halaman sukses tampil dengan ID format **`REQ-XXXXXXXX`**
- Badge hijau *"gRPC Unary — CreateRequest"* terlihat di atas form
- **Catat ID-nya** untuk sesi berikutnya!

### 👀 Cek di Terminal gRPC Server
```
[RequestService] 📝 CreateRequest: "Test Poster Opening ILITS"
[RequestService] ✅ Created: REQ-XXXXXXXX
[NotifService]   📣 Broadcast ke 0 subscriber(s)
```

---

## Sesi 2 — Unary gRPC: ListRequests + State Management

**Tujuan**: Membuktikan **state in-memory server** menyimpan data dan `ListRequests` mengembalikannya.

### Langkah-langkah

1. Dari halaman sukses Sesi 1, klik **"Lihat Dashboard"**
   — atau buka langsung **http://localhost:8080/dashboard**

### ✅ Hasil yang Diharapkan

- Request yang baru dibuat **langsung muncul** di list tanpa perlu refresh
- Angka **"Total Requests"** sudah terupdate
- Data **persisten** di server (in-memory Map)

> 💡 **Bukti state management**: Data tersimpan di `grpc-server/store/inMemoryStore.js`  
> menggunakan `Map` yang hidup selama server aktif — tidak hilang antar request.

---

## Sesi 3 — Unary gRPC: UpdateRequestStatus

**Tujuan**: Membuktikan **UpdateRequestStatus Unary** mengubah status di server.

### Langkah-langkah

1. Di halaman Dashboard, klik **"Detail"** pada request yang baru dibuat
2. Klik tombol **"→ in progress"**

### ✅ Hasil yang Diharapkan

- Badge status berubah: `Pending Approval` → `In Progress`
- Toast notifikasi: *"Status diupdate ke 'in_progress'"*

### 👀 Cek di Terminal gRPC Server
```
[RequestService] 🔄 UpdateStatus: REQ-xxx → in_progress
[NotifService]   📣 SendNotification: REQUEST_UPDATE ke ALL
[NotifService]   📣 Broadcast ke X subscriber(s)
```

---

## Sesi 4 — Server Streaming: WatchRequests

**Tujuan**: Membuktikan **Server-side Streaming** — dashboard terupdate real-time tanpa refresh.

### Langkah-langkah

1. Buka **2 tab browser** secara bersamaan:
   - **Tab A**: `http://localhost:8080/dashboard`
   - **Tab B**: `http://localhost:8080/request`
2. Di **Tab B**, submit request baru (isi form seperti Sesi 1)
3. Segera pindah ke **Tab A** (jangan klik refresh)

### ✅ Hasil yang Diharapkan

- Request baru **muncul otomatis** di Tab A **tanpa refresh**
- Counter badge **"Live Stream (X events)"** bertambah
- Toast notifikasi *"📥 Request baru masuk!"* muncul di Tab A

> 💡 **Cara kerja**: Tab A menggunakan `EventSource` (SSE) yang terhubung ke  
> `/api/requests/stream/watch` → gateway → gRPC `WatchRequests` stream.

---

## Sesi 5 — Server Streaming: StreamStats

**Tujuan**: Membuktikan **StreamStats Server Streaming** mengirim update statistik otomatis.

### Langkah-langkah

1. Buka **http://localhost:8080/monitor**
2. Perhatikan badge di navbar kanan atas
3. Tunggu **10–15 detik** dan amati

### ✅ Hasil yang Diharapkan

- Badge **"Dashboard Stream (X snapshots)"** — angka `X` **bertambah setiap ~3 detik**
- Teks **"Last update: HH:MM:SS"** berubah setiap 3 detik
- Angka **Total, Pending, In Progress, Completed** sesuai data aktual
- Chart **"Request per Division"** menampilkan data per divisi

> 💡 Stream ini menggunakan gRPC `DashboardService.StreamStats` dengan interval 3 detik.

---

## Sesi 6 — Bi-directional Streaming: NotificationStream

**Tujuan**: Membuktikan komunikasi **dua arah (Bi-directional Streaming)** antar client.

### Langkah-langkah

**Bagian A — Kirim dari satu browser:**

1. Tetap di **http://localhost:8080/monitor**
2. Di panel kanan, ubah kolom **"Identitas Kamu"** menjadi: `Divisi Acara`
3. Ketik pesan: `Halo dari Divisi Acara!`
4. Tekan **Enter** atau klik ikon kirim

### ✅ Bagian A — Hasil yang Diharapkan
- Pesan muncul di panel **"Live Notifications"** dengan badge `CHAT`

**Bagian B — Verifikasi multi-client (buka tab kedua):**

1. Buka tab baru: **http://localhost:8080/monitor**
2. Ubah identitas tab baru: `Admin BnM`
3. Kirim pesan dari tab **Admin BnM**: `Pesan diterima!`

### ✅ Bagian B — Hasil yang Diharapkan
- Pesan dari `Admin BnM` **muncul di tab Divisi Acara** secara real-time
- Pesan dari `Divisi Acara` **muncul di tab Admin BnM** secara real-time
- Kedua arah komunikasi berjalan bersamaan = **Bi-directional**

> 💡 Diimplementasikan dengan `NotificationService.NotificationStream()`  
> Setiap pesan yang masuk di-broadcast ke semua subscriber aktif.

---

## Sesi 7 — Error Handling

**Tujuan**: Membuktikan **gRPC error handling** berjalan dengan benar.

### Test 7.1 — Validasi Form Kosong (Browser)

1. Buka **http://localhost:8080/request**
2. Langsung klik **Submit Request** tanpa mengisi apapun
3. ✅ Toast error: *"Lengkapi semua field yang wajib diisi"*

### Test 7.2 — Deadline Terlalu Mepet (Browser)

1. Isi form, pilih Target Division: **Creative Design** (minimum H-7)
2. Pilih deadline: **besok** atau lusa (kurang dari 7 hari)
3. ✅ Warning merah muncul:
   ```
   Creative Design butuh minimal H-7. Kamu pilih H-1.
   ```
4. Tombol Submit otomatis **disabled** (tidak bisa diklik)

### Test 7.3 — gRPC NOT_FOUND (otomatis via CLI)

Saat menjalankan `npm run client:a`, perhatikan output bagian Error Handling:
```
【4】Error Handling — GetRequest dengan ID tidak ada
   ✅ Error tertangkap dengan benar!
   gRPC Code : 5 (NOT_FOUND)
   Message   : Request dengan ID "REQ-INVALID-999" tidak ditemukan
```

### Test 7.4 — gRPC INVALID_ARGUMENT (otomatis via CLI)

Di output `client:a`:
```
   ✅ gRPC Code: 3 (INVALID_ARGUMENT) — validasi field kosong
```

---

## Sesi 8 — Multi Client: Demo CLI

**Tujuan**: Membuktikan **multi-client** — lebih dari satu client terhubung ke gRPC server secara bersamaan.

### Buka 2 terminal baru (server harus sudah jalan)

**Terminal A:**
```bash
npm run client:a
```

**Terminal B (jalankan BERSAMAAN dengan A):**
```bash
npm run client:b
```

### ✅ Output yang Diharapkan — Client A
```
╔══════════════════════════════════╗
║  CLIENT A — Divisi Acara         ║
╚══════════════════════════════════╝

【1】CreateRequest (Unary)
  ✅ Berhasil! ID: REQ-xxxxxxxx

【2】ListRequests (Unary)
  ✅ Total: X requests

【3】GetRequest (Unary)
  ✅ Found: [Client A] ...

【4】Error Handling — NOT_FOUND
  ✅ Error tertangkap: gRPC Code 5 (NOT_FOUND)

【5】WatchRequests (Server Streaming)
  📥 Initial: REQ-... | ...
  📥 CREATED: REQ-... | ...   ← request dari Client B masuk!

【6】NotificationStream (Bi-dir Streaming)
  📨 Received [REQUEST_UPDATE]: ...  ← update dari Client B!

✅ Semua test selesai — exit 0
```

### ✅ Output yang Diharapkan — Client B
```
╔══════════════════════════════════╗
║  CLIENT B — Admin BnM            ║
╚══════════════════════════════════╝

【1】ListRequests pending
  ✅ Total pending: X

【2】UpdateRequestStatus (Unary)
  ✅ Updated: REQ-xxx → in_progress

【3】StreamStats (Server Streaming)
  📊 Snapshot #1 | Total: X | Pending: X | Active Clients: X
  📊 Snapshot #2 | ...
  📊 Snapshot #3 | ...

✅ Semua test selesai — exit 0
```

### 👀 Amati di Browser Bersamaan
Saat kedua client CLI berjalan, buka **http://localhost:8080/dashboard**:
- Badge **"Live Stream"** berubah dan request terupdate otomatis
- **Active gRPC Clients** di `/monitor` menunjukkan jumlah client aktif

---

## Sesi 9 — Automated Audit Script

**Tujuan**: Menjalankan audit otomatis untuk semua **27 test case** sekaligus.

```bash
node audit-test.mjs
```

### ✅ Output yang Diharapkan

```
══════════════════════════════════════════════════════
  AUDIT REPORT — BnM ILITS gRPC System
══════════════════════════════════════════════════════

【KRITERIA 1】Request-response (Unary) gRPC
  ✅ PASS | CreateRequest (Unary) — ID: REQ-xxx
  ✅ PASS | GetRequest   (Unary) — title: [AUDIT] Unary Test
  ✅ PASS | ListRequests (Unary) — total: X
  ✅ PASS | UpdateRequestStatus (Unary) — → in_progress
  ✅ PASS | GetStats     (Unary) — requests: X
  ✅ PASS | SendNotification (Unary) — id: xxxxxxxx
  ✅ PASS | GetNotifications (Unary) — count: X

【KRITERIA 2】Streaming gRPC
  ✅ PASS | WatchRequests (Server-side Streaming)
  ✅ PASS | StreamStats (Server-side Streaming)
  ✅ PASS | NotificationStream (Bi-directional Streaming)

【KRITERIA 3】Error Handling (gRPC Status Codes)
  ✅ PASS | NOT_FOUND — ID tidak ditemukan
  ✅ PASS | INVALID_ARGUMENT — field wajib kosong
  ✅ PASS | INVALID_ARGUMENT — status tidak valid
  ✅ PASS | NOT_FOUND — update request tidak ada

【KRITERIA 4】State Management (In-Memory Server)
  ✅ PASS | State persists: request count bertambah
  ✅ PASS | State konsisten: count tepat +1
  ✅ PASS | In-memory Map terpusat (inMemoryStore.js)
  ✅ PASS | Stats real-time mencerminkan state

【KRITERIA 5】Multi Client
  ✅ PASS | Browser Tab 1 — Dashboard SSE (WatchRequests)
  ✅ PASS | Browser Tab 2 — LiveMonitor SSE (StreamStats + NotifStream)
  ✅ PASS | CLI client-demo-a.js — Divisi Acara
  ✅ PASS | CLI client-demo-b.js — Admin BnM
  ✅ PASS | Active clients counter terdeteksi server

【KRITERIA 6】Minimal 3 gRPC Services
  ✅ PASS | Service 1: RequestService     (5 RPCs)
  ✅ PASS | Service 2: NotificationService (3 RPCs)
  ✅ PASS | Service 3: DashboardService   (3 RPCs)
  ✅ PASS | Total: 11 RPC methods (> minimum)

══════════════════════════════════════════════════════
  HASIL AUDIT AKHIR
  ✅ PASS : 27 / 27
  ❌ FAIL : 0 / 27
  📊 Score: 100%
  🎯 Status: SEMUA KRITERIA WAJIB TERPENUHI ✅
══════════════════════════════════════════════════════
```

---

## 📋 Checklist Ringkasan

Gunakan checklist ini untuk memastikan semua sudah diuji:

```
SESI 1 — Unary CreateRequest
  [ ] Form terisi lengkap → Submit
  [ ] ID "REQ-XXXXXXXX" muncul di halaman sukses

SESI 2 — ListRequests + State
  [ ] Dashboard menampilkan request yang baru dibuat
  [ ] Angka Total Requests terupdate

SESI 3 — UpdateRequestStatus
  [ ] Status berubah di dashboard setelah klik tombol

SESI 4 — Server Streaming WatchRequests
  [ ] Buka 2 tab → submit request di Tab B
  [ ] Request muncul otomatis di Tab A tanpa refresh

SESI 5 — Server Streaming StreamStats
  [ ] Badge snapshot count bertambah setiap 3 detik
  [ ] "Last update" berubah secara otomatis

SESI 6 — Bi-directional NotificationStream
  [ ] Pesan terkirim dari satu tab
  [ ] Pesan diterima di tab lain secara real-time
  [ ] Komunikasi berjalan dua arah (A→B dan B→A)

SESI 7 — Error Handling
  [ ] Form kosong → toast error muncul
  [ ] Deadline terlalu dekat → warning merah + submit disabled
  [ ] CLI output menunjukkan NOT_FOUND dan INVALID_ARGUMENT

SESI 8 — Multi Client CLI
  [ ] npm run client:a → exit code 0
  [ ] npm run client:b → exit code 0
  [ ] Keduanya berjalan bersamaan tanpa konflik

SESI 9 — Automated Audit
  [ ] node audit-test.mjs → 27/27 PASS, Score: 100%

SESI 10 — gRPC-WebSocket Hub
  [ ] Navigasi ke `/ws-monitor` → Status "System Online" (Hijau)
  [ ] Metrics & Chart terupdate otomatis (Event-Driven UI)
  [ ] Pesan "System Alert" muncul otomatis (Server-Initiated)
  [ ] Kirim Broadcast via Dispatcher → Toast sukses muncul (Command & Control)
```

---

## Sesi 10 — gRPC-WebSocket Integration

**Tujuan**: Memverifikasi jembatan antara gRPC dan WebSocket sesuai requirement tugas.

### Langkah-langkah

1. Buka **http://localhost:8080/ws-monitor**
2. Perhatikan bagian **"Operational Feed"**:
   - ✅ Harus ada log `System Online` dan `Session Started`.
3. Tunggu hingga 60 detik:
   - ✅ Panel **"Global Broadcast"** atau **Feed** harus menerima pesan `System Health Check` secara otomatis (Server-Initiated).
4. Gunakan **"Operations Dispatcher"**:
   - Masukkan ID: `REQ-12345`
   - Pilih Status: `Revision`
   - Klik **"Commit Change"**
   - ✅ Toast harus muncul: *"Command UPDATE_STATUS dikirim via WebSocket -> gRPC"*.
   - ✅ Log di terminal `ws-server.js` akan mencatat pemanggilan gRPC.

> 💡 **Requirement Check**:
> - **Event-Driven**: UI (Chart/Feed) berubah tanpa refresh.
> - **Server-Initiated**: Alert muncul tanpa permintaan client.
> - **C&C Bridge**: Instruksi UI memicu fungsi gRPC di backend.

---

## 🔌 Port Reference

| Komponen | Port | Command |
|----------|------|---------|
| gRPC Server | `50051` | `npm run grpc` |
| REST Gateway | `3001` | `npm run gateway` |
| Frontend | `8080` | `npm run dev` |

## 📁 File Referensi

| File | Deskripsi |
|------|-----------|
| `grpc-server/store/inMemoryStore.js` | State management in-memory |
| `grpc-server/services/requestService.js` | Unary + Server Streaming |
| `grpc-server/services/notificationService.js` | Bi-directional Streaming |
| `grpc-server/services/dashboardService.js` | Server Streaming stats |
| `grpc-clients/client-demo-a.js` | Demo multi-client: Divisi Acara |
| `grpc-clients/client-demo-b.js` | Demo multi-client: Admin BnM |
| `audit-test.mjs` | Automated audit 27 test cases |
