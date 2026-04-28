/**
 * REQUEST SERVICE IMPLEMENTATION
 * Handles: Unary (Create, Get, List, UpdateStatus) + Server Streaming (Watch)
 */

import grpc from '@grpc/grpc-js';
import * as store from '../store/inMemoryStore.js';

// ──────────────────────────────────────────────────────────────
//  UNARY: CreateRequest
// ──────────────────────────────────────────────────────────────
export function createRequest(call, callback) {
  try {
    const input = call.request;

    // Validation
    if (!input.title || !input.target_division || !input.requester_name) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Field title, target_division, dan requester_name wajib diisi',
      });
    }

    const validDivisions = ['Creative Design', 'Media Production', 'Content Creator', 'Marketing Strategist'];
    if (!validDivisions.includes(input.target_division)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: `Divisi tidak valid. Pilih dari: ${validDivisions.join(', ')}`,
      });
    }

    const req = store.createRequest(input);

    console.log(`[RequestService] ✅ CreateRequest: ${req.id} — "${req.title}" → ${req.target_division}`);

    callback(null, {
      success: true,
      message: `Request berhasil dibuat dengan ID ${req.id}`,
      data: req,
    });
  } catch (err) {
    console.error('[RequestService] ❌ CreateRequest error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Internal server error: ' + err.message,
    });
  }
}

// ──────────────────────────────────────────────────────────────
//  UNARY: GetRequest
// ──────────────────────────────────────────────────────────────
export function getRequest(call, callback) {
  try {
    const { id } = call.request;
    if (!id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Request ID wajib diisi',
      });
    }

    const req = store.getRequest(id);
    if (!req) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Request dengan ID "${id}" tidak ditemukan`,
      });
    }

    console.log(`[RequestService] 🔍 GetRequest: ${id}`);
    callback(null, { success: true, message: 'OK', data: req });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  UNARY: ListRequests
// ──────────────────────────────────────────────────────────────
export function listRequests(call, callback) {
  try {
    const { division, status } = call.request;
    const result = store.listRequests(division || '', status || '');

    console.log(`[RequestService] 📋 ListRequests: ${result.length} items (filter: division="${division}", status="${status}")`);

    callback(null, {
      success: true,
      total: result.length,
      data: result,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  UNARY: UpdateRequestStatus
// ──────────────────────────────────────────────────────────────
export function updateRequestStatus(call, callback) {
  try {
    const { id, status, note } = call.request;

    if (!id || !status) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'ID dan status wajib diisi',
      });
    }

    const validStatuses = ['pending', 'in_progress', 'revision', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: `Status tidak valid. Pilih dari: ${validStatuses.join(', ')}`,
      });
    }

    const updated = store.updateRequestStatus(id, status, note || '');
    if (!updated) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Request "${id}" tidak ditemukan`,
      });
    }

    console.log(`[RequestService] 🔄 UpdateStatus: ${id} → ${status}`);

    callback(null, {
      success: true,
      message: `Status berhasil diupdate ke "${status}"`,
      data: updated,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  SERVER STREAMING: WatchRequests
//  Stream real-time events ke client saat ada request baru/update
// ──────────────────────────────────────────────────────────────
export function watchRequests(call) {
  const { division } = call.request;
  store.incrementClients();

  console.log(`[RequestService] 👁️  WatchRequests: new subscriber (division="${division || 'ALL'}")`);

  // Kirim snapshot awal — semua request yang ada saat ini
  const existing = store.listRequests(division || '');
  existing.forEach(req => {
    try {
      call.write({
        event_type: 'INITIAL',
        data: req,
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}
  });

  // Daftarkan sebagai watcher untuk event selanjutnya
  const unsubscribe = store.addRequestWatcher(call, { division });

  call.on('cancelled', () => {
    store.decrementClients();
    unsubscribe();
    console.log(`[RequestService] 👋 WatchRequests: subscriber disconnected (division="${division || 'ALL'}")`);
  });

  call.on('error', () => {
    store.decrementClients();
    unsubscribe();
  });
}
