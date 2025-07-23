import { useEffect, useRef, useState } from 'react';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    // Criar o elemento de áudio
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;

    // Monitorar se a janela está em foco
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const playNotificationSound = () => {
    if (soundEnabled && !isWindowFocused && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  return {
    playNotificationSound,
    soundEnabled,
    setSoundEnabled,
    isWindowFocused
  };
}