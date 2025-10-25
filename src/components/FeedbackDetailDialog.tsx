import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";

interface FeedbackWithEvent {
  id: string;
  event_id: string;
  felt_safe: string;
  improvements: string | null;
  is_anonymous: boolean;
  contact_name: string | null;
  contact_email: string | null;
  submitted_at: string;
  events: {
    title: string;
  };
}

interface FeedbackDetailDialogProps {
  feedback: FeedbackWithEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAFETY_DISPLAY = {
  very_safe: { label: "Very Safe", emoji: "😊", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  mostly_safe: { label: "Mostly Safe", emoji: "🙂", color: "bg-emerald-50/50 text-emerald-600 border-emerald-100" },
  somewhat_safe: { label: "Somewhat Safe", emoji: "😐", color: "bg-amber-50 text-amber-700 border-amber-200" },
  unsafe: { label: "Unsafe", emoji: "😟", color: "bg-orange-50 text-orange-700 border-orange-200" },
  very_unsafe: { label: "Very Unsafe", emoji: "😢", color: "bg-red-50 text-red-700 border-red-200" },
};

export function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
}: FeedbackDetailDialogProps) {
  if (!feedback) return null;

  const safetyInfo = SAFETY_DISPLAY[feedback.felt_safe as keyof typeof SAFETY_DISPLAY] || {
    label: feedback.felt_safe,
    emoji: "❓",
    color: "bg-gray-100 text-gray-800"
  };

  const handleEmailClick = () => {
    if (feedback.contact_email) {
      window.location.href = `mailto:${feedback.contact_email}?subject=Re: Event Feedback - ${feedback.events.title}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Event</p>
            <p className="text-base mt-1">{feedback.events.title}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Submitted</p>
            <p className="text-base mt-1">
              {format(new Date(feedback.submitted_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Safety Rating</p>
            <Badge variant="outline" className={`${safetyInfo.color} text-base py-2 px-4 font-medium`}>
              <span className="mr-2 text-xl">{safetyInfo.emoji}</span>
              {safetyInfo.label}
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Improvement Suggestions
            </p>
            <div className="bg-muted p-4 rounded-lg">
              {feedback.improvements ? (
                <p className="text-sm whitespace-pre-wrap">{feedback.improvements}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No suggestions provided
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Contact Information
            </p>
            <div className="space-y-2">
              {feedback.is_anonymous ? (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                  Submitted Anonymously
                </Badge>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-base">
                      {feedback.contact_name || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>
                  {feedback.contact_email && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base">{feedback.contact_email}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEmailClick}
                          className="gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          Send Email
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
