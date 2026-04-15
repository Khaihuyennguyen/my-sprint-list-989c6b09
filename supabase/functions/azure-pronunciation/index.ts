const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
      return new Response(
        JSON.stringify({ error: "audio file and referenceText required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBytes = await audioFile.arrayBuffer();

    // Build pronunciation assessment parameters
    const pronAssessmentParams = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Dimension: "Comprehensive",
      EnableMiscue: true,
      EnableProsodyAssessment: true,
      PhonemeAlphabet: "IPA",
      NBestPhonemeCount: 5,
    };

    const pronAssessmentParamsBase64 = btoa(JSON.stringify(pronAssessmentParams));

    // Call Azure Speech REST API for pronunciation assessment
    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&usePipelineVersion=0`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json;text/xml",
        Connection: "Keep-Alive",
        "Content-Type": "audio/webm; codecs=opus",
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Pronunciation-Assessment": pronAssessmentParamsBase64,
      },
      body: new Uint8Array(audioBytes),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Azure Speech error:", response.status, errText);
      throw new Error(`Azure Speech API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Azure raw result:", JSON.stringify(result));

    // Extract scores from Azure response
    const nBest = result.NBest?.[0];
    if (!nBest) {
      throw new Error("No recognition result from Azure");
    }

    const pronAssessment = nBest.PronunciationAssessment || {};

    // Map Azure scores (0-100) to our format
    const scores = {
      accuracyScore: pronAssessment.AccuracyScore || 0,
      fluencyScore: pronAssessment.FluencyScore || 0,
      completenessScore: pronAssessment.CompletenessScore || 0,
      pronScore: pronAssessment.PronScore || 0,
      prosodyScore: pronAssessment.ProsodyScore || 0,
    };

    // Extract word-level details
    const words = (nBest.Words || []).map((w: any) => ({
      word: w.Word,
      accuracyScore: w.PronunciationAssessment?.AccuracyScore || 0,
      errorType: w.PronunciationAssessment?.ErrorType || "None",
      phonemes: (w.Phonemes || []).map((p: any) => ({
        phoneme: p.Phoneme,
        ipaPhoneme: p.PronunciationAssessment?.NBestPhonemes?.[0]?.Phoneme || p.Phoneme,
        accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0,
      })),
    }));

    // Find problem words (accuracy < 80 or errorType != None)
    const problemWords = words.filter(
      (w: any) => w.accuracyScore < 80 || w.errorType !== "None"
    );

    return new Response(
      JSON.stringify({
        recognizedText: nBest.Display || nBest.Lexical || "",
        scores,
        words,
        problemWords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Azure pronunciation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Assessment failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
