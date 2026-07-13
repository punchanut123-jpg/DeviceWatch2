import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'] // Cache ไฟล์สำคัญไว้ offline
      }
    })
  ],
  server: {
    host: true, // เพิ่มบรรทัดนี้เพื่อรับ connection จากภายนอก (เช่น ดูผ่านมือถือ)
    proxy: {
      '/api': 'http://localhost:3000',
      '/webhook': 'http://localhost:3000',
    },
  },
})
