import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/AuthContext";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ClaimItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
}

const ClaimItemDialog = ({ open, onOpenChange, itemId, itemDescription }: ClaimItemDialogProps) => {
  const { user } = useAuthContext();
  const [reason, setReason] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Please describe why you think this is yours");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("lost_found_claims")
      .insert({
        item_id: itemId,
        reason: reason.trim(),
        contact_info: contactInfo.trim() || null,
        submitted_by: user?.id || null,
      });

    setLoading(false);

    if (error) {
      console.error("Error submitting claim:", error);
      toast.error("Failed to submit. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setSubmitted(false);
      setReason("");
      setContactInfo("");
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="mb-2">Thanks!</DialogTitle>
            <DialogDescription className="text-base">
              We'll check this and get back to you if it matches.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-6">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>This might be mine</DialogTitle>
          <DialogDescription>
            Item: {itemDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Tell the organisers why you think this might be yours
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. It's a black iPhone 14 with a red case and a crack on the top left corner"
              className="resize-none"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">
              Your name or number (optional)
            </Label>
            <Input
              id="contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="So we can reach you"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send to organisers
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimItemDialog;
