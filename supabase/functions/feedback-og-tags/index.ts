import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Expected: /feedback-og-tags/{societySlug}/{eventSlug}
    if (pathParts.length < 3) {
      return new Response("Invalid path", { status: 400 });
    }

    const societySlug = pathParts[1];
    const eventSlug = pathParts[2];

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch society data
    const { data: societyData, error: societyError } = await supabaseClient
      .from("societies")
      .select("id, name, logo_url")
      .eq("slug", societySlug)
      .single();

    if (societyError || !societyData) {
      return new Response("Society not found", { status: 404 });
    }

    // Fetch event data
    const { data: eventData, error: eventError } = await supabaseClient
      .from("events")
      .select("id, title, description, society_id")
      .eq("slug", eventSlug)
      .eq("society_id", societyData.id)
      .single();

    if (eventError || !eventData) {
      return new Response("Event not found", { status: 404 });
    }

    const pageUrl = `https://oursafebase.com/${societySlug}/${eventSlug}/feedback`;
    const pageTitle = `Share Your Feedback - ${eventData.title}`;
    const pageDescription = `We value your feedback for ${eventData.title} hosted by ${societyData.name}. Help us improve future events by sharing your experience.`;
    const pageImage = societyData.logo_url || "https://oursafebase.com/favicon.png";

    // Check if request is from a bot/crawler
    const userAgent = req.headers.get("user-agent") || "";
    const isBot = /bot|crawler|spider|WhatsApp|facebook|twitter|linkedin|telegram/i.test(userAgent);

    if (isBot) {
      // Serve HTML with OG tags for bots
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDescription}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <meta property="og:image" content="${pageImage}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="${societyData.name} logo">
  <meta property="og:site_name" content="OurSafeBase">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDescription}">
  <meta name="twitter:image" content="${pageImage}">
  <meta name="twitter:image:alt" content="${societyData.name} logo">
  
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <h1>${pageTitle}</h1>
  <p>Redirecting to feedback form...</p>
  <a href="${pageUrl}">Click here if you are not redirected</a>
</body>
</html>`;

      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    } else {
      // Redirect regular users to the app
      return Response.redirect(pageUrl, 302);
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
