#!/usr/bin/env node
/**
 * npm run start:usb: Metro for a phone on a USB cable, opened in Expo Go.
 *
 * Runs `expo start --localhost --android --port 8082` and keeps the phone's port
 * forwards (adb reverse) for Metro and the API server (Config.js defaults to
 * http://localhost:5001) in place. Android drops those forwards whenever the
 * phone reconnects (a replugged cable, a USB mode change, adb restarting), and
 * the app then fails with "Unable to load script" although Metro is running.
 * This checks for that every few seconds and restores them.
 *
 * Metro uses 8082 rather than 8081 so it can run beside other Expo projects.
 * Override with RCT_METRO_PORT.
 */
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.RCT_METRO_PORT || '8082';
const API_PORT = '5001';

function findAdb() {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const sdks = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Library', 'Android', 'sdk'),
    process.env.HOME && path.join(process.env.HOME, 'Android', 'Sdk'),
  ].filter(Boolean);
  for (const sdk of sdks) {
    const candidate = path.join(sdk, 'platform-tools', exe);
    if (fs.existsSync(candidate)) return candidate;
  }
  return exe; // hope it is on PATH
}

const adb = findAdb();
/** How often to check each phone still has the forwards. A few adb calls per phone, each cheap. */
const CHECK_MS = 2500;
let stopping = false;
let timer = null;

const run = (args) =>
  new Promise((resolve) => execFile(adb, args, (error, stdout) => resolve({ error, stdout })));

/**
 * Checks the forwards themselves rather than watching for reconnects: a reconnect can
 * come back with the same serial and state (so `adb track-devices` reports no
 * change) and still have lost them. Other tools' forwards are left alone.
 */
async function check() {
  const devices = await run(['devices']);
  if (devices.error) {
    if (devices.error.code === 'ENOENT') {
      console.log(
        '[usb] adb was not found, so a reconnected phone will need `adb reverse` by hand.',
      );
      return;
    }
  } else {
    const serials = devices.stdout
      .split('\n')
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .filter(([serial, state]) => serial && state === 'device')
      .map(([serial]) => serial);
    for (const serial of serials) {
      const rules = await run(['-s', serial, 'reverse', '--list']);
      if (rules.error) continue;
      for (const port of [PORT, API_PORT]) {
        if (rules.stdout.includes(`tcp:${port} tcp:${port}`)) continue;
        const added = await run(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
        console.log(
          added.error
            ? `[usb] Could not forward port ${port} to ${serial}: ${added.error.message.trim()}`
            : `[usb] Forwarded port ${port} to ${serial} (adb reverse tcp:${port}).`,
        );
      }
    }
  }
  if (!stopping) timer = setTimeout(check, CHECK_MS);
}

const expo = spawn(
  process.execPath,
  [
    require.resolve('expo/bin/cli'),
    'start',
    '--localhost',
    '--android',
    '--port',
    PORT,
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);

// Expo sets the Metro forward up itself as it opens the app; start checking once it has.
timer = setTimeout(check, CHECK_MS * 2);

// Ctrl+C reaches Expo too; wait for it to shut down instead of exiting first.
process.on('SIGINT', () => {});
expo.on('exit', (code, signal) => {
  stopping = true;
  clearTimeout(timer);
  process.exit(code ?? (signal ? 1 : 0));
});
