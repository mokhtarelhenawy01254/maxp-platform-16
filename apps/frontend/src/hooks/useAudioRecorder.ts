import { useCallback, useEffect, useRef, useState } from "react";

type AudioRecorderStatus = "idle" | "acquiring_media" | "recording" | "stopping" | "stopped" | "error";

interface UseAudioRecorderReturn {
  status: AudioRecorderStatus;
  mediaBlobUrl: string | undefined;
  error: string | undefined;
  startRecording: () => void;
  stopRecording: () => void;
  clearBlobUrl: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<AudioRecorderStatus>("idle");
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaBlobUrl) {
        URL.revokeObjectURL(mediaBlobUrl);
      }
    };
  }, [mediaBlobUrl]);

  const startRecording = useCallback(async () => {
    try {
      setError(undefined);
      setStatus("acquiring_media");
      chunksRef.current = [];

      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new DOMException("Browser does not support media devices", "NotSupportedError");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let options: MediaRecorderOptions = {};
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/aac",
      ];
      for (const candidate of mimeCandidates) {
        if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(candidate)) {
          options = { mimeType: candidate };
          break;
        }
      }
      mimeTypeRef.current = options.mimeType || "audio/webm";

      const recorder = options.mimeType ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const url = URL.createObjectURL(blob);
        chunksRef.current = [];
        setMediaBlobUrl(url);
        setStatus("stopped");
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setError("recorder_error");
        setStatus("error");
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setStatus("recording");
    } catch (err: unknown) {
      let errorType = "unknown";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorType = "permission_denied";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorType = "device_not_found";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorType = "device_busy";
        } else if (err.name === "NotSupportedError") {
          errorType = "not_supported";
        } else {
          errorType = err.name;
        }
      } else if (err instanceof Error) {
        errorType = err.message || "error";
      }
      setError(errorType);
      setStatus("error");
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setStatus("stopping");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearBlobUrl = useCallback(() => {
    if (mediaBlobUrl) {
      URL.revokeObjectURL(mediaBlobUrl);
    }
    setMediaBlobUrl(undefined);
    setStatus("idle");
  }, [mediaBlobUrl]);

  return { status, mediaBlobUrl, error, startRecording, stopRecording, clearBlobUrl };
}
