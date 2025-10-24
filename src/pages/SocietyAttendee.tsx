import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { getEventStatus } from "@/lib/eventHelpers";

interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  location: string | null;
  description: string | null;
}

const SocietyAttendee = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [society, setSociety] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && slug) {
      fetchSocietyAndEvents();
    }
  }, [user, slug]);

  const fetchSocietyAndEvents = async () => {
    // Fetch society
    const { data: societyData, error: societyError } = await supabase
      .from("societies")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (societyError || !societyData) {
      toast.error("Society not found");
      navigate("/dashboard");
      return;
    }

    // Verify membership
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

    setSociety(societyData);

    // Fetch upcoming events (including today)
    const today = startOfDay(new Date()).toISOString();
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, slug, event_date, location, description")
      .eq("society_id", societyData.id)
      .gte("event_date", today)
      .order("event_date", { ascending: true });

    if (eventsError) {
      toast.error("Failed to load events");
      console.error(eventsError);
    } else {
      setEvents(eventsData || []);
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">{society?.name}</h1>
                  <p className="text-muted-foreground">Upcoming events</p>
                </div>
              </div>

              {events.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No upcoming events scheduled
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event.id} className="transition-shadow hover:shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), "PPP 'at' p")}
                          </div>
                          {event.location && (
                            <div className="text-sm">📍 {event.location}</div>
                          )}
                          {event.description && (
                            <div className="mt-2 text-sm">{event.description}</div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => navigate(`/${society?.slug}/${event.slug}`)}
                          className="w-full"
                        >
                          View Safety Page →
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyAttendee;
