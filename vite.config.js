import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    server: {
      host: 'localhost',
      strictPort: false,
      cors: false,
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/claude/, '/v1/messages'),
          headers: {
            'anthropic-version': '2023-06-01',
            'x-api-key': env.VITE_ANTHROPIC_API_KEY,
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        },
      },
    },
  }
})