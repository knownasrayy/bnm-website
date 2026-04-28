import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Activity, Wifi, WifiOff, Radio, Send,
  Users, BarChart3, Bell, Zap, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

const GATEWAY = "";

interface StatsSnapshot {
  total_requests: number;
  total_pending: number;
  total_in_progress: number;
  total_completed: number;
  total_revision: number;
  total_rejected: number;
  active_clients: number;
  timestamp: string;
  by_division: Array<{
    division: string;
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  }>;
}

interface Notification {
  id: string;
  from: string;
  to: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
}

const LiveMonitor = () => {
  const navigate   = useNavigate();
  const [stats, setStats]               = useState<StatsSnapshot | null>(null);
  const [statsHistory, setStatsHistory]         = useState<number[]>([]);
  const [statsConnected, setStatsConnected]     = useState(false);
  const [notifConnected, setNotifConnected]     = useState(false);
  const [notifications, setNotifications]       = useState<Notification[]>([]);
  const [division, setDivision]                 = useState("Monitor");
  const [msgInput, setMsgInput]                 = useState("");
  const [snapshotCount, setSnapshotCount]       = useState(0);
  const notifStreamRef   = useRef<EventSource | null>(null);

  // ─── Dashboard Stream (Server Streaming → SSE) ─────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnect: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(`${GATEWAY}/api/dashboard/stream?interval=3`);
      es.onopen  = () => setStatsConnected(true);
      es.onmessage = (e) => {
        try {
          const snap: StatsSnapshot = JSON.parse(e.data);
          setStats(snap);
          setSnapshotCount(c => c + 1);
          setStatsHistory(h => [...h.slice(-19), snap.total_requests]);
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setStatsConnected(false);
        es?.close();
        reconnect = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => { es?.close(); clearTimeout(reconnect); };
  }, []);

  // ─── Notification Stream (Bi-directional → SSE) ────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnect: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(`${GATEWAY}/api/notifications/stream?division=${encodeURIComponent(division)}`);
      notifStreamRef.current = es;

      es.onopen = () => setNotifConnected(true);
      es.onmessage = (e) => {
        try {
          const notif: Notification = JSON.parse(e.data);
          setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setNotifConnected(false);
        es?.close();
        reconnect = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => { es?.close(); clearTimeout(reconnect); };
  }, [division]);

  // ─── Send Notification (Unary gRPC via gateway) ────────────
  const sendMsg = async () => {
    if (!msgInput.trim()) return;
    try {
      await fetch(`${GATEWAY}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_division: division || "Monitor",
          to_division:   "ALL",
          type:          "CHAT",
          title:         `Pesan dari ${division || "Monitor"}`,
          body:          msgInput.trim(),
          request_id:    "",
        }),
      });
      setMsgInput("");
    } catch {
      toast.error("Gagal kirim pesan");
    }
  };

  const getTypeColor = (type: string) => ({
    "REQUEST_UPDATE": "bg-blue-500/20 text-blue-400",
    "REMINDER":       "bg-orange-500/20 text-orange-400",
    "CHAT":           "bg-purple-500/20 text-purple-400",
    "SYSTEM":         "bg-gray-500/20 text-gray-400",
  }[type] || "bg-gray-500/20 text-gray-400");

  // Mini bar chart
  const maxVal = Math.max(...statsHistory, 1);
  const BarChart = () => (
    <div className="flex items-end gap-1 h-16 mt-2">
      {statsHistory.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm opacity-70"
          style={{ height: `${(v / maxVal) * 100}%`, minHeight: "4px" }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: "1s" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-semibold">Live Monitor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
              statsConnected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {statsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              Dashboard Stream ({snapshotCount} snapshots)
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
              notifConnected ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {notifConnected ? <MessageSquare className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              Notification Stream
            </div>
            <Button
              size="sm" variant="outline"
              className="glass gap-2 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
              onClick={() => navigate("/ws-monitor")}
            >
              <Zap className="w-3 h-3" /> WebSocket Panel
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Live <span className="gradient-text">Monitor</span></h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-muted-foreground">gRPC Streaming Active</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Server Streaming (DashboardService) + Bi-directional Streaming (NotificationService)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Panel — Left 2/3 */}
          <div className="lg:col-span-2 space-y-4">

            {/* Live Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total",       value: stats?.total_requests    ?? "-", color: "from-purple-500 to-pink-500",  icon: BarChart3 },
                { label: "Pending",     value: stats?.total_pending     ?? "-", color: "from-orange-500 to-red-500",   icon: Bell },
                { label: "In Progress", value: stats?.total_in_progress ?? "-", color: "from-cyan-500 to-blue-500",   icon: Zap },
                { label: "Completed",   value: stats?.total_completed   ?? "-", color: "from-green-500 to-emerald-500", icon: Users },
              ].map(({ label, value, color, icon: Icon }) => (
                <Card key={label} className="glass border-border/50 p-4 text-center">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} mx-auto mb-2 flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold gradient-text">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </Card>
              ))}
            </div>

            {/* Active Clients */}
            <Card className="glass border-border/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Active gRPC Clients</span>
                </div>
                <span className="text-2xl font-bold text-green-400">{stats?.active_clients ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah client yang sedang terkoneksi ke gRPC server (WatchRequests + StreamStats streams)
              </p>
            </Card>

            {/* Total Requests Trend Chart */}
            <Card className="glass border-border/50 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Total Requests — Live Trend</span>
                <Badge className="text-xs ml-auto glass">Update setiap 3 detik</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">gRPC DashboardService.StreamStats</p>
              {statsHistory.length > 0 ? <BarChart /> : (
                <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
                  Menunggu data stream...
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-right">
                Last update: {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString("id-ID") : "-"}
              </p>
            </Card>

            {/* Per Division Stats */}
            <Card className="glass border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Request per Division</span>
              </div>
              <div className="space-y-3">
                {(stats?.by_division || []).map(div => (
                  <div key={div.division}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{div.division}</span>
                      <span className="text-muted-foreground">{div.total} requests</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-border/30">
                      {div.completed > 0  && <div className="bg-green-500"  style={{ width: `${(div.completed  / Math.max(div.total, 1)) * 100}%` }} />}
                      {div.in_progress > 0 && <div className="bg-cyan-500"   style={{ width: `${(div.in_progress / Math.max(div.total, 1)) * 100}%` }} />}
                      {div.pending > 0    && <div className="bg-orange-500" style={{ width: `${(div.pending    / Math.max(div.total, 1)) * 100}%` }} />}
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {div.completed} done</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> {div.in_progress} in progress</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> {div.pending} pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Notification Panel — Right 1/3 */}
          <div className="flex flex-col gap-4">
            {/* Division selector */}
            <Card className="glass border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Identitas Kamu</p>
              <Input
                value={division}
                onChange={e => setDivision(e.target.value)}
                placeholder="e.g., Divisi Acara"
                className="glass border-border/50 text-sm mb-1"
              />
              <p className="text-[10px] text-muted-foreground">
                gRPC Bi-directional Streaming — NotificationService
              </p>
            </Card>

            {/* Send Message */}
            <Card className="glass border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Kirim Pesan (Broadcast)
              </p>
              <div className="flex gap-2">
                <Input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  placeholder="Tulis pesan..."
                  className="glass border-border/50 text-sm"
                  onKeyDown={e => e.key === "Enter" && sendMsg()}
                />
                <Button size="sm" onClick={sendMsg} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 px-3">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </Card>

            {/* Notification Feed */}
            <Card className="glass border-border/50 p-4 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Live Notifications</span>
                <Badge className="ml-auto text-xs glass">{notifications.length}</Badge>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Menunggu notifikasi...
                  </p>
                ) : notifications.map((n, i) => (
                  <div key={n.id || i} className="p-2.5 rounded-lg bg-border/20 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${getTypeColor(n.type)}`}>{n.type}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {n.timestamp ? new Date(n.timestamp).toLocaleTimeString("id-ID") : ""}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-tight">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">from: {n.from} → {n.to}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
