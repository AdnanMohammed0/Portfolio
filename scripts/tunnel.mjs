/**
 * Publishes the dev server on a public HTTPS URL with a real certificate.
 *
 * This is the reliable way to test AR on a phone. A self-signed certificate on
 * a LAN address is not enough: iOS Safari refuses getUserMedia behind an
 * untrusted certificate even after you tap through the warning, and some
 * Android builds do the same. A tunnel URL has a certificate the phone already
 * trusts, so the camera behaves exactly as it will in production.
 *
 * Run `npm run dev` in one terminal and `npm run tunnel` in another.
 */
import { spawn } from 'node:child_process';

const PORT = 5183;

console.log(`\n  Opening a public HTTPS tunnel to http://localhost:${PORT} …\n`);

const child = spawn('npx', ['--yes', 'localtunnel', '--port', String(PORT)], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
});

child.stdout.on('data', (chunk) => {
  const text = String(chunk);
  process.stdout.write(text);

  const url = text.match(/https:\/\/\S+\.loca\.lt/)?.[0];
  if (!url) return;

  console.log(`
  ─────────────────────────────────────────────────────────────
   Open this on your phone:

     ${url}

   localtunnel shows a one-time interstitial asking for a
   "tunnel password". That password is this machine's public IP,
   which the page itself links to — open the link it offers,
   copy the IP, paste it, and continue.

   The certificate is genuine, so the camera and AR will work.
  ─────────────────────────────────────────────────────────────
`);
});

child.on('exit', (code) => process.exit(code ?? 0));
