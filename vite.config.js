import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const integrationProxy = {
  '/fizzy-api': {
    target: 'https://app.fizzy.do',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/fizzy-api/, '')
  },
  '/trello-api': {
    target: 'https://api.trello.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/trello-api/, '')
  }
};

export default defineConfig({
  server: {
    proxy: integrationProxy
  },
  preview: {
    proxy: integrationProxy
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['app-icon.svg', 'fizzy.png', 'trello.svg'],
      manifest: {
        name: 'Bloco - Time blocking local',
        short_name: 'Bloco',
        description: 'Planeje tarefas em blocos de tempo, direto no seu navegador.',
        theme_color: '#f7f8f7',
        background_color: '#f7f8f7',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
