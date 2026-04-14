const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, videoTitle } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: "Transcript required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `You are an expert dialogue analyst. Given this transcript from a YouTube interview/conversation titled "${videoTitle || "Interview"}", split it into a structured dialogue between speakers.

RULES:
1. Identify the speakers (usually 2: Interviewer and Interviewee, or Host and Guest). Use descriptive role names like "Interviewer", "Guest", "Host", etc.
2. Split the transcript into individual dialogue turns/segments.
3. Each segment should be 1-3 sentences — a natural speaking turn.
4. Clean up any transcription artifacts (repeated words, filler sounds unless they're natural).
5. Make sure the dialogue flows naturally.

TRANSCRIPT:
${transcript.substring(0, 15000)}

Return a JSON object with this exact structure:
{
  "roles": [
    { "name": "Interviewer", "lineCount": 12, "wordCount": 450 },
    { "name": "Guest", "lineCount": 10, "wordCount": 620 }
  ],
  "dialogue": [
    { "role": "Interviewer", "text": "Welcome to the show. Tell us about yourself.", "index": 0 },
    { "role": "Guest", "text": "Thank you for having me. I'm a software engineer...", "index": 1 }
  ]
}

Return ONLY the JSON, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Split dialogue error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed to split dialogue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
