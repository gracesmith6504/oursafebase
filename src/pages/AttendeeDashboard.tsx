import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useUserRoles } from "@/lib/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RoleSwitcher from "@/components/RoleSwitcher";
import { LogOut, User, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society: {
    id: string;
    name: string;
    slug: string;
  };
}

const AttendeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { memberships, hasCommittee, loading: rolesLoading } = useUserRoles();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (user && !rolesLoading) {
      fetchEvents();
    }
  }, [user, rolesLoading]);

  const fetchEvents = async () => {
    setEventsLoading(true);
    
    const societyIds = memberships.map((m) => m.society.id);
    
    if (societyIds.length === 0) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_date, location, society:societies(id, name, slug)")
      .in("society_id", societyIds)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Failed to load events");
      console.error(error);
    } else {
      setEvents(data || []);
    }
    setEventsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OurSafeBase" className="h-10" />
              <h1 className="text-xl font-bold">OurSafeBase</h1>
            </div>
            <div className="flex items-center gap-2">
              {hasCommittee && <RoleSwitcher currentRole="attendee" />}
              <Button variant="ghost" onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* My Societies Section */}
          <div className="mb-8">
            <h2 className="mb-4 text-3xl font-bold">My Societies</h2>
            {rolesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : memberships.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    You're not a member of any societies yet.
                  </p>
                  <Button onClick={() => navigate("/dashboard")}>
                    Join a Society
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => (
                  <Card
                    key={membership.society.id}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => navigate(`/society/${membership.society.slug}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{membership.society.name}</CardTitle>
                        <Badge variant={membership.role === "committee" ? "default" : "secondary"}>
                          {membership.role === "committee" ? "Committee" : "Attendee"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {membership.society.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full">View Society</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* My Events Section */}
          <div>
            <h2 className="mb-4 text-3xl font-bold">Upcoming Events</h2>
            {eventsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No upcoming events. Check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2 text-xl">{event.title}</CardTitle>
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
                      <Button
                        onClick={() => navigate(`/event/${event.id}`)}
                        className="w-full"
                      >
                        View Safety Page →
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AttendeeDashboard;
