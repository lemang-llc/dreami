#!/usr/bin/env node
/**
 * App Store Screenshot Capture Script (Android)
 *
 * Captures all 5 Google Play screenshots from a connected Android device or
 * emulator with zero manual interaction — no tapping, no typing, no waiting.
 *
 * How it works:
 *   This script runs a tiny HTTP server on localhost:19321. The app (in dev
 *   builds only) fetches http://localhost:19321/screenshot-state on every
 *   cold launch. If a state is set, the app seeds the database with demo
 *   dreams and navigates to the target screen. When the target screen is
 *   rendered the app POSTs to /ready — the script captures immediately
 *   instead of waiting a fixed delay. For the splash shot there is no ready
 *   signal, so the fixed waitMs is used as a timeout.
 *
 *   For a physical device, the device must be connected via USB and ADB must
 *   be authorised. The script uses `adb reverse` to forward
 *   localhost:19321 → the host Mac so the app can reach the state server.
 *
 * Prerequisites:
 *   1. Build and install the app in dev mode (only needed once per native change):
 *        npx expo run:android
 *   2. Start Metro in a separate terminal:
 *        npx expo start
 *   3. Connect a device or start an emulator
 *   4. Run this script:
 *        npm run screenshots:android
 *
 * Output:
 *   screenshots/raw/android/        — raw device captures at device resolution
 *   screenshots/appstore/android/   — resized to Google Play required dimensions
 */

const { execSync, execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PACKAGE_NAME = 'llc.lemang.dreami';
const ACTIVITY = 'llc.lemang.dreami.MainActivity';
const STATE_SERVER_PORT = 19321;
const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'screenshots', 'raw', 'android');
const APPSTORE_DIR = path.join(ROOT, 'screenshots', 'appstore', 'android');

// Google Play required sizes (portrait). sips flag: -z <height> <width>
const PLAY_SIZES = [
  { name: 'phone', width: 1080, height: 1920 },   // Phone — required
];

// Screenshots in order.
// state: null   → normal launch; splash animation plays, waitMs used as fixed timeout
// state: string → app seeds data, navigates, then POSTs /ready — waitMs is just a fallback
const SCREENSHOTS = [
  {
    name: '01-splash',
    state: null,
    waitMs: 6000,   // App load (~1.5s) + splash hold (3.2s) + buffer — no ready signal
    label: 'Animated splash screen',
  },
  {
    name: '02-empty',
    state: 'empty',
    waitMs: 10000,  // Fallback timeout — normally captured on /ready signal
    label: 'Dreams empty state',
  },
  {
    name: '03-record',
    state: 'record',
    waitMs: 10000,
    label: 'Record screen',
  },
  {
    name: '04-explore',
    state: 'explore',
    waitMs: 10000,
    label: 'Explore landing screen',
  },
  {
    name: '05-settings',
    state: 'settings',
    waitMs: 10000,
    label: 'Settings modal',
  },
  {
    name: '06-explore-chat',
    state: 'explore-chat',
    waitMs: 10000,
    label: 'Explore with chat conversation',
  },
  {
    name: '07-detail',
    state: 'detail',
    waitMs: 10000,
    label: 'Dream detail with AI analysis',
  },
  {
    name: '08-dreams',
    state: 'dreams',
    waitMs: 10000,
    label: 'Dreams list with entries',
  },
];

// ─── State server ─────────────────────────────────────────────────────────────

let currentState = null; // The state the next app launch will receive
let readyResolve = null; // Resolves when the app POSTs /ready
let appIsReady = false;

function startStateServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/ready') {
        res.end('ok');
        appIsReady = true;
        if (readyResolve) {
          readyResolve();
          readyResolve = null;
        }
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ state: currentState }));
    });
    server.listen(STATE_SERVER_PORT, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}

/** Resolves when the app signals ready, or after timeoutMs (whichever comes first). */
function waitForReady(timeoutMs) {
  return new Promise(resolve => {
    if (appIsReady) { resolve(); return; }
    readyResolve = resolve;
    setTimeout(() => {
      readyResolve = null;
      resolve();
    }, timeoutMs);
  });
}

// ─── ADB helpers ──────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8' }).trim();
}

function getConnectedDevice() {
  const output = adb('devices');
  const lines = output.split('\n').slice(1).filter(l => l.trim());
  for (const line of lines) {
    const [serial, state] = line.trim().split(/\s+/);
    if (state === 'device' && serial) {
      return serial;
    }
  }
  return null;
}

function setupAdbReverse() {
  // Forward host port → device so localhost:PORT works in the app
  adb('reverse', `tcp:${STATE_SERVER_PORT}`, `tcp:${STATE_SERVER_PORT}`);
}

async function terminateApp() {
  try {
    adb('shell', 'am', 'force-stop', PACKAGE_NAME);
    await sleep(600);
  } catch (_) {}
}

function launchApp() {
  adb(
    'shell', 'am', 'start',
    '-n', `${PACKAGE_NAME}/${ACTIVITY}`,
    '-a', 'android.intent.action.MAIN',
    '-c', 'android.intent.category.LAUNCHER',
  );
}

function captureScreenshot(outputPath) {
  const devicePath = `/sdcard/screenshot_tmp.png`;
  adb('shell', 'screencap', '-p', devicePath);
  adb('pull', devicePath, outputPath);
  adb('shell', 'rm', devicePath);
}

function resizeForPlayStore(inputPath, outputPath, width, height) {
  execFileSync('sips', ['-z', String(height), String(width), inputPath, '--out', outputPath]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('\n✦  dreAmI Screenshot Capture (Android)\n');

  const device = getConnectedDevice();
  if (!device) {
    log('❌  No connected Android device or emulator found.');
    log('    Connect a device (USB debugging on) or start an emulator.');
    process.exit(1);
  }
  log(`📱  Device: ${device}`);

  // Verify app is installed
  try {
    const installed = adb('shell', 'pm', 'list', 'packages', PACKAGE_NAME);
    if (!installed.includes(PACKAGE_NAME)) throw new Error('not found');
  } catch (_) {
    log(`❌  App not installed. Run: npx expo run:android`);
    process.exit(1);
  }

  let server;
  try {
    server = await startStateServer();
    log(`🌐  State server on :${STATE_SERVER_PORT}`);
  } catch (err) {
    log(`❌  Could not start state server: ${err.message}`);
    log(`    Is something else using port ${STATE_SERVER_PORT}?`);
    process.exit(1);
  }

  // Forward localhost from device → host
  try {
    setupAdbReverse();
    log(`🔗  ADB reverse: device:${STATE_SERVER_PORT} → host:${STATE_SERVER_PORT}`);
  } catch (err) {
    server.close();
    log(`❌  adb reverse failed: ${err.message}`);
    process.exit(1);
  }

  fs.mkdirSync(RAW_DIR, { recursive: true });
  for (const size of PLAY_SIZES) {
    fs.mkdirSync(path.join(APPSTORE_DIR, size.name), { recursive: true });
  }

  // ── Capture ─────────────────────────────────────────────────────────────────

  for (const shot of SCREENSHOTS) {
    log(`\n📸  ${shot.name} — ${shot.label}`);

    currentState = shot.state;
    appIsReady = false;
    readyResolve = null;
    log(`    State: ${shot.state ?? '(none — splash)'}`);

    await terminateApp();
    launchApp();

    if (shot.state === null) {
      // Splash: fixed wait, no ready signal
      log(`    Waiting ${shot.waitMs}ms (splash)…`);
      await sleep(shot.waitMs);
    } else {
      log(`    Waiting for /ready signal (timeout ${shot.waitMs}ms)…`);
      await waitForReady(shot.waitMs);
      log(`    Screen ready${appIsReady ? '' : ' (timeout)'}`);
    }

    const rawPath = path.join(RAW_DIR, `${shot.name}.png`);
    captureScreenshot(rawPath);
    log(`    ✅  ${path.relative(ROOT, rawPath)}`);
  }

  server.close();
  await terminateApp();

  // ── Resize ──────────────────────────────────────────────────────────────────

  log('\n🎨  Resizing for Google Play…\n');

  for (const size of PLAY_SIZES) {
    log(`  ${size.name} (${size.width}×${size.height})`);
    for (const shot of SCREENSHOTS) {
      const inputPath = path.join(RAW_DIR, `${shot.name}.png`);
      const outputPath = path.join(APPSTORE_DIR, size.name, `${shot.name}.png`);
      resizeForPlayStore(inputPath, outputPath, size.width, size.height);
      log(`    → ${shot.name}.png`);
    }
  }

  log('\n✅  Done!\n');
  log('   Raw:        screenshots/raw/android/');
  log('   Play Store: screenshots/appstore/android/');
  log('');
  log('   Upload screenshots/appstore/android/phone/ to Google Play Console.');
  log('   Phone screenshots (1080×1920) are required.');
  log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
