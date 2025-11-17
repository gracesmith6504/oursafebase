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

    // Fetch all attendees who accepted CoC and haven't been sent feedback request
    const { data: attendees, error: attendeesError } = await supabaseClient
      .from("code_acceptances")
      .select(`
        id,
        user_id,
        profiles (
          display_name
        )
      `)
      .eq("event_id", eventId)
      .is("feedback_request_sent_at", null);

    if (attendeesError) {
      throw new Error(`Failed to fetch attendees: ${attendeesError.message}`);
    }

    if (!attendees || attendees.length === 0) {
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

    console.log(`Found ${attendees.length} attendees to send feedback requests to`);

    // Get user emails from auth.users
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // For each attendee, send feedback request email
    let sentCount = 0;
    const errors: string[] = [];

    // Get society slug for building the feedback URL
    const societySlug = (event.societies as any)?.slug;
    const feedbackUrl = `${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")?.replace("https://kusgjgstdabonfntxwsq.supabase.co", "https://lovable.app")}/society/${societySlug}/events/${event.slug}/feedback`;

    for (const attendee of attendees) {
      try {
        // Get user email from their user_id
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("id", attendee.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`Failed to get profile for user ${attendee.user_id}`);
          errors.push(`Failed to get profile for user ${attendee.user_id}`);
          continue;
        }

        // For now, we'll use a service role key to get the email
        // Create admin client
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(attendee.user_id);

        if (userError || !userData?.user?.email) {
          console.error(`Failed to get email for user ${attendee.user_id}`);
          errors.push(`Failed to get email for user ${attendee.user_id}`);
          continue;
        }

        const email = userData.user.email;
        const displayName = (attendee.profiles as any)?.display_name || "there";

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: `${Deno.env.get("RESEND_FROM_NAME")} <${Deno.env.get("RESEND_FROM_EMAIL")}>`,
          to: [email],
          subject: `We'd love your feedback on ${event.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">We'd Love Your Feedback!</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    Thank you for attending <strong>${event.title}</strong>! We hope you had a great experience.
                  </p>
                  
                  <p style="font-size: 16px; margin-bottom: 30px;">
                    Your feedback is incredibly valuable to us and helps us improve future events. 
                    Would you mind taking a few moments to share your thoughts?
                  </p>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${feedbackUrl}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 16px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: 600; 
                              font-size: 16px;
                              display: inline-block;
                              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      Give Feedback
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    This should only take a couple of minutes. Thank you for helping us create better events!
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${feedbackUrl}" style="color: #667eea; word-break: break-all;">${feedbackUrl}</a>
                  </p>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`Email sent to ${email}:`, emailResponse);

        // Mark as sent
        const { error: updateError } = await supabaseClient
          .from("code_acceptances")
          .update({ feedback_request_sent_at: new Date().toISOString() })
          .eq("id", attendee.id);

        if (updateError) {
          console.error(`Failed to update feedback_request_sent_at for ${attendee.id}:`, updateError);
          errors.push(`Failed to update status for attendee ${attendee.id}`);
        } else {
          sentCount++;
        }
      } catch (error: unknown) {
        console.error(`Error sending to attendee ${attendee.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Error sending to attendee ${attendee.id}: ${errorMessage}`);
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
