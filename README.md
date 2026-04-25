# dreAmI

A fully offline dream journaling app. Record your dreams by voice, get an AI-generated summary, and chat with your dream history — all on-device with no server or internet required after setup.

## Features

- **Voice recording** — capture dreams as audio with `expo-audio`
- **Transcription** — Whisper small.en (GGML, ~488 MB) runs on-device; iOS uses Core ML ANE acceleration
- **Summarization** — Llama 3.2 1B Instruct Q4_K_M (~800 MB) generates dream summaries locally
- **RAG chat** — ask questions across your dream history using Nomic Embed v1.5 Q8 (~146 MB) + cosine similarity search in SQLite
- **Daily reminders** — optional push notification to prompt morning journaling
- **Dark-only UI** — Cinzel + Outfit fonts, deep blue/purple palette

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo ~55, expo-router, React Native 0.83 |
| LLM inference | llama.rn 0.9 |
| Speech-to-text | whisper.rn 0.5 |
| Embeddings | llama.rn (Nomic embed GGUF) |
| Database | expo-sqlite + Drizzle ORM |
| State | Zustand |
| Animations | React Native Reanimated |

## Models Downloaded at First Launch

| Model | Size | Purpose |
|---|---|---|
| Llama 3.2 1B Instruct Q4_K_M | ~800 MB | Summarization & chat |
| Whisper small.en (GGML) | ~488 MB | Transcription |
| Whisper Core ML encoder (iOS) | ~150 MB | ANE acceleration on iPhone/iPad |
| Nomic Embed Text v1.5 Q8 | ~146 MB | Dream embeddings for RAG |

Models are stored in the app's document directory and survive app updates.

## Requirements

- Node.js 18+
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)
- For iOS: Xcode 15+, iOS 16+ device or simulator
- For Android: Android Studio, API 26+ device or emulator

## Setup

```bash
cd dream-diary
npm install
```

### iOS — additional step

```bash
cd ios && pod install && cd ..
```

## Running in Development

```bash
# Start Metro bundler
npx expo start

# Run directly on iOS simulator
npx expo run:ios

# Run directly on Android emulator
npx expo run:android
```

## Building for Simulator

### iOS Simulator (debug)

```bash
npx expo run:ios --configuration Debug
```

### iOS Simulator (release — tests production JS bundle and optimizations)

```bash
npx expo run:ios --configuration Release
```

> **Note:** The Release configuration builds the full JS bundle locally and disables the Metro dev server. This is useful for performance testing before a real device build. The simulator cannot run on a physical device.

### Android Emulator (debug)

```bash
npx expo run:android --variant debug
```

### Android Emulator (release)

```bash
npx expo run:android --variant release
```

## Building for Physical Device

### iOS — Physical Device (local build)

1. Connect your iPhone via USB and trust the computer on the device.
2. Open `ios/dreami.xcworkspace` in Xcode.
3. Set your Apple Developer team under **Signing & Capabilities**.
4. Select your device in the scheme dropdown.
5. Build and run from Xcode (`⌘R`), or via CLI:

```bash
npx expo run:ios --device
```

For a release build to a physical device:

```bash
npx expo run:ios --device --configuration Release
```

### Android — Physical Device (local build)

1. Enable Developer Options and USB Debugging on the device.
2. Connect via USB.

```bash
# Debug
npx expo run:android --device --variant debug

# Release (requires a signing keystore)
npx expo run:android --device --variant release
```

> **Note:** A release APK requires a signing keystore. Generate one with:
> ```bash
> keytool -genkey -v -keystore android/app/dreami.keystore \
>   -alias dreami -keyalg RSA -keysize 2048 -validity 10000
> ```
> Then reference it in `android/app/build.gradle` under `signingConfigs`.

## Clean Builds

When deploying release builds — especially after dependency updates, native module changes, or if you hit unexplained runtime errors — do a clean build:

### iOS

```bash
cd ios
xcodebuild clean
cd ..
rm -rf ios/build
npx expo run:ios --configuration Release
```

Or clean from Xcode: **Product → Clean Build Folder** (`⇧⌘K`), then build.

### Android

```bash
cd android
./gradlew clean
cd ..
npx expo run:android --variant release
```

### Clear Metro cache before building

```bash
# iOS
npx expo start --clear && npx expo run:ios --configuration Release

# Android
npx expo start --clear && npx expo run:android --variant release
```

---

## EAS Build (Cloud — for distribution)

[EAS Build](https://docs.expo.dev/build/introduction/) handles signing and produces `.ipa` / `.apk` / `.aab` files without needing local Xcode/Android Studio setup.

```bash
npm install -g eas-cli
eas login

# Development build (includes dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal distribution, no store)
eas build --profile preview --platform all

# Production build (App Store / Play Store)
eas build --profile production --platform all
```

Profiles are defined in `eas.json`.

## Generating Screenshots

Screenshots are captured automatically with zero manual interaction. The app runs a tiny HTTP state server that seeds demo data and navigates to each target screen; captures happen as soon as the screen signals ready.

### iOS (App Store)

**Prerequisites — do once per native change:**

```bash
# 1. Build and install on the simulator
npx expo run:ios

# 2. Start Metro in a separate terminal
npx expo start
```

**Capture:**

```bash
# Boot iPhone 16 Pro Max in Simulator.app, then:
npm run screenshots
```

Output:
- `screenshots/raw/` — raw simulator captures
- `screenshots/appstore/6.9inch/` — 1320×2868 (iPhone 16 Pro Max, required from iOS 18)
- `screenshots/appstore/6.5inch/` — 1242×2688 (iPhone XS Max / 11 Pro Max, required)

Upload the `screenshots/appstore/` folders to App Store Connect. Both size sets are required.

### Android (Google Play)

**Prerequisites — do once per native change:**

```bash
# 1. Build and install on the device/emulator
npx expo run:android

# 2. Start Metro in a separate terminal
npx expo start
```

**Capture:**

```bash
# Connect a device (USB debugging on) or start an emulator, then:
npm run screenshots:android
```

The script uses `adb reverse` to forward the state server port to the device — no extra setup needed for physical devices.

Output:
- `screenshots/raw/android/` — raw device captures
- `screenshots/appstore/android/phone/` — 1080×1920 (required for Play Store)

Upload `screenshots/appstore/android/phone/` to Google Play Console.

---

## Version Bumping

Use the `bump-version` script to keep `app.json`, `package.json`, and the native iOS files in sync:

```bash
npm run bump-version 1.2.0
```

This updates:
- `app.json` — `expo.version`
- `package.json` — `version`
- `ios/dreAmI.xcodeproj/project.pbxproj` — `MARKETING_VERSION` (what Xcode archive reads)
- `ios/dreAmI/Info.plist` — `CFBundleShortVersionString`

For Android, also increment `versionCode` manually in `android/app/build.gradle` before building — see [ANDROID_DEPLOY.md](./ANDROID_DEPLOY.md).

## Database

Drizzle ORM + expo-sqlite. Schema lives in `src/db/`. To generate migrations after schema changes:

```bash
npx drizzle-kit generate
```

Migrations run automatically on app launch.

## Project Structure

```
app/                    expo-router screens
  (onboarding)/         model download flow
  (tabs)/               main tab nav (journal, record, chat)
    dream/              dream detail (nested here to keep the tab bar visible)
  settings.tsx
src/
  audio/                recorder, transcriber
  components/           shared UI components
  db/                   drizzle schema + client
  hooks/                useDreams, useRecorder, useTranscription, useModelStatus
  llm/                  prompts, summarizer, chat streaming
  models/               LLM/whisper/embed singletons + config.ts
  notifications/        daily reminder scheduler
  rag/                  chunker, embedder, retriever, pipeline
  stores/               zustand stores (app, dream, chat)
  utils/                cosine similarity, file system helpers
plugins/                custom Expo config plugins (largeHeap, FollyFix)
```

## Notes

- iOS entitlement `com.apple.developer.kernel.increased-memory-limit` is required to load the LLM on device — this is set in `app.config.ts` and applied automatically.
- Android uses `android:largeHeap="true"` via the `withLargeHeap` plugin for the same reason.
- Whisper Core ML model is iOS-only and downloads as a zip that is extracted automatically.
- All inference is synchronous and single-threaded; do not attempt concurrent model calls.
