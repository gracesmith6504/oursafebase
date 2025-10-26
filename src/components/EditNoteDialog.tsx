import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface EditNoteDialogProps {
  note: {
    id: string;
    content: string;
    tags: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditNoteDialog({ note, open, onOpenChange, onSuccess }: EditNoteDialogProps) {
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setContent(note.content);
    setTags(note.tags.join(", "));
  }, [note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      toast.error("Note content is required");
      return;
    }
    
    if (trimmedContent.length > 5000) {
      toast.error("Note content must be less than 5000 characters");
      return;
    }

    setLoading(true);

    try {
      const tagArray = tags.split(",").map(t => t.trim()).filter(t => t).slice(0, 20);
      
      const { error } = await supabase
        .from("event_notes")
        .update({
          content: trimmedContent,
          tags: tagArray,
        })
        .eq("id", note.id);

      if (error) throw error;

      toast.success("Note updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update your note content and tags.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="content">Note Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="logistics, budget, follow-up"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}