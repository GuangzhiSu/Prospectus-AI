# macOS thin-client packaging

The DMG contains an Electron client for the hosted Prospectus AI workspace. It
does not contain prompts, agents, Python, Node.js server code, model weights, or
provider API keys. An internet connection and server credentials are required.

Build on the target Mac architecture:

```bash
bash packaging/mac/build-full-release.sh
```

Outputs:

- `dist/ProspectusAI-mac-{arm64|x64}-<timestamp>.dmg`
- `dist/ProspectusAI-mac/Prospectus AI.app`

Set `SKIP_DMG=1` to build only the `.app`, or `SKIP_ZIP=0` to create a zip too.
The server defaults to `https://ai-prospectus.com`; use
`PROSPECTUS_SERVER_URL` at application launch for a staging deployment.

The app is currently unsigned and not notarized. The included
`install-prospectus.command` copies it to `/Applications`, clears quarantine,
and launches it. Production distribution should use Apple Developer ID signing
and notarization.
