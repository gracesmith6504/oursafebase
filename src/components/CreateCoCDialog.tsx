import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateCoCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societyId: string;
  onSuccess: () => void;
}

export const CreateCoCDialog = ({
  open,
  onOpenChange,
  societyId,
  onSuccess,
}: CreateCoCDialogProps) => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter code of conduct content");
      return;
    }

    setLoading(true);

    // Get the highest version number for this society
    const { data: existingCocs } = await supabase
      .from("code_of_conduct")
      .select("version")
      .eq("society_id", societyId)
      .is("event_id", null)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = existingCocs && existingCocs.length > 0 
      ? (existingCocs[0].version || 0) + 1 
      : 1;

    const { error } = await supabase
      .from("code_of_conduct")
      .insert({
        society_id: societyId,
        event_id: null,
        name: name.trim(),
        content: content.trim(),
        version: nextVersion,
        is_active: false,
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create Code of Conduct");
      return;
    }

    toast.success("Code of Conduct created successfully");
    setName("");
    setContent("");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Code of Conduct Template</DialogTitle>
          <DialogDescription>
            Create a new template that can be assigned to events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Event CoC, Large Event CoC"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="content">Code of Conduct Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your code of conduct here..."
              className="min-h-[300px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
