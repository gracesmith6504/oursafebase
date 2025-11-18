import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const { data: codeAcceptances, error: attendeesError } = await supabaseClient
      .from("code_acceptances")
      .select("id, user_id")
      .eq("event_id", eventId)
      .not("feedback_request_sent_at", "is", null)
      .is("feedback_reminder_sent_at", null);

    if (attendeesError) {
      throw new Error(`Failed to fetch attendees: ${attendeesError.message}`);
    }

    // Fetch all feedback responses for this specific event
    const { data: feedbackResponses, error: responsesError } = await supabaseClient
      .from("feedback_responses")
      .select("user_id")
      .eq("event_id", eventId);

    if (responsesError) {
      throw new Error(`Failed to fetch feedback responses: ${responsesError.message}`);
    }

    // Create a Set of user IDs who have submitted feedback
    const submittedUserIds = new Set(
      feedbackResponses?.map(r => r.user_id).filter(Boolean) || []
    );

    // Filter out users who have already submitted feedback
    const eligibleAttendees = codeAcceptances?.filter(
      attendee => attendee.user_id && !submittedUserIds.has(attendee.user_id)
    ) || [];

    console.log(`Total code acceptances with initial request: ${codeAcceptances?.length || 0}`);
    console.log(`Already submitted feedback: ${submittedUserIds.size}`);
    console.log(`Eligible for reminder: ${eligibleAttendees.length}`);

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
        // CRITICAL: Update database FIRST to claim this attendee (prevents duplicates)
        // Use admin client to bypass RLS policies
        const { error: updateError } = await supabaseAdmin
          .from("code_acceptances")
          .update({ feedback_reminder_sent_at: new Date().toISOString() })
          .eq("id", attendee.id)
          .is("feedback_reminder_sent_at", null); // Only update if still null

        if (updateError) {
          console.error(`Failed to claim attendee ${attendee.id}:`, updateError);
          errors.push(`Failed to claim attendee ${attendee.id}: ${updateError.message}`);
          continue; // Skip this attendee if we couldn't claim them
        }

        console.log(`✓ Successfully marked attendee ${attendee.id} as reminder sent`);

        // Get user email from auth.users
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(attendee.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Failed to get email for user ${attendee.user_id}:`, userError);
          errors.push(`User ${attendee.user_id}: ${userError?.message || 'No email found'}`);
          // Rollback the update since we can't send email - use admin client
          await supabaseAdmin
            .from("code_acceptances")
            .update({ feedback_reminder_sent_at: null })
            .eq("id", attendee.id);
          continue;
        }

        const userEmail = userData.user.email;
        
        // Extract first name from user metadata or email
        const userMetadata = userData.user.user_metadata || {};
        const displayName = userMetadata.display_name || userMetadata.full_name || userEmail.split('@')[0];
        const displayFirstName = displayName.split(' ')[0];

        // Send reminder email
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: `Feedback for ${event.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hi ${displayFirstName},</h2>
              <p>Thanks again for coming to <strong>${event.title}</strong>!</p>
              <p>We wanted to check in because you experienced the event firsthand, and hearing from people who were actually there really helps us improve things going forward.</p>
              <p>If you have a moment, we'd love to hear how it went for you.</p>
              
              <p>
                <a href="${feedbackUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Share Your Feedback
                </a>
              </p>
              <p>Thanks for being part of it, we really appreciate it.</p>
            </div>
          `,
        });

        if (emailResult.error) {
          console.error(`Failed to send email to ${userEmail}:`, emailResult.error);
          errors.push(`${userEmail}: ${emailResult.error.message}`);
          // Rollback the update since email failed - use admin client
          await supabaseAdmin
            .from("code_acceptances")
            .update({ feedback_reminder_sent_at: null })
            .eq("id", attendee.id);
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
