import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    console.log("Processing report notification:", { eventId, reportId, concernType });

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

    // Get emails for committee members
    const committeeEmails: string[] = [];
    for (const member of committeeMembers) {
      const { data: userData } = await supabaseClient.auth.admin.getUserById(member.user_id);
      if (userData?.user?.email) {
        committeeEmails.push(userData.user.email);
      }
    }

    if (committeeEmails.length === 0) {
      console.error("No committee member emails found");
      return new Response(JSON.stringify({ error: "No committee member emails found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending emails to ${committeeEmails.length} committee members`);

    // Send email to all committee members
    const emailPromises = committeeEmails.map((email) =>
      resend.emails.send({
        from: "SafeBase Notifications <info@notifications.oursafebase.com>",
        to: [email],
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
      }),
    );

    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Email results: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successCount,
        emailsFailed: failureCount,
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
