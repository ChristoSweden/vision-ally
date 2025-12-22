import React from 'react';
import { VisualAssistant } from './components/VisualAssistant';
import { SubscriptionProvider } from './components/SubscriptionContext';

function App() {
  // Support multiple common naming conventions for Vercel/Vite compatibility
  // Support multiple common naming conventions for Vercel/Vite compatibility
  // We check for 'process' safely to avoid "process is not defined" errors in browser
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' && process.env ? (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY : null);

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-2xl border-4 border-red-600 p-8 rounded-3xl bg-red-900/20">
          <h1 className="text-5xl font-black text-red-500 mb-8 tracking-wide">Configuration Error</h1>
          <p className="text-3xl text-white font-bold">API_KEY environment variable is missing.</p>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionProvider>
      <div className="bg-black min-h-screen">
        <VisualAssistant apiKey={apiKey} />
      </div>
    </SubscriptionProvider>
  );
}

export default App;