#!/usr/bin/env node
/**
 * App Store Screenshot Capture Script (iOS)
 *
 * Captures all 5 App Store screenshots from the iOS Simulator with zero
 * manual interaction — no tapping, no typing, no waiting.
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
 *   The iOS Simulator shares the host Mac's network stack, so localhost
 *   works the same way Metro (port 8081) does — no tunnelling needed.
 *
 * Prerequisites:
 *   1. Build and install the app in dev mode (only needed once per native change):
 *        npx expo run:ios
 *   2. Start Metro in a separate terminal:
 *        npx expo start
 *   3. Boot the target simulator (iPhone 16 Pro Max for best quality)
 *   4. Run this script:
 *        npm run screenshots
 *
 * Output:
 *   screenshots/raw/        — raw simulator captures at device resolution
 *   screenshots/appstore/   — resized to App Store required dimensions
 */

const { execSync, execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BUNDLE_ID = 'llc.lemang.dreami';
const STATE_SERVER_PORT = 19321;
const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'screenshots', 'raw');
const APPSTORE_DIR = path.join(ROOT, 'screenshots', 'appstore');

// App Store required sizes (portrait). sips flag: -z <height> <width>
const APPSTORE_SIZES = [
  { name: '6.9inch', width: 1320, height: 2868 },  // iPhone 16 Pro Max — required from iOS 18
  { name: '6.5inch', width: 1242, height: 2688 },  // iPhone XS Max / 11 Pro Max — required
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
    waitMs: 8000,   // Fallback timeout — normally captured on /ready signal
    label: 'Dreams empty state',
  },
  {
    name: '03-record',
    state: 'record',
    waitMs: 8000,
    label: 'Record screen',
  },
  {
    name: '04-explore',
    state: 'explore',
    waitMs: 8000,
    label: 'Explore landing screen',
  },
  {
    name: '05-settings',
    state: 'settings',
    waitMs: 8000,
    label: 'Settings modal',
  },
  {
    name: '06-explore-chat',
    state: 'explore-chat',
    waitMs: 8000,
    label: 'Explore with chat conversation',
  },
  {
    name: '07-detail',
    state: 'detail',
    waitMs: 8000,
    label: 'Dream detail with AI analysis',
  },
  {
    name: '08-dreams',
    state: 'dreams',
    waitMs: 8000,
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

// ─── Simulator helpers ────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

function getBootedSimulator() {
  const json = run('xcrun simctl list devices booted --json');
  const data = JSON.parse(json);
  for (const [, devices] of Object.entries(data.devices)) {
    for (const device of devices) {
      if (device.state === 'Booted') {
        return { udid: device.udid, name: device.name };
      }
    }
  }
  return null;
}

async function terminateApp() {
  try {
    run(`xcrun simctl terminate booted ${BUNDLE_ID}`);
    await sleep(600);
  } catch (_) {}
}

function launchApp() {
  run(`xcrun simctl launch booted ${BUNDLE_ID}`);
}

function captureScreenshot(outputPath) {
  run(`xcrun simctl io booted screenshot "${outputPath}"`);
}

function resizeForAppStore(inputPath, outputPath, width, height) {
  execFileSync('sips', ['-z', String(height), String(width), inputPath, '--out', outputPath]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('\n✦  dreAmI Screenshot Capture (iOS)\n');

  const sim = getBootedSimulator();
  if (!sim) {
    log('❌  No booted simulator found.');
    log('    Boot one in Simulator.app, then install: npx expo run:ios');
    process.exit(1);
  }
  log(`📱  Simulator: ${sim.name}`);

  try {
    run(`xcrun simctl get_app_container booted ${BUNDLE_ID} app`);
  } catch (_) {
    log(`❌  App not installed. Run: npx expo run:ios`);
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

  fs.mkdirSync(RAW_DIR, { recursive: true });
  for (const size of APPSTORE_SIZES) {
    fs.mkdirSync(path.join(APPSTORE_DIR, size.name), { recursive: true });
  }

  // ── Capture ───────────────────────────────────────────────────────────────

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

  // ── Resize ────────────────────────────────────────────────────────────────

  log('\n🎨  Resizing for App Store…\n');

  for (const size of APPSTORE_SIZES) {
    log(`  ${size.name} (${size.width}×${size.height})`);
    for (const shot of SCREENSHOTS) {
      const inputPath = path.join(RAW_DIR, `${shot.name}.png`);
      const outputPath = path.join(APPSTORE_DIR, size.name, `${shot.name}.png`);
      resizeForAppStore(inputPath, outputPath, size.width, size.height);
      log(`    → ${shot.name}.png`);
    }
  }

  log('\n✅  Done!\n');
  log('   Raw:       screenshots/raw/');
  log('   App Store: screenshots/appstore/');
  log('');
  log('   Upload screenshots/appstore/ to App Store Connect.');
  log('   6.9inch (1320×2868) and 6.5inch (1242×2688) are both required.');
  log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
