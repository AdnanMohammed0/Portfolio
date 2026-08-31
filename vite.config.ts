import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'node:path';

/**
 * `npm run dev` serves over HTTPS on the local network.
 *
 * The AR hand tracking calls getUserMedia, which browsers only allow in a
 * secure context. `localhost` counts as secure, but a LAN address does not —
 * so testing on a phone over http://192.168.x.x would silently break the
 * camera. A self-signed certificate keeps that path working; the phone shows a
 * one-time "not private" warning that you accept to continue.
 */
export default defineConfig({
  plugins: [react(), basicSsl()],
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
