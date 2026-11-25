# Params Editor (Chrome Extension)

A Chrome extension built with TypeScript for editing parameters.

## PRD

Checkout the [PRD](./PRD.md])

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the extension:

```bash
npm run build
```

3. Load the extension in Chrome:

- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode" in the top right
- Click "Load unpacked" and select the `dist` directory

## Development

Run the development server:

```bash
npm run dev
```

Watch for changes:

```bash
npm run watch
```

## Project Structure

- `src/` - TypeScript source files
  - `background.ts` - Background script
  - `content.ts` - Content script
  - `popup.ts` - Popup script
- `public/` - Static files
  - `manifest.json` - Extension manifest
  - `popup.html` - Popup UI
  - `icons/` - Extension icons

## Building

The extension is built using webpack. The output will be in the `dist` directory, which is what you'll load into Chrome.

Production packages for the Chrome Web Store use `pnpm run build:prod` (`webpack --mode production --devtool false`). `pnpm run build` stays the local development build.

## CI/CD

Pull requests and pushes to `main` run typecheck, tests, and a production build. Releases are published to the Chrome Web Store from the **Release** workflow, which bumps `package.json` and `public/manifest.json` together.

Setup, the secret list, and how to do a first upload-only release are in [docs/ci-cd.md](docs/ci-cd.md).
