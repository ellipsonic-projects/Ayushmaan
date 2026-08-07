"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioRecorder({
  onRecordingComplete,
}: {
  onRecordingComplete: (blob: Blob) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onRecordingComplete(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      if (e instanceof DOMException) {
        if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          setMicError("No microphone found. Please connect a microphone and try again.");
        } else if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setMicError(
            "Microphone access denied. Please allow microphone permission in your browser."
          );
        } else {
          setMicError(`Microphone error: ${e.message}`);
        }
      }
    }
  }

  function togglePause() {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg tabular-nums">{formatTime(recordingTime)}</span>
        {isRecording && !isPaused && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
        )}
      </div>

      <div className="flex gap-2">
        {!isRecording ? (
          <Button type="button" onClick={startRecording}>
            <Mic className="h-4 w-4" />
            <span>Start Session</span>
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="icon" onClick={togglePause}>
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="destructive" size="icon" onClick={stopRecording}>
              <Square className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {micError && <p className="px-2 text-center text-sm text-destructive">{micError}</p>}
    </div>
  );
}
