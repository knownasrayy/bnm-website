import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, XCircle, ArrowRight, Download, FileIcon } from "lucide-react";
import { format } from "date-fns";

interface Request {
  id: string;
  project_title: string;
  project_description: string;
  request_type: string;
  target_division: string;
  status: string;
  usage_date: string;
  submission_date: string;
  reference_links: string[] | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  requester: {
    full_name: string;
    division: string;
    contact_wa: string | null;
    contact_line: string | null;
  };
}

interface RequestFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadRequest();
    checkStaffRole();
  }, [id, user]);

  const checkStaffRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("is_staff", { _user_id: user.id });
    setIsStaff(data || false);
  };

  const loadRequest = async () => {
    try {
      const { data: requestData, error: requestError } = await supabase
        .from("requests")
        .select(`
          *,
          requester:profiles!requester_id (
            full_name,
            division,
            contact_wa,
            contact_line
          )
        `)
        .eq("id", id)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData as any);

      const { data: filesData, error: filesError } = await supabase
        .from("request_files")
        .select("*")
        .eq("request_id", id);

      if (filesError) throw filesError;
      setFiles(filesData || []);
    } catch (error) {
      console.error("Error loading request:", error);
      toast.error("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    const updates: any = { status: newStatus };

    if (newStatus === "revision_needed" && revisionNotes) {
      updates.revision_notes = revisionNotes;
    }

    if (newStatus === "rejected" && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from("requests")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated successfully");
    loadRequest();
    setNewStatus("");
    setRevisionNotes("");
    setRejectionReason("");
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("request-files")
      .download(filePath);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    };
    return configs[status] || configs.pending_approval;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Request not found</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
      </div>

      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{request.project_title}</h1>
              <p className="text-muted-foreground">
                Submitted by {request.requester.full_name} • {request.requester.division}
              </p>
            </div>
            <Badge className={`${statusConfig.color} border px-4 py-2`}>
              <StatusIcon className="w-4 h-4 mr-2" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="glass border-border/50 p-6">
            <h2 className="text-xl font-semibold mb-4">Request Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Target Division</p>
                <p className="font-medium">{request.target_division}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Request Type</p>
                <p className="font-medium">{request.request_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{request.project_description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Usage Date</p>
                  <p className="font-medium">{format(new Date(request.usage_date), "PPP")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{format(new Date(request.submission_date), "PPP")}</p>
                </div>
              </div>
              {request.reference_links && request.reference_links.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Reference Links</p>
                  {request.reference_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline block"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {files.length > 0 && (
            <Card className="glass border-border/50 p-6">
              <h2 className="text-xl font-semibold mb-4">Attached Files</h2>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="glass border-border/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file.file_path, file.file_name)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(request.revision_notes || request.rejection_reason) && (
            <Card className="glass border-border/50 p-6">
              <h2 className="text-xl font-semibold mb-4">Admin Notes</h2>
              {request.revision_notes && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Revision Notes</p>
                  <p className="whitespace-pre-wrap">{request.revision_notes}</p>
                </div>
              )}
              {request.rejection_reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rejection Reason</p>
                  <p className="whitespace-pre-wrap text-destructive">{request.rejection_reason}</p>
                </div>
              )}
            </Card>
          )}

          {isStaff && (
            <Card className="glass border-border/50 p-6">
              <h2 className="text-xl font-semibold mb-4">Update Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">New Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="revision_needed">Revision Needed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "revision_needed" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Revision Notes</label>
                    <Textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="Explain what needs to be revised..."
                      className="glass border-border/50"
                    />
                  </div>
                )}

                {newStatus === "rejected" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rejection Reason</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request is rejected..."
                      className="glass border-border/50"
                    />
                  </div>
                )}

                <Button
                  onClick={updateStatus}
                  className="w-full bg-gradient-to-r from-purple to-pink hover:opacity-90"
                  disabled={!newStatus}
                >
                  Update Status
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;
