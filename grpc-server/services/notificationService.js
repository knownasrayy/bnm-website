/**
 * NOTIFICATION SERVICE IMPLEMENTATION
 * Handles: Unary (Send, GetAll) + Bi-directional Streaming (NotificationStream)
 */

import grpc from '@grpc/grpc-js';
import { randomUUID } from 'crypto';
import * as store from '../store/inMemoryStore.js';

// ──────────────────────────────────────────────────────────────
//  UNARY: SendNotification
// ──────────────────────────────────────────────────────────────
export function sendNotification(call, callback) {
  try {
    const input = call.request;

    if (!input.from_division || !input.title || !input.body) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'from_division, title, dan body wajib diisi',
      });
    }

    const notif = store.createNotification(input);
    store.broadcastNotification(notif);

    console.log(`[NotifService] 📣 SendNotification: from=${notif.from} to=${notif.to} — "${notif.title}"`);

    callback(null, {
      success: true,
      message: 'Notifikasi berhasil dikirim',
      data: notif,
    });
  } catch (err) {
    console.error('[NotifService] ❌ SendNotification error:', err);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
//  UNARY: GetNotifications
// ──────────────────────────────────────────────────────────────
export function getNotifications(call, callback) {
  try {
    const { division, limit } = call.request;

    if (!division) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'division wajib diisi',
      });
    }

    const result = store.getNotifications(division, limit || 0);

    console.log(`[NotifService] 📥 GetNotifications: division="${division}", count=${result.length}`);

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
//  BI-DIRECTIONAL STREAMING: NotificationStream
//  - Client connect → daftarkan ke subscriber list
//  - Client kirim pesan → broadcast ke subscriber lain
//  - Server kirim semua notif yang masuk ke subscriber ini
// ──────────────────────────────────────────────────────────────
export function notificationStream(call) {
  const sessionId = randomUUID();
  let clientDivision = 'Unknown';

  store.incrementClients();
  console.log(`[NotifService] 🔌 NotificationStream: new bidi connection (session=${sessionId})`);

  // Kirim greeting awal
  const greeting = store.createNotification({
    from_division: 'System',
    to_division:   'ALL',
    type:          'SYSTEM',
    title:         'Terhubung ke Notification Stream',
    body:          `Session ${sessionId.slice(0, 8)} berhasil terhubung`,
    request_id:    '',
  });
  try { call.write(greeting); } catch (_) {}

  // Daftarkan subscriber — akan diupdate saat client kirim pesan pertama
  const unsubscribe = store.addNotifSubscriber(sessionId, call, clientDivision);

  // Terima pesan dari client (Bi-directional: client bisa kirim kapan saja)
  call.on('data', (message) => {
    // Update division dari pesan pertama
    if (message.from !== clientDivision && message.from) {
      clientDivision = message.from;
      // Re-register dengan division yang benar
      unsubscribe();
      store.addNotifSubscriber(sessionId, call, clientDivision);
      console.log(`[NotifService] 🔄 Client identified as: ${clientDivision} (session=${sessionId.slice(0, 8)})`);
    }

    // Simpan dan broadcast notifikasi dari client
    const notif = {
      ...message,
      id:        message.id || randomUUID(),
      timestamp: new Date().toISOString(),
    };
    store.notifications.set(notif.id, notif);
    store.broadcastNotification(notif);

    console.log(`[NotifService] 💬 Message from ${notif.from} → ${notif.to}: "${notif.title}"`);
  });

  call.on('end', () => {
    store.decrementClients();
    unsubscribe();
    console.log(`[NotifService] 👋 NotificationStream disconnected (session=${sessionId.slice(0, 8)})`);
    call.end();
  });

  call.on('error', () => {
    store.decrementClients();
    unsubscribe();
  });

  call.on('cancelled', () => {
    store.decrementClients();
    unsubscribe();
  });
}
