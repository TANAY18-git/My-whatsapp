import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const AudioWaveform = ({ audioUrl, isSender, timestamp }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    // Reset state when audio URL changes
    setIsPlaying(false);
    setCurrentTime(0);

    // Load audio metadata to get duration
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    return () => {
      audio.removeEventListener('loadedmetadata', () => {});
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Generate waveform bars
  const generateWaveform = () => {
    const bars = [];
    const barCount = 50; // More bars for a smoother waveform

    // Create a pattern that looks more like the reference image
    const pattern = [];

    // Generate a pattern with varying heights
    for (let i = 0; i < barCount; i++) {
      // Create a more random pattern with some structure
      let height;

      if (i % 3 === 0) {
        // Every third bar is taller
        height = 40 + Math.random() * 40;
      } else if (i % 5 === 0) {
        // Every fifth bar is shorter
        height = 15 + Math.random() * 15;
      } else {
        // Other bars have medium height
        height = 20 + Math.random() * 30;
      }

      // Ensure minimum height
      height = Math.max(10, height);

      pattern.push(height);
    }

    for (let i = 0; i < barCount; i++) {
      const isActive = (i / barCount) <= (currentTime / duration);

      bars.push(
        <div
          key={i}
          className={`waveform-bar ${isActive ? 'active' : ''}`}
          style={{
            height: `${pattern[i]}%`,
            backgroundColor: isActive
              ? (isSender ? 'white' : '#0A85FF')
              : (isSender ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.15)'),
          }}
        />
      );
    }

    return bars;
  };

  return (
    <div className="flex flex-col w-full">
      <div className={`flex flex-col p-2 rounded-xl ${isSender ? 'bg-[#004C99]' : 'bg-[#F2F2F7]'}`}>
        <div className="text-xs mb-1" style={{ color: isSender ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)' }}>
          Voice message (Infinity:NaN)
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayPause}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white"
            style={{
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={isSender ? "#004C99" : "#0A85FF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill={isSender ? "#004C99" : "#0A85FF"} stroke="none">
                <polygon points="7 4 19 12 7 20 7 4"></polygon>
              </svg>
            )}
          </button>

          <div className="flex-1 flex items-center h-8">
            <div className="flex-1 flex items-end space-x-0.5 h-full">
              {generateWaveform()}
            </div>
          </div>
        </div>

        {timestamp && (
          <div className="text-right text-xs mt-1" style={{ color: isSender ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-secondary)' }}>
            {timestamp}
            {isSender && (
              <span className="ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L7 17L2 12" />
                  <path d="M22 10L11 21L9 19" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />
    </div>
  );
};

export default AudioWaveform;
