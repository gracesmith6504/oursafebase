import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Email sender configuration with fallback to verified Resend test sender
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || "SafeBase Notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportNotificationRequest {
  eventId: string;
  reportId: string;
  concernType: string;
  isAnonymous: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { eventId, reportId, concernType, isAnonymous }: ReportNotificationRequest = await req.json();

    // Get event and society details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, society_id, societies!inner(name, slug)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Error fetching event:", eventError);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const societyName = (event.societies as any)?.name || "Your society";

    // Get committee members for this society with email notifications enabled
    const { data: committeeMembers, error: membersError } = await supabaseClient
      .from("society_members")
      .select("user_id, profiles(display_name)")
      .eq("society_id", event.society_id)
      .eq("role", "committee")
      .eq("email_notifications_enabled", true);

    if (membersError || !committeeMembers || committeeMembers.length === 0) {
      console.error("Error fetching committee members:", membersError);
      return new Response(JSON.stringify({ error: "No committee members found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get emails for committee members and de-duplicate
    const committeeEmailsSet = new Set<string>();
    for (const member of committeeMembers) {
      const { data: userData } = await supabaseClient.auth.admin.getUserById(member.user_id);
      if (userData?.user?.email) {
        committeeEmailsSet.add(userData.user.email);
      }
    }

    const committeeEmails = Array.from(committeeEmailsSet);

    if (committeeEmails.length === 0) {
      console.error("No committee member emails found");
      return new Response(JSON.stringify({ error: "No committee member emails found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out the FROM_EMAIL from BCC to avoid duplicate
    const safeBcc = committeeEmails.filter(e => e.toLowerCase() !== FROM_EMAIL.toLowerCase());

    const appUrl = Deno.env.get("VITE_PUBLIC_APP_URL") || "https://oursafebase.com";
    const reportPath = `/society/${(event.societies as any)?.slug || ''}/reports?reportId=${reportId}&redirect=true`;
    const viewReportUrl = `${appUrl}/auth?redirectTo=${encodeURIComponent(reportPath)}`;
    const formattedConcernType = concernType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Send a single email with BCC to all committee members (avoids rate limits)
    try {
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [FROM_EMAIL],
        bcc: safeBcc,
        subject: `New ${formattedConcernType} Report - ${event.title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
              <table style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr><td style="padding: 32px 20px; text-align: center; background-color: #000;">
                  <h1 style="color: #fff; margin: 0; font-size: 24px;">OurSafeBase</h1>
                </td></tr>
                <tr><td style="padding: 32px 24px;">
                  <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px;">New Report Submitted</h2>
                  <p style="color: #484848; font-size: 16px; line-height: 1.6;">A new ${isAnonymous ? 'anonymous ' : ''}report has been submitted for your event and requires your attention.</p>
                  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 12px;">Event Details</h3>
                    <p style="margin: 8px 0; color: #6b7280; font-size: 14px;"><strong>Event:</strong> ${event.title}</p>
                    <p style="margin: 8px 0; color: #6b7280; font-size: 14px;"><strong>Society:</strong> ${societyName}</p>
                    <p style="margin: 8px 0; color: #6b7280; font-size: 14px;"><strong>Report Type:</strong> ${formattedConcernType}</p>
                    <p style="margin: 8px 0; color: #6b7280; font-size: 14px;"><strong>Submitted:</strong> ${isAnonymous ? 'Anonymously' : 'With contact details'}</p>
                  </div>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${viewReportUrl}" style="background-color: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Report</a>
                  </div>
                  <p style="color: #484848; font-size: 14px; line-height: 1.6;">Please log in to your dashboard to review this report and take appropriate action. Timely responses help maintain a safe environment for all members.</p>
                </td></tr>
                <tr><td style="padding: 20px; text-align: center; color: #8898aa; font-size: 12px; border-top: 1px solid #e6ebf1;">
                  This is an automated notification from OurSafeBase. Please do not reply to this email.
                </td></tr>
              </table>
            </body>
          </html>
        `,
      });

      if (result.error) {
        console.error(`Failed to send email:`, result.error);
        return new Response(JSON.stringify({ error: "Failed to send email", details: result.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      console.error(`Error sending email:`, error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: committeeEmails.length,
        emailsFailed: 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in send-report-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
