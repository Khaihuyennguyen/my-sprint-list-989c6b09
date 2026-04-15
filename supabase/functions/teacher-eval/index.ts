const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const {
      expectedText,
      recognizedText,
      azureScores,
      problemWords,
      attemptNumber,
      previousFeedback,
      conversationHistory,
    } = await req.json();

    if (!expectedText || !recognizedText) {
      return new Response(
        JSON.stringify({ error: "expectedText and recognizedText required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isRetry = attemptNumber > 1;
    const overallScore = azureScores?.pronScore || 0;
    const passed = overallScore >= 70;

    const prompt = `You are a warm, encouraging English pronunciation teacher with expertise in phonetics and IPA. You're having a real-time conversation with a student who is practicing speaking English.

CONTEXT:
- Expected text: "${expectedText}"
- Student said: "${recognizedText}"
- Attempt #${attemptNumber || 1}
- Azure Pronunciation Scores (0-100):
  - Overall: ${azureScores?.pronScore || "N/A"}
  - Accuracy: ${azureScores?.accuracyScore || "N/A"}
  - Fluency: ${azureScores?.fluencyScore || "N/A"}
  - Completeness: ${azureScores?.completenessScore || "N/A"}
  - Prosody: ${azureScores?.prosodyScore || "N/A"}

${problemWords?.length > 0 ? `PROBLEM WORDS (from Azure audio analysis):
${problemWords.map((w: any) => `- "${w.word}" (accuracy: ${w.accuracyScore}, error: ${w.errorType})`).join("\n")}` : "No specific word issues detected."}

${previousFeedback ? `PREVIOUS FEEDBACK YOU GAVE: "${previousFeedback}"` : ""}

${isRetry ? "The student is RETRYING after your previous feedback. Focus on whether they improved on the specific issues you mentioned." : ""}

INSTRUCTIONS:
1. ${passed ? "Congratulate them warmly! They did well." : "Be encouraging but point out specific issues."}
2. For problem words, explain HOW to move mouth/tongue to make the correct sound.
3. ${!passed ? 'Say "Let\'s try that again!" at the end to encourage a retry.' : 'Say "Great job! Let\'s move to the next one."'}
4. Keep it conversational — like a real teacher talking to a student. 2-3 sentences max.
5. Use simple language. No IPA symbols in speech (the student will hear this via TTS).

Return JSON:
{
  "feedback": "<your spoken feedback to the student>",
  "shouldRetry": ${!passed ? "true" : "false"},
  "encouragement": "<one short phrase like 'Almost there!' or 'Perfect!'>",
  "focusWords": [<list of words they should focus on in retry>]
}

Return ONLY JSON.`;

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
      throw new Error(`AI error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({
        ...parsed,
        azureScores,
        overallScore,
        passed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Teacher eval error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Evaluation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
