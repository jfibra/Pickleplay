#!/usr/bin/env node
/**
 * npm run start:prototype: Metro with .env.prototype (sample accounts and data, no Supabase)
 * in place of .env, so a demo never picks up the values someone has in their own .env.
 * npm run start:prototype:usb does the same through start-usb.js, for a phone on a USB cable.
 *
 * EXPO_NO_DOTENV stops Expo loading .env itself. EXPO_PUBLIC_* values are inlined into the
 * bundle, so the cache is cleared every time: a bundle built from .env must not be reused.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '.env.prototype');
const env = { ...process.env, EXPO_NO_DOTENV: '1' };
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (match) env[match[1]] = match[2];
}

const args = process.argv.slice(2);
const usb = args.includes('--usb');
const rest = args.filter((a) => a !== '--usb');
const command = usb
  ? [path.join(__dirname, 'start-usb.js'), '--clear', ...rest]
  : [require.resolve('expo/bin/cli'), 'start', '--clear', ...rest];

const expo = spawn(process.execPath, command, { stdio: 'inherit', env });

process.on('SIGINT', () => {});
expo.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
