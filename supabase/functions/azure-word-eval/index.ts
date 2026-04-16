// Single-word pronunciation assessment for study plan drills.
// Uses Azure Speech REST API like azure-pronunciation but optimized for short utterances.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const AZURE_SPEECH_KEY = Deno.env.get("AZURE_SPEECH_KEY");
    const AZURE_SPEECH_REGION = Deno.env.get("AZURE_SPEECH_REGION");
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error("Azure Speech credentials not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const referenceText = formData.get("referenceText") as string;

    if (!audioFile || !referenceText) {
      return new Response(JSON.stringify({ error: "audio and referenceText required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const pronAssessmentParams = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      EnableMiscue: "True",
    };
    const paramsB64 = btoa(JSON.stringify(pronAssessmentParams));

    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/webm; codecs=opus",
        "Pronunciation-Assessment": paramsB64,
        Accept: "application/json",
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Azure error: ${response.status} ${errText}`);
    }

    const result = await response.json();
    const nbest = result?.NBest?.[0];
    if (!nbest) {
      return new Response(JSON.stringify({
        error: "No speech detected",
        recognizedText: "",
        accuracyScore: 0,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pa = nbest.PronunciationAssessment || {};
    return new Response(
      JSON.stringify({
        recognizedText: nbest.Display || result.DisplayText || "",
        accuracyScore: Math.round(pa.AccuracyScore || 0),
        pronScore: Math.round(pa.PronScore || 0),
        passed: (pa.AccuracyScore || 0) >= 75,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Word eval error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Evaluation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
