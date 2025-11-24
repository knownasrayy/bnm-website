import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, ArrowLeft, Upload, AlertCircle } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const Request = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    requesterName: "",
    division: "",
    contact: "",
    targetDivision: "",
    requestType: "",
    title: "",
    description: "",
    references: "",
  });

  const divisions = [
    { value: "cd", label: "Creative Design", minDays: 7 },
    { value: "medpro", label: "Media Production", minDays: 8 },
    { value: "ms", label: "Marketing Strategist", minDays: 8 },
    { value: "cc", label: "Content Creator", minDays: 5 },
  ];

  const requestTypes = {
    cd: ["Feed Design", "Story Design", "Poster", "Banner", "Logo"],
    medpro: ["Video Editing", "Motion Graphics", "Live Report", "Documentary"],
    ms: ["Social Media Strategy", "Campaign Planning", "Content Calendar"],
    cc: ["Caption Writing", "Content Ideas", "Social Media Post"],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all required fields
    const requiredFields = [
      'requesterName',
      'division',
      'contact',
      'targetDivision',
      'requestType',
      'title',
      'description'
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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Request submitted successfully! 🎉", {
      description: "Your request is now pending approval from the BnM team.",
    });
    
    setIsSubmitting(false);
    navigate("/dashboard");
  };

  const deadlineValidation = validateDeadline();

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

              <div className="space-y-2">
                <Label htmlFor="contact">Contact (WA/Line) *</Label>
                <Input
                  id="contact"
                  placeholder="081234567890 or LINE ID"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="glass border-border/50"
                />
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
                        requestTypes[formData.targetDivision as keyof typeof requestTypes]?.map((type) => (
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description & Concept *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your requirements, concept, and any specific details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass border-border/50 min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="references">References (Optional)</Label>
                <Textarea
                  id="references"
                  placeholder="Links to inspiration, examples, or reference materials..."
                  value={formData.references}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assets">Upload Assets (Optional)</Label>
                <div className="glass border-border/50 border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, PDF up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 glass"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !deadlineValidation.valid}
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
