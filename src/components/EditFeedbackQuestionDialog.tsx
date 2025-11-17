import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeedbackQuestion {
  id: string;
  question: string;
  question_type: 'text' | 'rating';
  is_required: boolean;
}

interface EditFeedbackQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: FeedbackQuestion | null;
  onSuccess: (id: string, updates: Partial<FeedbackQuestion>) => void;
}

export function EditFeedbackQuestionDialog({
  open,
  onOpenChange,
  question,
  onSuccess,
}: EditFeedbackQuestionDialogProps) {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<'text' | 'rating'>("text");

  useEffect(() => {
    if (question) {
      setQuestionText(question.question);
      setQuestionType(question.question_type);
    }
  }, [question]);

  const handleSubmit = () => {
    if (!question || !questionText.trim()) return;

    onSuccess(question.id, {
      question: questionText.trim(),
      question_type: questionType,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Feedback Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-question">Question</Label>
            <Input
              id="edit-question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Response Type</Label>
            <Select
              value={questionType}
              onValueChange={(value: 'text' | 'rating') => setQuestionType(value)}
            >
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Response</SelectItem>
                <SelectItem value="rating">Rating (1-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
