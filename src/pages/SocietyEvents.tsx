import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/lib/auth";
import { ArrowLeft, Plus, Calendar, FileText, MessageSquare, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  status: string;
  location: string | null;
  description: string | null;
}

interface EventMetrics {
  reports: number;
  feedback: number;
  pageViews: number;
  codeAcceptances: number;
}

const SocietyEvents = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [societyName, setSocietyName] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [metrics, setMetrics] = useState<Record<string, EventMetrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [slug]);

  const fetchEvents = async () => {
    try {
      // Fetch society details
      const { data: societyData, error: societyError } = await supabase
        .from("societies")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (societyError) throw societyError;
      setSocietyName(societyData.name);

      // Check membership
      const { data: { user } } = await supabase.auth.getUser();
      const { data: memberData } = await supabase
        .from("society_members")
        .select("id")
        .eq("society_id", societyData.id)
        .eq("user_id", user?.id)
        .single();

      if (!memberData) {
        toast.error("You are not a member of this society");
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
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (eventIds: string[]) => {
    const metricsData: Record<string, EventMetrics> = {};

    for (const eventId of eventIds) {
      const [reports, feedback, pageViews, codeAcceptances] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("event_feedback").select("id", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("safety_page_views").select("id", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("code_acceptances").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      ]);

      metricsData[eventId] = {
        reports: reports.count || 0,
        feedback: feedback.count || 0,
        pageViews: pageViews.count || 0,
        codeAcceptances: codeAcceptances.count || 0,
      };
    }

    setMetrics(metricsData);
  };

  const getStatusColor = (status: string) => {
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
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
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
              <Button onClick={() => navigate(`/society/${slug}/events/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
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
            <div className="grid gap-6 md:grid-cols-2">
              {events.map((event) => {
                const eventMetrics = metrics[event.id] || { reports: 0, feedback: 0, pageViews: 0, codeAcceptances: 0 };
                
                return (
                  <Card
                    key={event.id}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => navigate(`/society/${slug}/events/${event.slug}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="mb-2">{event.title}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(event.event_date), "PPP")}</span>
                          </div>
                          {event.location && (
                            <p className="mt-1 text-sm text-muted-foreground">{event.location}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eventMetrics.reports}</span>
                          <span className="text-muted-foreground">Reports</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eventMetrics.feedback}</span>
                          <span className="text-muted-foreground">Feedback</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eventMetrics.pageViews}</span>
                          <span className="text-muted-foreground">Views</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eventMetrics.codeAcceptances}</span>
                          <span className="text-muted-foreground">Accepted</span>
                        </div>
                      </div>
                      <Button className="mt-4 w-full" variant="outline">
                        Manage Event
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyEvents;
