# Curatorr Desktop

A Windows desktop wrapper for [Curatorr](https://github.com/MickyGX/curatorr) — runs the Curatorr server locally and opens it in your browser, with a system tray icon for easy access.

## Download

Grab the latest installer from the [Releases](https://github.com/MickyGX/curatorr-desktop/releases) page:

- **Curatorr Setup x.x.x.exe** — installs to Program Files with Start Menu & Desktop shortcuts
- **Curatorr x.x.x.exe** — portable, no install needed, just run it

## What it does

- Starts the Curatorr server on `http://localhost:7676`
- Opens your browser automatically on launch
- Runs silently in the system tray — right-click the icon to open or quit
- Checks for updates automatically in the background

All data is stored in `%APPDATA%\Curatorr\` — your config and database persist between updates.

## Requirements

- Windows 10 or later (64-bit)
- No other software needed — Node.js is bundled

## Building from source

Requires [Node.js 20+](https://nodejs.org) and [Git](https://git-scm.com).

```bat
git clone --recurse-submodules https://github.com/MickyGX/curatorr-desktop
cd curatorr-desktop
npm install
npm start
```

To build an installer:

```bat
npm run dist
```

Output goes to the `dist/` folder.

## Auto-updates

Curatorr Desktop checks for new releases on GitHub at startup and will prompt you to update when one is available.
