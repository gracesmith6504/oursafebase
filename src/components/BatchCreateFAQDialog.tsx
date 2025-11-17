import { useState, useRef, useEffect } from "react";
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
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const SAMPLE_FAQ_QUESTIONS = [
  "What time does the event start?",
  "Where is the event location?",
  "Is there a dress code for this event?",
  "Can I bring a guest or plus-one?",
  "Will food and drinks be provided?",
  "How do I get tickets or register?",
  "Is the venue wheelchair accessible?",
  "What should I do if I need to cancel?",
];

const SAMPLE_FAQ_ANSWERS = [
  "The event starts at 7:00 PM. Please arrive 15 minutes early for check-in.",
  "We're located at the Main Hall on campus. Detailed directions will be sent via email.",
  "Smart casual attire is recommended for this event.",
  "Yes, each ticket includes one guest. Please register them during sign-up.",
  "Light refreshments and drinks will be provided throughout the event.",
  "Registration opens two weeks before the event on our website.",
  "Yes, the venue is fully accessible with ramps and elevators available.",
  "Please contact us at least 48 hours in advance to cancel your registration.",
];

interface FAQRow {
  tempId: string;
  question: string;
  answer: string;
}

interface SortableFAQRowProps {
  row: FAQRow;
  index: number;
  onUpdate: (tempId: string, field: "question" | "answer", value: string) => void;
  onRemove: (tempId: string) => void;
  canRemove: boolean;
  isLast: boolean;
  lastRowRef?: React.RefObject<HTMLDivElement>;
}

function SortableFAQRow({ row, index, onUpdate, onRemove, canRemove, isLast, lastRowRef }: SortableFAQRowProps) {
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

  const placeholderQuestion = SAMPLE_FAQ_QUESTIONS[index % SAMPLE_FAQ_QUESTIONS.length];
  const placeholderAnswer = SAMPLE_FAQ_ANSWERS[index % SAMPLE_FAQ_ANSWERS.length];

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (isLast && lastRowRef) {
          (lastRowRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      style={style}
      className="space-y-3 pb-6 border-b last:border-0 hover:bg-muted/30 rounded-lg p-3 -mx-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Label className="text-sm font-medium">FAQ {index + 1}</Label>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(row.tempId)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Input
          placeholder={placeholderQuestion}
          value={row.question}
          onChange={(e) => onUpdate(row.tempId, "question", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Textarea
          placeholder={placeholderAnswer}
          value={row.answer}
          onChange={(e) => onUpdate(row.tempId, "answer", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
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
  const lastRowRef = useRef<HTMLDivElement>(null);
  const prevRowsLengthRef = useRef(rows.length);

  useEffect(() => {
    if (rows.length > prevRowsLengthRef.current && lastRowRef.current) {
      setTimeout(() => {
        lastRowRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
    prevRowsLengthRef.current = rows.length;
  }, [rows.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      <DialogContent className="sm:max-w-[600px] h-[85vh] max-h-[90vh] flex flex-col p-0 min-h-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Add FAQs</DialogTitle>
          <DialogDescription>
            Add multiple FAQs at once. Empty rows will be skipped.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 min-h-0 px-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rows.map((r) => r.tempId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 py-4">
                  {rows.map((row, index) => (
                    <SortableFAQRow
                      key={row.tempId}
                      row={row}
                      index={index}
                      onUpdate={updateRow}
                      onRemove={removeRow}
                      canRemove={rows.length > 1}
                      isLast={index === rows.length - 1}
                      lastRowRef={lastRowRef}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
          <div className="px-6 pb-6 pt-4 space-y-2 flex-shrink-0 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="w-full sm:w-auto sm:self-center"
              size="sm"
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
              className="w-full sm:min-w-[200px]"
              size="sm"
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
