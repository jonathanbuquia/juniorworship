# Desktop Performance

`Open Aquarium App.vbs` and `npm run desktop` use `scripts/desktop.mjs`.
The launcher hashes the frontend source, shared catalog, public assets, package files,
Vite configuration, and environment files. It rebuilds only when those inputs change
or the saved build is missing. Build metadata lives in `dist/.desktop-build.json`.
Player data is excluded from the build fingerprint.

If Windows blocks port 4177 or it is in use, Electron starts the local server on an
available port. Its internal HTTP handler keeps the window at the original
`http://127.0.0.1:4177` origin, preserving existing localStorage, and forwards requests
to the fallback server. Startup failures display an error instead of silently exiting.

Creature movement uses a shared animation clock in `src/features/aquarium`.
React renders each illustration and handles interactions; the clock updates movement
transforms directly. Hidden windows stop the clock and pause decorative CSS animations.
Restoring the window resumes movement without advancing through the hidden time.

Memory verse and quiz hooks read their initial saved state once per mount. Their
existing save effects still persist edits immediately.

## Verification

- `npm test`: clock visibility/cleanup and build cache invalidation tests.
- `npm run lint`: React and JavaScript checks.
- `node scripts/desktop.mjs --build-only`: refresh the desktop build without opening it.
- `node tests/performance-smoke.mjs`: isolated browser checks with mocked player APIs.
  Requires Playwright and Microsoft Edge. Set `PLAYWRIGHT_MODULE` to an installed
  Playwright module path if it is not locally installed, and `AQUARIUM_TEST_URL` to
  the running app's `/profiles` URL if it is not on port 4177. Use `--baseline` when
  comparing against a build that still rerenders creatures every frame.

The browser check does not use the desktop app's storage or write to its real database.
