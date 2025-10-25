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
import { Switch } from "@/components/ui/switch";
import { ReportDetailDialog } from "@/components/ReportDetailDialog";
import { FeedbackDetailDialog } from "@/components/FeedbackDetailDialog";
import { ArrowLeft, Search, Filter, AlertCircle, X, Bookmark } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

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
  const { user, loading: authLoading } = useAuth();
  
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [reports, setReports] = useState<ReportWithEvent[]>([]);
  const [feedback, setFeedback] = useState<FeedbackWithEvent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { isCommittee, loading: roleLoading } = useCommitteeRole(societyId || undefined);
  
  const [feedbackEventFilter, setFeedbackEventFilter] = useState<string>("all");
  const [feedbackSafetyFilter, setFeedbackSafetyFilter] = useState<string>("all");
  const [feedbackContactFilter, setFeedbackContactFilter] = useState<string>("all");
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState("");
  
  const [bookmarkedReportIds, setBookmarkedReportIds] = useState<string[]>([]);
  const [bookmarkFilter, setBookmarkFilter] = useState<boolean>(false);
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithEvent | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  const [showReportFilters, setShowReportFilters] = useState(false);
  const [showFeedbackFilters, setShowFeedbackFilters] = useState(false);

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;
    
    // If not authenticated, redirect to login with current path
    if (!user && !authLoading) {
      const currentPath = `/society/${slug}/reports`;
      navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    // If authenticated and slug exists, fetch data
    if (user && slug) {
      fetchSocietyAndReports();
    }
  }, [user, authLoading, slug, navigate]);

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
      await fetchBookmarks(society.id);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
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

  const fetchBookmarks = async (socId: string) => {
    try {
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from("report_bookmarks")
        .select("report_id")
        .eq("user_id", user!.id);

      if (bookmarkError) throw bookmarkError;
      setBookmarkedReportIds(bookmarkData?.map(b => b.report_id) || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    }
  };

  const toggleBookmark = async (reportId: string) => {
    const isBookmarked = bookmarkedReportIds.includes(reportId);
    
    try {
      if (isBookmarked) {
        // Remove bookmark
        await supabase
          .from("report_bookmarks")
          .delete()
          .eq("report_id", reportId)
          .eq("user_id", user!.id);
        
        setBookmarkedReportIds(prev => prev.filter(id => id !== reportId));
        toast({
          title: "Bookmark removed",
          description: "Report removed from your bookmarks",
        });
      } else {
        // Add bookmark
        await supabase
          .from("report_bookmarks")
          .insert({
            report_id: reportId,
            user_id: user!.id,
          });
        
        setBookmarkedReportIds(prev => [...prev, reportId]);
        toast({
          title: "Bookmarked",
          description: "Report added to your bookmarks",
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
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

  const getStatusAccentColor = (status: string) => {
    switch (status) {
      case "new": return "bg-amber-400";
      case "in_progress": return "bg-blue-500";
      case "under_review": return "bg-purple-500";
      case "resolved": return "bg-emerald-500";
      case "closed": return "bg-slate-400";
      default: return "bg-slate-300";
    }
  };

  const getSafetyColor = (feltSafe: string) => {
    switch (feltSafe) {
      case "very_safe": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "mostly_safe": return "bg-emerald-50/50 text-emerald-600 border-emerald-100";
      case "somewhat_safe": return "bg-amber-50 text-amber-700 border-amber-200";
      case "unsafe": return "bg-orange-50 text-orange-700 border-orange-200";
      case "very_unsafe": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
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
    if (bookmarkFilter && !bookmarkedReportIds.includes(report.id)) return false;
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
      fetchBookmarks(societyId);
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
    if (bookmarkFilter) count++;
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
    
    if (bookmarkFilter) {
      bubbles.push({
        label: "Bookmarked Only",
        onRemove: () => setBookmarkFilter(false)
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

  if (roleLoading) {
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
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="OurSafeBase" className="h-8" />
            <div>
              <h1 className="text-xl font-bold">{societyName}</h1>
              <p className="text-sm text-muted-foreground">Manage reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="reports" className="space-y-8">
          <div className="bg-card rounded-xl border shadow-sm p-1.5">
            <TabsList className="grid w-full grid-cols-3 h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="reports" 
                className="relative data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3 px-4 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">Concerns</span>
                  {reports.length > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {reports.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="feedback" 
                className="relative data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3 px-4 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">Feedback</span>
                  {feedback.length > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {feedback.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3 px-4 transition-all"
              >
                <span className="font-medium">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reports" className="space-y-6">
            {/* Filter Button and Applied Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Sheet open={showReportFilters} onOpenChange={setShowReportFilters}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="default" 
                      className="gap-2 border-2 hover:bg-accent hover:border-primary/30 transition-all shadow-sm"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Filters</span>
                      {getActiveReportFiltersCount() > 0 && (
                        <Badge className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                          {getActiveReportFiltersCount()}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent 
                    side="right" 
                    className="w-[90vw] sm:w-[440px] h-full overflow-y-auto flex flex-col"
                  >
                    <SheetHeader className="text-left pb-6 border-b">
                      <SheetTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Filter className="h-5 w-5 text-primary" />
                        </div>
                        <span>Filter Concerns</span>
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 space-y-6 py-6">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="new">🆕 New</SelectItem>
                            <SelectItem value="in_progress">⏳ In Progress</SelectItem>
                            <SelectItem value="under_review">🔍 Under Review</SelectItem>
                            <SelectItem value="resolved">✅ Resolved</SelectItem>
                            <SelectItem value="closed">🔒 Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Event</label>
                        <Select value={eventFilter} onValueChange={setEventFilter}>
                          <SelectTrigger className="h-11 border-2">
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

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Category</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="harassment">⚠️ Harassment</SelectItem>
                            <SelectItem value="safety">🛡️ Safety Issue</SelectItem>
                            <SelectItem value="code_violation">📋 Code of Conduct</SelectItem>
                            <SelectItem value="other">💬 Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search descriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-2"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-accent/30">
                        <div className="flex items-center gap-3">
                          <Bookmark className="h-5 w-5 text-amber-600" />
                          <div>
                            <label htmlFor="bookmark-filter" className="text-sm font-semibold cursor-pointer">Show Bookmarked Only</label>
                            <p className="text-xs text-muted-foreground">
                              {bookmarkedReportIds.length} bookmarked report{bookmarkedReportIds.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="bookmark-filter"
                          checked={bookmarkFilter}
                          onCheckedChange={setBookmarkFilter}
                        />
                      </div>
                    </div>
                    
                    <SheetFooter className="flex-col sm:flex-col gap-3 mt-auto pt-6 border-t">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full border-2"
                        onClick={() => {
                          setStatusFilter("all");
                          setEventFilter("all");
                          setCategoryFilter("all");
                          setSearchQuery("");
                          setBookmarkFilter(false);
                        }}
                      >
                        Clear All Filters
                      </Button>
                      <Button 
                        size="lg"
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
                <div className="flex flex-wrap gap-2 items-center">
                  {getReportFilterBubbles().map((bubble, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="gap-2 pr-1.5 pl-3 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-xs font-medium">{bubble.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-primary/30 rounded-full"
                        onClick={bubble.onRemove}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
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
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-lg font-medium text-muted-foreground text-center">
                      {reports.length === 0 
                        ? "No concerns reported yet" 
                        : "No reports match your filters"}
                    </p>
                    {reports.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 mt-2 text-center max-w-md">
                        Your society is doing great! This means attendees feel safe and comfortable at your events.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map(report => {
                  const needsResponse = report.reporter_email || report.reporter_phone;
                  const isNew = report.status === "new";
                  
                  return (
                    <Card 
                      key={report.id} 
                      className="relative overflow-hidden hover:shadow-md transition-all duration-300 group border-2 hover:border-primary/30"
                    >
                      {/* Status Accent Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusAccentColor(report.status)} group-hover:w-2 transition-all`} />
                      
                      {/* Bookmark Button - Top Right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(report.id);
                        }}
                        className={`absolute top-3 right-3 h-8 w-8 z-10 ${
                          bookmarkedReportIds.includes(report.id)
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-muted-foreground hover:text-amber-600'
                        }`}
                      >
                        <Bookmark
                          className="h-5 w-5"
                          fill={bookmarkedReportIds.includes(report.id) ? 'currentColor' : 'none'}
                        />
                      </Button>
                      
                      <CardContent className="p-4 sm:p-6 pl-6 sm:pl-8 pr-12 sm:pr-14">
                        <div className="flex flex-col gap-4">
                          <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                            {/* Status and Severity - Primary Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {isNew && (
                                <div className="relative flex items-center">
                                  <span className="flex h-2.5 w-2.5 absolute -left-1 -top-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                  </span>
                                </div>
                              )}
                              <Badge variant="outline" className={`${getStatusColor(report.status)} font-semibold tracking-wide text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                                {report.status === "new" ? "New" : 
                                 report.status === "in_progress" ? "In Progress" :
                                 report.status === "under_review" ? "Under Review" :
                                 report.status === "resolved" ? "Resolved" : "Closed"}
                              </Badge>
                              <Badge variant="outline" className={`${getSeverityColor(report.severity)} tracking-wide text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                                {report.severity === "critical" && "🚨 "}
                                {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                              </Badge>
                            </div>

                            {/* Event Title & Time */}
                            <div>
                              <p className="font-semibold text-base sm:text-lg text-foreground break-words">
                                {report.events.title}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(report.submitted_at), { addSuffix: true })}
                              </p>
                            </div>

                            {/* Category & Response Badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-medium">
                                {CONCERN_TYPE_LABELS[report.concern_type]}
                              </Badge>
                              {needsResponse && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                  Needs Response
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed pt-1 break-words">
                              {report.description}
                            </p>
                          </div>

                          {/* View Details Button */}
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleViewDetails(report.id)}
                              variant="outline"
                              size="default"
                              className="hover:bg-primary hover:text-primary-foreground transition-all border-2 font-medium h-10"
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

          <TabsContent value="feedback" className="space-y-6">
            {/* Filter Button and Applied Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Sheet open={showFeedbackFilters} onOpenChange={setShowFeedbackFilters}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="default" 
                      className="gap-2 border-2 hover:bg-accent hover:border-primary/30 transition-all shadow-sm"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Filters</span>
                      {getActiveFeedbackFiltersCount() > 0 && (
                        <Badge className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                          {getActiveFeedbackFiltersCount()}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent 
                    side="right" 
                    className="w-[90vw] sm:w-[440px] h-full overflow-y-auto flex flex-col"
                  >
                    <SheetHeader className="text-left pb-6 border-b">
                      <SheetTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Filter className="h-5 w-5 text-primary" />
                        </div>
                        <span>Filter Feedback</span>
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-1 space-y-6 py-6">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Event</label>
                        <Select value={feedbackEventFilter} onValueChange={setFeedbackEventFilter}>
                          <SelectTrigger className="h-11 border-2">
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

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Safety Rating</label>
                        <Select value={feedbackSafetyFilter} onValueChange={setFeedbackSafetyFilter}>
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="very_safe">😊 Very Safe</SelectItem>
                            <SelectItem value="mostly_safe">🙂 Mostly Safe</SelectItem>
                            <SelectItem value="somewhat_safe">😐 Somewhat Safe</SelectItem>
                            <SelectItem value="unsafe">😟 Unsafe</SelectItem>
                            <SelectItem value="very_unsafe">😢 Very Unsafe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Contact Status</label>
                        <Select value={feedbackContactFilter} onValueChange={setFeedbackContactFilter}>
                          <SelectTrigger className="h-11 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Feedback</SelectItem>
                            <SelectItem value="with_contact">📧 With Contact</SelectItem>
                            <SelectItem value="anonymous">🔒 Anonymous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search suggestions..."
                            value={feedbackSearchQuery}
                            onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-2"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <SheetFooter className="flex-col sm:flex-col gap-3 mt-auto pt-6 border-t">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full border-2"
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
                        size="lg"
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
                <div className="flex flex-wrap gap-2 items-center">
                  {getFeedbackFilterBubbles().map((bubble, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="gap-2 pr-1.5 pl-3 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-xs font-medium">{bubble.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-primary/30 rounded-full"
                        onClick={bubble.onRemove}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
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
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-6xl mb-4">🎤</div>
                    <p className="text-lg font-medium text-muted-foreground text-center">
                      {feedback.length === 0 
                        ? "No feedback received yet"
                        : "No feedback matches your filters"}
                    </p>
                    {feedback.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 mt-2 text-center max-w-md">
                        Encourage attendees to share their experience after events to help improve safety and engagement.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredFeedback.map(fb => {
                  return (
                    <Card key={fb.id} className="hover:shadow-lg transition-all duration-300 group relative overflow-hidden border-l-4 border-l-primary/20">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30 group-hover:w-1.5 transition-all" />
                      
                      <CardContent className="p-6 pl-8">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3 flex-1">
                              {/* Safety Rating Badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`${getSafetyColor(fb.felt_safe)} font-medium px-3 py-1`}>
                                  <span className="mr-2 text-base">{getSafetyEmoji(fb.felt_safe)}</span>
                                  {getSafetyLabel(fb.felt_safe)}
                                </Badge>
                                {fb.contact_email && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                    Has Contact
                                  </Badge>
                                )}
                                {fb.is_anonymous && (
                                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                                    Anonymous
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Event Title */}
                              <div>
                                <p className="font-semibold text-foreground/90">
                                  {fb.events.title}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                  {formatDistanceToNow(new Date(fb.submitted_at), { addSuffix: true })}
                                </p>
                              </div>
                              
                              {/* Improvements Preview */}
                              {fb.improvements && (
                                <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                                  {fb.improvements}
                                </p>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => handleViewFeedback(fb)}
                              variant="outline"
                              size="sm"
                              className="shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

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
