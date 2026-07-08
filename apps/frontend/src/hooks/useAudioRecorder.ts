import { useEffect, useRef, useState } from "react";

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

  const startRecording = async () => {
    try {
      setError(undefined);
      setStatus("acquiring_media");
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/wav";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
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
      const name = err instanceof DOMException ? err.name : "unknown";
      setError(name);
      setStatus("error");
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setStatus("stopping");
      mediaRecorderRef.current.stop();
    }
  };

  const clearBlobUrl = () => {
    if (mediaBlobUrl) {
      URL.revokeObjectURL(mediaBlobUrl);
    }
    setMediaBlobUrl(undefined);
    setStatus("idle");
  };

  return { status, mediaBlobUrl, error, startRecording, stopRecording, clearBlobUrl };
}
