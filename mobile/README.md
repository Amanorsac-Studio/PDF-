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
```

CI workflow lives at the repo root: `.github/workflows/testflight.yml` (GitHub
only discovers workflows there, not in a subfolder) — it scopes its steps to
this `mobile/` directory.

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

This repo ships a GitHub Actions workflow (`.github/workflows/testflight.yml`,
scoped to `mobile/`) that builds the iOS app with EAS and submits it straight
to TestFlight. It runs on push to `main` (when `mobile/**` changes), on tags
matching `mobile-v*`, or manually via **Actions → EazyScanner - Build & Submit
to TestFlight → Run workflow**.

### Secrets it needs

| Secret | Value | Likely already in the org? |
|---|---|---|
| `APPLE_TEAM_ID` | Apple Developer Team ID | Yes — same team as other Amanorsac Studio apps |
| `ASC_KEY_ID` | App Store Connect API key's Key ID | Yes, if reusing an existing ASC API key |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID (UUID) | Yes, if reusing an existing ASC API key |
| `ASC_KEY_P8` | contents of the `AuthKey_XXXXXXXX.p8` file (raw text or base64 — the workflow detects either) | Yes, if reusing an existing ASC API key |
| `ASC_APP_ID` | **this app's** numeric Apple ID (App Store Connect → this app → App Information) | **No — always new per app.** EazyScanner needs its own, once it's registered in App Store Connect under bundle id `com.amanorsac.eazyscanner` |
| `EXPO_TOKEN` | an Expo access token (expo.dev → account → Settings → Access Tokens) | Only if EAS/Expo has been used for a prior app in this org — otherwise new |

If an org-wide App Store Connect API key already exists (reused across
Amanorsac products per the macOS signing standard's convention), only
`ASC_APP_ID` and possibly `EXPO_TOKEN` need adding for this app specifically.
Repo secrets take priority over an org secret of the same name if you need to
override one just for this repo.

One more one-time step, local only (no secret involved):

```bash
cd mobile
npx eas-cli login
npx eas-cli init          # creates the EAS project, fills in app.json > expo.extra.eas.projectId
```
Commit the resulting `app.json` change — it's currently a placeholder.

Push to `main` (or run the workflow manually) once the secrets are in place.
The workflow builds a production iOS binary on Expo's build servers and
submits it to TestFlight; it becomes available to internal testers a few
minutes after Apple finishes processing.

No Apple credentials or private keys are stored in this repo — the workflow
writes the `.p8` key to a temp file for the submit step only and removes it
afterward.
