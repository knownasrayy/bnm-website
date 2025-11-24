import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, XCircle, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Mock data - akan diganti dengan real data dari backend
  const mockRequests = [
    {
      id: "REQ-001",
      title: "Social Media Feed - Opening Ceremony",
      targetDivision: "Creative Design",
      requester: "Event Division",
      status: "pending",
      deadline: "2026-02-15",
      createdAt: "2026-01-28",
    },
    {
      id: "REQ-002",
      title: "Opening Video Teaser",
      targetDivision: "Media Production",
      requester: "Documentation",
      status: "in_progress",
      deadline: "2026-02-20",
      createdAt: "2026-01-25",
    },
    {
      id: "REQ-003",
      title: "Instagram Campaign Strategy",
      targetDivision: "Marketing Strategist",
      requester: "Social Media Team",
      status: "completed",
      deadline: "2026-01-30",
      createdAt: "2026-01-15",
    },
    {
      id: "REQ-004",
      title: "Event Highlight Captions",
      targetDivision: "Content Creator",
      requester: "Event Division",
      status: "revision",
      deadline: "2026-02-10",
      createdAt: "2026-01-20",
    },
  ];

  const [requests] = useState(mockRequests);

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        icon: Clock,
        label: "Pending Approval",
        color: "bg-orange/20 text-orange border-orange/50",
      },
      in_progress: {
        icon: ArrowRight,
        label: "In Progress",
        color: "bg-cyan/20 text-cyan border-cyan/50",
      },
      revision: {
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
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const stats = [
    {
      label: "Total Requests",
      value: requests.length,
      color: "from-purple to-pink",
    },
    {
      label: "In Progress",
      value: requests.filter((r) => r.status === "in_progress").length,
      color: "from-cyan to-purple",
    },
    {
      label: "Completed",
      value: requests.filter((r) => r.status === "completed").length,
      color: "from-green-500 to-cyan",
    },
    {
      label: "Pending",
      value: requests.filter((r) => r.status === "pending").length,
      color: "from-orange to-pink",
    },
  ];

  const filterByStatus = (status?: string) => {
    if (!status) return requests;
    return requests.filter((r) => r.status === status);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-cyan rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button 
            onClick={() => navigate("/request")}
            className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
          >
            New Request
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            Request <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Track and manage all your creative requests
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="glass border-border/50 p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white text-xs font-medium mb-3`}>
                {stat.label}
              </div>
              <div className="text-4xl font-bold gradient-text">{stat.value}</div>
            </Card>
          ))}
        </div>

        {/* Requests List */}
        <Card className="glass border-border/50 p-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="glass border-border/50 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card
                    key={request.id}
                    className="glass border-border/50 p-6 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {request.id}
                          </span>
                          <Badge className={`${statusConfig.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.targetDivision} • Requested by {request.requester}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {filterByStatus("pending").map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card
                    key={request.id}
                    className="glass border-border/50 p-6 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {request.id}
                          </span>
                          <Badge className={`${statusConfig.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.targetDivision} • Requested by {request.requester}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {filterByStatus("in_progress").map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card
                    key={request.id}
                    className="glass border-border/50 p-6 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {request.id}
                          </span>
                          <Badge className={`${statusConfig.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.targetDivision} • Requested by {request.requester}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterByStatus("completed").map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card
                    key={request.id}
                    className="glass border-border/50 p-6 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {request.id}
                          </span>
                          <Badge className={`${statusConfig.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.targetDivision} • Requested by {request.requester}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
