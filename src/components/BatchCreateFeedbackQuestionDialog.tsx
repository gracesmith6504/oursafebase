import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, X, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MultipleChoiceOption {
  id: string;
  text: string;
}

interface FeedbackQuestionRow {
  tempId: string;
  question: string;
  question_type: 'text' | 'rating' | 'multiple_choice';
  options?: MultipleChoiceOption[];
  allow_multiple_answers?: boolean;
}

interface SortableFeedbackQuestionRowProps {
  row: FeedbackQuestionRow;
  index: number;
  onUpdate: (tempId: string, updates: Partial<FeedbackQuestionRow>) => void;
  onRemove: (tempId: string) => void;
}

const SortableFeedbackQuestionRow = ({
  row,
  index,
  onUpdate,
  onRemove,
}: SortableFeedbackQuestionRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg"
    >
      <button
        className="mt-2 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex-1 space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`question-${row.tempId}`}>Question {index + 1}</Label>
          <Input
            id={`question-${row.tempId}`}
            value={row.question}
            onChange={(e) => onUpdate(row.tempId, { question: e.target.value })}
            placeholder="e.g., How would you rate the event overall?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`type-${row.tempId}`}>Response Type</Label>
          <Select
            value={row.question_type}
            onValueChange={(value: 'text' | 'rating' | 'multiple_choice') =>
              onUpdate(row.tempId, { 
                question_type: value,
                options: value === 'multiple_choice' ? (row.options || [
                  { id: crypto.randomUUID(), text: '' },
                  { id: crypto.randomUUID(), text: '' },
                ]) : undefined,
                allow_multiple_answers: value === 'multiple_choice' ? false : undefined,
              })
            }
          >
            <SelectTrigger id={`type-${row.tempId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Response</SelectItem>
              <SelectItem value="rating">Rating (1-5)</SelectItem>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {row.question_type === 'multiple_choice' && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Answer Options (2-6)</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`multi-select-${row.tempId}`} className="text-xs text-muted-foreground">
                  Multi-select
                </Label>
                <Switch
                  id={`multi-select-${row.tempId}`}
                  checked={row.allow_multiple_answers || false}
                  onCheckedChange={(checked) =>
                    onUpdate(row.tempId, { allow_multiple_answers: checked })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              {(row.options || []).map((option, optIdx) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...(row.options || [])];
                      newOptions[optIdx] = { ...option, text: e.target.value };
                      onUpdate(row.tempId, { options: newOptions });
                    }}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1"
                  />
                  {(row.options?.length || 0) > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = (row.options || []).filter((_, i) => i !== optIdx);
                        onUpdate(row.tempId, { options: newOptions });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {(row.options?.length || 0) < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(row.options || []), { id: crypto.randomUUID(), text: '' }];
                    onUpdate(row.tempId, { options: newOptions });
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

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(row.tempId)}
        className="mt-2 text-destructive hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface BatchCreateFeedbackQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (questions: Omit<FeedbackQuestionRow, 'tempId'>[]) => void;
}

export function BatchCreateFeedbackQuestionDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchCreateFeedbackQuestionDialogProps) {
  const [rows, setRows] = useState<FeedbackQuestionRow[]>([
    { tempId: crypto.randomUUID(), question: "", question_type: "text" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addRow = () => {
    setRows([
      ...rows,
      { tempId: crypto.randomUUID(), question: "", question_type: "text" },
    ]);
  };

  const updateRow = (tempId: string, updates: Partial<FeedbackQuestionRow>) => {
    setRows(rows.map((row) => (row.tempId === tempId ? { ...row, ...updates } : row)));
  };

  const removeRow = (tempId: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.tempId !== tempId));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((items) => {
        const oldIndex = items.findIndex((item) => item.tempId === active.id);
        const newIndex = items.findIndex((item) => item.tempId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = () => {
    const validRows = rows.filter((row) => {
      if (row.question.trim() === "") return false;
      if (row.question_type === 'multiple_choice') {
        const validOptions = (row.options || []).filter(opt => opt.text.trim() !== '');
        return validOptions.length >= 2 && validOptions.length <= 6;
      }
      return true;
    });

    if (validRows.length === 0) {
      return;
    }

    const questions = validRows.map(({ tempId, ...rest }) => rest);
    onSuccess(questions);
    
    // Reset form
    setRows([
      { tempId: crypto.randomUUID(), question: "", question_type: "text" },
    ]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRows([
      { tempId: crypto.randomUUID(), question: "", question_type: "text" },
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Feedback Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((row) => row.tempId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <SortableFeedbackQuestionRow
                    key={row.tempId}
                    row={row}
                    index={index}
                    onUpdate={updateRow}
                    onRemove={removeRow}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button variant="outline" onClick={addRow} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Question
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Questions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
