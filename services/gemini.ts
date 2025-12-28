import { GoogleGenAI } from "@google/genai";

// Use Gemini Flash for fast multimodal analysis (Request/Response)
const MODEL_NAME = 'gemini-flash-latest';

export const generateVideoDescription = async (apiKey: string, base64Video: string, mimeType: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video
            }
          },
          {
            text: "You are VisionAlly. Analyze this video and audio (if present) from a smartphone back camera held by a visually impaired user.\n\n**PRIORITY ORDER:**\n1. **IMMEDIATE DANGER**: Start with 'WARNING:' if you see hazards (cars, red lights, holes). THIS COMES FIRST.\n2. **Proximity Scan**: Identify objects from CLOSEST to FURTHEST. e.g., 'Directly in front is a chair (2 steps). Behind that is a table (5 steps).'\n3. **Environment**: Briefly describe the scene and sounds.\n4. **Text**: Read visible text.\n\nKeep it concise. Speak naturally."
          }
        ]
      }
    });

    return response.text || "I couldn't analyze the video.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const askVideoQuestion = async (apiKey: string, base64Video: string, mimeType: string, question: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video
            }
          },
          {
            text: `You are VisionAlly. The user is asking a specific question about the video you just analyzed. \n\nUser Question: "${question}"\n\nAnswer the question directly, concisely, and helpfully based on the visual evidence in the video. Speak naturally.`
          }
        ]
      }
    });

    return response.text || "I couldn't find an answer in the video.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    throw error;
  }
};