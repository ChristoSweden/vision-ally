import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera as CameraIcon, RefreshCw, VideoOff } from 'lucide-react';

interface CameraProps {
  onStreamReady: (ready: boolean) => void;
  isActive: boolean;
}

export interface CameraHandle {
  captureFrames: (count: number, intervalMs: number) => Promise<string[]>;
  captureSingleFrame: () => Promise<string>;
  startRecording: () => void;
  stopRecording: () => Promise<{ base64: string; mimeType: string; blob: Blob; url: string }>;
  zoomIn: () => void;
  zoomOut: () => void;
}

const Camera = forwardRef<CameraHandle, CameraProps>(({ onStreamReady, isActive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const zoomLevelRef = useRef<number>(1);
  const zoomCapabilitiesRef = useRef<{ min: number, max: number, step: number } | null>(null);

  const [errorType, setErrorType] = useState<'PERMISSION' | 'INSECURE' | 'NOT_FOUND' | 'IN_USE' | 'UNKNOWN' | null>(null);

  // Helper to apply zoom
  const applyZoom = async (newZoom: number) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const caps = zoomCapabilitiesRef.current;
    if (!caps) return;

    // Clamp value
    const clampedZoom = Math.min(Math.max(newZoom, caps.min), caps.max);
    zoomLevelRef.current = clampedZoom;

    try {
      await track.applyConstraints({
        advanced: [{ zoom: clampedZoom } as any]
      });
    } catch (e) {
      console.warn("Zoom not supported directly:", e);
    }
  };

  useImperativeHandle(ref, () => ({
    captureSingleFrame: async () => {
      return waitForVideoAndCapture();
    },
    captureFrames: async (count: number, intervalMs: number) => {
      const frames: string[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const frame = await waitForVideoAndCapture();
          if (frame) frames.push(frame);
        } catch (e) { console.warn("Frame skip", e); }
        
        if (i < count - 1) {
          await new Promise(r => setTimeout(r, intervalMs));
        }
      }
      return frames;
    },
    startRecording: () => {
      if (!streamRef.current) return;
      chunksRef.current = [];
      try {
        const options = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
          ? { mimeType: 'video/webm; codecs=vp9' } 
          : MediaRecorder.isTypeSupported('video/mp4') 
            ? { mimeType: 'video/mp4' } 
            : undefined;

        const recorder = new MediaRecorder(streamRef.current, options);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.error("Failed to start recording", e);
      }
    },
    stopRecording: async () => {
      return new Promise((resolve, reject) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
          reject("Recorder inactive");
          return;
        }

        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Extract pure base64
            const base64 = base64data.split(',')[1];
            resolve({ base64, mimeType: blob.type, blob, url });
          };
          reader.readAsDataURL(blob);
        };

        recorder.stop();
      });
    },
    zoomIn: () => {
      if (!zoomCapabilitiesRef.current) return;
      const step = (zoomCapabilitiesRef.current.max - zoomCapabilitiesRef.current.min) / 10 || 0.5;
      applyZoom(zoomLevelRef.current + step);
    },
    zoomOut: () => {
        if (!zoomCapabilitiesRef.current) return;
        const step = (zoomCapabilitiesRef.current.max - zoomCapabilitiesRef.current.min) / 10 || 0.5;
        applyZoom(zoomLevelRef.current - step);
    }
  }));

  const waitForVideoAndCapture = async (attempts = 5): Promise<string> => {
    if (!videoRef.current || !canvasRef.current) return '';
    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return captureFrame(video);
    }

    if (attempts > 0) {
      await new Promise(r => setTimeout(r, 100));
      return waitForVideoAndCapture(attempts - 1);
    }
    
    throw new Error("Video not ready");
  };

  const captureFrame = (video: HTMLVideoElement): string => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Low quality JPEG for faster network transmission
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    return dataUrl.split(',')[1]; 
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    if (!isActive) return;
    
    // Reset error state
    setErrorType(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorType('UNKNOWN');
      onStreamReady(false);
      return;
    }

    try {
      // Stop any existing stream first
      stopStream();

      let stream: MediaStream | null = null;
      try {
          stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            zoom: true // Request zoom capability
          } as any, 
          audio: true 
        });
      } catch (e) {
        // Fallback to any camera
        console.log("Fallback to basic camera constraints");
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (stream) {
        streamRef.current = stream;
        
        // Detect Zoom Capabilities
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities && 'zoom' in capabilities) {
          zoomCapabilitiesRef.current = {
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            step: capabilities.zoom.step
          };
          zoomLevelRef.current = capabilities.zoom.min;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure we play only after srcObject is set
          await videoRef.current.play().catch(e => console.error("Play error:", e));
          onStreamReady(true);
        }
      } else {
        throw new Error("No stream created");
      }

    } catch (err: any) {
      console.error("Camera Error:", err);
      onStreamReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           setErrorType('PERMISSION');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
           setErrorType('NOT_FOUND');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
           setErrorType('IN_USE');
      } else {
           setErrorType('UNKNOWN');
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopStream();
    }
    
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  if (errorType) {
    return (
       <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-8 text-center space-y-4">
        <VideoOff size={64} />
        <h3 className="text-xl font-bold text-white">Camera Unavailable</h3>
        <p className="max-w-xs text-sm">{errorType === 'PERMISSION' ? "Please allow camera access in browser settings." : "Could not access the back camera."}</p>
        <button 
          onClick={() => startCamera()}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors border border-gray-700"
        >
          <RefreshCw size={20} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black z-10">
          <CameraIcon size={48} className="opacity-50" />
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

Camera.displayName = 'Camera';

export default Camera;