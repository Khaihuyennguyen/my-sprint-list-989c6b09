
Goal: fix the false “silence for all attempts” result in Teacher Mode by treating this as both a recording-pipeline problem and an analysis-pipeline problem.

What I found
- The backend did receive teacher recordings and returned 200s, so this is not just “nothing was sent.”
- The pronunciation logs show Azure returning `"DisplayText": "."` and zero scores for every teacher sentence, which means the uploaded audio is being interpreted as silence/invalid speech.
- There are two likely systemic causes in the current code:
  1. `useAudioRecorder.ts` does an awaited permissions check before `getUserMedia()`. In some browsers this weakens the direct user-gesture chain and can lead to unreliable mic capture behavior.
  2. `supabase/functions/azure-pronunciation/index.ts` always forwards audio to Azure as `audio/webm; codecs=opus`, even though the recorder can produce `audio/mp4`. That mismatch can make valid audio look like silence.
- There is also a parsing bug in the Azure function: it reads nested `PronunciationAssessment` fields, but the logged Azure response shape is using top-level `AccuracyScore / FluencyScore / CompletenessScore / PronScore` and word-level `AccuracyScore / ErrorType`. So even when Azure gives useful detail, the app can misread it.

Implementation plan
1. Harden microphone capture
- Refactor `src/hooks/useAudioRecorder.ts` so `getUserMedia()` runs directly from the button click path before any nonessential awaits.
- Keep friendly error handling, but move permission querying to a non-blocking/check-only path or after capture starts.
- Track the actual recorder mime type on the client so downstream code knows whether the blob is webm or mp4.

2. Send the real audio format to analysis
- Update Teacher/Shadow/Drill upload code to preserve the actual blob type and matching filename extension instead of always pretending the file is `.webm`.
- Update `supabase/functions/azure-pronunciation/index.ts` to read the uploaded file’s real MIME type and forward that exact content type to Azure.

3. Fix Azure response parsing
- Change the function to support the response shape shown in logs:
  - sentence scores from top-level `AccuracyScore`, `FluencyScore`, `CompletenessScore`, `PronScore`
  - word details from `Word`, `AccuracyScore`, `ErrorType`
- Keep compatibility with nested `PronunciationAssessment` if Azure returns that variant too.

4. Add “recording sanity” checks before analysis
- In `useAudioRecorder.ts`, detect obviously empty/near-empty recordings (tiny blob size or near-zero RMS throughout).
- If the recording appears silent, show a clear mic warning and do not send it to pronunciation analysis as if it were a normal attempt.
- This prevents the app from generating a misleading “you were silent” study plan when the issue is technical.

5. Improve Teacher Mode UX for failure states
- In `src/pages/TeacherMode.tsx`, show a stronger inline error when the mic is blocked/busy/empty.
- If a clip fails the sanity check, keep the user on the same sentence and prompt them to retry instead of continuing into final analysis with bad data.

6. Apply the same fix to shared voice flows
- Because the same recorder is used elsewhere, propagate the format/silence fixes to:
  - `src/components/shadow/ShadowContinuousPlayer.tsx`
  - `src/pages/PracticeDrill.tsx`
- This avoids the same silent-upload bug showing up in Shadow Mode and drills later.

Validation plan
- Test Teacher Mode end-to-end:
  - start recording from the mic button
  - confirm non-empty blob creation
  - confirm uploaded MIME matches actual recorder output
  - confirm Azure no longer returns `"."` for spoken input
  - confirm final review only appears after valid recordings
- Regression test Shadow continuous mode and Practice Drill with the same mic flow.
- Also test the negative case: blocked mic / busy mic / intentionally silent recording should show a technical warning instead of a fake pronunciation evaluation.

Technical details
- Files to update:
  - `src/hooks/useAudioRecorder.ts`
  - `src/pages/TeacherMode.tsx`
  - `src/components/shadow/ShadowContinuousPlayer.tsx`
  - `src/pages/PracticeDrill.tsx`
  - `supabase/functions/azure-pronunciation/index.ts`
- No database changes are needed.
- This is mainly a media-capture + edge-function interoperability fix, not a UI-only issue.

Most likely root cause summary
- The app is currently vulnerable to a bad audio handoff: the browser may record in one format, but the backend labels it as another, and the response parser is also reading the wrong Azure fields. That combination can turn real speech into a false “all silence” result.
