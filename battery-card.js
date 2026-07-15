/**
 * Battery card — a Lovelace custom card that auto-discovers every
 * `battery` device-class sensor and highlights the weak ones.
 *
 * Zero-build vanilla web component (no Lit/bundler). Styles are driven entirely
 * by Home Assistant design tokens so the card follows the active theme and
 * light/dark mode automatically.
 *
 * Config:
 *   type: custom:battery-card
 *   title: Baterias      # optional; defaults to a localized "Batteries"/"Baterias"
 *   mode: all            # all | low   (default all)
 *   threshold: 20        # % at or below which a battery is "low" (default 20)
 *   warning: 40          # % at or below which a battery is "warning" (default threshold*2)
 *   entities: [...]      # optional: overrides auto-discovery
 */

const DEFAULT_THRESHOLD = 20;
const DEFAULT_COLUMNS = 5;

// i18n — this is a pure frontend plugin (no custom_component), so there is no
// backend translation to `hass.loadBackendTranslation`. Following the common
// custom-card pattern, strings are embedded here and picked by the active HA UI
// language, falling back to English.
const TRANSLATIONS = {
  en: {
    "card.default_title": "Batteries",
    "card.filter": "Filter",
    "card.all": "All",
    "card.low": "Low",
    "card.sort": "Sort",
    "card.sort_by_level": "Sort by level (click again to reverse)",
    "card.sort_by_name": "Sort by name (click again to reverse)",
    "card.empty_all_ok": "All batteries OK",
    "card.empty_none": "No batteries found",
    "editor.title": "Title",
    "editor.mode": "Display",
    "editor.sort": "Sorting",
    "editor.direction": "Direction",
    "editor.threshold": "Low battery threshold",
    "editor.warning": "Warning threshold",
    "editor.columns": "Max columns per row",
    "editor.mode_all": "All batteries",
    "editor.mode_low": "Only the weak ones",
    "editor.sort_level": "By level (%)",
    "editor.sort_name": "By name (A–Z)",
    "editor.dir_asc": "Ascending (lowest / A→Z first)",
    "editor.dir_desc": "Descending (highest / Z→A first)",
  },
  "pt-BR": {
    "card.default_title": "Baterias",
    "card.filter": "Filtro",
    "card.all": "Todas",
    "card.low": "Fracas",
    "card.sort": "Ordenar",
    "card.sort_by_level": "Ordenar por nível (clique de novo p/ inverter)",
    "card.sort_by_name": "Ordenar por nome (clique de novo p/ inverter)",
    "card.empty_all_ok": "Todas as baterias OK",
    "card.empty_none": "Nenhuma bateria encontrada",
    "editor.title": "Título",
    "editor.mode": "Exibição",
    "editor.sort": "Ordenação",
    "editor.direction": "Direção",
    "editor.threshold": "Limite de bateria fraca",
    "editor.warning": "Limite de aviso",
    "editor.columns": "Máx. de colunas por linha",
    "editor.mode_all": "Todas as baterias",
    "editor.mode_low": "Somente as fracas",
    "editor.sort_level": "Por nível (%)",
    "editor.sort_name": "Por nome (A–Z)",
    "editor.dir_asc": "Crescente (menor / A→Z primeiro)",
    "editor.dir_desc": "Decrescente (maior / Z→A primeiro)",
  },
};

// Maps ha-form field names to their translation keys (for computeLabel).
const EDITOR_LABEL_KEYS = {
  title: "editor.title",
  mode: "editor.mode",
  sort: "editor.sort",
  sort_direction: "editor.direction",
  threshold: "editor.threshold",
  warning: "editor.warning",
  columns: "editor.columns",
};

/** The active HA UI language, or a supported fallback (base lang, then "en"). */
function resolveLang(hass) {
  const lang = (hass && (hass.locale?.language || hass.language || hass.selectedLanguage)) || "en";
  if (TRANSLATIONS[lang]) return lang;
  if (lang.split("-")[0] === "pt") return "pt-BR";
  return "en";
}

/** Translate a dotted key for the active language; English is the fallback. */
function localize(hass, key) {
  const lang = resolveLang(hass);
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

function batteryIcon(level) {
  if (level === null || Number.isNaN(level)) return "mdi:battery-unknown";
  const rounded = Math.round(level / 10) * 10;
  if (rounded >= 100) return "mdi:battery";
  if (rounded <= 0) return "mdi:battery-outline";
  return `mdi:battery-${rounded}`;
}

/** Parse a battery sensor state into a number, or null when not a value. */
function parseLevel(state) {
  if (!state || state.state === "unavailable" || state.state === "unknown") {
    return null;
  }
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
}

class BatteryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._runtimeMode = null; // in-card toggle override; null = follow config
    this._runtimeSort = null; // in-card sort override; null = follow config
    this._runtimeDir = null; // in-card sort direction override; null = follow config
    this._signature = null;
  }

  static getConfigElement() {
    return document.createElement("battery-card-editor");
  }

  static getStubConfig() {
    return { type: "custom:battery-card", mode: "all", threshold: DEFAULT_THRESHOLD, sort: "level", sort_direction: "asc", columns: DEFAULT_COLUMNS };
  }

  setConfig(config) {
    const mode = config.mode ?? "all";
    if (mode !== "all" && mode !== "low") {
      throw new Error('battery-card: "mode" must be "all" or "low"');
    }
    const threshold = config.threshold ?? DEFAULT_THRESHOLD;
    if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
      throw new Error('battery-card: "threshold" must be a number between 0 and 100');
    }
    const sort = config.sort ?? "level";
    if (sort !== "level" && sort !== "name") {
      throw new Error('battery-card: "sort" must be "level" or "name"');
    }
    const sortDirection = config.sort_direction ?? "asc";
    if (sortDirection !== "asc" && sortDirection !== "desc") {
      throw new Error('battery-card: "sort_direction" must be "asc" or "desc"');
    }
    const columns = config.columns ?? DEFAULT_COLUMNS;
    if (!Number.isInteger(columns) || columns < 1 || columns > 12) {
      throw new Error('battery-card: "columns" must be an integer between 1 and 12');
    }
    this._config = {
      title: config.title ?? null,
      mode,
      threshold,
      warning: config.warning ?? Math.min(100, threshold * 2),
      sort,
      sortDirection,
      columns,
      entities: Array.isArray(config.entities) ? config.entities : null,
    };
    this._runtimeMode = null;
    this._runtimeSort = null;
    this._runtimeDir = null;
    this._signature = null; // force re-render
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { min_columns: 6, min_rows: 3 };
  }

  /** Discover the battery entities to display, sorted by the active sort. */
  _collect() {
    const hass = this._hass;
    const registry = hass.entities || {};
    const devices = hass.devices || {};
    let ids;
    if (this._config.entities) {
      ids = this._config.entities.map((e) => (typeof e === "string" ? e : e.entity));
    } else {
      ids = Object.keys(hass.states).filter((id) => {
        if (!id.startsWith("sensor.")) return false;
        const st = hass.states[id];
        if (st.attributes.device_class !== "battery") return false;
        if (registry[id] && registry[id].hidden_by) return false;
        return true;
      });
    }

    const items = ids
      .map((id) => {
        const st = hass.states[id];
        if (!st) return null;
        // Prefer the device name (user override, then default) over the
        // battery entity's own friendly name; fall back to entity / id.
        const entry = registry[id];
        const device = entry && entry.device_id ? devices[entry.device_id] : null;
        const deviceName = device ? device.name_by_user || device.name : null;
        return {
          id,
          name: deviceName || st.attributes.friendly_name || id,
          level: parseLevel(st),
        };
      })
      .filter(Boolean);

    const dir = this._effectiveDir() === "desc" ? -1 : 1;
    if (this._effectiveSort() === "name") {
      // Alphabetical by name (asc = A→Z).
      items.sort((a, b) => a.name.localeCompare(b.name) * dir);
    } else {
      // By level (asc = weakest first); entities without a value always last.
      items.sort((a, b) => {
        if (a.level === null && b.level === null) return a.name.localeCompare(b.name);
        if (a.level === null) return 1;
        if (b.level === null) return -1;
        if (a.level !== b.level) return (a.level - b.level) * dir;
        return a.name.localeCompare(b.name);
      });
    }
    return items;
  }

  _effectiveMode() {
    return this._runtimeMode ?? this._config.mode;
  }

  _effectiveSort() {
    return this._runtimeSort ?? this._config.sort;
  }

  _effectiveDir() {
    return this._runtimeDir ?? this._config.sortDirection;
  }

  _colorVar(level) {
    if (level === null) return "var(--secondary-text-color)";
    if (level <= this._config.threshold) return "var(--state-sensor-battery-low-color, var(--error-color))";
    if (level <= this._config.warning) return "var(--warning-color)";
    return "var(--state-sensor-battery-high-color, var(--success-color))";
  }

  _render() {
    if (!this._hass) return;
    const t = (key) => localize(this._hass, key);
    const lang = resolveLang(this._hass);
    const items = this._collect();
    const mode = this._effectiveMode();
    const sort = this._effectiveSort();
    const dir = this._effectiveDir();
    const arrow = dir === "desc" ? "↓" : "↑";
    const title = this._config.title ?? t("card.default_title");
    const shown = mode === "low" ? items.filter((i) => i.level !== null && i.level <= this._config.threshold) : items;

    // Skip a rebuild when nothing visible has changed (avoids flicker).
    const signature = JSON.stringify([mode, sort, dir, title, lang, this._config.columns, shown.map((i) => [i.id, i.level])]);
    if (signature === this._signature) return;
    this._signature = signature;

    const rows = shown
      .map((item) => {
        const color = this._colorVar(item.level);
        const pct = item.level === null ? 0 : Math.max(0, Math.min(100, item.level));
        const value = item.level === null ? "—" : `${Math.round(item.level)}%`;
        return `
          <div class="row" data-id="${item.id}" title="${item.name}">
            <ha-icon class="icon" style="color:${color}" icon="${batteryIcon(item.level)}"></ha-icon>
            <div class="body">
              <div class="line">
                <span class="name" title="${item.name}">${item.name}</span>
                <span class="value" style="color:${color}">${value}</span>
              </div>
              <div class="bar"><div class="fill" style="width:${pct}%;background:${color}"></div></div>
            </div>
          </div>`;
      })
      .join("");

    const empty =
      mode === "low"
        ? `<div class="empty"><ha-icon icon="mdi:battery-heart-variant"></ha-icon><span>${t("card.empty_all_ok")}</span></div>`
        : `<div class="empty"><ha-icon icon="mdi:battery-off"></ha-icon><span>${t("card.empty_none")}</span></div>`;

    this.shadowRoot.innerHTML = `
      <style>${BatteryCard.styles}</style>
      <ha-card>
        <div class="header">
          <div class="title">${title}</div>
          <div class="controls">
            <div class="toggle" role="group" aria-label="${t("card.filter")}">
              <button data-mode="all" class="${mode === "all" ? "active" : ""}">${t("card.all")}</button>
              <button data-mode="low" class="${mode === "low" ? "active" : ""}">${t("card.low")}</button>
            </div>
            <div class="toggle" role="group" aria-label="${t("card.sort")}">
              <button data-sort="level" class="${sort === "level" ? "active" : ""}" title="${t("card.sort_by_level")}">%${sort === "level" ? ` <span class="arrow">${arrow}</span>` : ""}</button>
              <button data-sort="name" class="${sort === "name" ? "active" : ""}" title="${t("card.sort_by_name")}">A–Z${sort === "name" ? ` <span class="arrow">${arrow}</span>` : ""}</button>
            </div>
          </div>
        </div>
        <div class="grid" style="--cols:${this._config.columns}">${shown.length ? rows : empty}</div>
      </ha-card>`;

    this.shadowRoot.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._runtimeMode = btn.dataset.mode;
        this._signature = null;
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.sort;
        if (this._effectiveSort() === field) {
          // Clicking the active field flips the direction.
          this._runtimeDir = this._effectiveDir() === "asc" ? "desc" : "asc";
        } else {
          // Switching field keeps the current direction.
          this._runtimeSort = field;
        }
        this._signature = null;
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll(".row").forEach((row) => {
      row.addEventListener("click", () => this._showMore(row.dataset.id));
    });
  }

  /** Open the more-info dialog for an entity (standard HA behaviour). */
  _showMore(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })
    );
  }

  static get styles() {
    return `
      :host {
        display: block;
      }
      ha-card {
        padding: 12px 16px 16px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .title {
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--primary-text-color);
        line-height: 1.4;
      }
      .toggle {
        display: inline-flex;
        border: 1px solid var(--divider-color, rgba(0,0,0,.12));
        border-radius: 999px;
        overflow: hidden;
      }
      .toggle button {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--secondary-text-color);
        font: inherit;
        font-size: 0.8125rem;
        padding: 4px 14px;
        cursor: pointer;
      }
      .toggle button.active {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .toggle button .arrow {
        font-size: 0.75rem;
        opacity: 0.9;
      }
      .grid {
        display: grid;
        --gap: 14px;
        /* Cap at --cols columns on wide screens (configurable, default 5);
           degrade to fewer as width drops (min tile width 220px). The
           subtracted term is the (--cols - 1) inter-column gaps. */
        grid-template-columns: repeat(
          auto-fill,
          minmax(max(220px, calc((100% - (var(--cols, 5) - 1) * var(--gap)) / var(--cols, 5))), 1fr)
        );
        gap: var(--gap);
      }
      .row {
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        padding: 14px 16px;
        min-height: 48px;
        box-sizing: border-box;
        border-radius: 12px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        transition: background .2s ease, border-color .2s ease;
      }
      .row:hover {
        background: var(--secondary-background-color);
        border-color: var(--primary-color);
      }
      .icon {
        /* size follows the HA default (--mdc-icon-size, 24px) */
        flex: 0 0 auto;
      }
      .body {
        flex: 1 1 auto;
        min-width: 0;
      }
      .line {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }
      .name {
        color: var(--primary-text-color);
        font-size: 1.05rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      .value {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 1.05rem;
        flex: 0 0 auto;
      }
      .bar {
        margin-top: 10px;
        height: 7px;
        border-radius: 2px;
        background: var(--divider-color, rgba(0,0,0,.1));
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: 2px;
        transition: width .3s ease;
      }
      .empty {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--secondary-text-color);
        padding: 16px 4px;
      }
    `;
  }
}

class BatteryCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  /** Build the ha-form schema with option labels in the active language. */
  _schema() {
    const t = (key) => localize(this._hass, key);
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "all", label: t("editor.mode_all") },
              { value: "low", label: t("editor.mode_low") },
            ],
          },
        },
      },
      {
        name: "sort",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "level", label: t("editor.sort_level") },
              { value: "name", label: t("editor.sort_name") },
            ],
          },
        },
      },
      {
        name: "sort_direction",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "asc", label: t("editor.dir_asc") },
              { value: "desc", label: t("editor.dir_desc") },
            ],
          },
        },
      },
      { name: "threshold", selector: { number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" } } },
      { name: "warning", selector: { number: { min: 0, max: 100, mode: "box", unit_of_measurement: "%" } } },
      { name: "columns", selector: { number: { min: 1, max: 12, mode: "box" } } },
    ];
  }

  _labels(schema) {
    return localize(this._hass, EDITOR_LABEL_KEYS[schema.name] ?? schema.name);
  }

  _render() {
    if (!this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => this._labels(schema);
      this._form.addEventListener("value-changed", (ev) => {
        const config = { type: "custom:battery-card", ...ev.detail.value };
        this.dispatchEvent(
          new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true })
        );
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = {
      title: this._config.title ?? "",
      mode: this._config.mode ?? "all",
      sort: this._config.sort ?? "level",
      sort_direction: this._config.sort_direction ?? "asc",
      threshold: this._config.threshold ?? DEFAULT_THRESHOLD,
      warning: this._config.warning ?? Math.min(100, (this._config.threshold ?? DEFAULT_THRESHOLD) * 2),
      columns: this._config.columns ?? DEFAULT_COLUMNS,
    };
  }
}

// The module runs once per URL it is served from, so a setup that loads the card
// both as a dashboard resource and as a `frontend.extra_module_url` evaluates it
// twice. Without this guard the second run throws on the already-taken tag name
// and registers a duplicate entry in the card picker.
if (!customElements.get("battery-card")) {
  customElements.define("battery-card", BatteryCard);
  customElements.define("battery-card-editor", BatteryCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "battery-card",
    name: "Battery Card",
    description: "Lists every battery-powered device and highlights the low ones.",
    preview: true,
    documentationURL: "https://github.com/roquerodrigo/ha-battery-card",
  });

  // eslint-disable-next-line no-console
  console.info("%c battery-card ", "background:#639922;color:#fff;border-radius:3px", "loaded");
}
