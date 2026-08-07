"use client";

import { useCallback, useRef, useState } from "react";

// In-browser Whisper transcription (Sprint 4.2) — runs entirely client-side
// via a Web Worker loaded from /public/workers/whisper-worker.js
// (@xenova/transformers, Whisper-tiny). No server dispatch, no async
// webhook: the transcript comes back in this same browser session.
type WorkerMessage =
  | { status: "complete"; task: string; data: { text: string } }
  | { status: "error"; task: string; data: unknown }
  | { status: string; [key: string]: unknown };

async function decodeToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    return decoded.getChannelData(0);
  } finally {
    await audioContext.close();
  }
}

export function useWhisperTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  function getWorker() {
    if (!workerRef.current) {
      workerRef.current = new Worker("/workers/whisper-worker.js", { type: "module" });
    }
    return workerRef.current;
  }

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    setIsTranscribing(true);
    try {
      const audio = await decodeToFloat32(blob);
      const worker = getWorker();

      return await new Promise<string>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerMessage>) => {
          if (event.data.status === "complete") {
            worker.removeEventListener("message", handleMessage);
            resolve((event.data as { data: { text: string } }).data.text.trim());
          } else if (event.data.status === "error") {
            worker.removeEventListener("message", handleMessage);
            reject(new Error("Transcription failed"));
          }
        };
        worker.addEventListener("message", handleMessage);
        worker.postMessage({ audio });
      });
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  return { transcribe, isTranscribing };
}
