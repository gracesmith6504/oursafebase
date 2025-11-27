import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/AuthContext";
import { Search, Package, CheckCircle2, Loader2 } from "lucide-react";

interface LostFoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  initialType: "lost" | "found";
}

const DEFAULT_CATEGORIES = [
  "Phone",
  "Wallet / ID",
  "Bag",
  "Keys",
  "Access Pass / Wristband",
  "Medication",
  "Clothing / Personal Item",
  "Other",
];

const LostFoundDialog = ({ open, onOpenChange, eventId, initialType }: LostFoundDialogProps) => {
  const { user } = useAuthContext();
  const [type, setType] = useState<"lost" | "found">(initialType);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setSubmitted(false);
      fetchCustomCategories();
    }
  }, [open, initialType]);

  const fetchCustomCategories = async () => {
    const { data } = await supabase
      .from("event_custom_categories")
      .select("category_name")
      .eq("event_id", eventId);

    if (data) {
      setCustomCategories(data.map((c) => c.category_name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error("Please describe the item");
      return;
    }

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("lost_found_items").insert({
      event_id: eventId,
      type,
      category,
      description: description.trim(),
      location: location.trim() || null,
      contact_info: contactInfo.trim() || null,
      submitted_by: user?.id || null,
    });

    setLoading(false);

    if (error) {
      console.error("Error submitting lost/found item:", error);
      toast.error("Failed to submit. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after animation
    setTimeout(() => {
      setCategory("");
      setDescription("");
      setLocation("");
      setContactInfo("");
      setSubmitted(false);
    }, 200);
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.filter(c => !DEFAULT_CATEGORIES.includes(c))];

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-xl">Thanks!</DialogTitle>
            <DialogDescription className="text-base">
              Your update has been sent to the organisers.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "lost" ? (
              <>
                <Search className="h-5 w-5 text-destructive" />
                Report a Lost Item
              </>
            ) : (
              <>
                <Package className="h-5 w-5 text-primary" />
                Report a Found Item
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {type === "lost"
              ? "Let the organisers know what you've lost."
              : "Let the organisers know what you've found."}
          </DialogDescription>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={type === "lost" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setType("lost")}
          >
            <Search className="h-4 w-4 mr-2" />
            I lost something
          </Button>
          <Button
            type="button"
            variant={type === "found" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setType("found")}
          >
            <Package className="h-4 w-4 mr-2" />
            I found something
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Item Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Describe the item (short) *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "lost"
                  ? 'e.g., "black iPhone with a cracked screen"'
                  : 'e.g., "brown leather wallet found near the bar"'
              }
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Where did this happen? (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Main stage, Near the entrance"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Your name or number (optional)</Label>
            <Input
              id="contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="In case you're submitting for a friend"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : type === "lost" ? (
              <Search className="h-4 w-4 mr-2" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            {loading
              ? "Submitting..."
              : type === "lost"
              ? "Submit Lost Item"
              : "Submit Found Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LostFoundDialog;
