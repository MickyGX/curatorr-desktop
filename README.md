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

All data is stored in `%APPDATA%\curatorr-desktop\` — your config and database persist between updates.

## Spotify setup

Spotify playlist import in Curatorr Desktop needs Spotify app credentials before you launch the app. The recommended desktop-specific option is a `.env` file in `%APPDATA%\curatorr-desktop\`.

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add this redirect URI:
   `http://localhost:7676/user-settings/spotify/callback`
3. Curatorr Desktop will create this file automatically on first run:
   `%APPDATA%\curatorr-desktop\.env`
4. Edit it and add your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

5. Fully quit Curatorr Desktop and start it again.
6. Open `User Settings -> Spotify` inside Curatorr and connect your Spotify account.

Alternative: set normal Windows environment variables in a terminal:

```bat
setx SPOTIFY_CLIENT_ID "your-client-id"
setx SPOTIFY_CLIENT_SECRET "your-client-secret"
```

If you change the desktop port via the `PORT` variable, update the redirect URI in your Spotify app to use that same port.

## Desktop environment variables

Curatorr Desktop starts the bundled Curatorr server and reads configuration from:

1. normal system environment variables
2. `%APPDATA%\curatorr-desktop\.env`
3. a `.env` beside the app executable, mainly useful for portable installs

System environment variables take priority over `.env` files. `%APPDATA%\curatorr-desktop\.env` is the recommended place for user-managed desktop settings because updates should not touch it.

Commonly useful variables:

- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`: enable Spotify account connection and Spotify playlist import.
- `SPOTIFY_TIMEOUT_MS`: override Spotify API timeout in milliseconds. Default is `15000`.
- `PORT`: change the local port the desktop server listens on. Default is `7676`.
- `WEBHOOK_SECRET`: set a fixed webhook secret instead of letting Curatorr generate one.
- `LOCAL_AUTH_MIN_PASSWORD`: change the minimum password length for local Curatorr accounts. Default is `12`.
- `SESSION_COOKIE_NAME`: override the session cookie name. Default is `curatorr_session`.
- `HTTP_ACCESS_LOGS` and `HTTP_ACCESS_LOGS_SKIP_STATIC`: control HTTP access logging.
- `JSON_BODY_LIMIT` and `URLENCODED_BODY_LIMIT`: raise or lower request body limits if you need them.
- `PLEX_CLIENT_ID`, `PLEX_PRODUCT`, `PLEX_PLATFORM`, `PLEX_DEVICE_NAME`: override the Plex client identity Curatorr advertises.
- `EMBED_ALLOWED_ORIGINS`: comma-separated origins allowed to embed Curatorr in an iframe.

Desktop-managed variables:

- `DATA_DIR`, `CONFIG_PATH`, and `SESSION_SECRET` are managed by the desktop wrapper and stored under `%APPDATA%\curatorr-desktop\`.
- `BASE_URL` is generated automatically from `localhost` plus the chosen `PORT`.
- `NODE_ENV` is forced to `production`.
- `TRUST_PROXY` is forced to `false` in the desktop build.

Example:

```env
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
PORT=7676
```

Or with `setx`:

```bat
setx SPOTIFY_CLIENT_ID "your-client-id"
setx SPOTIFY_CLIENT_SECRET "your-client-secret"
setx PORT "7676"
```

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
