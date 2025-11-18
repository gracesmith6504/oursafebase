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
  reminderMode?: boolean;
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

    const { eventId, reminderMode = false }: SendFeedbackRequestBody = await req.json();

    if (!eventId) {
      throw new Error("Event ID is required");
    }

    console.log(`Processing ${reminderMode ? 'reminder' : 'initial'} feedback request for event: ${eventId}`);

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

    // Fetch attendees based on mode
    let query = supabaseClient
      .from("code_acceptances")
      .select("id, user_id")
      .eq("event_id", eventId);
    
    if (reminderMode) {
      // For reminders: get attendees who received the request but haven't submitted feedback
      // First, get all user IDs who have submitted feedback for this event
      const { data: respondents } = await supabaseClient
        .from("feedback_responses")
        .select("user_id")
        .eq("event_id", eventId);
      
      const respondentIds = respondents?.map(r => r.user_id).filter(Boolean) || [];
      
      // Get attendees who have been sent the request but haven't responded
      query = query
        .not("feedback_request_sent_at", "is", null);
      
      if (respondentIds.length > 0) {
        query = query.not("user_id", "in", `(${respondentIds.join(',')})`);
      }
    } else {
      // For initial send: get attendees who haven't been sent feedback request
      query = query.is("feedback_request_sent_at", null);
    }
    
    const { data: attendees, error: attendeesError } = await query;

    if (attendeesError) {
      throw new Error(`Failed to fetch attendees: ${attendeesError.message}`);
    }

    if (!attendees || attendees.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: reminderMode 
            ? "No attendees to send reminders to - everyone has responded!" 
            : "No attendees to send feedback requests to",
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

    console.log(`Found ${attendees.length} attendees to send ${reminderMode ? 'reminders' : 'feedback requests'} to`);

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

    for (const attendee of attendees) {
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
          subject: reminderMode 
            ? `Reminder: Share your feedback for ${event.title}`
            : `Share your feedback for ${event.title}`,
          html: reminderMode 
            ? `
              <h2>Hi ${displayName},</h2>
              <p>This is a friendly reminder to share your feedback about <strong>${event.title}</strong>.</p>
              <p>We haven't heard from you yet and would really appreciate your thoughts. Your feedback helps us create better events for everyone.</p>
              <p>
                <a href="${feedbackUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Submit Feedback
                </a>
              </p>
              <p>Or copy and paste this link into your browser:<br>
              <a href="${feedbackUrl}">${feedbackUrl}</a></p>
              <p>Thank you for your time!</p>
            `
            : `
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
          // Mark feedback request as sent (update timestamp for initial sends)
          if (!reminderMode) {
            await supabaseClient
              .from("code_acceptances")
              .update({ feedback_request_sent_at: new Date().toISOString() })
              .eq("id", attendee.id);
          }
          
          sentCount++;
          console.log(`${reminderMode ? 'Reminder' : 'Email'} sent successfully to ${email}`);
        }
      } catch (error: any) {
        errors.push(`Error processing attendee ${attendee.id}: ${error.message}`);
        console.error(`Error processing attendee ${attendee.id}:`, error);
      }
    }

    console.log(`${reminderMode ? 'Reminders' : 'Feedback requests'} sent: ${sentCount}/${attendees.length}`);

    return new Response(
      JSON.stringify({
        message: reminderMode 
          ? `Reminders sent to ${sentCount} attendees who haven't responded`
          : `Feedback requests sent to ${sentCount} attendees`,
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
