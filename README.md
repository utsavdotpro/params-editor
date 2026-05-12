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


## Docker Compose (Full-Stack Dev)

This repository now includes a local Docker Compose setup for running:

- Extension development server (`extension-dev`) on `http://localhost:8080`
- PocketBase (`pocketbase`) on `http://localhost:8090`

### Start all services

```bash
./scripts/docker-up.sh
```

### Stop all services

```bash
./scripts/docker-down.sh
```

### Follow logs

```bash
./scripts/docker-logs.sh
```

Or for a single service:

```bash
./scripts/docker-logs.sh pocketbase
```

### Run extension production build in Docker

```bash
./scripts/docker-build.sh
```

> Note: schema/seed import for PocketBase is intentionally left manual for now.
