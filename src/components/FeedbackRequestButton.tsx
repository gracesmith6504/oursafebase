import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Bell, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ButtonState = 'initial' | 'sending-initial' | 'initial-sent' | 'reminder' | 'sending-reminder' | 'reminder-sent' | 'all-complete';

interface FeedbackRequestButtonProps {
  eventId: string;
  feedbackEnabled: boolean;
  stats: {
    initialPending: number;
    reminderPending: number;
    initialSent: number;
    reminderSent: number;
    totalAttendees: number;
  };
  onSuccess: () => void;
}

export const FeedbackRequestButton = ({ 
  eventId, 
  feedbackEnabled, 
  stats, 
  onSuccess 
}: FeedbackRequestButtonProps) => {
  const [buttonState, setButtonState] = useState<ButtonState>('initial');

  // Sync button state with database state via props
  useEffect(() => {
    console.log('[FeedbackRequestButton] useEffect triggered', {
      feedbackEnabled,
      initialPending: stats.initialPending,
      reminderPending: stats.reminderPending,
      currentButtonState: buttonState
    });

    // Calculate the correct state based on database stats
    if (!feedbackEnabled) {
      setButtonState('all-complete');
    } else if (stats.initialPending > 0) {
      setButtonState('initial');
    } else if (stats.reminderPending > 0) {
      setButtonState('reminder');
    } else {
      setButtonState('all-complete');
    }
  }, [feedbackEnabled, stats.initialPending, stats.reminderPending]);

  const handleSendInitial = async () => {
    setButtonState('sending-initial');
    
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-request', {
        body: { eventId }
      });
      
      if (error) throw error;
      
      // Show success state
      setButtonState('initial-sent');
      toast.success(`Feedback requests sent to ${data.sent} attendees`);
      
      // After 2 seconds, wait extra time for database replication, then refresh metrics
      setTimeout(async () => {
        console.log('[FeedbackRequestButton] Waiting for database replication...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[FeedbackRequestButton] Refreshing metrics...');
        await onSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to send feedback requests:', error);
      setButtonState('initial');
      toast.error(error.message || 'Failed to send feedback requests');
    }
  };

  const handleSendReminder = async () => {
    setButtonState('sending-reminder');
    
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-reminder', {
        body: { eventId }
      });
      
      if (error) throw error;
      
      // Show success state
      setButtonState('reminder-sent');
      toast.success(`Reminders sent to ${data.sent} attendees`);
      
      // After 2 seconds, wait extra time for database replication, then refresh metrics
      setTimeout(async () => {
        console.log('[FeedbackRequestButton] Waiting for database replication...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[FeedbackRequestButton] Refreshing metrics...');
        await onSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to send reminders:', error);
      setButtonState('reminder');
      toast.error(error.message || 'Failed to send reminders');
    }
  };

  if (!feedbackEnabled) {
    return null;
  }

  // Initial request button
  if (buttonState === 'initial' || buttonState === 'sending-initial' || buttonState === 'initial-sent') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonState === 'initial-sent' ? 'default' : 'default'}
              size="sm"
              onClick={handleSendInitial}
              disabled={buttonState !== 'initial'}
              className={`w-full sm:w-auto min-h-[44px] ${
                buttonState === 'initial-sent' 
                  ? 'bg-green-600 hover:bg-green-600' 
                  : ''
              }`}
            >
              {buttonState === 'sending-initial' && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                  <span className="sm:hidden">Sending...</span>
                </>
              )}
              {buttonState === 'initial-sent' && (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Feedback Sent ✓</span>
                  <span className="sm:hidden">Sent ✓</span>
                </>
              )}
              {buttonState === 'initial' && (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Send Feedback ({stats.initialPending})</span>
                  <span className="sm:hidden">Send ({stats.initialPending})</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px]">
            <p className="text-sm">
              Send post-event feedback requests to all attendees who accepted this event's code of conduct ({stats.initialPending} {stats.initialPending === 1 ? 'person' : 'people'})
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Reminder button
  if (buttonState === 'reminder' || buttonState === 'sending-reminder' || buttonState === 'reminder-sent') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonState === 'reminder-sent' ? 'default' : 'default'}
              size="sm"
              onClick={handleSendReminder}
              disabled={buttonState !== 'reminder'}
              className={`w-full sm:w-auto min-h-[44px] ${
                buttonState === 'reminder-sent'
                  ? 'bg-green-600 hover:bg-green-600'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {buttonState === 'sending-reminder' && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending Reminder...</span>
                  <span className="sm:hidden">Sending...</span>
                </>
              )}
              {buttonState === 'reminder-sent' && (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Reminder Sent ✓</span>
                  <span className="sm:hidden">Sent ✓</span>
                </>
              )}
              {buttonState === 'reminder' && (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Send Reminder ({stats.reminderPending})</span>
                  <span className="sm:hidden">Remind ({stats.reminderPending})</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px]">
            <div className="space-y-1 text-sm">
              <p className="font-medium">Send reminder to:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Accepted this event's code of conduct</li>
                <li>Have not yet submitted feedback</li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                ({stats.reminderPending} {stats.reminderPending === 1 ? 'person' : 'people'} will receive this email)
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // All complete state
  return (
    <Button
      variant="outline"
      size="sm"
      disabled
      className="w-full sm:w-auto min-h-[44px] bg-muted text-muted-foreground"
    >
      <Check className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">All Sent ✓</span>
      <span className="sm:hidden">Complete ✓</span>
    </Button>
  );
};
