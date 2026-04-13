const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl) {
      return new Response(JSON.stringify({ error: "YouTube URL required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("APIFY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Apify API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get title via oEmbed
    let videoTitle = "Untitled Video";
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        videoTitle = oembedData.title || videoTitle;
      }
    } catch (_) {}

    // Call Apify YouTube Transcript actor (synchronous run)
    console.log("Calling Apify for video:", videoId);
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/canadesk~youtube-transcript/run-sync-get-dataset-items?token=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [`https://www.youtube.com/watch?v=${videoId}`],
        }),
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error("Apify error:", apifyRes.status, errText);

      // Fallback to manual paste
      return new Response(
        JSON.stringify({
          videoId,
          videoTitle,
          needsManualTranscript: true,
          message: "Could not auto-extract transcript. Please paste it manually.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = await apifyRes.json();
    console.log("Apify returned items:", items?.length);

    if (!items || items.length === 0 || !items[0].text) {
      return new Response(
        JSON.stringify({
          videoId,
          videoTitle,
          needsManualTranscript: true,
          message: "No transcript found for this video. Please paste it manually.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcript = items[0].text;

    return new Response(
      JSON.stringify({
        videoId,
        videoTitle,
        transcript,
        needsManualTranscript: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Extract transcript error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to process YouTube URL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
