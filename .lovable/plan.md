

## Add Confirmation Before API Calls

### Goal
Show a confirmation dialog before sending recordings or code to the API for analysis/evaluation, so you don't accidentally spend API credits.

### Changes

#### 1. Practice page (`src/pages/Practice.tsx`)
- **AI Feedback button**: Before calling `analyze-code`, show an `AlertDialog` asking "Send your code for AI analysis? This uses API credits." with Cancel / Confirm buttons.
- **Run Code button**: No confirmation needed here — this runs test cases, not AI analysis.

#### 2. Session page (`src/pages/Session.tsx`)
- **After recording stops**: Before sending audio to `transcribe` + `evaluate`, show an `AlertDialog` asking "Submit your recording for evaluation? This uses API credits." with Cancel / Discard buttons.
- If the user cancels, discard the recording and return to idle state (ready to re-record).

### Technical Details
- Use the existing `AlertDialog` component from `src/components/ui/alert-dialog.tsx`
- In Practice: wrap `handleAnalyze` with a state flag `showAnalyzeConfirm`; the dialog's confirm button triggers the actual API call
- In Session: after `onBlobReady` fires, store the blob in state and show the dialog instead of immediately calling `processAnswer`. Confirm triggers the pipeline; cancel discards the blob
- No new dependencies needed

