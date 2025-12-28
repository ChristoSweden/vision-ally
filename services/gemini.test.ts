import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVideoDescription } from './gemini';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI library
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn(),
  };
});

describe('Gemini Service', () => {
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGenerateContent = vi.fn().mockResolvedValue({
        text: 'Test description'
    });

    (GoogleGenAI as any).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent
      }
    }));
  });

  it('generateVideoDescription should call generateContent', async () => {
    const result = await generateVideoDescription('key', 'base64', 'video/mp4');
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result).toBe('Test description');
  });

  it('generateVideoDescription handles errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));
    await expect(generateVideoDescription('key', 'base64', 'video/mp4')).rejects.toThrow('API Error');
  });
});