import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
    plugins: [
      react(),
      {
        name: 'process-polyfill',
        config: () => {
          return {
            define: {
              'process.env': JSON.stringify({}),
            },
          };
        },
      },
    ],
    server: {
      port: 5174,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
  });