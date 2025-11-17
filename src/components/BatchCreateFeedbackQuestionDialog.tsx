import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus, X } from "lucide-react";
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

interface FeedbackQuestionRow {
  tempId: string;
  question: string;
  question_type: 'text' | 'rating';
  is_required: boolean;
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

        <div className="flex gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor={`type-${row.tempId}`}>Response Type</Label>
            <Select
              value={row.question_type}
              onValueChange={(value: 'text' | 'rating') =>
                onUpdate(row.tempId, { question_type: value })
              }
            >
              <SelectTrigger id={`type-${row.tempId}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Response</SelectItem>
                <SelectItem value="rating">Rating (1-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`required-${row.tempId}`}>Required</Label>
            <div className="flex items-center h-10">
              <Switch
                id={`required-${row.tempId}`}
                checked={row.is_required}
                onCheckedChange={(checked) =>
                  onUpdate(row.tempId, { is_required: checked })
                }
              />
            </div>
          </div>
        </div>
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
    { tempId: crypto.randomUUID(), question: "", question_type: "text", is_required: true },
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
      { tempId: crypto.randomUUID(), question: "", question_type: "text", is_required: true },
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
    const validRows = rows.filter((row) => row.question.trim() !== "");
    if (validRows.length === 0) {
      return;
    }

    const questions = validRows.map(({ tempId, ...rest }) => rest);
    onSuccess(questions);
    
    // Reset form
    setRows([
      { tempId: crypto.randomUUID(), question: "", question_type: "text", is_required: true },
    ]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRows([
      { tempId: crypto.randomUUID(), question: "", question_type: "text", is_required: true },
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
