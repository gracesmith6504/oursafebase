import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Search, Package, MapPin, User, Clock, MessageSquare, Loader2, Hand } from "lucide-react";

interface LostFoundItem {
  id: string;
  type: string;
  category: string;
  description: string;
  location: string | null;
  contact_info: string | null;
  status: string;
  notes: string | null;
  submitted_at: string;
}

interface Claim {
  id: string;
  reason: string;
  contact_info: string | null;
  submitted_at: string;
  status: string;
}

interface LostFoundDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LostFoundItem | null;
  onUpdate: () => void;
}

const LostFoundDetailDialog = ({ open, onOpenChange, item, onUpdate }: LostFoundDetailDialogProps) => {
  const { user } = useAuthContext();
  const [status, setStatus] = useState(item?.status || "open");
  const [notes, setNotes] = useState(item?.notes || "");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setNotes(item.notes || "");
      if (item.type === "found") {
        fetchClaims();
      } else {
        setClaims([]);
      }
    }
  }, [item?.id]);

  const fetchClaims = async () => {
    if (!item) return;
    setClaimsLoading(true);
    const { data, error } = await supabase
      .from("lost_found_claims")
      .select("id, reason, contact_info, submitted_at, status")
      .eq("item_id", item.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching claims:", error);
    } else {
      setClaims(data || []);
    }
    setClaimsLoading(false);
  };

  const handleSave = async () => {
    if (!item) return;
    setLoading(true);

    const updateData: Record<string, unknown> = {
      status,
      notes: notes.trim() || null,
    };

    if (status !== "open" && item.status === "open") {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user?.id;
    }

    const { error } = await supabase
      .from("lost_found_items")
      .update(updateData)
      .eq("id", item.id);

    setLoading(false);

    if (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update. Please try again.");
      return;
    }

    toast.success("Item updated successfully");
    onUpdate();
    onOpenChange(false);
  };

  const updateClaimStatus = async (claimId: string, newStatus: string) => {
    const { error } = await supabase
      .from("lost_found_claims")
      .update({ status: newStatus })
      .eq("id", claimId);

    if (error) {
      toast.error("Failed to update claim status");
    } else {
      toast.success("Claim status updated");
      fetchClaims();
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {item.type === "lost" ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                Lost
              </Badge>
            ) : (
              <Badge className="flex items-center gap-1 bg-primary">
                <Package className="h-3 w-3" />
                Found
              </Badge>
            )}
            <Badge variant="outline">{item.category}</Badge>
          </div>
          <DialogTitle className="text-left mt-2">{item.description}</DialogTitle>
          <DialogDescription className="text-left">
            Manage this {item.type} item report
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              {item.location && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{item.location}</span>
                </div>
              )}
              {item.contact_info && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <User className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{item.contact_info}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Submitted {format(new Date(item.submitted_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>

            {item.type === "found" && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hand className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Claims ({claims.length})</Label>
                  </div>
                  
                  {claimsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading claims...</div>
                  ) : claims.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No claims yet for this item.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {claims.map((claim) => (
                        <div 
                          key={claim.id} 
                          className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm flex-1">{claim.reason}</p>
                            <Select 
                              value={claim.status} 
                              onValueChange={(value) => updateClaimStatus(claim.id, value)}
                            >
                              <SelectTrigger className="w-[100px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {claim.contact_info && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {claim.contact_info}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(claim.submitted_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Internal Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for your team..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LostFoundDetailDialog;
