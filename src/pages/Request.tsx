import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, ArrowLeft, AlertCircle } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const Request = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { uploadFiles, uploading, uploadedFiles, removeFile, setUploadedFiles } = useFileUpload();
  const [date, setDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    requesterName: "",
    division: "",
    contactWa: "",
    contactLine: "",
    targetDivision: "",
    requestType: "",
    projectTitle: "",
    projectDescription: "",
    referenceLinks: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please login to create a request");
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Load user profile
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, division, contact_wa, contact_line")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setFormData(prev => ({
        ...prev,
        requesterName: data.full_name || "",
        division: data.division || "",
        contactWa: data.contact_wa || "",
        contactLine: data.contact_line || "",
      }));
    }
  };

  const divisions = [
    { value: "CD", label: "Creative Design", minDays: 7 },
    { value: "MEDPRO", label: "Media Production", minDays: 8 },
    { value: "MS", label: "Marketing Strategist", minDays: 8 },
    { value: "CC", label: "Content Creator", minDays: 5 },
  ];

  const requestTypes: Record<string, string[]> = {
    CD: ["Feed Design", "Story Design", "Poster", "Banner", "Logo"],
    MEDPRO: ["Video Editing", "Motion Graphics", "Live Report", "Documentary"],
    MS: ["Social Media Strategy", "Campaign Planning", "Content Calendar"],
    CC: ["Caption Writing", "Content Ideas", "Social Media Post"],
  };

  const validateDeadline = () => {
    if (!date) return { valid: false, message: "Please select a date" };
    
    const selectedDivision = divisions.find(d => d.value === formData.targetDivision);
    if (!selectedDivision) return { valid: false, message: "Please select a target division" };
    
    const daysUntilDeadline = differenceInDays(date, new Date());
    
    if (daysUntilDeadline < selectedDivision.minDays) {
      return {
        valid: false,
        message: `${selectedDivision.label} requires minimum H-${selectedDivision.minDays}. You selected H-${daysUntilDeadline}.`,
      };
    }
    
    return { valid: true, message: "" };
  };

  const handleFilesSelected = (files: File[]) => {
    setPendingFiles([...pendingFiles, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to submit a request");
      return;
    }

    setIsSubmitting(true);

    // Validate required fields
    const requiredFields = [
      'requesterName',
      'division',
      'targetDivision',
      'requestType',
      'projectTitle',
      'projectDescription'
    ];
    
    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (emptyFields.length > 0) {
      toast.error("Please fill all required fields");
      setIsSubmitting(false);
      return;
    }

    const deadlineValidation = validateDeadline();
    if (!deadlineValidation.valid) {
      toast.error(deadlineValidation.message);
      setIsSubmitting(false);
      return;
    }

    try {
      // Parse reference links
      const links = formData.referenceLinks
        .split("\n")
        .map(link => link.trim())
        .filter(link => link.length > 0);

      // Create request
      const { data: requestData, error: requestError } = await supabase
        .from("requests")
        .insert({
          requester_id: user.id,
          target_division: formData.targetDivision as any,
          request_type: formData.requestType,
          project_title: formData.projectTitle,
          project_description: formData.projectDescription,
          reference_links: links.length > 0 ? links : null,
          usage_date: date!.toISOString(),
          status: "pending_approval",
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Upload files if any
      if (pendingFiles.length > 0) {
        await uploadFiles(pendingFiles, requestData.id);
      }

      toast.success("Request submitted successfully! 🎉", {
        description: "Your request is now pending approval from the BnM team.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deadlineValidation = validateDeadline();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-pink rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Form */}
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-4">
            Create New <span className="gradient-text">Request</span>
          </h1>
          <p className="text-muted-foreground">
            Fill in the details below to submit your creative request
          </p>
        </div>

        <Card className="glass border-border/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Requester Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple to-pink flex items-center justify-center text-white text-sm">
                  1
                </div>
                Requester Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="division">Your Division *</Label>
                  <Input
                    id="division"
                    placeholder="e.g., Event Division"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactWa">WhatsApp</Label>
                  <Input
                    id="contactWa"
                    placeholder="081234567890"
                    value={formData.contactWa}
                    onChange={(e) => setFormData({ ...formData, contactWa: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactLine">LINE ID</Label>
                  <Input
                    id="contactLine"
                    placeholder="Your LINE ID"
                    value={formData.contactLine}
                    onChange={(e) => setFormData({ ...formData, contactLine: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan to-purple flex items-center justify-center text-white text-sm">
                  2
                </div>
                Request Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetDivision">Target Division *</Label>
                  <Select
                    value={formData.targetDivision}
                    onValueChange={(value) => setFormData({ ...formData, targetDivision: value, requestType: "" })}
                  >
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      {divisions.map((div) => (
                        <SelectItem key={div.value} value={div.value}>
                          {div.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requestType">Request Type *</Label>
                  <Select
                    value={formData.requestType}
                    onValueChange={(value) => setFormData({ ...formData, requestType: value })}
                    disabled={!formData.targetDivision}
                  >
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      {formData.targetDivision &&
                        requestTypes[formData.targetDivision]?.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline / Usage Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal glass border-border/50",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass border-border/50">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < addDays(new Date(), 1)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                {date && formData.targetDivision && !deadlineValidation.valid && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{deadlineValidation.message}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief title for your request"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description & Concept *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your requirements, concept, and any specific details..."
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  className="glass border-border/50 min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="references">References (Optional)</Label>
                <Textarea
                  id="references"
                  placeholder="Add links (one per line)..."
                  value={formData.referenceLinks}
                  onChange={(e) => setFormData({ ...formData, referenceLinks: e.target.value })}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Assets (Optional)</Label>
                <FileUploadZone
                  onFilesSelected={handleFilesSelected}
                  uploadedFiles={pendingFiles.map((file, idx) => ({
                    id: idx.toString(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    path: "",
                  }))}
                  onRemoveFile={(id) => removePendingFile(parseInt(id))}
                  disabled={uploading || isSubmitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 glass"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploading || !deadlineValidation.valid}
                className="flex-1 bg-gradient-to-r from-purple to-pink hover:opacity-90"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Request;
