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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CodeOfConduct {
  id: string;
  content: string;
  version: number;
}

interface EditCoCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coc: CodeOfConduct;
  onSuccess: () => void;
}

export const EditCoCDialog = ({
  open,
  onOpenChange,
  coc,
  onSuccess,
}: EditCoCDialogProps) => {
  const [content, setContent] = useState(coc.content);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setContent(coc.content);
  }, [coc]);

  const handleUpdate = async () => {
    if (!content.trim()) {
      toast.error("Please enter code of conduct content");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("code_of_conduct")
      .update({ content: content.trim() })
      .eq("id", coc.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update Code of Conduct");
      return;
    }

    toast.success("Code of Conduct updated successfully");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Code of Conduct v{coc.version}</DialogTitle>
          <DialogDescription>
            Update the content of this code of conduct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
