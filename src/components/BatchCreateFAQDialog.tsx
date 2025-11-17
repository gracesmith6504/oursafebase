import { useState } from "react";
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
import { Loader2, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FAQRow {
  tempId: string;
  question: string;
  answer: string;
}

interface BatchCreateFAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (faqs: { question: string; answer: string }[]) => void;
}

export function BatchCreateFAQDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchCreateFAQDialogProps) {
  const [rows, setRows] = useState<FAQRow[]>([
    { tempId: crypto.randomUUID(), question: "", answer: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRow = () => {
    setRows([...rows, { tempId: crypto.randomUUID(), question: "", answer: "" }]);
  };

  const removeRow = (tempId: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter((r) => r.tempId !== tempId));
  };

  const updateRow = (tempId: string, field: "question" | "answer", value: string) => {
    setRows(
      rows.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validFAQs = rows.filter(
      (r) => r.question.trim() && r.answer.trim()
    );

    if (validFAQs.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      onSuccess(
        validFAQs.map((r) => ({
          question: r.question.trim(),
          answer: r.answer.trim(),
        }))
      );
      setRows([{ tempId: crypto.randomUUID(), question: "", answer: "" }]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRows([{ tempId: crypto.randomUUID(), question: "", answer: "" }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Add FAQs</DialogTitle>
          <DialogDescription>
            Add multiple FAQs at once. Empty rows will be skipped.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 px-6 max-h-[60vh]">
            <div className="space-y-6 py-4">
              {rows.map((row, index) => (
                <div
                  key={row.tempId}
                  className="space-y-3 pb-6 border-b last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium">
                      FAQ {index + 1}
                    </Label>
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeRow(row.tempId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="What time does the event start?"
                      value={row.question}
                      onChange={(e) =>
                        updateRow(row.tempId, "question", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="The event starts at 7:00 PM. Please arrive 15 minutes early for check-in."
                      value={row.answer}
                      onChange={(e) =>
                        updateRow(row.tempId, "answer", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="px-6 pb-6 pt-4 space-y-3 flex-shrink-0 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another FAQ
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !rows.some((r) => r.question.trim() && r.answer.trim())
              }
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
