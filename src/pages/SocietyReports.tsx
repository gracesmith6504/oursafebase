import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportDetailDialog } from "@/components/ReportDetailDialog";
import { ArrowLeft, Search, Filter, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

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
  id: string;
  title: string;
  event_date: string;
}

interface ReportWithEvent extends Report {
  events: Event;
}

const CONCERN_TYPE_LABELS: Record<string, string> = {
  harassment: "Harassment",
  safety: "Safety Issue",
  code_violation: "Code of Conduct",
  other: "Other",
};

export default function SocietyReports() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [reports, setReports] = useState<ReportWithEvent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    if (user && slug) {
      fetchSocietyAndReports();
    }
  }, [user, slug]);

  const fetchSocietyAndReports = async () => {
    try {
      // Get society
      const { data: society, error: societyError } = await supabase
        .from("societies")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (societyError) throw societyError;

      // Check membership
      const { data: membership, error: memberError } = await supabase
        .from("society_members")
        .select("*")
        .eq("society_id", society.id)
        .eq("user_id", user!.id)
        .single();

      if (memberError || !membership) {
        toast({
          title: "Access Denied",
          description: "You must be a member to view reports",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setSocietyId(society.id);
      setSocietyName(society.name);

      // Fetch events for this society
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title, event_date")
        .eq("society_id", society.id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch reports
      await fetchReports(society.id);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (socId: string) => {
    try {
      // Get event IDs for this society
      const { data: societyEvents, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("society_id", socId);

      if (eventsError) throw eventsError;

      const eventIds = societyEvents.map(e => e.id);

      // Fetch reports for these events
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          *,
          events:event_id (
            id,
            title,
            event_date
          )
        `)
        .in("event_id", eventIds)
        .order("submitted_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "under_review": return "bg-purple-100 text-purple-800 border-purple-200";
      case "resolved": return "bg-green-100 text-green-800 border-green-200";
      case "closed": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-gray-100 text-gray-800 border-gray-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredReports = reports.filter(report => {
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    if (eventFilter !== "all" && report.event_id !== eventFilter) return false;
    if (categoryFilter !== "all" && report.concern_type !== categoryFilter) return false;
    if (searchQuery && !report.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleViewDetails = (reportId: string) => {
    setSelectedReportId(reportId);
    setShowDetailDialog(true);
  };

  const handleReportUpdate = () => {
    if (societyId) {
      fetchReports(societyId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/society/${slug}/dashboard`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">{societyName}</h1>
          <p className="text-muted-foreground">View and manage reported concerns</p>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event</label>
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="safety">Safety Issue</SelectItem>
                        <SelectItem value="code_violation">Code of Conduct</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search descriptions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {reports.length === 0 
                        ? "No concerns reported yet. Your society is doing great!" 
                        : "No reports match your filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map(report => {
                  const needsResponse = report.reporter_email || report.reporter_phone;
                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={getStatusColor(report.status)}>
                                {report.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={getSeverityColor(report.severity)}>
                                {report.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                {CONCERN_TYPE_LABELS[report.concern_type]}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={needsResponse ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                              >
                                Needs Response: {needsResponse ? "Yes" : "No"}
                              </Badge>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                {report.events.title} • {formatDistanceToNow(new Date(report.submitted_at), { addSuffix: true })}
                              </p>
                            </div>

                            <p className="text-sm line-clamp-2">
                              {report.description}
                            </p>
                          </div>

                          <Button
                            onClick={() => handleViewDetails(report.id)}
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                  <div>
                    <p className="font-medium">Analytics Dashboard Coming Soon</p>
                    <p className="text-sm mt-2">Future features will include:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Reports by event (bar chart)</li>
                      <li>• Reports by category (pie chart)</li>
                      <li>• Trend over time (line chart)</li>
                      <li>• Average time to first response</li>
                      <li>• Resolution rate</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ReportDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        reportId={selectedReportId}
        onUpdate={handleReportUpdate}
      />
    </div>
  );
}
