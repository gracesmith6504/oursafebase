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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface CreateSocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateSocietyDialog = ({ open, onOpenChange, onSuccess }: CreateSocietyDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a society name");
      return;
    }

    setLoading(true);

    const slug = createSlug(name);

    // Create society
    const { data: society, error: societyError } = await supabase
      .from("societies")
      .insert({
        name: name.trim(),
        slug,
      })
      .select()
      .single();

    if (societyError) {
      toast.error("Failed to create society. This name might already be taken.");
      console.error(societyError);
      setLoading(false);
      return;
    }

    // Add user as member (as committee)
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user?.id,
        role: "committee",
      });

    if (memberError) {
      toast.error("Failed to join society");
      console.error(memberError);
      setLoading(false);
      return;
    }

    toast.success("Society created successfully!");
    setName("");
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Society</DialogTitle>
          <DialogDescription>
            Start your own society to manage events and keep members safe
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Society Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drama Society"
              inputMode="text"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Society"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSocietyDialog;
