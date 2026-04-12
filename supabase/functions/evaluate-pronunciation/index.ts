const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { expectedText, userTranscript, segmentIndex, totalSegments } = await req.json();
    if (!expectedText || !userTranscript) {
      return new Response(JSON.stringify({ error: "expectedText and userTranscript required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert English pronunciation and speaking coach with 20+ years of experience teaching ESL/EFL students. You have a keen ear for phonetics and understand the International Phonetic Alphabet (IPA).

A student was shadowing (reading aloud) a line from an English interview. Compare their spoken version (transcribed by AI) against the expected text.

EXPECTED TEXT (what they should have said):
"${expectedText}"

STUDENT'S ACTUAL SPEECH (transcribed):
"${userTranscript}"

SEGMENT: ${segmentIndex + 1} of ${totalSegments}

Score the student on these 6 dimensions (1-10 each):

1. **Pronunciation** (25% weight) — Did they pronounce each word correctly? Check for:
   - Vowel sounds (ship vs sheep, cat vs cut)
   - Consonant clusters (strengths, months)
   - Word stress (deSERT vs DEsert)
   - Th sounds, R/L distinction
   - Silent letters
   
2. **Fluency** (20% weight) — Was the speech smooth and natural-paced?
   - No excessive pauses or hesitations
   - Words flow together naturally
   - Appropriate speaking speed
   
3. **Intonation & Rhythm** (20% weight) — Did they use natural English pitch patterns?
   - Rising intonation for questions
   - Falling intonation for statements
   - Stress-timed rhythm (English is NOT syllable-timed)
   - Emphasis on content words, not function words
   
4. **Connected Speech** (15% weight) — Did they link words naturally?
   - Linking (an apple → "anapple")
   - Elision (next day → "nex day")
   - Assimilation (don't you → "donchu")
   - Weak forms of function words (to, for, and, the)
   
5. **Accent Clarity** (10% weight) — How intelligible is the speaker?
   - Would a native speaker understand them easily?
   - Clear articulation regardless of accent
   
6. **Confidence & Expression** (10% weight) — Did they speak with conviction?
   - Vocal projection and energy
   - Appropriate emotional tone matching the content
   - Not monotone

Return a JSON object:
{
  "scores": {
    "pronunciation": <1-10>,
    "fluency": <1-10>,
    "intonation": <1-10>,
    "connectedSpeech": <1-10>,
    "accentClarity": <1-10>,
    "confidence": <1-10>
  },
  "overallScore": <weighted average rounded to 1 decimal>,
  "feedback": "<2-3 paragraphs of detailed, encouraging feedback. Start with what they did well. Then address specific words or sounds that need work — use IPA notation where helpful. Give concrete practice tips like 'try saying X slowly, then speed up' or 'listen to how the original speaker connects these words'. End with encouragement.>",
  "wordIssues": [
    { "word": "<problem word>", "issue": "<what went wrong>", "tip": "<how to fix it>" }
  ]
}

Return ONLY JSON.`;

    const response = await fetch("https://ai.lovable.dev/chat/completions", {
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
      throw new Error(`AI error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Evaluate pronunciation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Evaluation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
