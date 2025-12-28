import '@testing-library/jest-dom';
import { vi } from 'vitest';

// --- Mock AudioContext ---
window.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn().mockReturnValue({ connect: vi.fn() }),
  createScriptProcessor: vi.fn().mockReturnValue({ connect: vi.fn(), onaudioprocess: null }),
  createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
  createBufferSource: vi.fn().mockReturnValue({ 
    connect: vi.fn(), 
    start: vi.fn(), 
    stop: vi.fn(),
    buffer: null,
    onended: null
  }),
  createBuffer: vi.fn().mockReturnValue({
    duration: 30, // Mock duration
    sampleRate: 24000,
    numberOfChannels: 1,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(1024))
  }),
  decodeAudioData: vi.fn().mockResolvedValue({ 
    duration: 10, 
    length: 100, 
    sampleRate: 24000, 
    numberOfChannels: 1,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100))
  }),
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  state: 'running',
  currentTime: 0,
  destination: {}
})) as any;

// --- Mock MediaDevices ---
if (!navigator.mediaDevices) {
  (navigator as any).mediaDevices = {};
}
(navigator.mediaDevices as any).getUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
});

// --- Mock SpeechSynthesis ---
window.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  onvoiceschanged: null,
  paused: false,
  pending: false,
  speaking: false,
  pause: vi.fn(),
  resume: vi.fn(),
} as any;

// Mock SpeechSynthesisUtterance as a class that stores properties
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = '';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  constructor(text: string) {
    this.text = text;
  }
}
window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any;

// --- Mock URL ---
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

// --- Mock HTMLMediaElement ---
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

// --- Mock Canvas ---
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
}) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockframe');

// --- Mock Vibration ---
navigator.vibrate = vi.fn();