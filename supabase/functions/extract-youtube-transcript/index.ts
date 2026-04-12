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

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch video info page to get title
    const videoTitle = await fetchVideoTitle(videoId);

    // Fetch auto-generated captions
    const transcript = await fetchCaptions(videoId);

    if (!transcript || transcript.length === 0) {
      return new Response(
        JSON.stringify({ error: "No captions found for this video. Try a video with English subtitles." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ videoId, videoTitle, transcript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Extract transcript error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to extract transcript" }),
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

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await res.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      return titleMatch[1].replace(" - YouTube", "").trim();
    }
  } catch (e) {
    console.error("Could not fetch title:", e);
  }
  return "Untitled Video";
}

async function fetchCaptions(videoId: string): Promise<string> {
  // Get the video page to find caption tracks
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
  const pageHtml = await pageRes.text();

  // Extract captions player response
  const captionMatch = pageHtml.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
  if (!captionMatch) {
    // Try alternative pattern
    const altMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/s);
    if (!altMatch) {
      throw new Error("No captions available for this video");
    }
    const tracks = JSON.parse(altMatch[1]);
    if (tracks.length === 0) throw new Error("No caption tracks found");

    // Prefer English
    const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
    return await fetchCaptionText(enTrack.baseUrl);
  }

  // Parse caption data
  const captionData = JSON.parse(captionMatch[1]);
  const tracks = captionData?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error("No caption tracks found");
  }

  // Prefer English
  const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
  return await fetchCaptionText(enTrack.baseUrl);
}

async function fetchCaptionText(baseUrl: string): Promise<string> {
  const res = await fetch(baseUrl);
  const xml = await res.text();

  // Parse XML captions into plain text
  const textParts: string[] = [];
  const regex = /<text[^>]*>(.*?)<\/text>/gs;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (text) textParts.push(text);
  }

  return textParts.join(" ");
}
