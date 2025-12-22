import React from 'react';
import { VisualAssistant } from './components/VisualAssistant';

function App() {
  const apiKey = process.env.API_KEY;

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
    <div className="bg-black min-h-screen">
      <VisualAssistant apiKey={apiKey} />
    </div>
  );
}

export default App;