import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, AlertCircle, Search, Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { getEventStatus } from "@/lib/eventHelpers";

interface Society {
  id: string;
  name: string;
  slug: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_end_date: string | null;
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
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "past">("upcoming");

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

    // First, get societies the user is a member of
    const { data: membershipData, error: membershipError } = await supabase
      .from("society_members")
      .select("society_id")
      .eq("user_id", user!.id);

    if (membershipError) {
      console.error("Error fetching memberships:", membershipError);
      setLoading(false);
      return;
    }

    if (!membershipData || membershipData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const societyIds = membershipData.map(m => m.society_id);

    // Fetch events only from societies user is a member of
    const { data: eventsData, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        event_date,
        event_end_date,
        location,
        society:societies!inner(id, name, slug)
      `)
      .in("society_id", societyIds)
      .order("event_date", { ascending: false });

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

    // Batch fetch all CoCs and acceptances for better performance
    const eventIds = eventsData.map(e => e.id);
    
    // Fetch all active CoCs for these events in one query
    const { data: cocsData } = await supabase
      .from("code_of_conduct")
      .select("id, version, event_id")
      .in("event_id", eventIds)
      .eq("is_active", true);

    // Create a map of event_id -> CoC
    const cocMap = new Map(cocsData?.map(coc => [coc.event_id, coc]) || []);
    
    // If there are CoCs, fetch all acceptances in one query
    const cocIds = cocsData?.map(c => c.id) || [];
    let acceptancesMap = new Map();
    
    if (cocIds.length > 0) {
      const { data: acceptancesData } = await supabase
        .from("code_acceptances")
        .select("code_of_conduct_id, accepted_version")
        .eq("user_id", user!.id)
        .in("code_of_conduct_id", cocIds);
      
      acceptancesMap = new Map(
        acceptancesData?.map(acc => [acc.code_of_conduct_id, acc]) || []
      );
    }

    // Combine the data
    const eventsWithCoC = eventsData.map(event => {
      const coc = cocMap.get(event.id);
      const userAcceptance = coc ? acceptancesMap.get(coc.id) : null;
      
      return {
        ...event,
        code_of_conduct: coc || null,
        user_acceptance: userAcceptance || null,
      };
    });

    setEvents(eventsWithCoC);
    setLoading(false);
  };

  const getCoCStatus = useCallback((event: Event) => {
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
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSociety = selectedSociety === "all" || event.society.id === selectedSociety;
      
      // Filter by date status
      const eventStatus = getEventStatus(event.event_date);
      let matchesDate = true;
      if (dateFilter === "upcoming") {
        matchesDate = eventStatus === "upcoming" || eventStatus === "ongoing";
      } else if (dateFilter === "past") {
        matchesDate = eventStatus === "past";
      }
      
      return matchesSearch && matchesSociety && matchesDate;
    });
  }, [events, searchQuery, selectedSociety, dateFilter]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Dashboard</span>
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="OurSafeBase" className="h-8 md:h-10" />
            <h1 className="text-lg md:text-xl font-bold">OurSafeBase</h1>
          </div>
          <div className="w-[100px]"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Events</h1>
          <p className="text-muted-foreground mt-1">
            View events from your societies
          </p>
        </div>

        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>

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
                  ? "No events from your societies yet."
                  : "No events match your search."}
              </p>
              {events.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="mt-4"
                >
                  View Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const cocStatus = getCoCStatus(event);
              const eventStatus = getEventStatus(event.event_date);
              const isPast = eventStatus === "past";
              
              return (
                <Card 
                  key={event.id} 
                  className={`hover:shadow-md transition-shadow cursor-pointer ${isPast ? 'opacity-75' : ''}`}
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{event.title}</h3>
                          <Badge variant={isPast ? "secondary" : "default"} className="shrink-0">
                            {eventStatus === "ongoing" ? "Today" : eventStatus}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {event.event_end_date 
                              ? `${format(new Date(event.event_date), "MMM d")} - ${format(new Date(event.event_end_date), "MMM d, yyyy")}`
                              : format(new Date(event.event_date), "MMM d, yyyy")
                            }
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {event.society.name}
                          </Badge>
                          {event.location && (
                            <span className="truncate">📍 {event.location}</span>
                          )}
                        </div>
                        {cocStatus.label && !isPast && (
                          <div className="flex items-center gap-1 mt-2">
                            {cocStatus.accepted ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-orange-600" />
                            )}
                            <span className={`text-xs ${cocStatus.accepted ? 'text-green-600' : 'text-orange-600'}`}>
                              {cocStatus.accepted ? "CoC Accepted" : "CoC Required"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyEvents;
