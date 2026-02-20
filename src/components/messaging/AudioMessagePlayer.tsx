'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioMessagePlayerProps {
  src: string;
  className?: string;
  waveformData?: number[];
  isViewOnce?: boolean;
  onViewOncePlay?: () => void;
}

const SPEEDS = [0.5, 1, 1.5, 2];
const WAVEFORM_BARS = 40;

function generateWaveformBars(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const bars: number[] = [];
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    hash = Math.abs((hash * 1103515245 + 12345) & 0x7fffffff);
    const height = 0.2 + (hash % 80) / 100;
    bars.push(height);
  }
  return bars;
}

export default function AudioMessagePlayer({ 
  src, 
  className = '', 
  waveformData,
  isViewOnce = false,
  onViewOncePlay 
}: AudioMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasPlayed, setHasPlayed] = useState(false);

  const waveform = useMemo(() => {
    return waveformData || generateWaveformBars(src);
  }, [src, waveformData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (isViewOnce && onViewOncePlay) {
        onViewOncePlay();
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src, isViewOnce, onViewOncePlay]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = () => {
    if (isViewOnce && hasPlayed) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      if (isViewOnce) setHasPlayed(true);
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isViewOnce && hasPlayed) return;
    
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    audio.currentTime = x * duration;
    setProgress(x * 100);
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentBarIndex = Math.floor((progress / 100) * WAVEFORM_BARS);

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-100 dark:bg-[#242f3d] rounded-lg ${className} ${isViewOnce && hasPlayed ? 'opacity-50' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        disabled={isViewOnce && hasPlayed}
        className={`w-10 h-10 rounded-full text-white flex items-center justify-center flex-shrink-0 transition-colors ${
          isViewOnce 
            ? hasPlayed 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-orange-500 hover:bg-orange-600'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div
          className="h-8 flex items-center gap-[2px] cursor-pointer"
          onClick={seek}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {waveform.map((height, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors duration-100 ${
                i <= currentBarIndex 
                  ? isViewOnce ? 'bg-orange-500' : 'bg-blue-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={{ height: `${height * 100}%`, minHeight: '4px' }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          <span>{formatTime(currentTime)}</span>
          {isViewOnce && (
            <span className="text-orange-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {hasPlayed ? 'Ouvido' : 'Ouvir uma vez'}
            </span>
          )}
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackRate(s)}
            disabled={isViewOnce && hasPlayed}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
              playbackRate === s
                ? isViewOnce ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
            } ${isViewOnce && hasPlayed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
