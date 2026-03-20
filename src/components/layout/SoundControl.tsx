import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Music, Leaf, Mountain, Flame, Sparkles, Waves, Repeat, Repeat1, SkipForward } from 'lucide-react';
import { useSoundscape } from '../../store/SoundscapeContext';

const ElementIcon = ({ element, size = 14 }: { element: string, size?: number }) => {
  switch (element) {
    case 'wood': return <Leaf size={size} />;
    case 'fire': return <Flame size={size} />;
    case 'earth': return <Mountain size={size} />;
    case 'metal': return <Sparkles size={size} />;
    case 'water': return <Waves size={size} />;
    default: return <Music size={size} />;
  }
};

interface SoundControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundControl: React.FC<SoundControlProps> = ({ isOpen, onClose }) => {
  const { isPlaying, currentSound, togglePlay, setSound, playbackMode, setPlaybackMode, nextTrack, tracks } = useSoundscape();

  return (
    <div className="fixed bottom-28 right-6 md:right-12 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white/90 backdrop-blur-3xl border border-white/50 p-5 rounded-[2.5rem] shadow-2xl flex flex-col gap-4 min-w-[280px]"
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-ink/40 font-medium">
                Soundscape
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackMode(playbackMode === 'list' ? 'single' : 'list')}
                  className="p-2 rounded-full text-ink/40 hover:text-ink transition-colors"
                >
                  {playbackMode === 'list' ? <Repeat size={14} /> : <Repeat1 size={14} />}
                </button>
                <button
                  onClick={nextTrack}
                  className="p-2 rounded-full text-ink/40 hover:text-ink transition-colors"
                >
                  <SkipForward size={14} />
                </button>
                <button 
                  onClick={togglePlay}
                  className={`p-2 rounded-full transition-colors ${isPlaying ? 'text-ink' : 'text-ink/30'}`}
                >
                  {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {tracks.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => setSound(sound.id)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                    currentSound?.id === sound.id 
                      ? 'bg-ink text-white shadow-lg' 
                      : 'hover:bg-ink/5 text-ink/60 hover:text-ink'
                  }`}
                >
                  <ElementIcon element={sound.element} />
                  <span className="text-xs tracking-[0.1em] font-light truncate max-w-[160px]">{sound.title || sound.name}</span>
                  {currentSound?.id === sound.id && isPlaying && (
                    <motion.div 
                      animate={{ scaleY: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="ml-auto flex gap-1 items-center h-3"
                    >
                      <div className="w-0.5 h-1.5 bg-white/60 rounded-full" />
                      <div className="w-0.5 h-2.5 bg-white/60 rounded-full" />
                      <div className="w-0.5 h-1.5 bg-white/60 rounded-full" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
