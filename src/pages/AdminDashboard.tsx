import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestActions } from "@/components/RequestActions";
import { ArrowLeft, Search, LogOut, Users, Clock, CheckCircle2, AlertCircle, XCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Request {
  id: string;
  project_title: string;
  target_division: string;
  request_type: string;
  status: string;
  usage_date: string;
  submission_date: string;
  requester: {
    full_name: string;
    division: string;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, isStaff, loading: roleLoading } = useUserRole();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin && !isStaff) {
        navigate("/dashboard");
      } else {
        loadRequests();
        subscribeToChanges();
      }
    }
  }, [user, authLoading, roleLoading, isAdmin, isStaff, navigate]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, divisionFilter]);

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('admin-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadRequests = async () => {
    if (!user) return;

    try {
      setLoadingRequests(true);
      
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          requester:profiles!requester_id (
            full_name,
            division
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data as any || []);
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (divisionFilter !== "all") {
      filtered = filtered.filter(req => req.target_division === divisionFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.project_title.toLowerCase().includes(query) ||
        req.target_division.toLowerCase().includes(query) ||
        req.request_type.toLowerCase().includes(query) ||
        req.status.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      pending_approval: {
        icon: Clock,
        label: "Pending Approval",
        color: "bg-orange/20 text-orange border-orange/50",
      },
      in_progress: {
        icon: ArrowRight,
        label: "In Progress",
        color: "bg-cyan/20 text-cyan border-cyan/50",
      },
      revision_needed: {
        icon: AlertCircle,
        label: "Revision Needed",
        color: "bg-purple/20 text-purple border-purple/50",
      },
      completed: {
        icon: CheckCircle2,
        label: "Completed",
        color: "bg-green-500/20 text-green-500 border-green-500/50",
      },
      rejected: {
        icon: XCircle,
        label: "Rejected",
        color: "bg-destructive/20 text-destructive border-destructive/50",
      },
      forwarded: {
        icon: ArrowRight,
        label: "Forwarded",
        color: "bg-cyan/20 text-cyan border-cyan/50",
      },
    };
    return configs[status] || configs.pending_approval;
  };

  const stats = [
    {
      label: "Total Requests",
      value: requests.length,
      color: "from-purple to-pink",
      icon: Users,
    },
    {
      label: "Pending",
      value: requests.filter((r) => r.status === "pending_approval").length,
      color: "from-orange to-pink",
      icon: Clock,
    },
    {
      label: "In Progress",
      value: requests.filter((r) => r.status === "in_progress").length,
      color: "from-cyan to-purple",
      icon: ArrowRight,
    },
    {
      label: "Completed",
      value: requests.filter((r) => r.status === "completed").length,
      color: "from-green-500 to-cyan",
      icon: CheckCircle2,
    },
  ];

  const filterByStatus = (status?: string) => {
    if (!status) return filteredRequests;
    return filteredRequests.filter((r) => r.status === status);
  };

  const RequestCard = ({ request }: { request: Request }) => {
    const statusConfig = getStatusConfig(request.status);
    const StatusIcon = statusConfig.icon;
    
    return (
      <Card className="glass border-border/50 p-6 hover:border-primary/50 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={`${statusConfig.color} border`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge variant="outline">{request.target_division}</Badge>
            </div>
            <h3 className="text-lg font-semibold mb-1">{request.project_title}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {request.request_type}
            </p>
            <p className="text-xs text-muted-foreground">
              Requester: {request.requester?.full_name} ({request.requester?.division})
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span>Deadline: {format(new Date(request.usage_date), "PPP")}</span>
          <span>•</span>
          <span>Submitted: {format(new Date(request.submission_date), "PPP")}</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/request/${request.id}`)}
          >
            View Details
          </Button>
          <RequestActions
            requestId={request.id}
            currentStatus={request.status}
            onUpdate={loadRequests}
          />
        </div>
      </Card>
    );
  };

  if (authLoading || roleLoading || loadingRequests) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-cyan rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/request")} className="bg-gradient-to-r from-purple to-pink hover:opacity-90">
              New Request
            </Button>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            {isAdmin ? "Admin" : "Staff"} <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Manage and review all creative requests
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="glass border-border/50 p-6"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white text-xs font-medium`}>
                    {stat.label}
                  </div>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-4xl font-bold gradient-text">{stat.value}</div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass border-border/50 pl-10"
            />
          </div>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="glass border-border/50 w-full md:w-[200px]">
              <SelectValue placeholder="Filter by division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="CD">Creative Design</SelectItem>
              <SelectItem value="MEDPRO">Media Production</SelectItem>
              <SelectItem value="MS">Marketing Strategist</SelectItem>
              <SelectItem value="CC">Content Creator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="glass border-border/50 p-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="glass border-border/50 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending_approval">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No requests found</p>
              ) : (
                filteredRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending_approval" className="space-y-4">
              {filterByStatus("pending_approval").length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                filterByStatus("pending_approval").map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {filterByStatus("in_progress").length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No requests in progress</p>
              ) : (
                filterByStatus("in_progress").map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterByStatus("completed").length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No completed requests</p>
              ) : (
                filterByStatus("completed").map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
