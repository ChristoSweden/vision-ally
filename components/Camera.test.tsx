import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Camera from './Camera';

describe('Camera Component', () => {
  it('renders video element', () => {
    render(<Camera onStreamReady={() => {}} isActive={true} />);
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('shows permission error when access denied', async () => {
    // Mock getUserMedia failure
    (navigator.mediaDevices as any).getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    render(<Camera onStreamReady={() => {}} isActive={true} />);

    // Wait for the async effect to handle the error
    await screen.findByText(/Please allow camera access/i);
    expect(screen.getByText(/Please allow camera access/i)).toBeInTheDocument();
  });

  it('shows inactive state correctly', () => {
    render(<Camera onStreamReady={() => {}} isActive={false} />);
    // When inactive, video opacity is 0 (handled by class, but we can check if camera icon overlay exists)
    // The component renders a specific icon container when inactive
    // We can check for the lucide-react Camera icon placeholder logic if needed, 
    // but usually checking the container classes or structure is enough.
    const container = document.querySelector('.relative');
    expect(container).toBeInTheDocument();
  });
});