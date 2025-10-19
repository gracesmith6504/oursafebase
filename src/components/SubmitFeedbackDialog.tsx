import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

const feedbackSchema = z.object({
  feltSafeComfortable: z.enum([
    "yes_completely",
    "mostly",
    "few_issues",
    "no"
  ], { required_error: "Please select an option" }),
  improvements: z.string().trim().max(1000, "Improvements must be less than 1000 characters").optional().or(z.literal("")),
  isAnonymous: z.boolean(),
  name: z.string().trim().max(100, "Name must be less than 100 characters").optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters").optional().or(z.literal(""))
}).refine(
  (data) => {
    if (!data.isAnonymous) {
      return (data.email && data.email.length > 0);
    }
    return true;
  },
  {
    message: "Please provide an email so we can follow up with you",
    path: ["email"],
  }
);

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface SubmitFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onOpenReportDialog?: () => void;
}

const COMFORT_OPTIONS = [
  { value: "yes_completely", label: "Yes, completely" },
  { value: "mostly", label: "Mostly" },
  { value: "few_issues", label: "A few issues" },
  { value: "no", label: "No" },
];

export function SubmitFeedbackDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onOpenReportDialog,
}: SubmitFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feltSafeComfortable: undefined,
      improvements: "",
      isAnonymous: true,
      name: "",
      email: "",
    },
  });

  const isAnonymous = form.watch("isAnonymous");

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      // User is always authenticated; is_anonymous controls contact visibility
      const { error } = await supabase
        .from("event_feedback")
        .insert({
          event_id: eventId,
          felt_safe: data.feltSafeComfortable,
          improvements: data.improvements || null,
          is_anonymous: data.isAnonymous,
          contact_name: data.isAnonymous ? null : (data.name || null),
          contact_email: data.isAnonymous ? null : (data.email || null),
        });

      if (error) throw error;

      setShowSuccess(true);
      form.reset();
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
      });

      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 2500);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setShowSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold">Thank you for your feedback! 🎉</h2>
            <p className="text-center text-muted-foreground">
              Your feedback helps us create safer events for everyone.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Event Feedback</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Help us make future events even better. This isn't a safety report — if something serious happened, please use the{" "}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenReportDialog?.();
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Report an Incident form
                </button>.
              </p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="feltSafeComfortable"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-medium">Did you feel safe and comfortable during the event? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-1.5"
                        >
                          {COMFORT_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className="flex items-center space-x-3 p-2.5 rounded-md border hover:bg-accent/50 cursor-pointer transition-colors"
                              onClick={() => field.onChange(option.value)}
                            >
                              <RadioGroupItem value={option.value} />
                              <Label
                                htmlFor={option.value}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="improvements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anything we could do better next time?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts..."
                          className="min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <Label htmlFor="anonymous-toggle" className="text-sm font-medium">
                      You can choose to stay anonymous — we just want your feedback.
                    </Label>
                  </div>
                  <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          id="anonymous-toggle"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    )}
                  />
                </div>

                {!isAnonymous && (
                  <div className="space-y-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Contact Information</p>
                    <p className="text-xs text-muted-foreground">Please provide your email if you'd like us to follow up on your feedback.</p>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
