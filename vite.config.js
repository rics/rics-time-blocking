import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

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
  build: {
    rollupOptions: {
      input: {
        app: resolve(projectRoot, 'index.html'),
        landing: resolve(projectRoot, 'site/index.html'),
        docs: resolve(projectRoot, 'site/docs.html')
      }
    }
  },
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
      includeAssets: [
        'app-icon.svg',
        'fizzy.png',
        'trello.svg',
        'giphy.webp',
        'support_me_on_kofi_badge_beige.webp'
      ],
      manifest: {
        name: 'Rics Time-blocking',
        short_name: 'Rics Time-blocking',
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}']
      }
    })
  ]
});
