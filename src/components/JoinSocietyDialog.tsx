import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuthContext } from "@/lib/AuthContext";

interface JoinSocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const JoinSocietyDialog = ({ open, onOpenChange, onSuccess }: JoinSocietyDialogProps) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      return;
    }

    setLoading(true);

    // Validate invite code using security definer function
    const { data: validationResult, error: validationError } = await supabase
      .rpc("validate_invite_code", { invite_code: inviteCode.trim() });

    if (validationError || !validationResult || validationResult.length === 0) {
      toast.error("Invalid invite code. Please check and try again.");
      setLoading(false);
      return;
    }

    const society = {
      id: validationResult[0].society_id,
      name: validationResult[0].society_name,
      slug: validationResult[0].society_slug,
    };
    const role = validationResult[0].role_type;

    // If committee member, redirect to onboarding first
    if (role === 'committee') {
      setLoading(false);
      onOpenChange(false);
      navigate(`/onboarding?invite=${inviteCode.trim()}`);
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
      toast.info(`You're already a member of ${society.name}`);
      setLoading(false);
      onOpenChange(false);
      const destination = existing.role === 'committee' 
        ? `/society/${society.slug}/dashboard` 
        : '/dashboard';
      navigate(destination);
      return;
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user?.id,
        role: role as 'committee' | 'attendee',
      });

    if (memberError) {
      console.error(memberError);
      setLoading(false);
      return;
    }

    toast.success(`Joined ${society.name}!`);
    setInviteCode("");
    setLoading(false);
    onOpenChange(false);
    onSuccess();
    
    // Redirect based on role
    const destination = role === 'committee' 
      ? `/society/${society.slug}/dashboard` 
      : '/dashboard';
    navigate(destination);
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
              inputMode="text"
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
