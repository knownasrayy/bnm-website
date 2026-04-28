import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, XCircle, ArrowRight,
  Wifi, WifiOff, RefreshCw, Activity, Radio, Loader2
} from "lucide-react";
import { toast } from "sonner";

const GATEWAY = "";

interface RequestData {
  id: string;
  requester_name: string;
  division: string;
  target_division: string;
  request_type: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  note: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState("");

  // ─── Fetch requests (Unary gRPC via Gateway) ───────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedStatus
        ? `${GATEWAY}/api/requests?status=${selectedStatus}`
        : `${GATEWAY}/api/requests`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch {
      toast.error("Tidak dapat terhubung ke gateway. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── Server Streaming: WatchRequests via SSE ───────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      setStreaming(true);
      es = new EventSource(`${GATEWAY}/api/requests/stream/watch`);

      es.onopen = () => {
        setStreamConnected(true);
      };

      es.onmessage = (e) => {
        try {
          const event: { event_type: string; data: RequestData } = JSON.parse(e.data);
          setEventCount(c => c + 1);

          if (event.event_type === "INITIAL") {
            setRequests(prev => {
              const exists = prev.find(r => r.id === event.data.id);
              if (exists) return prev;
              return [event.data, ...prev];
            });
          } else if (event.event_type === "CREATED") {
            setRequests(prev => [event.data, ...prev]);
            toast.success(`📥 Request baru masuk!`, { description: `[${event.data.id}] ${event.data.title}` });
          } else if (event.event_type === "UPDATED") {
            setRequests(prev => prev.map(r => r.id === event.data.id ? event.data : r));
            toast.info(`🔄 Status update`, { description: `[${event.data.id}] → ${event.data.status}` });
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setStreamConnected(false);
        es?.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      es?.close();
      clearTimeout(reconnectTimeout);
      setStreaming(false);
      setStreamConnected(false);
    };
  }, []);

  // ─── Update status (Unary gRPC) ────────────────────────────
  const updateStatus = async (id: string, status: string, note = "") => {
    try {
      const resp = await fetch(`${GATEWAY}/api/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Status diupdate ke "${status}"`);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Gagal update status");
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
      pending:     { label: "Pending Approval", color: "bg-orange-500/20 text-orange-400 border-orange-500/50", Icon: Clock },
      in_progress: { label: "In Progress",      color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",     Icon: ArrowRight },
      revision:    { label: "Revision Needed",  color: "bg-purple-500/20 text-purple-400 border-purple-500/50", Icon: AlertCircle },
      completed:   { label: "Completed",        color: "bg-green-500/20 text-green-400 border-green-500/50",   Icon: CheckCircle2 },
      rejected:    { label: "Rejected",         color: "bg-red-500/20 text-red-400 border-red-500/50",         Icon: XCircle },
    };
    return configs[status] || configs.pending;
  };

  const filteredRequests = (status?: string) =>
    status ? requests.filter(r => r.status === status) : requests;

  const stats = [
    { label: "Total Requests", value: requests.length,                                         color: "from-purple-500 to-pink-500" },
    { label: "In Progress",    value: requests.filter(r => r.status === "in_progress").length,  color: "from-cyan-500 to-purple-500" },
    { label: "Completed",      value: requests.filter(r => r.status === "completed").length,    color: "from-green-500 to-cyan-500" },
    { label: "Pending",        value: requests.filter(r => r.status === "pending").length,      color: "from-orange-500 to-pink-500" },
  ];

  const RequestCard = ({ request }: { request: RequestData }) => {
    const [expanded, setExpanded] = useState(false);
    const cfg = getStatusConfig(request.status);
    const { Icon } = cfg;

    return (
      <Card className="glass border-border/50 p-6 hover:border-primary/50 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{request.id}</span>
              <Badge className={`${cfg.color} border text-xs`}>
                <Icon className="w-3 h-3 mr-1" />
                {cfg.label}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold mb-1">{request.title}</h3>
            <p className="text-sm text-muted-foreground">
              {request.target_division} • {request.request_type} • dari {request.division}
            </p>
            {request.note && (
              <p className="text-xs text-muted-foreground mt-1 italic">📝 {request.note}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Tutup" : "Detail"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground">{request.description}</p>
            <div className="flex flex-wrap gap-2">
              {["in_progress", "revision", "completed", "rejected"].map(s => (
                <Button
                  key={s} size="sm" variant="outline"
                  className="text-xs glass"
                  disabled={request.status === s}
                  onClick={() => updateStatus(request.id, s)}
                >
                  → {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <span>Deadline: {request.deadline ? new Date(request.deadline).toLocaleDateString("id-ID") : "-"}</span>
          <span>•</span>
          <span>Dibuat: {new Date(request.created_at).toLocaleDateString("id-ID")}</span>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: "1s" }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-3">
            {/* Stream indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
              streamConnected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {streamConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {streamConnected ? `Live Stream (${eventCount} events)` : "Reconnecting..."}
            </div>
            <Button size="sm" variant="outline" className="glass gap-2" onClick={fetchRequests}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button onClick={() => navigate("/monitor")} variant="outline" className="glass gap-2">
              <Activity className="w-4 h-4" /> Live Monitor
            </Button>
            <Button onClick={() => navigate("/request")} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
              + New Request
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">Request <span className="gradient-text">Dashboard</span></h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-muted-foreground">gRPC Server Streaming</span>
            </div>
          </div>
          <p className="text-muted-foreground">Real-time update via gRPC WatchRequests stream</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <Card key={i} className="glass border-border/50 p-5">
              <div className={`inline-block px-2 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white text-xs font-medium mb-2`}>
                {stat.label}
              </div>
              <div className="text-4xl font-bold gradient-text">{stat.value}</div>
            </Card>
          ))}
        </div>

        {/* Requests List */}
        <Card className="glass border-border/50 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Memuat data dari gRPC server...</span>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="glass border-border/50 mb-6">
                <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({requests.filter(r => r.status === "in_progress").length})</TabsTrigger>
                <TabsTrigger value="revision">Revision ({requests.filter(r => r.status === "revision").length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({requests.filter(r => r.status === "completed").length})</TabsTrigger>
              </TabsList>

              {["all", "pending", "in_progress", "revision", "completed"].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  {filteredRequests(tab === "all" ? undefined : tab).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Tidak ada request dengan status ini</p>
                    </div>
                  ) : (
                    filteredRequests(tab === "all" ? undefined : tab).map(req => (
                      <RequestCard key={req.id} request={req} />
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
