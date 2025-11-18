import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendFeedbackRequestBody {
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

    const { eventId }: SendFeedbackRequestBody = await req.json();

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    console.log(`Processing feedback request for event: ${eventId}`);

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
    // 1. Accepted CoC for this event
    // 2. Haven't been sent initial request yet
    // 3. Haven't submitted feedback yet
    const { data: attendees, error: attendeesError } = await supabaseClient
      .from("code_acceptances")
      .select("id, user_id")
      .eq("event_id", eventId)
      .is("feedback_request_sent_at", null);

    if (attendeesError) {
      throw new Error(`Failed to fetch attendees: ${attendeesError.message}`);
    }

    // Get all feedback responses for this event to filter out users who already submitted
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
    const eligibleAttendees = attendees?.filter(
      attendee => attendee.user_id && !submittedUserIds.has(attendee.user_id)
    ) || [];

    console.log(`Total code acceptances: ${attendees?.length || 0}`);
    console.log(`Already submitted feedback: ${submittedUserIds.size}`);
    console.log(`Eligible for email: ${eligibleAttendees.length}`);

    if (eligibleAttendees.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No attendees to send feedback requests to",
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
    
    // For each attendee, send feedback request email
    let sentCount = 0;
    const errors: string[] = [];

    // Get society slug for building the feedback URL
    const societySlug = (event.societies as any)?.slug;
    const appUrl = Deno.env.get("VITE_PUBLIC_APP_URL") || "https://oursafebase.com";
    const feedbackPath = `/${societySlug}/${event.slug}/feedback`;
    const feedbackUrl = `${appUrl}/auth?redirectTo=${encodeURIComponent(feedbackPath)}`;

    for (const attendee of eligibleAttendees) {
      try {
        if (!attendee.user_id) {
          console.log(`Skipping attendee ${attendee.id} - no user_id`);
          continue;
        }

        // Get user email using admin client
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(attendee.user_id);
        
        if (authError || !authUser.user?.email) {
          errors.push(`Failed to get email for user ${attendee.user_id}`);
          console.error(`Error fetching user ${attendee.user_id}:`, authError);
          continue;
        }

        const email = authUser.user.email;
        const displayName = authUser.user.user_metadata?.display_name || email.split('@')[0];

        console.log(`Sending feedback request to ${email}`);

        // Send email
        const emailResponse = await resend.emails.send({
          from: `${Deno.env.get("RESEND_FROM_NAME") || "Event Feedback"} <${Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev"}>`,
          to: [email],
          subject: `Share your feedback for ${event.title}`,
          html: `
            <h2>Hi ${displayName},</h2>
            <p>Thank you for attending <strong>${event.title}</strong>!</p>
            <p>We'd love to hear about your experience. Your feedback helps us improve future events.</p>
            <p>
              <a href="${feedbackUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Submit Feedback
              </a>
            </p>
            <p>Or copy and paste this link into your browser:<br>
            <a href="${feedbackUrl}">${feedbackUrl}</a></p>
            <p>Thank you for helping us create better events!</p>
          `,
        });

        if (emailResponse.error) {
          errors.push(`Failed to send email to ${email}: ${emailResponse.error}`);
          console.error(`Email error for ${email}:`, emailResponse.error);
        } else {
          // Mark feedback request as sent
          await supabaseClient
            .from("code_acceptances")
            .update({ feedback_request_sent_at: new Date().toISOString() })
            .eq("id", attendee.id);
          
          sentCount++;
          console.log(`Email sent successfully to ${email}`);
        }
      } catch (error: any) {
        errors.push(`Error processing attendee ${attendee.id}: ${error.message}`);
        console.error(`Error processing attendee ${attendee.id}:`, error);
      }
    }

    console.log(`Feedback requests sent: ${sentCount}/${attendees.length}`);

    return new Response(
      JSON.stringify({
        message: `Feedback requests sent to ${sentCount} attendees`,
        sent: sentCount,
        total: attendees.length,
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
  } catch (error: unknown) {
    console.error("Error in send-feedback-request function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
