import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/AuthContext";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Search, MapPin, Clock, Filter, Inbox, Hand, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import LostFoundDetailDialog from "@/components/LostFoundDetailDialog";
import { ProtectedRoute } from "@/lib/auth";

interface LostFoundItem {
  id: string;
  event_id: string;
  type: string;
  category: string;
  description: string;
  location: string | null;
  contact_info: string | null;
  status: string;
  notes: string | null;
  submitted_at: string;
  events?: { title: string; slug: string };
}

interface Event {
  id: string;
  title: string;
  slug: string;
}

const SocietyLostFound = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterEvent, setFilterEvent] = useState<string>("all");

  const { isCommittee, loading: roleLoading } = useCommitteeRole(societyId || "");

  useEffect(() => {
    if (slug) {
      fetchSocietyAndItems();
    }
  }, [slug]);

  const fetchSocietyAndItems = async () => {
    setLoading(true);

    // Get society
    const { data: society, error: societyError } = await supabase
      .from("societies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (societyError || !society) {
      navigate("/dashboard");
      return;
    }

    setSocietyId(society.id);

    // Get events for this society
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, title, slug")
      .eq("society_id", society.id)
      .order("event_date", { ascending: false });

    if (eventsData) {
      setEvents(eventsData);
    }

    // Get lost/found items
    await fetchItems(society.id);
  };

  const fetchItems = async (socId?: string) => {
    const targetSocietyId = socId || societyId;
    if (!targetSocietyId) return;

    let query = supabase
      .from("lost_found_items")
      .select(`
        *,
        events!inner(title, slug, society_id)
      `)
      .eq("events.society_id", targetSocietyId)
      .order("submitted_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching items:", error);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  };

  const filteredItems = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterEvent !== "all" && item.event_id !== filterEvent) return false;
    return true;
  });

  const openCount = items.filter((i) => i.status === "open").length;

  const handleItemClick = (item: LostFoundItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isCommittee) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only committee members can access the Lost & Found inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/society/${slug}/dashboard`)}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/society/${slug}/dashboard`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Lost & Found Inbox
              </h1>
              <p className="text-muted-foreground">
                {openCount} open {openCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="found">Found</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                  </SelectContent>
                </Select>

                {events.length > 1 && (
                  <Select value={filterEvent} onValueChange={setFilterEvent}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {items.length === 0
                    ? "No lost or found items reported yet"
                    : "No items match your filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {item.type === "lost" ? (
                          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                            <Search className="h-3 w-3" />
                            Lost
                          </Badge>
                        ) : (
                          <Badge className="flex items-center gap-1 text-xs bg-primary">
                            <Package className="h-3 w-3" />
                            Found
                          </Badge>
                        )}
                        <Badge
                          variant={item.status === "open" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.submitted_at), "MMM d, h:mm a")}
                          </span>
                          {item.events && (
                            <span className="text-primary">{item.events.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <LostFoundDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          item={selectedItem}
          onUpdate={() => fetchItems()}
        />
      </div>
    </ProtectedRoute>
  );
};

export default SocietyLostFound;
