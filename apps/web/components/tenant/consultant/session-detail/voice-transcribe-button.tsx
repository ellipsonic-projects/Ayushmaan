"use client";

import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceTranscription } from "@/lib/hooks/useVoiceTranscription";

export function VoiceTranscribeButton({
  onTranscript,
  label = "Speak to transcribe",
}: {
  onTranscript: (text: string) => void;
  label?: string;
}) {
  const { isSupported, isListening, toggle } = useVoiceTranscription(onTranscript);

  if (!isSupported) return null;

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "outline"}
      size="icon-sm"
      aria-label={isListening ? "Stop voice transcription" : label}
      aria-pressed={isListening}
      title={isListening ? "Listening... click to stop" : label}
      onClick={toggle}
      className={cn(isListening && "animate-pulse")}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
