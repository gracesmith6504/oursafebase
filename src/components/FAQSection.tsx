import { Eye, EyeOff, GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  isVisible: boolean;
}

interface SortableFAQItemProps {
  faq: FAQ;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableFAQItem = ({ faq, onEdit, onDelete }: SortableFAQItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border bg-muted p-3"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing mt-1 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{faq.question}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{faq.answer}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {faq.isVisible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface FAQSectionProps {
  faqs: FAQ[];
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function FAQSection({ faqs, onDragEnd, onEdit, onDelete, onAdd }: FAQSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-4">
      {faqs.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={faqs.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <SortableFAQItem
                  key={faq.id}
                  faq={faq}
                  onEdit={() => onEdit(faq)}
                  onDelete={() => onDelete(faq.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add FAQ
      </Button>
    </div>
  );
}

export type { FAQ };
