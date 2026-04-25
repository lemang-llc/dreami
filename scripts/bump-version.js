#!/usr/bin/env node
/**
 * Usage: node scripts/bump-version.js <major.minor.patch>
 *
 * Updates version in:
 *   app.json                              (expo.version)
 *   package.json                          (version)
 *   ios/dreAmI.xcodeproj/project.pbxproj  (MARKETING_VERSION, major.minor only)
 *   ios/dreAmI/Info.plist                 (CFBundleShortVersionString)
 *
 * The ios/ directory is gitignored in this project; the script updates those
 * files in-place so Xcode archive picks up the right version.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/bump-version.js <major.minor.patch>');
  process.exit(1);
}

const [major, minor] = version.split('.');
const marketingVersion = `${major}.${minor}`;

function updateJson(relPath, updater) {
  const abs = path.join(root, relPath);
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
  updater(json);
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n');
  console.log(`  ${relPath} → ${version}`);
}

function updateText(relPath, transform) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    console.log(`  ${relPath} — not found, skipping`);
    return;
  }
  fs.writeFileSync(abs, transform(fs.readFileSync(abs, 'utf8')));
  console.log(`  ${relPath} → ${version}`);
}

console.log(`Bumping version to ${version}…\n`);

updateJson('app.json', (j) => { j.expo.version = version; });
updateJson('package.json', (j) => { j.version = version; });

updateText(
  'ios/dreAmI.xcodeproj/project.pbxproj',
  (s) => s.replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${marketingVersion};`),
);

updateText(
  'ios/dreAmI/Info.plist',
  (s) => s.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[\d.]+(<\/string>)/,
    `$1${version}$2`,
  ),
);

console.log('\nDone.');
