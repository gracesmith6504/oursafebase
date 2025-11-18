import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { ArrowLeft, Plus, Calendar, FileText, MessageSquare, Eye, Shield, Share2, Edit, BarChart, QrCode, ChevronRight, Copy } from "lucide-react";
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
import { getEventStatus } from "@/lib/eventHelpers";
import { getAppUrl } from "@/lib/constants";
import { EventQRCodeDialog } from "@/components/EventQRCodeDialog";
import { FeedbackRequestButton } from "@/components/FeedbackRequestButton";

interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  event_end_date: string | null;
  status: string;
  location: string | null;
  description: string | null;
}

interface EventMetrics {
  reports: number;
  feedback: number;
  pageViews: number;
  codeAcceptances: number;
  feedbackRequestStats?: {
    initialPending: number;
    reminderPending: number;
    initialSent: number;
    reminderSent: number;
    totalAttendees: number;
  };
  feedbackEnabled?: boolean;
}

const SocietyEvents = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [societySlug, setSocietySlug] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [metrics, setMetrics] = useState<Record<string, EventMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(societyId || undefined);

  useEffect(() => {
    fetchEvents();
  }, [slug]);

  const fetchEvents = async () => {
    try {
      // Fetch society details
      const { data: societyData, error: societyError } = await supabase
        .from("societies")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();

      if (societyError) throw societyError;
      
      setSocietyId(societyData.id);
      setSocietyName(societyData.name);
      setSocietySlug(societyData.slug);

      // Check membership
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from("society_members")
        .select("id")
        .eq("society_id", societyData.id)
        .eq("user_id", user?.id)
        .single();

      if (!memberData) {
        navigate("/dashboard");
        return;
      }

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("society_id", societyData.id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch metrics for all events
      if (eventsData && eventsData.length > 0) {
        await fetchMetrics(eventsData.map(e => e.id));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (eventIds: string[]) => {
    if (eventIds.length === 0) {
      setMetrics({});
      return;
    }

    // Batch all queries together instead of sequential queries
    const [reports, feedback, pageViews, codeAcceptances, feedbackRequests, feedbackResponses, feedbackConfigs] = await Promise.all([
      supabase.from("reports").select("event_id", { count: "exact" }).in("event_id", eventIds),
      supabase.from("event_feedback").select("event_id", { count: "exact" }).in("event_id", eventIds),
      supabase.from("safety_page_views").select("event_id", { count: "exact" }).in("event_id", eventIds),
      supabase.from("code_acceptances").select("event_id", { count: "exact" }).in("event_id", eventIds),
      supabase
        .from("code_acceptances")
        .select("event_id, user_id, feedback_request_sent_at, feedback_reminder_sent_at")
        .in("event_id", eventIds),
      supabase
        .from("feedback_responses")
        .select("event_id, user_id")
        .in("event_id", eventIds),
      supabase
        .from("event_feedback_config")
        .select("event_id, enabled")
        .in("event_id", eventIds),
    ]);

    // Group counts by event_id
    const metricsData: Record<string, EventMetrics> = {};
    
    // Initialize all events with zero counts
    eventIds.forEach(id => {
      metricsData[id] = { reports: 0, feedback: 0, pageViews: 0, codeAcceptances: 0 };
    });

    // Aggregate counts from the batched queries
    reports.data?.forEach((r: any) => {
      if (metricsData[r.event_id]) metricsData[r.event_id].reports++;
    });
    feedback.data?.forEach((f: any) => {
      if (metricsData[f.event_id]) metricsData[f.event_id].feedback++;
    });
    pageViews.data?.forEach((p: any) => {
      if (metricsData[p.event_id]) metricsData[p.event_id].pageViews++;
    });
    codeAcceptances.data?.forEach((c: any) => {
      if (metricsData[c.event_id]) metricsData[c.event_id].codeAcceptances++;
    });

    // Calculate feedback request stats per event
    if (feedbackRequests.data && feedbackResponses.data) {
      eventIds.forEach(eventId => {
        const eventRequests = feedbackRequests.data.filter((r: any) => r.event_id === eventId);
        const eventResponses = feedbackResponses.data.filter((r: any) => r.event_id === eventId);
        const responseUserIds = new Set(eventResponses.map((r: any) => r.user_id));
        
        const totalAttendees = eventRequests.length;
        const initialSent = eventRequests.filter((r: any) => r.feedback_request_sent_at !== null).length;
        const reminderSent = eventRequests.filter((r: any) => r.feedback_reminder_sent_at !== null).length;
        
        // Initial pending: haven't been sent initial request yet
        const initialPending = eventRequests.filter((r: any) => r.feedback_request_sent_at === null).length;
        
        // Reminder pending: have initial request but no reminder and haven't submitted feedback
        const reminderPending = eventRequests.filter((r: any) => 
          r.feedback_request_sent_at !== null && 
          r.feedback_reminder_sent_at === null &&
          r.user_id !== null && // Ensure user_id exists
          !responseUserIds.has(r.user_id)
        ).length;
        
        console.log('[SocietyEvents] Metrics calculated for event:', eventId, {
          initialPending,
          reminderPending,
          initialSent,
          reminderSent,
          totalAttendees,
        });

        metricsData[eventId].feedbackRequestStats = {
          initialPending,
          reminderPending,
          initialSent,
          reminderSent,
          totalAttendees,
          _timestamp: Date.now(), // Force new reference for React re-render
        } as any;
      });
    }

    // Set feedback enabled status per event
    if (feedbackConfigs.data) {
      feedbackConfigs.data.forEach((config: any) => {
        if (metricsData[config.event_id]) {
          metricsData[config.event_id].feedbackEnabled = config.enabled;
        }
      });
    }

    setMetrics(metricsData);
  };

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-primary/20 text-primary";
      case "ongoing":
        return "bg-accent/20 text-accent-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  }, []);

  const handleOpenQRDialog = useCallback((event: Event) => {
    setSelectedEvent(event);
    setQrDialogOpen(true);
  }, []);

  const handleShare = useCallback((event: Event) => {
    const eventUrl = `${getAppUrl()}/event/${societySlug}/${event.slug}`;
    if (navigator.share) {
      navigator.share({
        title: event.title,
        url: eventUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(eventUrl);
    }
  }, [societySlug]);

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
                You need committee access to manage events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/my-events')}>
                Back to My Events
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
                    <Link to={`/society/${slug}/dashboard`}>{societyName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Events</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/society/${slug}/dashboard`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{societyName}</h1>
                <p className="text-sm text-muted-foreground">Manage Events</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-full">
          {events.length > 0 && (
            <div className="mb-6 flex justify-end">
              <Button onClick={() => navigate(`/society/${slug}/events/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </div>
          )}
          {events.length === 0 ? (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>No Events Yet</CardTitle>
                <CardDescription>
                  Create your first event to start managing safety and welfare.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate(`/society/${slug}/events/new`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => {
                const eventMetrics = metrics[event.id] || { reports: 0, feedback: 0, pageViews: 0, codeAcceptances: 0 };
                const eventStatus = getEventStatus(event.event_date);
                
                return (
                  <Card key={event.id} className="overflow-hidden transition-all duration-300 hover:shadow-xl border-border/50 bg-card">
                    {/* Top Section: Event Overview */}
                    <CardHeader className="pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl font-semibold leading-tight mb-2 line-clamp-2">
                            {event.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">
                              {event.event_end_date 
                                ? `${format(new Date(event.event_date), "MMM d")} - ${format(new Date(event.event_end_date), "MMM d, yyyy")}`
                                : format(new Date(event.event_date), "MMM d, yyyy")
                              }
                            </span>
                          </div>
                          {event.location && (
                            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1">{event.location}</p>
                          )}
                        </div>
                        <Badge 
                          className={`${getStatusColor(eventStatus)} shrink-0 font-medium px-2.5 py-1`}
                          variant={eventStatus === 'past' ? 'secondary' : 'default'}
                        >
                          {eventStatus}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5 pt-0">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border/40">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-background rounded-md border border-border/50">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold leading-none">{eventMetrics.reports}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">Reports</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-background rounded-md border border-border/50">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold leading-none">{eventMetrics.feedback}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">Feedback</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-background rounded-md border border-border/50">
                            <Eye className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold leading-none">{eventMetrics.pageViews}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">Views</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-background rounded-md border border-border/50">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold leading-none">{eventMetrics.codeAcceptances}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">Accepted</span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/40" />

                      {/* Middle Section: Quick Actions */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/${societySlug}/${event.slug}`)}
                          className="flex-1 gap-2 h-9"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="font-medium">View</span>
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQRDialog(event)}
                          className="flex-1 gap-2 h-9"
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="font-medium">Share</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/society/${slug}/events/${event.id}/duplicate`)}
                          className="flex-1 gap-2 h-9"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="font-medium">Duplicate</span>
                        </Button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/40" />

                      {/* Bottom Section: Primary Actions */}
                      <div className="space-y-2.5">
                        <Button 
                          className="w-full h-11 gap-2 font-medium text-base shadow-sm" 
                          variant="default"
                          onClick={() => navigate(`/society/${slug}/events/${event.id}/summary`)}
                        >
                          <BarChart className="h-5 w-5" />
                          Event Summary
                        </Button>

                        {/* Feedback Request Button */}
                        {eventMetrics.feedbackEnabled && eventMetrics.feedbackRequestStats && (
                          <FeedbackRequestButton
                            eventId={event.id}
                            feedbackEnabled={eventMetrics.feedbackEnabled}
                            stats={eventMetrics.feedbackRequestStats}
                            onSuccess={() => fetchMetrics([event.id])}
                          />
                        )}
                        
                        {eventStatus !== 'past' && (
                          <Button 
                            className="w-full h-11 gap-2 font-medium shadow-sm" 
                            variant="secondary"
                            onClick={() => navigate(`/society/${slug}/events/${event.id}/edit`)}
                          >
                            <Edit className="h-5 w-5" />
                            Manage Event
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {selectedEvent && (
          <EventQRCodeDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            eventId={selectedEvent.id}
            eventTitle={selectedEvent.title}
            societySlug={societySlug}
            eventSlug={selectedEvent.slug}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default SocietyEvents;
