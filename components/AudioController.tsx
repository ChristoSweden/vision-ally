import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

interface AudioControllerProps {
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
  onEnded: () => void;
}

const AudioController: React.FC<AudioControllerProps> = ({ audioBuffer, audioContext, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [pauseTime, setPauseTime] = useState<number>(0);

  // Helper to start playback
  const playAudio = (offset: number) => {
    if (!audioContext || !audioBuffer) return;

    // Close existing node if any
    if (sourceNode) {
      try { sourceNode.stop(); } catch (e) {}
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      setPauseTime(0); // Reset on finish
      onEnded();
    };

    source.start(0, offset);
    setSourceNode(source);
    setStartTime(audioContext.currentTime - offset);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      if (sourceNode) {
        sourceNode.stop();
        setSourceNode(null);
      }
      // Calculate pause position
      if (audioContext) {
        setPauseTime(audioContext.currentTime - startTime);
      }
      setIsPlaying(false);
    } else {
      playAudio(pauseTime);
    }
  };

  const handleReplay = () => {
    setPauseTime(0);
    playAudio(0);
  };

  const handleSkip = (seconds: number) => {
    if (!audioContext) return;
    let newTime = (audioContext.currentTime - startTime) + seconds;
    
    // If we are currently paused, calculate from pauseTime
    if (!isPlaying) {
       newTime = pauseTime + seconds;
    }

    if (newTime < 0) newTime = 0;
    if (audioBuffer && newTime > audioBuffer.duration) newTime = audioBuffer.duration;

    setPauseTime(newTime);
    if (isPlaying) {
      playAudio(newTime);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    if (audioBuffer) {
      playAudio(0);
    }
    return () => {
      if (sourceNode) {
        try { sourceNode.stop(); } catch(e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer]);

  if (!audioBuffer) return null;

  return (
    <div className="flex flex-col items-center w-full p-6 bg-gray-900 border-t border-gray-700">
      <div className="flex items-center justify-between w-full max-w-sm gap-4">
        
        <button 
          onClick={() => handleSkip(-5)}
          className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-500"
          aria-label="Rewind 5 seconds"
        >
          <SkipBack size={32} />
        </button>

        <button 
          onClick={handlePlayPause}
          className="p-6 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold focus:outline-none focus:ring-4 focus:ring-white"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={48} /> : <Play size={48} />}
        </button>

        <button 
          onClick={() => handleSkip(5)}
          className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-500"
          aria-label="Skip forward 5 seconds"
        >
          <SkipForward size={32} />
        </button>
      </div>

      <button 
        onClick={handleReplay}
        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-400"
        aria-label="Replay analysis"
      >
        <RotateCcw size={20} />
        <span>Replay Full Analysis</span>
      </button>
    </div>
  );
};

export default AudioController;
