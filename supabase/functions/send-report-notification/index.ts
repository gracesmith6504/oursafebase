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

    console.log("Processing report notification:", {
      eventId,
      reportId,
      concernType,
      isAnonymous,
    });

    // Get event and society details
    const { data: event, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, society_id, societies!inner(name)")
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

    // Get committee members for this society
    const { data: committeeMembers, error: membersError } = await supabaseClient
      .from("society_members")
      .select("user_id, profiles(display_name)")
      .eq("society_id", event.society_id)
      .eq("role", "committee");

    if (membersError || !committeeMembers || committeeMembers.length === 0) {
      console.error("Error fetching committee members:", membersError);
      return new Response(JSON.stringify({ error: "No committee members found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${committeeMembers.length} committee members`);

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

    console.log(`Sending email to ${committeeEmails.length} unique committee members using BCC`);
    console.log(`From: ${FROM_NAME} <${FROM_EMAIL}>`);
    console.log(`BCC recipients: ${committeeEmails.length}`);

    // Filter out the FROM_EMAIL from BCC to avoid duplicate
    const safeBcc = committeeEmails.filter(e => e.toLowerCase() !== FROM_EMAIL.toLowerCase());

    // Send a single email with BCC to all committee members (avoids rate limits)
    try {
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [FROM_EMAIL], // Required by Resend; sends a copy to the sender
        bcc: safeBcc,
        subject: `New ${concernType} Report - ${event.title}`,
        html: `
          <h1>New Report Submitted</h1>
          <p>A new ${isAnonymous ? "anonymous" : ""} report has been submitted for your event.</p>
          
          <h2>Event Details:</h2>
          <ul>
            <li><strong>Event:</strong> ${event.title}</li>
            <li><strong>Society:</strong> ${societyName}</li>
            <li><strong>Report Type:</strong> ${concernType}</li>
            <li><strong>Anonymous:</strong> ${isAnonymous ? "Yes" : "No"}</li>
          </ul>
          
          <p>Please log in to your dashboard to review this report and take appropriate action.</p>
          
          <p>
            <a href="${Deno.env.get("VITE_PUBLIC_APP_URL") || "https://oursafebase.com"}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Report
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated notification from SafeBase. Please do not reply to this email.
          </p>
        `,
      });

      if (result.data) {
        console.log(`✓ Email sent successfully (ID: ${result.data.id})`);
        console.log(`Delivered to ${committeeEmails.length} committee members`);
      } else {
        console.error(`✗ Failed to send email:`, result.error);
        return new Response(JSON.stringify({ error: "Failed to send email", details: result.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      console.error(`✗ Error sending email:`, error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Email notification completed for report ${reportId}`);

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
