/**
 * REST GATEWAY — BnM ILITS gRPC Bridge
 * 
 * Menjembatani React Frontend ↔ gRPC Server
 * - Translates REST requests → gRPC calls
 * - Translates gRPC Server Streaming → SSE (Server-Sent Events) untuk browser
 * 
 * Run: node server/server.js
 * Port: 3001
 */

import express    from 'express';
import cors       from 'cors';
import grpc       from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv      from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROTO_DIR  = join(__dirname, '..', 'proto');

// ─────────────────────────────────────────────
//  Load .proto & Create gRPC Clients
// ─────────────────────────────────────────────
const PROTO_OPTIONS = {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
};

const requestPkg      = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'request.proto'),      PROTO_OPTIONS));
const notifPkg        = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'notification.proto'), PROTO_OPTIONS));
const dashboardPkg    = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'dashboard.proto'),    PROTO_OPTIONS));

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
//  Express App
// ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ════════════════════════════════
//  REQUEST SERVICE ROUTES
// ════════════════════════════════

// POST /api/requests → CreateRequest (Unary gRPC)
app.post('/api/requests', async (req, res) => {
  try {
    const result = await grpcCall(requestClient, 'CreateRequest', req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    const status = err.code === grpc.status.INVALID_ARGUMENT ? 400
                 : err.code === grpc.status.NOT_FOUND         ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// GET /api/requests → ListRequests (Unary gRPC)
app.get('/api/requests', async (req, res) => {
  try {
    const filter = { division: req.query.division || '', status: req.query.status || '' };
    const result = await grpcCall(requestClient, 'ListRequests', filter);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/requests/:id → GetRequest (Unary gRPC)
app.get('/api/requests/:id', async (req, res) => {
  try {
    const result = await grpcCall(requestClient, 'GetRequest', { id: req.params.id });
    res.json(result);
  } catch (err) {
    const status = err.code === grpc.status.NOT_FOUND ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// PATCH /api/requests/:id/status → UpdateRequestStatus (Unary gRPC)
app.patch('/api/requests/:id/status', async (req, res) => {
  try {
    const payload = { id: req.params.id, status: req.body.status, note: req.body.note || '' };
    const result  = await grpcCall(requestClient, 'UpdateRequestStatus', payload);
    res.json(result);
  } catch (err) {
    const status = err.code === grpc.status.NOT_FOUND ? 404
                 : err.code === grpc.status.INVALID_ARGUMENT ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// GET /api/requests/stream/watch → WatchRequests (Server Streaming → SSE)
app.get('/api/requests/stream/watch', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const filter = { division: req.query.division || '' };
  const stream = requestClient.WatchRequests(filter);

  stream.on('data', (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  stream.on('error', (err) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  });

  stream.on('end', () => res.end());

  req.on('close', () => stream.cancel());
});

// ════════════════════════════════
//  NOTIFICATION SERVICE ROUTES
// ════════════════════════════════

// POST /api/notifications → SendNotification (Unary gRPC)
app.post('/api/notifications', async (req, res) => {
  try {
    const result = await grpcCall(notifClient, 'SendNotification', req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications?division=X → GetNotifications (Unary gRPC)
app.get('/api/notifications', async (req, res) => {
  try {
    const filter = { division: req.query.division || 'ALL', limit: parseInt(req.query.limit || '0') };
    const result = await grpcCall(notifClient, 'GetNotifications', filter);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/stream → NotificationStream (Bi-dir Streaming → SSE)
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const division = req.query.division || 'ALL';
  const stream   = notifClient.NotificationStream();

  // Identify ourselves to the stream
  stream.write({
    id:         '',
    from:       division,
    to:         'ALL',
    type:       'SYSTEM',
    title:      'Client Connected',
    body:       `${division} has joined the notification stream`,
    request_id: '',
    timestamp:  new Date().toISOString(),
  });

  stream.on('data', (notif) => {
    res.write(`data: ${JSON.stringify(notif)}\n\n`);
  });

  stream.on('error', (err) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  });

  stream.on('end', () => res.end());

  req.on('close', () => {
    stream.end();
  });
});

// ════════════════════════════════
//  DASHBOARD SERVICE ROUTES
// ════════════════════════════════

// GET /api/dashboard/stats → GetStats (Unary gRPC)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const result = await grpcCall(dashClient, 'GetStats', { period: req.query.period || 'all' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/division/:name → GetRequestsByDivision (Unary gRPC)
app.get('/api/dashboard/division/:name', async (req, res) => {
  try {
    const result = await grpcCall(dashClient, 'GetRequestsByDivision', { division: req.params.name });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dashboard/stream → StreamStats (Server Streaming → SSE)
app.get('/api/dashboard/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const config = {
    interval_seconds: parseInt(req.query.interval || '3'),
    division:         req.query.division || '',
  };
  const stream = dashClient.StreamStats(config);

  stream.on('data', (snapshot) => {
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  });

  stream.on('error', (err) => {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  });

  stream.on('end', () => res.end());

  req.on('close', () => stream.cancel());
});

// ─────────────────────────────────────────────
//  Health check
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', grpc_target: GRPC_ADDR, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
//  Start Gateway
// ─────────────────────────────────────────────
const GATEWAY_PORT = process.env.GATEWAY_PORT || 3001;
app.listen(GATEWAY_PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       BnM ILITS — REST Gateway Started!                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Gateway REST    : http://localhost:${GATEWAY_PORT}            ║`);
  console.log(`║  🔗 gRPC Target     : grpc://${GRPC_ADDR}          ║`);
  console.log('║                                                          ║');
  console.log('║  📡 Endpoints:                                           ║');
  console.log('║    POST   /api/requests                (Unary)           ║');
  console.log('║    GET    /api/requests                (Unary)           ║');
  console.log('║    GET    /api/requests/:id            (Unary)           ║');
  console.log('║    PATCH  /api/requests/:id/status     (Unary)           ║');
  console.log('║    GET    /api/requests/stream/watch   (Server Stream)   ║');
  console.log('║    POST   /api/notifications           (Unary)           ║');
  console.log('║    GET    /api/notifications           (Unary)           ║');
  console.log('║    GET    /api/notifications/stream    (Bidi→SSE)        ║');
  console.log('║    GET    /api/dashboard/stats         (Unary)           ║');
  console.log('║    GET    /api/dashboard/stream        (Server Stream)   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});