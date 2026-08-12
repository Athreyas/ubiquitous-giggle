import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Optional convenience proxy for the Daymark API during local dev — the
    // client talks to `settings.apiBaseUrl` directly by default, so this is
    // only useful if you point `apiBaseUrl` at `/api` instead of a full URL.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
