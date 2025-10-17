import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, AlertCircle, Search, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Society {
  id: string;
  name: string;
  slug: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society: Society;
  code_of_conduct: {
    id: string;
    version: number;
  } | null;
  user_acceptance: {
    accepted_version: number;
  } | null;
}

const MyEvents = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSociety, setSelectedSociety] = useState<string>("all");
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);

    // Fetch events with society info and CoC acceptance status
    const { data: eventsData, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        event_date,
        location,
        society:societies!inner(id, name, slug)
      `)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      setLoading(false);
      return;
    }

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    // Extract unique societies
    const uniqueSocieties = Array.from(
      new Map(eventsData.map(e => [e.society.id, e.society])).values()
    );
    setSocieties(uniqueSocieties);

    // For each event, check if there's a CoC and if user has accepted it
    const eventsWithCoC = await Promise.all(
      eventsData.map(async (event) => {
        // Only check for event-level CoC (not society templates)
        const { data: coc } = await supabase
          .from("code_of_conduct")
          .select("id, version")
          .eq("event_id", event.id)
          .eq("is_active", true)
          .maybeSingle();

        let userAcceptance = null;
        if (coc) {
          // Check if user has accepted current version
          const { data: acceptance } = await supabase
            .from("code_acceptances")
            .select("accepted_version")
            .eq("user_id", user!.id)
            .eq("code_of_conduct_id", coc.id)
            .gte("accepted_version", coc.version)
            .maybeSingle();
          userAcceptance = acceptance;
        }

        return {
          ...event,
          code_of_conduct: coc,
          user_acceptance: userAcceptance,
        };
      })
    );

    setEvents(eventsWithCoC);
    setLoading(false);
  };

  const getCoCStatus = (event: Event) => {
    if (!event.code_of_conduct) {
      return { required: false, accepted: true, label: null };
    }

    const accepted = event.user_acceptance && 
      event.user_acceptance.accepted_version >= event.code_of_conduct.version;

    return {
      required: true,
      accepted: !!accepted,
      label: accepted ? "Code of Conduct Accepted" : "Accept Code of Conduct Required",
    };
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSociety = selectedSociety === "all" || event.society.id === selectedSociety;
    return matchesSearch && matchesSociety;
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Events</h1>
            <p className="text-muted-foreground mt-1">
              View events from your societies
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSociety} onValueChange={setSelectedSociety}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by society" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Societies</SelectItem>
              {societies.map((society) => (
                <SelectItem key={society.id} value={society.id}>
                  {society.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {events.length === 0
                  ? "No upcoming events. Check back soon!"
                  : "No events match your search."}
              </p>
              {events.length === 0 && societies.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="mt-4"
                >
                  Join a Society
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const cocStatus = getCoCStatus(event);
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{event.society.name}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), "PPP 'at' p")}
                          </div>
                          {event.location && (
                            <div className="text-sm text-muted-foreground">
                              📍 {event.location}
                            </div>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {cocStatus.label && (
                        <div className="flex items-center gap-2">
                          {cocStatus.accepted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                          )}
                          <span className={`text-sm ${cocStatus.accepted ? 'text-green-600' : 'text-orange-600'}`}>
                            {cocStatus.label}
                          </span>
                        </div>
                      )}
                      <Button
                        onClick={() => navigate(`/event/${event.id}`)}
                        className="ml-auto"
                      >
                        View Details →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
