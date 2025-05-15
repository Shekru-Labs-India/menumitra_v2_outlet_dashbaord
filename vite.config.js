import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://men4u.xyz'

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0", 
      port: 5173,
      proxy: {
        '/v2': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      __API_PREFIX__: JSON.stringify('/v2')
    }
  }
});
