import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Vital for using `process.env.API_KEY` in client-side code.
      // Default to the provided key to ensure the app works immediately upon deployment.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || 'AIzaSyCthjsk-vVWP9fVWRxf55GL3IcqcExeWhk'),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        // Externalize deps so Vite doesn't try to bundle them (uses importmap instead)
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          '@google/genai',
          'lucide-react'
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@google/genai': 'GoogleGenAI',
          },
        },
      },
    },
  };
});