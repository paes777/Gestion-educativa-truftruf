import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Escuela Truf-Truf',
        short_name: 'Truf-Truf',
        description: 'Sistema de Administración Académica Escuela Truf-Truf',
        theme_color: '#2E7D32',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo-padded.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
})
