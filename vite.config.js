import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      // Force full reload for App.jsx changes (better for complex state changes)
      ignored: ['!**/src/App.jsx']
    }
  }
})

