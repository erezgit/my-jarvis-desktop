import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { VoiceMessage } from '../../types';

interface VoiceMessageComponentProps {
  message: VoiceMessage;
}

export function VoiceMessageComponent({ message }: VoiceMessageComponentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play if enabled
  useEffect(() => {
    if (message.autoPlay && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.warn('Auto-play failed:', error);
      });
    }
  }, [message.autoPlay]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="mb-3 pr-3 pl-0 pt-3 pb-3">
      {/* Plain text message */}
      <div className="text-gray-900 dark:text-gray-100 text-sm mb-2">
        {message.content}
      </div>

      {/* Small gray play button underneath */}
      <button
        onClick={handlePlayPause}
        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-xs"
      >
        {isPlaying ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      <audio
        ref={audioRef}
        src={message.audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="none"
      />
    </div>
  );
}