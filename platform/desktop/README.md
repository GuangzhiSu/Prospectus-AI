# Prospectus AI desktop client

This folder contains the thin Electron client. Packaged applications load the
protected workspace from `https://ai-prospectus.com/workspace`. They do not run
a local Next.js server, Python agents, prompts, or model inference.

## Development

Start the web/server application from the repository root:

```bash
npm run dev
```

In another terminal:

```bash
npm run desktop:install
npm run desktop:dev
```

Development defaults to `http://127.0.0.1:3000/workspace`. Override either
development or packaged builds with:

```bash
PROSPECTUS_SERVER_URL=https://staging.example.com npm run desktop:dev
```

`PROSPECTUS_ELECTRON_ENTRY` can override `/workspace` when testing another path.

## Authentication

The hosted workspace currently uses HTTP Basic Authentication. Electron's
default behavior is to cancel authentication challenges, so `main.cjs` handles
the challenge and displays the local `login.html` credential dialog. Credentials
are supplied to Chromium for the authenticated server session and are not
written into the application bundle.

## Release builds

- Windows: `packaging/windows/build-installer.ps1`
- macOS: `packaging/mac/build-full-release.sh`
- Linux: `packaging/linux/build-full-release.sh`

The release package contains Electron, `main.cjs`, the login dialog, and icons.
It must not contain `prompts/`, Python agents, `.env` files, or provider keys.
