/**
 * DASHBOARD SERVICE IMPLEMENTATION
 * Handles: Unary (GetStats, GetRequestsByDivision) + Server Streaming (StreamStats)
 */

import grpc from '@grpc/grpc-js';
import * as store from '../store/inMemoryStore.js';

// ──────────────────────────────────────────────────────────────
//  Helper: Hitung statistik dari in-memory store
// ──────────────────────────────────────────────────────────────
function computeStats() {
  const all = Array.from(store.requests.values());
  const byDiv = {};

  const divisions = ['Creative Design', 'Media Production', 'Content Creator', 'Marketing Strategist'];
  divisions.forEach(div => {
    byDiv[div] = { division: div, total: 0, pending: 0, in_progress: 0, completed: 0, revision: 0, rejected: 0 };
  });

  let total = 0, pending = 0, in_progress = 0, completed = 0, revision = 0, rejected = 0;

  all.forEach(req => {
    total++;
    if (req.status === 'pending')    { pending++;    }
    if (req.status === 'in_progress'){ in_progress++;}
    if (req.status === 'completed')  { completed++;  }
    if (req.status === 'revision')   { revision++;   }
    if (req.status === 'rejected')   { rejected++;   }

    const div = req.target_division;
    if (byDiv[div]) {
      byDiv[div].total++;
      if (byDiv[div][req.status] !== undefined) byDiv[div][req.status]++;
    }
  });

  return {
    total_requests:    total,
    total_pending:     pending,
    total_in_progress: in_progress,
    total_completed:   completed,
    total_revision:    revision,
    total_rejected:    rejected,
    active_clients:    store.getActiveClients(),
    timestamp:         new Date().toISOString(),
    by_division:       Object.values(byDiv),
  };
}

// ──────────────────────────────────────────────────────────────
//  UNARY: GetStats
// ──────────────────────────────────────────────────────────────
export function getStats(call, callback) {
  try {
    const stats = computeStats();
    console.log(`[DashboardService] 📊 GetStats: total=${stats.total_requests}, active_clients=${stats.active_clients}`);
    callback(null, { success: true, message: 'OK', data: stats });
  } catch (err) {
    console.error('[DashboardService] ❌ GetStats error:', err);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  UNARY: GetRequestsByDivision
// ──────────────────────────────────────────────────────────────
export function getRequestsByDivision(call, callback) {
  try {
    const { division } = call.request;

    if (!division) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'division wajib diisi',
      });
    }

    const reqs = store.listRequests(division);
    const stats = {
      division,
      total:       reqs.length,
      pending:     reqs.filter(r => r.status === 'pending').length,
      in_progress: reqs.filter(r => r.status === 'in_progress').length,
      completed:   reqs.filter(r => r.status === 'completed').length,
      revision:    reqs.filter(r => r.status === 'revision').length,
      rejected:    reqs.filter(r => r.status === 'rejected').length,
    };

    console.log(`[DashboardService] 📋 GetRequestsByDivision: "${division}" — ${stats.total} requests`);

    callback(null, { success: true, data: stats });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  SERVER STREAMING: StreamStats
//  Mengirim snapshot statistik setiap N detik ke client
// ──────────────────────────────────────────────────────────────
export function streamStats(call) {
  const config = call.request;
  const intervalSec = Math.max(1, config.interval_seconds || 3);
  const division = config.division || '';

  store.incrementClients();
  console.log(`[DashboardService] 📡 StreamStats: new subscriber (interval=${intervalSec}s, division="${division || 'ALL'}")`);

  // Kirim snapshot pertama langsung
  try {
    call.write(computeStats());
  } catch (_) {}

  // Kirim update periodik
  const timer = setInterval(() => {
    try {
      call.write(computeStats());
    } catch (err) {
      clearInterval(timer);
    }
  }, intervalSec * 1000);

  call.on('cancelled', () => {
    clearInterval(timer);
    store.decrementClients();
    console.log(`[DashboardService] 👋 StreamStats: subscriber disconnected`);
  });

  call.on('error', () => {
    clearInterval(timer);
    store.decrementClients();
  });
}
