import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ReportDetailDialog } from "@/components/ReportDetailDialog";
import { FeedbackDetailDialog } from "@/components/FeedbackDetailDialog";
import { ArrowLeft, Search, Filter, AlertCircle, X } from "lucide-react";
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

interface Feedback {
  id: string;
  event_id: string;
  felt_safe: string;
  improvements: string | null;
  is_anonymous: boolean;
  contact_name: string | null;
  contact_email: string | null;
  submitted_at: string;
}

interface FeedbackWithEvent extends Feedback {
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
  const [feedback, setFeedback] = useState<FeedbackWithEvent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { isCommittee, loading: roleLoading } = useCommitteeRole(societyId || undefined);
  
  const [feedbackEventFilter, setFeedbackEventFilter] = useState<string>("all");
  const [feedbackSafetyFilter, setFeedbackSafetyFilter] = useState<string>("all");
  const [feedbackContactFilter, setFeedbackContactFilter] = useState<string>("all");
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState("");
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithEvent | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  const [showReportFilters, setShowReportFilters] = useState(false);
  const [showFeedbackFilters, setShowFeedbackFilters] = useState(false);

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
      await fetchFeedback(society.id);
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

  const fetchFeedback = async (socId: string) => {
    try {
      // Get event IDs for this society
      const { data: societyEvents, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("society_id", socId);

      if (eventsError) throw eventsError;

      const eventIds = societyEvents.map(e => e.id);

      // Fetch feedback for these events
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("event_feedback")
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

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
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

  const getSafetyColor = (feltSafe: string) => {
    switch (feltSafe) {
      case "very_safe": return "bg-green-100 text-green-800";
      case "mostly_safe": return "bg-green-50 text-green-700";
      case "somewhat_safe": return "bg-yellow-100 text-yellow-800";
      case "unsafe": return "bg-orange-100 text-orange-800";
      case "very_unsafe": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSafetyEmoji = (feltSafe: string) => {
    switch (feltSafe) {
      case "very_safe": return "😊";
      case "mostly_safe": return "🙂";
      case "somewhat_safe": return "😐";
      case "unsafe": return "😟";
      case "very_unsafe": return "😢";
      default: return "❓";
    }
  };

  const getSafetyLabel = (feltSafe: string) => {
    switch (feltSafe) {
      case "very_safe": return "Very Safe";
      case "mostly_safe": return "Mostly Safe";
      case "somewhat_safe": return "Somewhat Safe";
      case "unsafe": return "Unsafe";
      case "very_unsafe": return "Very Unsafe";
      default: return feltSafe;
    }
  };

  const filteredReports = reports.filter(report => {
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    if (eventFilter !== "all" && report.event_id !== eventFilter) return false;
    if (categoryFilter !== "all" && report.concern_type !== categoryFilter) return false;
    if (searchQuery && !report.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredFeedback = feedback.filter(fb => {
    if (feedbackEventFilter !== "all" && fb.event_id !== feedbackEventFilter) return false;
    if (feedbackSafetyFilter !== "all" && fb.felt_safe !== feedbackSafetyFilter) return false;
    if (feedbackContactFilter === "with_contact" && fb.is_anonymous) return false;
    if (feedbackContactFilter === "anonymous" && !fb.is_anonymous) return false;
    if (feedbackSearchQuery && fb.improvements && !fb.improvements.toLowerCase().includes(feedbackSearchQuery.toLowerCase())) return false;
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

  const handleViewFeedback = (fb: FeedbackWithEvent) => {
    setSelectedFeedback(fb);
    setShowFeedbackDialog(true);
  };

  const getActiveReportFiltersCount = () => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (eventFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (searchQuery !== "") count++;
    return count;
  };

  const getActiveFeedbackFiltersCount = () => {
    let count = 0;
    if (feedbackEventFilter !== "all") count++;
    if (feedbackSafetyFilter !== "all") count++;
    if (feedbackContactFilter !== "all") count++;
    if (feedbackSearchQuery !== "") count++;
    return count;
  };

  const getReportFilterBubbles = () => {
    const bubbles = [];
    
    if (statusFilter !== "all") {
      bubbles.push({
        label: `Status: ${statusFilter.replace('_', ' ')}`,
        onRemove: () => setStatusFilter("all")
      });
    }
    
    if (eventFilter !== "all") {
      const event = events.find(e => e.id === eventFilter);
      bubbles.push({
        label: `Event: ${event?.title || eventFilter}`,
        onRemove: () => setEventFilter("all")
      });
    }
    
    if (categoryFilter !== "all") {
      bubbles.push({
        label: `Category: ${CONCERN_TYPE_LABELS[categoryFilter]}`,
        onRemove: () => setCategoryFilter("all")
      });
    }
    
    if (searchQuery !== "") {
      bubbles.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery("")
      });
    }
    
    return bubbles;
  };

  const getFeedbackFilterBubbles = () => {
    const bubbles = [];
    
    if (feedbackEventFilter !== "all") {
      const event = events.find(e => e.id === feedbackEventFilter);
      bubbles.push({
        label: `Event: ${event?.title || feedbackEventFilter}`,
        onRemove: () => setFeedbackEventFilter("all")
      });
    }
    
    if (feedbackSafetyFilter !== "all") {
      bubbles.push({
        label: `Safety: ${getSafetyLabel(feedbackSafetyFilter)}`,
        onRemove: () => setFeedbackSafetyFilter("all")
      });
    }
    
    if (feedbackContactFilter !== "all") {
      bubbles.push({
        label: `Contact: ${feedbackContactFilter === "with_contact" ? "With Contact" : "Anonymous"}`,
        onRemove: () => setFeedbackContactFilter("all")
      });
    }
    
    if (feedbackSearchQuery !== "") {
      bubbles.push({
        label: `Search: "${feedbackSearchQuery}"`,
        onRemove: () => setFeedbackSearchQuery("")
      });
    }
    
    return bubbles;
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    );
  }

  if (!isCommittee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Committee Access Required</CardTitle>
            <CardDescription>
              You need committee access to view reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/my-events')}>
              Back to My Events
            </Button>
          </CardContent>
        </Card>
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
            <TabsTrigger value="reports">Concerns</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Filter Button and Applied Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Sheet open={showReportFilters} onOpenChange={setShowReportFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                      {getActiveReportFiltersCount() > 0 && (
                        <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {getActiveReportFiltersCount()}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent 
                    side="right" 
                    className="w-[90vw] sm:w-[400px] h-full overflow-y-auto flex flex-col"
                  >
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Concerns
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 space-y-6 py-6">
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
                    
                    <SheetFooter className="flex-col sm:flex-col gap-2 mt-auto pt-6 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setStatusFilter("all");
                          setEventFilter("all");
                          setCategoryFilter("all");
                          setSearchQuery("");
                        }}
                      >
                        Clear All Filters
                      </Button>
                      <Button 
                        className="w-full"
                        onClick={() => setShowReportFilters(false)}
                      >
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
              
              {/* Applied Filter Bubbles */}
              {getReportFilterBubbles().length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getReportFilterBubbles().map((bubble, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="gap-2 pr-1 pl-3 py-1"
                    >
                      {bubble.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={bubble.onRemove}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setStatusFilter("all");
                      setEventFilter("all");
                      setCategoryFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>

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

          <TabsContent value="feedback" className="space-y-6">
            {/* Filter Button and Applied Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Sheet open={showFeedbackFilters} onOpenChange={setShowFeedbackFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                      {getActiveFeedbackFiltersCount() > 0 && (
                        <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {getActiveFeedbackFiltersCount()}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent 
                    side="right" 
                    className="w-[90vw] sm:w-[400px] h-full overflow-y-auto flex flex-col"
                  >
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Feedback
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 space-y-6 py-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Event</label>
                        <Select value={feedbackEventFilter} onValueChange={setFeedbackEventFilter}>
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
                        <label className="text-sm font-medium">Safety Rating</label>
                        <Select value={feedbackSafetyFilter} onValueChange={setFeedbackSafetyFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="very_safe">Very Safe 😊</SelectItem>
                            <SelectItem value="mostly_safe">Mostly Safe 🙂</SelectItem>
                            <SelectItem value="somewhat_safe">Somewhat Safe 😐</SelectItem>
                            <SelectItem value="unsafe">Unsafe 😟</SelectItem>
                            <SelectItem value="very_unsafe">Very Unsafe 😢</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Status</label>
                        <Select value={feedbackContactFilter} onValueChange={setFeedbackContactFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Feedback</SelectItem>
                            <SelectItem value="with_contact">With Contact</SelectItem>
                            <SelectItem value="anonymous">Anonymous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search suggestions..."
                            value={feedbackSearchQuery}
                            onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <SheetFooter className="flex-col sm:flex-col gap-2 mt-auto pt-6 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setFeedbackEventFilter("all");
                          setFeedbackSafetyFilter("all");
                          setFeedbackContactFilter("all");
                          setFeedbackSearchQuery("");
                        }}
                      >
                        Clear All Filters
                      </Button>
                      <Button 
                        className="w-full"
                        onClick={() => setShowFeedbackFilters(false)}
                      >
                        Apply Filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
              
              {/* Applied Filter Bubbles */}
              {getFeedbackFilterBubbles().length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getFeedbackFilterBubbles().map((bubble, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="gap-2 pr-1 pl-3 py-1"
                    >
                      {bubble.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={bubble.onRemove}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setFeedbackEventFilter("all");
                      setFeedbackSafetyFilter("all");
                      setFeedbackContactFilter("all");
                      setFeedbackSearchQuery("");
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
              {filteredFeedback.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      {feedback.length === 0 
                        ? "No feedback received yet. Encourage attendees to share their experience! 🎤"
                        : "No feedback matches your filters."}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredFeedback.map(fb => {
                  return (
                    <Card key={fb.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className={getSafetyColor(fb.felt_safe)}>
                                  <span className="mr-1">{getSafetyEmoji(fb.felt_safe)}</span>
                                  {getSafetyLabel(fb.felt_safe)}
                                </Badge>
                                <Badge variant="outline" className={fb.is_anonymous ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"}>
                                  {fb.is_anonymous ? "Anonymous" : "With Contact"}
                                </Badge>
                                {fb.contact_email && (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-green-500" />
                                    Has Contact
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm font-medium text-muted-foreground">
                                {fb.events.title}
                              </p>
                              
                              <p className="text-sm text-muted-foreground">
                                Submitted {formatDistanceToNow(new Date(fb.submitted_at), { addSuffix: true })}
                              </p>
                              
                              {fb.improvements && (
                                <p className="text-sm line-clamp-2 bg-muted p-3 rounded-md">
                                  {fb.improvements}
                                </p>
                              )}
                              
                              {!fb.improvements && (
                                <p className="text-sm text-muted-foreground italic">
                                  No improvement suggestions provided
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleViewFeedback(fb)}
                              size="sm"
                              variant="outline"
                            >
                              View Details
                            </Button>
                          </div>
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
                      <li>• Safety ratings distribution (pie chart)</li>
                      <li>• Safety trends over time (line chart)</li>
                      <li>• Events with lowest safety scores</li>
                      <li>• Anonymous vs named feedback ratio</li>
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

      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
      />
    </div>
  );
}
