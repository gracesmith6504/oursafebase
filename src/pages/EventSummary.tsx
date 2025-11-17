import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { 
  ArrowLeft, FileText, MessageSquare, Eye, Shield, TrendingUp, 
  AlertTriangle, Plus, ExternalLink, ChevronRight
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  getEventDetailedMetrics, 
  getReportSeverityBreakdown, 
  getFeedbackSafetyBreakdown,
  getEventCoCAcceptances,
  AttendeeAcceptance
} from "@/lib/reportAnalytics";
import {
  getFeedbackMetrics,
  getRatingAverages,
  getTextAnswerThemes,
  getGroupedResponses,
  FeedbackMetrics,
  RatingAverage,
  TextTheme,
  GroupedResponse
} from "@/lib/feedbackAnalytics";
import { FeedbackAnalyticsSection } from "@/components/FeedbackAnalyticsSection";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { CreateNoteDialog } from "@/components/CreateNoteDialog";
import { NoteCard } from "@/components/NoteCard";
import { EventCoCAcceptancesList } from "@/components/EventCoCAcceptancesList";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  description: string | null;
  society_id: string;
}

interface Metrics {
  reports: number;
  feedback: number;
  pageViews: number;
  codeAcceptances: number;
  resolvedReports: number;
  responseRate: string;
  avgSafetyRating: string;
}

interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
const SAFETY_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

const EventSummary = () => {
  const { slug, eventId } = useParams<{ slug: string; eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [safetyData, setSafetyData] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [cocAcceptances, setCocAcceptances] = useState<AttendeeAcceptance[]>([]);
  const [feedbackMetrics, setFeedbackMetrics] = useState<FeedbackMetrics | null>(null);
  const [ratingAverages, setRatingAverages] = useState<RatingAverage[]>([]);
  const [textThemes, setTextThemes] = useState<TextTheme[]>([]);
  const [societyName, setSocietyName] = useState<string>("");
  const [groupedResponses, setGroupedResponses] = useState<GroupedResponse[]>([]);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(event?.society_id);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          societies:society_id (
            name
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
      setSocietyName(eventData.societies?.name || "");

      // Fetch metrics
      const metricsData = await getEventDetailedMetrics(eventId!);
      setMetrics(metricsData);

      // Fetch chart data, CoC acceptances, and feedback analytics
      const [severity, safety, acceptances, fbMetrics, fbRatings, fbThemes, fbResponses] = await Promise.all([
        getReportSeverityBreakdown(eventId!),
        getFeedbackSafetyBreakdown(eventId!),
        getEventCoCAcceptances(eventId!, eventData.society_id),
        getFeedbackMetrics(eventId!),
        getRatingAverages(eventId!),
        getTextAnswerThemes(eventId!),
        getGroupedResponses(eventId!),
      ]);
      setSeverityData(severity);
      setSafetyData(safety);
      setCocAcceptances(acceptances);
      setFeedbackMetrics(fbMetrics);
      setRatingAverages(fbRatings);
      setTextThemes(fbThemes);
      setGroupedResponses(fbResponses);

      // Fetch notes
      await fetchNotes();
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    const { data: notesData, error } = await supabase
      .from("event_notes")
      .select("*")
      .eq("event_id", eventId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }

    // Fetch profile data separately
    if (notesData && notesData.length > 0) {
      const userIds = [...new Set(notesData.map(n => n.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const notesWithProfiles = notesData.map(note => ({
        ...note,
        profiles: profilesMap.get(note.user_id) || null,
      }));
      
      setNotes(notesWithProfiles);
    } else {
      setNotes([]);
    }
  };

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));
  const filteredNotes = selectedTag 
    ? notes.filter(note => note.tags.includes(selectedTag))
    : notes;
  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const regularNotes = filteredNotes.filter(n => !n.is_pinned);

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-muted p-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isCommittee) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Committee Access Required</CardTitle>
              <CardDescription>
                You need committee access to view event summaries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/society/${slug}/events`)}>
                Back to Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted overflow-x-hidden">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs */}
            {event && (
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/society/${slug}/dashboard`}>Society</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/society/${slug}/events`}>Events</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{event.title} Summary</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/society/${slug}/events`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{event?.title}</h1>
                  <Badge variant="secondary">Past Event</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {event?.event_date && (
                    <span>{format(new Date(event.event_date), "PPP")}</span>
                  )}
                  {event?.location && <span>• {event.location}</span>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 space-y-8 max-w-full">
          {/* Key Metrics */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{metrics?.reports || 0}</div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {metrics?.resolvedReports || 0} resolved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{metrics?.feedback || 0}</div>
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Avg rating: {metrics?.avgSafetyRating}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Page Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{metrics?.pageViews || 0}</div>
                    <Eye className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Safety page visits
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">CoC Acceptances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{metrics?.codeAcceptances || 0}</div>
                    <Shield className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Code of conduct accepted
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Data Visualizations */}
          {(severityData.length > 0 || safetyData.length > 0) && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Data Insights</h2>
              <div className="grid gap-6 md:grid-cols-2 w-full">
                {severityData.length > 0 && (
                  <Card className="w-full overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Reports by Severity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pr-3 pb-3">
                      <ChartContainer config={{}} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                            <Pie
                              data={severityData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {severityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}

                {safetyData.length > 0 && (
                  <Card className="w-full overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Safety Ratings Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pr-3 pb-3">
                      <ChartContainer config={{}} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={safetyData} margin={{ left: -30, right: 5, top: 5, bottom: 5 }}>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="#22c55e" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* Post-Event Feedback Analysis */}
          {feedbackMetrics && feedbackMetrics.totalResponses > 0 && (
            <section>
              <FeedbackAnalyticsSection
                eventName={event?.title || "Event"}
                societyName={societyName}
                metrics={feedbackMetrics}
                ratingAverages={ratingAverages}
                textThemes={textThemes}
                groupedResponses={groupedResponses}
              />
            </section>
          )}

          {/* Internal Notes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Internal Notes</h2>
              <Button onClick={() => setShowCreateNote(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedTag === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Button>
                {allTags.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {pinnedNotes.length > 0 && (
                <div className="space-y-4">
                  {pinnedNotes.map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onUpdate={fetchNotes}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}
              
              {regularNotes.length > 0 && (
                <div className="space-y-4">
                  {regularNotes.map(note => (
                    <NoteCard 
                      key={note.id} 
                      note={note} 
                      onUpdate={fetchNotes}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}

              {filteredNotes.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {selectedTag ? `No notes with tag "${selectedTag}"` : "No internal notes yet"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* CoC Acceptances */}
          <section>
            <EventCoCAcceptancesList attendees={cocAcceptances} loading={loading} />
          </section>

          {/* Quick Access */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/society/${slug}/reports`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    View All Reports
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </CardTitle>
                  <CardDescription>
                    Access detailed report management
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/event/${eventId}`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    View Event Page
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </CardTitle>
                  <CardDescription>
                    See what attendees see
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>
        </main>
      </div>

      <CreateNoteDialog 
        eventId={eventId!}
        open={showCreateNote}
        onOpenChange={setShowCreateNote}
        onSuccess={fetchNotes}
      />
    </ProtectedRoute>
  );
};

export default EventSummary;