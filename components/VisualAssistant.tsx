import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';
import { SubscriptionModal } from './SubscriptionModal';
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

const IconCamera = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
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

const IconStop = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
    <rect x="5" y="5" width="14" height="14" />
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
    <path d="m6 9 6 6 6-6" />
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

const IconMapPin = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconGrid = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const IconSearch = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const IconBarcode = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 5v14" />
    <path d="M8 5v14" />
    <path d="M12 5v14" />
    <path d="M17 5v14" />
    <path d="M21 5v14" />
  </svg>
);

const IconFileText = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);


const IconMic = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);


const IconTrafficLight = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect width="6" height="16" x="9" y="4" rx="3" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="17" r="1.5" />
  </svg>
);

const IconZoom = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const IconSocial = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 8a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8Z" />
    <circle cx="8" cy="12" r="2" />
    <path d="M16 12h.01" />
  </svg>
);

const IconKitchen = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 10V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6" />
    <path d="M3 10h18" />
    <path d="M4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10" />
    <path d="M12 14v4" />
  </svg>
);

const IconTransit = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect width="16" height="16" x="4" y="2" rx="2" />
    <path d="M4 14h16" />
    <path d="M8 18v2" />
    <path d="M16 18v2" />
    <path d="M7 6h.01" />
    <path d="M17 6h.01" />
  </svg>
);

const IconLaundry = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="13" r="5" />
    <path d="M12 8V5" />
    <path d="M12 21v-3" />
    <path d="M5 13H2" />
    <path d="M22 13h-3" />
  </svg>
);

const IconAppliance = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect width="18" height="12" x="3" y="6" rx="2" />
    <path d="M7 12h10" />
    <path d="M7 15h4" />
  </svg>
);

const IconPathfinder = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const IconPrice = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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

const rememberFaceTool: FunctionDeclaration = {
  name: 'rememberFace',
  description: 'Memorize the current visible person with a customized name. Use when user says "This is [Name]".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The name of the person to remember.' },
    },
    required: ['name'],
  },
};

const monitorTrafficLightTool: FunctionDeclaration = {
  name: 'monitorTrafficLight',
  description: 'Enable or disable haptic traffic light monitoring for safe crossing. Use when user asks to "Watch the light" or "Help me cross".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      active: { type: Type.BOOLEAN, description: 'True to start monitoring, false to stop.' },
    },
    required: ['active'],
  },
};

const triggerHapticTool: FunctionDeclaration = {
  name: 'triggerHaptic',
  description: 'Vibrate the device with a specific pattern. Use for "Go" signals, obstacle warnings, or radar feedback.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: { type: Type.STRING, enum: ['pulse', 'double', 'long', 'rapid'], description: 'The vibration pattern.' },
    },
    required: ['pattern'],
  },
};

const rememberLandmarkTool: FunctionDeclaration = {
  name: 'rememberLandmark',
  description: 'Save a specific indoor location or landmark. Use when user says "This is the [Name]".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The name of the landmark (e.g., Front Door).' },
    },
    required: ['name'],
  },
};

const getLocationTool: FunctionDeclaration = {
  name: 'getLocation',
  description: 'Get the users current GPS coordinates and address to answer "Where am I?" questions.',
  parameters: { type: Type.OBJECT, properties: {} },
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
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);

  // Audio Player & Reader State
  const [playlist, setPlaylist] = useState<{ text: string, url: string }[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTextReader, setShowTextReader] = useState(false);

  // Settings / Modes
  const [language, setLanguage] = useState<string>('English');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [faces, setFaces] = useState<{ name: string, description: string }[]>([]);
  const [isLowLight, setIsLowLight] = useState(false);
  const [speechRate, setSpeechRate] = useState<'normal' | 'fast'>('normal');
  const [verbosity, setVerbosity] = useState<'brief' | 'detailed'>('detailed');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [privacyMode, setPrivacyMode] = useState(false); // Screen Curtain
  const [isEdgeMode, setIsEdgeMode] = useState(false); // Edge Detection Visual Filter
  const [isFindingMode, setIsFindingMode] = useState(false); // Object Hunter Mode
  const [targetObject, setTargetObject] = useState<string>('');
  const [showFinderModal, setShowFinderModal] = useState(false);
  const [isDocumentMode, setIsDocumentMode] = useState(false); // New Phase 2 Mode
  const [isCrossingMode, setIsCrossingMode] = useState(false); // New Phase 3 Mode
  const [isZoomMode, setIsZoomMode] = useState(false); // New Phase 3 Mode (Expiry/Medication)
  const [landmarks, setLandmarks] = useState<{ name: string, description: string }[]>([]);
  const [specialMode, setSpecialMode] = useState<'none' | 'social' | 'kitchen' | 'transit' | 'laundry' | 'appliance' | 'shop'>('none');
  const [isPathfinderMode, setIsPathfinderMode] = useState(false); // New Phase 6 Pathfinder Mode
  const [showToolbox, setShowToolbox] = useState(false); // v1.1.0 Simplified UI Toolbox

  // Subscription Hook & State
  const { userTier, credits, isFeatureLocked, spendCredit } = useSubscription();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState<string | undefined>(undefined);

  const checkFeatureAccess = (featureId: string, name: string) => {
    if (isFeatureLocked(featureId)) {
      setLockedFeatureName(name);
      setIsSubModalOpen(true);
      triggerHaptic([100, 50, 100]); // "Locked" haptic pattern
      return false;
    }
    return true;
  };

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

  const announceInterface = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any pending UI announcements
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerHaptic = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const playSystemSound = (type: 'on' | 'off' | 'error' | 'success' | 'sonar') => {
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
    announceInterface("Opening Language Selection");
  };

  const selectLanguage = (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    setLanguage(lang);
    setShowLanguageModal(false);
    triggerHaptic([50]);
    announceInterface(`Language set to ${lang}`);
  };

  const splitTextIntoSentences = (text: string): string[] => {
    // Split by common punctuation marks, keeping them attached if possible or just split
    // Simple regex to split by . ! ?
    const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
  };

  const saveFace = (name: string, description: string) => {
    const newFaces = [...faces, { name, description }];
    setFaces(newFaces);
    localStorage.setItem('visionally_faces', JSON.stringify(newFaces));
    playSystemSound('success');
  };

  const saveLandmark = (name: string, description: string) => {
    const newLandmarks = [...landmarks, { name, description }];
    setLandmarks(newLandmarks);
    localStorage.setItem('visionally_landmarks', JSON.stringify(newLandmarks));
    playSystemSound('success');
  };

  // --- Leveling Haptics (Accessibility) ---
  useEffect(() => {
    if (!isDocumentMode && specialMode !== 'shop' && !isZoomMode) return;

    let lastPulse = 0;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!e.beta || !e.gamma) return;

      const isLevel = Math.abs(e.beta) < 10 && Math.abs(e.gamma) < 10;
      const now = Date.now();

      if (isLevel && now - lastPulse > 1000) {
        triggerHaptic(30); // Single subtle tap when level
        lastPulse = now;
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isDocumentMode, specialMode, isZoomMode]);

  useEffect(() => {
    const savedFaces = localStorage.getItem('visionally_faces');
    if (savedFaces) {
      try { setFaces(JSON.parse(savedFaces)); } catch (e) { }
    }
    const savedLandmarks = localStorage.getItem('visionally_landmarks');
    if (savedLandmarks) {
      try { setLandmarks(JSON.parse(savedLandmarks)); } catch (e) { }
    }
  }, []);

  const handleGetLocation = async (): Promise<any> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ error: "Geolocation not supported" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          // Simple reverse geocode guess or just return coords
          // For a real app we'd call an API, here we just return coords
          // and let the LLM use its knowledge or we can try a fetch if allowed.
          // We'll just return raw coords for the LLM to process or pretend to know.
          // Actually, let's try a free open street map reverse geocode if possible, 
          // but to keep it simple and robust:
          resolve({ latitude, longitude, accuracy: pos.coords.accuracy });
        },
        (err) => resolve({ error: err.message }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const startFinding = (objectName: string) => {
    setTargetObject(objectName);
    setIsFindingMode(true);
    setShowFinderModal(false);
    triggerHaptic([50, 100, 50]);
    // If session active, we might need to send a message to update context, 
    // but the best way is to restart or send a prompt. 
    // With Live API, we can just start speaking.
    if (isActive && sessionRef.current) {
      // We rely on the system instruction change on next connect, 
      // OR we can send a text part to prompt the switch.
      // Re-connecting is safer to "swap" the system prompt logic.
      stopSession();
      setTimeout(() => startSessionWithConfig(objectName), 500);
    } else {
      startSessionWithConfig(objectName);
    }
  };


  const startSessionWithConfig = async (findingTarget?: string) => {
    // Wrapper to use current state or overrides
    startSession(findingTarget);
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
      // Attempt 1: Moderate constraints (Safari compatible)
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: {
          facingMode: faceMode, // Relaxed: no 'exact' for better iOS/Safari support
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch (e) {
      console.warn("Standard camera constraint failed, falling back to minimal", e);
      // Fallback: Minimalist constraints
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: true
      });
    }
  };

  const startSession = async (findingTargetOverride?: string) => {
    const findingTarget = findingTargetOverride || (isFindingMode ? targetObject : null);
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
        tools: [{ functionDeclarations: [flashlightTool, switchCameraTool, privacyModeTool, getLocationTool, rememberFaceTool, monitorTrafficLightTool, triggerHapticTool, rememberLandmarkTool] }],
        systemInstruction: `
            You are VisionAlly, an immersive spatial companion for the blind.
            Current Perspective: ${facingMode === 'user' ? 'Looking at you' : 'Looking out into the world'}.
            
            **VOICE-FIRST INTERACTION**: Treat the user's speech as priority. 
            If they ask "What's this?" or "Where am I?", respond immediately and naturally.
            Always maintain a "listening" posture—be ready to answer follow-up questions about the environment.
            
            **IMMERSIVE PERSONA**: Never say "I see a picture" or "In this image." 
            Talk as if you are standing next to the user. 
            Use spatial language like "The hallway extends 5 meters ahead" or "There is a door on your 3 o'clock."
            
            **CRITICAL SAFETY RULE**: ALWAYS ANALYZE FROM NEAR-TO-FAR (GROUND-UP). 
            Prioritize the GROUND and FOREGROUND (0-2 meters). 
            Warn about hazards (cables, spills, steps) immediately.

            **MODE**: ${findingTarget ? `OBJECT HUNTER ACTIVE. Target: "${findingTarget}"` : isCrossingMode ? "SAFE CROSSING MONITOR ACTIVE" : isPathfinderMode ? "PATHFINDER NAVIGATION ACTIVE" : specialMode !== 'none' ? `${specialMode.toUpperCase()} ASSISTANT ACTIVE` : "General Assistant"}
            
            **KNOWN PEOPLE**: ${faces.length > 0 ? faces.map(f => `${f.name} (${f.description})`).join(', ') : "None registered yet."}
            **KNOWN LANDMARKS**: ${landmarks.length > 0 ? landmarks.map(l => `${l.name} (${l.description})`).join(', ') : "None registered yet."}
            
            **LANGUAGE**: Speak in ${language}.
            
            **SETTINGS:**
            - Speech Rate: ${speechRate === 'fast' ? 'Speak quickly.' : 'Speak normally.'}
            - Verbosity: ${verbosity === 'brief' ? 'Concise.' : 'Detailed.'}

            ${findingTarget ? `
            **PRIORITY TASK (OBJECT HUNTER):** 
            1. SCAN ONLY for: "${findingTarget}". Ignore everything else.
            2. Give "Hot/Cold" feedback based on visibility and proximity.
            3. "Cold" = Not visible. "Warmer" = Partially visible/far. "HOT" = Clearly visible/close.
            4. If found, say "FOUND IT" and give precise clock-face directions (e.g., "At 2 o'clock").
            ` : isCrossingMode ? `
            **PRIORITY TASK (SAFE CROSSING):**
            1. Monitor the pedestrian traffic signal.
            2. Describe changes (e.g., "Hand is flashing," "Person is green").
            3. Warn of oncoming cars if possible.
            4. Focus 100% on safety and the signal.
            ` : isDocumentMode ? `
            **PRIORITY TASK (DOCUMENT SCANNER):**
            1. Help user align the page (e.g., "Move up", "Rotate clockwise").
            2. Once centered and clear, say "FRAME LOCKED" and read the text VERBATIM from top to bottom.
            3. Ignore background objects. Focus on the paper.
            ` : isZoomMode ? `
            **PRIORITY TASK (EXPIRY/MEDICATION):**
            1. Scan for expiry dates or medicine names.
            2. Read fine print precisely (Zoom is active).
            3. Alert if a date is in the past.
            ` : isPathfinderMode ? `
            **PRIORITY TASK (PATHFINDER):**
            1. SCAN for clear walking paths in complex/cluttered areas.
            2. Identify a "corridor of space" where the user can safely step.
            3. Use 'triggerHaptic' pattern "pulse" when the path is clear.
            4. Say "Path clear ahead" or "Obstacle at 11 o'clock" to guide movement.
            5. Prioritize the area directly in front of the user's feet.
            ` : specialMode === 'social' ? `
            **PRIORITY TASK (SOCIAL INTEL):**
            1. Describe facial expressions and body language of people in view.
            2. Tell user if they are being looked at.
            3. Note emotions (Smiling, Confused, Bored).
            ` : specialMode === 'kitchen' ? `
            **PRIORITY TASK (KITCHEN SAFETY):**
            1. Monitor burners (on/off).
            2. Alert if water is boiling or toast is browning.
            3. Guide user to hot surfaces carefully.
                        ` : specialMode === 'shop' ? `
            **PRIORITY TASK (SHOPPING ALLY):**
            1. SCAN for price tags, shelf labels, and barcodes.
            2. Read the price AND the product name together (e.g., "Milk is 2 dollars 50").
            3. Help user find specific brands or products on a shelf.
            4. Keep the image stable—warn if it's too blurry to read.
            ` : specialMode === 'transit' ? `
            **PRIORITY TASK (TRANSIT SCOUT):**
            1. Scan specifically for bus numbers and train destination signs in the background.
            2. Announce any route numbers detected immediately.
            ` : specialMode === 'laundry' ? `
            **PRIORITY TASK (LAUNDRY CARE):**
            1. Identify care symbols on clothing labels.
            2. Look for stains or marks on garments.
            3. Describe fabric colors and patterns precisely.
            ` : specialMode === 'appliance' ? `
            **PRIORITY TASK (APPLIANCE EYE):**
            1. Read digital displays (LED/LCD) on appliances like washing machines or microwaves.
            2. Report remaining time or current settings.
            ` : `
            **TASKS:**
            1. **Active Framing:** Guide user to center text/objects.
            2. **Recognition:** Announce known people or landmarks if they appear.
            3. **Text Reading:** READ ALL TEXT VERBATIM.
            4. **Safety:** Warn of obstacles <1m away. Say "STOP" if dangerous.
            5. **Finding:** Scan for requested items.
            6. **Fashion:** Describe colors and patterns.
            7. **Radar:** Alert user of object proximity (trigger haptics).
            8. **Location:** Use 'getLocation' tool.
            9. **Identify:** Identify barcodes, currency, or objects.
            10. **Memorizing:** Use 'rememberFace' for people or 'rememberLandmark' for locations (e.g., "This is my door").
            11. **Crossing:** Use 'monitorTrafficLight' tool.
            `}

            **Tools:** 
             - Use 'setFlashlight' if too dark.
             - Use 'switchCamera' for flipping view.
             - Use 'setPrivacyMode' for battery/privacy.
             - Use 'getLocation' for coordinates.
             - Use 'monitorTrafficLight' for street safety.
             - Use 'triggerHaptic' for Go/Stop signals.
             - Use 'rememberLandmark' to save interesting locations.

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


      if (isEdgeMode) {
        // Apply Edge Detection (Sobel-ish)
        const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;
        const gray = new Uint8Array(width * height);

        // Grayscale pass
        for (let i = 0; i < width * height; i++) {
          gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        }

        // Sobel pass (simplified)
        const output = new Uint8ClampedArray(data.length);
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = -gray[idx - 1 - width] + gray[idx + 1 - width] +
              -2 * gray[idx - 1] + 2 * gray[idx + 1] +
              -gray[idx - 1 + width] + gray[idx + 1 + width];
            const gy = -gray[idx - 1 - width] - 2 * gray[idx - width] - gray[idx + 1 - width] +
              gray[idx - 1 + width] + 2 * gray[idx + width] + gray[idx + 1 + width];
            const mag = Math.sqrt(gx * gx + gy * gy);

            const val = mag > 50 ? 255 : 0; // Threshold
            const outIdx = (y * width + x) * 4;
            output[outIdx] = val;
            output[outIdx + 1] = val;
            output[outIdx + 2] = val;
            output[outIdx + 3] = 255;
          }
        }
        ctx.putImageData(new ImageData(output, width, height), 0, 0);
      } else if (isZoomMode) {
        // Apply Digital Zoom (Center Crop)
        const zoomWidth = videoRef.current.videoWidth * 0.4;
        const zoomHeight = videoRef.current.videoHeight * 0.4;
        const zoomX = (videoRef.current.videoWidth - zoomWidth) / 2;
        const zoomY = (videoRef.current.videoHeight - zoomHeight) / 2;
        ctx.drawImage(videoRef.current, zoomX, zoomY, zoomWidth, zoomHeight, 0, 0, canvasRef.current.width, canvasRef.current.height);
      } else {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }

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

      const p = ctx.getImageData(canvasRef.current.width / 2 - 25, canvasRef.current.height / 2 - 25, 50, 50).data;
      let total = 0;
      for (let i = 0; i < p.length; i += 4) total += (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]);
      const avg = total / (p.length / 4);

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
      sourceNodesRef.current.forEach(node => { try { node.stop(); } catch (e) { } });
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
        } else if (fc.name === 'getLocation') {
          const loc = await handleGetLocation();
          result = JSON.stringify(loc);
          playSystemSound('success');
        } else if (fc.name === 'rememberFace') {
          const name = (fc.args as any).name;
          result = `ok, memorizing ${name}. Please provide a 5-word visual description.`;
          saveFace(name, "Person currently in view");
        } else if (fc.name === 'rememberLandmark') {
          const name = (fc.args as any).name;
          result = `ok, memorizing landmark ${name}.`;
          saveLandmark(name, "Location in current view");
        } else if (fc.name === 'monitorTrafficLight') {
          const active = (fc.args as any).active;
          setIsCrossingMode(active);
          result = active ? "ok, monitoring traffic signal." : "ok, stopped crossing monitor.";
          triggerHaptic(active ? [50, 100, 50] : [50, 50]);
        } else if (fc.name === 'triggerHaptic') {
          const pattern = (fc.args as any).pattern;
          if (pattern === 'pulse') triggerHaptic(100);
          else if (pattern === 'double') triggerHaptic([50, 50, 50]);
          else if (pattern === 'long') triggerHaptic(300);
          else if (pattern === 'rapid') triggerHaptic([50, 30, 50, 30, 50]);
          result = "vibrated";
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
          } catch (e) { }
        }
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const handleStopWithAnalysis = async () => {
    triggerHaptic([50, 50]);
    const finalFrame = lastFrameRef.current;

    // Clear playlist and reset tracks to ensure the audio element resets and re-triggers autoPlay
    setPlaylist([]);
    setCurrentTrackIndex(0);
    setIsPlayingAudio(false);

    stopSession();

    if (finalFrame) {
      setIsAnalyzing(true);
      setAnalysisProgress(0); // Start at zero per user request
      setStatus("ANALYZING...");
      playSystemSound('on');

      // Dynamic progress increment during API wait (Vision Phase)
      const progressTimer = setInterval(() => {
        setAnalysisProgress(prev => (prev < 45 ? prev + 3 : prev));
      }, 300);

      try {
        const ai = new GoogleGenAI({ apiKey });
        const analysisResp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: finalFrame } },
              { text: `Detailed analysis: Read all text verbatim. Describe objects, colors, and layout. Speak in ${language}.` }
            ]
          }]
        });

        clearInterval(progressTimer);
        setAnalysisProgress(50);

        const text = analysisResp.text;
        console.log("Analysis Result:", text);
        if (text) {
          // Split text into sentences for synchronized highlighting
          const sentences = splitTextIntoSentences(text);
          const playlistResults = new Array(sentences.length);

          // Generate audio for each sentence concurrently but preserve order
          let processedCount = 0;
          await Promise.all(sentences.map(async (sentence, index) => {
            try {
              const ttsResp = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ parts: [{ text: sentence }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                }
              });

              const candidate = ttsResp.candidates?.[0];
              const audioPart = candidate?.content?.parts?.find(p => p.inlineData);
              const audioData = audioPart?.inlineData;

              if (audioData) {
                const bytes = decodeBase64ToBytes(audioData.data);
                const blob = new Blob([bytes.buffer as ArrayBuffer], { type: audioData.mimeType });
                const url = URL.createObjectURL(blob);
                playlistResults[index] = { text: sentence, url };
              }
            } catch (e) {
              console.error("TTS generation failed for segment", e);
            } finally {
              processedCount++;
              setAnalysisProgress(50 + Math.floor((processedCount / sentences.length) * 50));
            }
          }));

          // Sort playlist to match original sentence order (Promise.all doesn't guarantee completion order, but map index does if we map back)
          // Re-do to ensure order
          const finalPlaylist = playlistResults.filter(p => p !== undefined);
          console.log("Playlist generated with segments:", finalPlaylist.length);

          if (finalPlaylist.length > 0) {
            setPlaylist(finalPlaylist);
            setCurrentTrackIndex(0);
            setIsPlayingAudio(true);
            setAnalysisProgress(100);

            // Increment credit usage and notify user
            spendCredit();
            const remaining = userTier === 'pro' ? 'Unlimited' : (credits - 1);

            // Speak credits first, then the analysis will auto-play via effect
            announceInterface(`Analysis complete. ${remaining} credits remaining.`);

            // Auto-play via effect
            setShowTextReader(true); // Default to showing text for analysis
            playSystemSound('success');
          }
        }
      } catch (e) {
        clearInterval(progressTimer); // Ensure timer is cleared on error
        console.error("Full Analysis Error:", e);
        playSystemSound('error');
        setError("Analysis Failed: " + (e as Error).message);
      } finally {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setStatus("READY");
      }
    }
  };

  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnalyzing(false);
    stopSession();
    if (audioRef.current) {
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
    if (!audioRef.current) return;
    triggerHaptic(20);
    switch (action) {
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
    if (showLanguageModal) return;

    const now = Date.now();
    touchStartYRef.current = e.touches[0].clientY;

    // Multi-Finger Gestures
    if (e.touches.length === 2) {
      // 2 Fingers: Status Update
      triggerHaptic([50, 50]);
      const statusText = `Status: ${status}. Mode: ${specialMode === 'none' ? 'General' : specialMode}. ${userTier === 'pro' ? 'Pro Tier' : credits + ' credits remaining'}.`;
      announceInterface(statusText);
      return;
    }

    if (e.touches.length === 3) {
      // 3 Fingers: Privacy Toggle
      const newState = !privacyMode;
      setPrivacyMode(newState);
      triggerHaptic(newState ? [100, 50] : [50, 100]);
      announceInterface(newState ? "Screen Curtain On" : "Screen Curtain Off");
      return;
    }

    // Double Tap Logic (1 finger)
    if (e.touches.length === 1) {
      if (now - lastTapRef.current < 300) {
        triggerHaptic([50]);
        if (isActive) {
          handleStopWithAnalysis();
          announceInterface("Stopping and analyzing");
        } else if (!isAnalyzing && playlist.length === 0) {
          startSession();
          announceInterface("Starting session");
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  // Auto-scroll reader to active sentence
  useEffect(() => {
    if (showTextReader && document.getElementById(`sentence-${currentTrackIndex}`)) {
      document.getElementById(`sentence-${currentTrackIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTrackIndex, showTextReader]);

  // Critical fix: force audio playback when playlist changes or track index changes
  // This bypasses browser auto-play restrictions that sometimes block the <audio> element 
  // after a long asynchronous analysis process.
  useEffect(() => {
    if (playlist.length > 0 && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Audio playback failed or was blocked:", error);
          // If blocked, the user might need to tap to resume audio which is usually 
          // already the case since analysis is triggered by user interaction.
        });
      }
    }
  }, [playlist, currentTrackIndex]);

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
      className="flex flex-col h-[100dvh] w-full bg-black text-white relative overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      role="application"
      aria-label="Vision Assistant Application. Double tap screen to toggle session, or use controls below."
    >
      {/* Video Viewfinder - Hidden in Privacy Mode - Hidden from Screen Reader */}
      <div className={`absolute inset-0 z-0 ${privacyMode ? 'opacity-0' : 'opacity-50'} transition-opacity duration-300`} aria-hidden="true">
        <video ref={videoRef} className={`w-full h-full object-cover ${isEdgeMode ? 'hidden' : 'block'}`} playsInline muted autoPlay />
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${isEdgeMode ? 'block' : 'hidden'}`} />
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
          <button onClick={(e) => {
            e.stopPropagation();
            const newState = !privacyMode;
            setPrivacyMode(newState);
            announceInterface(newState ? "Screen Curtain On" : "Screen Curtain Off");
          }}
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
            <div className="flex flex-col items-center mx-2 truncate">
              <h1 className="text-3xl md:text-5xl font-extrabold text-yellow-400 tracking-wider drop-shadow-md" aria-label="Vision Ally">VisionAlly</h1>
              <span className="text-[10px] font-mono text-zinc-500 mt-[-4px]">v1.3.6 (Joy to the World 🎄)</span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <button onClick={(e) => {
              e.stopPropagation();
              switchCamera();
              announceInterface(facingMode === 'environment' ? "Front Camera Active" : "Back Camera Active");
            }}
              className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 p-5 rounded-full bg-gray-900 border-4 border-gray-700 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors shadow-lg"
              aria-label={`Switch Camera. Current: ${facingMode === 'environment' ? 'Back Facing' : 'Front Facing'}`}>
              <IconCameraSwitch />
            </button>
            {/* Tier Badge / Credits */}
            <div className="mt-1 flex items-center gap-1">
              {userTier === 'pro' ? (
                <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full border border-amber-300">PRO</span>
              ) : (
                <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">{credits} Credits</span>
              )}
            </div>
          </div>
        </div>

        {/* --- v1.1.1 Zen & Mobile-Fixed UI --- */}
        <div className="flex-1 w-full flex flex-col justify-between items-center relative z-20 overflow-hidden">

          {/* Top Status Area (Floating) */}
          <div className="absolute top-4 left-0 w-full flex flex-col items-center gap-2 pointer-events-none z-30">
            {(isActive || isAnalyzing || error) && status !== "Ready" && (
              <div className={`text-2xl font-mono font-bold px-6 py-4 rounded-2xl border-4 shadow-xl ${isActive ? 'bg-green-900 border-green-500' : 'bg-zinc-800 border-zinc-600'}`}>
                {status}
              </div>
            )}
            {error && <div className="bg-red-900 text-white px-6 py-4 rounded-2xl border-4 border-red-500 animate-bounce">{error}</div>}
          </div>

          {/* Central Interaction Zone (Main Action) */}
          <div className="flex-1 w-full flex flex-col items-center justify-center p-4">

            {/* Visualizer / Audio Controls Group */}
            {playlist.length > 0 ? (
              showTextReader ? (
                /* Reader View (Document Scanner) */
                <div className="w-full h-full max-w-3xl bg-black border-4 border-yellow-500 rounded-[3rem] p-6 overflow-y-auto shadow-2xl flex flex-col gap-6 pointer-events-auto">
                  {playlist.map((item, idx) => (
                    <p key={idx} id={`sentence-${idx}`} className={`text-3xl font-bold p-6 rounded-3xl transition-all ${idx === currentTrackIndex ? 'bg-yellow-400 text-black' : 'text-zinc-500 bg-zinc-900'}`}>
                      {item.text}
                    </p>
                  ))}
                  <div className="h-10" />
                </div>
              ) : (
                /* Regular Audio Player */
                <div className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-xl border-4 border-yellow-500 rounded-[3rem] p-6 shadow-2xl pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); handleAudioControl('restart'); }} className="w-full py-4 bg-blue-600 rounded-2xl text-2xl font-bold border-4 border-blue-400 mb-4">
                    Restart Description
                  </button>
                  <div className="flex justify-center items-center gap-4">
                    <button onClick={(e) => { e.stopPropagation(); handleAudioControl('rewind'); }} className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-zinc-600 flex items-center justify-center"><IconRewind /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleAudioControl(isPlayingAudio ? 'pause' : 'play'); }} className="w-24 h-24 bg-yellow-400 rounded-full border-4 border-yellow-200 text-black flex items-center justify-center shadow-xl">
                      {isPlayingAudio ? <IconPause /> : <IconPlay />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleAudioControl('forward'); }} className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-zinc-600 flex items-center justify-center"><IconForward /></button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setShowTextReader(true); }} className="w-full mt-4 py-3 bg-zinc-800 rounded-xl text-xl font-bold border-2 border-zinc-700 flex items-center justify-center gap-2">
                    <div className="w-6 h-6"><IconFileText /></div> Show Text
                  </button>
                </div>
              )
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center pointer-events-auto"
                onClick={() => {
                  if (isActive) handleStopWithAnalysis();
                  else startSessionWithConfig();
                  triggerHaptic(50);
                }}
              >
                {(!isActive && !isAnalyzing) ? (
                  <div className="flex flex-col items-center gap-6 animate-pulse">
                    <div className="w-48 h-48 rounded-full border-[12px] border-yellow-400 flex items-center justify-center text-yellow-400">
                      <div className="w-24 h-24"><IconCamera /></div>
                    </div>
                    <span className="text-5xl font-black text-white text-center">TAP TO START</span>
                  </div>
                ) : (
                  <div
                    className={`w-64 h-64 rounded-full border-[12px] flex flex-col items-center justify-center shadow-2xl bg-black/50 ${isAnalyzing ? 'border-blue-500 animate-pulse' : 'border-red-600'}`}
                    style={{ transform: `scale(${1 + volume / 100})` }}
                  >
                    <div className="w-full h-full text-white relative flex flex-col items-center justify-center">
                      {isAnalyzing ? (
                        <>
                          {/* Large high-contrast spinner */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="animate-spin h-48 w-48 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                          {/* Massive progress percentage for visibility */}
                          <span className="text-8xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,1)] z-10">{analysisProgress}%</span>
                          <span className="text-xl font-bold text-yellow-400 uppercase tracking-widest mt-4 z-10">Analyzing</span>
                        </>
                      ) : <div className="w-32 h-32"><IconStop /></div>}
                    </div>
                    {!isAnalyzing && <span className="text-white font-black mt-2">STOP</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Permanent Controls */}
          <div className="w-full pb-8 px-8 flex justify-between items-end gap-4 pointer-events-auto">

            {/* Tools Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowToolbox(true);
                triggerHaptic(30);
                announceInterface("Opening Tools Menu");
              }}
              className="w-24 h-24 bg-white/10 backdrop-blur-xl border-4 border-white/20 rounded-[2rem] flex flex-col items-center justify-center gap-1 active:bg-white/20 transition-all shadow-2xl"
              aria-label="Open Tools"
            >
              <div className="w-8 h-8"><IconGrid /></div>
              <span className="text-[10px] font-black text-white uppercase">Tools</span>
            </button>

            {/* Primary Interaction Button (Ask/Talk) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(50);
                if (isActive) {
                  handleStopWithAnalysis();
                  announceInterface("Stopping and analyzing");
                } else {
                  startSessionWithConfig();
                  announceInterface("Starting session");
                }
              }}
              className={`flex-1 h-28 rounded-[2.5rem] flex items-center justify-center gap-4 border-4 transition-all shadow-2xl ${isActive ? 'bg-red-600 border-red-400 text-white' : 'bg-zinc-800 border-zinc-600 text-white animate-pulse'}`}
              aria-label={isActive ? "Stop and Describe" : "Start Vision Assistant"}
            >
              <div className="w-10 h-10">{isActive ? <IconStop /> : <IconCamera />}</div>
              <span className="text-3xl font-black uppercase tracking-tight">{isActive ? "STOP" : "Start"}</span>
            </button>

            {/* Location Button */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                triggerHaptic(30);
                if (isActive && sessionRef.current) {
                  sessionRef.current.sendRealtimeInput([{ text: "Where am I? Say my address and coordinates." }]);
                } else {
                  startSessionWithConfig("Where am I?");
                }
              }}
              className="w-24 h-24 bg-blue-600 border-4 border-blue-400 rounded-full flex flex-col items-center justify-center gap-1 text-white active:bg-blue-500 shadow-2xl"
              aria-label="Location"
            >
              <div className="w-8 h-8"><IconMapPin /></div>
              <span className="text-[10px] font-black uppercase">Where</span>
            </button>
          </div>
        </div>



        {/* --- v1.1.0 Toolbox Drawer --- */}
        {showToolbox && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col p-8 animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-5xl font-black text-white">Tools</h2>
              <button
                onClick={() => {
                  setShowToolbox(false);
                  announceInterface("Closing tools");
                }}
                className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-white border-4 border-zinc-600"
              >
                <IconExit />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-12">
              {/* Pathfinder Navigation */}
              <button
                onClick={() => {
                  if (checkFeatureAccess('pathfinder', 'Pathfinder Navigation')) {
                    const newState = !isPathfinderMode;
                    setIsPathfinderMode(newState);
                    setShowToolbox(false);
                    triggerHaptic(30);
                    announceInterface(newState ? "Pathfinder Navigation Active" : "Pathfinder Off");
                  }
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 transition-all ${isPathfinderMode ? 'bg-blue-600 border-blue-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconPathfinder /></div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-white">Pathfinder</div>
                  <div className="text-lg text-zinc-400">Navigate complex spaces</div>
                </div>
              </button>

              {/* Object Hunter */}
              <button
                onClick={() => {
                  setShowFinderModal(true);
                  setShowToolbox(false);
                  triggerHaptic(30);
                  announceInterface("Select object to find");
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 transition-all ${isFindingMode ? 'bg-green-600 border-green-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconSearch /></div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-white">Object Hunter</div>
                  <div className="text-lg text-zinc-400">Find keys, wallet, etc.</div>
                </div>
              </button>

              {/* Safe Crossing */}
              <button
                onClick={() => {
                  setIsCrossingMode(!isCrossingMode);
                  setShowToolbox(false);
                  triggerHaptic(30);
                  announceInterface(isCrossingMode ? "Traffic Light Monitor Off" : "Traffic Light Monitor Active");
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 transition-all ${isCrossingMode ? 'bg-red-600 border-red-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconTrafficLight /></div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-white">Traffic Lights</div>
                  <div className="text-lg text-zinc-400">Safe street crossing</div>
                </div>
              </button>

              {/* Document Scanner */}
              <button
                onClick={() => { setIsDocumentMode(!isDocumentMode); setShowToolbox(false); triggerHaptic(30); }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 transition-all ${isDocumentMode ? 'bg-indigo-600 border-indigo-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconFileText /></div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-white">Document Scanner</div>
                  <div className="text-lg text-zinc-400">Read books and mail</div>
                </div>
              </button>

              {/* Edge Mode */}
              <button
                onClick={() => { setIsEdgeMode(!isEdgeMode); setShowToolbox(false); triggerHaptic(30); }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 transition-all ${isEdgeMode ? 'bg-yellow-500 border-yellow-200 text-black' : 'bg-zinc-900 border-zinc-700 text-white'}`}
              >
                <div className="w-12 h-12"><IconGrid /></div>
                <div className="text-left">
                  <div className="text-3xl font-bold">Edge Detection</div>
                  <div className="text-lg opacity-70">Enhanced contrast for navigation</div>
                </div>
              </button>

              {/* Lifestyle Modes Section */}
              <div className="mt-8 mb-4 text-zinc-500 uppercase font-black tracking-widest text-xl">Lifestyle Intelligence</div>

              {/* Social Mode */}
              <button
                onClick={() => {
                  if (checkFeatureAccess('social', 'Social Intelligence')) {
                    setSpecialMode(specialMode === 'social' ? 'none' : 'social');
                    setShowToolbox(false);
                  }
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 ${specialMode === 'social' ? 'bg-pink-600 border-pink-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconSocial /></div>
                <div className="text-3xl font-bold text-white">Social Mode</div>
              </button>

              {/* Kitchen Mode */}
              <button
                onClick={() => {
                  if (checkFeatureAccess('kitchen', 'Kitchen Safety')) {
                    setSpecialMode(specialMode === 'kitchen' ? 'none' : 'kitchen');
                    setShowToolbox(false);
                  }
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 ${specialMode === 'kitchen' ? 'bg-orange-600 border-orange-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconKitchen /></div>
                <div className="text-3xl font-bold text-white">Kitchen Assistant</div>
              </button>

              {/* Shopping Assistant */}
              <button
                onClick={() => {
                  if (checkFeatureAccess('shop', 'Shopping Assistant')) {
                    const next = specialMode === 'shop' ? 'none' : 'shop';
                    setSpecialMode(next as any);
                    setShowToolbox(false);
                    announceInterface(next === 'shop' ? "Shopping Assistant Active" : "Shopping Mode Off");
                  }
                }}
                className={`h-32 rounded-[2rem] border-4 flex items-center px-8 gap-6 ${specialMode === 'shop' ? 'bg-yellow-600 border-yellow-300' : 'bg-zinc-900 border-zinc-700'}`}
              >
                <div className="w-12 h-12 text-white"><IconPrice /></div>
                <div className="text-3xl font-bold text-white">Shopping Assistant</div>
              </button>
            </div>

          </div>
        )}

        {/* --- Finding Mode Modal --- */}
        {showFinderModal && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <h3 className="text-4xl text-white font-bold mb-8">Find What?</h3>
            <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
              {['Keys', 'Wallet', 'Door', 'Chair', 'Cane', 'Cup', 'Water', 'Shoes'].map(item => (
                <button
                  key={item}
                  onClick={(e) => { e.stopPropagation(); startFinding(item); }}
                  className="h-24 bg-gray-800 rounded-3xl border-4 border-gray-600 text-2xl font-bold text-white active:bg-yellow-500 active:text-black active:border-yellow-200 shadow-xl"
                >
                  {item}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); setIsFindingMode(false); setTargetObject(''); setShowFinderModal(false); startSessionWithConfig(); }}
                className="col-span-2 h-20 bg-red-900/50 text-red-100 rounded-3xl mt-4 font-bold border-4 border-red-800 text-2xl"
              >
                Cancel / Stop Finding
              </button>
            </div>
          </div>
        )}


      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        featureName={lockedFeatureName}
      />
    </div>
  );
};