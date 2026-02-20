'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send, Trash2, Play, Pause, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isViewOnce?: boolean;
}

export default function AudioRecorder({ onSend, onCancel, isViewOnce = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const CANCEL_THRESHOLD = -100;

  useEffect(() => {
    startRecording();
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 0.1);
      }, 100);

      updateWaveform();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Não foi possível acessar o microfone');
      onCancel();
    }
  };

  const updateWaveform = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const draw = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalized = Math.min(1, average / 128);
      
      setWaveformData(prev => {
        const newData = [...prev, normalized];
        if (newData.length > 50) {
          return newData.slice(-50);
        }
        return newData;
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRecording(false);
  };

  const handleCancel = () => {
    stopAllMedia();
    onCancel();
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current || !audioUrl) return;

    if (isPlaying) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!previewAudioRef.current) return;

    const audio = previewAudioRef.current;
    
    const onTimeUpdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartRef.current;
    if (diff < 0) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < CANCEL_THRESHOLD) {
      handleCancel();
    } else {
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cancelOpacity = Math.min(1, Math.abs(swipeOffset) / Math.abs(CANCEL_THRESHOLD));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-3"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {audioUrl && (
        <audio ref={previewAudioRef} src={audioUrl} preload="metadata" />
      )}

      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ transform: `translateX(${swipeOffset}px)` }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="flex items-center gap-2"
              style={{ opacity: cancelOpacity }}
            >
              <X className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-500">Cancelar</span>
            </motion.div>

            <div className="flex-1 flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              
              <div className="flex-1 h-10 flex items-center gap-[2px] overflow-hidden">
                {waveformData.map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, height * 100)}%` }}
                    className="w-1 bg-blue-500 dark:bg-blue-400 rounded-full"
                    style={{ minHeight: '4px' }}
                  />
                ))}
                {waveformData.length < 50 && Array(50 - waveformData.length).fill(0).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-1 bg-gray-200 dark:bg-gray-600 rounded-full"
                    style={{ height: '4px' }}
                  />
                ))}
              </div>

              <span className="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-[50px] text-right">
                {formatDuration(duration)}
              </span>
            </div>

            <button
              onClick={stopRecording}
              className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              aria-label="Parar gravação"
            >
              <StopCircle className="w-6 h-6" />
            </button>
          </motion.div>
        ) : audioBlob ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={handleCancel}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-red-500 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Descartar"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={togglePreviewPlay}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDuration(duration)}</span>
                {isViewOnce && (
                  <span className="text-orange-500 font-medium">Ouvir uma vez</span>
                )}
              </div>
            </div>

            <button
              onClick={handleSend}
              className={`p-2 rounded-full text-white transition-colors ${
                isViewOnce 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              aria-label="Enviar"
            >
              <Send className="w-5 h-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isRecording && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Deslize para a esquerda para cancelar
        </p>
      )}
    </motion.div>
  );
}
