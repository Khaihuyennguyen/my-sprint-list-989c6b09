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

    // Try multiple methods to get captions
    let videoTitle = "Untitled Video";
    let captionBaseUrl: string | null = null;

    // Method 1: InnerTube API with WEB client
    try {
      const playerData = await fetchInnerTube(videoId, "WEB", "2.20240101.00.00");
      videoTitle = playerData?.videoDetails?.title || videoTitle;
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
        captionBaseUrl = enTrack.baseUrl;
        console.log("Method 1 (WEB) succeeded");
      } else {
        console.log("Method 1 (WEB): no caption tracks found");
      }
    } catch (e) {
      console.log("Method 1 (WEB) failed:", e);
    }

    // Method 2: InnerTube with ANDROID client (often has more captions available)
    if (!captionBaseUrl) {
      try {
        const playerData = await fetchInnerTube(videoId, "ANDROID", "19.09.37");
        videoTitle = playerData?.videoDetails?.title || videoTitle;
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks && tracks.length > 0) {
          const enTrack = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en")) || tracks[0];
          captionBaseUrl = enTrack.baseUrl;
          console.log("Method 2 (ANDROID) succeeded");
        } else {
          console.log("Method 2 (ANDROID): no caption tracks found");
        }
      } catch (e) {
        console.log("Method 2 (ANDROID) failed:", e);
      }
    }

    // Method 3: Try direct timedtext API
    if (!captionBaseUrl) {
      try {
        const directUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`;
        const directRes = await fetch(directUrl);
        if (directRes.ok) {
          const directXml = await directRes.text();
          if (directXml.includes("<text")) {
            console.log("Method 3 (direct timedtext) succeeded");
            const transcript = parseXmlCaptions(directXml);
            if (transcript.length > 10) {
              // Try to get title from oEmbed
              videoTitle = await fetchTitleOembed(videoId) || videoTitle;
              return new Response(
                JSON.stringify({ videoId, videoTitle, transcript }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
        console.log("Method 3 (direct timedtext): no content");
      } catch (e) {
        console.log("Method 3 failed:", e);
      }
    }

    // Method 4: Try auto-generated captions via timedtext
    if (!captionBaseUrl) {
      try {
        const autoUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`;
        const autoRes = await fetch(autoUrl);
        if (autoRes.ok) {
          const autoXml = await autoRes.text();
          if (autoXml.includes("<text")) {
            console.log("Method 4 (auto-generated timedtext) succeeded");
            const transcript = parseXmlCaptions(autoXml);
            if (transcript.length > 10) {
              videoTitle = await fetchTitleOembed(videoId) || videoTitle;
              return new Response(
                JSON.stringify({ videoId, videoTitle, transcript }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
        console.log("Method 4 (auto timedtext): no content");
      } catch (e) {
        console.log("Method 4 failed:", e);
      }
    }

    if (!captionBaseUrl) {
      return new Response(
        JSON.stringify({ error: "No captions found for this video. Try a video with English subtitles/CC enabled." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcript = await fetchCaptionText(captionBaseUrl);
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

async function fetchInnerTube(videoId: string, clientName: string, clientVersion: string): Promise<any> {
  const body: any = {
    videoId,
    context: {
      client: {
        clientName,
        clientVersion,
        hl: "en",
        gl: "US",
      },
    },
  };

  // Android client needs additional fields
  if (clientName === "ANDROID") {
    body.context.client.androidSdkVersion = 30;
    body.context.client.platform = "MOBILE";
  }

  const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": clientName === "ANDROID"
        ? "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`InnerTube ${clientName} returned ${response.status}`);
  }

  return await response.json();
}

async function fetchTitleOembed(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return data.title || null;
    }
  } catch (_) {}
  return null;
}

async function fetchCaptionText(baseUrl: string): Promise<string> {
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=srv3`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch captions: ${res.status}`);
  }
  return parseXmlCaptions(await res.text());
}

function parseXmlCaptions(xml: string): string {
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
