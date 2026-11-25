const DEFAULT_THRESHOLD = 20;
const DEFAULT_COLUMNS = 5;

// A pure frontend card has no backend translations to load, so the strings
// are embedded and picked by the active Home Assistant language.
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
    "editor.warning_default": "Leave empty to use twice the low threshold (now {value}%)",
    "editor.columns": "Max columns per row",
    "editor.mode_all": "All batteries",
    "editor.mode_low": "Only the weak ones",
    "editor.sort_level": "By level (%)",
    "editor.sort_name": "By name (A–Z)",
    "editor.dir_asc": "Ascending (lowest / A→Z first)",
    "editor.dir_desc": "Descending (highest / Z→A first)",
  },
  de: {
    "card.default_title": "Batterien",
    "card.filter": "Filter",
    "card.all": "Alle",
    "card.low": "Niedrig",
    "card.sort": "Sortieren",
    "card.sort_by_level": "Nach Batteriestand sortieren (erneut klicken, um umzukehren)",
    "card.sort_by_name": "Nach Name sortieren (erneut klicken, um umzukehren)",
    "card.empty_all_ok": "Alle Batterien in Ordnung",
    "card.empty_none": "Keine Batterien gefunden",
    "editor.title": "Titel",
    "editor.mode": "Anzeige",
    "editor.sort": "Sortierung",
    "editor.direction": "Reihenfolge",
    "editor.threshold": "Schwellenwert für niedrigen Batteriestand",
    "editor.warning": "Warnschwelle",
    "editor.warning_default": "Leer lassen, um den doppelten Schwellenwert für niedrigen Batteriestand zu verwenden (aktuell {value} %)",
    "editor.columns": "Maximale Spalten pro Zeile",
    "editor.mode_all": "Alle Batterien",
    "editor.mode_low": "Nur schwache Batterien",
    "editor.sort_level": "Nach Batteriestand (%)",
    "editor.sort_name": "Nach Name (A–Z)",
    "editor.dir_asc": "Aufsteigend (niedrigster Stand / A→Z zuerst)",
    "editor.dir_desc": "Absteigend (höchster Stand / Z→A zuerst)",
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
    "editor.warning_default": "Deixe vazio para usar o dobro do limite de bateria fraca (agora {value}%)",
    "editor.columns": "Máx. de colunas por linha",
    "editor.mode_all": "Todas as baterias",
    "editor.mode_low": "Somente as fracas",
    "editor.sort_level": "Por nível (%)",
    "editor.sort_name": "Por nome (A–Z)",
    "editor.dir_asc": "Crescente (menor / A→Z primeiro)",
    "editor.dir_desc": "Decrescente (maior / Z→A primeiro)",
  },
  sk: {
    "card.default_title": "Batérie",
    "card.filter": "Filter",
    "card.all": "Všetky",
    "card.low": "Slabé",
    "card.sort": "Zoradiť",
    "card.sort_by_level": "Zoradiť podľa úrovne (kliknite znovu pre zmenu smeru)",
    "card.sort_by_name": "Zoradiť podľa názvu (kliknite znovu pre zmenu smeru)",
    "card.empty_all_ok": "Všetky batérie sú v poriadku",
    "card.empty_none": "Nenašli sa žiadne batérie",
    "editor.title": "Názov",
    "editor.mode": "Zobraziť",
    "editor.sort": "Zoradiť",
    "editor.direction": "Smer",
    "editor.threshold": "Hranica slabej batérie",
    "editor.warning": "Hranica varovania",
    "editor.warning_default": "Nechajte prázdne pre dvojnásobok hranice slabej batérie (teraz {value} %)",
    "editor.columns": "Maximálny počet stĺpcov na riadok",
    "editor.mode_all": "Všetky batérie",
    "editor.mode_low": "Iba slabé",
    "editor.sort_level": "Podľa úrovne (%)",
    "editor.sort_name": "Podľa názvu (A–Z)",
    "editor.dir_asc": "Vzostupne (najslabšie / A→Z ako prvé)",
    "editor.dir_desc": "Zostupne (najsilnejšie / Z→A ako prvé)"
  },
};

const EDITOR_LABEL_KEYS = {
  title: "editor.title",
  mode: "editor.mode",
  sort: "editor.sort",
  sort_direction: "editor.direction",
  threshold: "editor.threshold",
  warning: "editor.warning",
  columns: "editor.columns",
};

function resolveLang(hass) {
  const lang = (hass && (hass.locale?.language || hass.language || hass.selectedLanguage)) || "en";
  if (TRANSLATIONS[lang]) return lang;
  if (lang.split("-")[0] === "de") return "de";
  if (lang.split("-")[0] === "sk") return "sk";
  if (lang.split("-")[0] === "pt") return "pt-BR";
  return "en";
}

function localize(hass, key) {
  const lang = resolveLang(hass);
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

function defaultWarning(threshold) {
  return Math.min(100, threshold * 2);
}

function parseLevel(state) {
  if (!state || state.state === "unavailable" || state.state === "unknown") {
    return null;
  }
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
}

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

class BatteryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._runtimeMode = null;
    this._runtimeSort = null;
    this._runtimeDirection = null;
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
    const warning = config.warning ?? defaultWarning(threshold);
    if (typeof warning !== "number" || warning < 0 || warning > 100) {
      throw new Error('battery-card: "warning" must be a number between 0 and 100');
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
      warning,
      sort,
      sortDirection,
      columns,
      entities: Array.isArray(config.entities) ? config.entities : null,
    };
    this._runtimeMode = null;
    this._runtimeSort = null;
    this._runtimeDirection = null;
    this._signature = null;
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
        const state = hass.states[id];
        if (state.attributes.device_class !== "battery") return false;
        if (registry[id] && registry[id].hidden) return false;
        return true;
      });
    }

    const items = ids
      .map((id) => {
        const state = hass.states[id];
        if (!state) return null;
        const entry = registry[id];
        const device = entry && entry.device_id ? devices[entry.device_id] : null;
        const deviceName = device ? device.name_by_user || device.name : null;
        const level = parseLevel(state);
        return {
          id,
          state,
          name: deviceName || state.attributes.friendly_name || id,
          level,
          formattedState: this._formatState(state, level),
        };
      })
      .filter(Boolean);

    const directionFactor = this._effectiveDirection() === "desc" ? -1 : 1;
    if (this._effectiveSort() === "name") {
      items.sort((a, b) => a.name.localeCompare(b.name) * directionFactor);
    } else {
      items.sort((a, b) => {
        if (a.level === null && b.level === null) return a.name.localeCompare(b.name);
        if (a.level === null) return 1;
        if (b.level === null) return -1;
        if (a.level !== b.level) return (a.level - b.level) * directionFactor;
        return a.name.localeCompare(b.name);
      });
    }
    return items;
  }

  _formatState(state, level) {
    if (typeof this._hass.formatEntityState === "function") {
      return this._hass.formatEntityState(state);
    }
    return level === null ? "—" : `${Math.round(level)} %`;
  }

  _effectiveMode() {
    return this._runtimeMode ?? this._config.mode;
  }

  _effectiveSort() {
    return this._runtimeSort ?? this._config.sort;
  }

  _effectiveDirection() {
    return this._runtimeDirection ?? this._config.sortDirection;
  }

  _colorVar(level) {
    if (level === null) return "var(--state-unavailable-color, var(--disabled-color))";
    if (level <= this._config.threshold) return "var(--state-sensor-battery-low-color, var(--error-color))";
    if (level <= this._config.warning) return "var(--state-sensor-battery-medium-color, var(--warning-color))";
    return "var(--state-sensor-battery-high-color, var(--success-color))";
  }

  _renderToggle(attribute, value, active, label, tooltip) {
    const appearance = active ? "filled" : "plain";
    const variant = active ? "brand" : "neutral";
    const title = tooltip ? ` title="${escapeHtml(tooltip)}"` : "";
    return `<ha-button size="s" appearance="${appearance}" variant="${variant}" data-${attribute}="${value}" aria-pressed="${active}"${title}>${label}</ha-button>`;
  }

  _renderSortToggle(field, label, tooltip, sort, direction) {
    const active = sort === field;
    const arrow = active ? `<ha-icon slot="end" icon="${direction === "desc" ? "mdi:arrow-down" : "mdi:arrow-up"}"></ha-icon>` : "";
    return this._renderToggle("sort", field, active, `${label}${arrow}`, tooltip);
  }

  _renderTile(item) {
    const percentage = item.level === null ? 0 : Math.max(0, Math.min(100, item.level));
    const name = escapeHtml(item.name);
    return `
      <ha-card class="tile" style="--tile-color:${this._colorVar(item.level)}">
        <ha-tile-container data-id="${escapeHtml(item.id)}">
          <ha-tile-icon slot="icon">
            <ha-state-icon slot="icon" data-id="${escapeHtml(item.id)}"></ha-state-icon>
          </ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary" title="${name}">${name}</span>
            <span slot="secondary">${escapeHtml(item.formattedState)}</span>
          </ha-tile-info>
          <div slot="features">
            <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentage)}" aria-label="${name}">
              <div class="fill" style="width:${percentage}%"></div>
            </div>
          </div>
        </ha-tile-container>
      </ha-card>`;
  }

  _render() {
    if (!this._hass) return;
    const t = (key) => localize(this._hass, key);
    const lang = resolveLang(this._hass);
    const items = this._collect();
    const mode = this._effectiveMode();
    const sort = this._effectiveSort();
    const direction = this._effectiveDirection();
    const title = this._config.title ?? t("card.default_title");
    const shown = mode === "low" ? items.filter((i) => i.level !== null && i.level <= this._config.threshold) : items;

    const signature = JSON.stringify([
      mode,
      sort,
      direction,
      title,
      lang,
      this._config.columns,
      shown.map((i) => [i.id, i.name, i.level, i.formattedState, i.state.attributes.icon]),
    ]);
    if (signature === this._signature) return;
    this._signature = signature;

    const empty =
      mode === "low"
        ? `<div class="empty"><ha-icon icon="mdi:battery-heart-variant"></ha-icon><span>${t("card.empty_all_ok")}</span></div>`
        : `<div class="empty"><ha-icon icon="mdi:battery-off"></ha-icon><span>${t("card.empty_none")}</span></div>`;

    this.shadowRoot.innerHTML = `
      <style>${BatteryCard.styles}</style>
      <ha-card>
        <div class="card-header">
          <span class="title">${escapeHtml(title)}</span>
          <div class="controls">
            <div class="group" role="group" aria-label="${t("card.filter")}">
              ${this._renderToggle("mode", "all", mode === "all", t("card.all"))}
              ${this._renderToggle("mode", "low", mode === "low", t("card.low"))}
            </div>
            <div class="group" role="group" aria-label="${t("card.sort")}">
              ${this._renderSortToggle("level", "%", t("card.sort_by_level"), sort, direction)}
              ${this._renderSortToggle("name", "A–Z", t("card.sort_by_name"), sort, direction)}
            </div>
          </div>
        </div>
        <div class="card-content">
          <div class="grid" style="--cols:${this._config.columns}">${shown.length ? shown.map((item) => this._renderTile(item)).join("") : empty}</div>
        </div>
      </ha-card>`;

    const statesById = new Map(shown.map((item) => [item.id, item.state]));
    this.shadowRoot.querySelectorAll("ha-state-icon").forEach((icon) => {
      icon.hass = this._hass;
      icon.stateObj = statesById.get(icon.dataset.id);
    });

    this.shadowRoot.querySelectorAll("ha-tile-container").forEach((container) => {
      container.interactive = true;
      container.addEventListener("action", () => this._showMore(container.dataset.id));
    });

    this.shadowRoot.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        this._runtimeMode = button.dataset.mode;
        this._signature = null;
        this._render();
      });
    });

    this.shadowRoot.querySelectorAll("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const field = button.dataset.sort;
        if (this._effectiveSort() === field) {
          this._runtimeDirection = this._effectiveDirection() === "asc" ? "desc" : "asc";
        } else {
          this._runtimeSort = field;
        }
        this._signature = null;
        this._render();
      });
    });
  }

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
        height: 100%;
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      }
      .title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-2, 8px);
      }
      .group {
        display: inline-flex;
        gap: var(--ha-space-1, 4px);
      }
      ha-button ha-icon {
        --mdc-icon-size: 16px;
      }
      .grid {
        --gap: var(--ha-space-2, 8px);
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(max(200px, calc((100% - (var(--cols, 5) - 1) * var(--gap)) / var(--cols, 5))), 1fr)
        );
        gap: var(--gap);
      }
      .tile {
        transition:
          box-shadow 180ms ease-in-out,
          border-color 180ms ease-in-out;
      }
      .tile:has(ha-tile-container[focused]) {
        --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
        --shadow-focus: 0 0 0 1px var(--tile-color);
        border-color: var(--tile-color);
        box-shadow: var(--shadow-default), var(--shadow-focus);
      }
      ha-tile-icon {
        --tile-icon-color: var(--tile-color);
      }
      .bar {
        height: var(--ha-space-2, 8px);
        border-radius: var(--ha-bar-border-radius, var(--ha-border-radius-sm, 4px));
        background: var(--ha-bar-background-color, var(--secondary-background-color));
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: var(--tile-color);
        transition: width 180ms ease-in-out;
      }
      .empty {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        color: var(--secondary-text-color);
        padding: var(--ha-space-2, 8px) 0;
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

  _helper(schema) {
    if (schema.name !== "warning" || this._config.warning != null) return undefined;
    const threshold = this._config.threshold ?? DEFAULT_THRESHOLD;
    return localize(this._hass, "editor.warning_default").replace("{value}", defaultWarning(threshold));
  }

  _render() {
    if (!this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => this._labels(schema);
      this._form.computeHelper = (schema) => this._helper(schema);
      this._form.addEventListener("value-changed", (ev) => {
        // Spread the incoming config first so keys the form does not model
        // (a YAML `entities` list) survive, and drop cleared fields so an
        // empty title or warning falls back to its default.
        const config = { type: "custom:battery-card", ...this._config, ...ev.detail.value };
        for (const [key, value] of Object.entries(config)) {
          if (value === "" || value == null) delete config[key];
        }
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
      warning: this._config.warning,
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

  console.info("%c battery-card ", "background:#639922;color:#fff;border-radius:3px", "loaded");
}
