import { useState, useRef, useEffect } from 'react';
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
    <div className="voice-message border rounded-lg p-4 bg-blue-50">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <div className="flex-1">
          <div className="text-sm text-gray-600">🎵 Voice Message</div>
          <div className="text-gray-800">{message.content}</div>
        </div>
      </div>
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