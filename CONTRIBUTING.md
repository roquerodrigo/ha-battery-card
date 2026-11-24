# Contributing

Bug reports, ideas and pull requests are welcome.

## Reporting a bug

Open an [issue](https://github.com/roquerodrigo/ha-battery-card/issues/new/choose)
with:

- the card version, the Home Assistant version, and the browser or app you
  use;
- what you did, what you expected and what happened;
- the card YAML (from the card editor, **Show code editor**) and any errors
  from the browser console.

## Development setup

The card is a single file, [`battery-card.js`](battery-card.js), written as a
plain web component. There is no build step and no dependency to install.

To try a change in Home Assistant:

1. Copy `battery-card.js` into `config/www/` of a Home Assistant instance.
2. Add `/local/battery-card.js` as a dashboard resource of type
   **JavaScript module**: **Settings → Dashboards**, then **Resources** in
   the menu in the upper right corner.
3. Hard-refresh the dashboard after every change. Restart Home Assistant only
   the first time you add a file to `config/www/`.

## Checks

Run these before opening a pull request. `pre-commit install` runs the second
one on every commit.

```bash
node --check battery-card.js    # the card parses
pre-commit run --all-files      # whitespace, end of file, YAML and JSON validity, LF line endings
```

CI runs `node --check` and validates the repository as a Home Assistant
dashboard card, so keep `hacs.json` and `package.json` valid.

## Making changes

- A new option touches several places in `battery-card.js`: the validation
  and defaults in `setConfig`, `getStubConfig`, the editor schema in
  `BatteryCardEditor`, `EDITOR_LABEL_KEYS`, and every locale in
  `TRANSLATIONS`.
- Anything new that the card displays must also go into the signature built
  in `_render()`. The card skips redrawing while that signature is unchanged.
- Use Home Assistant's CSS variables for colors, never fixed values, so the
  card follows the active theme in light and dark mode.

## Translations

The strings live in the `TRANSLATIONS` object at the top of
`battery-card.js`, one table per language. To add a language, copy the `en`
table under the language code Home Assistant uses and translate every key.
When you add or change a string, update every table.

## Pull requests

1. Fork the repository and branch from `main`.
2. Write commit messages as [Conventional Commits](https://www.conventionalcommits.org/).
   Releases and their notes are generated from them. Mark breaking changes
   with `!` or a `BREAKING CHANGE:` footer.
3. Leave the version in `package.json` alone. The release process sets it.
4. Update the README when options or behaviour change.

## License

Contributions are released under the project's [MIT License](LICENSE).
