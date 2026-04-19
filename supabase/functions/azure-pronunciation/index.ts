const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map our recorder MIME types to Azure-acceptable Content-Type values.
function azureContentTypeFor(rawMime: string | null | undefined, fallback = "audio/webm; codecs=opus"): string {
  if (!rawMime) return fallback;
  const m = rawMime.toLowerCase();
  if (m.includes("webm")) {
    // Azure accepts: audio/webm; codecs=opus
    return m.includes("opus") ? "audio/webm; codecs=opus" : "audio/webm; codecs=opus";
  }
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) {
    // Azure accepts MP4/AAC via this content-type
    return "audio/mp4";
  }
  if (m.includes("ogg")) {
    return "audio/ogg; codecs=opus";
  }
  if (m.includes("wav")) {
    return "audio/wav";
  }
  return fallback;
}

// Pull a numeric score from either top-level field OR nested PronunciationAssessment field.
function pickScore(node: any, key: string): number {
  if (!node) return 0;
  if (typeof node[key] === "number") return node[key];
  const nested = node.PronunciationAssessment;
  if (nested && typeof nested[key] === "number") return nested[key];
  return 0;
}

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
    const audioContentType = azureContentTypeFor(audioFile.type);

    console.log(
      "azure-pronunciation: received",
      audioFile.size,
      "bytes; client mime =",
      audioFile.type,
      "; forwarding as",
      audioContentType
    );

    if (audioBytes.byteLength < 1000) {
      console.warn("azure-pronunciation: audio is suspiciously small, returning empty result");
      return new Response(
        JSON.stringify({
          recognizedText: "",
          scores: { accuracyScore: 0, fluencyScore: 0, completenessScore: 0, pronScore: 0, prosodyScore: 0 },
          words: [],
          problemWords: [],
          warning: "audio_too_short",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const url = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&usePipelineVersion=0`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json;text/xml",
        Connection: "Keep-Alive",
        "Content-Type": audioContentType,
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

    // Detect "no speech recognized"
    if (result.RecognitionStatus && result.RecognitionStatus !== "Success") {
      console.warn("Azure RecognitionStatus:", result.RecognitionStatus);
      return new Response(
        JSON.stringify({
          recognizedText: "",
          scores: { accuracyScore: 0, fluencyScore: 0, completenessScore: 0, pronScore: 0, prosodyScore: 0 },
          words: [],
          problemWords: [],
          warning: "no_speech_recognized",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nBest = result.NBest?.[0];
    if (!nBest) {
      throw new Error("No recognition result from Azure");
    }

    // Scores can live at top level OR nested under PronunciationAssessment.
    const scores = {
      accuracyScore: pickScore(nBest, "AccuracyScore"),
      fluencyScore: pickScore(nBest, "FluencyScore"),
      completenessScore: pickScore(nBest, "CompletenessScore"),
      pronScore: pickScore(nBest, "PronScore"),
      prosodyScore: pickScore(nBest, "ProsodyScore"),
    };

    // Extract word-level details — same dual-shape handling.
    const words = (nBest.Words || []).map((w: any) => {
      const accuracy = pickScore(w, "AccuracyScore");
      const errorType =
        w.ErrorType ?? w.PronunciationAssessment?.ErrorType ?? "None";
      return {
        word: w.Word,
        accuracyScore: accuracy,
        errorType,
        phonemes: (w.Phonemes || []).map((p: any) => ({
          phoneme: p.Phoneme,
          ipaPhoneme:
            p.PronunciationAssessment?.NBestPhonemes?.[0]?.Phoneme ?? p.Phoneme,
          accuracyScore: pickScore(p, "AccuracyScore"),
        })),
      };
    });

    const problemWords = words.filter(
      (w: any) => w.accuracyScore < 80 || w.errorType !== "None"
    );

    return new Response(
      JSON.stringify({
        recognizedText: nBest.Display || nBest.Lexical || result.DisplayText || "",
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
