import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'node:path';

/**
 * Dev server transport.
 *
 * AR calls getUserMedia, which browsers only allow in a secure context.
 * `localhost` qualifies; a plain-HTTP LAN address does not.
 *
 * `npm run dev:https` adds a self-signed certificate, which is enough for
 * Android Chrome after you accept the warning. iOS Safari refuses the camera
 * behind an untrusted certificate no matter what, so for iPhone testing use
 * `npm run tunnel`, which publishes this server on a URL with a real
 * certificate.
 */
const useHttps = process.env.VITE_DEV_HTTPS === '1';

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    // Bind to every interface so the dev server is reachable from a phone.
    host: true,
    port: 5183,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
