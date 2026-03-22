import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Soundscape {
  id: string;
  name: string;
  title?: string;
  artist?: string;
  category?: string;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  url: string;
}

export type PlaybackMode = 'list' | 'single';

interface SoundscapeContextType {
  isPlaying: boolean;
  currentSound: Soundscape | null;
  volume: number;
  playbackMode: PlaybackMode;
  tracks: Soundscape[];
  togglePlay: () => void;
  setSound: (id: string) => void;
  setVolume: (volume: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  nextTrack: () => void;
  isLoading: boolean;
}

const SoundscapeContext = createContext<SoundscapeContextType | undefined>(undefined);

export const SoundscapeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<Soundscape | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('list');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use React Query to fetch tracks
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['music'],
    queryFn: async () => {
      const response = await fetch('/api/music');
      if (!response.ok) throw new Error('Failed to fetch music');
      return await response.json();
    }
  });

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    const handleEnded = () => {
      if (playbackModeRef.current === 'single') {
        audio.currentTime = 0;
        audio.play().catch(err => console.error("Audio play failed:", err));
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Use a ref for playbackMode to avoid re-running the effect above
  const playbackModeRef = useRef(playbackMode);
  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (currentSound) {
      audioRef.current.src = currentSound.url;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Audio play failed:", err));
      }
    } else {
      audioRef.current.pause();
    }
  }, [currentSound]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      if (audioRef.current.src) {
        audioRef.current.play().catch(err => console.error("Audio play failed:", err));
      } else if (tracks.length > 0) {
        setCurrentSound(tracks[0]);
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const nextTrack = () => {
    if (tracks.length === 0) return;
    
    const currentIndex = currentSound ? tracks.findIndex(t => t.id === currentSound.id) : -1;
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentSound(tracks[nextIndex]);
    if (!isPlaying) setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!currentSound && tracks.length > 0) {
      setCurrentSound(tracks[0]);
    }
    setIsPlaying(!isPlaying);
  };

  const setSound = (id: string) => {
    const sound = tracks.find(s => s.id === id);
    if (sound) {
      setCurrentSound(sound);
      setIsPlaying(true);
    }
  };

  return (
    <SoundscapeContext.Provider value={{ 
      isPlaying, 
      currentSound, 
      volume, 
      playbackMode, 
      tracks,
      togglePlay, 
      setSound, 
      setVolume, 
      setPlaybackMode,
      nextTrack,
      isLoading
    }}>
      {children}
    </SoundscapeContext.Provider>
  );
};

export const useSoundscape = () => {
  const context = useContext(SoundscapeContext);
  if (context === undefined) {
    throw new Error('useSoundscape must be used within a SoundscapeProvider');
  }
  return context;
};
