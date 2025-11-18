import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendFeedbackReminderBody {
  eventId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { eventId }: SendFeedbackReminderBody = await req.json();

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    console.log(`Processing feedback reminder for event: ${eventId}`);

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select(`
        id,
        title,
        slug,
        society_id,
        societies (
          slug
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error(`Failed to fetch event: ${eventError?.message}`);
    }

    // Check if feedback is configured for this event
    const { data: feedbackConfig, error: configError } = await supabaseClient
      .from("event_feedback_config")
      .select("*")
      .eq("event_id", eventId)
      .single();

    if (configError || !feedbackConfig || !feedbackConfig.enabled) {
      throw new Error("Feedback is not enabled for this event");
    }

    // Fetch attendees who:
    // 1. Accepted CoC
    // 2. Have been sent initial request
    // 3. Haven't been sent reminder yet
    // 4. Haven't submitted feedback
    const { data: attendees, error: attendeesError } = await supabaseClient
      .from("code_acceptances")
      .select(`
        id, 
        user_id,
        feedback_responses!left (
          user_id
        )
      `)
      .eq("event_id", eventId)
      .not("feedback_request_sent_at", "is", null)
      .is("feedback_reminder_sent_at", null);

    if (attendeesError) {
      throw new Error(`Failed to fetch attendees: ${attendeesError.message}`);
    }

    // Filter out attendees who have already submitted feedback
    const eligibleAttendees = attendees?.filter(attendee => {
      const responses = attendee.feedback_responses as any[];
      // Check if user has any feedback responses for this event
      return !responses || responses.length === 0 || !responses.some(r => r.user_id === attendee.user_id);
    }) || [];

    if (eligibleAttendees.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No attendees eligible for feedback reminders",
          sent: 0 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Found ${eligibleAttendees.length} attendees to send reminder to`);

    // Create admin client to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // For each attendee, send reminder email
    let sentCount = 0;
    const errors: string[] = [];

    // Get society slug for building the feedback URL
    const societySlug = (event.societies as any)?.slug;
    const appUrl = Deno.env.get("VITE_PUBLIC_APP_URL") || "https://oursafebase.com";
    const feedbackPath = `/${societySlug}/${event.slug}/feedback`;
    const feedbackUrl = `${appUrl}/auth?redirectTo=${encodeURIComponent(feedbackPath)}`;

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "SafeBase <noreply@oursafebase.com>";
    const fromName = Deno.env.get("RESEND_FROM_NAME") || "SafeBase";

    for (const attendee of eligibleAttendees) {
      try {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(attendee.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Failed to get email for user ${attendee.user_id}:`, userError);
          errors.push(`User ${attendee.user_id}: ${userError?.message || 'No email found'}`);
          continue;
        }

        const userEmail = userData.user.email;

        // Send reminder email
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: `Reminder: Share Your Feedback for ${event.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Reminder: We'd Love Your Feedback!</h2>
              
              <p>Hi there,</p>
              
              <p>This is a friendly reminder that we're still waiting to hear from you about your experience at <strong>${event.title}</strong>.</p>
              
              <p>Your feedback is incredibly valuable to us and helps improve future events for everyone. It will only take a few minutes to complete.</p>
              
              <div style="margin: 30px 0;">
                <a href="${feedbackUrl}" 
                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Submit Your Feedback Now
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If you've already submitted your feedback, please disregard this reminder.
              </p>
              
              <p>Thank you for your time!</p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This is an automated reminder from ${fromName}. If you have any questions, please contact your society organizers.
              </p>
            </div>
          `,
        });

        if (emailResult.error) {
          console.error(`Failed to send email to ${userEmail}:`, emailResult.error);
          errors.push(`${userEmail}: ${emailResult.error.message}`);
          continue;
        }

        // Update code_acceptance to mark reminder as sent
        const { error: updateError } = await supabaseClient
          .from("code_acceptances")
          .update({ feedback_reminder_sent_at: new Date().toISOString() })
          .eq("id", attendee.id);

        if (updateError) {
          console.error(`Failed to update reminder timestamp for attendee ${attendee.id}:`, updateError);
          errors.push(`Update failed for ${userEmail}: ${updateError.message}`);
        } else {
          sentCount++;
          console.log(`Reminder sent successfully to ${userEmail}`);
        }
      } catch (error: any) {
        console.error(`Error processing attendee ${attendee.id}:`, error);
        errors.push(`Attendee ${attendee.id}: ${error.message || 'Unknown error'}`);
      }
    }

    console.log(`Reminder process completed. Sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: `Feedback reminders sent successfully`,
        sent: sentCount,
        total: eligibleAttendees.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-feedback-reminder function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
