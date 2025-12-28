import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { generateVideoDescription } from './services/gemini';

// Mock dependencies
vi.mock('./services/gemini', () => ({
  generateVideoDescription: vi.fn(),
}));

// Mock Camera
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockCaptureSingleFrame = vi.fn();

vi.mock('./components/Camera', () => {
  return {
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        captureSingleFrame: mockCaptureSingleFrame.mockResolvedValue('frame-base64'),
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording.mockResolvedValue({
            base64: 'video-base64', 
            mimeType: 'video/webm',
            blob: new Blob(['video'], {type: 'video/webm'}),
            url: 'blob:video'
        })
      }));
      return <div data-testid="camera-mock">Camera View</div>;
    })
  };
});

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    process.env.API_KEY = 'test-mock-key-123';

    // Setup generateVideoDescription mock
    (generateVideoDescription as any).mockResolvedValue("A Christmas tree with lights.");
  });

  it('renders video mode by default', () => {
    render(<App />);
    expect(screen.getByText(/VisionAlly/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Recording/i)).toBeInTheDocument();
  });

  it('Video Mode: records, analyzes, and shows result with download', async () => {
    render(<App />);
    
    // Start Recording
    const recordBtn = screen.getByLabelText(/Start Recording/i);
    fireEvent.click(recordBtn);
    
    expect(mockStartRecording).toHaveBeenCalled();
    expect(screen.getByText(/REC/i)).toBeInTheDocument(); // Recording indicator

    // Stop and Analyze
    const stopBtn = screen.getByLabelText(/Stop and Analyze/i);
    fireEvent.click(stopBtn);
    
    expect(mockStopRecording).toHaveBeenCalled();
    expect(screen.getByText(/Analyzing Scene/i)).toBeInTheDocument();

    // Wait for Result
    await waitFor(() => {
      expect(screen.getByText(/A Christmas tree with lights/i)).toBeInTheDocument();
    });

    expect(generateVideoDescription).toHaveBeenCalled();

    // Check Download Button
    const downloadBtn = screen.getByText(/Download Video & Text/i);
    expect(downloadBtn).toBeInTheDocument();

    // Click Download
    fireEvent.click(downloadBtn);
  });
});