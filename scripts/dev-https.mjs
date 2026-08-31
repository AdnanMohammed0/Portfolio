/**
 * Dev server over HTTPS with a self-signed certificate.
 *
 * Enough for Android Chrome to treat the LAN origin as secure (accept the
 * one-time warning). iOS Safari will still refuse the camera — use
 * `npm run tunnel` there.
 */
import { spawn } from 'node:child_process';

const child = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_DEV_HTTPS: '1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
