/**
 * DEMO CLIENT A — "Divisi Acara"
 * 
 * Mendemonstrasikan:
 * 1. CreateRequest (Unary)
 * 2. ListRequests (Unary)
 * 3. GetRequest (Unary)
 * 4. WatchRequests (Server Streaming) — live update selama 30 detik
 * 5. NotificationStream (Bi-directional Streaming) — kirim & terima notif
 *
 * Run: node grpc-clients/client-demo-a.js
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

// Load protos
const requestPkg = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'request.proto'), PROTO_OPTIONS));
const notifPkg   = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'notification.proto'), PROTO_OPTIONS));

const requestClient = new requestPkg.bnm_ilits.RequestService(GRPC_ADDR, CREDS);
const notifClient   = new notifPkg.bnm_ilits.NotificationService(GRPC_ADDR, CREDS);

// ─── Promisify helper ───
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

// ─────────────────────────────────────────────────────────────
//  MAIN DEMO
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   DEMO CLIENT A  —  Divisi Acara / ILITS BnM            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ─── 1. CREATE REQUEST (Unary) ───────────────────────────
  divider('1. CreateRequest (Unary gRPC)');
  
  let createdId;
  try {
    const resp = await call(requestClient, 'CreateRequest', {
      requester_name:  'Divisi Acara — Client A',
      division:        'Acara',
      contact:         '082233445566',
      target_division: 'Creative Design',
      request_type:    'Poster',
      title:           '[Client A] Poster Rundown Opening ILITS 2026',
      description:     'Poster printable A1 berisi rundown acara opening ceremony, tema futuristik.',
      references:      'https://pinterest.com/futuristic-design',
      deadline:        '2026-04-20',
    });

    if (resp.success) {
      createdId = resp.data.id;
      log('CreateRequest', `✅ Berhasil! ID: ${resp.data.id}`);
      log('CreateRequest', `   Title   : ${resp.data.title}`);
      log('CreateRequest', `   Status  : ${resp.data.status}`);
      log('CreateRequest', `   Target  : ${resp.data.target_division}`);
    } else {
      log('CreateRequest', `❌ Gagal: ${resp.message}`);
    }
  } catch (err) {
    log('CreateRequest', `❌ Error: ${err.message}`);
  }

  await sleep(500);

  // ─── 2. LIST REQUESTS (Unary) ────────────────────────────
  divider('2. ListRequests (Unary gRPC)');

  try {
    const resp = await call(requestClient, 'ListRequests', { division: 'Creative Design', status: '' });
    log('ListRequests', `✅ Total request untuk Creative Design: ${resp.total}`);
    resp.data.slice(0, 3).forEach((r, i) => {
      log('ListRequests', `   ${i + 1}. [${r.id}] "${r.title}" — Status: ${r.status}`);
    });
  } catch (err) {
    log('ListRequests', `❌ Error: ${err.message}`);
  }

  await sleep(500);

  // ─── 3. GET SPECIFIC REQUEST (Unary) ─────────────────────
  if (createdId) {
    divider('3. GetRequest (Unary gRPC)');

    try {
      const resp = await call(requestClient, 'GetRequest', { id: createdId });
      log('GetRequest', `✅ Found: ${resp.data.id}`);
      log('GetRequest', `   Title  : ${resp.data.title}`);
      log('GetRequest', `   Status : ${resp.data.status}`);
      log('GetRequest', `   Created: ${resp.data.created_at}`);
    } catch (err) {
      log('GetRequest', `❌ Error: ${err.message}`);
    }

    await sleep(500);
  }

  // ─── 4. ERROR HANDLING DEMO ──────────────────────────────
  divider('4. Error Handling — GetRequest dengan ID tidak ada');
  try {
    await call(requestClient, 'GetRequest', { id: 'REQ-INVALID-999' });
  } catch (err) {
    log('ErrorHandling', `✅ Error tertangkap dengan benar!`);
    log('ErrorHandling', `   gRPC Code : ${err.code} (${grpc.status[err.code]})`);
    log('ErrorHandling', `   Message   : ${err.message}`);
  }

  await sleep(500);

  // ─── 5. WATCH REQUESTS — Server Streaming ─────────────────
  divider('5. WatchRequests (Server Streaming — 20 detik)');
  log('WatchRequests', '📡 Subscribing ke stream... (tunggu update real-time)');

  const watchStream = requestClient.WatchRequests({ division: '' });
  let eventCount = 0;

  watchStream.on('data', (event) => {
    eventCount++;
    if (event.event_type === 'INITIAL') {
      log('WatchRequests', `📥 Initial snapshot: [${event.data.id}] "${event.data.title}" [${event.data.status}]`);
    } else {
      log('WatchRequests', `🔔 Event [${event.event_type}]: [${event.data.id}] "${event.data.title}" → ${event.data.status}`);
    }
  });

  watchStream.on('error', (err) => {
    log('WatchRequests', `❌ Stream error: ${err.message}`);
  });

  // ─── 6. NOTIFICATION STREAM — Bi-directional ─────────────
  divider('6. NotificationStream (Bi-directional Streaming)');
  log('NotifStream', '🔌 Connecting to notification stream...');

  const bidiStream = notifClient.NotificationStream();

  bidiStream.on('data', (notif) => {
    log('NotifStream', `📨 Received [${notif.type}] from=${notif.from}: "${notif.title}"`);
    log('NotifStream', `           body: ${notif.body}`);
  });

  bidiStream.on('error', (err) => {
    if (!err.message.includes('Cancelled')) {
      log('NotifStream', `❌ Error: ${err.message}`);
    }
  });

  // Identify ourselves
  bidiStream.write({
    id: '', from: 'Divisi Acara', to: 'ALL', type: 'SYSTEM',
    title: 'Login', body: 'Divisi Acara telah online', request_id: '', timestamp: '',
  });

  await sleep(2000);

  // Kirim sebuah notifikasi ke BnM
  log('NotifStream', '📤 Mengirim reminder ke Admin BnM...');
  bidiStream.write({
    id: '', from: 'Divisi Acara', to: 'Admin BnM', type: 'REMINDER',
    title: 'Reminder: Poster Opening masih pending!',
    body: createdId
      ? `Mohon review request ${createdId} sesegera mungkin, deadline H-14.`
      : 'Mohon cek request poster kami sesegera mungkin.',
    request_id: createdId || '', timestamp: '',
  });

  // Tunggu stream beberapa detik
  await sleep(15000);

  // Cleanup
  log('WatchRequests', `✅ Total events diterima: ${eventCount} (disconnect)`);
  watchStream.cancel();
  bidiStream.end();

  await sleep(500);

  divider('Demo Client A Selesai!');
  log('Summary', `✅ Semua demo berhasil dijalankan.`);
  log('Summary', `   Total request events diterima : ${eventCount}`);
  console.log('\n');

  process.exit(0);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
