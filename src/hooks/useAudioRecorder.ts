import { useState, useRef, useCallback } from "react";

interface UseAudioRecorderOptions {
  /** Auto-stop after this many ms of continuous silence (default: 12000). Set to 0 to disable. */
  silenceTimeoutMs?: number;
  /** RMS threshold below which audio is considered "silence" (0-1, default: 0.015). */
  silenceThreshold?: number;
  /** Minimum recording duration before silence detection kicks in (default: 1500ms). */
  minRecordingMs?: number;
  /** Called when recording auto-stops due to silence. */
  onSilenceStop?: () => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    silenceTimeoutMs = 12000,
    silenceThreshold = 0.015,
    minRecordingMs = 1500,
    onSilenceStop,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Silence detection refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceRafRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef<number>(0);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceRafRef.current) {
      cancelAnimationFrame(silenceRafRef.current);
      silenceRafRef.current = null;
    }
    try {
      sourceRef.current?.disconnect();
    } catch { /* noop */ }
    sourceRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    cleanupSilenceDetection();
  }, [cleanupSilenceDetection]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone recording is not supported in this browser.");
        return;
      }

      try {
        if (navigator.permissions?.query) {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });

          if (permissionStatus.state === "denied") {
            setError("Microphone blocked. Please enable it in your browser settings.");
            return;
          }
        }
      } catch (permissionError) {
        console.warn("Microphone permission query unavailable:", permissionError);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : undefined;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = mimeType ?? recorder.mimeType ?? "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        cleanupSilenceDetection();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      lastSoundAtRef.current = Date.now();

      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

      // === Silence detection setup ===
      if (silenceTimeoutMs > 0) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);

          audioCtxRef.current = audioCtx;
          analyserRef.current = analyser;
          sourceRef.current = source;

          const buffer = new Uint8Array(analyser.fftSize);

          const checkSilence = () => {
            if (!analyserRef.current || !mediaRecorderRef.current) return;
            if (mediaRecorderRef.current.state !== "recording") return;

            analyserRef.current.getByteTimeDomainData(buffer);
            let sumSq = 0;
            for (let i = 0; i < buffer.length; i++) {
              const v = (buffer[i] - 128) / 128;
              sumSq += v * v;
            }
            const rms = Math.sqrt(sumSq / buffer.length);

            const now = Date.now();
            if (rms > silenceThreshold) {
              lastSoundAtRef.current = now;
            }

            const elapsed = now - startTimeRef.current;
            const silentFor = now - lastSoundAtRef.current;

            if (elapsed > minRecordingMs && silentFor > silenceTimeoutMs) {
              stopRecording();
              onSilenceStop?.();
              return;
            }

            silenceRafRef.current = requestAnimationFrame(checkSilence);
          };

          silenceRafRef.current = requestAnimationFrame(checkSilence);
        } catch (e) {
          console.warn("Silence detection unavailable:", e);
        }
      }
    } catch (err: any) {
      console.error("Microphone start failed:", err);

      if (err?.name === "NotAllowedError") {
        setError("Permission denied. Please allow microphone access in your browser settings.");
      } else if (err?.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else if (err?.name === "NotReadableError") {
        setError("Microphone is being used by another app. Please close other apps and try again.");
      } else if (err?.name === "NotSupportedError") {
        setError("This browser could not start audio recording.");
      } else {
        setError("An unexpected microphone error occurred. Please try again.");
      }
    }
  }, [silenceTimeoutMs, silenceThreshold, minRecordingMs, onSilenceStop, cleanupSilenceDetection, stopRecording]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, []);

  return { isRecording, audioBlob, duration, startRecording, stopRecording, resetRecording, error };
}
