import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  event_id: string;
  concern_type: string;
  description: string;
  severity: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  is_anonymous: boolean;
  status: string;
  submitted_at: string;
  resolved_at: string | null;
  notes: string | null;
}

interface Event {
  title: string;
  event_date: string;
  location: string | null;
}

interface ReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  onUpdate: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "under_review", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CONCERN_TYPE_LABELS: Record<string, string> = {
  harassment: "Harassment",
  safety: "Safety Issue",
  code_violation: "Code of Conduct Violation",
  other: "Other",
};

export function ReportDetailDialog({ open, onOpenChange, reportId, onUpdate }: ReportDetailDialogProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (reportId && open) {
      fetchReportDetails();
    }
  }, [reportId, open]);

  const fetchReportDetails = async () => {
    if (!reportId) return;
    
    setLoading(true);
    try {
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (reportError) throw reportError;

      setReport(reportData);
      setStatus(reportData.status);
      setSeverity(reportData.severity);
      setNotes(reportData.notes || "");

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("title, event_date, location")
        .eq("id", reportData.event_id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
    } catch (error) {
      console.error("Error fetching report details:", error);
      toast({
        title: "Error",
        description: "Failed to load report details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!reportId) return;

    setSaving(true);
    try {
      const updateData: any = {
        status,
        severity,
        notes: notes.trim() || null,
      };

      if (status === "resolved" && report?.status !== "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "under_review": return "bg-purple-50 text-purple-700 border-purple-200";
      case "resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "closed": return "bg-slate-50 text-slate-600 border-slate-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-slate-50 text-slate-600 border-slate-200";
      case "medium": return "bg-orange-50 text-orange-700 border-orange-200";
      case "high": return "bg-rose-50 text-rose-700 border-rose-200";
      case "critical": return "bg-red-100 text-red-800 border-red-300 font-semibold";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const referenceId = report ? `REF-${report.id.split('-')[0].toUpperCase()}-${report.id.split('-')[1].toUpperCase()}` : "";
  const needsResponse = report && (report.reporter_email || report.reporter_phone);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading report details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!report || !event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[700px] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Report Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Reference ID and Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Reference ID</p>
              <code className="text-xs sm:text-sm font-mono bg-muted px-2 py-1 rounded break-all">{referenceId}</code>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`${getStatusColor(status)} text-xs`}>
                {STATUS_OPTIONS.find(s => s.value === status)?.label}
              </Badge>
              <Badge variant="outline" className={`${getSeverityColor(severity)} text-xs`}>
                {SEVERITY_OPTIONS.find(s => s.value === severity)?.label}
              </Badge>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm sm:text-base break-words">{event.title}</h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="break-words">
                {(() => {
                  const date = new Date(event.event_date);
                  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
                  return hasTime 
                    ? format(date, "PPP 'at' p")
                    : format(date, "PPP");
                })()}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="break-words">{event.location}</span>
              </div>
            )}
          </div>

          {/* Report Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-medium">Category:</span>
              <Badge variant="secondary" className="text-xs">{CONCERN_TYPE_LABELS[report.concern_type] || report.concern_type}</Badge>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground break-words">
              Submitted: {format(new Date(report.submitted_at), "PPP 'at' p")}
            </div>
            {report.resolved_at && (
              <div className="text-xs sm:text-sm text-muted-foreground break-words">
                Resolved: {format(new Date(report.resolved_at), "PPP 'at' p")}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm sm:text-base">Description</h4>
            <div className="bg-muted p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{report.description}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm sm:text-base">Contact Information</h4>
            <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-3">
              {report.is_anonymous ? (
                <p className="text-xs sm:text-sm text-muted-foreground">Anonymous Report</p>
              ) : (
                <>
                  {report.reporter_name && (
                    <div className="text-xs sm:text-sm break-words">
                      <span className="font-medium">Name:</span> {report.reporter_name}
                    </div>
                  )}
                  {report.reporter_email && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs sm:text-sm break-all">{report.reporter_email}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto shrink-0"
                        asChild
                      >
                        <a href={`mailto:${report.reporter_email}?subject=Re: Your Concern Report (${referenceId})`}>
                          Send Email
                        </a>
                      </Button>
                    </div>
                  )}
                  {report.reporter_phone && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs sm:text-sm break-all">{report.reporter_phone}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto shrink-0"
                        asChild
                      >
                        <a href={`tel:${report.reporter_phone}`}>
                          Call
                        </a>
                      </Button>
                    </div>
                  )}
                </>
              )}
              <div className="pt-2 border-t">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Needs Response:</span>
                  <Badge variant="outline" className={`text-xs ${needsResponse ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                    {needsResponse && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />}
                    {needsResponse ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Severity Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Internal Notes (Committee Only)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this report..."
              className="min-h-[80px] sm:min-h-[100px] text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 sm:h-auto"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-10 sm:h-auto"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
