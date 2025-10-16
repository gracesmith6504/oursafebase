import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface JoinSocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const JoinSocietyDialog = ({ open, onOpenChange, onSuccess }: JoinSocietyDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setLoading(true);

    // Find society by either invite code (try both)
    let society = null;
    let societyError = null;
    
    // Try committee code first
    const { data: committeeData, error: committeeError } = await supabase
      .from("societies")
      .select("*")
      .eq("committee_invite_code", inviteCode.trim())
      .maybeSingle();
    
    if (committeeData) {
      society = committeeData;
    } else {
      // Try attendee code
      const { data: attendeeData, error: attendeeError } = await supabase
        .from("societies")
        .select("*")
        .eq("attendee_invite_code", inviteCode.trim())
        .maybeSingle();
      
      if (attendeeData) {
        society = attendeeData;
      } else {
        societyError = attendeeError || committeeError;
      }
    }

    if (societyError || !society) {
      toast.error("Invalid invite code");
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("society_members")
      .select("*")
      .eq("society_id", society.id)
      .eq("user_id", user?.id)
      .single();

    if (existing) {
      toast.error("You're already a member of this society");
      setLoading(false);
      return;
    }

    // Determine role based on which code was used
    const isCommitteeCode = society.committee_invite_code === inviteCode.trim();
    const role = isCommitteeCode ? 'committee' : 'attendee';
    
    // Add user as member
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user?.id,
        role: role,
      });

    if (memberError) {
      toast.error("Failed to join society");
      console.error(memberError);
      setLoading(false);
      return;
    }

    toast.success(`Joined ${society.name}!`);
    setInviteCode("");
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Society</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by your society committee
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. abc12345"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Joining..." : "Join Society"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSocietyDialog;
