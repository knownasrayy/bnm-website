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
import { CalendarIcon, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const GATEWAY = "";

const Request = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ id: string; title: string } | null>(null);

  const [formData, setFormData] = useState({
    requester_name:  "",
    division:        "",
    contact:         "",
    target_division: "",
    request_type:    "",
    title:           "",
    description:     "",
    references:      "",
  });

  const divisions = [
    { value: "Creative Design",       label: "Creative Design",       minDays: 7 },
    { value: "Media Production",      label: "Media Production",      minDays: 8 },
    { value: "Marketing Strategist",  label: "Marketing Strategist",  minDays: 8 },
    { value: "Content Creator",       label: "Content Creator",       minDays: 5 },
  ];

  const requestTypes: Record<string, string[]> = {
    "Creative Design":       ["Feed Design", "Story Design", "Poster", "Banner", "Logo"],
    "Media Production":      ["Video Editing", "Motion Graphics", "Live Report", "Documentary"],
    "Marketing Strategist":  ["Social Media Strategy", "Campaign Planning", "Content Calendar"],
    "Content Creator":       ["Caption Writing", "Content Ideas", "Social Media Post"],
  };

  const validateDeadline = () => {
    if (!date) return { valid: false, message: "Pilih tanggal deadline" };
    const sel = divisions.find(d => d.value === formData.target_division);
    if (!sel)  return { valid: false, message: "Pilih target divisi terlebih dahulu" };
    const days = differenceInDays(date, new Date());
    if (days < sel.minDays) {
      return { valid: false, message: `${sel.label} butuh minimal H-${sel.minDays}. Kamu pilih H-${days}.` };
    }
    return { valid: true, message: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const required = ["requester_name", "division", "contact", "target_division", "request_type", "title", "description"];
    const empty    = required.filter(f => !formData[f as keyof typeof formData]);

    if (empty.length > 0) {
      toast.error("Lengkapi semua field yang wajib diisi");
      setIsSubmitting(false);
      return;
    }

    const dv = validateDeadline();
    if (!dv.valid) {
      toast.error(dv.message);
      setIsSubmitting(false);
      return;
    }

    try {
      // ═══ REAL gRPC CALL (via Gateway) ═══
      const resp = await fetch(`${GATEWAY}/api/requests`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          deadline: date ? format(date, "yyyy-MM-dd") : "",
        }),
      });

      const data = await resp.json();

      if (data.success) {
        setSubmitResult({ id: data.data.id, title: data.data.title });
        toast.success(`Request berhasil dikirim! 🎉`, {
          description: `ID: ${data.data.id} — ${data.data.title}`,
        });
      } else {
        toast.error(`Gagal: ${data.message}`);
      }
    } catch (err: unknown) {
      toast.error("Tidak dapat terhubung ke server. Pastikan gRPC server & gateway sudah berjalan.");
      console.error("Submit error:", err);
    }

    setIsSubmitting(false);
  };

  const deadlineValidation = validateDeadline();

  // ─── Success screen ────────────────────────────────────────
  if (submitResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-cyan rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: "1s" }} />
        </div>
        <Card className="glass border-border/50 p-10 max-w-md text-center animate-slide-up z-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-cyan mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Terkirim!</h2>
          <p className="text-muted-foreground mb-2 text-sm font-mono">{submitResult.id}</p>
          <p className="text-muted-foreground mb-6">{submitResult.title}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Request kamu sudah masuk ke sistem via <strong>gRPC</strong> dan akan direview oleh tim BnM.
            Kamu dapat memantau statusnya di Dashboard.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 glass" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple to-pink hover:opacity-90"
              onClick={() => navigate("/dashboard")}
            >
              Lihat Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-pink rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" style={{ animationDelay: "1s" }} />
      </div>

      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs text-muted-foreground mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            gRPC Unary — CreateRequest
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Create New <span className="gradient-text">Request</span>
          </h1>
          <p className="text-muted-foreground">
            Request akan dikirim langsung ke server via gRPC protocol
          </p>
        </div>

        <Card className="glass border-border/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Requester Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple to-pink flex items-center justify-center text-white text-sm">1</div>
                Requester Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name" placeholder="Nama lengkap kamu"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division">Your Division *</Label>
                  <Input
                    id="division" placeholder="e.g., Divisi Acara"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="glass border-border/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact (WA/Line) *</Label>
                <Input
                  id="contact" placeholder="081234567890 atau LINE ID"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="glass border-border/50"
                />
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan to-purple flex items-center justify-center text-white text-sm">2</div>
                Request Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Division *</Label>
                  <Select
                    value={formData.target_division}
                    onValueChange={(v) => setFormData({ ...formData, target_division: v, request_type: "" })}
                  >
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Pilih divisi" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      {divisions.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Request Type *</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(v) => setFormData({ ...formData, request_type: v })}
                    disabled={!formData.target_division}
                  >
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      {formData.target_division && requestTypes[formData.target_division]?.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deadline *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal glass border-border/50", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 glass border-border/50">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < addDays(new Date(), 1)} initialFocus />
                  </PopoverContent>
                </Popover>
                {date && formData.target_division && !deadlineValidation.valid && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{deadlineValidation.message}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title" placeholder="Judul singkat request kamu"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="glass border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description & Concept *</Label>
                <Textarea
                  id="description" placeholder="Jelaskan kebutuhan, konsep, dan detail spesifik..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass border-border/50 min-h-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="references">References (Opsional)</Label>
                <Textarea
                  id="references" placeholder="Link inspirasi, contoh, atau materi referensi..."
                  value={formData.references}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                  className="glass border-border/50"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1 glass">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !deadlineValidation.valid}
                className="flex-1 bg-gradient-to-r from-purple to-pink hover:opacity-90"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending via gRPC...</>
                ) : "Submit Request"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Request;
