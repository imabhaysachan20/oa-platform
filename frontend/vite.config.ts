import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const backendUrl = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@mediapipe/tasks-vision'],
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['personality-somerset-stronger-tiles.trycloudflare.com'],
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
