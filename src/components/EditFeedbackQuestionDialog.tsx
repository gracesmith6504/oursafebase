import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface MultipleChoiceOption {
  id: string;
  text: string;
}

interface FeedbackQuestion {
  id: string;
  question: string;
  question_type: 'text' | 'rating' | 'multiple_choice';
  is_required: boolean;
  options?: MultipleChoiceOption[];
  allow_multiple_answers?: boolean;
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
  const [questionType, setQuestionType] = useState<'text' | 'rating' | 'multiple_choice'>("text");
  const [options, setOptions] = useState<MultipleChoiceOption[]>([]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question);
      setQuestionType(question.question_type);
      setOptions(question.options || []);
      setAllowMultipleAnswers(question.allow_multiple_answers || false);
    }
  }, [question]);

  const handleSubmit = () => {
    if (!question || !questionText.trim()) return;

    if (questionType === 'multiple_choice') {
      const validOptions = options.filter(opt => opt.text.trim() !== '');
      if (validOptions.length < 2 || validOptions.length > 6) return;
    }

    onSuccess(question.id, {
      question: questionText.trim(),
      question_type: questionType,
      options: questionType === 'multiple_choice' ? options : undefined,
      allow_multiple_answers: questionType === 'multiple_choice' ? allowMultipleAnswers : undefined,
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
              onValueChange={(value: 'text' | 'rating' | 'multiple_choice') => {
                setQuestionType(value);
                if (value === 'multiple_choice' && options.length === 0) {
                  setOptions([
                    { id: crypto.randomUUID(), text: '' },
                    { id: crypto.randomUUID(), text: '' },
                  ]);
                }
              }}
            >
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Response</SelectItem>
                <SelectItem value="rating">Rating (1-5)</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {questionType === 'multiple_choice' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Answer Options (2-6)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-multi-select" className="text-xs text-muted-foreground">
                    Multi-select
                  </Label>
                  <Switch
                    id="edit-multi-select"
                    checked={allowMultipleAnswers}
                    onCheckedChange={setAllowMultipleAnswers}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {options.map((option, idx) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[idx] = { ...option, text: e.target.value };
                        setOptions(newOptions);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setOptions(options.filter((_, i) => i !== idx));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {options.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOptions([...options, { id: crypto.randomUUID(), text: '' }]);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>
          )}
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
