import { useState, useRef, useCallback } from 'react';

export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export function useMediaRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false
        }));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      // Start duration counter
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        audioBlob: null,
        audioUrl: null
      }));
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Não foi possível acessar o microfone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [state.isRecording]);

  const playRecording = useCallback(() => {
    if (state.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(state.audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      };
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };
      
      audio.play();
    }
  }, [state.audioUrl]);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    
    setState({
      isRecording: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null
    });
  }, [state.audioUrl]);

  const convertToBase64 = useCallback(async (): Promise<string | null> => {
    if (!state.audioBlob) return null;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove o prefixo data:audio/webm;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(state.audioBlob);
    });
  }, [state.audioBlob]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    playRecording,
    stopPlaying,
    resetRecording,
    convertToBase64,
    formatDuration
  };
}