# 🎨 BnM-ILITS-Flow: gRPC & WebSocket Real-time Management System

<div align="center">

![gRPC](https://img.shields.io/badge/Protocol-gRPC-4285F4?style=for-the-badge&logo=google&logoColor=white)
![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-010101?style=for-the-badge&logo=websocket&logoColor=white)
![Node.js](https://img.shields.io/badge/Runtime-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)

**Sistem manajemen request real-time dengan integrasi gRPC & WebSocket Gateway**  
*Tugas Integrasi Sistem — Semester 4*

</div>

---

## 📖 Deskripsi Proyek

**BnM ILITS Smart Request Management System** adalah implementasi sistem komunikasi Client-Server menggunakan protokol **gRPC** (Google Remote Procedure Call). Sistem ini dibangun untuk mensimulasikan alur kerja internal divisi **Branding & Marketing (BnM)** di acara **Ini Lho ITS! (ILITS) 2026**.

Divisi-divisi seperti Acara, Sponsorship, dan Publikasi dapat mengirimkan **request kreatif** (poster, video, caption, strategi marketing) ke tim BnM secara real-time. Admin BnM dapat memonitor, mereview, dan memperbarui status semua request melalui dashboard yang terupdate langsung via **gRPC Streaming**.

### 🎯 Tujuan

1. Mengimplementasikan protokol **gRPC** sebagai pengganti REST API biasa untuk komunikasi antar layanan
2. Mendemonstrasikan **3 pola komunikasi gRPC**: Unary, Server-side Streaming, dan Bi-directional Streaming
3. Membangun sistem **multi-client** yang bisa diakses dari browser maupun CLI secara bersamaan
4. Menerapkan **in-memory state management** terpusat di sisi server

---

## 🏗️ Desain Sistem

### Arsitektur Keseluruhan

```
╔═══════════════════════════════════════════════════════════════════╗
║                    LAYER 1 — FRONTEND                             ║
║              React + Vite + TypeScript (port 8080)                ║
║   ┌──────────┐  ┌─────────────┐  ┌───────────┐  ┌────────────┐  ║
║   │  Page    │  │  Request    │  │ (Streaming│  │  Monitor   │  │  Ops Hub   │  ║
║   │          │  │  (Unary)    │  │  + CRUD)  │  │ (Bidi+SSS) │  │ (WebSocket)│  ║
║   └──────────┘  └─────────────┘  └───────────┘  └────────────┘  └────────────┘  ║
╚═══════════════════════════════════╦═══════════════════════════════╝
                                    ║ REST / WS
                                    ▼
╔═══════════════════════════════════════════════════════════════════╗
║                  LAYER 2 — REST GATEWAY                           ║
║              Express.js (port 3001)                               ║
║                                                                   ║
║  • Menerima request REST dari browser                             ║
║  • Meneruskan ke gRPC Server sebagai gRPC CLIENT                  ║
║  • Mengkonversi gRPC Streaming → SSE (Server-Sent Events)         ║
╚═══════════════════════════════════╦═══════════════════════════════╝
                                    ║
                                    ▼
╔═══════════════════════════════════════════════════════════════════╗
║                LAYER 2.5 — WEBSOCKET GATEWAY                      ║
║              ws-server.js (port 3002)                             ║
║                                                                   ║
║  • Bridge gRPC Streams (Stats, Watch, Notif) → WebSocket          ║
║  • Server-Initiated Events (Heartbeat & Global Alerts)            ║
║  • Command & Control Bridge (WS → gRPC Unary calls)               ║
╚═══════════════════════════════════╦═══════════════════════════════╝
                                    ║ gRPC Protocol (HTTP/2)
                                    ▼
╔═══════════════════════════════════════════════════════════════════╗
║                   LAYER 3 — gRPC SERVER                           ║
║                    Node.js (port 50051)                           ║
║                                                                   ║
║  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ ║
║  │  RequestService │  │NotificationService│  │DashboardService │ ║
║  │                 │  │                  │  │                  │ ║
║  │ • CreateRequest │  │ • SendNotif      │  │ • GetStats       │ ║
║  │ • GetRequest    │  │ • GetNotifs      │  │ • GetByDivision  │ ║
║  │ • ListRequests  │  │ • NotifStream ◄► │  │ • StreamStats ▼  │ ║
║  │ • UpdateStatus  │  │   (Bidi Stream)  │  │  (Srvr Stream)   │ ║
║  │ • WatchRequests │  │                  │  │                  │ ║
║  │   (Srvr Stream) │  │                  │  │                  │ ║
║  └─────────────────┘  └──────────────────┘  └─────────────────┘ ║
║                                                                   ║
║              ┌─────────────────────────────────┐                 ║
║              │    In-Memory Store (Map-based)   │                 ║
║              │  requests • notifications • subs │                 ║
║              └─────────────────────────────────┘                 ║
╚═══════════════════════════════════════════════════════════════════╝
              ▲                             ▲
              │ gRPC direct                 │ gRPC direct
              │                             │
  ┌───────────────────┐         ┌───────────────────┐
  │  client-demo-a.js │         │  client-demo-b.js │
  │  (Divisi Acara)   │         │  (Admin BnM)      │
  │                   │         │                   │
  │ • CreateRequest   │         │ • ListRequests    │
  │ • ListRequests    │         │ • UpdateStatus    │
  │ • WatchRequests   │         │ • SendNotif       │
  │ • NotifStream     │         │ • NotifStream     │
  └───────────────────┘         │ • StreamStats     │
                                └───────────────────┘
```

### Alur Data

```
User submit request di browser
        │
        ▼
POST /api/requests (REST)
        │
        ▼
Gateway → CreateRequest (gRPC Unary) → gRPC Server
        │                                    │
        │                         Simpan ke inMemoryStore
        │                                    │
        │                         Broadcast ke semua WatchRequests subscribers
        │                                    │
        ▼                                    ▼
Gateway ← Response ← gRPC Server    SSE event: "CREATED"
        │                                    │
Response JSON ke browser            Dashboard update otomatis
                                    LiveMonitor notif update

### Alur Data (WebSocket Bridge)

```
gRPC Server (Port 50051)
      │
      │ (1) gRPC Server Streaming (.on('data'))
      ▼
WebSocket Gateway (Port 3002)
      │
      │ (2) broadcast(type, payload) 
      ▼
Web Browser (WebSocket Client)
      │
      │ (3) useWebSocket Hook (.onmessage)
      ▼
UI Components (Metrics, Charts, Feed) ───► Re-render secara dinamis
```
```

---

## 🔌 gRPC Services

### 1. RequestService (`proto/request.proto`)

| Method | Type | Deskripsi |
|--------|------|-----------|
| `CreateRequest` | **Unary** | Submit request kreatif baru |
| `GetRequest` | **Unary** | Ambil detail satu request by ID |
| `ListRequests` | **Unary** | Ambil semua request (dengan filter) |
| `UpdateRequestStatus` | **Unary** | Update status request (pending → in_progress → dll) |
| `WatchRequests` | **Server Streaming** ⬇️ | Stream real-time setiap ada request baru/update |

### 2. NotificationService (`proto/notification.proto`)

| Method | Type | Deskripsi |
|--------|------|-----------|
| `SendNotification` | **Unary** | Kirim notifikasi ke divisi tertentu / broadcast ALL |
| `GetNotifications` | **Unary** | Ambil semua notifikasi untuk suatu divisi |
| `NotificationStream` | **Bi-directional Streaming** ↕️ | Channel notifikasi dua arah — client kirim pesan, server broadcast ke semua subscriber |

### 3. DashboardService (`proto/dashboard.proto`)

| Method | Type | Deskripsi |
|--------|------|-----------|
| `GetStats` | **Unary** | Snapshot statistik request saat ini |
| `GetRequestsByDivision` | **Unary** | Statistik request per divisi tertentu |
| `StreamStats` | **Server Streaming** ⬇️ | Stream update statistik setiap N detik (default 3 detik) |

---

## ✅ Pemenuhan Kriteria Tugas

| Kriteria Wajib | Status | Detail Implementasi |
|---|:---:|---|
| **Request-response (Unary) gRPC** | ✅ | 6 unary methods: `CreateRequest`, `GetRequest`, `ListRequests`, `UpdateStatus`, `GetStats`, `SendNotification` |
| **Server-side Streaming** | ✅ | `WatchRequests` — Dashboard live update; `StreamStats` — LiveMonitor trend chart |
| **Bi-directional Streaming** | ✅ | `NotificationStream` — LiveMonitor notification feed dua arah |
| **Error Handling** | ✅ | gRPC status codes: `NOT_FOUND`, `INVALID_ARGUMENT`, `INTERNAL`, `ALREADY_EXISTS` |
| **State Management (in-memory)** | ✅ | `inMemoryStore.js` — central `Map`-based store untuk requests & notifications |
| **Multi Client** | ✅ | Browser (multiple tabs) + `client-demo-a.js` + `client-demo-b.js` terhubung bersamaan |
| **Minimal 3 Services** | ✅ | `RequestService`, `NotificationService`, `DashboardService` |
| **WebSocket Integration** | ✅ | Bridge gRPC Streams ke WebSocket Client |
| **Event-Driven UI** | ✅ | 3 komponen dinamis di Live Operations Hub (Metrics, Trends, Feed) |
| **Server-Initiated Events** | ✅ | Push Heartbeat (30s) & System Alert (60s) otomatis |
| **Command & Control** | ✅ | Operations Dispatcher (WS → gRPC trigger) |

---

## 📁 Struktur Proyek

```
bnmsys-ilits-flow-main/
│
├── 📂 proto/                           ← Protobuf Definitions
│   ├── request.proto                   # RequestService (5 RPCs)
│   ├── notification.proto              # NotificationService (3 RPCs)
│   └── dashboard.proto                 # DashboardService (3 RPCs)
│
├── 📂 grpc-server/                     ← gRPC Server (port 50051)
│   ├── server.js                       # Entry point, load & register 3 services
│   ├── 📂 services/
│   │   ├── requestService.js           # Unary + Server Streaming
│   │   ├── notificationService.js      # Unary + Bi-directional Streaming
│   │   └── dashboardService.js         # Unary + Server Streaming
│   └── 📂 store/
│       └── inMemoryStore.js            # State management (Map-based)
│
├── 📂 server/                          ← Backend Layer
│   ├── server.js                       # Express: REST ↔ gRPC bridge
│   └── ws-server.js                    # WebSocket Gateway (Bridge gRPC ↔ Browser)
│
├── 📂 grpc-clients/                    ← Demo CLI Clients
│   ├── client-demo-a.js                # Client "Divisi Acara"
│   └── client-demo-b.js                # Client "Admin BnM"
│
├── 📂 src/                             ← React Frontend
│   └── 📂 pages/
│       ├── Index.tsx                   # Homepage
│       ├── Request.tsx                 # Form submit (→ Unary gRPC)
│       ├── Dashboard.tsx               # List request (→ Unary + SSE Stream)
│       ├── LiveMonitor.tsx             # Monitoring (→ Server Stream + Bidi Stream)
│       └── WsMonitor.tsx               # Live Operations Hub (→ WebSocket)
│
└── 📂 src/pages/                       ← Existing pages (unchanged design)
```

---

## 🔄 Pola Komunikasi gRPC

### Unary (Request-Response)

```
Client                          Server
  │                               │
  │── CreateRequest(data) ────────►│
  │                          Proses & simpan
  │◄─── RequestResponse ──────────│
  │                               │
```

### Server-side Streaming

```
Client                          Server
  │                               │
  │── WatchRequests(filter) ──────►│
  │                         Daftarkan subscriber
  │◄── RequestEvent (INITIAL) ────│  ← snapshot awal
  │◄── RequestEvent (CREATED) ────│  ← saat request baru masuk
  │◄── RequestEvent (UPDATED) ────│  ← saat status diupdate
  │         (terus streaming...)   │
  │── cancel ─────────────────────►│
  │                               │
```

### Bi-directional Streaming

```
Client A                        Server                       Client B
  │                               │                               │
  │── connect ────────────────────►│◄──────────────── connect ────│
  │                         Register subscribers                  │
  │── Message("Hello BnM") ───────►│                               │
  │                        Broadcast ke subscribers               │
  │                               │──── Message("Hello BnM") ────►│
  │◄── SystemNotif ───────────────│                               │
  │                               │                               │
  │                               │◄── Message("Noted!") ─────────│
  │◄── Message("Noted!") ─────────│                               │
```

---

## 🔍 Code Walkthrough

### 1. gRPC ↔ WebSocket Bridge (`server/ws-server.js`)
Bagian ini adalah "otak" yang menjembatani protokol gRPC yang berbasis HTTP/2 dengan WebSocket yang berbasis TCP.
- **Inisialisasi Client:** Gateway membuat instance `requestClient`, `notifClient`, dan `dashClient` untuk berbicara dengan server gRPC.
- **Stream Listener:** Menggunakan event listener Node.js `.on('data')` pada stream gRPC. Setiap data yang masuk dari gRPC langsung diteruskan ke fungsi `broadcast()`.
- **Broadcasting:** Fungsi `broadcast()` mengiterasi semua client WebSocket yang terhubung dan mengirimkan data dalam format JSON.

### 2. Client Side Integration (`src/hooks/useWebSocket.ts`)
Hook kustom ini mengelola siklus hidup koneksi WebSocket di browser.
- **Connection Manager:** Menangani `new WebSocket()`, serta logika *exponential backoff* untuk reconnect jika server down.
- **Message Dispatcher:** Menggunakan blok `switch(type)` untuk memproses berbagai jenis pesan (STATS_UPDATE, REQUEST_EVENT, dll) dan menyimpannya ke dalam *React State*.
- **State Synchronization:** Data yang disimpan di state akan memicu re-render otomatis pada komponen UI (seperti grafik Recharts) tanpa perlu interaksi user.

### 3. Command & Control (`ws-server.js` switch case)
Saat browser mengirim pesan via WebSocket (`ws.send()`), gateway menerima pesan tersebut, melakukan validasi, dan memicu pemanggilan fungsi gRPC yang sesuai (Unary) menggunakan bantuan `grpcCall` (promisified gRPC call).
```

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **State (UI)** | React hooks, SSE (`EventSource`) |
| **Gateway** | Express.js 5, CORS |
| **gRPC Library** | `@grpc/grpc-js`, `@grpc/proto-loader` |
| **State (Server)** | In-Memory `Map` (JavaScript built-in) |
| **Proto Format** | Protocol Buffers v3 |
| **Runtime** | Node.js (ESM modules) |

---

## 🚀 Cara Menjalankan

> Diperlukan **4 terminal** yang berjalan bersamaan.

### Prasyarat

```bash
node --version  # >= 18.x
npm --version   # >= 9.x
```

### Instalasi

```bash
git clone <repo-url>
cd bnmsys-ilits-flow-main
npm install
```

### Menjalankan Sistem

```bash
# Terminal 1 — gRPC Server (harus pertama!)
npm run grpc
# Output: "BnM ILITS — gRPC Server Started Successfully! | port 50051"

# Terminal 2 — REST Gateway
npm run gateway
# Output: "BnM ILITS — REST Gateway Started! | port 3001"

# Terminal 3 — WebSocket Gateway
npm run ws
# Output: "WebSocket Gateway started on port 3002"

# Terminal 4 — Frontend
npm run dev
# Output: "Local: http://localhost:8080"
```

Buka **http://localhost:8080** di browser.

### Demo Multi-Client

```bash
# Terminal 4 — Jalankan bersamaan untuk demo multi-client
npm run client:a    # Demo: Divisi Acara
npm run client:b    # Demo: Admin BnM
```

### Deployment via Docker (Rekomendasi)

Jika kamu ingin menjalankan seluruh sistem (4 server) hanya dengan satu perintah:

```bash
# Build dan jalankan semua container
docker-compose up --build
```

Sistem akan otomatis berjalan di port yang sama:
- Frontend: `http://localhost:8080`
- REST Gateway: `http://localhost:3001`
- WS Gateway: `http://localhost:3002`
- gRPC Server: `localhost:50051`

---

## 🖥️ Halaman Aplikasi

### 🏠 Home (`/`)
Landing page sistem BnM ILITS dengan navigasi ke semua fitur.

### 📝 Create Request (`/request`)
Form untuk mengirim request kreatif ke divisi BnM.  
Submit → `CreateRequest` **Unary gRPC** → response dengan ID unik (`REQ-xxxx`).

### 📊 Dashboard (`/dashboard`)
Menampilkan semua request dengan status real-time.  
- Fetch data: `ListRequests` **Unary gRPC**  
- Live update: `WatchRequests` **Server Streaming** via SSE — badge "Live Stream" di navbar  
- Update status: `UpdateRequestStatus` **Unary gRPC**

### 📡 Live Monitor (`/monitor`)
Halaman monitoring real-time dengan dua stream aktif bersamaan:
- **Kiri**: Stats dashboard dari `StreamStats` **Server Streaming** (update tiap 3 detik)
  - Total requests, pending, in progress, completed
  - Active gRPC clients counter
  - Request per division bar chart
- **Kanan**: Notification feed dari `NotificationStream` **Bi-directional Streaming**
  - Bisa kirim pesan/broadcast ke semua divisi
### 🌐 Live Operations Hub (`/ws-monitor`)
Pusat kendali real-time menggunakan **WebSocket Gateway** untuk integrasi gRPC yang lebih responsif:
- **Performance Metrics**: Angka statistik real-time yang tersinkronisasi via gRPC `StreamStats`.
- **Operational Feed**: Feed aktivitas global yang menggabungkan berbagai stream gRPC.
- **System Broadcasts**: Menerima peringatan otomatis dari server tanpa request.
- **Operations Dispatcher**: Antarmuka untuk mengirim instruksi (Update Status, Messaging) yang memicu pemanggilan fungsi gRPC di back-end.

---

## 📡 REST Gateway Endpoints

| Method | Endpoint | gRPC Call | Type |
|--------|----------|-----------|------|
| `POST` | `/api/requests` | `CreateRequest` | Unary |
| `GET` | `/api/requests` | `ListRequests` | Unary |
| `GET` | `/api/requests/:id` | `GetRequest` | Unary |
| `PATCH` | `/api/requests/:id/status` | `UpdateRequestStatus` | Unary |
| `GET` | `/api/requests/stream/watch` | `WatchRequests` | → SSE |
| `POST` | `/api/notifications` | `SendNotification` | Unary |
| `GET` | `/api/notifications` | `GetNotifications` | Unary |
| `GET` | `/api/notifications/stream` | `NotificationStream` | → SSE |
| `GET` | `/api/dashboard/stats` | `GetStats` | Unary |
| `GET` | `/api/dashboard/stream` | `StreamStats` | → SSE |

---

## 👥 Kontribusi

Proyek ini dibuat sebagai tugas mata kuliah **Integrasi Sistem** Semester 4.

---

<div align="center">

© 2026 Branding & Marketing Division — **Ini Lho ITS!**

*Dibangun dengan ❤️ menggunakan gRPC*

</div>
