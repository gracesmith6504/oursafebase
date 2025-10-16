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
  feltSafe: z.enum([
    "very_safe",
    "mostly_safe",
    "somewhat_safe",
    "unsafe",
    "very_unsafe"
  ], { required_error: "Please select how safe you felt" }),
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
}

const SAFETY_OPTIONS = [
  { value: "very_safe", label: "Very Safe", emoji: "😊", color: "text-green-700" },
  { value: "mostly_safe", label: "Mostly Safe", emoji: "🙂", color: "text-green-600" },
  { value: "somewhat_safe", label: "Somewhat Safe", emoji: "😐", color: "text-yellow-600" },
  { value: "unsafe", label: "Unsafe", emoji: "😟", color: "text-orange-600" },
  { value: "very_unsafe", label: "Very Unsafe", emoji: "😢", color: "text-red-600" },
];

export function SubmitFeedbackDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: SubmitFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feltSafe: undefined,
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
          felt_safe: data.feltSafe,
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
              <DialogTitle>Share Your Feedback</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">{eventTitle}</p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="feltSafe"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base">How safe did you feel at this event? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {SAFETY_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                              onClick={() => field.onChange(option.value)}
                            >
                              <RadioGroupItem value={option.value} />
                              <span className="text-2xl">{option.emoji}</span>
                              <Label
                                htmlFor={option.value}
                                className={`flex-1 cursor-pointer font-medium ${option.color}`}
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
                      <FormLabel>What could we improve? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts on what we could do better..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {field.value?.length || 0} / 1000 characters
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="anonymous-toggle" className="text-base font-medium">
                      Submit anonymously
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Turn off to provide contact information
                    </p>
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
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Contact Information</p>
                    <p className="text-xs text-muted-foreground">Provide your email if you'd like us to follow up on your feedback.</p>
                    
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

                <div className="flex justify-end gap-3 pt-4">
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
