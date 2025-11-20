import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  isVisible: boolean;
}

interface EditFAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: FAQ | null;
  onSuccess: (id: string, question: string, answer: string, isVisible: boolean) => void;
}

export function EditFAQDialog({
  open,
  onOpenChange,
  faq,
  onSuccess,
}: EditFAQDialogProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
    }
  }, [faq]);
  
  useEffect(() => {
    if (!open) {
      setQuestion("");
      setAnswer("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!faq || !question.trim() || !answer.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      onSuccess(faq.id, question.trim(), answer.trim(), faq.isVisible);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit FAQ</DialogTitle>
          <DialogDescription>
            Update the question and answer for this FAQ item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-question">Question *</Label>
              <Input
                id="edit-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What time does the event start?"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-answer">Answer *</Label>
              <Textarea
                id="edit-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="The event starts at 7:00 PM. Please arrive 15 minutes early for check-in."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !question.trim() || !answer.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
