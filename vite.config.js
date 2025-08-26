import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: {
        '/v2': {
          target: 'https://ghanish.in',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      __API_PREFIX__: JSON.stringify('/v2')
    }
  };
}); 