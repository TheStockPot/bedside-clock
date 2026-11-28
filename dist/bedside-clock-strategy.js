/*
 * Bedside Clock - a configurable Home Assistant dashboard strategy for Echo Show displays (The Stock Pot's Echo Dashboard).
 * Usage (dashboard raw config):
 *   strategy:
 *     type: custom:bedside-clock
 * Opening the dashboard with no config shows a setup screen. The same editor is
 * reachable at /<dashboard>/setup afterwards.
 */

const VERSION = "0.2.3";
const STRATEGY_TYPE = "custom:bedside-clock";

/* ------------------------------------------------------------------ */
/* Device profiles - everything that differs between screens lives here */
/* ------------------------------------------------------------------ */

const DEVICES = {
  echo_show_5: {
    label: "Echo Show 5 Gen 1 or 2 (788 x 394 viewport)",
    maxButtons: 5, // icons that fit in the side navbar
    viewH: 394, // viewport height in px (sizes that must be in px, such as the graph, scale with it)
    maxBlocks: 5, // blocks (controls + the weather block) on the Home with quick controls: the weather block and up to four controls
    textScale: 1.25, // the names on the control tiles are enlarged on this small screen
    aspect: "2:1", // screen shape, so camera video can fill it
    forecastDays: 4, // forecast columns that fit on the weather page
    pad: 1, // multiplier for the page padding
    navGap: 0, // extra space (vw) between page content and the navbar
    clock: { size: "8.5em", lineHeight: "1em", dateSize: "2em", dateLineHeight: "1.6em", padding: "14.7vh 0 0" }, // top padding centres the clock block vertically
    chip: { height: "50px", font: ".5em", icon: ".75em", padding: "0.625em", radius: "31px" },
  },
  // Tuned on a real Echo Show 8 (clock/chip values are still scaled from the Show 5).
  echo_show_8: {
    label: "Echo Show 8 Gen 1 (1280 x 800, 962 x 602 viewport)",
    maxButtons: 7,
    viewH: 602,
    maxBlocks: 5,
    textScale: 1,
    aspect: "16:10",
    forecastDays: 5,
    pad: 1.5,
    navGap: 2,
    navbar: { icon: 36, button: 68, gap: 8 }, // px: larger icons and buttons than the navbar's defaults (28 / 60 / 10)
    clock: { size: "11em", lineHeight: "1em", dateSize: "2.6em", dateLineHeight: "1.6em", padding: "22vh 0 0" }, // top padding centres the clock block vertically
    chip: { height: "50px", font: ".5em", icon: ".75em", padding: "0.625em", radius: "31px" }, // same as the Show 5: the chip keeps its size
  },
};

/* Placeholder gradients; users can also supply their own image URL. */
const BACKGROUNDS = {
  earth: { label: "Earth tones", css: "linear-gradient(135deg, #d9c5a3 0%, #b08968 55%, #7f5539 100%)" },
  ocean: { label: "Ocean", css: "linear-gradient(135deg, #a8dadc 0%, #457b9d 55%, #1d3557 100%)" },
  dusk: { label: "Dusk", css: "linear-gradient(135deg, #cdb4db 0%, #7b6fa8 55%, #2b2d57 100%)" },
  forest: { label: "Forest", css: "linear-gradient(135deg, #b7d3a8 0%, #588157 55%, #2d4a3a 100%)" },
  sunrise: { label: "Sunrise", css: "linear-gradient(135deg, #ffd6a5 0%, #f08a5d 55%, #b83b5e 100%)" },
  graphite: { label: "Graphite", css: "linear-gradient(135deg, #6c757d 0%, #343a40 55%, #111418 100%)" },
  none: { label: "None", css: "" },
  custom: { label: "Custom image URL", css: "" },
};

const DEFAULT_CONFIG = {
  configured: false,
  device: "echo_show_5",
  background: "earth",
  custom_background: "",
  background_opacity: 0, // 0 = automatic (dimmed more for light images); otherwise the image opacity in % (lower = darker)
  palette_override: {}, // colours the user changed from the automatically picked palette: { accent, accent2, track, ink, text } (#RRGGBB)
  show_labels: true,
  time_format: "auto", // the clock: "auto" (follows the Home Assistant user's profile), "12" or "24"
  date_format: "auto", // the date under the clock: "auto" (follows the Home Assistant user's profile), "month_first" or "month_last"
  page_order: [], // the order of the pages in the navbar, the wizard and when swiping; pages missing from it follow in the default order
  dashboard_path: "",
  kiosk_satellite: { enabled: false, device: "", entity: "" }, // Kiosk Satellite app: Calendar, Cameras and Timer can use its built-in views (device: its device id; entity: an entity of it, from older setups)
  kiosk: { hide_header: true, header_users: "" }, // hide the Home Assistant header (kiosk-mode), only on screens as narrow as an Echo
  navbar: { light_entity: "", hide: false, shortcuts: [] }, // hide: no navbar, swipe between pages instead (needs hass-swipe-navigation); shortcuts: buttons that open a Kiosk Satellite view, { view, shortcut_view, name, icon }
  pages: {
    home: { enabled: true, weather: "", layout: "clock", quick_buttons: [], screens: [] }, // screens: the home screens, each { layout, quick_buttons }; the first is "Home" (layout and quick_buttons mirror it)
    baby: { enabled: false, camera: "" },
    cameras: { enabled: false, cameras: [], source: "dashboard", ks_entity: "", layout: "swipe" }, // layout: "swipe" | "grid" (grid: all cameras in 2 columns, Echo Show 8 only) // source: "dashboard" | "kiosk_satellite" (ks_entity: its "Show <view>" button)
    climate: { enabled: false, entity: "" },
    weather: { enabled: false, entity: "" },
    calendar: { enabled: false, entities: [], source: "dashboard", ks_entity: "", ks_view: "Week" }, // ks_entity: its "Calendar view" select; ks_view: Day, Week, Month or Schedule
    timer: { enabled: false, source: "dashboard", entity: "", presets: [1, 5, 10, 15], auto_discover_google: true, auto_voice_pe: true },
    shopping: { enabled: false, entity: "", hide_completed: true },
  },
};

// The Home layouts with cards, and how many cards each has (the weather block comes on top of them).
const CARD_COUNTS = { controls: 2, controls3: 3, controls4: 4 };

const PAGE_META = {
  home: { path: "home", label: "Home", icon: "mdi:home" },
  baby: { path: "baby-monitor", label: "Baby", icon: "mdi:baby-carriage" },
  cameras: { path: "cameras", label: "Cameras", icon: "mdi:cctv" },
  climate: { path: "zones", label: "Climate", icon: "mdi:fan" },
  weather: { path: "weather", label: "Weather", icon: "mdi:weather-partly-cloudy" },
  calendar: { path: "calendar", label: "Calendar", icon: "mdi:calendar" },
  timer: { path: "timer", label: "Timer", icon: "mdi:timer-outline" },
  shopping: { path: "shopping", label: "Shopping", icon: "mdi:cart-outline" },
};

// The pages in the order the user chose (page_order), with any page not in it following in the default order.
export function pageOrder(cfg) {
  const known = Object.keys(PAGE_META);
  const saved = (Array.isArray(cfg?.page_order) ? cfg.page_order : []).filter((k, i, a) => known.includes(k) && a.indexOf(k) === i);
  return [...saved, ...known.filter((k) => !saved.includes(k))];
}

// `repo` is the card's Marketplace (HACS) repository, used for the install links in the missing-cards notice.
// `check` tells apart cards that register the same element: the original Digital Clock (wassy92x) is also
// `digital-clock`, but it ignores the font size, padding and background options the clock relies on.
const DEPENDENCIES = [
  { element: "digital-clock", name: "Advanced Digital Clock", repo: "sierramike/lovelace-advanced-digital-clock", pages: ["home"],
    check: (el) => typeof el.getStubConfig === "function", wrong: "the original Digital Clock card is installed instead; remove it" },
  { element: "mushroom-empty-card", name: "Mushroom", repo: "piitaya/lovelace-mushroom", pages: ["home"] },
  { element: "mushroom-chips-card", name: "Mushroom", repo: "piitaya/lovelace-mushroom", pages: ["home"] },
  { element: "navbar-card", name: "Navbar Card", repo: "joseluis9595/lovelace-navbar-card", pages: ["home", "baby", "cameras", "climate", "weather", "calendar", "timer", "shopping"] },
  { element: "simple-timer-card", name: "Simple Timer Card", repo: "eyalgal/simple-timer-card", pages: ["timer"] },
  { element: "bubble-card", name: "Bubble Card", repo: "Clooos/Bubble-Card", pages: ["home4", "climate"] },
  { element: "mini-graph-card", name: "Mini Graph Card", repo: "kalkih/mini-graph-card", pages: ["homegraph"] },
  { element: "card-mod", name: "card-mod", repo: "thomasloven/lovelace-card-mod", pages: ["home", "weather", "calendar", "timer", "shopping"] },
  { element: "calendar-card-pro", name: "Calendar Card Pro", repo: "alexpfau/calendar-card-pro", pages: ["calendar"] },
  { element: "advanced-camera-card", name: "Advanced Camera Card", repo: "dermotduffy/advanced-camera-card", pages: ["baby", "cameras"] },
];

// A My Home Assistant link that opens the card's page in the user's own Marketplace (HACS), ready to download.
export const marketplaceLink = (repo) => {
  const [owner, repository] = repo.split("/");
  return `https://my.home-assistant.io/redirect/hacs_repository/?owner=${owner}&repository=${repository}&category=plugin`;
};

// Installed and usable: registered, and (when a card shares its element with a look-alike) the right card.
const installed = (d, registry) => {
  const el = registry.get(d.element);
  return !!el && (!d.check || d.check(el));
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

// A sensor or a number can be shown as a graph or as its current value (display: "graph" | "value").
// Sensors default to a graph (a plain sensor has nothing to adjust); numbers default to their value slider.
const GRAPHABLE = ["sensor", "number", "input_number"];
// On the Echo Show 5 only a sensor can be a graph: a number is always shown as its value.
// With four cards there is no room for a graph (it needs a quadrant of its own, like the weather block), so every card shows its value.
export const canChooseDisplay = (b, device, layout) => {
  const domain = String((b && b.entity) || "").split(".")[0];
  return GRAPHABLE.includes(domain) && !(device === "echo_show_5" && domain !== "sensor") && layout !== "controls4";
};
export const displayOf = (b, device, layout) => {
  const domain = String((b && b.entity) || "").split(".")[0];
  if (!GRAPHABLE.includes(domain)) return "";
  if (!canChooseDisplay(b, device, layout)) return "value";
  return b.display === "graph" || b.display === "value" ? b.display : domain === "sensor" ? "graph" : "value";
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function merge(base, over) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (!isObj(over)) return out;
  for (const [k, v] of Object.entries(over)) {
    out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

export const TIME_FORMATS = [
  ["auto", "Automatic (from your Home Assistant profile)"],
  ["12", "12-hour (9:05)"],
  ["24", "24-hour (21:05)"]
];

export function uses12Hour(cfg, hass) {
  if (cfg.time_format === "12") return true;
  if (cfg.time_format === "24") return false;
  const loc = hass && hass.locale;
  if (loc && loc.time_format === "12") return true;
  if (loc && loc.time_format === "24") return false;
  try {
    const lang = loc && loc.time_format === "language" ? loc.language : undefined;
    return !!new Intl.DateTimeFormat(lang, { hour: "numeric" }).resolvedOptions().hour12;
  } catch (e) {
    return false;
  }
}

export const DATE_FORMATS = [
  ["auto", "Automatic (from your Home Assistant profile)"],
  ["month_first", "Month first (Saturday November 21)"],
  ["month_last", "Month last (Saturday 21 November)"]
];

export function usesMonthFirst(cfg, hass) {
  if (cfg.date_format === "month_first") return true;
  if (cfg.date_format === "month_last") return false;
  const loc = hass && hass.locale;
  if (loc && (loc.date_format === "MDY" || loc.date_format === "YMD")) return true;
  if (loc && loc.date_format === "DMY") return false;
  try {
    const lang = loc && loc.date_format === "language" ? loc.language : undefined;
    const types = new Intl.DateTimeFormat(lang, { month: "long", day: "numeric" }).formatToParts(new Date(2026, 0, 15)).map((p) => p.type);
    return types.indexOf("month") < types.indexOf("day");
  } catch (e) {
    return false;
  }
}

export const HOME_LAYOUTS = ["clock", "controls", "controls3", "controls4"]; // the kinds of home screen

export function normaliseConfig(raw) {
  // fresh copies of the defaults and of the given config, so editing the result never changes either (Home Assistant compares the
  // config it holds with the one the editor sends back to know whether Save is needed)
  const cfg = merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), JSON.parse(JSON.stringify(raw || {})));
  if (!DEVICES[cfg.device]) cfg.device = "echo_show_5";
  if (!BACKGROUNDS[cfg.background]) cfg.background = "earth";
  if (!TIME_FORMATS.some(([v]) => v === String(cfg.time_format))) cfg.time_format = "auto";
  cfg.time_format = String(cfg.time_format);
  if (!DATE_FORMATS.some(([v]) => v === String(cfg.date_format))) cfg.date_format = "auto";
  cfg.date_format = String(cfg.date_format);
  // the home screens: older configs have one (layout + quick_buttons). Each layout appears once; layout and quick_buttons mirror the first screen.
  const h = cfg.pages.home;
  const seen = new Set();
  let screens = (Array.isArray(h.screens) && h.screens.length ? h.screens : [{ layout: h.layout, quick_buttons: h.quick_buttons }])
    .filter((s) => isObj(s))
    .map((s) => ({ ...s, layout: HOME_LAYOUTS.includes(s.layout) ? s.layout : "clock", quick_buttons: Array.isArray(s.quick_buttons) ? s.quick_buttons : [] }))
    .filter((s) => !seen.has(s.layout) && seen.add(s.layout));
  if (!screens.length) screens = [{ layout: "clock", quick_buttons: [] }];
  h.screens = screens;
  h.layout = screens[0].layout;
  h.quick_buttons = screens[0].quick_buttons;
  return cfg;
}

/* ---- Kiosk Satellite: its built-in Calendar, Cameras and Timers views ---- */

const KS_PAGES = ["cameras", "calendar", "timer"];
// The page was set to use Kiosk Satellite's own view (and Kiosk Satellite is turned on).
export const ksChosen = (cfg, key) => !!(cfg.kiosk_satellite && cfg.kiosk_satellite.enabled && KS_PAGES.includes(key) && cfg.pages[key].enabled && cfg.pages[key].source === "kiosk_satellite");
// ...and it has what it needs to run (the timer view needs no entity).
export const ksActive = (cfg, key) => ksChosen(cfg, key) && (key === "timer" || !!cfg.pages[key].ks_entity);

// A saved Kiosk Satellite entity can go stale (the device was renamed or re-added, so its entities got new ids and the old ones
// are unavailable). The saved entity is kept while it works; otherwise the one found on the Kiosk Satellite device is used.
export const ksPick = (hass, saved, found) => {
  const states = hass && hass.states;
  if (!states) return saved || found || "";
  const live = (id) => !!id && states[id] && states[id].state !== "unavailable";
  return live(saved) ? saved : live(found) ? found : saved || found || "";
};

// What the navbar button of a built-in page does.
export function ksAction(cfg, key) {
  const p = cfg.pages[key];
  if (key === "cameras") return { action: "perform-action", perform_action: "button.press", target: { entity_id: p.ks_entity } };
  if (key === "calendar") return { action: "perform-action", perform_action: "select.select_option", target: { entity_id: p.ks_entity }, data: { option: p.ks_view || "Week" } };
  return { action: "url", url_path: "ks://timers" }; // the timers view has no entity; Kiosk Satellite opens it from a ks:// link
}

// Finds the Kiosk Satellite entities of a device (its id, or any entity of it): its "Calendar view" and "Camera view" selects and the
// "Show <view>" buttons. Uses the entity registry when Home Assistant provides it, else the entity names (`select.<device>_calendar_view`).
export const ksRef = (k) => (k && (k.device || k.entity)) || ""; // the device (or an entity of it) the user chose
export function kioskEntities(hass, ref) {
  const out = { calendar: "", camera: "", buttons: [] };
  const id = String(ref || "");
  if (!id) return out;
  const reg = hass && hass.entities;
  const isEntity = id.includes(".");
  const dev = isEntity ? reg && reg[id] && reg[id].device_id : id; // a device id, or the device of the entity
  let ids = dev && reg ? Object.values(reg).filter((e) => e.device_id === dev).map((e) => e.entity_id) : [];
  if (!ids.length && isEntity) {
    const base = id.split(".")[1].replace(/_(calendar_view|camera_view|close_camera_view|active_camera_view|show_[a-z0-9_]+)$/, "");
    ids = Object.keys((hass && hass.states) || {}).filter((e) => e.split(".")[1].startsWith(base + "_"));
  }
  out.calendar = ids.find((e) => /^select\..*_calendar_view$/.test(e)) || "";
  out.camera = ids.find((e) => /^select\..*_camera_view$/.test(e)) || "";
  out.buttons = ids.filter((e) => /^button\..*_show_/.test(e) && !/_show_music_(assistant|library)$/.test(e));
  return out;
}

// The card is set to open a Kiosk Satellite view (and Kiosk Satellite is on), so it is a button.
export const hasShortcut = (cfg, b) => !!(cfg.kiosk_satellite && cfg.kiosk_satellite.enabled && b && b.shortcut && b.shortcut !== "none");

// A Home card can be a button that opens a Kiosk Satellite view (card.shortcut) instead of showing an entity. The views and, where there is no entity for it, the ks:// link.
export const KS_SHORTCUTS = { calendar: "Calendar", cameras: "Camera view", timers: "Timers", alarms: "Alarms", now_playing: "Now playing", music_library: "Music library", apps: "App launcher" };
const KS_LINKS = { timers: "ks://timers", alarms: "ks://alarms", now_playing: "ks://now-playing", music_library: "ks://music-library", apps: "ks://apps" };
export function ksShortcutAction(cfg, hass, b) {
  const k = cfg.kiosk_satellite;
  if (!k || !k.enabled || !b || !b.shortcut || b.shortcut === "none") return null;
  const found = kioskEntities(hass, ksRef(k));
  if (b.shortcut === "calendar") {
    const e = ksPick(hass, cfg.pages.calendar.ks_entity, found.calendar);
    return e ? { action: "perform-action", perform_action: "select.select_option", target: { entity_id: e }, data: { option: cfg.pages.calendar.ks_view || "Week" } } : { action: "url", url_path: "ks://calendar" };
  }
  if (b.shortcut === "cameras") {
    const foundCam = found.buttons.find((x) => /camera/.test(x)) || found.buttons[0];
    const e = ksPick(hass, b.shortcut_view || cfg.pages.cameras.ks_entity, foundCam);
    return e ? { action: "perform-action", perform_action: "button.press", target: { entity_id: e } } : null;
  }
  return KS_LINKS[b.shortcut] ? { action: "url", url_path: KS_LINKS[b.shortcut] } : null;
}

export function missingDependencies(cfg, registry = customElements) {
  const enabled = Object.keys(cfg.pages).filter((p) => cfg.pages[p].enabled && !ksChosen(cfg, p));
  const screens = cfg.pages.home.screens || [{ layout: cfg.pages.home.layout, quick_buttons: cfg.pages.home.quick_buttons }];
  if (cfg.pages.home.enabled && screens.some((s) => s.layout in CARD_COUNTS)) enabled.push("home4");
  // a sensor or number shown as a graph among the controls of the block layouts needs the Mini Graph Card
  if (cfg.pages.home.enabled && screens.some((s) => s.layout in CARD_COUNTS && (s.quick_buttons || []).some((b) => displayOf(b, cfg.device, s.layout) === "graph" && !hasShortcut(cfg, b)))) enabled.push("homegraph");
  return DEPENDENCIES.filter((d) => d.pages.some((p) => enabled.includes(p)) && !installed(d, registry) && !(d.element === "navbar-card" && cfg.navbar && cfg.navbar.hide));
}

function dashboardBase(cfg) {
  if (cfg.dashboard_path) return cfg.dashboard_path.replace(/^\/|\/$/g, "");
  const seg = (typeof location !== "undefined" ? location.pathname : "").split("/")[1];
  return seg || "lovelace";
}

/* ------------------------------------------------------------------ */
/* Shared navbar                                                        */
/* ------------------------------------------------------------------ */

const MAX_NAVBAR_BUTTONS = 5; // Echo Show limit for the side menu

// Lays out navbar routes: pages first, light toggle always top level. If everything
// does not fit in MAX_NAVBAR_BUTTONS, the overflow pages move into a "More" popup
// that takes the slot just before the light.
// `tail` routes (the climate fan) sit at the very bottom, between the "More" popup and the light.
export function layoutNavbarRoutes(pages, lightRoute, max = MAX_NAVBAR_BUTTONS, tail = []) {
  const slots = max - (lightRoute ? 1 : 0) - tail.length;
  let routes;
  if (pages.length <= slots) {
    routes = [...pages];
  } else {
    routes = pages.slice(0, slots - 1);
    routes.push({
      icon: "mdi:dots-horizontal",
      label: pages[0].label ? "More" : "",
      popup: pages.slice(slots - 1),
      tap_action: { action: "open-popup" },
    });
  }
  routes.push(...tail);
  if (lightRoute) routes.push(lightRoute);
  return routes;
}

function buildNavbar(cfg, base, { autoPadding = true } = {}) {
  const pages = [];
  const tail = []; // the climate fan goes below the "More" popup, above the light
  for (const key of pageOrder(cfg)) {
    const meta = PAGE_META[key];
    if (!cfg.pages[key].enabled) continue;
    if (KS_PAGES.includes(key) && ksChosen(cfg, key)) {
      // Kiosk Satellite's own view: the button runs an action instead of going to a page of this dashboard
      if (ksActive(cfg, key)) pages.push({ icon: meta.icon, label: cfg.show_labels ? meta.label : "", url: "", tap_action: ksAction(cfg, key) });
      continue;
    }
    const route = { icon: key === "home" && cfg.pages.home.screens?.[0]?.icon ? cfg.pages.home.screens[0].icon : meta.icon, label: cfg.show_labels ? meta.label : "", url: `/${base}/${meta.path}` };
    // Climate is a pop-up on the current page, not a page of its own
    if (key === "climate") { route.url = CLIMATE_HASH; tail.push(route); continue; }
    pages.push(route);
    // more home screens each get a button after Home
    if (key === "home") for (let i = 1; i < (cfg.pages.home.screens || []).length; i++) pages.push({ icon: cfg.pages.home.screens[i].icon || "mdi:home-outline", label: cfg.show_labels ? `Home ${i + 1}` : "", url: `/${base}/home-${i + 1}` });
  }
  // Kiosk Satellite shortcuts follow the pages (and move into the "More" pop-up with them when the bar is full)
  for (const sc of cfg._navShortcuts || []) pages.push({ icon: sc.icon, label: cfg.show_labels ? sc.label : "", url: "", tap_action: sc.tap_action });
  const light = cfg.navbar.light_entity;
  const lightRoute = light
    ? {
        icon: "mdi:lightbulb",
        label: "",
        url: "",
        tap_action: { action: "toggle", entity: light },
        hold_action: { action: "more-info", entity: light },
        icon_color:
          "[[[\n  return hass.states['" + light + "']?.state === 'on' ? 'yellow' : 'var(--primary-text-color)';\n]]]\n",
      }
    : null;
  const routes = layoutNavbarRoutes(pages, lightRoute, DEVICES[cfg.device].maxButtons, tail);
  const card = {
    type: "custom:navbar-card",
    routes,
    mobile: { mode: "floating" },
  };
  card.desktop = { position: "right", mode: "floating" };
  const nb = DEVICES[cfg.device].navbar;
  {
    card.styles = [
      `.navbar { --navbar-primary-color: ${(cfg.palette || DEFAULT_PALETTE).accent}; } /* the selected page uses the background's accent colour */`,
      `.navbar-card { border-radius: ${BLOCK_RADIUS} !important; } /* rounded like the blocks */`,
      ...(nb ? [
      `.navbar.desktop { --navbar-route-icon-size: ${nb.icon}px; }`,
      `.navbar-card.desktop { gap: ${nb.gap}px !important; }`,
      `.button { max-width: ${nb.button}px !important; height: ${nb.button}px !important; }`] : []),
      "",
    ].join("\n");
  }
  // Full-screen content (live video) should run behind the floating navbar, not stop short of it.
  if (!autoPadding) card.layout = { auto_padding: { enabled: false } };
  return card;
}

/* ------------------------------------------------------------------ */
/* Pages                                                                */
/* ------------------------------------------------------------------ */

/* ---- Colours taken from the chosen background ---- */

// Buttons, bars and dialogs use colours picked from the background: a tan/mid tone for buttons, a darker tone for
// secondary buttons, a dark brown for tracks, and a near-black ink for text on them.
const DEFAULT_PALETTE = { accent: "#BD9D89", accent2: "#806F62", track: "#533F36", ink: "#002327", text: "#F3E9E2" };

const rgbHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const rgbaOf = (hex, a) => `rgba(${(hexRgb(hex) || [0, 0, 0]).join(", ")}, ${a})`;
const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const luminance = ([r, g, b]) => { const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrastRatio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Picks the palette from a list of colour clusters [{ rgb, w }] (w = share of the picture).
export function paletteFromClusters(clusters) {
  const cl = clusters.filter((c) => c.w > 0);
  if (!cl.length) return { ...DEFAULT_PALETTE };
  const mids = cl.filter((c) => luminance(c.rgb) > 0.12 && luminance(c.rgb) < 0.85);
  const accent = [...(mids.length ? mids : cl)].sort((a, b) => b.w - a.w)[0];
  const la = luminance(accent.rgb);
  const darker = cl.filter((c) => c !== accent && luminance(c.rgb) < la).sort((a, b) => luminance(b.rgb) - luminance(a.rgb));
  const accent2 = darker[0] ? darker[0].rgb : accent.rgb.map((v) => v * 0.7);
  const track = darker[1] ? darker[1].rgb : accent.rgb.map((v) => v * 0.45);
  const darkest = [...cl].sort((a, b) => luminance(a.rgb) - luminance(b.rgb))[0].rgb;
  // text on the accent: the darkest colour of the picture if readable, else near-black, else near-white
  const cands = [darkest, [10, 10, 10], [245, 245, 245]];
  const ink = cands.find((c) => contrastRatio(c, accent.rgb) >= 4.5) || [...cands].sort((a, b) => contrastRatio(b, accent.rgb) - contrastRatio(a, accent.rgb))[0];
  return {
    accent: rgbHex(accent.rgb),
    accent2: rgbHex(accent2),
    track: rgbHex(track),
    ink: rgbHex(ink),
    text: rgbHex(accent.rgb.map((v) => v + (255 - v) * 0.85)),
  };
}

// k-means over pixels [[r,g,b], ...] -> palette
export function paletteFromPixels(px, K = 7) {
  if (!px.length) return { ...DEFAULT_PALETTE };
  // farthest-point start so small but distinct colours get their own cluster
  const step = Math.max(1, Math.floor(px.length / 1500)), sample = px.filter((_, i) => i % step === 0);
  const cen = [sample[0]];
  while (cen.length < K) {
    let best = null, bd = -1;
    for (const p of sample) { const d = Math.min(...cen.map((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2)); if (d > bd) { bd = d; best = p; } }
    if (bd <= 0) break;
    cen.push(best);
  }
  let asg = new Array(px.length).fill(0);
  for (let it = 0; it < 15; it++) {
    for (let i = 0; i < px.length; i++) {
      let b = 0, bd = Infinity;
      for (let j = 0; j < cen.length; j++) { const q = cen[j], d = (px[i][0] - q[0]) ** 2 + (px[i][1] - q[1]) ** 2 + (px[i][2] - q[2]) ** 2; if (d < bd) { bd = d; b = j; } }
      asg[i] = b;
    }
    for (let j = 0; j < cen.length; j++) { const q = cen[j]; let n = 0, sr = 0, sg = 0, sb = 0; for (let i = 0; i < px.length; i++) if (asg[i] === j) { n++; sr += px[i][0]; sg += px[i][1]; sb += px[i][2]; } cen[j] = n ? [sr / n, sg / n, sb / n] : q; }
  }
  const w = new Array(cen.length).fill(0); asg.forEach((a) => w[a]++);
  return paletteFromClusters(cen.map((rgb, j) => ({ rgb, w: w[j] / px.length })));
}

// Built-in gradient backgrounds: use their colour stops directly.
export function paletteFromGradient(css) {
  const stops = (String(css).match(/#[0-9a-f]{6}/gi) || []).map(hexRgb).filter(Boolean);
  return stops.length ? paletteFromClusters(stops.map((rgb) => ({ rgb, w: 1 / stops.length }))) : { ...DEFAULT_PALETTE };
}

// Palette that needs no image loading (gradients, no background). Custom images are read by resolvePalette.
export function palettePreset(cfg) {
  const css = BACKGROUNDS[cfg.background]?.css;
  return css ? paletteFromGradient(css) : { ...DEFAULT_PALETTE };
}

const PALETTE_KEYS = ["accent", "accent2", "track", "ink", "text"];
// The picked palette with any colours the user chose themselves laid over it (invalid values are ignored).
export function applyPaletteOverride(pal, over) {
  const out = { ...pal };
  for (const k of PALETTE_KEYS) { const rgb = over && hexRgb(over[k]); if (rgb) out[k] = rgbHex(rgb); }
  return out;
}

// Samples a picture (same-origin or CORS-enabled URL) in the browser.
export async function paletteFromImageUrl(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
  const w = 120, h = Math.max(1, Math.round((120 * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  return paletteFromPixels(px);
}

// An image URL can contain {device}, which becomes the screen name (echo_show_5 / echo_show_8), so each device loads a copy cut
// to its own screen size (e.g. /local/bg/Greenery.{device}.webp). A plain URL is used as it is.
const imageUrl = (cfg) => String(cfg.custom_background || "").replace(/\{device\}/g, cfg.device || "echo_show_5");

// The photo a background uses: the custom image URL; "" for a gradient or none.
const backgroundImage = (cfg) => (cfg.background === "custom" ? imageUrl(cfg) : "");

const paletteCache = new Map();
export async function resolvePalette(cfg) {
  if (backgroundImage(cfg)) {
    const key = backgroundImage(cfg);
    if (!paletteCache.has(key)) {
      try { paletteCache.set(key, await paletteFromImageUrl(key)); } catch (e) { paletteCache.set(key, { ...DEFAULT_PALETTE }); }
    }
    return paletteCache.get(key);
  }
  return palettePreset(cfg);
}

function backgroundFor(cfg) {
  if (backgroundImage(cfg)) {
    // A light image would wash the page out against the light text, so the lighter the palette, the more it is dimmed.
    const pal = cfg.palette;
    const m = pal ? (luminance(hexRgb(pal.accent) || [0, 0, 0]) + luminance(hexRgb(pal.accent2) || [0, 0, 0]) + luminance(hexRgb(pal.track) || [0, 0, 0])) / 3 : 0;
    return {
      opacity: Number(cfg.background_opacity) > 0 ? Math.min(100, Number(cfg.background_opacity)) : (m < 0.25 ? 50 : m < 0.4 ? 42 : m < 0.55 ? 36 : 30),
      alignment: "center right",
      size: "cover",
      repeat: "no-repeat",
      attachment: "fixed",
      image: backgroundImage(cfg),
    };
  }
  const css = BACKGROUNDS[cfg.background]?.css;
  return css ? css : undefined;
}

// Scales every number in a CSS length such as "50px" or ".5em".
const scaleN = (n) => Math.round(n * 1000) / 1000;
const scaleCss = (v, k) => String(v).replace(/\d*\.?\d+/, (n) => String(Math.round(parseFloat(n) * k * 1000) / 1000));

function homeClockStack(cfg, dev, hass, { vh = false, left = false } = {}) {
  const clockStack = [
    {
      type: "custom:digital-clock",
      padding: vh ? "0" : dev.clock.padding, // beside the tiles the clock is centred by the grid, so no top offset
      background: "transparent",
      additionalCSS: "border:none;box-shadow:none",
      firstLineFormat: uses12Hour(cfg, hass) ? "h:mm" : "H:mm", // no AM/PM: it would make the big clock too wide
      secondLineFormat: usesMonthFirst(cfg, hass) ? "cccc LLLL d" : "cccc d LLLL",
      firstLineLayout: { textAlign: left ? "left" : "center", lineHeight: vh ? "1em" : dev.clock.lineHeight, fontSize: vh ? "24vh" : dev.clock.size, fontWeight: "normal" },
      secondLineLayout: { textAlign: left ? "left" : "center", lineHeight: vh ? "1.5em" : dev.clock.dateLineHeight, fontSize: vh ? "5vh" : dev.clock.dateSize, fontWeight: "normal" },
    },
  ];
  if (cfg.pages.home.weather) {
    // beside the quick-control tiles (vh layouts) the weather chip is smaller so it fits the narrower clock column
    const c = vh ? Object.fromEntries(Object.entries(dev.chip).map(([k, v]) => [k, scaleCss(v, 0.75)])) : dev.chip;
    clockStack.push({
      type: "custom:mushroom-chips-card",
      chips: [
        {
          type: "weather",
          entity: cfg.pages.home.weather,
          show_conditions: true,
          show_temperature: true,
          tap_action: { action: "more-info" },
        },
      ],
      alignment: left ? "start" : "center",
      card_mod: {
        style:
          "ha-card {\n" +
          `  --chip-height: ${c.height} !important;\n` +
          `  --chip-font-size: ${c.font} !important;\n` +
          `  --chip-icon-size: ${c.icon} !important;\n` +
          `  --chip-padding: ${c.padding} !important;\n` +
          `  --chip-border-radius: ${c.radius} !important;\n` +
          "  --chip-background: transparent !important;\n" +
          "}\n",
      },
    });
  }
  return clockStack;
}

/* ---- Home with quick controls: clock on the left, large rectangular buttons on the right ---- */

// Grid cards have no ha-card, so spacing goes on :host. The navbar card already reserves its own space on the right.
const homeGridCss = (pad = 1, gap = 0) => [
  ":host {",
  "  display: block;",
  "  box-sizing: border-box;",
  "  height: calc(100vh - 8px) !important;",
  "  min-height: calc(100vh - 8px) !important;",
  "  /* +8px on top balances the 8px the stack leaves for the floating navbar, so content is centred on the screen */",
  `  padding: calc(${scaleN(6 * pad)}vh + 8px) ${scaleN(2 * pad + gap)}vw ${scaleN(6 * pad)}vh ${scaleN(2 * pad)}vw !important;`,
  "  --grid-card-gap: 7vw; /* space between the clock and the tiles */",
  "  --stack-card-gap: 3vh;",
  "}",
  "#root { align-items: center !important; } /* centre the clock against the buttons */",
  "",
].join("\n");

const TILE_OPACITY = 0.6;
// The panel behind a block: the palette's track colour darkened and mostly opaque, so its outline shows on any background.
const mixHex = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return x && y ? rgbHex(x.map((v, i) => v + (y[i] - v) * t)) : a; };
// The slider fill of a thermostat follows its mode: orange when heating, blue when cooling, in tones that match the palette.
// Bubble Card evaluates the ${...} template in its styles each time the state changes.
const climateFillStyle = (pal) => {
  const heat = mixHex(pal.accent, "#E8782A", 0.5);
  const cool = mixHex(pal.accent2, "#3F86C4", 0.5);
  return `.bubble-range-fill { background-color: \${state === "heat" ? "${heat}" : state === "cool" ? "${cool}" : state === "fan_only" || state === "dry" ? "${pal.accent2}" : "${pal.accent}"} !important; }
`;
};
// Darkens a colour (towards black) until the palette's text colour reads on it (contrast >= 4.5).
const darkenFor = (hex, textHex, k0 = 1, min = 4.5) => {
  const c = hexRgb(hex), t = hexRgb(textHex);
  if (!c || !t) return c || [0, 0, 0];
  let k = k0;
  while (k > 0.2 && contrastRatio(c.map((v) => v * k), t) < min) k -= 0.05;
  return c.map((v) => Math.round(v * k));
};
// The panel behind a block: the palette's track colour darkened (at least to 65%, more if the text needs it) and mostly opaque.
const panelBg = (pal) => `rgba(${darkenFor(pal.track, pal.text, 0.65).join(", ")}, 0.8)`;
const solidBg = (pal, hex, min = 4.5) => rgbHex(darkenFor(hex, pal.text, 1, min));
const TILE_RADIUS = "999px"; // pill-shaped tiles
const vhs = (n, ts = 1) => Math.round(n * ts * 100) / 100 + "vh"; // a font size in vh, enlarged by the device's text scale
const tileStyles = (pal = DEFAULT_PALETTE, radius = TILE_RADIUS, block = false, ts = 1) => [
  `.bubble-button-container { background-color: ${panelBg(pal)} !important; }`,
  `.bubble-range-fill { background-color: ${solidBg(pal, pal.accent, 3)} !important; opacity: ${TILE_OPACITY} !important; filter: brightness(0.9); }`,
  `ha-card, .bubble-button-container, .bubble-background, .bubble-range-slider { border-radius: ${radius} !important; overflow: hidden; }`,
  ...(block === "narrow"
    ? [
        // narrow block (two share a quadrant): the icon in the top left corner, the name at the bottom left on up to two lines
        ".bubble-range-value { display: none !important; }",
        ".bubble-wrapper { flex-direction: column !important; align-items: flex-start !important; justify-content: space-between !important; }",
        ".bubble-icon-container { margin: 3vh 0 0 3vh !important; width: 8vh !important; height: 8vh !important; min-width: 8vh !important; background: transparent !important; box-shadow: none !important; }",
        `.bubble-icon { --mdc-icon-size: 6.5vh !important; color: ${pal.text} !important; }`,
        ".bubble-name-container { display: block !important; flex: none !important; margin: 0 2.5vh 3vh 3vh !important; width: calc(100% - 5.5vh) !important; min-width: 0 !important; text-align: left !important; }",
        `.bubble-state { display: block !important; margin: 0 !important; font-size: ${vhs(3, ts)} !important; font-weight: 400 !important; text-align: left !important; opacity: 0.8 !important; color: ${pal.text} !important; }`,
        `.bubble-name { display: -webkit-box !important; -webkit-box-orient: vertical !important; -webkit-line-clamp: 2 !important; white-space: normal !important; overflow: hidden !important; text-overflow: clip !important; font-size: ${vhs(3.6, ts)} !important; font-weight: 400 !important; line-height: 1.2 !important; text-align: left !important; color: ${pal.text} !important; opacity: 1 !important; }`,
      ]
    : block
    ? [
        // block layout: the icon in the top left corner, the name in the top right
        ".bubble-range-value { display: none !important; }",
        `.bubble-state { display: block !important; margin: 0 !important; font-size: ${vhs(3.6, ts)} !important; font-weight: 400 !important; line-height: 1.2 !important; text-align: right !important; opacity: 0.8 !important; color: ${pal.text} !important; }`,
        ".bubble-wrapper { align-items: flex-start !important; justify-content: flex-start !important; }",
        ".bubble-content-container { width: 100% !important; box-sizing: border-box !important; align-items: flex-start !important; justify-content: space-between !important; padding: 0 !important; }",
        ".bubble-icon-container { margin: 3vh 0 0 3.5vh !important; width: 8vh !important; height: 8vh !important; min-width: 8vh !important; background: transparent !important; box-shadow: none !important; }",
        `.bubble-icon { --mdc-icon-size: 6.5vh !important; color: ${pal.text} !important; }`,
        ".bubble-name-container { display: block !important; flex: 1 !important; margin: 3.4vh 3.5vh 0 0 !important; min-width: 0 !important; text-align: right !important; }",
        `.bubble-name { display: block !important; font-size: ${vhs(4.6, ts)} !important; font-weight: 400 !important; line-height: 1.2 !important; text-align: right !important; color: ${pal.text} !important; opacity: 1 !important; }`,
      ]
    : [
        ".bubble-name-container { display: none !important; }",
        ".bubble-wrapper { justify-content: center !important; }",
        ".bubble-icon-container { margin: 0 !important; width: 19vh !important; height: 19vh !important; min-width: 19vh !important; background: transparent !important; box-shadow: none !important; }",
        `.bubble-icon { --mdc-icon-size: 10vh !important; color: ${pal.text} !important; }`,
      ]),
  "",
].join("\n");

// A sensor's current value as a tile: the value large at the bottom right, under the icon and name of the block layout.
const valueTileCss = (block, ts = 1) => block === "narrow"
  ? `.bubble-state { font-size: ${vhs(4.8, ts)} !important; line-height: 1.1 !important; opacity: 1 !important; font-weight: 400 !important; }\n`
  : [
      ".bubble-name-container { align-self: stretch !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; margin-bottom: 3vh !important; }",
      `.bubble-state { font-size: ${vhs(11, ts)} !important; line-height: 1 !important; opacity: 1 !important; font-weight: 400 !important; }`,
      "",
    ].join("\n");

// ---- dynamic tiles: the card type follows the kind of entity ----
const TOGGLE_DOMAINS = ["switch", "input_boolean", "automation", "humidifier", "siren", "remote", "group"];

// A light is shown as a slider (tap toggles, drag dims) unless Home Assistant says it cannot dim.
function isDimmable(entity, hass) {
  if (!entity.startsWith("light.")) return false;
  const modes = hass?.states?.[entity]?.attributes?.supported_color_modes;
  return !(Array.isArray(modes) && modes.length === 1 && modes[0] === "onoff");
}

// Chooses how an entity is shown and operated:
//   dimmable light, fan with speeds, cover with position, input_number/number -> slider
//   on/off light, switch, input_boolean, automation ...                      -> toggle tile
//   media player                                                             -> volume slider, tap plays/pauses
//   climate (thermostat, electric blanket)                                   -> temperature slider, tap = on/off, icon = details
//   scene, script, button                                                    -> tile that runs it
//   anything else (sensor, lock, vacuum, weather ...)                        -> status tile, tap shows details
// Hold always opens the entity's details. Unknown entities fall back to a plain toggle/details tile.
// A weather block for the block layouts, after the Nest Hub's: condition at the top left, the icon on the left opposite the temperature on the right,
// a thin line, then today's weekday on the left and the high and low on the right. It is Home Assistant's weather card
// restyled (its daily forecast supplies the bottom row), as tall as `rows` Bubble rows, on a solid palette colour (the soft grey accent2).
const weatherBlockCss = (rows, pal, radius) => [
  "ha-card {",
  `  background: ${solidBg(pal, pal.accent2)} !important;`,
  `  color: ${pal.text} !important;`,
  `  border-radius: ${radius} !important;`,
  "  box-shadow: none !important;",
  "  border: none !important;",
  "  box-sizing: border-box !important;",
  `  height: calc(${rows} * var(--row-height) + ${rows - 1} * var(--row-gap)) !important;`,
  "  display: flex !important;",
  "  flex-direction: column !important;",
  "  justify-content: space-between !important;",
  "  padding: 3.5vh 4vh 3vh !important;",
  "  overflow: hidden !important;",
  "}",
  "ha-card div.content { display: grid !important; grid-template-columns: 1fr auto auto !important; grid-template-rows: auto 1fr !important; align-items: center !important; column-gap: 1.5vh !important; padding: 0 !important; flex: 1 !important; width: 100% !important; box-sizing: border-box !important; }",
  "ha-card div.info { display: contents !important; }",
  "ha-card div.name-state { grid-column: 1 / -1; grid-row: 1; justify-self: start; }",
  "ha-card div.name-state div.state { font-size: 4.2vh !important; line-height: 1.2 !important; }",
  "ha-card div.name-state div.name { display: none !important; }",
  "ha-card div.icon-image { grid-column: 1; grid-row: 2; justify-self: start; display: block !important; transform: translateY(0.8vh); }",
  "ha-card div.icon-image img, ha-card div.icon-image ha-icon, ha-card div.icon-image svg { width: 12vh !important; height: 12vh !important; --mdc-icon-size: 12vh; }",
  "ha-card div.temp-attribute { grid-column: 2 / -1; grid-row: 2; justify-self: end; padding: 0 !important; text-align: right !important; }",
  "ha-card div.temp-attribute .temp { font-size: 11vh !important; line-height: 1 !important; padding: 0 !important; }",
  "ha-card div.temp-attribute .temp span { font-size: 4vh !important; vertical-align: top; margin-left: 0 !important; }",
  "ha-card div.temp-attribute .attribute { display: none !important; }",
  `  ha-card div.forecast { display: flex !important; flex: none !important; padding: 2vh 0 0 !important; margin: 0 !important; border-top: 0.3vh solid ${pal.text} !important; width: 100% !important; mask-image: none !important; -webkit-mask-image: none !important; overflow: visible !important; }`,
  "ha-card div.forecast-item { display: flex !important; flex-direction: row !important; align-items: baseline !important; width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; gap: 1.5vh !important; overflow: visible !important; }",
  "ha-card div.forecast-item:nth-child(n+2) { display: none !important; }",
  `ha-card div.forecast-item div.forecast-item-label { order: 1; flex: 1; text-align: left !important; font-size: 4vh !important; opacity: 1 !important; color: ${pal.text} !important; }`,
  "ha-card div.forecast-item div.temp { order: 2; flex: none !important; font-size: 3.8vh !important; }",
  "ha-card div.forecast-item div.templow { order: 3; flex: none !important; font-size: 3.8vh !important; opacity: 0.75; }",
  "ha-card div.forecast-item div.forecast-image-icon { display: none !important; }",
  "",
].join("\n");

// A sensor in the block layouts: a Mini Graph Card (icon, name, value and a line graph of the last day) on the same panel as
// the other blocks. Like the weather block it is double wide, in a quadrant of its own.
const graphBlockCss = (rows, pal, radius) => [
  `:host { display: block !important; height: calc(${rows} * var(--row-height) + ${rows - 1} * var(--row-gap)) !important; }`,
  "ha-card {",
  `  background: ${panelBg(pal)} !important;`,
  `  color: ${pal.text} !important;`,
  `  border-radius: ${radius} !important;`,
  "  box-shadow: none !important;",
  "  border: none !important;",
  "  box-sizing: border-box !important;",
  "  height: 100% !important;",
  "  padding: 0 !important;",
  "  display: flex !important;",
  "  flex-direction: column !important;",
  "  justify-content: flex-end !important;",
  "  overflow: hidden !important;",
  "}",
  // the same arrangement as the other blocks: icon in the top left corner, name top right with the value under it
  "ha-card .header { position: absolute !important; top: 0; left: 0; right: 0; height: 0; padding: 0 !important; }",
  `ha-card .icon { position: absolute !important; top: 3vh; left: 3.5vh; padding: 0 !important; color: ${pal.text} !important; }`,
  `ha-card .icon ha-icon { --mdc-icon-size: 6.5vh; color: ${pal.text} !important; }`,
  `ha-card .name { position: absolute !important; top: 3.4vh; right: 3.5vh; width: auto !important; max-width: 60% !important; font-size: 4.6vh !important; font-weight: 400 !important; line-height: 1.2 !important; opacity: 1 !important; color: ${pal.text} !important; }`,
  `ha-card .name span, ha-card .name .ellipsis { font-weight: 400 !important; opacity: 1 !important; color: ${pal.text} !important; }`,
  "ha-card .states { position: absolute !important; top: 9.8vh; right: 3.5vh; padding: 0 !important; justify-content: flex-end !important; }",
  `ha-card .state__value, ha-card .state__uom { font-size: 3.6vh !important; font-weight: 400 !important; opacity: 0.8; color: ${pal.text} !important; }`,
  // the unit sits on the baseline of the digits and a little smaller (the card puts it at the bottom of the line, which makes a wide
  // unit such as % look big and low)
  "ha-card .state { align-items: baseline !important; }",
  "ha-card .state__uom { font-size: 2.8vh !important; align-self: baseline !important; vertical-align: baseline !important; margin-left: 0.5vh !important; }",
  "ha-card .graph { padding: 0 !important; }",
  "",
].join("\n");

// The graph line: the palette's dark ink colour lightened, a cool tone that stands apart from the warm accents and text.
const graphLineColor = (pal) => {
  const ink = hexRgb(pal.ink) || [1, 35, 39];
  return rgbHex(ink.map((v) => v + (255 - v) * 0.6));
};

function graphBlock(entity, name, rows, pal, radius, icon, viewH = 602, rowVh = BLOCK_ROW, gapVh = BLOCK_GAP) {
  const card = {
    type: "custom:mini-graph-card",
    entities: [{ entity }],
    hours_to_show: 24,
    points_per_hour: 2,
    height: Math.round(((rows * rowVh + (rows - 1) * gapVh) / 100) * viewH * 0.84), // px: about 84% of the block (195px on the Show 8)
    line_width: 3,
    line_color: graphLineColor(pal),
    smoothing: true,
    animate: false,
    show: { icon: true, name: true, state: true, graph: "line", fill: "fade", points: false, legend: false, labels: false, extrema: false },
    card_mod: { style: graphBlockCss(rows, pal, radius) },
  };
  if (name) card.name = name;
  if (icon) card.icon = icon;
  return card;
}

// A media player in the block layout. In a double wide slot (a quadrant of its own) it is Bubble Card's full media player (cover art as the
// background, play/pause and power buttons along the bottom); where it shares a quadrant it only shows the name and play/pause.
const WIDE_BLOCKS = new WeakSet(); // blocks that fill a quadrant of their own (like the weather block and graphs)
const mediaStyles = (pal, radius, wide, ts = 1) => [
  `ha-card { --bubble-border-radius: ${radius}; --bubble-media-player-border-radius: ${radius}; --bubble-icon-color: ${pal.text}; --bubble-media-player-buttons-border-radius: 999px; --bubble-main-buttons-background-color: transparent; --bubble-media-player-play-pause-icon-color: ${pal.text}; }`,
  `ha-card, .bubble-container, .bubble-media-player-container, .bubble-background { border-radius: ${radius} !important; overflow: hidden; }`,
  // the panel, like the other blocks (the container carries the colour; the blurred cover art, when there is one, is drawn by the background layer on top of it)
  `.bubble-media-player-container { background: ${panelBg(pal)} !important; }`,
  `.bubble-background { background-color: transparent !important; }`,
  // the icon in the top left corner without its circle, the name and state in the top right, like the other blocks
  ".bubble-media-player.bubble-wrapper { align-items: flex-start !important; }",
  `.bubble-main-icon-container { margin: 3vh 0 0 3.5vh !important; width: 8vh !important; height: 8vh !important; min-width: 8vh !important; background: transparent !important; box-shadow: none !important; }`,
  `.bubble-main-icon { --mdc-icon-size: 6.5vh !important; color: ${pal.text} !important; }`,
  `.bubble-name-container { flex: 1 !important; min-width: 0 !important; margin: 3.4vh 3.5vh 0 1.5vh !important; text-align: right !important; display: block !important; }`,
  `.bubble-name { display: block !important; font-size: ${vhs(wide ? 4.6 : 3.6, ts)} !important; font-weight: 400 !important; line-height: 1.2 !important; color: ${pal.text} !important; }`,
  `.bubble-state { display: block !important; font-size: ${vhs(wide ? 3.6 : 3, ts)} !important; font-weight: 400 !important; line-height: 1.2 !important; opacity: 0.8 !important; color: ${pal.text} !important; }`,
  `.bubble-title, .bubble-artist { color: ${pal.text} !important; }`,
  // never the track title and artist: the block always shows its name and state, even while something plays (Bubble swaps them for the title)
  ".bubble-media-info-container, .bubble-title, .bubble-artist { display: none !important; }",
  ".bubble-name-container, .bubble-name, .bubble-state { display: block !important; visibility: visible !important; opacity: 1 !important; }",
  // the buttons along the bottom: round, with the palette's accent colour on play / pause
  `.bubble-buttons-container { padding: 0 3vh 3vh 3vh !important; gap: 2vh !important; }`,
  `.bubble-media-button { height: ${wide ? 8 : 7}vh !important; border-radius: 999px !important; background: ${rgbaOf(pal.accent, 0.3)} !important; }`,
  `.bubble-play-pause-button { background: ${solidBg(pal, pal.accent, 3)} !important; }`,
  `.bubble-media-button-icon { --mdc-icon-size: 4.8vh !important; color: ${pal.text} !important; }`,
  "",
].join("\n");
function mediaBlock(b, rows, pal, radius, { wide = true, textScale = 1 } = {}) {
  const e = b.entity;
  const card = {
    type: "custom:bubble-card",
    card_type: "media-player",
    entity: e,
    rows,
    cover_background: wide,
    main_buttons_position: "bottom",
    main_buttons_full_width: true,
    // wide: play/pause and power; compact: play/pause only
    hide: wide
      ? { next_button: true, previous_button: true, power_button: false, play_pause_button: false }
      : { next_button: true, previous_button: true, power_button: true, play_pause_button: false, volume_button: true },
    state_content: "state",
    grid_options: { columns: 12 },
    hold_action: { action: "more-info" },
    styles: mediaStyles(pal, radius, wide, textScale),
  };
  if (b.name) card.name = b.name;
  if (b.icon) card.icon = b.icon;
  if (wide) {
    // while nothing is playing there is a chevron that opens the player's details
    card.sub_button = { bottom: [{ name: "Controls", justify_content: "flex-end", group: [{ visibility: [{ entity: e, condition: "state", state: ["off", "unavailable", "unknown", "idle", "standby"] }], name: "More info", icon: "mdi:chevron-right", show_background: false, state_background: false, fill_width: false }] }] };
    WIDE_BLOCKS.add(card);
  }
  return card;
}

function weatherBlock(entity, rows, pal, radius) {
  return { type: "weather-forecast", entity, forecast_type: "daily", card_mod: { style: weatherBlockCss(rows, pal, radius) } };
}

const ksCameraName = (hass, id) => (/\bShow (.+)$/i.exec(hass?.states?.[id]?.attributes?.friendly_name || "") || [])[1] || "";
const KS_ICONS = { calendar: "mdi:calendar", cameras: "mdi:cctv", timers: "mdi:timer-outline", alarms: "mdi:alarm", now_playing: "mdi:music", music_library: "mdi:music-box-multiple", apps: "mdi:apps" };

// A card set to a Kiosk Satellite view is a button for that view: it has no entity, so no slider or toggle, and a tap anywhere opens the view.
// (A card with an entity keeps the card type its entity decides, see tileFor.)
function viewButton(b, hass, pal, { radius = TILE_RADIUS, rows = 2, block = false, textScale = 1 } = {}) {
  const tap = b.tap_override;
  const viewName = ksCameraName(hass, b.shortcut_view);
  return {
    type: "custom:bubble-card",
    card_type: "button",
    button_type: "name",
    card_layout: "large",
    rows,
    name: b.name || (b.shortcut === "cameras" && viewName) || KS_SHORTCUTS[b.shortcut] || "",
    icon: b.icon || KS_ICONS[b.shortcut] || "mdi:gesture-tap",
    show_name: !!block,
    tap_action: tap,
    button_action: { tap_action: tap },
    hold_action: { action: "none" },
    styles: tileStyles(pal, radius, block, textScale),
  };
}

export function quickTileFor(b, hass, pal = DEFAULT_PALETTE, opts = {}) {
  return b.tap_override ? viewButton(b, hass, pal, opts) : tileFor(b, hass, pal, opts);
}

function tileFor(b, hass, pal = DEFAULT_PALETTE, { radius = TILE_RADIUS, rows = 2, block = false, viewH = 602, textScale = 1, device = "", layout = "", rowVh = BLOCK_ROW, gapVh = BLOCK_GAP } = {}) {
  const e = b.entity;
  const domain = e.split(".")[0];
  const attrs = hass?.states?.[e]?.attributes || {};
  const feat = Number(attrs.supported_features) || 0;
  const more = { action: "more-info" };
  const tile = { type: "custom:bubble-card", entity: e, card_layout: "large", rows, hold_action: more, styles: tileStyles(pal, radius, block, textScale) };
  if (b.name) tile.name = b.name;
  if (b.icon) tile.icon = b.icon;
  const button = (button_type, tap, extra) => ({ ...tile, card_type: "button", button_type, show_name: !!block, show_state: false, tap_action: tap, ...extra });
  const toggle = { action: "toggle" };
  const run = (service) => ({ action: "perform-action", perform_action: service, target: { entity_id: e } });

  if (block && domain === "weather") return weatherBlock(e, rows, pal, radius);
  if (block && displayOf(b, device, layout) === "graph") return graphBlock(e, b.name, rows, pal, radius, b.icon, viewH, rowVh, gapVh);
  // a dimmable light: drag to dim, and a tap anywhere on the card (not only the icon) switches it on and off
  if (domain === "light") return isDimmable(e, hass) ? button("slider", toggle, { button_action: { tap_action: toggle } }) : button("switch", toggle);
  if (domain === "fan") return button(attrs.percentage !== undefined || feat & 1 ? "slider" : "switch", toggle);
  if (domain === "cover") return button(feat & 4 ? "slider" : "state", toggle);
  if (domain === "input_number" || domain === "number") return button("slider", more);
  // volume slider; tap plays/pauses, hold opens the full player
  // in the blocks: the full player in a slot of its own (b.media "wide", the default) or play/pause only (b.media "compact", or a narrow block)
  if (block && domain === "media_player") return mediaBlock(b, rows, pal, radius, { wide: block !== "narrow" && b.media !== "compact", textScale });
  if (domain === "media_player") return button("slider", run("media_player.media_play_pause"));
  // thermostat (electric blanket, heater ...): drag to set the temperature, tap the card to switch it on and off, tap the icon
  // (or hold) for the full dialog
  if (domain === "climate") return button("slider", more, { button_action: { tap_action: toggle }, styles: tile.styles + climateFillStyle(pal), ...(block ? { show_state: true, show_attribute: true, attribute: "temperature" } : {}) });
  if (domain === "scene") return button("state", run("scene.turn_on"));
  if (domain === "script") return button("state", run("script.turn_on"));
  if (domain === "button") return button("state", run("button.press"));
  if (domain === "input_button") return button("state", run("input_button.press"));
  if (TOGGLE_DOMAINS.includes(domain)) return button("switch", toggle);
  // a sensor shown as its current value: the value large on the tile
  if (domain === "sensor") return button("state", more, { show_state: true, styles: tile.styles + valueTileCss(block, textScale) });
  return button("state", more);
}

// The cards to show: the configured ones that are filled in, at most `count`, each with its view action when it opens a Kiosk Satellite view.
function quickButtons(cfg, count, hass) {
  const list = (cfg.pages.home.quick_buttons || []).map((b) => ({ ...b }));
  // the first button is the lights; it defaults to the navbar light entity
  if (list.length === 0 || (!list[0].entity && !hasShortcut(cfg, list[0]))) {
    const light = cfg.navbar.light_entity;
    if (light) list[0] = { entity: light, name: (list[0] && list[0].name) || "Lights", icon: (list[0] && list[0].icon) || "" };
  }
  return list
    .map((b) => ({ ...b, tap_override: ksShortcutAction(cfg, hass, b) })) // a view card: its button action (an entity set on it is ignored)
    .filter((b) => b.entity || b.tap_override)
    .slice(0, count);
}

function quickButtonList(cfg, count, hass, tileOpts, buttons = quickButtons(cfg, count, hass)) {
  return buttons.map((b, i) => quickTileFor(b, hass, cfg.palette, tileOpts ? tileOpts(i) : undefined));
}

function homePanel(cfg, base, missing, grid) {
  const stack = [grid, buildNavbar(cfg, base)];
  if (missing.length) stack.unshift(missingCard(missing));
  const view = { type: "panel", path: PAGE_META.home.path, title: "Home", cards: [{ type: "vertical-stack", cards: stack }] };
  const bg = backgroundFor(cfg);
  if (bg) view.background = bg;
  return view;
}

/* ---- Echo Show 8: a Nest Hub style grid of four quadrants (2 columns x 2 rows) ----
     top left:  the time and date, centred in the quadrant
     the other quadrants hold one or two block tiles each (reading order: top right, bottom left, bottom right;
     with four buttons the bottom right holds two)
     with only one or two buttons they all go in the right column and the time and date are centred vertically
     in the left column.
   Bubble Card tiles are `rows` x --row-height tall (plus the row gaps), so every height is set through rows:
   a quadrant is 4 rows; two quadrants and the gap between them are as tall as the navbar. */
const BLOCK_RADIUS = "3vh";
// Blocks are 4.5vh apart, and so are the blocks and the navbar. The space above, below and to the left of the block area
// is 9vh.
// Two quadrants and the gap between them are as tall as the navbar (81.5vh): 8 rows + 7 gaps.
const BLOCK_GAP = 4.5; // vh
const BLOCK_EDGE = 9; // vh
const BLOCK_ROW = scaleN((81.5 - 7 * BLOCK_GAP) / 8); // vh
// Without a navbar the edge around the blocks is half as wide, and the rows are taller so the blocks still fill the screen:
// 8 rows and 7 gaps between the top and bottom edge.
// With the navbar the blocks start a little closer to the top and left edge and sit closer together (less wasted space).
const BLOCK_GAP_NAV = 3; // vh, between blocks (and to the navbar) when the navbar is shown
const BLOCK_EDGE_NAV = 6; // vh, above, below and left of the blocks when the navbar is shown
const blockGap = (noNavbar) => (noNavbar ? BLOCK_GAP : BLOCK_GAP_NAV);
const blockEdge = (noNavbar) => (noNavbar ? BLOCK_EDGE / 2 : BLOCK_EDGE_NAV);
const blockRowVh = (noNavbar) => scaleN((100 - 2 * blockEdge(noNavbar) - 7 * blockGap(noNavbar)) / 8);
const blocksCss = (noNavbar = false, rowVh = blockRowVh(noNavbar)) => [
  ":host {",
  `  --row-height: ${rowVh}vh;`,
  `  --row-gap: ${blockGap(noNavbar)}vh;`,
  `  --grid-card-gap: ${blockGap(noNavbar)}vh;`,
  `  --stack-card-gap: ${blockGap(noNavbar)}vh;`,
  `  padding-top: ${blockEdge(noNavbar)}vh !important;`,
  `  padding-left: ${blockEdge(noNavbar)}vh !important;`,
  `  padding-right: ${noNavbar ? blockEdge(true) : blockGap(false) + 0.6}vh !important; /* the gap to the navbar equals the gap between blocks (the navbar card sits a little closer than its box suggests); without a navbar both sides match */`,
  // the grid stops 8px above the bottom of the screen, so the bottom padding is 8px less to make the top and bottom edges equal
  `  padding-bottom: calc(${blockEdge(noNavbar)}vh - 8px) !important;`,
  "}",
  "",
].join("\n");

function homeBlocksView(cfg, base, missing, hass, count) {
  const dev = DEVICES[cfg.device];
  const gapVh = blockGap(!!cfg.navbar.hide); const gap = { style: `:host { --grid-card-gap: ${gapVh}vh; --stack-card-gap: ${gapVh}vh; }\n` };
  // The weather block always comes with the quick controls: it is the second block (after the first control), unless the
  // user already added a weather entity as a control. It replaces the weather chip under the time.
  // (no weather entity chosen: the first one Home Assistant has)
  const weatherEntity = cfg.pages.home.weather || Object.keys(hass?.states || {}).find((e) => e.startsWith("weather.")) || "";
  // the screen only has room for dev.maxBlocks blocks in all, the weather block included (5 on both screens: the weather block and up to four controls)
  const limit = Math.min(count, Math.max(1, dev.maxBlocks - (weatherEntity ? 1 : 0)));
  const asked = quickButtons(cfg, limit, hass);
  const isWeatherCard = (b) => !b.tap_override && (b.entity || "").startsWith("weather.");
  const addWeather = !!weatherEntity && !(cfg.pages.home.quick_buttons || []).some((b) => (b.entity || "").startsWith("weather."));
  // There are three quadrants besides the time. The weather block and a graph each need one of their own; other cards share one
  // quadrant two at a time. When that cannot hold every card, the last graphs are shown as their value instead, so no card is dropped.
  const isGraph = (b) => !b.tap_override && displayOf(b, cfg.device, cfg.pages.home.layout) === "graph" && !isWeatherCard(b);
  const isMedia = (b) => !b.tap_override && (b.entity || "").startsWith("media_player.");
  const isWideKind = (b) => isGraph(b) || isMedia(b); // these want a quadrant of their own
  const wideCards = (addWeather ? 1 : 0) + asked.filter(isWeatherCard).length;
  const others = asked.length - asked.filter(isWeatherCard).length;
  let graphRoom = asked.filter(isWideKind).length;
  while (graphRoom > 0 && wideCards + graphRoom + Math.ceil((others - graphRoom) / 2) > 3) graphRoom--;
  let graphsSeen = 0;
  // the ones that do not fit: a graph is shown as its value, a media player as play/pause only
  const buttons = asked.map((b) => (isWideKind(b) && ++graphsSeen > graphRoom ? (isMedia(b) ? { ...b, media: "compact" } : { ...b, display: "value" }) : b));
  const controls = quickButtonList(cfg, limit, hass, undefined, buttons);
  const n = controls.length + (addWeather ? 1 : 0);
  // every block is 4 rows tall (one quadrant). There are at least two blocks: one control and the weather block.
  const rows = 4;
  const rowVh = blockRowVh(!!cfg.navbar.hide);
  const tiles = quickButtonList(cfg, limit, hass, () => ({ radius: BLOCK_RADIUS, rows, block: true, viewH: dev.viewH, textScale: dev.textScale, device: cfg.device, layout: cfg.pages.home.layout, rowVh, gapVh }), buttons);
  // two blocks sharing a quadrant are narrow: the name goes to the bottom left, on up to two lines
  const narrowTiles = quickButtonList(cfg, limit, hass, () => ({ radius: BLOCK_RADIUS, rows, block: "narrow", viewH: dev.viewH, textScale: dev.textScale, device: cfg.device, layout: cfg.pages.home.layout, rowVh, gapVh }), buttons);
  const narrowOf = new Map(tiles.map((t, i) => [t, narrowTiles[i]]));
  const blocks = addWeather ? [...tiles.slice(0, 1), weatherBlock(weatherEntity, rows, cfg.palette, BLOCK_RADIUS), ...tiles.slice(1)] : tiles;
  const hasWeather = blocks.some((t) => t.type === "weather-forecast");
  const clockCfg = hasWeather ? { ...cfg, pages: { ...cfg.pages, home: { ...cfg.pages.home, weather: "" } } } : cfg;
  const clockCards = homeClockStack(clockCfg, dev, hass, { vh: true });
  clockCards[0].firstLineLayout.fontSize = "19vh";
  const clock = { type: "vertical-stack", cards: clockCards, card_mod: { style: ":host { --stack-card-gap: 8px; }\n" } };
  const pair = (list) => (list.length > 1 ? { type: "grid", columns: 2, square: false, cards: list.map((t) => narrowOf.get(t) || t), card_mod: gap } : list[0]);

  // The outer grid centres every cell vertically (#root align-items), so the clock is centred in its quadrant, or
  // against the whole right column when that holds one or two tall buttons.
  let cells;
  if (n <= 2) {
    cells = [clock, { type: "vertical-stack", cards: blocks, card_mod: gap }];
  } else {
    // reading order: top right, bottom left, bottom right; one or two blocks in each quadrant
    // Weather and graph blocks are double wide, so each has a quadrant to itself: the weather block at the bottom left (under
    // the time), graphs at the top right and then the bottom right. The controls share the quadrants that are left.
    const isWide = (t) => t.type === "weather-forecast" || t.type === "custom:mini-graph-card" || WIDE_BLOCKS.has(t);
    const wide = [...blocks.filter((t) => t.type === "weather-forecast"), ...blocks.filter((t) => t.type === "custom:mini-graph-card"), ...blocks.filter((t) => WIDE_BLOCKS.has(t))].slice(0, 3);
    if (wide.length) {
      const others = blocks.filter((t) => !isWide(t));
      const quad = [null, null, null]; // top right, bottom left, bottom right
      [1, 0, 2].slice(0, wide.length).forEach((slot, k) => { quad[slot] = wide[k]; });
      const free = [0, 1, 2].filter((slot) => !quad[slot]);
      let at = 0;
      free.forEach((slot, k) => {
        const size = Math.min(2, Math.floor(others.length / free.length) + (k >= free.length - (others.length % free.length) ? 1 : 0));
        quad[slot] = size ? pair(others.slice(at, at + size)) : { type: "custom:mushroom-empty-card" };
        at += size;
      });
      cells = [clock, ...quad];
    } else {
      const plan = { 3: [1, 1, 1], 4: [1, 1, 2], 5: [1, 2, 2] }[n] || [2, 2, 2];
      const quad = [];
      let at = 0;
      for (const k of plan) {
        quad.push(pair(blocks.slice(at, at + k)));
        at += k;
      }
      cells = [clock, ...quad];
    }
  }
  const grid = { type: "grid", columns: 2, square: false, cards: cells, card_mod: { style: homeGridCss(dev.pad, cfg.navbar.hide ? 0 : dev.navGap) + blocksCss(!!cfg.navbar.hide, rowVh) } };
  return homePanel(cfg, base, missing, grid);
}

// Clock and blocks: the Nest Hub style quadrant layout, on both screens.
function homeControlsView(cfg, base, missing, hass, count) {
  return homeBlocksView(cfg, base, missing, hass, count);
}

function homeView(cfg, base, missing, hass) {
  if (CARD_COUNTS[cfg.pages.home.layout]) return homeControlsView(cfg, base, missing, hass, CARD_COUNTS[cfg.pages.home.layout]);
  const dev = DEVICES[cfg.device];
  const clockStack = homeClockStack(cfg, dev, hass);
  const firstGrid = [{ type: "vertical-stack", cards: clockStack }];
  if (missing.length) firstGrid.unshift(missingCard(missing));

  const view = {
    type: "sections",
    path: PAGE_META.home.path,
    title: "Home",
    max_columns: 1,
    dense_section_placement: true,
    top_margin: false,
    cards: [],
    badges: [],
    sections: [
      { type: "grid", cards: firstGrid },
      { type: "grid", cards: [buildNavbar(cfg, base)] },
    ],
  };
  const bg = backgroundFor(cfg);
  if (bg) view.background = bg;
  return view;
}

function missingCard(missing) {
  const seen = new Set();
  const lines = missing.filter((m) => !seen.has(m.name) && seen.add(m.name)).map((m) => {
    const wrong = m.wrong && typeof customElements !== "undefined" && customElements.get(m.element) ? ` (${m.wrong})` : "";
    return `- [${m.name}](${marketplaceLink(m.repo)})${wrong}`;
  });
  return {
    type: "markdown",
    content:
      "**The Stock Pot's Echo Dashboard is missing required cards.** Open each one in your Marketplace (HACS), download it, then reload:\n\n" +
      lines.join("\n"),
  };
}

function babyView(cfg, base) {
  return {
    type: "panel",
    path: PAGE_META.baby.path,
    title: "Baby-Monitor",
    cards: [
      {
        type: "vertical-stack",
        cards: [
          {
            type: "custom:advanced-camera-card",
            card_mod: { style: ":host { margin-bottom: -8px; }\n" }, // cancels the 8px stack gap, which would otherwise make the page scroll
            cameras: [{ camera_entity: cfg.pages.baby.camera, live_provider: "auto", dimensions: { layout: { fit: "cover", zoom: 1 } } }],
            profiles: ["casting"],
            view: { default: "live" },
            live: {
              preload: true,
              draggable: true,
              zoomable: true,
              lazy_load: false,
              auto_play: ["visible", "selected"],
              auto_unmute: ["selected", "visible"],
              transition_effect: "none",
              show_image_during_load: false,
              auto_pause: ["hidden"],
            },
            status_bar: { style: "none" },
            dimensions: { aspect_ratio_mode: "static", aspect_ratio: DEVICES[cfg.device].aspect }, // match the screen, so the video fills it
            menu: {
              buttons: {
                mute: { alignment: "opposing", permanent: true },
                recordings: { enabled: false },
                image: { enabled: false },
                expand: { enabled: false },
                play: { enabled: false },
                ptz_home: { enabled: false },
                ptz_controls: { enabled: false },
                screenshot: { enabled: false },
                iris: { enabled: false, permanent: false, priority: 0 },
                cameras: { priority: 0, permanent: false, enabled: false },
                substreams: { priority: 0 },
                camera_ui: { priority: 0 },
              },
              style: "hidden",
              position: "bottom",
              alignment: "left",
            },
          },
          buildNavbar(cfg, base, { autoPadding: false }),
        ],
      },
    ],
  };
}

// the widest screen that counts as an Echo (the Show 8 is 962px wide); wider windows, such as a desktop, keep the header
const KIOSK_MEDIAQUERY = "(max-width: 1000px)";
const camerasGrid = (cfg) => cfg.device === "echo_show_8" && cfg.pages.cameras.layout === "grid";

function camerasView(cfg, base) {
  const off = { enabled: false };
  const grid = camerasGrid(cfg);
  return {
    type: "panel",
    path: PAGE_META.cameras.path,
    title: "Cameras",
    cards: [
      {
        type: "vertical-stack",
        cards: [
          {
            type: "custom:advanced-camera-card",
            card_mod: { style: ":host { margin-bottom: -8px; }\n" }, // cancels the 8px stack gap, which would otherwise make the page scroll
            cameras: cfg.pages.cameras.cameras
              .filter((c) => c.entity)
              .map((c) => ({ camera_entity: c.entity, ...(c.title ? { title: c.title } : {}), dimensions: { layout: { fit: "cover" } } })),
            view: { default: "live" },
            dimensions: { aspect_ratio_mode: "static", aspect_ratio: DEVICES[cfg.device].aspect },
            menu: {
              style: "overlay",
              buttons: {
                iris: off,
                cameras: { enabled: !grid },
                substreams: off,
                live: off,
                clips: off,
                snapshots: off,
                folders: off,
                download: off,
                camera_ui: off,
                fullscreen: off,
                timeline: off,
                media_player: off,
                display_mode: off,
              },
            },
            status_bar: {
              items: { resolution: off, technology: off, engine: off, title: { priority: 19 } },
              style: "none",
            },
            live: {
              zoomable: true,
              auto_play: ["visible", "selected"],
              auto_mute: ["hidden"],
              auto_unmute: ["visible"],
              transition_effect: "slide",
              ...(grid ? { display: { mode: "grid", grid_columns: 2 } } : {}),
            },
            media_viewer: { auto_play: [] },
          },
          buildNavbar(cfg, base, { autoPadding: false }),
        ],
      },
    ],
  };
}

/* ---- Climate: a pop-up opened from the navbar ---- */

// Bubble Card pop-up (#climate) with the temperature, mode and fan controls. It is added to every page, so the
// navbar's Climate button opens it on top of whatever page you are on.
const CLIMATE_HASH = "#climate";

const CLIMATE_MODES = ["heat_cool", "heat", "cool", "fan_only", "off"];

function climatePopup(cfg, hass) {
  const small = DEVICES[cfg.device].viewH < 602; // short screen (Echo Show 5)
  return small ? climatePopupSmall(cfg, hass) : climatePopupLarge(cfg, hass);
}

// Echo Show 8: Home Assistant's own thermostat card (temperature dial, fan dropdown and mode buttons) in a Bubble Card pop-up.
function climatePopupLarge(cfg, hass) {
  const entity = cfg.pages.climate.entity;
  const attrs = hass?.states?.[entity]?.attributes || {};
  const modes = CLIMATE_MODES.filter((m) => !attrs.hvac_modes || attrs.hvac_modes.includes(m));
  const features = [];
  features.push({ type: "climate-fan-modes", style: "dropdown", ...(attrs.fan_modes ? { fan_modes: attrs.fan_modes } : {}) });
  features.push({ type: "climate-hvac-modes", style: "icons", hvac_modes: modes });
  const thermostat = { type: "thermostat", entity, features, name: { type: "device" }, card_mod: {
      style: {
        ".": "ha-card p.title, ha-card > ha-icon-button { display: none !important; } /* no title or menu: the pop-up header already names it */\nha-card { --ha-card-border-width: 0px; }\nha-card div.container { max-width: 300px !important; margin: 0 auto !important; } /* smaller dial so the pop-up fits the screen */\n",
        // the card hides the +/- buttons when the dial is small; keep them
        "ha-state-control-climate-temperature$": ".buttons { display: flex !important; }\n",
      },
    } };
  return { type: "custom:bubble-card", card_type: "pop-up", hash: CLIMATE_HASH, entity, name: attrs.friendly_name || "Climate", icon: "mdi:fan", close_by_clicking_outside: true, bg_opacity: 92, bg_blur: 16, width_desktop: "400px", margin_top_desktop: "3vh", cards: [thermostat] };
}

// Echo Show 5 (short screen): a Bubble Card climate card with the mode and fan dropdowns inside it.
function climatePopupSmall(cfg, hass) {
  const entity = cfg.pages.climate.entity;
  const attrs = hass?.states?.[entity]?.attributes || {};
  // The thermostat is a Bubble Card climate card (temperature, +/- and on/off) with the mode and fan mode as selects to the
  // right of it. Bubble draws the same card on every screen, so only the pop-up width differs.
  const select = (name, attribute) => ({ sub_button_type: "select", show_arrow: true, hide_when_parent_unavailable: true, show_background: true, show_icon: false, show_name: false, ...(attribute === "fan_modes" ? { show_state: false, show_attribute: true, attribute: "fan_mode" } : { show_state: true }), name, select_attribute: attribute });
  const group = [select("Mode", "hvac_modes"), ...(attrs.fan_modes ? [select("Fan", "fan_modes")] : [])];
  const climate = {
    type: "custom:bubble-card",
    card_type: "climate",
    entity,
    main_buttons_position: "bottom",
    main_buttons_full_width: true,
    // the mode and fan dropdowns: one under the other, each full width, inside this card
    sub_button: { bottom: group.map((b) => ({ name: b.name, buttons_layout: "inline", fill_width: true, group: [b] })) },
    grid_options: { rows: 4, columns: 12 },
    // Bubble puts the dropdown row above the temperature buttons and side by side; here the temperature buttons come first and
    // the dropdowns follow one under the other
    styles: [
      ".bubble-climate-container, .bubble-climate { height: 226px !important; }",
      ".bubble-buttons-container { height: 54px !important; }",
      ".bubble-climate-minus-button, .bubble-climate-plus-button, .bubble-temperature-display { height: 54px !important; }",
      ".bubble-buttons-container { top: 62px !important; bottom: auto !important; }",
      ".bubble-sub-button-bottom-container { top: 126px !important; bottom: auto !important; height: auto !important; }",
      ".bubble-sub-button-alignment-lane { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }",
      ".bubble-sub-button-group { width: 100% !important; }",
      "",
    ].join("\n"),
  };
  // a standalone Bubble Card pop-up (Bubble Card 3.2+): its cards live inside it, no vertical-stack needed
  return { type: "custom:bubble-card", card_type: "pop-up", hash: CLIMATE_HASH, entity, name: attrs.friendly_name || "Climate", icon: "mdi:fan", close_by_clicking_outside: true, bg_opacity: 92, bg_blur: 16, width_desktop: "600px", margin_top_desktop: "3vh", cards: [climate] };
}

// Puts the pop-up next to the navbar card, wherever that is in the view.
function attachClimatePopup(node, popup) {
  if (Array.isArray(node)) {
    const i = node.findIndex((c) => c && c.type === "custom:navbar-card");
    if (i >= 0) {
      node[i] = { type: "vertical-stack", cards: [node[i], popup], card_mod: { style: ":host { --stack-card-gap: 0px; display: block; height: 0; }\n" } };
      return true;
    }
    return node.some((n) => attachClimatePopup(n, popup));
  }
  if (node && typeof node === "object") return Object.values(node).some((v) => attachClimatePopup(v, popup));
  return false;
}

/* ---- Weather ---- */

// Based on View Assist's weather view: one full-screen weather-forecast card with a huge
// condition + temperature and a large daily forecast row, all sized in vh/vw. Like the Home page
// the card itself is invisible: the chosen background shows through with just text and icons on
// top. View Assist's own plumbing (satellite entity, status icons, hold actions) is left out so
// it works with or without View Assist.
//
// The selectors target the current Home Assistant forecast card (ha-card.regular.short with
// div.content / div.info / div.forecast / div.forecast-item) - checked against a real Echo Show 5.
// Layout rules need !important because the card's own ha-card.short rules are more specific.
// Layout (like a smart display's weather screen): condition and place top left, a huge temperature top right, and
// a forecast row along the bottom where each day shows its temperatures above its icon and name.
// The condition ("Partly cloudy") is large, so it shrinks when it gets too long for the room next to the temperature. The size is worked out
// live (card-mod template) from the length of the condition's name, which changes as the weather does. `room` is the width available in vh.
const CONDITION_LENGTHS = { "clear-night": 12, cloudy: 6, exceptional: 11, fog: 3, hail: 4, lightning: 9, "lightning-rainy": 16, partlycloudy: 13, pouring: 7, rainy: 5, snowy: 5, "snowy-rainy": 12, sunny: 5, windy: 5, "windy-variant": 13 };
const conditionFontRule = (entity, room) => {
  if (!entity) return "";
  const k = Math.round(room / 0.55); // vh x characters: a character is about 0.55 of the font size wide
  const table = "{" + Object.entries(CONDITION_LENGTHS).map(([c, n]) => `'${c}': ${n}`).join(", ") + "}";
  return `{% set n = ${table}.get(states('${entity}'), 10) %}\nha-card div.info div.state { font-size: {{ [13.5, ${k} / n] | min | round(2) }}vh !important; }`;
};
const weatherCss = (days, pal = DEFAULT_PALETTE, { entity = "", room = 0 } = {}) => [
  "ha-card {",
  "  background: transparent !important;",
  "  box-shadow: none !important;",
  "  border: none !important;",
  "  height: calc(100vh - 8px) !important;",
  "  box-sizing: border-box !important;",
  "  padding: 7vh 5vw !important; /* the navbar card already reserves its own space on the right */",
  "  display: flex !important;",
  "  flex-direction: column !important;",
  "  justify-content: space-between !important;",
  "}",
  "ha-card div.content { display: block !important; padding: 0 !important; box-sizing: border-box !important; }",
  "ha-card div.icon-image { display: none !important; }",
  "ha-card div.info { display: flex !important; justify-content: space-between !important; align-items: flex-start !important; overflow: visible !important; width: 100% !important; box-sizing: border-box !important; padding: 0 1vw !important; /* the same inset as the forecast row below */ }",
  "ha-card div.info div.state { font-size: 13.5vh !important; line-height: 1.1 !important; }",
  "ha-card div.info div.name { display: block !important; font-size: 4.5vh !important; opacity: 0.8; }",
  "ha-card div.temp-attribute { text-align: left !important; padding: 0 !important; /* the high / low line starts under the first digit */ }",
  "ha-card div.temp-attribute .temp { font-size: 22vh !important; line-height: 1 !important; padding-bottom: 0 !important; }",
  "ha-card div.temp-attribute .temp span { font-size: 6vh !important; margin-left: 0.5vh !important; vertical-align: top !important; line-height: 1.6 !important; }",
  `ha-card div.temp-attribute .attribute { font-size: 4.5vh !important; color: ${pal.text} !important; opacity: 0.75; }`,
  "ha-card div.forecast { justify-content: space-between !important; padding: 0 1vw !important; align-items: flex-end !important; }",
  "ha-card div.forecast-item { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: flex-end !important; gap: 0.5vh !important; width: auto !important; }",
  "ha-card div.forecast-item div.temp { order: 1; font-size: 7vh !important; line-height: 1.1 !important; }",
  `ha-card div.forecast-item div.templow { order: 2; font-size: 5vh !important; opacity: 0.75; line-height: 1.1 !important; color: ${pal.text} !important; }`,
  "ha-card div.forecast-item div.forecast-image-icon { order: 3; }",
  "ha-card div.forecast-item div.forecast-image-icon svg { width: 9vh !important; height: 9vh !important; }",
  "ha-card div.forecast-item div.forecast-item-label { order: 4; font-size: 4.5vh !important; line-height: 1.1 !important; }",
  `ha-card div.forecast-item:nth-child(n+${days + 1}) { display: none !important; } /* fewer days on a smaller screen */`,
  ...(room ? [conditionFontRule(entity, room)] : []),
  "",
].join("\n");

// The multiplier for the weather page's padding: with the navbar the margins are smaller (like the Home blocks), without it they stay at the full size.
const WEATHER_NAVBAR_PAD = 0.7;
const weatherPad = (cfg, dev) => (dev.pad || 1) * (cfg.navbar.hide ? 1 : WEATHER_NAVBAR_PAD);

// The width (in vh) the condition can use beside the temperature: the screen width less the page padding, the navbar gap and the temperature (about 72vh, with a margin).
function weatherRoom(cfg, dev) {
  const [w, h] = String(dev.aspect).split(":").map(Number);
  const side = 2 * 5 * weatherPad(cfg, dev) + (cfg.navbar.hide ? 0 : dev.navGap || 0); // vw
  return Math.max(40, Math.round(100 * (w / h) * (1 - side / 100) - 72));
}

function weatherView(cfg, base) {
  const dev = DEVICES[cfg.device];
  const w = cfg.pages.weather;
  const entity = w.entity || cfg.pages.home.weather;

  const card = {
    type: "weather-forecast",
    entity,
    forecast_type: w.forecast === "hourly" ? "hourly" : "daily",
    card_mod: { style: weatherCss(dev.forecastDays, cfg.palette, { entity, room: weatherRoom(cfg, dev) }) },
  };

  const view = {
    type: "panel",
    path: PAGE_META.weather.path,
    title: "Weather",
    cards: [{ type: "vertical-stack", cards: [card, buildNavbar(cfg, base)] }],
  };
  const bg = backgroundFor(cfg);
  if (bg) view.background = bg;
  return view;
}

/* ---- Calendar, Timer, Shopping list (all built-in cards) ---- */

// Shared look: an invisible full-screen card so the chosen background shows through (like Home).
// Home Assistant's own rules on ha-card are more specific, hence the !important.
const FULLSCREEN_CARD_CSS = [
  "ha-card {",
  "  background: transparent !important;",
  "  box-shadow: none !important;",
  "  border: none !important;",
  "  height: calc(100vh - 8px) !important;",
  "  box-sizing: border-box !important;",
  "  padding: 2vh 2vw !important; /* the navbar card already reserves its own space on the right */",
  "}",
].join("\n");

function fullScreenView(cfg, base, { path, title, card }) {
  const view = {
    type: "panel",
    path,
    title,
    cards: [{ type: "vertical-stack", cards: [card, buildNavbar(cfg, base)] }],
  };
  const bg = backgroundFor(cfg);
  if (bg) view.background = bg;
  return view;
}

// Calendar Card Pro: a list of the next few days with a countdown and progress bar for the current event. The
// card is drawn on an invisible, padded full-screen panel (like the other pages) using the card's own CSS variables.
function calendarView(cfg, base) {
  const c = cfg.pages.calendar;
  const entities = c.entities
    .map((e) => (typeof e === "string" ? { entity: e } : e))
    .filter((e) => e.entity)
    .map((e) => (e.label ? { entity: e.entity, label: e.label } : { entity: e.entity }));
  const card = {
    type: "custom:calendar-card-pro",
    config_version: 5,
    days_to_show: c.days || 14, // as many as fit: the CSS below clips whole days that do not fit the screen
    filter_duplicates: true,
    show_empty_today: true,
    show_countdown: "once_per_day",
    show_progress_bar: true,
    show_location: false,
    show_end_time: false,
    scroll_long_titles: true,
    event_gap: "4px",
    // sizes in vh so the list fills the screen the same way on every Echo
    background_color: "transparent",
    accent_color: cfg.palette.accent,
    today_indicator_color: cfg.palette.accent,
    progress_bar_color: cfg.palette.accent,
    now_color: cfg.palette.accent,
    event_font_size: "5vh",
    time_font_size: "3.6vh",
    weekday_font_size: "3.6vh",
    day_font_size: "8vh",
    month_font_size: "3.4vh",
    location_font_size: "3.2vh",
    description_font_size: "3.2vh",
    day_spacing: "3vh",
    event_spacing: "1.2vh",
    vertical_line_width: "3px",
    tap_action: { action: "expand" },
    event_hold_action: { action: "details" },
    entities,
    list: { compact_events_to_show: 4 },
    card_mod: {
      style: [
        "ha-card {",
        "  background: transparent !important;",
        "  box-shadow: none !important;",
        "  border: none !important;",
        "  height: calc(100vh - 8px) !important;",
        "  box-sizing: border-box !important;",
        "  overflow: hidden !important; /* nothing scrolls */",
        "  padding: 6vh 1.5vw 6vh 3vw !important; /* little side padding: the list uses the width up to the navbar */",
        "  justify-content: center !important;",
        "}",
        // The days sit in one column that is exactly as tall as the screen allows and is centred in it. Days that do not
        // fit wrap into a second column to the right, which is clipped, so only whole days that fit are shown.
        "ha-card div.content-container { display: flex !important; flex-flow: column wrap !important; align-content: flex-start !important; justify-content: center !important; height: 100% !important; overflow: hidden !important; }",
        "ha-card div.content-container table.day-table { width: 100% !important; flex: none !important; }",
        "",
      ].join("\n"),
    },
  };
  return fullScreenView(cfg, base, { path: PAGE_META.calendar.path, title: "Calendar", card });
}

// Shopping list styled like the tiles: a large pill-shaped add box and rounded rows on translucent palette panels,
// no "Active" heading. Selectors checked against the HA todo-list card (ha-input exposes its parts).
const shoppingCss = (pal = DEFAULT_PALETTE, dev = {}) => {
  const panel = panelBg(pal);
  // the left gap to the screen edge matches the right gap to the navbar (2vw scaled by the device, plus the navbar gap)
  const side = +((2 * (dev.pad || 1)) + (dev.navGap || 0)).toFixed(2);
  return [
    "",
    `ha-card { justify-content: flex-start; padding-top: 6vh !important; padding-left: ${side}vw !important; }`,
    "ha-card .header { display: none !important; /* no \"Active\" heading */ }",
    "ha-card .addRow { margin-bottom: 2vh !important; padding: 0 !important; }",
    `ha-card ha-input::part(wa-base) { background: ${panel} !important; border: none !important; border-radius: 4vh !important; min-height: 11vh !important; padding: 0 3vh !important; }`,
    "ha-card ha-input::part(wa-base)::after { display: none !important; }",
    `ha-card ha-input::part(wa-base):focus-within { outline: none !important; box-shadow: 0 0 0 0.4vh ${pal.accent} !important; }`,
    `ha-card ha-input::part(wa-input) { font-size: 4.5vh !important; color: ${pal.text} !important; }`,
    `ha-card .addButton { --mdc-icon-button-size: 8vh; --mdc-icon-size: 5vh; color: ${pal.accent} !important; }`,
    `ha-card ha-check-list-item { background: ${panel} !important; border-radius: 3vh !important; margin: 0 0 1.2vh !important; font-size: 4.5vh !important; min-height: 9vh !important; }`,
    "",
  ].join("\n");
};

function shoppingView(cfg, base) {
  const card = {
    type: "todo-list",
    entity: cfg.pages.shopping.entity,
    hide_completed: cfg.pages.shopping.hide_completed !== false,
    card_mod: {
      style:
        FULLSCREEN_CARD_CSS +
        `\nha-card { --primary-color: ${cfg.palette.accent}; --mdc-theme-primary: ${cfg.palette.accent}; }\n` +
        shoppingCss(cfg.palette, cfg.navbar.hide ? { ...DEVICES[cfg.device], navGap: 0, pad: (DEVICES[cfg.device].pad || 1) * 0.5 } : DEVICES[cfg.device]),
    },
  };
  return fullScreenView(cfg, base, { path: PAGE_META.shopping.path, title: "Shopping", card });
}

// The Timer page uses the Simple Timer Card (Marketplace), which shows timers from Google/Alexa-style voice
// assistants and optional timer helpers, with quick-start buttons. It is shown as a list (one row per
// timer: icon, name, time, progress bar) and restyled like the other pages: invisible card on the
// chosen background, with a full-width row of large quick-start tiles. Selectors checked against the real card on an
// Echo Show 5.
const TIMER_CARD_CSS_TEMPLATE = [
  "ha-card {",
  "  background: transparent !important;",
  "  box-shadow: none !important;",
  "  border: none !important;",
  "  height: calc(100vh - 8px) !important;",
  "  box-sizing: border-box !important;",
  "  display: flex !important;",
  "  align-items: center !important; /* centred while idle and while timers are running */",
  "  padding: 6vh 6vw !important;",
  "}",
  "ha-card div.grid { width: 100% !important; }",
  "ha-card div.card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }",
  "ha-card .active-head { flex-direction: column !important; align-items: stretch !important; gap: 2vh !important; height: auto !important; padding: 0 !important; }",
  "/* no \"Active Timers\" heading: the running timers speak for themselves */",
  "ha-card .active-head h4 { display: none !important; }",
  "ha-card .header-actions { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 1.5vh !important; width: 100% !important; }",
  "/* smaller buttons while a timer is running */",
  "ha-card .header-actions .btn { font-size: 4vh !important; font-weight: 600 !important; height: 9vh !important; min-height: 9vh !important; padding: 0 !important; border-radius: 3vh !important; justify-content: center !important; }",
  "ha-card ul.list { margin-top: 3vh !important; }",
  "/* the card uses a different layout (.nt-h) while no timer is running, which is most of the time */",
  "ha-card .nt-h .row { flex-direction: column !important; align-items: stretch !important; gap: 4vh !important; height: auto !important; }",
  "/* while idle, the quick-start buttons are a grid centred on the screen, with Custom double wide at the bottom */",
  "ha-card .nt-h .row > div:last-child { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 2vh !important; width: 50% !important; margin: 0 auto !important; }",
  "ha-card .nt-h .btn { font-size: 6vh !important; font-weight: 600 !important; height: 14vh !important; min-height: 14vh !important; padding: 0 !important; border-radius: 4.5vh !important; justify-content: center !important; }",
  "ha-card .nt-h .btn.btn-ghost { grid-column: span 2 !important; }",
  "/* colours taken from the background picture: tan for the timers, taupe for Custom */",
  "ha-card .nt-h .btn.btn-preset, ha-card .header-actions .btn.btn-preset { background: {{accent}} !important; color: {{ink}} !important; border: none !important; }",
  "ha-card .nt-h .btn.btn-ghost, ha-card .header-actions .btn.btn-ghost { background: {{accent2}} !important; color: {{ink}} !important; border: none !important; }",
  "/* no \"No Timers / Click to start\" header: just the quick-start tiles */",
  "ha-card .nt-h .card-content { display: none !important; }",
  "/* a running timer: large name, time and progress bar, with big pause/cancel buttons */",
  "ha-card li.item.bar .row { align-items: center !important; gap: 2.5vh !important; min-height: 16vh !important; }",
  "ha-card li.item.bar .icon-wrap { display: none !important; }",
  "ha-card li.item.bar .title { font-size: 6vh !important; font-weight: 500 !important; line-height: 1.2 !important; height: auto !important; overflow: visible !important; }",
  "ha-card li.item.bar .status { font-size: 7vh !important; font-weight: 600 !important; line-height: 1.2 !important; height: auto !important; color: var(--primary-text-color) !important; opacity: 1 !important; }",
  "ha-card li.item.bar .top { align-items: baseline !important; height: auto !important; }",
  "ha-card li.item.bar .track { height: 2.4vh !important; border-radius: 1.2vh !important; margin-top: 1.5vh !important; background: {{track}} !important; }",
  "ha-card li.item.bar .fill { height: 100% !important; border-radius: 1.2vh !important; background: {{accent}} !important; }",
  "ha-card li.item.bar .actions { gap: 1.5vh !important; }",
  "ha-card li.item.bar .action-btn { width: 11vh !important; height: 11vh !important; }",
  "ha-card li.item.bar .action-btn ha-icon { --mdc-icon-size: 7vh; width: 7vh; height: 7vh; }",
  "/* a finished timer (Time's up!) is a different row: stack the name over the message and enlarge Snooze/Dismiss */",
  "ha-card li.card.item.bar { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }",
  "ha-card li.item.bar .row { height: auto !important; min-height: 16vh !important; align-items: center !important; }",
  "ha-card li.item.bar .info { height: auto !important; display: flex !important; flex-direction: column !important; gap: 0.5vh !important; flex: 1 !important; }",
  "ha-card li.item.bar .status.up { font-size: 5vh !important; font-weight: 600 !important; opacity: 1 !important; }",
  "ha-card li.item.bar .chips { display: flex !important; gap: 1.5vh !important; }",
  "ha-card li.item.bar .chip { font-size: 4.2vh !important; min-height: 11vh !important; padding: 0 3.5vh !important; border-radius: 5.5vh !important; background: rgba(0, 0, 0, 0.3) !important; }",
  "/* custom timer picker (only while open, i.e. .card.expanded, or .card-show .active-picker while timers exist; otherwise the card keeps it hidden): time controls on the left, name field and Cancel/Start on the right so Start is always on screen */",
  "ha-card .card.expanded .picker { display: grid !important; grid-template-columns: 1fr 1fr !important; column-gap: 4vw !important; row-gap: 3vh !important; align-items: center !important; margin-top: 3vh !important; }",
  "ha-card .card.expanded .picker .duration-entry { grid-column: 1 !important; grid-row: 1 / span 2 !important; }",
  "ha-card .card.expanded .picker input.text-input { grid-column: 2 !important; grid-row: 1 !important; align-self: end !important; width: 100% !important; box-sizing: border-box !important; font-size: 4vh !important; height: 11vh !important; }",
  "ha-card .card.expanded .picker .picker-actions { grid-column: 2 !important; grid-row: 2 !important; align-self: start !important; display: flex !important; gap: 2vh !important; }",
  "ha-card .card.expanded .picker .picker-actions .btn { flex: 1 !important; height: 14vh !important; min-height: 14vh !important; font-size: 4.5vh !important; border-radius: 4vh !important; }",
  "ha-card .card.expanded .picker .buttons-grid .btn { height: 11vh !important; min-height: 11vh !important; font-size: 4vh !important; }",
  "ha-card .card.expanded .picker .display { font-size: 8vh !important; }",
  "ha-card .card-show .active-picker { display: grid !important; grid-template-columns: 1fr 1fr !important; column-gap: 4vw !important; row-gap: 3vh !important; align-items: center !important; margin-top: 2vh !important; }",
  "ha-card .card-show .active-picker .duration-entry { grid-column: 1 !important; grid-row: 1 / span 2 !important; }",
  "ha-card .card-show .active-picker input.text-input { grid-column: 2 !important; grid-row: 1 !important; align-self: end !important; width: 100% !important; box-sizing: border-box !important; font-size: 4vh !important; height: 11vh !important; }",
  "ha-card .card-show .active-picker .picker-actions { grid-column: 2 !important; grid-row: 2 !important; align-self: start !important; display: flex !important; gap: 2vh !important; margin: 0 !important; }",
  "ha-card .card-show .active-picker .picker-actions .btn { flex: 1 !important; height: 14vh !important; min-height: 14vh !important; font-size: 4.5vh !important; border-radius: 4vh !important; }",
  "ha-card .card-show .active-picker .buttons-grid .btn { height: 11vh !important; min-height: 11vh !important; font-size: 4vh !important; }",
  "ha-card .card-show .active-picker .display { font-size: 8vh !important; }",
  "/* the custom timer dialog uses the same colours: tan buttons, taupe Cancel, brown name field */",
  "ha-card .card.expanded .picker .btn, ha-card .card-show .active-picker .btn { background: {{accent}} !important; color: {{ink}} !important; border: none !important; }",
  "ha-card .card.expanded .picker .btn.btn-ghost, ha-card .card-show .active-picker .btn.btn-ghost { background: {{accent2}} !important; }",
  "ha-card .card.expanded .picker input.text-input, ha-card .card-show .active-picker input.text-input { background: {{track}} !important; color: {{text}} !important; border: none !important; }",
  "",
].join("\n");

const timerCss = (pal) => TIMER_CARD_CSS_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (m, k) => pal[k] || DEFAULT_PALETTE[k]);

function timerView(cfg, base, pal) {
  const t = cfg.pages.timer;
  const card = {
    type: "custom:simple-timer-card",
    auto_discover_google: t.auto_discover_google !== false,
    auto_voice_pe: t.auto_voice_pe !== false,
    layout: "horizontal",
    style: "bar_horizontal",
    timer_presets: t.presets && t.presets.length ? t.presets : [1, 5, 10, 15],
    card_mod: { style: timerCss(pal) },
  };
  if (t.entity) card.entities = [t.entity];
  return fullScreenView(cfg, base, { path: PAGE_META.timer.path, title: "Timer", card });
}

function setupView() {
  return {
    type: "panel",
    path: "setup",
    title: "Setup",
    subview: true,
    icon: "mdi:cog",
    cards: [{ type: "custom:bedside-clock-setup-card" }],
  };
}

/* ------------------------------------------------------------------ */
/* Strategy                                                             */
/* ------------------------------------------------------------------ */

// Some cards (e.g. Advanced Camera Card) define their element lazily, after the dashboard is generated.
async function settleMissing(cfg, timeoutMs = 4000) {
  const missing = missingDependencies(cfg);
  if (!missing.length) return missing;
  const timeout = new Promise((r) => setTimeout(r, timeoutMs));
  await Promise.all(missing.map((d) => Promise.race([customElements.whenDefined(d.element), timeout])));
  return missingDependencies(cfg);
}

// Scales the vh/vw values of the top-level `padding:` declarations in every page's card_mod CSS (not the Home
// tile layouts, which size themselves, and not nested rules such as buttons or list rows).
function scalePagePadding(node, pad, gap = 0) {
  if (Array.isArray(node)) return node.forEach((n) => scalePagePadding(n, pad, gap));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "style" && typeof v === "string") {
      node[k] = v.replace(/(^|\n)(\s*padding:)([^;\n]*)/g, (m, nl, head, vals) => {
        const imp = (vals.match(/\s*!important\s*$/) || [""])[0];
        const t = vals.replace(/\s*!important\s*$/, "").trim().split(/\s+/);
        const [top, right = top, bottom = top, left = right] = t;
        const sc = (x) => x.replace(/^(\d*\.?\d+)(vh|vw)$/, (y, n, u) => scaleN(parseFloat(n) * pad) + u);
        const r = sc(right);
        // extra room between the content and the navbar on the right
        const rg = !gap ? r : /^\d*\.?\d+vw$/.test(r) ? scaleN(parseFloat(r) + gap) + "vw" : r === "0" ? gap + "vw" : `calc(${r} + ${gap}vw)`;
        return nl + head + " " + [sc(top), rg, sc(bottom), sc(left)].join(" ") + imp;
      });
    } else scalePagePadding(v, pad, gap);
  }
}

// Removes every navbar card (and the sections that held only that) from a view.
function stripNavbar(node) {
  if (Array.isArray(node)) {
    return node.filter((c) => !(c && c.type === "custom:navbar-card")).map(stripNavbar);
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = stripNavbar(v);
    if (Array.isArray(out.sections)) out.sections = out.sections.filter((x) => !(x && x.type === "grid" && Array.isArray(x.cards) && x.cards.length === 0));
    return out;
  }
  return node;
}

export function generateDashboard(rawConfig, hass, missingOverride, palette) {
  const cfg = normaliseConfig(rawConfig);
  const result = { title: "The Stock Pot's Echo Dashboard", views: [] };

  if (!cfg.configured) {
    result.views.push({ ...setupView(), subview: false, title: "Echo Dashboard setup" });
    return result;
  }

  cfg.palette = applyPaletteOverride(palette || palettePreset(cfg), cfg.palette_override); // colours picked from the background (or chosen by the user), used by every page
  // a built-in Kiosk Satellite page without its entity picked: look it up on the Kiosk Satellite device
  if (cfg.kiosk_satellite.enabled && ksRef(cfg.kiosk_satellite)) {
    const found = kioskEntities(hass, ksRef(cfg.kiosk_satellite));
    if (ksChosen(cfg, "calendar")) cfg.pages.calendar.ks_entity = ksPick(hass, cfg.pages.calendar.ks_entity, found.calendar);
    if (ksChosen(cfg, "cameras")) cfg.pages.cameras.ks_entity = ksPick(hass, cfg.pages.cameras.ks_entity, found.buttons.find((b) => /camera/.test(b)) || found.buttons[0] || "");
  }
  // the navbar's Kiosk Satellite shortcuts, each with the action its button runs
  cfg._navShortcuts = cfg.kiosk_satellite.enabled && !cfg.navbar.hide
    ? (cfg.navbar.shortcuts || [])
        .map((sc) => {
          const tap_action = ksShortcutAction(cfg, hass, { shortcut: sc.view, shortcut_view: sc.shortcut_view });
          if (!tap_action) return null;
          return { tap_action, icon: sc.icon || KS_ICONS[sc.view] || "mdi:gesture-tap", label: sc.name || (sc.view === "cameras" && ksCameraName(hass, sc.shortcut_view)) || KS_SHORTCUTS[sc.view] || "" };
        })
        .filter(Boolean)
    : [];
  const base = dashboardBase(cfg);
  const missing = missingOverride || missingDependencies(cfg);
  const p = cfg.pages;

  if (p.home.enabled) {
    // one view per home screen: the first is "Home", the others "Home 2", "Home 3"...
    (p.home.screens || [{ layout: p.home.layout, quick_buttons: p.home.quick_buttons }]).forEach((s, i) => {
      const screenCfg = { ...cfg, pages: { ...cfg.pages, home: { ...p.home, layout: s.layout, quick_buttons: s.quick_buttons } } };
      const view = homeView(screenCfg, base, missing, hass);
      if (i > 0) { view.path = `${PAGE_META.home.path}-${i + 1}`; view.title = `Home ${i + 1}`; }
      result.views.push(view);
    });
  }
  // Camera pages are full-screen live video, so they get no background.
  if (p.baby.enabled && p.baby.camera) result.views.push(babyView(cfg, base));
  if (p.cameras.enabled && !ksChosen(cfg, "cameras") && p.cameras.cameras.some((c) => c.entity)) result.views.push(camerasView(cfg, base));
  if (p.weather.enabled && (p.weather.entity || p.home.weather)) result.views.push(weatherView(cfg, base, hass));
  if (p.calendar.enabled && !ksChosen(cfg, "calendar") && p.calendar.entities.some((e) => (typeof e === "string" ? e : e.entity))) result.views.push(calendarView(cfg, base));
  if (p.timer.enabled && !ksChosen(cfg, "timer")) result.views.push(timerView(cfg, base, cfg.palette));
  if (p.shopping.enabled && p.shopping.entity) result.views.push(shoppingView(cfg, base));
  // the views follow the chosen page order (this is also the order of swiping between them)
  const viewRank = (v) => {
    const extra = /^home-(\d+)$/.exec(v.path); // the other home screens follow Home
    return pageOrder(cfg).findIndex((k) => PAGE_META[k].path === (extra ? PAGE_META.home.path : v.path)) + (extra ? parseInt(extra[1], 10) / 100 : 0);
  };
  result.views.sort((a, b) => viewRank(a) - viewRank(b));
  result.views.push(setupView());

  const noNavbar = !!cfg.navbar.hide;
  // The climate pop-up is opened from the navbar, so without a navbar it is not added (add the thermostat as a Home control).
  if (p.climate.enabled && p.climate.entity && !noNavbar) {
    for (const v of result.views) if (v.path !== "setup") attachClimatePopup(v, climatePopup(cfg, hass));
  }
  if (noNavbar) {
    result.views = result.views.map(stripNavbar);
    // swipe left/right moves between the pages (hass-swipe-navigation reads this from the dashboard config)
    result.swipe_nav = { enable: true, animate: "swipe", animate_duration: 200, wrap: true, skip_tabs: "" };
  }

  const pad = (DEVICES[cfg.device].pad || 1) * (noNavbar ? 0.5 : 1); // without a navbar the padding around the pages is halved
  const gap = noNavbar ? 0 : DEVICES[cfg.device].navGap || 0;
  // the weather page keeps its full padding without a navbar: its big temperature would otherwise touch the screen edge
  const full = weatherPad(cfg, DEVICES[cfg.device]);
  const isWx = (v) => v.path === PAGE_META.weather.path;
  if (pad !== 1 || gap) scalePagePadding(result.views.filter((v) => !/^home(-\d+)?$/.test(v.path) && !isWx(v)), pad, gap);
  if (full !== 1 || gap) scalePagePadding(result.views.filter(isWx), full, gap);

  // the header is only hidden on narrow screens (the Echos), so a desktop browser still shows it
  if (cfg.kiosk.hide_header) {
    const users = String(cfg.kiosk.header_users || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    result.kiosk_mode = { user_settings: [{ mediaquery: KIOSK_MEDIAQUERY, hide_header: true }] };
    // the listed users still see the header (a later setting wins)
    if (users.length) result.kiosk_mode.user_settings.push({ users, hide_header: false });
  }
  return result;
}

class BedsideClockStrategy extends HTMLElement {
  static async generate(config, hass) {
    const cfg = normaliseConfig(config);
    return generateDashboard(config, hass, cfg.configured ? await settleMissing(cfg) : [], cfg.configured ? await resolvePalette(cfg) : undefined);
  }
  static async getConfigElement() {
    return document.createElement("bedside-clock-editor");
  }
}
customElements.define("ll-strategy-bedside-clock", BedsideClockStrategy);

/* ------------------------------------------------------------------ */
/* Editor (used as strategy editor and as the setup card)               */
/* ------------------------------------------------------------------ */

const LABELS = {
  display: "Show as",
  custom_background: "Image URL (e.g. /local/bg.jpg; use {device} for a copy per screen: /local/bg/name.{device}.webp)",
  background_opacity: "Image brightness % (0 = automatic; lower is darker)",
  show_labels: "Show text labels under navbar icons",
  dashboard_path: "Dashboard URL path (leave blank to auto-detect)",
  hide_header: "Hide the Home Assistant header on the Echo",
  header_users: "Users who still see the header (comma separated)",
  light_entity: "Light toggle (optional)",
  hide: "Hide the navbar and swipe left or right between pages instead",
  weather: "Weather entity (optional)",
  time_format: "Clock",
  date_format: "Date",
  camera: "Nursery camera",
  entity: "Entity",
  title: "Title (optional)",
  name: "Name (shown on the button; leave blank to use the entity's own name)",
  icon: "Icon (optional)",
};

// Small pictures of the Home page with and without the navbar, shown on the Navigation step (embedded: the Marketplace installs a single file).
const NAVBAR_SHOTS = {"echo_show_8": {"on": "data:image/jpeg;base64,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", "off": "data:image/jpeg;base64,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"}, "echo_show_5": {"on": "data:image/jpeg;base64,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", "off": "data:image/jpeg;base64,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"}};

const PAGE_ORDER = ["home", "baby", "cameras", "climate", "weather", "calendar", "timer", "shopping"];
const PAGE_INFO = {
  home: { title: "Home", icon: "mdi:home", desc: "Clock and date, optionally with cards for your lights, sensors and more." },
  baby: { title: "Baby monitor", icon: "mdi:baby-carriage", desc: "Full-screen live view of one camera." },
  cameras: { title: "Cameras", icon: "mdi:cctv", desc: "Swipe between several cameras." },
  climate: { title: "Climate", icon: "mdi:fan", desc: "Pop-up with temperature, mode and fan controls, opened from the fan icon in the navbar." },
  weather: { title: "Weather", icon: "mdi:weather-partly-cloudy", desc: "Full-screen forecast." },
  calendar: { title: "Calendar", icon: "mdi:calendar", desc: "The next few days of events, with a countdown to the current one." },
  timer: { title: "Timer", icon: "mdi:timer-outline", desc: "Kitchen timers, including quick start timers" },
  shopping: { title: "Shopping list", icon: "mdi:cart-outline", desc: "Your to-do / shopping list." },
};

const STEP_INFO = {
  deps: ["Before you start", "These cards need to be installed (via the Marketplace) for the pages you plan to use."],
  device: ["Which device are you using?", "This helps scale everything correctly."],
  satellite: ["Are you using Kiosk Satellite?", "Kiosk Satellite is an Android app for kiosks. If you use it, the Calendar, Cameras and Timer pages can use its built-in views instead of Home Assistant dashboard pages."],
  background: ["Choose your background", "Pick a built-in gradient or use your own image."],
  pages: ["Which pages do you want?", "Turn on the pages you need. You can change this later."],
  home: ["Home page", "Choose the layout of the clock screen."],
  baby: ["Baby monitor page", "Choose the camera to show."],
  cameras: ["Cameras page", "Add the cameras you want to swipe between."],
  climate: ["Climate pop-up", "Pick the climate entity. The fan icon in the navbar opens a pop-up with temperature, mode and fan controls."],
  weather: ["Weather page", "Pick the weather entity to show."],
  calendar: ["Calendar page", "Choose the calendars to show."],
  timer: ["Timer page", "Voice timers and quick-start buttons."],
  shopping: ["Shopping list page", "Choose the list to show."],
  navbar: ["Navigation", "Choose how people move between pages."],
  kiosk: ["Visual settings", "Hide the Home Assistant header."],
  review: ["All set", "Review your choices and finish."],
};

const EDITOR_CSS = `
  .bc { box-sizing: border-box; width: 100%; max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; color: var(--primary-text-color); }
  .bc * { box-sizing: border-box; }
  .bc h2 { margin: 0 0 4px; font-size: 22px; font-weight: 500; }
  .bc .sub { margin: 0 0 20px; color: var(--secondary-text-color); }
  .bc h3 { margin: 0 0 12px; font-size: 17px; font-weight: 500; }
  .bc .cardbox { margin-top: 16px; padding: 16px; border: 1px solid var(--divider-color); border-radius: 12px; }
  .bc .cardbox ha-form { display: block; }
  .bc button.fix { display: block; margin: 0 0 8px; border-color: var(--error-color, #db4437); color: var(--error-color, #db4437); text-align: left; }
  .bc .kstoggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; cursor: pointer; }
  .bc .kswitch { position: relative; flex: none; width: 52px; height: 32px; padding: 0; border: 2px solid var(--secondary-text-color); border-radius: 16px; background: transparent; cursor: pointer; }
  .bc .kswitch::after { content: ""; position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--secondary-text-color); transition: transform 0.15s; }
  .bc .kswitch.on { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 30%, transparent); }
  .bc .kswitch.on::after { transform: translateX(20px); background: var(--primary-color); }
  .bc .progress { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
  .bc .dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; border: 1px solid var(--divider-color); color: var(--secondary-text-color); background: transparent; padding: 0; cursor: default; }
  .bc .dot.done { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; cursor: pointer; }
  .bc .dot.current { border: 2px solid var(--primary-color); color: var(--primary-text-color); }
  .bc .dot.visited { cursor: pointer; }
  .bc .body { background: var(--card-background-color); border-radius: 12px; padding: 16px; border: 1px solid var(--divider-color); }
  .bc .footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 16px; align-items: center; }
  .bc button.btn { padding: 10px 20px; border-radius: 20px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); cursor: pointer; font-size: 14px; }
  .bc button.btn.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
  .bc button.btn.small { padding: 6px 14px; }
  .bc button.btn:disabled { opacity: 0.35; cursor: default; }
  .bc .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .bc .tiles.cols4 { grid-template-columns: repeat(4, 1fr); }
  .bc .tiles.cols2 { grid-template-columns: repeat(2, 1fr); }
  .bc .orow { display: flex; align-items: center; gap: 12px; margin: 6px 0; }
  .bc .orow .n { flex: 1; font-weight: 500; }
  .bc .tile img.shot { display: block; width: 100%; height: auto; margin-bottom: 8px; border-radius: 8px; border: 1px solid var(--divider-color); }
  @media (max-width: 520px) { .bc .tiles.cols4 { grid-template-columns: repeat(2, 1fr); } .bc .tiles.cols2 { grid-template-columns: 1fr; } }
  .bc .tile { border: 2px solid var(--divider-color); border-radius: 12px; padding: 12px; cursor: pointer; background: transparent; color: inherit; text-align: left; font: inherit; display: block; width: 100%; }
  .bc .tile.sel { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
  .bc .tile .t { font-weight: 500; margin: 4px 0 2px; }
  .bc .tile .d { font-size: 12px; color: var(--secondary-text-color); }
  .bc .swatch { height: 64px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--divider-color); display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color); }
  .bc .palette { margin-top: 16px; }
  .bc .pal { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px; }
  .bc .palrow { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .bc .palrow input[type=color] { width: 44px; height: 44px; padding: 0; border: 1px solid var(--divider-color); border-radius: 8px; background: transparent; cursor: pointer; flex: none; }
  .bc .palrow .n { display: block; font-weight: 500; } .bc .palrow .d { display: block; font-size: 12px; color: var(--secondary-text-color); }
  .bc .dep { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider-color); gap: 12px; }
  .bc .dep:last-child { border-bottom: none; }
  .bc .dep .n { font-weight: 500; } .bc .dep .d { font-size: 12px; color: var(--secondary-text-color); }
  .bc .dep .status { display: flex; align-items: center; gap: 8px; flex: none; }
  .bc .chip.get { display: inline-flex; align-items: center; gap: 4px; text-decoration: none; background: color-mix(in srgb, var(--info-color, #039be5) 20%, transparent); color: var(--info-color, #039be5); }
  .bc .chip.get:hover { background: color-mix(in srgb, var(--info-color, #039be5) 32%, transparent); }
  .bc .chip.get svg { width: 14px; height: 14px; }
  .bc .chip { font-size: 12px; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
  .bc .chip.ok { background: color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); color: var(--success-color, #43a047); }
  .bc .chip.bad { background: color-mix(in srgb, var(--error-color, #db4437) 20%, transparent); color: var(--error-color, #db4437); }
  .bc .chip.na { background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .bc .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .bc .row ha-form { flex: 1; }
  .bc .err { color: var(--error-color, #db4437); margin: 12px 0 0; }
  .bc .note { color: var(--secondary-text-color); font-size: 13px; margin: 8px 0; }
  .bc .sum { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--divider-color); gap: 12px; }
  .bc .sum span:first-child { color: var(--secondary-text-color); }
  .bc details { margin-top: 16px; } .bc summary { cursor: pointer; color: var(--secondary-text-color); }
`;

const PALETTE_INFO = {
  accent: ["Main colour", "Selected navbar icon, sliders and buttons"],
  accent2: ["Second colour", "The weather block and secondary buttons"],
  track: ["Block colour", "Behind the control blocks (darkened for readability)"],
  ink: ["Button text", "Text and icons drawn on the main colour"],
  text: ["Text", "Text and icons on the blocks"],
};

// A config as text for comparing two of them: the same whatever order the keys are in.
const configSignature = (cfg) => {
  const sort = (v) => (Array.isArray(v) ? v.map(sort) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v);
  return JSON.stringify(sort(JSON.parse(JSON.stringify(cfg))));
};

class BedsideClockEditor extends HTMLElement {
  constructor() {
    super();
    this._config = normaliseConfig({});
    this._standalone = false;
    this._status = "";
    this._step = 0;
    this._maxStep = 0;
    this._error = "";
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
    if (first) this._render();
  }

  setConfig(config) {
    // Called with the card config when used as a card, or the strategy config when used as the editor.
    if (config && config.type === "custom:bedside-clock-setup-card") {
      this._standalone = true;
      this._config = normaliseConfig(this._saved || {});
    } else {
      const next = normaliseConfig(config);
      // The dashboard editor hands back the config we just sent it. Drawing the page again for that would drop the cursor from the
      // box being typed in, so an echo of exactly what we last sent is ignored.
      if (this._rendered && this._lastSent && configSignature(next) === this._lastSent) return;
      this._config = next;
    }
    this._render();
  }

  getCardSize() {
    return 12;
  }

  async connectedCallback() {
    await this._loadHelpers();
    if (this._standalone && !this._saved && this._hass) await this._fetchSaved();
    this._render();
  }

  async _loadHelpers() {
    try {
      const helpers = await window.loadCardHelpers?.();
      if (helpers && !customElements.get("ha-entity-picker")) {
        const c = await helpers.createCardElement({ type: "entities", entities: [] });
        await c.constructor.getConfigElement();
      }
      await customElements.whenDefined("ha-form");
    } catch (e) {
      /* ha-form may already be present */
    }
  }

  async _fetchSaved() {
    try {
      const cfg = await this._hass.callWS({ type: "lovelace/config", url_path: this._urlPath(), force: false });
      this._saved = cfg?.strategy ? { ...cfg.strategy } : {};
      delete this._saved.type;
      this._config = normaliseConfig(this._saved);
    } catch (e) {
      this._saved = {};
    }
  }

  _urlPath() {
    const seg = location.pathname.split("/")[1];
    return !seg || seg === "lovelace" ? null : seg;
  }

  _emit() {
    // a copy of its own, so later edits here never change a config Home Assistant already has
    const config = JSON.parse(JSON.stringify({ type: STRATEGY_TYPE, ...this._config, configured: true }));
    this._lastSent = configSignature(normaliseConfig(config)); // so an echo of it from the editor can be recognised
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _change(mutator, rerender = false) {
    mutator(this._config);
    const h = this._config.pages.home;
    if (h.screens && h.screens.length) { h.layout = h.screens[0].layout; h.quick_buttons = h.screens[0].quick_buttons; } // layout and quick_buttons mirror the first home screen
    this._emit();
    if (rerender) this._render();
  }

  /* ---- wizard plumbing ---- */

  _steps() {
    const p = this._config.pages;
    return [
      "deps",
      "device",
      "satellite",
      "navbar",
      "background",
      "pages",
      ...pageOrder(this._config).filter((k) => p[k].enabled),
      "kiosk",
      "review",
    ];
  }

  _validate(id) {
    const c = this._config;
    if (id === "background" && c.background === "custom" && !c.custom_background) return "Enter an image URL, or choose a gradient.";
    if (id === "pages" && !PAGE_ORDER.some((k) => c.pages[k].enabled)) return "Turn on at least one page.";
    if (id === "satellite" && c.kiosk_satellite.enabled && !ksRef(c.kiosk_satellite)) return "Choose your Kiosk Satellite device.";
    if (id === "cameras" && ksChosen(c, "cameras")) return c.pages.cameras.ks_entity ? "" : "Choose the Kiosk Satellite button that shows your camera view.";
    if (id === "calendar" && ksChosen(c, "calendar")) return c.pages.calendar.ks_entity ? "" : "Choose the Kiosk Satellite Calendar view entity.";
    if (id === "baby" && !c.pages.baby.camera) return "Choose a camera.";
    if (id === "cameras" && !c.pages.cameras.cameras.some((x) => x.entity)) return "Add at least one camera.";
    if (id === "climate" && !c.pages.climate.entity) return "Choose your climate entity.";
    if (id === "weather" && !(c.pages.weather.entity || c.pages.home.weather)) return "Choose a weather entity.";
    if (id === "calendar" && !c.pages.calendar.entities.some((x) => (typeof x === "string" ? x : x.entity))) return "Add at least one calendar.";
    if (id === "shopping" && !c.pages.shopping.entity) return "Choose a list.";
    return "";
  }

  // The first time through the steps go in order; once the dashboard has been set up, any step can be opened to change a setting.
  _canJump(i) {
    return i <= this._maxStep || !!this._config.configured;
  }

  _go(delta) {
    if (delta > 0) {
      const err = this._validate(this._steps()[this._step]);
      if (err) {
        this._error = err;
        this._render();
        return;
      }
    }
    this._error = "";
    this._step = Math.max(0, Math.min(this._steps().length - 1, this._step + delta));
    this._maxStep = Math.max(this._maxStep, this._step);
    this._render();
  }

  _el(tag, cls, text, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  _button(parent, text, onClick, cls = "btn") {
    const b = this._el("button", cls, text, parent);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  _form(parent, schema, data, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.schema = schema;
    f.data = data;
    f.computeLabel = (s) => s.label || LABELS[s.name] || s.name;
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      onChange(ev.detail.value);
    });
    parent.appendChild(f);
    return f;
  }

  _tile(parent, selected, onClick, build) {
    const t = this._el("button", "tile" + (selected ? " sel" : ""), undefined, parent);
    t.type = "button";
    build(t);
    t.addEventListener("click", onClick);
    return t;
  }

  _list(parent, items, schema, addText, emptyItem) {
    items.forEach((item, i) => {
      const row = this._el("div", "row", undefined, parent);
      this._form(row, schema, item, (v) => this._change(() => (items[i] = v)));
      this._button(row, "Remove", () => this._change(() => items.splice(i, 1), true), "btn small");
    });
    this._button(parent, addText, () => this._change(() => items.push({ ...emptyItem }), true), "btn small");
  }

  _render() {
    if (!this._hass && !this.isConnected) return;
    const steps = this._steps();
    if (this._step >= steps.length) this._step = steps.length - 1;
    const id = steps[this._step];

    this.innerHTML = "";
    this._rendered = true;
    const root = this._el("div", "bc", undefined, this);
    this._el("style", "", EDITOR_CSS, root);

    // progress
    const prog = this._el("div", "progress", undefined, root);
    steps.forEach((s, i) => {
      const cls = "dot" + (i === this._step ? " current" : i < this._step ? " done" : "") + (this._canJump(i) ? " visited" : "");
      const d = this._el("button", cls, i < this._step ? "✓" : String(i + 1), prog);
      d.type = "button";
      d.title = STEP_INFO[s][0];
      d.addEventListener("click", () => {
        if (this._canJump(i)) {
          this._error = "";
          this._step = i;
          this._render();
        }
      });
    });

    this._el("h2", "", STEP_INFO[id][0], root);
    this._el("p", "sub", STEP_INFO[id][1], root);

    const body = this._el("div", "body", undefined, root);
    this["_step_" + id](body);
    if (this._error) this._el("p", "err", this._error, body);

    // footer
    const foot = this._el("div", "footer", undefined, root);
    if (this._step > 0) this._button(foot, "Back", () => this._go(-1));
    else this._el("span", "", "", foot);
    if (id !== "review") {
      this._button(foot, "Next", () => this._go(1), "btn primary");
    } else if (this._standalone) {
      const right = this._el("div", "", undefined, foot);
      if (this._status) this._el("span", "note", this._status + " ", right);
      this._button(right, "Save and reload", () => this._save(), "btn primary");
    }
  }

  /* ---- steps ---- */

  _step_deps(body) {
    const groups = new Map();
    for (const d of DEPENDENCIES) {
      const g = groups.get(d.name) || { name: d.name, repo: d.repo, deps: [], pages: new Set() };
      g.deps.push(d);
      d.pages.forEach((p) => g.pages.add(p));
      groups.set(d.name, g);
    }
    let missing = 0;
    for (const g of groups.values()) {
      const ok = g.deps.every((d) => installed(d, customElements));
      const wrong = g.deps.find((d) => d.wrong && customElements.get(d.element) && !installed(d, customElements));
      if (!ok) missing++;
      const row = this._el("div", "dep", undefined, body);
      const left = this._el("div", "", undefined, row);
      this._el("div", "n", g.name, left);
      this._el("div", "d", "Used by: " + [...g.pages].map((p) => (PAGE_INFO[p] ? PAGE_INFO[p].title : "Home tiles")).join(", "), left);
      if (wrong) this._el("div", "d", wrong.wrong.charAt(0).toUpperCase() + wrong.wrong.slice(1) + ".", left);
      const right = this._el("div", "status", undefined, row);
      if (!ok && g.repo) {
        const a = this._el("a", "chip get", "Marketplace", right);
        a.href = marketplaceLink(g.repo);
        a.target = "_blank";
        a.rel = "noreferrer";
        a.title = "Open " + g.name + " in the Marketplace";
        // mdi:open-in-new, inline so it shows without waiting for ha-icon
        a.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg>');
      }
      this._el("span", "chip " + (ok ? "ok" : "bad"), ok ? "Installed" : wrong ? "Wrong card" : "Not installed", right);
    }

    const kiosk = this._el("div", "dep", undefined, body);
    const kl = this._el("div", "", undefined, kiosk);
    this._el("div", "n", "kiosk-mode (optional)", kl);
    this._el("div", "d", "Only needed to hide the header. Can't be detected automatically.", kl);
    this._el("span", "chip na", "Unknown", kiosk);

    this._el(
      "p",
      "note",
      missing
        ? `${missing} missing. Open each one in the Marketplace and download it, then reload this page. You can continue and install later.`
        : "Everything you need is installed.",
      body
    );
    this._button(body, "Re-check", () => this._render(), "btn small");
  }

  _step_device(body) {
    const grid = this._el("div", "tiles", undefined, body);
    for (const [key, d] of Object.entries(DEVICES)) {
      this._tile(grid, this._config.device === key, () => this._change((c) => (c.device = key), true), (t) => {
        this._el("div", "t", d.label.replace(/ \(.*/, ""), t);
        this._el("div", "d", (d.label.match(/\((.*)\)/) || [])[1] || "", t);
      });
    }
  }

  _step_background(body) {
    const c = this._config;
    const grid = this._el("div", "tiles cols4", undefined, body);
    for (const [key, b] of Object.entries(BACKGROUNDS)) {
      this._tile(grid, c.background === key, () => this._change((cfg) => { if (cfg.background !== key) cfg.palette_override = {}; cfg.background = key; }, true), (t) => {
        const sw = this._el("div", "swatch", key === "none" ? "None" : key === "custom" ? "Image" : "", t);
        if (b.css) sw.style.background = b.css;
        this._el("div", "t", b.label, t);
      });
    }
    if (c.background === "custom") {
      const wrap = this._el("div", "", undefined, body);
      wrap.style.marginTop = "16px";
      this._form(wrap, [{ name: "custom_background", selector: { text: {} } }, { name: "background_opacity", selector: { number: { min: 0, max: 100, step: 5, mode: "slider" } } }], c, (v) =>
        this._change((cfg) => {
          if (cfg.custom_background !== v.custom_background) { cfg.palette_override = {}; clearTimeout(this._palTimer); this._palTimer = setTimeout(() => this._refreshPalette(), 700); }
          cfg.custom_background = v.custom_background; cfg.background_opacity = Number(v.background_opacity) || 0;
        })
      );
      this._el("p", "note", "Upload an image to your Home Assistant config/www folder, then use /local/yourfile.jpg.", wrap);
    }
    this._paletteSection(body);
    this._form(
      this._el("div", "", undefined, body),
      [{ name: "show_labels", selector: { boolean: {} } }],
      c,
      (v) => this._change((cfg) => (cfg.show_labels = v.show_labels))
    ).style.marginTop = "16px";
  }

  // The colours picked from the background (read from the image, or taken from the gradient), each with a colour picker to change it.
  _paletteSection(body) {
    const c = this._config;
    this._palBox = null;
    if (c.background === "none" || (c.background === "custom" && !c.custom_background)) return;
    const wrap = this._el("div", "palette", undefined, body);
    this._el("div", "t", "Colours", wrap);
    this._el("p", "note", "Picked automatically from your background and used for the buttons, blocks and text. Change any of them if you prefer.", wrap);
    this._palBox = this._el("div", "pal", "Reading colours...", wrap);
    this._refreshPalette();
  }

  async _refreshPalette() {
    const box = this._palBox;
    if (!box || !box.isConnected) return;
    const c = this._config;
    const auto = await resolvePalette(c);
    if (!box.isConnected || box !== this._palBox) return;
    box.textContent = "";
    for (const k of PALETTE_KEYS) {
      const [title, hint] = PALETTE_INFO[k];
      const row = this._el("label", "palrow", undefined, box);
      const input = document.createElement("input");
      input.type = "color";
      input.value = applyPaletteOverride(auto, c.palette_override)[k].toLowerCase();
      input.addEventListener("input", () => this._change((cfg) => { cfg.palette_override = { ...cfg.palette_override, [k]: input.value.toUpperCase() }; }));
      row.appendChild(input);
      const txt = this._el("span", "", undefined, row);
      this._el("span", "n", title, txt);
      this._el("span", "d", hint, txt);
    }
    if (Object.keys(c.palette_override || {}).length) this._button(box, "Reset to automatic colours", () => this._change((cfg) => (cfg.palette_override = {}), true), "btn small");
  }

  _step_pages(body) {
    const grid = this._el("div", "tiles", undefined, body);
    for (const k of PAGE_ORDER) {
      const info = PAGE_INFO[k];
      const on = this._config.pages[k].enabled;
      this._tile(grid, on, () => this._change((c) => (c.pages[k].enabled = !on), true), (t) => {
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", info.icon);
        t.appendChild(ic);
        this._el("div", "t", info.title + (on ? "  ✓" : ""), t);
        this._el("div", "d", info.desc, t);
      });
    }
    // the order of the chosen pages: in the navbar, in the wizard and when swiping
    const chosen = pageOrder(this._config).filter((k) => this._config.pages[k].enabled);
    if (chosen.length < 2) return;
    const head = this._el("h3", "", "Order", body);
    head.style.marginTop = "24px";
    this._el("p", "note", "The order of the pages in the navbar and when swiping between them. The first page is the one the dashboard opens on.", body);
    chosen.forEach((k, i) => {
      const row = this._el("div", "orow", undefined, body);
      const ic = document.createElement("ha-icon");
      ic.setAttribute("icon", PAGE_INFO[k].icon);
      row.appendChild(ic);
      this._el("div", "n", `${i + 1}. ${PAGE_INFO[k].title}`, row);
      const move = (dir) => this._change((c) => {
        const full = pageOrder(c);
        const other = chosen[i + dir];
        const a = full.indexOf(k), b = full.indexOf(other);
        [full[a], full[b]] = [full[b], full[a]];
        c.page_order = full;
      }, true);
      const up = this._button(row, "↑", () => move(-1), "btn small");
      const down = this._button(row, "↓", () => move(1), "btn small");
      up.setAttribute("aria-label", "Move " + PAGE_INFO[k].title + " up");
      down.setAttribute("aria-label", "Move " + PAGE_INFO[k].title + " down");
      if (i === 0) up.disabled = true;
      if (i === chosen.length - 1) down.disabled = true;
    });
  }

  _step_home(body) {
    const h = this._config.pages.home;
    // layout and quick_buttons mirror the first home screen; if something set them directly (an older config), the first screen follows
    if (h.screens[0].layout !== h.layout || h.screens[0].quick_buttons !== h.quick_buttons) {
      h.screens[0].layout = HOME_LAYOUTS.includes(h.layout) ? h.layout : "clock";
      h.screens[0].quick_buttons = h.quick_buttons;
    }
    const LAYOUT_TILES = [
      ["clock", "Clock", "Time and weather, nothing else."],
      ["controls", "Clock + 2 Cards", "Time and weather, plus two cards that control devices or show data."],
      ["controls3", "Clock + 3 Cards", "Time and weather, plus three cards that control devices or show data."],
      // both screens have room for the weather block and four controls
      ["controls4", "Clock + 4 Cards", "Time and weather, plus four cards that control devices or show data."],
    ].filter(([key]) => !(CARD_COUNTS[key] > DEVICES[this._config.device].maxBlocks - 1));
    const screens = h.screens;
    const grid = this._el("div", "tiles", undefined, body);
    LAYOUT_TILES.forEach(([key, title, desc]) => {
      const at = screens.findIndex((x) => x.layout === key);
      this._tile(
        grid,
        at >= 0,
        () => this._change((c) => {
          const list = c.pages.home.screens;
          const k = list.findIndex((x) => x.layout === key);
          if (k >= 0) { if (list.length > 1) list.splice(k, 1); } // at least one home screen stays
          else list.push({ layout: key, quick_buttons: [] });
        }, true),
        (t) => {
          this._el("div", "t", title + (at >= 0 && screens.length > 1 ? `  ✓ ${at + 1}` : ""), t);
          this._el("div", "d", desc, t);
        }
      );
    });
    this._el("p", "note", "Choose one or more home screens. Each one is a page of its own: the first is Home, the others are Home 2, Home 3 and so on, in the order you chose them.", body);
    const w = this._el("div", "", undefined, body);
    w.style.marginTop = "16px";
    const clockBox = this._el("div", "", undefined, w);
    clockBox.style.marginBottom = "16px";
    this._form(clockBox, [{ name: "time_format", selector: { select: { mode: "dropdown", options: TIME_FORMATS.map(([value, label]) => ({ value, label })) } } }], this._config, (v) =>
      this._change((c) => (c.time_format = v.time_format || "auto"))
    );
    this._form(clockBox, [{ name: "date_format", selector: { select: { mode: "dropdown", options: DATE_FORMATS.map(([value, label]) => ({ value, label })) } } }], this._config, (v) =>
      this._change((c) => (c.date_format = v.date_format || "auto"))
    );
    this._form(w, [{ name: "weather", selector: { entity: { domain: "weather" } } }], h, (v) =>
      this._change((c) => (c.pages.home.weather = v.weather || ""))
    );
    this._el("p", "note", screens.some((x) => x.layout in CARD_COUNTS) ? "With cards a weather card is always shown; leave this blank to use the first weather entity Home Assistant has." : "Weather is optional. Leave blank for a clock only.", body);
    screens.forEach((screen, n) => {
      // every home screen has its own section: the icon of its navbar button, and its cards
      const head = this._el("h3", "", screens.length > 1 ? `${n ? "Home " + (n + 1) : "Home"}: ${LAYOUT_TILES.find((x) => x[0] === screen.layout)?.[1] || screen.layout}` : "Navbar icon", body);
      head.style.marginTop = "24px";
      this._form(body, [{ name: "icon", label: n ? "Navbar icon (default mdi:home-outline)" : "Navbar icon (default mdi:home)", selector: { icon: {} } }], screen, (v) => this._change((c) => { c.pages.home.screens[n].icon = v.icon || ""; }));
      if (!(screen.layout in CARD_COUNTS)) return;
    const list = screen.quick_buttons;
    // exactly the number of cards the layout name says (the weather card is added on top), fewer if the screen cannot fit them
    const slots = Math.min(CARD_COUNTS[screen.layout], DEVICES[this._config.device].maxBlocks - 1);
    while (list.length < slots) list.push({ entity: "", name: "", icon: "" });
    list.slice(0, slots).forEach((item, i) => {
      const row = this._el("div", "cardbox", undefined, body);
      this._el("h3", "", `Card ${i + 1}`, row);
      const ks = this._config.kiosk_satellite;
      const sc = item.shortcut || "none";
      const on = ks.enabled && sc !== "none"; // this card is a button for a Kiosk Satellite view
      const dev5 = this._config.device;
      const lay = screen.layout;
      const how = on || !canChooseDisplay(item, dev5, lay) ? "" : displayOf(item, dev5, lay); // no graph to choose for a view button, a number on the Show 5, or with four cards
      const camViews = [...new Set([...kioskEntities(this._hass, ksRef(ks)).buttons, item.shortcut_view].filter(Boolean))];
      const camName = (id) => { const m = /\bShow (.+)$/i.exec(this._hass?.states?.[id]?.attributes?.friendly_name || ""); return m ? m[1] : id; };
      // changes to this card; wantOn is whether it opens a Kiosk Satellite view (the switch above the fields)
      const apply = (v, wantOn) => {
        const prev = list[i] || item;
        const kindChanged = (v.entity || "").split(".")[0] !== (prev.entity || "").split(".")[0];
        if (kindChanged) delete v.display;
        if (!wantOn) {
          delete v.shortcut;
          delete v.shortcut_view;
        } else {
          if (!v.shortcut || v.shortcut === "none") v.shortcut = "calendar";
          if (v.shortcut === "cameras" && !v.shortcut_view) v.shortcut_view = kioskEntities(this._hass, ksRef(ks)).buttons[0] || "";
          if (v.shortcut !== "cameras") delete v.shortcut_view;
        }
        this._change(() => (list[i] = v), (kindChanged && (canChooseDisplay(v, dev5, lay) || !!how)) || wantOn !== on || (wantOn && (v.shortcut === "cameras") !== (sc === "cameras")));
      };
      if (ks.enabled) {
        // a switch of our own (a button), so it does not depend on how Home Assistant's switch fires its events
        const t = this._el("div", "kstoggle", undefined, row);
        this._el("span", "", "Open a Kiosk Satellite view", t);
        const sw = this._el("button", "kswitch" + (on ? " on" : ""), undefined, t);
        sw.type = "button";
        sw.setAttribute("role", "switch");
        sw.setAttribute("aria-checked", String(on));
        sw.setAttribute("aria-label", "Open a Kiosk Satellite view");
        t.addEventListener("click", () => apply({ ...(list[i] || item) }, !on));
      }
      this._form(
        row,
        [
          ...(on ? [{ name: "shortcut", label: "View", selector: { select: { mode: "dropdown", options: Object.entries(KS_SHORTCUTS).map(([value, label]) => ({ value, label })) } } }] : []),
          ...(on && sc === "cameras" ? [{ name: "shortcut_view", label: "Camera view to open", selector: camViews.length ? { select: { mode: "dropdown", options: camViews.map((id) => ({ value: id, label: camName(id) })) } } : { entity: { domain: "button" } } }] : []),
          // off: the Home Assistant entity (the card type follows the entity)
          ...(!on ? [{ name: "entity", selector: { entity: {} } }] : []),
          { name: "name", ...(on ? { label: "Name (leave blank to use the name of the view)" } : {}), selector: { text: {} } },
          { name: "icon", selector: { icon: {} } },
          ...(how ? [{ name: "display", selector: { select: { mode: "dropdown", options: [{ value: "graph", label: "Graph" }, { value: "value", label: "Current value" }] } } }] : []),
        ],
        { ...item, ...(how ? { display: how } : {}), ...(ks.enabled ? { shortcut: on ? sc : undefined } : {}) },
        (v) => apply(v, on)
      );
    });
    });
  }

  _step_baby(body) {
    this._form(body, [{ name: "camera", selector: { entity: { domain: "camera" } } }], this._config.pages.baby, (v) =>
      this._change((c) => (c.pages.baby.camera = v.camera || ""))
    );
  }

  _step_satellite(body) {
    const k = this._config.kiosk_satellite;
    const grid = this._el("div", "tiles", undefined, body);
    [[false, "No", "Use Home Assistant dashboard pages."], [true, "Yes, I use Kiosk Satellite", "Choose its built-in views for Calendar, Cameras and Timer."]].forEach(([on, title, desc]) =>
      this._tile(grid, !!k.enabled === on, () => this._change((c) => (c.kiosk_satellite.enabled = on), true), (t) => {
        this._el("div", "t", title, t);
        this._el("div", "d", desc, t);
      })
    );
    if (!k.enabled) return;
    const w = this._el("div", "", undefined, body);
    w.style.marginTop = "16px";
    this._form(w, [{ name: "device", label: "Kiosk Satellite device", selector: { device: { integration: "esphome" } } }], k, (v) =>
      this._change((c) => {
        const changed = (v.device || "") !== (c.kiosk_satellite.device || "");
        c.kiosk_satellite.device = v.device || "";
        c.kiosk_satellite.entity = "";
        if (!changed) return;
        // another device has other entities: forget the ones found on the old device and look them up again on the new one
        const f = kioskEntities(this._hass, ksRef(c.kiosk_satellite));
        c.pages.calendar.ks_entity = ksChosen(c, "calendar") ? f.calendar : "";
        c.pages.cameras.ks_entity = ksChosen(c, "cameras") ? f.buttons.find((b) => /camera/.test(b)) || f.buttons[0] || "" : "";
        for (const b of (c.pages.home.screens || []).flatMap((x) => x.quick_buttons || [])) if (b.shortcut === "cameras") b.shortcut_view = f.buttons.find((x) => /camera/.test(x)) || f.buttons[0] || "";
        for (const sc of c.navbar.shortcuts || []) if (sc.view === "cameras") sc.shortcut_view = f.buttons.find((x) => /camera/.test(x)) || f.buttons[0] || "";
      }, true)
    );
    this._el("p", "note", "Choose your Kiosk Satellite device. Its Calendar view and camera view entities are found from it. They only exist when Expose kiosk entities is on in the Kiosk Satellite app.", body);
    if (ksRef(k)) {
      const f = kioskEntities(this._hass, ksRef(k));
      this._el("p", "note", f.calendar || f.camera || f.buttons.length
        ? "Found: " + [f.calendar && "Calendar view (" + f.calendar + ")", f.camera && "Camera view (" + f.camera + ")", f.buttons.length && f.buttons.length + " camera view button" + (f.buttons.length > 1 ? "s" : "")].filter(Boolean).join(", ") + "."
        : "No Calendar view or Camera view entity was found on that device. Check that Expose kiosk entities is on in the Kiosk Satellite app and that you chose the right device.", body);
    }
  }

  // "Home Assistant Dashboard" or "Built-in Kiosk Satellite" for the Calendar, Cameras and Timer pages. Returns true when Kiosk Satellite is chosen.
  _ksChoice(body, key) {
    const c = this._config;
    if (!c.kiosk_satellite.enabled) return false;
    const on = c.pages[key].source === "kiosk_satellite";
    const grid = this._el("div", "tiles", undefined, body);
    grid.style.marginBottom = "16px";
    [["dashboard", "Home Assistant Dashboard", "A page of this dashboard."], ["kiosk_satellite", "Built-in Kiosk Satellite", "Opens Kiosk Satellite's own view."]].forEach(([src, title, desc]) =>
      this._tile(grid, (src === "kiosk_satellite") === on, () => this._change((cfg) => {
        cfg.pages[key].source = src;
        const f = kioskEntities(this._hass, ksRef(cfg.kiosk_satellite));
        if (src === "kiosk_satellite" && key === "calendar" && !cfg.pages.calendar.ks_entity) cfg.pages.calendar.ks_entity = f.calendar;
        if (src === "kiosk_satellite" && key === "cameras" && !cfg.pages.cameras.ks_entity) cfg.pages.cameras.ks_entity = f.buttons.find((b) => /camera/.test(b)) || f.buttons[0] || "";
      }, true), (t) => {
        this._el("div", "t", title, t);
        this._el("div", "d", desc, t);
      })
    );
    return on;
  }

  _step_cameras(body) {
    if (this._ksChoice(body, "cameras")) {
      // the camera views found on the Kiosk Satellite device (each has a "Show <view>" button), named as in the app
      const cur = this._config.pages.cameras.ks_entity;
      const ids = [...new Set([...kioskEntities(this._hass, ksRef(this._config.kiosk_satellite)).buttons, cur].filter(Boolean))];
      const viewName = (id) => { const m = /\bShow (.+)$/i.exec(this._hass?.states?.[id]?.attributes?.friendly_name || ""); return m ? m[1] : id; };
      this._form(
        body,
        [{ name: "ks_entity", label: "Camera view to open", selector: ids.length ? { select: { mode: "dropdown", options: ids.map((id) => ({ value: id, label: viewName(id) })) } } : { entity: { domain: "button" } } }],
        this._config.pages.cameras,
        (v) => this._change((c) => (c.pages.cameras.ks_entity = v.ks_entity || ""))
      );
      this._el("p", "note", "The navbar button shows this camera view. Camera views are the ones you set up in the Kiosk Satellite app, each with its own Show button. After adding a view, restart the app or toggle ESPHome off and on so it appears here. The button needs the navbar, so it is not available if you hide the navbar.", body);
      return;
    }
    const list = this._config.pages.cameras.cameras;
    if (!list.length) list.push({ entity: "", title: "" });
    if (this._config.device === "echo_show_8") {
      this._form(
        body,
        [{ name: "layout", label: "Layout", selector: { select: { mode: "dropdown", options: [{ value: "swipe", label: "One camera at a time (swipe)" }, { value: "grid", label: "All cameras in a 2 column grid" }] } } }],
        this._config.pages.cameras,
        (v) => this._change((c) => (c.pages.cameras.layout = v.layout || "swipe"))
      );
    }
    this._list(
      body,
      list,
      [
        { name: "entity", selector: { entity: { domain: "camera" } } },
        { name: "title", selector: { text: {} } },
      ],
      "Add camera",
      { entity: "", title: "" }
    );
  }

  _step_climate(body) {
    this._form(
      body,
      [{ name: "entity", label: "Climate entity (air conditioner / thermostat)", selector: { entity: { domain: "climate" } } }],
      this._config.pages.climate,
      (v) => this._change((c) => (c.pages.climate.entity = v.entity || ""))
    );
    this._el("p", "note", "Shows Home Assistant's thermostat card with a fan-mode dropdown and mode buttons.", body);
    this._el("p", "note", "The pop-up is opened from the navbar, so it only works with the navbar shown. It is not available if you hide the navbar.", body);
  }

  _step_weather(body) {
    const w = this._config.pages.weather;
    this._form(
      body,
      [{ name: "entity", label: "Weather entity", selector: { entity: { domain: "weather" } } }],
      { entity: w.entity || this._config.pages.home.weather || "" },
      (v) => this._change((c) => (c.pages.weather.entity = v.entity || ""))
    );
    this._el("p", "note", "A full-screen forecast: current conditions and the coming days.", body);
  }

  _step_calendar(body) {
    if (this._ksChoice(body, "calendar")) {
      this._form(
        body,
        [
          { name: "ks_entity", label: "Kiosk Satellite Calendar view entity", selector: { entity: { domain: "select" } } },
          { name: "ks_view", label: "Open the calendar on", selector: { select: { mode: "dropdown", options: ["Day", "Week", "Month", "Schedule"] } } },
        ],
        this._config.pages.calendar,
        (v) => this._change((c) => { c.pages.calendar.ks_entity = v.ks_entity || ""; c.pages.calendar.ks_view = v.ks_view || "Week"; })
      );
      this._el("p", "note", "The navbar button opens Kiosk Satellite's own calendar. It shows the calendars you set up in the Kiosk Satellite app. It needs the navbar, so it is not available if you hide the navbar.", body);
      return;
    }
    const list = this._config.pages.calendar.entities;
    if (!list.length) list.push({ entity: "" });
    this._list(body, list, [{ name: "entity", label: "Calendar", selector: { entity: { domain: "calendar" } } }, { name: "label", label: "Label (optional: text, or a person entity)", selector: { text: {} } }], "Add calendar", { entity: "", label: "" });
  }

  _step_timer(body) {
    if (this._ksChoice(body, "timer")) {
      this._el("p", "note", "The navbar button opens the Timers view built into Kiosk Satellite (a ks://timers link). Voice timers appear there. It needs the navbar, so it is not available if you hide the navbar.", body);
      return;
    }
    this._form(
      body,
      [{ name: "entity", label: "Timer helper (optional)", selector: { entity: { domain: "timer" } } }],
      this._config.pages.timer,
      (v) => this._change((c) => (c.pages.timer.entity = v.entity || ""))
    );
    this._el("p", "note", "Timers set by voice (Google, Voice PE) appear here automatically. Add a timer helper if you also want to see one from Settings > Helpers. The page has 1, 5, 10 and 15 minute start buttons.", body);
  }

  _step_shopping(body) {
    this._form(
      body,
      [{ name: "entity", label: "List", selector: { entity: { domain: "todo" } } }],
      this._config.pages.shopping,
      (v) => this._change((c) => (c.pages.shopping.entity = v.entity || ""))
    );
  }

  // How people move between pages: the navbar (with a picture of it) or swiping; the light shortcut and, with Kiosk Satellite, buttons for its views.
  _step_navbar(body) {
    const n = this._config.navbar;
    const ks = this._config.kiosk_satellite;
    const shots = NAVBAR_SHOTS[this._config.device] || NAVBAR_SHOTS.echo_show_5;
    const grid = this._el("div", "tiles cols2", undefined, body);
    [
      [false, "Navbar", "A bar of buttons at the side to switch pages.", shots.on],
      [true, "No navbar", "Swipe left or right between pages instead.", shots.off],
    ].forEach(([hide, title, desc, src]) =>
      this._tile(grid, !!n.hide === hide, () => this._change((c) => (c.navbar.hide = hide), true), (t) => {
        const img = this._el("img", "shot", undefined, t);
        img.src = src;
        img.alt = title + " preview";
        this._el("div", "t", title, t);
        this._el("div", "d", desc, t);
      })
    );
    if (n.hide) {
      this._el("p", "note", "Swiping between pages needs the hass-swipe-navigation card from the Marketplace. If you use Kiosk Satellite on your Echo, you can enable swipe navigation there instead. The climate pop-up, the light shortcut and Kiosk Satellite shortcuts live in the navbar, so add the thermostat and light as Home cards instead.", body);
      return;
    }
    const light = this._el("div", "", undefined, body);
    light.style.marginTop = "16px";
    this._form(light, [{ name: "light_entity", selector: { entity: { domain: "light" } } }], n, (v) => this._change((c) => (c.navbar.light_entity = v.light_entity || "")));
    this._el("p", "note", "Adds a light button to the bottom of the navbar that switches this light on and off.", body);
    if (!ks.enabled) return;

    // Kiosk Satellite shortcuts: buttons that open one of its views
    const head = this._el("h3", "", "Kiosk Satellite shortcuts", body);
    head.style.marginTop = "24px";
    this._el("p", "note", "Add buttons to the navbar that open one of Kiosk Satellite's own views.", body);
    const list = n.shortcuts || (n.shortcuts = []);
    const camViews = (extra) => [...new Set([...kioskEntities(this._hass, ksRef(ks)).buttons, extra].filter(Boolean))];
    const camName = (id) => ksCameraName(this._hass, id) || id;
    list.forEach((sc, i) => {
      const row = this._el("div", "cardbox", undefined, body);
      this._el("h3", "", `Shortcut ${i + 1}`, row);
      this._form(
        row,
        [
          { name: "view", label: "View", selector: { select: { mode: "dropdown", options: Object.entries(KS_SHORTCUTS).map(([value, label]) => ({ value, label })) } } },
          ...(sc.view === "cameras"
            ? [{ name: "shortcut_view", label: "Camera view to open", selector: camViews(sc.shortcut_view).length ? { select: { mode: "dropdown", options: camViews(sc.shortcut_view).map((id) => ({ value: id, label: camName(id) })) } } : { entity: { domain: "button" } } }]
            : []),
          { name: "name", label: "Label (leave blank to use the name of the view)", selector: { text: {} } },
          { name: "icon", selector: { icon: {} } },
        ],
        sc,
        (v) => {
          if (v.view === "cameras" && !v.shortcut_view) v.shortcut_view = kioskEntities(this._hass, ksRef(ks)).buttons[0] || "";
          if (v.view !== "cameras") delete v.shortcut_view;
          this._change(() => (list[i] = v), (v.view === "cameras") !== (sc.view === "cameras"));
        }
      );
      this._button(row, "Remove", () => this._change(() => list.splice(i, 1), true), "btn small");
    });
    this._button(body, "Add shortcut", () => this._change(() => list.push({ view: "calendar", name: "", icon: "" }), true), "btn small");
  }

  _step_kiosk(body) {
    const k = this._config.kiosk;
    this._form(
      body,
      [{ name: "hide_header", selector: { boolean: {} } }, ...(k.hide_header ? [{ name: "header_users", selector: { text: {} } }] : [])],
      k,
      (v) => this._change((c) => Object.assign(c.kiosk, v), v.hide_header !== k.hide_header)
    );
    this._el("p", "note", "The header is only hidden on small screens like the Echo (a window narrower than 1000px), so it still shows when you open the dashboard on a desktop. Hiding it needs the kiosk-mode card from the Marketplace. If you use Kiosk Satellite on your Echo, you can hide the Home Assistant header there instead, and you can leave this off.", body);
  }

  _step_review(body) {
    const c = this._config;
    const row = (a, b) => {
      const r = this._el("div", "sum", undefined, body);
      this._el("span", "", a, r);
      this._el("span", "", b, r);
    };
    row("Device", DEVICES[c.device].label);
    row("Background", BACKGROUNDS[c.background].label);
    row("Kiosk Satellite", c.kiosk_satellite.enabled ? "Yes" + (KS_PAGES.filter((k) => ksChosen(c, k)).length ? " (built-in: " + KS_PAGES.filter((k) => ksChosen(c, k)).map((k) => PAGE_INFO[k].title).join(", ") + ")" : "") : "No");
    row("Pages", pageOrder(c).filter((k) => c.pages[k].enabled).map((k) => PAGE_INFO[k].title).join(", "));
    row("Hide header", c.kiosk.hide_header ? "Yes (on the Echo only)" : "No");
    row("Navbar", c.navbar.hide ? "Hidden (swipe between pages)" : [c.navbar.light_entity && "Light shortcut", c.kiosk_satellite.enabled && (c.navbar.shortcuts || []).length && `${c.navbar.shortcuts.length} Kiosk Satellite shortcut${c.navbar.shortcuts.length > 1 ? "s" : ""}`].filter(Boolean).join(", ") || "Shown");
    // steps left incomplete (possible now that steps can be visited in any order), each one a button that goes to it
    const steps = this._steps();
    steps.forEach((id, idx) => {
      const problem = id === "review" ? "" : this._validate(id);
      if (problem) this._button(body, `${STEP_INFO[id][0]}: ${problem}`, () => { this._error = ""; this._step = idx; this._render(); }, "btn small fix");
    });
    const missing = missingDependencies(c);
    if (missing.length) {
      this._el("p", "err", "Still missing: " + [...new Set(missing.map((m) => m.name))].join(", ") + ".", body);
    }
    const det = this._el("details", "", undefined, body);
    this._el("summary", "", "Advanced", det);
    this._form(det, [{ name: "dashboard_path", selector: { text: {} } }], c, (v) =>
      this._change((cfg) => (cfg.dashboard_path = v.dashboard_path || ""))
    );
    if (!this._standalone) {
      this._el("p", "note", "Use Save in the dashboard editor to apply these changes.", body);
    }
  }

  async _save() {
    try {
      const strategy = { type: STRATEGY_TYPE, ...this._config, configured: true };
      await this._hass.callWS({
        type: "lovelace/config/save",
        url_path: this._urlPath(),
        config: { strategy },
      });
      this._status = "Saved - reloading...";
      this._render();
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      this._status = "Save failed: " + (e?.message || e);
      this._render();
    }
  }
}
customElements.define("bedside-clock-editor", BedsideClockEditor);

// The setup card is the same element with a different tag so HA can place it in a view.
class BedsideClockSetupCard extends BedsideClockEditor {}
customElements.define("bedside-clock-setup-card", BedsideClockSetupCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "bedside-clock-setup-card",
  name: "Echo Dashboard setup",
  description: "Configuration UI for The Stock Pot's Echo Dashboard strategy.",
});

console.info(`%c BEDSIDE-CLOCK %c v${VERSION} `, "background:#7f5539;color:#fff", "background:#ddd;color:#000");
