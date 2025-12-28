import React, { useState, useEffect, useRef } from 'react';
import { Download, Zap, CheckCircle, RotateCcw, Video, Clock, Mic, MicOff, MessageSquare, Menu } from 'lucide-react';
import Camera, { CameraHandle } from './components/Camera';
import PaymentModal from './components/PaymentModal';
import { generateVideoDescription, askVideoQuestion } from './services/gemini';
import { AppState } from './types';

// Add Speech Recognition Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Robust API Key retrieval
const getApiKey = (): string | undefined => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

const INITIAL_ATTEMPTS = 3; // Free attempts
const MAX_RECORDING_TIME = 135; // 2 minutes 15 seconds in seconds
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_placeholder"; // User must replace this

// Utility to clean text of markdown symbols for better TTS and display
const cleanText = (text: string): string => {
  if (!text) return "";
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('visionally_attempts');
      return saved ? parseInt(saved, 10) : INITIAL_ATTEMPTS;
    } catch (e) { return INITIAL_ATTEMPTS; }
  });
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('visionally_premium') === 'true';
  });
  const [showPayment, setShowPayment] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [qaResult, setQaResult] = useState<string>(''); // For Q&A responses
  const [currentVideoData, setCurrentVideoData] = useState<{ base64: string, mimeType: string } | null>(null);

  const [progress, setProgress] = useState(0);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [downloadData, setDownloadData] = useState<{ blob: Blob, url: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(MAX_RECORDING_TIME);

  // Voice Interaction State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  const cameraRef = useRef<CameraHandle>(null);

  // Accessibility Helpers
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleaned = cleanText(text);
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  useEffect(() => {
    // Check for success payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      handlePaymentSuccess();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const key = getApiKey();
    setHasApiKey(!!key);
    if (!!key) {
      setTimeout(() => speak("VisionAlly Ready. Say zoom in or zoom out to control camera."), 1000);
    } else {
      setTimeout(() => speak("System Error. API Key missing."), 1000);
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        // Auto-restart if we want continuous listening, but for now simple toggle
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
        setVoiceTranscript(transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, [state, currentVideoData]); // Re-bind if needed, though ref is stable

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      vibrate(20);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        vibrate([50, 50]);
      } catch (e) {
        console.error("Mic start error", e);
      }
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    console.log("Voice Command:", transcript);

    // COMMANDS: ZOOM
    if (state === AppState.IDLE || state === AppState.RECORDING) {
      if (transcript.includes('zoom in')) {
        cameraRef.current?.zoomIn();
        speak("Zooming in");
      } else if (transcript.includes('zoom out')) {
        cameraRef.current?.zoomOut();
        speak("Zooming out");
      }
    }
    // COMMANDS: Q&A
    else if (state === AppState.RESULT && currentVideoData) {
      // Treat everything as a question in Result mode
      if (transcript.length > 2) {
        await handleAskQuestion(transcript);
      }
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!currentVideoData || !hasApiKey) return;

    speak("Thinking...");
    try {
      const answer = await askVideoQuestion(getApiKey()!, currentVideoData.base64, currentVideoData.mimeType, question);
      const cleaned = cleanText(answer);
      setQaResult(cleaned);
      speak(cleaned);
    } catch (e) {
      speak("Sorry, I could not answer that.");
    }
  };

  // Handle Recording Timer
  useEffect(() => {
    let interval: number;
    if (state === AppState.RECORDING) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(MAX_RECORDING_TIME);
    }
    return () => clearInterval(interval);
  }, [state]);

  // Auto-stop when timer hits 0
  useEffect(() => {
    if (state === AppState.RECORDING && timeLeft === 0) {
      handleStopAndAnalyze();
    }
  }, [timeLeft, state]);

  // Handle Progress Bar Animation
  useEffect(() => {
    let interval: number;
    if (state === AppState.ANALYZING) {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Hold at 90 until complete
          return prev + 1; // Increment slowly
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [state]);

  // --- ACTIONS ---

  const handleStartRecording = () => {
    if (!isPremium && attemptsLeft <= 0) {
      setShowPayment(true);
      speak("You have used all free attempts. Please upgrade to continue.");
      return;
    }

    if (!hasApiKey) {
      speak("Cannot start. API Key missing.");
      return;
    }
    vibrate(50);
    setAnalysisResult('');
    setQaResult('');
    setCurrentVideoData(null);
    if (cameraRef.current) {
      cameraRef.current.startRecording();
      setState(AppState.RECORDING);
      speak("Recording started.");
    }
  };

  const handleStopAndAnalyze = async () => {
    vibrate(50);
    if (!cameraRef.current) return;

    setState(AppState.ANALYZING);
    speak("Processing video...");

    try {
      const { base64, mimeType, blob, url } = await cameraRef.current.stopRecording();
      setDownloadData({ blob, url });
      setCurrentVideoData({ base64, mimeType }); // Save for Q&A

      const apiKey = getApiKey();
      if (!apiKey) throw new Error("No API Key");

      const description = await generateVideoDescription(apiKey, base64, mimeType);


      // Deduct attempt if not premium
      if (!isPremium) {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        localStorage.setItem('visionally_attempts', newAttempts.toString());
      }

      const cleanedDescription = cleanText(description);
      setAnalysisResult(cleanedDescription);
      setProgress(100);

      setTimeout(() => {
        setState(AppState.RESULT);
        speak(cleanedDescription);
      }, 500);

    } catch (e) {
      console.error(e);
      setState(AppState.ERROR);
      speak("Analysis failed. Please try again.");
      setTimeout(() => setState(AppState.IDLE), 3000);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPremium(true);
    localStorage.setItem('visionally_premium', 'true');
    setShowPayment(false);
    speak("Upgrade successful. You now have unlimited access.");
  };

  const handleDownload = () => {
    if (!downloadData || !analysisResult) return;

    // Download Video
    const videoLink = document.createElement('a');
    videoLink.href = downloadData.url;
    videoLink.download = `visionally-recording-${Date.now()}.webm`;
    document.body.appendChild(videoLink);
    videoLink.click();
    document.body.removeChild(videoLink);

    // Download Transcript
    const blob = new Blob([analysisResult + (qaResult ? `\n\nQ&A:\n${qaResult}` : "")], { type: 'text/plain' });
    const textUrl = URL.createObjectURL(blob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.download = `visionally-transcript-${Date.now()}.txt`;
    document.body.appendChild(textLink);
    textLink.click();
    document.body.removeChild(textLink);

    speak("Downloading files.");
  };

  const handleReset = () => {
    vibrate(20);
    window.speechSynthesis.cancel();
    setAnalysisResult('');
    setQaResult('');
    setDownloadData(null);
    setCurrentVideoData(null);
    setState(AppState.IDLE);
    speak("Ready.");
  };

  // Helper to format remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans relative select-none overflow-hidden">

      {/* Header */}
      <header className="flex flex-col p-4 bg-gray-900/80 backdrop-blur-md z-20 border-b border-gray-800 absolute top-0 w-full gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className={`${state === AppState.RECORDING ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} size={24} />
            <h1 className="text-xl font-bold text-white tracking-wider uppercase">
              VisionAlly <span className="text-red-500">Video</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`p-2 rounded-full border transition-all ${isListening ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
              aria-label="Toggle Voice Control"
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <div className="bg-gray-800 px-3 py-1 rounded-full text-sm font-mono border border-gray-700">
              {isPremium ? (
                <span className="text-purple-400 font-bold flex items-center gap-1"><Zap size={14} fill="currentColor" /> PREMIUM</span>
              ) : (
                <span className="text-gray-300">FREE: <span className={attemptsLeft > 0 ? "text-green-400" : "text-red-500"}>{attemptsLeft}</span></span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative bg-black flex flex-col pt-20">
        <div className="flex-1 relative w-full h-full">
          {/* Camera View */}
          <Camera
            ref={cameraRef}
            isActive={true}
            onStreamReady={() => { }}
          />

          {/* RECORDING OVERLAY (Countdown) */}
          {state === AppState.RECORDING && (
            <div className="absolute top-4 right-4 z-30">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full animate-pulse shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  <span className="font-bold text-sm">REC</span>
                </div>
                <div className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full border border-white/10 mt-1">
                  <Clock size={14} className="text-white" />
                  <span className="font-mono font-bold text-xl">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ANALYZING OVERLAY */}
          {state === AppState.ANALYZING && (
            <div className="absolute inset-0 bg-gray-900/95 z-40 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-full max-w-xs mb-8 relative">
                {/* Candy Cane Progress Bar */}
                <div className="h-8 w-full bg-gray-700 rounded-full overflow-hidden border-2 border-white/20 shadow-xl relative">
                  <div
                    className="h-full candy-cane-bar bg-red-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                  {/* The Percentage Number */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-bold text-white drop-shadow-md text-sm tracking-wider">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="absolute -top-10 right-0 animate-bounce text-4xl">
                  🎁
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Analyzing Scene...</h2>
              <p className="text-gray-400">Our AI elves are describing what they see.</p>
            </div>
          )}

          {/* RESULT OVERLAY */}
          {state === AppState.RESULT && (
            <div className="absolute inset-0 bg-gray-900/95 z-40 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
              <CheckCircle size={64} className="text-green-500 mb-6 flex-shrink-0" />
              <h2 className="text-2xl font-bold text-white mb-4">Analysis Complete</h2>

              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl mb-4 max-w-md w-full text-left">
                <p className="text-lg leading-relaxed text-gray-200">
                  {analysisResult}
                </p>
              </div>

              {/* Q&A Section */}
              <div className="w-full max-w-md mb-6">
                {qaResult && (
                  <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg mb-4 text-left animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-blue-300 font-bold text-sm mb-1">Q&A Response:</h3>
                    <p className="text-white">{qaResult}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className={`p-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}>
                    <Mic size={16} />
                  </div>
                  <span className="text-sm text-gray-400 italic">
                    {isListening ? "Listening for your question..." : "Tap mic at top to ask questions"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-md pb-20">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-full font-bold hover:bg-gray-600 transition-colors w-full"
                >
                  <Download size={20} />
                  <span>Download Video & Text</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95 w-full"
                >
                  <RotateCcw size={24} />
                  <span>Start New Recording</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="h-1/3 min-h-[200px] bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 w-full flex flex-col items-center justify-end pb-8 pointer-events-none">
          <div className="pointer-events-auto mb-4">

            {(state === AppState.IDLE || state === AppState.RECORDING) && (
              <>
                {state === AppState.IDLE ? (
                  <button
                    onClick={handleStartRecording}
                    disabled={!hasApiKey}
                    className={`w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center shadow-lg transition-all active:scale-90
                        ${hasApiKey ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    aria-label="Start Recording"
                  >
                    <Video size={40} className="fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleStopAndAnalyze}
                    className="w-24 h-24 rounded-full border-4 border-red-500/50 bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all active:scale-90"
                    aria-label="Stop and Analyze"
                  >
                    <div className="w-8 h-8 bg-red-600 rounded-sm"></div>
                  </button>
                )}
              </>
            )}

          </div>

          <p className="text-gray-400 font-medium pb-4">
            {state === AppState.IDLE ? "Tap red button to record (or say 'Zoom In')" : (state === AppState.RECORDING ? "Recording... (Say 'Zoom Out' to adjust)" : "")}
          </p>
        </div>
      </main>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
          paymentLink={STRIPE_PAYMENT_LINK}
        />
      )}

    </div>
  );
};

export default App;