import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces (required for Docker)
    port: 5173,
    strictPort: true, // Fail if port is already in use
    watch: {
      usePolling: true, // Required for file watching in Docker
    },
  },
})
