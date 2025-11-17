import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";

export interface FeedbackQuestion {
  id: string;
  question: string;
  question_type: 'text' | 'rating';
  display_order: number;
  is_required: boolean;
}

interface SortableFeedbackQuestionItemProps {
  question: FeedbackQuestion;
  onEdit: (question: FeedbackQuestion) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableFeedbackQuestionItem = ({
  question,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableFeedbackQuestionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg group"
    >
      <button
        className="mt-1 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-sm flex-1">{question.question}</p>
          <div className="flex gap-1">
            <Badge variant={question.question_type === 'rating' ? 'default' : 'secondary'} className="text-xs">
              {question.question_type === 'rating' ? 'Rating 1-5' : 'Text'}
            </Badge>
            {question.is_required && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onMoveUp(question.id)}
          disabled={isFirst}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onMoveDown(question.id)}
          disabled={isLast}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit(question)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={() => onDelete(question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface FeedbackSectionProps {
  questions: FeedbackQuestion[];
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (question: FeedbackQuestion) => void;
  onDelete: (id: string) => void;
  onBatchAdd: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function FeedbackSection({
  questions,
  onDragEnd,
  onEdit,
  onDelete,
  onBatchAdd,
  onMoveUp,
  onMoveDown,
}: FeedbackSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-4">
      {questions.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {questions.map((question, index) => (
                <SortableFeedbackQuestionItem
                  key={question.id}
                  question={question}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  isFirst={index === 0}
                  isLast={index === questions.length - 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No feedback questions added yet</p>
          <p className="text-xs mt-1">Click the button below to add questions for attendees</p>
        </div>
      )}

      <Button
        variant="outline"
        onClick={onBatchAdd}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Feedback Questions
      </Button>
    </div>
  );
}

export type { FeedbackQuestion as FeedbackQuestionType };
