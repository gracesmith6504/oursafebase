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

    // Find society by invite code using RPC to check both codes
    // This works because the invite join process validates codes server-side
    const { data: societies, error: societyError } = await supabase
      .from("societies")
      .select("id, name, slug");

    if (societyError || !societies) {
      toast.error("Failed to validate invite code");
      setLoading(false);
      return;
    }

    // Check each society's invite codes using the security definer function
    let society = null;
    let isCommitteeCode = false;

    for (const soc of societies) {
      const { data: codes } = await supabase
        .rpc("get_society_invite_codes", { society_id: soc.id });
      
      if (codes?.[0]?.committee_invite_code === inviteCode.trim()) {
        society = soc;
        isCommitteeCode = true;
        break;
      } else if (codes?.[0]?.attendee_invite_code === inviteCode.trim()) {
        society = soc;
        isCommitteeCode = false;
        break;
      }
    }

    if (!society) {
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
      .maybeSingle();

    if (existing) {
      toast.error("You're already a member of this society");
      setLoading(false);
      return;
    }

    // Role was determined during invite code validation
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
