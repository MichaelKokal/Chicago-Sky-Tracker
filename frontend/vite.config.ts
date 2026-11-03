import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // Send API calls to the Spring Boot backend during development.
    proxy: {
      // Set API_TARGET to try the frontend against another server, like the live site.
      '/api': { target: process.env.API_TARGET ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
})
