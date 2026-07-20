# ha-battery-card

Home Assistant **Lovelace custom card** (`custom:battery-card`). Auto-discovers
every `sensor` with `device_class: battery`, renders one tile per battery in a
responsive grid, sorted weakest-first by default, and highlights low/warning
levels using Home Assistant's own theme tokens.

Public repo — see the global CLAUDE.md rules for PR/branch conventions on
public repos (branch protection on `main`, PRs required, no force-push).

## Layout

Single-file, zero-build frontend plugin (`battery-card.js`) — no bundler, no
Lit, no npm deps. Inside it:

- `class BatteryCard extends HTMLElement` — the card itself (`setConfig`,
  `set hass` re-renders on every state update, `getConfigElement` returns the
  editor, `getStubConfig`).
- `class BatteryCardEditor extends HTMLElement` — visual editor backed by
  `ha-form`; `EDITOR_LABEL_KEYS` maps form field names to translation keys.
- `TRANSLATIONS` — inline `en` / `pt-BR` string tables. This is a pure
  frontend plugin (no `custom_components/` backend), so there's no
  `hass.loadBackendTranslation` to hook into — strings are embedded directly
  and picked via `resolveLang(hass)`, falling back to English.
- Both custom elements are registered at the bottom of the file
  (`customElements.define(...)`), guarded against duplicate registration —
  the module can be loaded more than once by some HA resource-loading paths.

## Run / build / test

There is no build step and no test suite — edit `battery-card.js` directly and
reload the resource in Home Assistant to see changes.

To try it locally against a real Home Assistant instance:

1. Copy `battery-card.js` into `config/www/`.
2. Register it as a Lovelace resource (`/local/battery-card.js`, type
   **JavaScript Module**).
3. Restart Home Assistant (only needed the first time a `www/` file is added),
   then hard-refresh the dashboard.

## Lint / CI

- No JS linter or formatter is configured — don't invent an ESLint/Prettier
  step that doesn't exist in this repo.
- `pre-commit install` runs the generic hygiene hooks in
  `.pre-commit-config.yaml` (whitespace, EOF, YAML/JSON validity, LF endings).
- CI (`.github/workflows/ci.yml`) runs `hacs/action` (category `plugin`) to
  validate the HACS manifest and repo structure on every push/PR to `main` —
  this is effectively the project's only automated check. Keep `hacs.json`
  and `package.json` valid. The release-please job only runs on `main`
  pushes and only after the `validate` job passes.

## Conventions a newcomer would miss

- **Commit messages must be Conventional Commits** (`feat:`, `fix:`, `docs:`,
  etc.) — release-please parses them to decide the next version bump and to
  generate `CHANGELOG.md`. A wrongly-typed commit silently produces a wrong
  version bump or an empty changelog entry.
- **Never hand-edit the version.** `package.json`'s `version` and
  `.release-please-manifest.json` are only ever updated by the release-please
  bot via its `chore(main): release X.Y.Z` PR/commit.
- **Adding a config option touches four places in `battery-card.js`**: the
  `setConfig`/default-handling logic, `getStubConfig`, the `ha-form` schema in
  `BatteryCardEditor`, and both `en`/`pt-BR` entries in `TRANSLATIONS` (plus
  `EDITOR_LABEL_KEYS` if it needs a label). Missing one usually only breaks the
  editor UI or the pt-BR locale, not obviously at a glance.
- Card styling must stay on Home Assistant CSS custom properties (design
  tokens) — no hardcoded colors — so it continues to track the active theme
  and light/dark mode.
