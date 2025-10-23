import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const reportSchema = z.object({
  concernType: z.enum(["harassment", "safety", "code_violation", "other"], {
    required_error: "Please select a concern type",
  }),
  description: z.string()
    .trim()
    .min(1, "Please provide a description")
    .max(1000, "Description must be less than 1000 characters"),
  isAnonymous: z.boolean(),
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
}).refine(
  data => data.isAnonymous || data.email || data.phone,
  { 
    message: "Please provide at least an email or phone number if not submitting anonymously",
    path: ["email"]
  }
);

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportConcernDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function ReportConcernDialog({ open, onOpenChange, eventId }: ReportConcernDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState("");

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      concernType: undefined,
      description: "",
      isAnonymous: true,
      name: "",
      email: "",
      phone: "",
    },
  });

  const isAnonymous = form.watch("isAnonymous");

  const onSubmit = async (data: ReportFormData) => {
    setIsSubmitting(true);
    try {
      // User is always authenticated; is_anonymous controls contact visibility
      const { data: insertedReport, error } = await supabase
        .from("reports")
        .insert({
          event_id: eventId,
          concern_type: data.concernType,
          description: data.description,
          is_anonymous: data.isAnonymous,
          reporter_name: data.isAnonymous ? null : (data.name || null),
          reporter_email: data.isAnonymous ? null : (data.email || null),
          reporter_phone: data.isAnonymous ? null : (data.phone || null),
          status: "new",
          severity: "medium",
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification to committee members
      try {
        const notificationResponse = await supabase.functions.invoke("send-report-notification", {
          body: {
            eventId: eventId,
            reportId: insertedReport.id,
            concernType: data.concernType,
            isAnonymous: data.isAnonymous,
          },
        });
        
        console.log("Email notification response:", notificationResponse);
        
        if (notificationResponse.data?.emailsSent > 0) {
          toast({
            title: "Report submitted",
            description: "Your report was submitted and the committee has been notified.",
          });
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the whole submission if email fails
      }

      // Generate reference ID from timestamp (unique enough for user reference)
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const refId = `REF-${timestamp}-${random}`;
      setReferenceId(refId);
      setShowSuccess(true);
      form.reset();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error",
        description: "Failed to submit your concern. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferenceId = () => {
    navigator.clipboard.writeText(referenceId);
    toast({
      title: "Copied!",
      description: "Reference ID copied to clipboard",
    });
  };

  const handleClose = () => {
    setShowSuccess(false);
    setReferenceId("");
    form.reset();
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <DialogTitle className="text-center">Concern Reported Successfully</DialogTitle>
            <DialogDescription className="text-center">
              Your concern has been reported and will be reviewed by the committee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Reference ID:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background px-3 py-2 rounded font-mono text-sm">
                  {referenceId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyReferenceId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Save this reference ID to track your report.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] p-0 [&>button[aria-label='Close']]:hidden">
        <div className="flex items-center justify-between p-4 pb-3 border-b sm:p-6 sm:pb-4">
          <h2 className="text-2xl font-bold">Report a Concern</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 w-10 sm:h-8 sm:w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="max-h-[calc(85vh-200px)] px-4 sm:px-6">
          <div className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Share any safety concerns or issues. Your report will be reviewed by the committee.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="concernType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Concern</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="safety">Safety Issue</SelectItem>
                        <SelectItem value="code_violation">Code of Conduct Violation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your concern in detail..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Submit Anonymously</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value 
                          ? "Your identity will not be shared" 
                          : "Provide contact info for follow-up"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isAnonymous && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Contact Information</p>
                  <p className="text-xs text-muted-foreground">Provide at least an email or phone number so we can follow up with you.</p>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
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
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+353 12 345 6789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              </form>
            </Form>
          </div>
        </ScrollArea>

        <div className="flex justify-center p-4 pt-3 border-t sm:p-6 sm:pt-4">
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
