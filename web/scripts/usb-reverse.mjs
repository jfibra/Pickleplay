// Forwards the dev ports to an Android phone over USB so it can open http://localhost:3000.
// localhost is a secure context, so geolocation, camera and crypto.randomUUID all work on the phone.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PORTS = [3000, 5001]; // Vite, API server

const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
const sdkRoots = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
  process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk'),
  process.env.HOME && join(process.env.HOME, 'Android', 'Sdk'),
].filter(Boolean);
const adb = sdkRoots.map((root) => join(root, 'platform-tools', exe)).find(existsSync) ?? 'adb';

const run = (...args) => execFileSync(adb, args, { encoding: 'utf8' }).trim();

try {
  const devices = run('devices').split('\n').slice(1).filter((line) => /\tdevice$/.test(line));
  if (devices.length === 0) {
    console.error('No authorized Android device found. Plug in the phone, enable USB debugging, and accept the prompt.');
    process.exit(1);
  }
  for (const port of PORTS) run('reverse', `tcp:${port}`, `tcp:${port}`);
  console.log(`USB forwarding ready on ${devices.length} device(s): open http://localhost:${PORTS[0]} on the phone.`);
} catch (err) {
  console.error(`adb failed (${adb}): ${err.message}`);
  process.exit(1);
}
