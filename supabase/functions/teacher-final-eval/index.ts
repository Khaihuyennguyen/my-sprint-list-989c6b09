const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { conversation } = await req.json();
    if (!conversation || !Array.isArray(conversation)) {
      return new Response(JSON.stringify({ error: "conversation array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // conversation: [{ expectedText, recognizedText, azureScores, problemWords, attempts }]
    const validUtterances = conversation.filter((c: any) => {
      const recognized = (c.recognizedText ?? "").trim();
      const pron = Number(c.azureScores?.pronScore ?? 0);
      return recognized && recognized !== "." && pron > 0;
    });

    const allFailedCapture = conversation.length > 0 && validUtterances.length === 0;

    const summary = conversation
      .map((c: any, i: number) => `Sentence ${i + 1}:
- Expected: "${c.expectedText}"
- Best attempt said: "${c.recognizedText}"
- Pronunciation: ${c.azureScores?.pronScore ?? "N/A"} | Accuracy: ${c.azureScores?.accuracyScore ?? "N/A"} | Fluency: ${c.azureScores?.fluencyScore ?? "N/A"} | Prosody: ${c.azureScores?.prosodyScore ?? "N/A"}
- Attempts needed: ${c.attempts ?? 1}
- Problem words: ${(c.problemWords || []).map((w: any) => `${w.word}(${w.accuracyScore})`).join(", ") || "none"}`)
      .join("\n\n");

    // Aggregate problem words across all sentences
    const wordMap = new Map<string, { count: number; avgScore: number; total: number }>();
    for (const c of conversation) {
      for (const w of c.problemWords || []) {
        const key = w.word.toLowerCase();
        const ex = wordMap.get(key);
        if (ex) {
          ex.count++;
          ex.total += w.accuracyScore;
          ex.avgScore = ex.total / ex.count;
        } else {
          wordMap.set(key, { count: 1, avgScore: w.accuracyScore, total: w.accuracyScore });
        }
      }
    }
    const topProblemWords = Array.from(wordMap.entries())
      .sort((a, b) => a[1].avgScore - b[1].avgScore)
      .slice(0, 8)
      .map(([word, stats]) => ({ word, accuracy: Math.round(stats.avgScore), occurrences: stats.count }));

    if (allFailedCapture) {
      return new Response(
        JSON.stringify({
          overallSummary:
            "It appears no audio was captured during this practice session, so I couldn't evaluate your pronunciation. This is likely a microphone or recording issue rather than a speaking assessment.",
          strengths: ["You completed the practice flow", "The lesson structure is ready for another attempt"],
          weaknesses: ["No usable speech audio was detected", "Pronunciation scores could not be calculated"],
          studyPlan: {
            wordDrills: [],
            sentenceDrills: [],
            dailyRoutine:
              "Before retrying, check that your microphone is connected, browser mic permission is allowed, and another app is not using the mic. Then run the lesson again and speak clearly after tapping the mic.",
          },
          topProblemWords: [],
          captureFailed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are an expert English pronunciation coach reviewing a complete practice session.

FULL SESSION DATA:
${summary}

AGGREGATED PROBLEM WORDS:
${topProblemWords.map(w => `- "${w.word}" (avg accuracy: ${w.accuracy}%, appeared ${w.occurrences}x)`).join("\n")}

Provide a holistic review and personalized study plan. Return JSON:
{
  "overallSummary": "<2-3 sentences on student's overall performance, strengths, weaknesses>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "studyPlan": {
    "wordDrills": [
      { "word": "<word>", "phoneticTip": "<how to physically make the sound>", "exampleSentence": "<short sentence using the word>" }
    ],
    "sentenceDrills": [
      { "sentence": "<full sentence to practice>", "focus": "<what to focus on>" }
    ],
    "dailyRoutine": "<one paragraph: 5-min daily routine to fix these issues>"
  }
}

Pick 3-5 word drills from the problem words list (most impactful first). Pick 2-3 sentence drills from the worst-scoring sentences. Be specific and actionable. Return ONLY JSON.`;

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
      JSON.stringify({ ...parsed, topProblemWords }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Final eval error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Final evaluation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
