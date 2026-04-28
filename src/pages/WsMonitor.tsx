import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Activity, Wifi, WifiOff, Radio, Send, Zap,
  BarChart3, Bell, Users, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Terminal, MessageSquare, Navigation,
  Heart, Shield, TrendingUp, Globe, Cpu
} from "lucide-react";
import { toast } from "sonner";
import { useWebSocket, SystemAlert, ActivityLog, WsNotification } from "@/hooks/useWebSocket";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

// ─── Helper ───────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  pending:     "bg-orange-500/20 text-orange-400 border-orange-500/40",
  in_progress: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  completed:   "bg-green-500/20 text-green-400 border-green-500/40",
  revision:    "bg-purple-500/20 text-purple-400 border-purple-500/40",
  rejected:    "bg-red-500/20 text-red-400 border-red-500/40",
};

const alertLevelColor: Record<string, string> = {
  INFO:    "bg-blue-500/15 border-blue-500/30 text-blue-300",
  WARNING: "bg-orange-500/15 border-orange-500/30 text-orange-300",
  SUCCESS: "bg-green-500/15 border-green-500/30 text-green-300",
  ERROR:   "bg-red-500/15 border-red-500/30 text-red-300",
};

const alertLevelIcon: Record<string, React.ElementType> = {
  INFO:    Shield,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ERROR:   AlertTriangle,
};

const logCategoryColor: Record<string, string> = {
  stats:        "text-cyan-400",
  request:      "text-purple-400",
  notification: "text-blue-400",
  alert:        "text-orange-400",
  system:       "text-gray-400",
};

const divisionColors = [
  "from-purple-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
];

// ─── Component ────────────────────────────────────────────────
const WsMonitor = () => {
  const navigate = useNavigate();
  const {
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
  } = useWebSocket();

  // Command & Control form state
  const [cmdTab, setCmdTab]               = useState("update_status");
  const [reqId, setReqId]                 = useState("");
  const [newStatus, setNewStatus]         = useState("in_progress");
  const [statusNote, setStatusNote]       = useState("");
  const [notifFrom, setNotifFrom]         = useState("WS-Client");
  const [notifBody, setNotifBody]         = useState("");
  const [alertTitle, setAlertTitle]       = useState("");
  const [alertBody, setAlertBody]         = useState("");
  const [alertLevel, setAlertLevel]       = useState("INFO");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Command handlers ──────────────────────────────────────
  const handleUpdateStatus = async () => {
    if (!reqId.trim()) { toast.error("Request ID wajib diisi"); return; }
    setIsSubmitting(true);
    const ok = sendCommand("UPDATE_STATUS", { id: reqId.trim(), status: newStatus, note: statusNote });
    if (ok) toast.success("Command UPDATE_STATUS dikirim via WebSocket →  gRPC");
    else    toast.error("WebSocket tidak terhubung");
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleSendNotif = async () => {
    if (!notifBody.trim()) { toast.error("Pesan wajib diisi"); return; }
    setIsSubmitting(true);
    const ok = sendCommand("SEND_NOTIFICATION", {
      from_division: notifFrom || "WS-Client",
      to_division:   "ALL",
      type:          "CHAT",
      title:         `Pesan dari ${notifFrom || "WS-Client"}`,
      body:          notifBody.trim(),
    });
    if (ok) { toast.success("Notifikasi dikirim via WebSocket → gRPC"); setNotifBody(""); }
    else    toast.error("WebSocket tidak terhubung");
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleTriggerAlert = () => {
    if (!alertTitle.trim()) { toast.error("Judul alert wajib diisi"); return; }
    const ok = sendCommand("TRIGGER_ALERT", {
      level: alertLevel,
      title: alertTitle.trim(),
      body:  alertBody.trim() || "Alert dikirim dari browser via WebSocket",
    });
    if (ok) { toast.success("Alert dikirim ke semua client!"); setAlertTitle(""); setAlertBody(""); }
    else    toast.error("WebSocket tidak terhubung");
  };

  const handleGetStats = () => {
    const ok = sendCommand("GET_STATS");
    if (ok) toast.info("Meminta stats snapshot dari gRPC...");
    else    toast.error("WebSocket tidak terhubung");
  };

  // ─── Chart data ────────────────────────────────────────────
  const divisionChartData = (stats?.by_division || []).map((d, i) => ({
    name:       d.division.replace(" ", "\n"),
    Pending:    d.pending,
    "In Progress": d.in_progress,
    Completed:  d.completed,
    Revision:   d.revision,
    total:      d.total,
  }));

  const trendChartData = statsHistory.slice(-20).map((s, i) => ({
    t:          i + 1,
    Total:      s.total_requests,
    Pending:    s.total_pending,
    Completed:  s.total_completed,
  }));

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-8 animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-8 animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/monitor")} className="gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Live Monitor
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-lg">Live Operations <span className="gradient-text">Hub</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* WS Connection Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${
              connected
                ? "bg-green-500/10 border-green-500/40 text-green-400"
                : "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse"
            }`}>
              {connected
                ? <><Wifi className="w-3 h-3" /> System Online</>
                : <><WifiOff className="w-3 h-3" /> Reconnecting to Nodes...</>
              }
            </div>

            {/* Message counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border bg-purple-500/10 border-purple-500/30 text-purple-300">
              <Radio className="w-3 h-3 animate-pulse" />
              {messageCount} messages
            </div>

            {/* Client ID */}
            {clientId && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-border/50 text-muted-foreground font-mono">
                <Terminal className="w-3 h-3" /> {clientId}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">

        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              Real-time <span className="gradient-text">Operations</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Global traffic monitoring and emergency response center for BnM ILITS
            </p>
          </div>
          <Button
            size="sm" variant="outline"
            className="glass gap-2"
            onClick={handleGetStats}
            disabled={!connected}
          >
            <RefreshCw className="w-3 h-3" /> Refresh Stats
          </Button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            KOMPONEN DINAMIS #1 — Status Indicators
            (berubah real-time berdasarkan WebSocket)
        ════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* WebSocket Status */}
            <Card className={`glass border p-4 text-center transition-all duration-500 ${
              connected ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
            }`}>
              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                connected ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                {connected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
              </div>
              <div className={`text-sm font-bold ${connected ? "text-green-400" : "text-red-400"}`}>
                {connected ? "ONLINE" : "OFFLINE"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Network Node</div>
            </Card>

            {/* Total Requests */}
            <Card className="glass border-purple-500/20 bg-purple-500/5 p-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold gradient-text">{stats?.total_requests ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Total Requests</div>
            </Card>

            {/* Pending */}
            <Card className="glass border-orange-500/20 bg-orange-500/5 p-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-orange-400">{stats?.total_pending ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Pending</div>
            </Card>

            {/* In Progress */}
            <Card className="glass border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-cyan-400">{stats?.total_in_progress ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">In Progress</div>
            </Card>

            {/* Completed */}
            <Card className="glass border-green-500/20 bg-green-500/5 p-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-500">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-400">{stats?.total_completed ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Completed</div>
            </Card>

            {/* Active WS Clients */}
            <Card className="glass border-blue-500/20 bg-blue-500/5 p-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-blue-400">{lastHeartbeat?.clients_connected ?? stats?.active_clients ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Active Nodes</div>
            </Card>
          </div>
        </section>

        {/* Heartbeat info */}
        {lastHeartbeat && (
          <Card className="glass border-border/30 p-3">
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-red-400 animate-pulse" />
                <span>Last Heartbeat</span>
              </div>
              <span className="text-foreground/60">|</span>
              <span>Uptime: <strong className="text-foreground">{Math.floor(lastHeartbeat.uptime_seconds / 60)}m {lastHeartbeat.uptime_seconds % 60}s</strong></span>
              <span>|</span>
              <span className={`flex items-center gap-1 ${lastHeartbeat.grpc_streams.notifications ? "text-green-400" : "text-red-400"}`}>
                ● Notification Bus
              </span>
            </div>
          </Card>
        )}

        {/* ─── Main Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ─── LEFT COLUMN (2/3) ───────────────────────────── */}
          <div className="xl:col-span-2 space-y-6">

            {/* ═══════════════════════════════════════════════
                KOMPONEN DINAMIS #2 — Live Stats Chart
                (chart real-time dari gRPC StreamStats via WS)
            ═══════════════════════════════════════════════ */}
            <Card className="glass border-border/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Operational Trends</span>
                <Badge className="text-xs ml-auto bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Real-time Data Stream
                </Badge>
              </div>

              <Tabs defaultValue="division" className="w-full">
                <TabsList className="glass border-border/40 mb-4 h-8">
                  <TabsTrigger value="division" className="text-xs">Per Divisi</TabsTrigger>
                  <TabsTrigger value="trend" className="text-xs">Trend ({statsHistory.length} snapshots)</TabsTrigger>
                  <TabsTrigger value="donut"  className="text-xs">Status Breakdown</TabsTrigger>
                </TabsList>

                {/* Division Bar Chart */}
                <TabsContent value="division">
                  {divisionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={divisionChartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="Pending"     fill="rgba(249,115,22,0.7)"  radius={[3,3,0,0]} />
                        <Bar dataKey="In Progress" fill="rgba(6,182,212,0.7)"   radius={[3,3,0,0]} />
                        <Bar dataKey="Completed"   fill="rgba(34,197,94,0.7)"   radius={[3,3,0,0]} />
                        <Bar dataKey="Revision"    fill="rgba(168,85,247,0.7)"  radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                      <Radio className="w-4 h-4 mr-2 animate-pulse" /> Menunggu data dari gRPC StreamStats...
                    </div>
                  )}
                </TabsContent>

                {/* Trend Line Chart */}
                <TabsContent value="trend">
                  {trendChartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendChartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#888" }} label={{ value: "snapshot", position: "insideBottom", offset: -1, fontSize: 10, fill: "#666" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Line type="monotone" dataKey="Total"     stroke="#a855f7" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Pending"   stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                      <Radio className="w-4 h-4 mr-2 animate-pulse" /> Mengumpulkan data trend... ({statsHistory.length}/2 min)
                    </div>
                  )}
                </TabsContent>

                {/* Status Breakdown */}
                <TabsContent value="donut">
                  {stats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Total",       value: stats.total_requests,    color: "from-purple-500 to-pink-500" },
                        { label: "Pending",     value: stats.total_pending,     color: "from-orange-500 to-red-500" },
                        { label: "In Progress", value: stats.total_in_progress, color: "from-cyan-500 to-blue-500" },
                        { label: "Completed",   value: stats.total_completed,   color: "from-green-500 to-emerald-500" },
                        { label: "Revision",    value: stats.total_revision,    color: "from-purple-500 to-violet-500" },
                        { label: "Rejected",    value: stats.total_rejected,    color: "from-red-500 to-rose-500" },
                      ].map(item => (
                        <div key={item.label} className="text-center p-3 rounded-lg bg-border/20">
                          <div className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                            {item.value}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                          <div className="mt-2 h-1 rounded-full bg-border/30 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${item.color} transition-all duration-700`}
                              style={{ width: `${stats.total_requests > 0 ? (item.value / stats.total_requests) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                      <Radio className="w-4 h-4 mr-2 animate-pulse" /> Menunggu data...
                    </div>
                  )}
                  {stats && (
                    <p className="text-[10px] text-muted-foreground mt-3 text-right">
                      Last update: {new Date(stats.timestamp).toLocaleTimeString("id-ID")}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>

            {/* ═══════════════════════════════════════════════
                KOMPONEN DINAMIS #3 — Activity Log
                (feed real-time semua WebSocket events)
            ═══════════════════════════════════════════════ */}
            <Card className="glass border-border/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Operational Feed</span>
                <Badge className="text-xs ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {activityLog.length} events
                </Badge>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
                {Object.entries(logCategoryColor).map(([cat, color]) => (
                  <span key={cat} className={`flex items-center gap-1 ${color}`}>
                    <span className="w-2 h-2 rounded-full bg-current inline-block" /> {cat}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scroll">
                {activityLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    <Radio className="w-4 h-4 mx-auto mb-2 animate-pulse" />
                    Menunggu events dari WebSocket...
                  </p>
                ) : activityLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-border/15 hover:bg-border/25 transition-colors group">
                    <span className={`text-[10px] font-mono mt-0.5 shrink-0 ${logCategoryColor[log.category] || "text-gray-400"}`}>
                      [{log.category.toUpperCase().slice(0,5)}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{log.title}</p>
                      {log.detail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </Card>
          </div>

          {/* ─── RIGHT COLUMN (1/3) ──────────────────────────── */}
          <div className="space-y-5">

            {/* ═══════════════════════════════════════════════
                SERVER-INITIATED EVENTS (Fitur #3)
                Server mendorong data otomatis ke browser
            ═══════════════════════════════════════════════ */}
            <Card className="glass border-orange-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="font-semibold text-sm">System Broadcasts</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                Server mendorong SYSTEM_ALERT &amp; HEARTBEAT secara proaktif setiap 30-60 detik tanpa request dari browser.
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {systemAlerts.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell className="w-6 h-6 mx-auto mb-1.5 text-orange-400/50" />
                    <p className="text-[10px] text-muted-foreground">Waiting for global alerts...</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Synced with master node</p>
                  </div>
                ) : systemAlerts.map((alert) => {
                  const AlertIcon = alertLevelIcon[alert.level] || Shield;
                  return (
                    <div key={alert.id} className={`p-2.5 rounded-lg border text-xs ${alertLevelColor[alert.level] || alertLevelColor.INFO}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertIcon className="w-3 h-3 shrink-0" />
                        <span className="font-semibold truncate">{alert.title}</span>
                        <span className="text-[9px] ml-auto opacity-70 shrink-0">
                          {new Date(alert.timestamp).toLocaleTimeString("id-ID")}
                        </span>
                      </div>
                      <p className="opacity-80 leading-snug">{alert.body}</p>
                      {alert.source && (
                        <p className="text-[9px] opacity-50 mt-1">src: {alert.source}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Notification Feed */}
            <Card className="glass border-border/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Live Communications</span>
                <Badge className="text-xs ml-auto glass">{notifications.length}</Badge>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">
                    <Cpu className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    Inter-division Messaging
                  </p>
                ) : notifications.slice(0, 15).map((n: WsNotification, i) => (
                  <div key={n.id || i} className="p-2 rounded-lg bg-border/20 border border-border/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="text-[9px] px-1 py-0 bg-blue-500/20 text-blue-400">{n.type}</Badge>
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {n.timestamp ? new Date(n.timestamp).toLocaleTimeString("id-ID") : ""}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-tight">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[9px] text-muted-foreground/50 mt-1">{n.from} → {n.to}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            COMMAND & CONTROL BRIDGE (Fitur #4)
            Browser mengirim instruksi → WebSocket → gRPC
        ════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-4 h-4 text-yellow-400" />
            <h2 className="font-semibold">Operations Dispatcher</h2>
            <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              Authorized Personnel Only
            </Badge>
            {!connected && (
              <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30 ml-auto animate-pulse">
                WebSocket Offline
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ─── UPDATE STATUS ─────────────────────────────── */}
            <Card className="glass border-cyan-500/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Status Override</p>
                  <p className="text-[10px] text-muted-foreground">Modify request flow manually</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Request ID</label>
                  <Input
                    id="ws-req-id"
                    value={reqId}
                    onChange={e => setReqId(e.target.value)}
                    placeholder="REQ-XXXXX"
                    className="glass border-border/50 text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Status Baru</label>
                  <select
                    id="ws-new-status"
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full h-8 rounded-md border border-border/50 bg-background/60 text-sm px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="revision">Revision</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Catatan (opsional)</label>
                  <Input
                    id="ws-status-note"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    placeholder="Catatan dari admin..."
                    className="glass border-border/50 text-sm h-8"
                  />
                </div>
                <Button
                  id="ws-submit-status"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 h-8 text-sm"
                   onClick={handleUpdateStatus}
                  disabled={!connected || isSubmitting}
                >
                  <Cpu className="w-3 h-3 mr-2" />
                  {isSubmitting ? "Processing..." : "Commit Change"}
                </Button>
              </div>
            </Card>

            {/* ─── SEND NOTIFICATION ─────────────────────────── */}
            <Card className="glass border-purple-500/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">System Messaging</p>
                  <p className="text-[10px] text-muted-foreground">Broadcast to all divisions</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Identitas Pengirim</label>
                  <Input
                    id="ws-notif-from"
                    value={notifFrom}
                    onChange={e => setNotifFrom(e.target.value)}
                    placeholder="Nama Divisi..."
                    className="glass border-border/50 text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Pesan Broadcast (ke ALL)</label>
                  <Input
                    id="ws-notif-body"
                    value={notifBody}
                    onChange={e => setNotifBody(e.target.value)}
                    placeholder="Tulis pesan broadcast..."
                    className="glass border-border/50 text-sm h-8"
                    onKeyDown={e => e.key === "Enter" && handleSendNotif()}
                  />
                </div>
                <Button
                  id="ws-submit-notif"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 h-8 text-sm mt-1"
                  onClick={handleSendNotif}
                  disabled={!connected || isSubmitting}
                >
                  <Send className="w-3 h-3 mr-2" /> Kirim via WebSocket
                </Button>
              </div>
            </Card>

            {/* ─── TRIGGER ALERT ─────────────────────────────── */}
            <Card className="glass border-orange-500/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Global Broadcast</p>
                  <p className="text-[10px] text-muted-foreground">Emergency system-wide announcement</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Level</label>
                  <select
                    id="ws-alert-level"
                    value={alertLevel}
                    onChange={e => setAlertLevel(e.target.value)}
                    className="w-full h-8 rounded-md border border-border/50 bg-background/60 text-sm px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Judul Alert</label>
                  <Input
                    id="ws-alert-title"
                    value={alertTitle}
                    onChange={e => setAlertTitle(e.target.value)}
                    placeholder="Judul alert..."
                    className="glass border-border/50 text-sm h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Deskripsi</label>
                  <Input
                    id="ws-alert-body"
                    value={alertBody}
                    onChange={e => setAlertBody(e.target.value)}
                    placeholder="Deskripsi alert..."
                    className="glass border-border/50 text-sm h-8"
                  />
                </div>
                <Button
                  id="ws-submit-alert"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 h-8 text-sm"
                  onClick={handleTriggerAlert}
                  disabled={!connected}
                >
                  <Zap className="w-3 h-3 mr-2" /> Dispatch Announcement
                </Button>
              </div>
            </Card>
          </div>

          {/* Command Results */}
          {commandResults.length > 0 && (
            <Card className="glass border-border/40 p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Command Results</span>
                <Badge className="text-xs ml-auto glass">{commandResults.length}</Badge>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {commandResults.map((result, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                    result.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                  }`}>
                    {result.success
                      ? <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      : <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                    }
                    <div className="min-w-0">
                      <span className="font-mono font-semibold">{result.command}</span>
                      <span className={`ml-2 ${result.success ? "text-green-400" : "text-red-400"}`}>
                        {result.success ? "✅" : "❌"} {result.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* ─── Footer info ──────────────────────────────────── */}
        <div className="text-center text-[10px] text-muted-foreground/50 pb-4">
          BnM ILITS Real-time Management System · Global Operations Hub · Secure Data Link
        </div>
      </div>
    </div>
  );
};

export default WsMonitor;
