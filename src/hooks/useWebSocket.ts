/**
 * useWebSocket — Enhanced (JWT + Subscribe + Reconnect Aware)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── CONFIG ────────────────────────────────────────────────
const BASE_WS_URL = `ws://localhost:3002`;
const MAX_RECONNECT_DELAY = 30000;

// ─── Types ────────────────────────────────────────────────────
export interface WsMessage {
  type: string;
  payload: unknown;
  serverTime: string;
}

export interface StatsSnapshot {
  total_requests:    number;
  total_pending:     number;
  total_in_progress: number;
  total_completed:   number;
  total_revision:    number;
  total_rejected:    number;
  active_clients:    number;
  timestamp:         string;
  by_division: Array<{
    division:    string;
    total:       number;
    pending:     number;
    in_progress: number;
    completed:   number;
    revision:    number;
    rejected:    number;
  }>;
}

export interface RequestEvent {
  event_type: string;  // CREATED | UPDATED | INITIAL
  data: {
    id:             string;
    requester_name: string;
    division:       string;
    target_division:string;
    request_type:   string;
    title:          string;
    status:         string;
    created_at:     string;
    updated_at:     string;
    note:           string;
  };
  timestamp: string;
}

export interface WsNotification {
  id:         string;
  from:       string;
  to:         string;
  type:       string;
  title:      string;
  body:       string;
  request_id: string;
  timestamp:  string;
}

export interface SystemAlert {
  id:        string;
  level:     string;  // INFO | WARNING | SUCCESS | ERROR
  title:     string;
  body:      string;
  timestamp: string;
  source?:   string;
}

export interface ActivityLog {
  id:        string;
  type:      string;
  title:     string;
  detail:    string;
  timestamp: string;
  category:  string;  // stats | request | notification | alert | system
}

export interface CommandResult {
  command: string;
  success: boolean;
  message: string;
  data?:   unknown;
}

export interface HeartbeatPayload {
  message:          string;
  clients_connected:number;
  uptime_seconds:   number;
  grpc_streams: {
    stats:          boolean;
    watch_requests: boolean;
    notifications:  boolean;
  };
}

// ─── Hook ─────────────────────────────────────────────────
export function useWebSocket(token?: string) {
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const mountedRef     = useRef(true);

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId]   = useState<string>('');
  const [stats, setStats]         = useState<StatsSnapshot | null>(null);
  const [statsHistory, setStatsHistory] = useState<StatsSnapshot[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<WsNotification[]>([]);
  const [systemAlerts, setSystemAlerts]   = useState<SystemAlert[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<HeartbeatPayload | null>(null);
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  // 🔥 NEW: track subscription
  const subscriptionsRef = useRef<string[]>(['stats', 'requests', 'notifications']);

  // ─── Logging helper (UNCHANGED) ─────────────────────────
  const addLog = useCallback((category: string, type: string, title: string, detail: string) => {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title,
      detail,
      timestamp: new Date().toISOString(),
      category,
    };
    setActivityLog(prev => [log, ...prev.slice(0, 99)]);
  }, []);

  // ─── Helper: build WS URL with JWT ──────────────────────
  const buildUrl = () => {
    if (!token) return BASE_WS_URL;
    return `${BASE_WS_URL}?token=${token}`;
  };

  // ─── SUBSCRIBE helper ───────────────────────────────────
  const sendSubscribe = (ws: WebSocket) => {
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: {
        channels: subscriptionsRef.current,
      },
    }));
  };

  // ─── Connect ────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(buildUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        setConnected(true);
        reconnectDelay.current = 1000;

        addLog('system', 'CONNECTED', 'System Online',
          'Terhubung ke WebSocket Gateway');

        // 🔥 AUTO SUBSCRIBE
        sendSubscribe(ws);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        let msg: WsMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        setMessageCount(c => c + 1);

        const { type, payload } = msg;

        switch (type) {
          case 'WELCOME': {
            const p = payload as any;
            setClientId(p.clientId);
            addLog('system', 'WELCOME', 'Session Started',
              `ID: ${p.clientId}`);
            break;
          }

          case 'SUBSCRIBED': {
            addLog('system', 'SUBSCRIBED', 'Subscribed Channels',
              JSON.stringify(payload));
            break;
          }

          case 'STATS_UPDATE': {
            const snap = payload as StatsSnapshot;
            setStats(snap);
            setStatsHistory(h => [...h.slice(-29), snap]);
            break;
          }

          case 'REQUEST_EVENT': {
            const ev = payload as RequestEvent;
            addLog('request', ev.event_type, ev.data.title, ev.data.status);
            break;
          }

          case 'NOTIFICATION': {
            const notif = payload as WsNotification;
            setNotifications(prev => [notif, ...prev.slice(0, 49)]);
            break;
          }

          case 'SYSTEM_ALERT': {
            const alert = payload as SystemAlert;
            setSystemAlerts(prev => [alert, ...prev.slice(0, 19)]);
            break;
          }

          case 'HEARTBEAT': {
            setLastHeartbeat(payload as HeartbeatPayload);
            break;
          }

          case 'COMMAND_RESULT': {
            const result = payload as CommandResult;
            setCommandResults(prev => [result, ...prev.slice(0, 19)]);
            break;
          }

          case 'ERROR': {
            addLog('system', 'ERROR', 'Server Error',
              (payload as any)?.message || '');
            break;
          }
        }
      };

      ws.onclose = () => {
        setConnected(false);

        if (!mountedRef.current) return;

        addLog('system', 'RECONNECTING', 'Reconnect Attempt',
          `Delay ${reconnectDelay.current} ms`);

        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 2,
            MAX_RECONNECT_DELAY
          );
          connect();
        }, reconnectDelay.current);
      };

    } catch {
      reconnectTimer.current = setTimeout(connect, reconnectDelay.current);
    }
  }, [addLog, token]);

  // ─── sendCommand (UNCHANGED) ────────────────────────────
  const sendCommand = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('system', 'ERROR', 'WS Not Connected', '');
      return false;
    }

    ws.send(JSON.stringify({ type, payload }));
    return true;
  }, [addLog]);

  // ─── 🔥 NEW: manual reconnect ───────────────────────────
  const reconnect = useCallback(() => {
    wsRef.current?.close();
    reconnectDelay.current = 1000;
    connect();
  }, [connect]);

  // ─── Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connected,
    clientId,
    stats,
    statsHistory,
    activityLog,
    notifications,
    systemAlerts,
    lastHeartbeat,
    commandResults,
    messageCount,
    sendCommand,
    reconnect, // 🔥 tambahan
  };
}