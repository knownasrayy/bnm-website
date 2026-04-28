/**
 * gRPC SERVER — BnM ILITS Smart Request Management System
 * 
 * Mendaftarkan 3 Services:
 *  1. RequestService  — Request CRUD + Server Streaming (WatchRequests)
 *  2. NotificationService — Notif + Bi-directional Streaming (NotificationStream)
 *  3. DashboardService — Stats + Server Streaming (StreamStats)
 * 
 * Run: node grpc-server/server.js
 */

import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Services
import * as requestService     from './services/requestService.js';
import * as notificationService from './services/notificationService.js';
import * as dashboardService    from './services/dashboardService.js';

// Seed data
import { seedDemoData } from './store/inMemoryStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROTO_DIR  = join(__dirname, '..', 'proto');

// ─────────────────────────────────────────────
//  Load .proto files
// ─────────────────────────────────────────────
const PROTO_OPTIONS = {
  keepCase:          true,
  longs:             String,
  enums:             String,
  defaults:          true,
  oneofs:            true,
};

const requestPkg     = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'request.proto'),      PROTO_OPTIONS));
const notificationPkg = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'notification.proto'), PROTO_OPTIONS));
const dashboardPkg   = grpc.loadPackageDefinition(protoLoader.loadSync(join(PROTO_DIR, 'dashboard.proto'),    PROTO_OPTIONS));

const bnm = requestPkg.bnm_ilits;

// ─────────────────────────────────────────────
//  Create gRPC Server
// ─────────────────────────────────────────────
const server = new grpc.Server();

// 1. RequestService
server.addService(requestPkg.bnm_ilits.RequestService.service, {
  CreateRequest:       requestService.createRequest,
  GetRequest:          requestService.getRequest,
  ListRequests:        requestService.listRequests,
  UpdateRequestStatus: requestService.updateRequestStatus,
  WatchRequests:       requestService.watchRequests,
});

// 2. NotificationService
server.addService(notificationPkg.bnm_ilits.NotificationService.service, {
  SendNotification:   notificationService.sendNotification,
  GetNotifications:   notificationService.getNotifications,
  NotificationStream: notificationService.notificationStream,
});

// 3. DashboardService
server.addService(dashboardPkg.bnm_ilits.DashboardService.service, {
  GetStats:               dashboardService.getStats,
  GetRequestsByDivision:  dashboardService.getRequestsByDivision,
  StreamStats:            dashboardService.streamStats,
});

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────
const GRPC_PORT = process.env.GRPC_PORT || '50051';
const GRPC_HOST = `0.0.0.0:${GRPC_PORT}`;

server.bindAsync(GRPC_HOST, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('❌ Failed to start gRPC server:', err);
    process.exit(1);
  }

  // Seed demo data
  seedDemoData();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       BnM ILITS — gRPC Server Started Successfully!      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  📡 gRPC Server     : grpc://localhost:${port}             ║`);
  console.log('║                                                          ║');
  console.log('║  📦 Services Registered:                                 ║');
  console.log('║    1. RequestService      (Unary + Server Streaming)     ║');
  console.log('║    2. NotificationService (Unary + Bi-dir Streaming)     ║');
  console.log('║    3. DashboardService    (Unary + Server Streaming)     ║');
  console.log('║                                                          ║');
  console.log('║  🗄️  State: In-Memory Store (seeded with demo data)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gRPC server...');
  server.tryShutdown((err) => {
    if (err) console.error('Error during shutdown:', err);
    else console.log('✅ gRPC server shut down gracefully.');
    process.exit(0);
  });
});
