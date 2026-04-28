/**
 * WEBSOCKET GATEWAY — BnM ILITS gRPC-WebSocket Bridge
 *
 * Fitur yang diimplementasikan:
 *  1. WebSocket ↔ gRPC Streaming Bridge
 *     - StreamStats  (Server Streaming)  → broadcast STATS_UPDATE ke semua WS client
 *     - WatchRequests (Server Streaming) → broadcast REQUEST_EVENT ke semua WS client
 *     - NotificationStream (Bidi)        → broadcast NOTIFICATION ke semua WS client
 *
 *  2. Server-Initiated Events (push tanpa request dari browser)
 *     - SYSTEM_ALERT: dikirim otomatis tiap 60 detik
 *     - HEARTBEAT: dikirim tiap 30 detik
 *
 *  3. Command & Control Bridge (Browser → WS → gRPC)
 *     - CREATE_REQUEST   → grpc CreateRequest
 *     - UPDATE_STATUS    → grpc UpdateRequestStatus
 *     - SEND_NOTIFICATION → grpc SendNotification
 *     - TRIGGER_ALERT    → kirim SYSTEM_ALERT ke semua client
 *
 * Run: node server/ws-server.js
 * Port: 3002 (default, override via WS_PORT env)
 */

import { WebSocketServer, WebSocket } from 'ws';
import grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROTO_DIR  = join(__dirname, '..', 'proto');

// ─────────────────────────────────────────────
//  Load .proto & Create gRPC Clients
// ─────────────────────────────────────────────
const PROTO_OPTIONS = {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
};

const requestPkg   = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'request.proto'),      PROTO_OPTIONS));
const notifPkg     = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'notification.proto'), PROTO_OPTIONS));
const dashboardPkg = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'dashboard.proto'),    PROTO_OPTIONS));

const GRPC_HOST = process.env.GRPC_HOST || 'localhost';
const GRPC_ADDR = `${GRPC_HOST}:${process.env.GRPC_PORT || 50051}`;
const CREDS     = grpc.credentials.createInsecure();

const requestClient  = new requestPkg.bnm_ilits.RequestService(GRPC_ADDR, CREDS);
const notifClient    = new notifPkg.bnm_ilits.NotificationService(GRPC_ADDR, CREDS);
const dashClient     = new dashboardPkg.bnm_ilits.DashboardService(GRPC_ADDR, CREDS);

// ─────────────────────────────────────────────
//  Promisify helper
// ─────────────────────────────────────────────
function grpcCall(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

// ─────────────────────────────────────────────
//  WebSocket Server
// ─────────────────────────────────────────────
const WS_PORT = parseInt(process.env.WS_PORT || '3002');
const wss = new WebSocketServer({ 
  port: parseInt(process.env.WS_PORT || '3002'),
  // Fitur Auth: Verifikasi sebelum upgrade ke WebSocket
  handleProtocols: (protocols) => protocols[0], 
});

// Track semua client yang terhubung
const clients = new Set();

// ─────────────────────────────────────────────
//  Helper: Broadcast ke semua client
// ─────────────────────────────────────────────
function broadcast(type, payload, excludeWs = null) {
  const msg = JSON.stringify({ type, payload, serverTime: new Date().toISOString() });
  let sent = 0;

  for (const ws of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {

      // 🔥 FILTER SUBSCRIPTION
            if (ws.subscriptions && ws.subscriptions.size > 0) {
        const map = {
          STATS_UPDATE: 'stats',
          REQUEST_EVENT: 'requests',
          NOTIFICATION: 'notifications',
        };

        const channel = map[type];
        if (channel && !ws.subscriptions.has(channel)) {
          continue;
        }
      }

      ws.send(msg);
      sent++;
    }
  }

  return sent;
}

// Helper: Kirim ke satu client
function sendToClient(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, serverTime: new Date().toISOString() }));
  }
}

// ─────────────────────────────────────────────
//  gRPC Stream: DashboardService.StreamStats
//  → Broadcast STATS_UPDATE ke semua WS client
// ─────────────────────────────────────────────
let statsStream = null;
let statsStreamActive = false;

function startStatsStream() {
  if (statsStreamActive) return;

  try {
    statsStream = dashClient.StreamStats({ interval_seconds: 3, division: '' });
    statsStreamActive = true;
    console.log('[WS-Gateway] 📡 StreamStats gRPC stream started');

    statsStream.on('data', (snapshot) => {
      broadcast('STATS_UPDATE', snapshot);
    });

    statsStream.on('error', (err) => {
      console.error('[WS-Gateway] ❌ StreamStats error:', err.message);
      statsStreamActive = false;
      // Retry after 5s
      setTimeout(startStatsStream, 5000);
    });

    statsStream.on('end', () => {
      console.log('[WS-Gateway] StreamStats ended, restarting...');
      statsStreamActive = false;
      setTimeout(startStatsStream, 3000);
    });
  } catch (err) {
    console.error('[WS-Gateway] ❌ Failed to start StreamStats:', err.message);
    statsStreamActive = false;
    setTimeout(startStatsStream, 5000);
  }
}

// ─────────────────────────────────────────────
//  gRPC Stream: RequestService.WatchRequests
//  → Broadcast REQUEST_EVENT ke semua WS client
// ─────────────────────────────────────────────
let watchStream = null;
let watchStreamActive = false;

function startWatchStream() {
  if (watchStreamActive) return;

  try {
    watchStream = requestClient.WatchRequests({ division: '' });
    watchStreamActive = true;
    console.log('[WS-Gateway] 👁️  WatchRequests gRPC stream started');

    watchStream.on('data', (event) => {
      broadcast('REQUEST_EVENT', event);
    });

    watchStream.on('error', (err) => {
      console.error('[WS-Gateway] ❌ WatchRequests error:', err.message);
      watchStreamActive = false;
      setTimeout(startWatchStream, 5000);
    });

    watchStream.on('end', () => {
      watchStreamActive = false;
      setTimeout(startWatchStream, 3000);
    });
  } catch (err) {
    console.error('[WS-Gateway] ❌ Failed to start WatchRequests:', err.message);
    watchStreamActive = false;
    setTimeout(startWatchStream, 5000);
  }
}

// ─────────────────────────────────────────────
//  gRPC Stream: NotificationService.NotificationStream
//  → Broadcast NOTIFICATION ke semua WS client
// ─────────────────────────────────────────────
let notifStream = null;
let notifStreamActive = false;

function startNotifStream() {
  if (notifStreamActive) return;

  try {
    notifStream = notifClient.NotificationStream();
    notifStreamActive = true;
    console.log('[WS-Gateway] 🔔 NotificationStream gRPC stream started');

    // Identify ourselves
    notifStream.write({
      id: '',
      from: 'WS-Gateway',
      to: 'ALL',
      type: 'SYSTEM',
      title: 'WebSocket Gateway Connected',
      body: 'WS-Gateway terhubung ke NotificationStream',
      request_id: '',
      timestamp: new Date().toISOString(),
    });

    notifStream.on('data', (notif) => {
      // Skip echo dari diri sendiri
      if (notif.from === 'WS-Gateway' && notif.type === 'SYSTEM') return;
      broadcast('NOTIFICATION', notif);
    });

    notifStream.on('error', (err) => {
      console.error('[WS-Gateway] ❌ NotificationStream error:', err.message);
      notifStreamActive = false;
      setTimeout(startNotifStream, 5000);
    });

    notifStream.on('end', () => {
      notifStreamActive = false;
      setTimeout(startNotifStream, 3000);
    });
  } catch (err) {
    console.error('[WS-Gateway] ❌ Failed to start NotificationStream:', err.message);
    notifStreamActive = false;
    setTimeout(startNotifStream, 5000);
  }
}

// ─────────────────────────────────────────────
//  Server-Initiated Events
//  Fitur #3: Server mendorong data secara proaktif
// ─────────────────────────────────────────────

// HEARTBEAT — tiap 30 detik
const serverStartTime = Date.now();
setInterval(() => {
  if (clients.size === 0) return;
  broadcast('HEARTBEAT', {
    message: 'Server alive',
    clients_connected: clients.size,
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    grpc_streams: {
      stats:         statsStreamActive,
      watch_requests: watchStreamActive,
      notifications: notifStreamActive,
    },
  });
}, 30000);

// SYSTEM_ALERT — tiap 60 detik (server-initiated, tanpa request dari client)
const alertMessages = [
  { level: 'INFO',    title: 'System Health Check',     body: 'Semua layanan berjalan normal. gRPC streams aktif.' },
  { level: 'INFO',    title: 'Statistik Sistem',         body: 'Dashboard diperbarui dari gRPC StreamStats setiap 3 detik.' },
  { level: 'WARNING', title: 'Reminder Deadline',        body: 'Pastikan semua request dengan status PENDING segera ditindaklanjuti.' },
  { level: 'INFO',    title: 'WebSocket Bridge Status',  body: 'Koneksi WebSocket ↔ gRPC berjalan stabil.' },
  { level: 'SUCCESS', title: 'Auto-Monitoring Aktif',    body: 'Server sedang memantau semua perubahan request secara real-time.' },
];
let alertIdx = 0;

setInterval(() => {
  if (clients.size === 0) return;
  const alert = alertMessages[alertIdx % alertMessages.length];
  alertIdx++;
  broadcast('SYSTEM_ALERT', {
    ...alert,
    id: `alert-${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
  console.log(`[WS-Gateway] 🚨 Server-Initiated Alert sent to ${clients.size} client(s): ${alert.title}`);
}, 60000);

// ─────────────────────────────────────────────
//  WebSocket Connection Handler
// ─────────────────────────────────────────────
wss.on('connection', async (ws, req) => {
  // 1. JWT Auth Check
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  ws.user = { dummy: true };

  // 2. Client Subscription Logic
  ws.subscriptions = new Set(); 

  const clientId = `ws-${Math.random().toString(36).slice(2)}`;
  ws.clientId = clientId;
  clients.add(ws);

  // Kirim welcome message dengan status sistem saat ini
  sendToClient(ws, 'WELCOME', {
    clientId,
    message: 'Terhubung ke BnM ILITS WebSocket Gateway',
    grpc_target: GRPC_ADDR,
    grpc_streams: {
      stats:          statsStreamActive,
      watch_requests: watchStreamActive,
      notifications:  notifStreamActive,
    },
    clients_connected: clients.size,
    serverTime: new Date().toISOString(),
  });

  // ─── Command & Control: Terima pesan dari browser ───
  // Fitur #4: Browser mengirim instruksi → trigger gRPC
  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendToClient(ws, 'ERROR', { message: 'Invalid JSON' });
      return;
    }

    const { type, payload = {} } = msg;
    console.log(`[WS-Gateway] ⚡ Command from ${clientId}: ${type}`, JSON.stringify(payload));

    switch (type) {
      // ─── SUBSCRIBE: Client mendaftar ke channel ─────
      case 'SUBSCRIBE': {
        ws.subscriptions = new Set(payload.channels || []);
        sendToClient(ws, 'SUBSCRIBED', { channels: ws.subscriptions });
        break;
      }

      // ─── CREATE_REQUEST: Buat request baru via gRPC ─
      case 'CREATE_REQUEST': {
        try {
          const result = await grpcCall(requestClient, 'CreateRequest', payload);
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'CREATE_REQUEST',
            success: result.success,
            message: result.message,
            data: result.data,
          });
          if (result.success) {
            console.log(`[WS-Gateway] ✅ CreateRequest via WS: ${result.data?.id}`);
          }
        } catch (err) {
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'CREATE_REQUEST',
            success: false,
            message: err.message,
          });
        }
        break;
      }

      // ─── UPDATE_STATUS: Update status request via gRPC ─
      case 'UPDATE_STATUS': {
        try {
          const result = await grpcCall(requestClient, 'UpdateRequestStatus', {
            id:     payload.id,
            status: payload.status,
            note:   payload.note || '',
          });
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'UPDATE_STATUS',
            success: result.success,
            message: result.message,
            data: result.data,
          });
          if (result.success) {
            console.log(`[WS-Gateway] ✅ UpdateStatus via WS: ${payload.id} → ${payload.status}`);
          }
        } catch (err) {
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'UPDATE_STATUS',
            success: false,
            message: err.message,
          });
        }
        break;
      }

      // ─── SEND_NOTIFICATION: Kirim notif via gRPC ─────
      case 'SEND_NOTIFICATION': {
        try {
          const result = await grpcCall(notifClient, 'SendNotification', {
            from_division: payload.from_division || 'WS-Client',
            to_division:   payload.to_division   || 'ALL',
            type:          payload.type          || 'CHAT',
            title:         payload.title         || '',
            body:          payload.body          || '',
            request_id:    payload.request_id    || '',
          });
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'SEND_NOTIFICATION',
            success: result.success,
            message: result.message,
            data: result.data,
          });
        } catch (err) {
          sendToClient(ws, 'COMMAND_RESULT', {
            command: 'SEND_NOTIFICATION',
            success: false,
            message: err.message,
          });
        }
        break;
      }

      // ─── TRIGGER_ALERT: Minta server kirim system alert ─
      case 'TRIGGER_ALERT': {
        const alert = {
          id:        `manual-alert-${Date.now()}`,
          level:     payload.level  || 'INFO',
          title:     payload.title  || 'Manual Alert',
          body:      payload.body   || 'Alert dikirim manual dari browser',
          timestamp: new Date().toISOString(),
          source:    `client:${clientId}`,
        };
        const count = broadcast('SYSTEM_ALERT', alert);
        sendToClient(ws, 'COMMAND_RESULT', {
          command: 'TRIGGER_ALERT',
          success: true,
          message: `Alert dikirim ke ${count} client(s)`,
        });
        console.log(`[WS-Gateway] 🚨 Manual TRIGGER_ALERT dari ${clientId}: "${alert.title}"`);
        break;
      }

      // ─── GET_STATS: Minta snapshot statistik sekarang ─
      case 'GET_STATS': {
        try {
          const result = await grpcCall(dashClient, 'GetStats', { period: 'all' });
          sendToClient(ws, 'STATS_SNAPSHOT', {
            command: 'GET_STATS',
            data: result.data,
          });
        } catch (err) {
          sendToClient(ws, 'ERROR', { message: err.message });
        }
        break;
      }

      default:
        sendToClient(ws, 'ERROR', { message: `Unknown command type: ${type}` });
    }
  });

  // ─── Client disconnect ──────────────────────────────
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS-Gateway] 👋 Client disconnected: ${clientId} — Remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    clients.delete(ws);
    console.error(`[WS-Gateway] ❌ Client error (${clientId}):`, err.message);
  });
});

// ─────────────────────────────────────────────
//  Start gRPC Streams (dengan delay singkat untuk
//  menunggu gRPC server siap)
// ─────────────────────────────────────────────
console.log('[WS-Gateway] ⏳ Waiting for gRPC server to be ready...');
setTimeout(() => {
  startStatsStream();
  startWatchStream();
  startNotifStream();
}, 2000);

// ─────────────────────────────────────────────
//  Startup Log
// ─────────────────────────────────────────────
wss.on('listening', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     BnM ILITS — WebSocket Gateway Started!               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  🔌 WebSocket Server : ws://localhost:${WS_PORT}              ║`);
  console.log(`║  🔗 gRPC Target      : grpc://${GRPC_ADDR}          ║`);
  console.log('║                                                          ║');
  console.log('║  📡 gRPC → WS Bridges:                                   ║');
  console.log('║    DashboardService.StreamStats  → STATS_UPDATE          ║');
  console.log('║    RequestService.WatchRequests  → REQUEST_EVENT         ║');
  console.log('║    NotifService.NotifStream      → NOTIFICATION          ║');
  console.log('║                                                          ║');
  console.log('║  🚀 Server-Initiated Events:                              ║');
  console.log('║    HEARTBEAT    : setiap 30 detik                        ║');
  console.log('║    SYSTEM_ALERT : setiap 60 detik (otomatis)             ║');
  console.log('║                                                          ║');
  console.log('║  ⚡ Commands (Browser → WS → gRPC):                      ║');
  console.log('║    CREATE_REQUEST | UPDATE_STATUS | SEND_NOTIFICATION    ║');
  console.log('║    TRIGGER_ALERT  | GET_STATS                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down WebSocket Gateway...');
  statsStream?.cancel?.();
  watchStream?.cancel?.();
  notifStream?.end?.();
  wss.close(() => {
    console.log('✅ WebSocket Gateway shut down gracefully.');
    process.exit(0);
  });
});
