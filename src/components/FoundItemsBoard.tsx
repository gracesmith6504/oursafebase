import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, MapPin, Clock, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ClaimItemDialog from "./ClaimItemDialog";

interface FoundItem {
  id: string;
  category: string;
  description: string;
  location: string | null;
  submitted_at: string;
}

interface FoundItemsBoardProps {
  eventId: string;
}

const FoundItemsBoard = ({ eventId }: FoundItemsBoardProps) => {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoundItem | null>(null);

  useEffect(() => {
    const fetchFoundItems = async () => {
      const { data, error } = await supabase
        .from("lost_found_items")
        .select("id, category, description, location, submitted_at")
        .eq("event_id", eventId)
        .eq("type", "found")
        .eq("status", "open")
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching found items:", error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchFoundItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("found-items-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lost_found_items",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchFoundItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleClaimClick = (item: FoundItem) => {
    setSelectedItem(item);
    setClaimDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Found Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Found Items
          </CardTitle>
          <CardDescription>
            Items that have been handed in will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No items have been handed in yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Found Items
          </CardTitle>
          <CardDescription>
            Items that have been handed in. See something that might be yours?
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => handleClaimClick(item)}
                    >
                      <Hand className="h-3 w-3 mr-1" />
                      This might be mine
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ClaimItemDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        itemId={selectedItem?.id || ""}
        itemDescription={selectedItem?.description || ""}
      />
    </>
  );
};

export default FoundItemsBoard;
