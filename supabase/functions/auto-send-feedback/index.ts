import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Running auto-send-feedback cron job");

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    console.log("Looking for events that ended around:", twentyFourHoursAgo.toISOString());

    // Find events that ended approximately 24 hours ago (within 1 hour window)
    const oneHourBefore = new Date(twentyFourHoursAgo);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    const oneHourAfter = new Date(twentyFourHoursAgo);
    oneHourAfter.setHours(oneHourAfter.getHours() + 1);

    // Fetch events that meet criteria
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select(`
        id,
        title,
        slug,
        event_end_date,
        society_id,
        societies (
          slug
        ),
        event_feedback_config (
          enabled,
          auto_send_enabled
        )
      `)
      .gte("event_end_date", oneHourBefore.toISOString())
      .lte("event_end_date", oneHourAfter.toISOString());

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    if (!events || events.length === 0) {
      console.log("No events found that ended 24 hours ago");
      return new Response(
        JSON.stringify({ message: "No events to process", processed: 0 }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Found ${events.length} events that ended 24 hours ago`);

    let processedCount = 0;
    const results: any[] = [];

    for (const event of events) {
      try {
        const config = (event.event_feedback_config as any)?.[0];
        
        if (!config || !config.enabled || !config.auto_send_enabled) {
          console.log(`Skipping event ${event.id}: feedback not enabled or auto-send disabled`);
          results.push({
            eventId: event.id,
            title: event.title,
            status: "skipped",
            reason: "Feedback or auto-send not enabled"
          });
          continue;
        }

        // Check if any attendees still need to be sent feedback requests
        const { data: pendingAttendees, error: attendeesError } = await supabaseAdmin
          .from("code_acceptances")
          .select("id")
          .eq("event_id", event.id)
          .is("feedback_request_sent_at", null);

        if (attendeesError) {
          console.error(`Failed to check attendees for event ${event.id}:`, attendeesError);
          results.push({
            eventId: event.id,
            title: event.title,
            status: "error",
            error: attendeesError.message
          });
          continue;
        }

        if (!pendingAttendees || pendingAttendees.length === 0) {
          console.log(`No pending attendees for event ${event.id}`);
          results.push({
            eventId: event.id,
            title: event.title,
            status: "skipped",
            reason: "No pending attendees"
          });
          continue;
        }

        console.log(`Triggering send-feedback-request for event ${event.id}`);

        // Call the send-feedback-request function
        const { data: sendResult, error: sendError } = await supabaseAdmin.functions.invoke(
          "send-feedback-request",
          {
            body: { eventId: event.id }
          }
        );

        if (sendError) {
          console.error(`Failed to send feedback for event ${event.id}:`, sendError);
          results.push({
            eventId: event.id,
            title: event.title,
            status: "error",
            error: sendError.message
          });
        } else {
          console.log(`Successfully sent feedback for event ${event.id}:`, sendResult);
          processedCount++;
          results.push({
            eventId: event.id,
            title: event.title,
            status: "success",
            result: sendResult
          });
        }
      } catch (error: unknown) {
        console.error(`Error processing event ${event.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          eventId: event.id,
          title: event.title,
          status: "error",
          error: errorMessage
        });
      }
    }

    console.log(`Auto-send completed: processed ${processedCount}/${events.length} events`);

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} events`,
        processed: processedCount,
        total: events.length,
        results
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
    console.error("Error in auto-send-feedback function:", error);
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
