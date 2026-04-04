const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, language, problem_description, solution, test_results } = await req.json();

    if (!code || !problem_description) {
      return new Response(
        JSON.stringify({ error: "code and problem_description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const solutionSection = solution
      ? `\n\nReference solution:\n\`\`\`${language}\n${solution}\n\`\`\`\n\nCompare the user's approach with the reference solution.`
      : "";

    const testResultSection = test_results
      ? `\n\nTest results: ${JSON.stringify(test_results)}`
      : "";

    const systemPrompt = `You are an expert ${language} code reviewer and mentor. Analyze the user's code submission for a coding problem.

Return ONLY valid JSON with this exact structure:
{
  "scores": {
    "correctness": <number 1-10>,
    "style": <number 1-10>,
    "efficiency": <number 1-10>
  },
  "feedbackText": "<3-5 sentences of constructive feedback covering approach, code quality, and optimization suggestions>"
}

Scoring guide:
- correctness: Does the code solve the problem correctly?
- style: Code readability, naming, idiomatic usage
- efficiency: Time/space complexity, optimization${solutionSection}

Be encouraging but specific. Mention what they did well and suggest concrete improvements.`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Problem:\n${problem_description}\n\nUser's ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`${testResultSection}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI analyze error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Analysis failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Could not parse analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analyze error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
