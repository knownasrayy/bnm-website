/**
 * IN-MEMORY STORE
 * Central state management untuk gRPC server.
 * Digunakan sebagai primary state (fast) + sync ke MongoDB.
 */

import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────
//  REQUESTS STORE
// ─────────────────────────────────────────────
export const requests = new Map();   // id → RequestData
export const requestWatchers = [];   // array of { call, filter }

export function createRequest(data) {
  const id = `REQ-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const req = {
    id,
    requester_name:  data.requester_name  || '',
    division:        data.division         || '',
    contact:         data.contact          || '',
    target_division: data.target_division  || '',
    request_type:    data.request_type     || '',
    title:           data.title            || '',
    description:     data.description      || '',
    references:      data.references       || '',
    deadline:        data.deadline         || '',
    status:          'pending',
    note:            '',
    created_at:      now,
    updated_at:      now,
  };
  requests.set(id, req);

  // Notify all watchers
  broadcastRequestEvent('CREATED', req);
  return req;
}

export function getRequest(id) {
  return requests.get(id) || null;
}

export function listRequests(divisionFilter = '', statusFilter = '') {
  let result = Array.from(requests.values());
  if (divisionFilter) result = result.filter(r => r.target_division === divisionFilter);
  if (statusFilter)   result = result.filter(r => r.status === statusFilter);
  return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function updateRequestStatus(id, status, note = '') {
  const req = requests.get(id);
  if (!req) return null;
  req.status     = status;
  req.note       = note;
  req.updated_at = new Date().toISOString();
  requests.set(id, req);

  // Notify all watchers
  broadcastRequestEvent('UPDATED', req);

  // Also broadcast a notification
  const notif = createNotification({
    from_division: 'Admin BnM',
    to_division:   req.division || 'ALL',
    type:          'REQUEST_UPDATE',
    title:         `Status Update: ${req.title}`,
    body:          `Request kamu sekarang berstatus "${status}"${note ? ` — ${note}` : ''}`,
    request_id:    id,
  });
  broadcastNotification(notif);

  return req;
}

export function addRequestWatcher(call, filter) {
  requestWatchers.push({ call, filter });
  return () => {
    const idx = requestWatchers.findIndex(w => w.call === call);
    if (idx !== -1) requestWatchers.splice(idx, 1);
  };
}

function broadcastRequestEvent(eventType, req) {
  const event = {
    event_type: eventType,
    data: req,
    timestamp: new Date().toISOString(),
  };
  for (const watcher of requestWatchers) {
    try {
      const div = watcher.filter?.division || '';
      if (!div || req.target_division === div) {
        watcher.call.write(event);
      }
    } catch (_) {}
  }
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS STORE
// ─────────────────────────────────────────────
export const notifications = new Map();  // id → NotificationMessage
export const notifSubscribers = new Map(); // sessionId → { call, division }

export function createNotification(data) {
  const id = randomUUID();
  const notif = {
    id,
    from:       data.from_division || 'System',
    to:         data.to_division   || 'ALL',
    type:       data.type          || 'SYSTEM',
    title:      data.title         || '',
    body:       data.body          || '',
    request_id: data.request_id    || '',
    timestamp:  new Date().toISOString(),
  };
  notifications.set(id, notif);
  return notif;
}

export function getNotifications(division, limit = 0) {
  let result = Array.from(notifications.values())
    .filter(n => n.to === 'ALL' || n.to === division || n.from === division)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (limit > 0) result = result.slice(0, limit);
  return result;
}

export function addNotifSubscriber(sessionId, call, division) {
  notifSubscribers.set(sessionId, { call, division });
  return () => notifSubscribers.delete(sessionId);
}

export function broadcastNotification(notif) {
  for (const [, sub] of notifSubscribers) {
    try {
      const matchAll  = notif.to === 'ALL';
      const matchDiv  = notif.to === sub.division || notif.from === sub.division;
      if (matchAll || matchDiv) {
        sub.call.write(notif);
      }
    } catch (_) {}
  }
}

// ─────────────────────────────────────────────
//  CONNECTED CLIENTS COUNTER
// ─────────────────────────────────────────────
let _activeClients = 0;
export function incrementClients() { _activeClients++; }
export function decrementClients() { if (_activeClients > 0) _activeClients--; }
export function getActiveClients() { return _activeClients; }

// ─────────────────────────────────────────────
//  SEED DATA (untuk demo)
// ─────────────────────────────────────────────
export function seedDemoData() {
  if (requests.size > 0) return;

  const seeds = [
    {
      requester_name: 'Divisi Acara',
      division: 'Acara',
      contact: '081234567890',
      target_division: 'Creative Design',
      request_type: 'Feed Design',
      title: 'Social Media Feed Opening Ceremony',
      description: 'Feed Instagram untuk opening ceremony ILITS 2026',
      references: 'https://www.instagram.com/p/example',
      deadline: '2026-04-15',
    },
    {
      requester_name: 'Divisi Sponsorship',
      division: 'Sponsorship',
      contact: '082345678901',
      target_division: 'Media Production',
      request_type: 'Video Editing',
      title: 'Teaser Opening Video',
      description: 'Video teaser untuk opening ceremony, durasi 30 detik',
      references: '',
      deadline: '2026-04-20',
    },
    {
      requester_name: 'Tim Social Media',
      division: 'Publikasi',
      contact: '083456789012',
      target_division: 'Content Creator',
      request_type: 'Caption Writing',
      title: 'Caption Series Instagram ILITS',
      description: 'Caption untuk 10 post Instagram selama seminggu',
      references: '',
      deadline: '2026-04-10',
    },
    {
      requester_name: 'Divisi Relation',
      division: 'Relation',
      contact: '084567890123',
      target_division: 'Marketing Strategist',
      request_type: 'Campaign Planning',
      title: 'Strategi Promosi Tiket ILITS',
      description: 'Rancang strategi promosi tiket untuk meningkatkan penjualan',
      references: 'https://docs.google.com/example',
      deadline: '2026-04-12',
    },
  ];

  const statuses = ['pending', 'in_progress', 'completed', 'revision'];
  seeds.forEach((seed, i) => {
    const req = createRequest(seed);
    // Set different statuses for demo
    if (i > 0) {
      updateRequestStatus(req.id, statuses[i], i === 3 ? 'Mohon revisi caption menjadi lebih menarik' : '');
    }
  });

  // Seed a few notifications
  createNotification({
    from_division: 'Admin BnM',
    to_division: 'ALL',
    type: 'SYSTEM',
    title: 'Selamat Datang di BnM ILITS 2026!',
    body: 'Sistem Request BnM kini aktif. Silakan submit request kreatifmu.',
    request_id: '',
  });
}
