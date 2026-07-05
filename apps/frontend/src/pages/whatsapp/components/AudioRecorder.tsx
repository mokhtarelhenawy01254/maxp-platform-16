import React, { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Loader2, Mic, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "اضغط للتسجيل",
  acquiring_media: "طلب الإذن بالميكروفون...",
  recording: "Recording...",
  stopped: "Processing...",
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, onCancel }) => {
  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl, error } =
    useReactMediaRecorder({ audio: true });

  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  useEffect(() => {
    startRecording();
  }, [startRecording]);

  useEffect(() => {
    const sendAudio = async () => {
      if (isSending && mediaBlobUrl && status === "stopped") {
        try {
          const response = await fetch(mediaBlobUrl);
          const blob = await response.blob();
          onSend(blob);
          clearBlobUrl();
        } catch (error) {
          console.error("Error fetching audio blob:", error);
        } finally {
          setIsSending(false);
        }
      }
    };

    sendAudio();
  }, [clearBlobUrl, isSending, mediaBlobUrl, onSend, status]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const isError = error || status === "idle";

  return (
    <div className="flex w-full items-center gap-2 rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-3 py-2 shadow-md">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCancel}
        className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
      >
        <Trash2 className="size-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-primary/5 px-3 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
          {status === "recording" ? (
            <Mic className="size-4 animate-pulse" />
          ) : (
            <Loader2 className="size-4 animate-spin" />
          )}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
            {formatTime(recordingTime)}
          </div>
          <div className="text-xs text-[color:var(--color-muted-foreground)]">
            {error ? (
              <span className="text-rose-500">تعذر الوصول إلى الميكروفون - تحقق من الإذن</span>
            ) : (
              STATUS_LABELS[status] || "Processing..."
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={() => {
          setIsSending(true);
          stopRecording();
        }}
        disabled={status !== "recording"}
        className="rounded-full"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
};

AudioRecorder.displayName = "AudioRecorder";

export default AudioRecorder;
