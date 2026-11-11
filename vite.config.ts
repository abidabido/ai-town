import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ai-town',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['ai-town-your-app-name.fly.dev', 'localhost', 'redesigned-dollop-vgq5599rxw6hjpr-5173.app.github.dev', '127.0.0.1'],
  },
});
