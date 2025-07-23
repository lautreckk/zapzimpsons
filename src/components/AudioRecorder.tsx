import { Button } from "@/components/ui/button";
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Send,
  Loader2
} from "lucide-react";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useState } from "react";

interface AudioRecorderProps {
  onSendAudio: (audioBase64: string, duration: number) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function AudioRecorder({ onSendAudio, onCancel, disabled }: AudioRecorderProps) {
  const {
    isRecording,
    isPlaying,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    playRecording,
    stopPlaying,
    resetRecording,
    convertToBase64,
    formatDuration
  } = useMediaRecorder();

  const [isSending, setIsSending] = useState(false);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
    }
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      const base64 = await convertToBase64();
      if (base64) {
        await onSendAudio(base64, duration);
        resetRecording();
        onCancel();
      }
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    resetRecording();
    onCancel();
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
      {/* Recording/Play Controls */}
      <div className="flex items-center gap-2">
        {!audioBlob ? (
          // Recording controls
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : handleStartRecording}
            disabled={disabled || isSending}
            className="h-8 w-8 p-0"
          >
            {isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        ) : (
          // Playback controls
          <Button
            size="sm"
            variant="outline"
            onClick={isPlaying ? stopPlaying : playRecording}
            disabled={disabled || isSending}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Duration Display */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1">
          {isRecording && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          <span className="text-sm font-mono text-muted-foreground">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Waveform placeholder - could be enhanced with actual waveform */}
        {(isRecording || audioBlob) && (
          <div className="flex items-center gap-1 flex-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-primary rounded-full transition-all duration-150 ${
                  isRecording 
                    ? `h-${Math.floor(Math.random() * 4) + 2} animate-pulse`
                    : 'h-2'
                }`}
                style={{
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {audioBlob && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={resetRecording}
              disabled={disabled || isSending}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSendAudio}
              disabled={disabled || isSending}
              className="h-8 w-8 p-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={disabled || isSending}
          className="h-8 w-8 p-0"
        >
          <MicOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}