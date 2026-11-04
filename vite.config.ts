import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Backend al que se mandan las peticiones /api en desarrollo (por defecto el Laravel local)
const apiTarget = process.env.API_TARGET || 'http://localhost:8000'

export default defineConfig({
  // NO_HTTPS=1 desactiva el certificado autofirmado (útil para previsualizar en navegadores que lo bloquean)
  plugins: [react(), tailwindcss(), ...(process.env.NO_HTTPS ? [] : [basicSsl()])],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/sanctum': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
