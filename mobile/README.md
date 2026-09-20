# EazyScanner

A mobile document scanner and image-to-PDF converter — scan documents, receipts,
and ID cards with automatic edge detection and perspective correction (using the
OS-native scanner on each platform: Apple VisionKit on iOS, ML Kit Document
Scanner on Android), reorder/rotate pages, and export clean multi-page PDFs. You
can also import existing photos from your library and turn them into a PDF.

Bundle identifier: `com.amanorsac.eazyscanner` (iOS and Android).

Built with Expo + React Native.

## Features

- **Scan** — native document-edge detection and perspective crop, multi-page in one session
- **Take photo** — plain in-app camera capture (continuous, snap as many pages as you need, then Done)
- **Import photos** — turn existing pictures into a PDF, up to 1000 at once
- **Review** — reorder, rotate, and remove pages before exporting
- **Library** — every exported PDF is saved on-device, renamable, searchable by title, shareable, deletable
- **Share/export** — hands the PDF to the OS share sheet (AirDrop, Mail, Files, Drive, etc.)
- Light/dark mode, no account required, everything processed on-device (no uploads)

No license file is included in this app; it's not published under one.

## Project layout

```
mobile/
  App.tsx                  navigation shell
  app.json                 Expo app config (bundle id, permissions, plugins)
  eas.json                 EAS Build/Submit profiles
  src/
    screens/               Library, Scan, Review screens
    lib/                   pdf.ts (pdf-lib PDF assembly), imageOps.ts, library.ts (AsyncStorage index)
    theme/                 light/dark palette
  .github/workflows/testflight.yml   CI: EAS build + submit to TestFlight
```

## Local development

```bash
cd mobile
npm install
npx expo start
```

Document scanning uses a native module (`react-native-document-scanner-plugin`),
so it will **not** work in Expo Go — use an EAS development build:

```bash
eas build --profile development --platform ios   # or --platform android
```

## Shipping to TestFlight

This repo ships a GitHub Actions workflow
(`mobile/.github/workflows/testflight.yml`) that builds the iOS app with EAS and
submits it straight to TestFlight. It runs on push to `main` (when `mobile/**`
changes), on tags matching `mobile-v*`, or manually via **Actions → EazyScanner -
Build & Submit to TestFlight → Run workflow**.

### One-time setup (required before the workflow can run)

These steps need an Expo account and an Apple Developer Program membership —
they can't be done from inside this session, so do them once yourself:

1. **Create/link the EAS project**
   ```bash
   cd mobile
   npx eas-cli login
   npx eas-cli init          # creates the project, fills in app.json > expo.extra.eas.projectId
   ```
   Commit the resulting `app.json` change.

2. **Create an Expo access token** for CI: https://expo.dev/accounts/[account]/settings/access-tokens
   → add it as the repo or org secret **`EXPO_TOKEN`**.

3. **Register the app in App Store Connect** (bundle id `com.amanorsac.eazyscanner`),
   then create an **App Store Connect API key**
   (App Store Connect → Users and Access → Integrations → App Store Connect API,
   role "App Manager" or above). Download the `.p8` file — Apple only lets you
   download it once.

4. **Add these as repository or organization secrets** (Settings → Secrets and
   variables → Actions):

   | Secret | Value |
   |---|---|
   | `EXPO_TOKEN` | the Expo access token from step 2 |
   | `ASC_API_KEY_P8` | full contents of the `.p8` file from step 3 |
   | `ASC_KEY_ID` | the API key's Key ID (App Store Connect → Integrations) |
   | `ASC_ISSUER_ID` | your App Store Connect Issuer ID |
   | `ASC_APP_ID` | the app's Apple ID / ASC App ID (numeric, found on the app's App Store Connect page under App Information) |
   | `APPLE_TEAM_ID` | your Apple Developer Team ID |

   Org-level secrets work as-is (they're just referenced by name) — no repo-level
   duplication needed as long as this repo is included in the org secret's access list.

5. Push to `main` (or run the workflow manually). The workflow builds a
   production iOS binary on Expo's build servers and submits it to TestFlight;
   it becomes available to internal testers a few minutes after Apple finishes
   processing.

No Apple credentials or private keys are stored in this repo — the workflow
writes the `.p8` key to a temp file for the submit step only and removes it
afterward.
