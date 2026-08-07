"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioRecorder } from "@/components/session/audio-recorder";
import { useWhisperTranscription } from "@/lib/hooks/useWhisperTranscription";
import { requestAudioUploadUrl, uploadSessionAudio } from "@/lib/api/session-recording.client";
import { createInteraction } from "@/lib/api/case-detail.client";

type Stage = "idle" | "uploading" | "transcribing" | "review" | "saving" | "saved" | "error";

export function SessionRecordingPanel({
  caseId,
  appointmentId,
}: {
  caseId: string;
  appointmentId: string;
}) {
  const router = useRouter();
  const { transcribe } = useWhisperTranscription();

  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [audioStoragePath, setAudioStoragePath] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED"
  >("PENDING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRecordingComplete(blob: Blob) {
    setErrorMessage(null);
    setStage("uploading");
    try {
      const fileName = `session-${appointmentId}.webm`;
      const { path, token } = await requestAudioUploadUrl(caseId, fileName);
      await uploadSessionAudio(path, token, blob);
      setAudioStoragePath(path);

      setStage("transcribing");
      setTranscriptionStatus("PROCESSING");
      const text = await transcribe(blob);
      setTranscript(text);
      setTranscriptionStatus("COMPLETE");
      setStage("review");
    } catch (err) {
      setTranscriptionStatus("FAILED");
      setErrorMessage(err instanceof Error ? err.message : "Recording failed");
      setStage("error");
    }
  }

  async function handleSave() {
    setStage("saving");
    try {
      await createInteraction(caseId, {
        type: "SESSION_NOTE",
        appointmentId,
        notes: transcript.trim() || "(no transcript captured)",
        audioStoragePath: audioStoragePath ?? undefined,
        transcriptionStatus,
      });
      setStage("saved");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save session note");
      setStage("error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Recording</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {stage === "idle" && <AudioRecorder onRecordingComplete={handleRecordingComplete} />}

        {stage === "uploading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading recording...
          </div>
        )}

        {stage === "transcribing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribing audio in your browser (first run downloads the model)...
          </div>
        )}

        {(stage === "review" || stage === "saving" || stage === "saved") && (
          <div className="flex flex-col gap-3">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript will appear here — correct any errors before saving."
              rows={8}
              disabled={stage !== "review"}
            />
            {stage === "saved" ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Session note saved.
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={stage === "saving"}
                className="w-fit"
              >
                {stage === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                Save session note
              </Button>
            )}
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStage("idle")}
              className="w-fit"
            >
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
