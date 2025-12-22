import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { LIVE_MODEL, COLORS } from '../utils/constants';
import { createAudioBlob, decodeBase64ToBytes, decodeAudioData, blobToBase64, playEarcon, setupVoiceProcessingChain, createWavBlob } from '../utils/audioUtils';

interface VisualAssistantProps {
  apiKey: string;
}

// --- Icons (Nano Banana Style) - Decorative, hidden from screen readers ---

const IconCameraSwitch = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

const IconEye = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const IconPlay = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconPause = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconRewind = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
    <polygon points="11 19 2 12 11 5 11 19" />
    <polygon points="22 19 13 12 22 5 22 19" />
  </svg>
);

const IconForward = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
    <polygon points="13 19 22 12 13 5 13 19" />
    <polygon points="2 19 11 12 2 5 2 19" />
  </svg>
);

const IconRestart = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 12a9 9 0 1 1-2.6-6.1L21 9" />
    <path d="M21 3v6h-6" />
  </svg>
);

const IconExit = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconAnalyze = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
  </svg>
);

const IconGlobe = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconChevronDown = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const IconText = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);


// --- Tool Declarations ---

const flashlightTool: FunctionDeclaration = {
  name: 'setFlashlight',
  description: 'Turn the device flashlight (torch) on or off. Use when image is dark or user asks for light.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      on: { type: Type.BOOLEAN, description: 'True to turn on, false to turn off.' },
    },
    required: ['on'],
  },
};

const switchCameraTool: FunctionDeclaration = {
  name: 'switchCamera',
  description: 'Switch between front (user/selfie) and back (environment/world) cameras.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: { 
        type: Type.STRING, 
        enum: ['user', 'environment'],
        description: 'The target camera mode. "user" for front, "environment" for back.' 
      },
    },
  },
};

const privacyModeTool: FunctionDeclaration = {
  name: 'setPrivacyMode',
  description: 'Turn the privacy screen (screen curtain) on or off. This turns the screen black for privacy/battery.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      active: { type: Type.BOOLEAN, description: 'True to enable black screen, false to disable.' },
    },
    required: ['active'],
  },
};

const LANGUAGES = [
    { name: 'English', flag: '🇺🇸' },
    { name: 'Spanish', flag: '🇪🇸' },
    { name: 'French', flag: '🇫🇷' },
    { name: 'German', flag: '🇩🇪' },
    { name: 'Japanese', flag: '🇯🇵' },
    { name: 'Chinese', flag: '🇨🇳' },
    { name: 'Hindi', flag: '🇮🇳' },
    { name: 'Arabic', flag: '🇸🇦' }
];

export const VisualAssistant: React.FC<VisualAssistantProps> = ({ apiKey }) => {
  // State
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  
  // Audio Player & Reader State
  const [playlist, setPlaylist] = useState<{text: string, url: string}[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTextReader, setShowTextReader] = useState(false);
  
  // Settings / Modes
  const [language, setLanguage] = useState<string>('English');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isLowLight, setIsLowLight] = useState(false);
  const [speechRate, setSpeechRate] = useState<'normal' | 'fast'>('normal');
  const [verbosity, setVerbosity] = useState<'brief' | 'detailed'>('detailed');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [privacyMode, setPrivacyMode] = useState(false); // Screen Curtain
  
  // Media Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const readerEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioChainEntryRef = useRef<AudioNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Logic Refs
  const sessionRef = useRef<any>(null); 
  const frameIntervalRef = useRef<number | null>(null);
  const lightCheckIntervalRef = useRef<number | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const wakeLockRef = useRef<any>(null);

  // Gesture/Sensor Refs
  const lastTapRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const lastCompassHapticRef = useRef<number>(0);
  
  // --- Helpers ---
  
  const triggerHaptic = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const playSystemSound = (type: 'on' | 'off' | 'error' | 'success') => {
    if (outputAudioContextRef.current) {
        playEarcon(type, outputAudioContextRef.current);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock error', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.log('Wake Lock release error', err);
      }
    }
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLanguageModal(true);
  };

  const selectLanguage = (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    setLanguage(lang);
    setShowLanguageModal(false);
    triggerHaptic([50]);
  };

  const splitTextIntoSentences = (text: string): string[] => {
      // Split by common punctuation marks, keeping them attached if possible or just split
      // Simple regex to split by . ! ?
      const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
      return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
  };

  // --- Compass Logic ---
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
        // Only active if app is running
        if (!isActive) return;

        // alpha is compass heading (0 = North)
        const heading = event.alpha; 
        if (heading === null) return;

        // Check if facing North (within 10 degrees)
        // 0 degrees or 360 degrees
        const isNorth = heading < 10 || heading > 350;
        
        const now = Date.now();
        // Throttle haptic to every 2 seconds to avoid constant buzzing
        if (isNorth && (now - lastCompassHapticRef.current > 2000)) {
            triggerHaptic(15); // Very subtle tick
            lastCompassHapticRef.current = now;
        }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isActive]);


  // --- Core Session Management ---

  const getMediaStream = async (faceMode: 'user' | 'environment') => {
    const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    };

    try {
        // Attempt 1: Strict mode for mobile back camera to force switch
        if (faceMode === 'environment') {
            return await navigator.mediaDevices.getUserMedia({
                audio: audioConstraints,
                video: {
                    facingMode: { exact: 'environment' },
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 }
                }
            });
        }
        
        // Front camera or default
        return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
    } catch (e) {
        console.warn("Strict camera constraint failed, falling back to ideal", e);
        // Fallback: Relaxed constraints if strict fails (e.g. Desktop, incompatible device)
        return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: {
                facingMode: { ideal: faceMode },
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
    }
  };

  const startSession = async () => {
    setPlaylist([]); // Clear playlist
    setError(null);
    setStatus("INITIALIZING...");
    triggerHaptic([50]); 

    try {
      requestWakeLock();

      // 1. Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Setup Voice Enhancement Chain if not exists
      if (!audioChainEntryRef.current && outputAudioContextRef.current) {
         audioChainEntryRef.current = setupVoiceProcessingChain(outputAudioContextRef.current);
      }

      nextStartTimeRef.current = 0;
      
      // 2. Get Media Stream
      const stream = await getMediaStream(facingMode);
      mediaStreamRef.current = stream;

      // Video Setup
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        videoTrackRef.current = stream.getVideoTracks()[0];
      }

      // 3. Connect to Gemini
      const ai = new GoogleGenAI({ apiKey });
      
      const config = {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [flashlightTool, switchCameraTool, privacyModeTool] }],
          systemInstruction: `
            You are VisionAlly, a visual assistant for the blind.
            Current Camera View: ${facingMode === 'user' ? 'Front-facing (User Face)' : 'World-facing (Environment)'}.
            
            **LANGUAGE**: Speak in ${language}.
            
            **SETTINGS:**
            - Speech Rate: ${speechRate === 'fast' ? 'Speak quickly.' : 'Speak normally.'}
            - Verbosity: ${verbosity === 'brief' ? 'Concise.' : 'Detailed.'}

            **TASKS:**
            1. **Active Framing:** Guide user to center text/objects.
            2. **Text Reading:** READ ALL TEXT VERBATIM.
            3. **Safety:** Warn of obstacles <1m away. Say "STOP" if dangerous.
            4. **Finding:** Scan for user requested items.
            5. **Self-Description:** If in front camera, describe the user's appearance/expression if asked.
            6. **Tools:** 
               - Use 'setFlashlight' if too dark.
               - Use 'switchCamera' if user asks to flip view or see themselves.
               - Use 'setPrivacyMode' if user asks to turn off screen or save battery.

            **INTERACTION:**
            - Be warm but efficient.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
      };

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: config,
        callbacks: {
          onopen: () => {
            if (!mountedRef.current) return;
            setStatus("CONNECTED");
            setIsActive(true);
            triggerHaptic([100, 50, 100]);
            playSystemSound('on');
            
            setupAudioInput(stream, sessionPromise);
            setupVideoProcessing(sessionPromise);
            setupLightDetection();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!mountedRef.current) return;
            await handleServerMessage(message, sessionPromise);
          },
          onclose: () => {
            if (!mountedRef.current) return;
            if (!isAnalyzing) setStatus("DISCONNECTED");
            setIsActive(false);
            triggerHaptic([200]);
            playSystemSound('off');
            releaseWakeLock();
          },
          onerror: (e) => {
            console.error(e);
            setError("Connection Error");
            stopSession();
            triggerHaptic([500]);
            playSystemSound('error');
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError("CAMERA ERROR: CHECK PERMISSIONS");
      setStatus("ERROR");
    }
  };

  // --- Stream Switching ---

  const switchCamera = async (targetMode?: 'user' | 'environment') => {
    triggerHaptic([50]);
    // Toggle if no specific mode requested
    const newMode = targetMode ? targetMode : (facingMode === 'environment' ? 'user' : 'environment');
    
    if (newMode === facingMode) return; // No change needed

    setFacingMode(newMode);
    
    // Stop old tracks immediately
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }

    // Clear video element to free resources/give feedback
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }

    try {
        const newStream = await getMediaStream(newMode);
        mediaStreamRef.current = newStream;
        
        if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            await videoRef.current.play();
            videoTrackRef.current = newStream.getVideoTracks()[0];
        }

        // If active, we need to update the audio input source node
        if (isActive && sessionRef.current && inputAudioContextRef.current) {
            setupAudioInput(newStream, sessionRef.current);
        }
    } catch (e) {
        console.error("Failed to switch camera", e);
        setError("Camera switch failed");
    }
  };

  // --- Processing Loops ---

  const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputAudioContextRef.current) return;
    const ctx = inputAudioContextRef.current;
    
    // Disconnect old source if exists
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
    }

    const source = ctx.createMediaStreamSource(stream);
    mediaStreamSourceRef.current = source;
    
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    
    source.connect(analyser);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Volume viz
      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(pcmData);
      const avg = pcmData.reduce((a, b) => a + b, 0) / pcmData.length;
      setVolume(avg);

      const pcmBlob = createAudioBlob(inputData);
      sessionPromise.then(session => {
         session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const setupVideoProcessing = (sessionPromise: Promise<any>) => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
    // 1 FPS for Video Frames
    frameIntervalRef.current = window.setInterval(() => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = videoRef.current.videoWidth * 0.5; 
        canvasRef.current.height = videoRef.current.videoHeight * 0.5;
        
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                const base64Data = await blobToBase64(blob);
                lastFrameRef.current = base64Data;
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ 
                       media: { mimeType: 'image/jpeg', data: base64Data } 
                    });
                });
            }
        }, 'image/jpeg', 0.5);
    }, 1000);
  };

  const setupLightDetection = () => {
    if (lightCheckIntervalRef.current) clearInterval(lightCheckIntervalRef.current);
    lightCheckIntervalRef.current = window.setInterval(() => {
        if (!canvasRef.current || facingMode === 'user') return; // Don't warn low light on selfie mode usually
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        const p = ctx.getImageData(canvasRef.current.width/2 - 25, canvasRef.current.height/2 - 25, 50, 50).data;
        let total = 0;
        for(let i=0; i<p.length; i+=4) total += (0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2]);
        const avg = total / (p.length/4);
        
        if (avg < 30) {
            if (!isLowLight) setIsLowLight(true);
        } else {
            setIsLowLight(false);
        }
    }, 2000);
  };

  const handleServerMessage = async (message: LiveServerMessage, sessionPromise: Promise<any>) => {
    // 1. Audio Response
    const audioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioString && outputAudioContextRef.current) {
        const audioCtx = outputAudioContextRef.current;
        const audioBytes = decodeBase64ToBytes(audioString);
        
        const startTime = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
        const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        if (audioChainEntryRef.current) source.connect(audioChainEntryRef.current);
        else source.connect(audioCtx.destination);

        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        sourceNodesRef.current.add(source);
        source.onended = () => sourceNodesRef.current.delete(source);
    }

    // 2. Interruption
    if (message.serverContent?.interrupted) {
      sourceNodesRef.current.forEach(node => { try { node.stop(); } catch(e) {} });
      sourceNodesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
    
    // 3. Tool Calls
    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            let result = "ok";
            if (fc.name === 'setFlashlight') {
                const turnOn = (fc.args as any).on;
                toggleFlashlight(turnOn);
            } else if (fc.name === 'switchCamera') {
                const mode = (fc.args as any).mode;
                await switchCamera(mode);
            } else if (fc.name === 'setPrivacyMode') {
                const active = (fc.args as any).active;
                setPrivacyMode(active);
                triggerHaptic(active ? 50 : [50, 50]);
            }

            sessionPromise.then(session => {
                session.sendToolResponse({
                    functionResponses: [{ id: fc.id, name: fc.name, response: { result } }]
                });
            });
        }
    }
  };

  const toggleFlashlight = async (on: boolean) => {
    if (!videoTrackRef.current || facingMode === 'user') return;
    
    // Feature detection to avoid "Unsupported constraint" error
    const capabilities = videoTrackRef.current.getCapabilities() as any;
    if (!capabilities.torch) {
        console.warn("Torch not supported on this device/track");
        return; 
    }

    try {
        await videoTrackRef.current.applyConstraints({ advanced: [{ torch: on } as any] });
        if (on) playSystemSound('success');
    } catch (e) { 
        console.warn("Flashlight error", e); 
    }
  };

  const stopSession = useCallback(() => {
    setIsActive(false);
    releaseWakeLock();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (lightCheckIntervalRef.current) clearInterval(lightCheckIntervalRef.current);

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null; // Full reset to ensure clean restart

    if (sessionRef.current) sessionRef.current = null;

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
            // Fix: Clean up torch constraint ONLY on video tracks and BEFORE stopping
            if (track.kind === 'video') {
                try {
                    track.applyConstraints({ advanced: [{ torch: false } as any] });
                } catch(e) {}
            }
            track.stop();
        });
        mediaStreamRef.current = null;
    }
  }, []);

  const handleStopWithAnalysis = async () => {
    triggerHaptic([50, 50]);
    const finalFrame = lastFrameRef.current;
    stopSession();
    
    if (finalFrame) {
      setIsAnalyzing(true);
      setStatus("ANALYZING...");
      playSystemSound('on'); 
      
      try {
        const ai = new GoogleGenAI({ apiKey });
        const analysisResp = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: finalFrame } },
                    { text: `Detailed analysis: Read all text verbatim. Describe objects, colors, and layout. Speak in ${language}.` }
                ]
            }
        });
        
        const text = analysisResp.text;
        if (text) {
          // Split text into sentences for synchronized highlighting
          const sentences = splitTextIntoSentences(text);
          const newPlaylist: {text: string, url: string}[] = [];

          // Generate audio for each sentence concurrently (with small limit if needed, but Gemini is fast)
          await Promise.all(sentences.map(async (sentence) => {
              try {
                  const ttsResp = await ai.models.generateContent({
                      model: 'gemini-2.5-flash-preview-tts',
                      contents: { parts: [{ text: sentence }] },
                      config: {
                          responseModalities: [Modality.AUDIO],
                          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                      }
                  });
                  const audioData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                  if (audioData) {
                    const bytes = decodeBase64ToBytes(audioData);
                    const int16Array = new Int16Array(bytes.buffer);
                    const float32Array = new Float32Array(int16Array.length);
                    for(let i=0; i<int16Array.length; i++) {
                        float32Array[i] = int16Array[i] / 32768.0;
                    }
                    const wavBlob = createWavBlob(float32Array, 24000);
                    const url = URL.createObjectURL(wavBlob);
                    newPlaylist.push({ text: sentence, url });
                  }
              } catch (e) {
                  console.error("TTS generation failed for segment", e);
              }
          }));

          // Sort playlist to match original sentence order (Promise.all doesn't guarantee completion order, but map index does if we map back)
          // Re-do to ensure order
          const orderedPlaylist: {text: string, url: string}[] = [];
          for (const sentence of sentences) {
              const item = newPlaylist.find(p => p.text === sentence);
              if (item) orderedPlaylist.push(item);
          }

          if (orderedPlaylist.length > 0) {
              setPlaylist(orderedPlaylist);
              setCurrentTrackIndex(0);
              // Auto-play via effect
              setShowTextReader(true); // Default to showing text for analysis
          }
        }
      } catch (e) {
        playSystemSound('error');
        setError("Analysis Failed");
      } finally {
        setIsAnalyzing(false);
        setStatus("READY");
      }
    }
  };

  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnalyzing(false);
    stopSession();
    if(audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setPlaylist([]);
    setCurrentTrackIndex(0);
    setShowTextReader(false);
    setStatus("READY");
    triggerHaptic([50, 50, 50]);
    playSystemSound('off');
  };

  const handleAudioControl = (action: 'play' | 'pause' | 'rewind' | 'forward' | 'restart') => {
      if(!audioRef.current) return;
      triggerHaptic(20);
      switch(action) {
          case 'play': 
            audioRef.current.play(); 
            setIsPlayingAudio(true); 
            break;
          case 'pause': 
            audioRef.current.pause(); 
            setIsPlayingAudio(false); 
            break;
          case 'rewind': 
            if (Number.isFinite(audioRef.current.currentTime)) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); 
            }
            break;
          case 'forward': 
             if (Number.isFinite(audioRef.current.currentTime) && Number.isFinite(audioRef.current.duration)) {
                audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5); 
             }
            break;
          case 'restart': 
            setCurrentTrackIndex(0);
            if (playlist.length > 0) {
                 // Trigger effect re-run implicitly or force update? 
                 // Changing index to same value won't trigger effect if it's 0. 
                 // So we manually reset current time.
                 audioRef.current.currentTime = 0;
                 audioRef.current.play();
                 setIsPlayingAudio(true);
            }
            break;
      }
  };
  
  const handleTrackEnded = () => {
      if (currentTrackIndex < playlist.length - 1) {
          setCurrentTrackIndex(prev => prev + 1);
      } else {
          setIsPlayingAudio(false);
      }
  };

  // --- Gestures ---

  const handleTouchStart = (e: React.TouchEvent) => {
    // Disable gestures when modal is open
    if(showLanguageModal) return;

    const now = Date.now();
    touchStartYRef.current = e.touches[0].clientY;
    
    // Double Tap Logic
    if (now - lastTapRef.current < 300) {
        triggerHaptic([50]);
        if (isActive) handleStopWithAnalysis();
        else if (!isAnalyzing && playlist.length === 0) startSession();
        lastTapRef.current = 0;
    } else {
        lastTapRef.current = now;
    }
  };

  // Auto-scroll reader to active sentence
  useEffect(() => {
      if (showTextReader && document.getElementById(`sentence-${currentTrackIndex}`)) {
          document.getElementById(`sentence-${currentTrackIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [currentTrackIndex, showTextReader]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
        mountedRef.current = false;
        stopSession();
        playlist.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [stopSession, playlist]);

  return (
    <div 
        className="flex flex-col h-screen w-full bg-black text-white relative overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        role="application"
        aria-label="Vision Assistant Application. Double tap screen to toggle session, or use controls below."
    >
      {/* Video Viewfinder - Hidden in Privacy Mode - Hidden from Screen Reader */}
      <div className={`absolute inset-0 z-0 ${privacyMode ? 'opacity-0' : 'opacity-50'} transition-opacity duration-300`} aria-hidden="true">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Audio Element for Playback */}
      {playlist.length > 0 && (
          <audio 
            ref={audioRef} 
            src={playlist[currentTrackIndex]?.url} 
            onEnded={handleTrackEnded} 
            onPause={() => setIsPlayingAudio(false)}
            onPlay={() => setIsPlayingAudio(true)}
            autoPlay
          />
      )}

      {/* Privacy Mode Overlay - Hidden from Screen Reader unless interactive */}
      {privacyMode && (
         <div className="absolute inset-0 z-0 bg-black flex items-center justify-center opacity-100 pointer-events-none" aria-hidden="true">
            <span className="text-gray-800 text-6xl">🔒</span>
         </div>
      )}

      {/* Language Modal Overlay - Accessible Dialog */}
      {showLanguageModal && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Select Language">
              <h2 className="text-6xl font-bold text-yellow-400 mb-8 text-center">Select Language</h2>
              <div className="flex flex-col gap-6">
                  {LANGUAGES.map((lang) => (
                      <button 
                        key={lang.name}
                        onClick={(e) => selectLanguage(e, lang.name)}
                        className={`p-10 rounded-3xl text-5xl font-bold border-4 flex items-center justify-between active:scale-95 transition-transform ${language === lang.name ? 'bg-yellow-900 border-yellow-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-300'}`}
                        aria-label={`Select ${lang.name}`}
                      >
                          <span>{lang.name}</span>
                          <span className="text-7xl" aria-hidden="true">{lang.flag}</span>
                      </button>
                  ))}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowLanguageModal(false); }}
                className="mt-8 p-8 bg-red-600 text-white text-5xl font-bold rounded-2xl border-4 border-red-400"
                aria-label="Cancel Language Selection"
              >
                  Cancel
              </button>
          </div>
      )}

      {/* Main UI */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full p-4 pb-8 safe-area-pb">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center px-2 py-2 gap-2" role="banner">
            <button onClick={(e) => {e.stopPropagation(); setPrivacyMode(!privacyMode);}} 
                className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 p-5 rounded-full bg-gray-900 border-4 border-gray-700 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors shadow-lg" 
                aria-label={privacyMode ? "Disable Privacy Screen (Turn Screen On)" : "Enable Privacy Screen (Turn Screen Off)"}>
                {privacyMode ? <IconEyeOff /> : <IconEye />}
            </button>
            
            {/* Center Title or Exit Button */}
            {(isActive || isAnalyzing || playlist.length > 0) ? (
               <button 
                 onClick={handleExit}
                 className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 p-5 rounded-full bg-red-600 text-white border-4 border-red-400 shadow-lg active:scale-95 transition-transform"
                 aria-label="Exit Session and Return to Home"
               >
                 <IconExit />
               </button>
            ) : (
               <h1 className="text-3xl md:text-5xl font-extrabold text-yellow-400 tracking-wider drop-shadow-md truncate mx-2" aria-label="Vision Ally">VisionAlly</h1>
            )}

            <button onClick={(e) => {e.stopPropagation(); switchCamera();}} 
                className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 p-5 rounded-full bg-gray-900 border-4 border-gray-700 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors shadow-lg"
                aria-label={`Switch Camera. Current: ${facingMode === 'environment' ? 'Back Facing' : 'Front Facing'}`}>
                <IconCameraSwitch />
            </button>
        </div>
        
        {/* Status Display - Live Region */}
        {(isActive || isAnalyzing || error) && status !== "Ready" && (
            <div 
                className={`text-4xl font-mono font-bold px-8 py-6 rounded-3xl inline-block transition-colors border-4 shadow-xl mb-4 ${isActive ? 'bg-green-900 text-green-100 border-green-500' : 'bg-gray-800 text-gray-100 border-gray-500'}`}
                role="status"
                aria-live="polite"
            >
                {status}
            </div>
        )}
        
        {/* Low Light Warning - Alert */}
        {(isLowLight && facingMode === 'environment') && 
            <div 
                className="text-3xl font-bold bg-yellow-900 text-yellow-100 border-4 border-yellow-500 px-8 py-4 rounded-3xl inline-block mx-2 animate-pulse mb-4"
                role="alert"
            >
                ⚠️ LOW LIGHT
            </div>
        }
        
        {/* Error Notification - Alert */}
        {error && 
            <div 
                className="bg-red-900 text-white text-3xl p-6 rounded-3xl font-bold border-4 border-red-500 shadow-2xl animate-bounce mb-4"
                role="alert"
            >
                {error}
            </div>
        }

        {/* Visualizer (Center) or Audio Controls */}
        <div className="flex-1 flex items-center justify-center w-full my-4 relative">
            {playlist.length > 0 ? (
                showTextReader ? (
                    // Reader View
                    <div className="w-full h-[50vh] md:h-[60vh] max-w-3xl bg-black border-4 border-yellow-500 rounded-[3rem] p-6 overflow-y-auto shadow-2xl flex flex-col gap-6" role="region" aria-label="Text Reader">
                        {playlist.map((item, idx) => (
                            <p 
                                key={idx} 
                                id={`sentence-${idx}`}
                                className={`text-4xl md:text-5xl font-bold p-6 rounded-3xl transition-all leading-relaxed ${idx === currentTrackIndex ? 'bg-yellow-400 text-black shadow-lg scale-[1.02]' : 'text-gray-500 bg-gray-900'}`}
                            >
                                {item.text}
                            </p>
                        ))}
                         <div ref={readerEndRef} className="h-10" />
                    </div>
                ) : (
                    // Regular Audio Controls
                    <div className="w-full max-w-2xl flex flex-col items-center gap-6 p-6 bg-gray-900/90 rounded-[3rem] border-4 border-yellow-500 shadow-2xl backdrop-blur-md" role="region" aria-label="Audio Player Controls">
                        <button onClick={(e) => {e.stopPropagation(); handleAudioControl('restart');}} className="w-full py-6 bg-blue-600 text-white rounded-2xl text-3xl font-bold border-4 border-blue-400 active:bg-blue-700 mb-2 flex items-center justify-center gap-4 shadow-lg">
                            <div className="w-10 h-10"><IconRestart /></div> Start Again
                        </button>
                        <div className="flex justify-center items-center gap-6 w-full">
                            <button onClick={(e) => {e.stopPropagation(); handleAudioControl('rewind');}} className="flex-1 aspect-square p-6 bg-gray-800 rounded-full border-4 border-gray-600 active:bg-gray-700 text-white shadow-lg flex items-center justify-center" aria-label="Rewind 5 seconds">
                                <IconRewind />
                            </button>
                            <button onClick={(e) => {e.stopPropagation(); handleAudioControl(isPlayingAudio ? 'pause' : 'play');}} className="w-32 h-32 p-8 bg-yellow-400 rounded-full border-8 border-yellow-200 text-black active:scale-95 transition-transform shadow-xl flex items-center justify-center" aria-label={isPlayingAudio ? "Pause Audio" : "Play Audio"}>
                                {isPlayingAudio ? <IconPause /> : <IconPlay />}
                            </button>
                            <button onClick={(e) => {e.stopPropagation(); handleAudioControl('forward');}} className="flex-1 aspect-square p-6 bg-gray-800 rounded-full border-4 border-gray-600 active:bg-gray-700 text-white shadow-lg flex items-center justify-center" aria-label="Forward 5 seconds">
                                <IconForward />
                            </button>
                        </div>
                    </div>
                )
            ) : (
                (isActive || isAnalyzing) && !error && !privacyMode && (
                    <div className={`w-64 h-64 rounded-full border-[12px] flex items-center justify-center transition-all shadow-[0_0_80px_rgba(255,255,255,0.2)] bg-black/50 ${isAnalyzing ? 'border-blue-500 animate-pulse' : 'border-yellow-500'}`}
                        style={{ transform: `scale(${1 + volume / 100})` }}
                        aria-hidden="true"
                    >
                        <div className="w-32 h-32 text-white/90">
                            {isAnalyzing ? <IconAnalyze /> : (facingMode === 'user' ? <IconEye /> : <IconCameraSwitch />)}
                        </div>
                    </div>
                )
            )}
            
            {/* Show Text Toggle Button - Floating or Positioned */}
            {playlist.length > 0 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowTextReader(!showTextReader); }}
                    className={`absolute -bottom-24 right-4 w-20 h-20 md:w-24 md:h-24 p-5 rounded-full border-4 shadow-xl z-20 ${showTextReader ? 'bg-yellow-400 border-yellow-200 text-black' : 'bg-gray-800 border-gray-600 text-white'}`}
                    aria-label={showTextReader ? "Hide Text Reader" : "Show Text Reader"}
                >
                    <IconText />
                </button>
            )}
        </div>

        {/* Bottom Controls */}
        <div className="w-full space-y-4 px-2">
            
            {!isActive && !isAnalyzing && playlist.length === 0 ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); startSession(); }}
                    className="w-full h-80 rounded-[4rem] bg-yellow-400 text-black shadow-[0_0_60px_rgba(250,204,21,0.6)] active:scale-95 transition-transform flex flex-col items-center justify-center gap-6 border-[12px] border-yellow-200"
                    aria-label="Start Vision Assistant. Tap to grant camera permissions and begin."
                >
                    <span className="text-6xl md:text-[7rem] font-black tracking-tighter leading-none" aria-hidden="true">START</span>
                    <span className="text-4xl md:text-6xl font-black bg-black text-yellow-400 px-8 py-6 md:px-12 md:py-8 rounded-[2rem] text-center border-4 border-black shadow-2xl" aria-hidden="true">Tap to Allow Camera</span>
                </button>
            ) : (
                playlist.length === 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); isAnalyzing ? undefined : handleStopWithAnalysis(); }}
                        disabled={isAnalyzing}
                        className={`w-full h-80 rounded-[4rem] text-white text-[5rem] font-black shadow-2xl active:scale-95 transition-transform flex flex-col items-center justify-center gap-6 border-[12px] ${isAnalyzing ? 'bg-gray-800 border-gray-600' : 'bg-red-600 border-red-400'}`}
                        aria-label={isAnalyzing ? "Processing analysis, please wait." : "Analyze current view. Double tap to stop and describe."}
                    >
                        {isAnalyzing ? (
                            <div className="w-48 h-48 animate-spin" aria-hidden="true"><IconAnalyze /></div>
                        ) : <span aria-hidden="true">ANALYZE</span>}
                        <span className="text-3xl font-bold opacity-80 bg-black/40 px-6 py-2 rounded-xl" aria-hidden="true">{isAnalyzing ? 'Processing...' : 'Tap for Details'}</span>
                    </button>
                )
            )}
            
            {/* Playback Controls (if Reader is active, show small controls at bottom instead of analyze button) */}
            {playlist.length > 0 && showTextReader && (
                 <div className="w-full h-32 flex items-center justify-between gap-4 bg-gray-900 rounded-[2rem] p-4 border-4 border-gray-700">
                    <button onClick={(e) => {e.stopPropagation(); handleAudioControl('rewind');}} className="h-full aspect-square bg-gray-800 rounded-2xl border-2 border-gray-600 flex items-center justify-center text-white" aria-label="Rewind">
                        <div className="w-10 h-10"><IconRewind /></div>
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); handleAudioControl(isPlayingAudio ? 'pause' : 'play');}} className="h-full flex-1 bg-yellow-400 rounded-2xl border-4 border-yellow-200 flex items-center justify-center text-black" aria-label={isPlayingAudio ? "Pause" : "Play"}>
                        <div className="w-12 h-12">{isPlayingAudio ? <IconPause /> : <IconPlay />}</div>
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); handleAudioControl('forward');}} className="h-full aspect-square bg-gray-800 rounded-2xl border-2 border-gray-600 flex items-center justify-center text-white" aria-label="Forward">
                         <div className="w-10 h-10"><IconForward /></div>
                    </button>
                 </div>
            )}

            {/* Quick Settings - Only show on start screen */}
            {!isActive && !isAnalyzing && playlist.length === 0 && (
                <div className="grid grid-cols-2 gap-4 w-full" role="group" aria-label="Settings">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSpeechRate(r => r === 'normal' ? 'fast' : 'normal'); }}
                        className="py-6 md:py-8 bg-gray-900 rounded-3xl border-4 border-gray-700 text-2xl md:text-3xl font-bold active:bg-gray-800 shadow-lg text-white"
                        aria-label={`Speech Rate: ${speechRate}. Tap to toggle.`}
                    >
                        {speechRate === 'fast' ? '🐇 Fast' : '🐢 Norm'}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setVerbosity(v => v === 'brief' ? 'detailed' : 'brief'); }}
                        className="py-6 md:py-8 bg-gray-900 rounded-3xl border-4 border-gray-700 text-2xl md:text-3xl font-bold active:bg-gray-800 shadow-lg text-white"
                        aria-label={`Verbosity: ${verbosity}. Tap to toggle.`}
                    >
                        {verbosity === 'brief' ? '📝 Brief' : '📖 Detail'}
                    </button>
                    <button 
                        onClick={toggleLanguage}
                        className="col-span-2 py-6 md:py-8 bg-gray-900 rounded-3xl border-4 border-gray-700 text-2xl md:text-4xl font-bold active:bg-gray-800 shadow-lg text-white flex items-center justify-between px-6 md:px-10"
                        aria-haspopup="dialog"
                        aria-label={`Language: ${language}. Tap to change.`}
                    >
                        <div className="flex items-center gap-4" aria-hidden="true">
                            <span className="text-4xl md:text-5xl">{LANGUAGES.find(l => l.name === language)?.flag}</span> 
                            {language}
                        </div>
                        <div className="w-8 h-8 md:w-12 md:h-12 text-gray-400" aria-hidden="true"><IconChevronDown /></div>
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};