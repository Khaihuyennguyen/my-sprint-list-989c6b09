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

    // Use YouTube's InnerTube API to get video info and captions
    const playerResponse = await fetchPlayerResponse(videoId);
    
    const videoTitle = playerResponse?.videoDetails?.title || "Untitled Video";
    
    // Get caption tracks
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No captions found for this video. Try a video with English subtitles/CC enabled." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer English captions
    const enTrack = captionTracks.find((t: any) => 
      t.languageCode === "en" || t.languageCode?.startsWith("en")
    ) || captionTracks[0];

    console.log(`Using caption track: ${enTrack.name?.simpleText || enTrack.languageCode}`);

    const transcript = await fetchCaptionText(enTrack.baseUrl);

    if (!transcript || transcript.length < 10) {
      return new Response(
        JSON.stringify({ error: "Captions were empty. Try a different video." }),
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

async function fetchPlayerResponse(videoId: string): Promise<any> {
  // Use YouTube's InnerTube API (public, no key needed)
  const response = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "en",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`YouTube API returned ${response.status}`);
  }

  return await response.json();
}

async function fetchCaptionText(baseUrl: string): Promise<string> {
  // Ensure we get XML format
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=srv3`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch captions: ${res.status}`);
  }
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
