/**
 * DEMO CLIENT B — "Admin BnM"
 * 
 * Mendemonstrasikan:
 * 1. ListRequests — lihat semua pending (Unary)
 * 2. UpdateRequestStatus — approve/reject request (Unary)
 * 3. SendNotification — broadcast notifikasi (Unary)
 * 4. StreamStats — live dashboard stats (Server Streaming)
 * 5. NotificationStream — monitor notif dari semua divisi (Bi-directional)
 *
 * Run: node grpc-clients/client-demo-b.js
 */

import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROTO_DIR  = join(__dirname, '..', 'proto');

const PROTO_OPTIONS = { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true };
const GRPC_ADDR     = 'localhost:50051';
const CREDS         = grpc.credentials.createInsecure();

const requestPkg  = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'request.proto'),      PROTO_OPTIONS));
const notifPkg    = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'notification.proto'), PROTO_OPTIONS));
const dashPkg     = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'dashboard.proto'),    PROTO_OPTIONS));

const requestClient = new requestPkg.bnm_ilits.RequestService(GRPC_ADDR, CREDS);
const notifClient   = new notifPkg.bnm_ilits.NotificationService(GRPC_ADDR, CREDS);
const dashClient    = new dashPkg.bnm_ilits.DashboardService(GRPC_ADDR, CREDS);

function call(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err, resp) => err ? reject(err) : resolve(resp));
  });
}

function log(section, msg) {
  const time = new Date().toLocaleTimeString('id-ID');
  console.log(`[${time}] [${section}] ${msg}`);
}

function divider(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ▶  ${title}`);
  console.log('═'.repeat(60));
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   DEMO CLIENT B  —  Admin BnM / ILITS                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ─── 1. LIST ALL PENDING REQUESTS ────────────────────────
  divider('1. ListRequests — Pending (Unary gRPC)');

  let pendingRequests = [];
  try {
    const resp = await call(requestClient, 'ListRequests', { division: '', status: 'pending' });
    pendingRequests = resp.data || [];
    log('ListRequests', `✅ Total pending requests: ${resp.total}`);
    pendingRequests.forEach((r, i) => {
      log('ListRequests', `   ${i + 1}. [${r.id}] "${r.title}"`);
      log('ListRequests', `      → Dari: ${r.division} | Target: ${r.target_division} | Deadline: ${r.deadline}`);
    });
  } catch (err) {
    log('ListRequests', `❌ Error: ${err.message}`);
  }

  await sleep(800);

  // ─── 2. UPDATE STATUS (Unary) ────────────────────────────
  divider('2. UpdateRequestStatus (Unary gRPC)');

  if (pendingRequests.length > 0) {
    const targetReq = pendingRequests[0];
    try {
      const resp = await call(requestClient, 'UpdateRequestStatus', {
        id:     targetReq.id,
        status: 'in_progress',
        note:   'Request diterima! Tim Creative Design akan mulai mengerjakan.',
      });
      log('UpdateStatus', `✅ Updated: ${resp.data.id}`);
      log('UpdateStatus', `   From  : pending → ${resp.data.status}`);
      log('UpdateStatus', `   Note  : ${resp.data.note}`);
    } catch (err) {
      log('UpdateStatus', `❌ Error: ${err.message}`);
    }

    // Update yang kedua (jika ada)
    if (pendingRequests.length > 1) {
      await sleep(500);
      const target2 = pendingRequests[1];
      try {
        const resp2 = await call(requestClient, 'UpdateRequestStatus', {
          id:     target2.id,
          status: 'revision',
          note:   'Mohon lengkapi referensi dan detail konsep terlebih dahulu.',
        });
        log('UpdateStatus', `✅ Updated: ${resp2.data.id} → ${resp2.data.status}`);
      } catch (err) {
        log('UpdateStatus', `❌ Error: ${err.message}`);
      }
    }
  } else {
    log('UpdateStatus', '⚠️  Tidak ada pending request untuk di-update');
  }

  await sleep(500);

  // ─── 3. SEND NOTIFICATION — Broadcast (Unary) ────────────
  divider('3. SendNotification — Broadcast ke ALL (Unary gRPC)');

  try {
    const resp = await call(notifClient, 'SendNotification', {
      from_division: 'Admin BnM',
      to_division:   'ALL',
      type:          'SYSTEM',
      title:         '📢 Pengumuman: Review Request Selesai!',
      body:          'Admin BnM telah mereview semua pending request. Cek status request kalian ya!',
      request_id:    '',
    });
    log('SendNotif', `✅ Notifikasi terkirim: "${resp.data.title}"`);
    log('SendNotif', `   ID        : ${resp.data.id}`);
    log('SendNotif', `   Timestamp : ${resp.data.timestamp}`);
  } catch (err) {
    log('SendNotif', `❌ Error: ${err.message}`);
  }

  await sleep(500);

  // ─── 4. BIDI NOTIFICATION STREAM ─────────────────────────
  divider('4. NotificationStream — Monitor (Bi-directional Streaming, 10 detik)');
  log('NotifStream', '🔌 Connecting as Admin BnM...');

  const bidiStream  = notifClient.NotificationStream();
  let notifReceived = 0;

  bidiStream.on('data', (notif) => {
    notifReceived++;
    log('NotifStream', `📨 [${notif.type}] from=${notif.from} to=${notif.to}`);
    log('NotifStream', `   "${notif.title}"`);
  });

  bidiStream.on('error', (err) => {
    if (!err.message.includes('Cancelled')) {
      log('NotifStream', `❌ Error: ${err.message}`);
    }
  });

  bidiStream.write({
    id: '', from: 'Admin BnM', to: 'ALL', type: 'SYSTEM',
    title: 'Admin BnM Online', body: 'Admin BnM sedang memantau semua request.', request_id: '', timestamp: '',
  });

  await sleep(3000);

  // Kirim pesan langsung ke divisi
  log('NotifStream', '📤 Mengirim pesan ke Divisi Acara...');
  bidiStream.write({
    id: '', from: 'Admin BnM', to: 'Divisi Acara', type: 'REQUEST_UPDATE',
    title: 'Update Request Kamu!',
    body: `Request pertama kamu sudah kami terima dan sedang dikerjakan. Stay tuned!`,
    request_id: pendingRequests[0]?.id || '', timestamp: '',
  });

  await sleep(5000);

  bidiStream.end();

  // ─── 5. DASHBOARD STREAM — Server Streaming ───────────────
  divider('5. StreamStats — Live Dashboard (Server Streaming, 12 detik)');
  log('StreamStats', '📡 Subscribing to live stats...');

  const statsStream = dashClient.StreamStats({ interval_seconds: 3, division: '' });
  let snapshotCount = 0;

  statsStream.on('data', (snapshot) => {
    snapshotCount++;
    log('StreamStats', `📊 Snapshot #${snapshotCount} — ${snapshot.timestamp?.slice(11, 19)}`);
    log('StreamStats', `   Total: ${snapshot.total_requests} | Pending: ${snapshot.total_pending} | In Progress: ${snapshot.total_in_progress}`);
    log('StreamStats', `   Completed: ${snapshot.total_completed} | Revision: ${snapshot.total_revision} | Active Clients: ${snapshot.active_clients}`);
    snapshot.by_division?.forEach(d => {
      if (d.total > 0) {
        log('StreamStats', `   [${d.division}] total=${d.total} pending=${d.pending} ip=${d.in_progress} done=${d.completed}`);
      }
    });
  });

  statsStream.on('error', (err) => {
    log('StreamStats', `❌ Stream error: ${err.message}`);
  });

  await sleep(12000);

  statsStream.cancel();

  // ─── SUMMARY ──────────────────────────────────────────────
  divider('Demo Client B Selesai!');
  log('Summary', `✅ Semua demo selesai.`);
  log('Summary', `   Notifikasi diterima : ${notifReceived}`);
  log('Summary', `   Stats snapshots     : ${snapshotCount}`);
  console.log('\n');

  process.exit(0);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
