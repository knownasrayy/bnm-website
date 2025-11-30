import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface RequestActionsProps {
  requestId: string;
  currentStatus: string;
  onUpdate: () => void;
}

export const RequestActions = ({ requestId, currentStatus, onUpdate }: RequestActionsProps) => {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  
  const [rejectionReason, setRejectionReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request approved and moved to In Progress");
      setApproveOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "rejected", 
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request rejected");
      setRejectOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error("Please provide revision notes");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "revision_needed", 
          revision_notes: revisionNotes,
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Revision requested");
      setRevisionOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error requesting revision:", error);
      toast.error("Failed to request revision");
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async () => {
    if (!forwardTo) {
      toast.error("Please select a division to forward to");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ 
          status: "forwarded", 
          forwarded_to: forwardTo,
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(`Request forwarded to ${forwardTo}`);
      setForwardOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error forwarding request:", error);
      toast.error("Failed to forward request");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request marked as completed");
      onUpdate();
    } catch (error) {
      console.error("Error completing request:", error);
      toast.error("Failed to complete request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "pending_approval" && (
        <>
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Request</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">Are you sure you want to approve this request and move it to In Progress?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
                <Button onClick={handleApprove} disabled={loading}>Approve</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Request</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={loading}>Reject</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {(currentStatus === "in_progress" || currentStatus === "revision_needed") && (
        <>
          <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-orange text-orange hover:bg-orange/10">
                <AlertCircle className="w-4 h-4 mr-2" />
                Request Revision
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Revision</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Enter revision notes..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRevisionOpen(false)}>Cancel</Button>
                <Button onClick={handleRevision} disabled={loading}>Send</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleComplete} disabled={loading} className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>

          <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-cyan text-cyan hover:bg-cyan/10">
                <ArrowRight className="w-4 h-4 mr-2" />
                Forward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forward Request</DialogTitle>
              </DialogHeader>
              <Select value={forwardTo} onValueChange={setForwardTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CD">Creative Design</SelectItem>
                  <SelectItem value="MEDPRO">Media Production</SelectItem>
                  <SelectItem value="MS">Marketing Strategist</SelectItem>
                  <SelectItem value="CC">Content Creator</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setForwardOpen(false)}>Cancel</Button>
                <Button onClick={handleForward} disabled={loading}>Forward</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
