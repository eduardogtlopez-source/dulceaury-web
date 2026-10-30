import { measurementConfig } from "./medicion-config.js?v=2";
import { startMeasurement } from "./medicion.js?v=4";

const installed = Symbol.for("dulceaury.consent");
const preferenceKey = "dulceaury.analyticsConsent.v1";
const lifetime = 90 * 24 * 60 * 60 * 1000;
const hosts = new Set(["dulceaury.com", "www.dulceaury.com"]);

export function initializeMeasurement(win, config = measurementConfig) {
  const doc = win.document;
  if (doc[installed]) return doc[installed];
  const state = { active: false, reason: "disabled" };
  if (config.enabled !== true) return state;
  if (win.location.protocol !== "https:" || !hosts.has(win.location.hostname)) {
    state.reason = "non-production-host"; return state;
  }
  if (win.navigator.globalPrivacyControl === true || win.navigator.doNotTrack === "1") {
    state.reason = "privacy-preference"; return state;
  }
  if (!/^G-[A-Z0-9]{4,20}$/.test(config.ga4MeasurementId)) {
    state.reason = "missing-measurement-id"; return state;
  }
  // Explicit adapter mode is useful for an already configured receiver and local tests.
  if (config.loadGoogleTag !== true) return startMeasurement(win, config);
  // A dedicated brand must not reconfigure an unrelated tag found on the page.
  if (typeof win.gtag === "function" || win.dataLayer !== undefined) {
    state.reason = "conflicting-receiver"; return state;
  }
  doc[installed] = state;
  state.reason = "awaiting-choice";
  let tagLoaded = false;
  let tracker;
  function readChoice() {
    try {
      const saved = JSON.parse(win.localStorage.getItem(preferenceKey));
      return saved && ["granted", "denied"].includes(saved.choice)
        && Number.isFinite(saved.expires) && saved.expires > Date.now() ? saved.choice : null;
    } catch { return null; } // Storage unavailable: ask again, never assume acceptance.
  }
  function saveChoice(choice) {
    try { win.localStorage.setItem(preferenceKey, JSON.stringify({ choice, expires: Date.now() + lifetime })); }
    catch { /* Choice still applies for this page, without persistent storage. */ }
  }
  function clearAnalyticsCookies() {
    for (const part of doc.cookie.split(";")) {
      const name = part.trim().split("=")[0];
      if (!/^dulceaury_ga(?:_|$)/.test(name)) continue;
      for (const domain of ["", "; Domain=dulceaury.com", "; Domain=" + win.location.hostname]) {
        doc.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax; Secure" + domain;
      }
    }
  }
  function showPanel(visible) {
    panel.hidden = !visible;
    // The header and normal WhatsApp links remain usable; avoid a duplicate
    // floating button covering the main CTA when the notice shifts the page.
    doc.documentElement.classList.toggle("da-consent-visible", visible);
  }
  function accept(persist = true) {
    if (persist) saveChoice("granted");
    showPanel(false);
    if (tagLoaded) return;
    tagLoaded = true;
    win["ga-disable-" + config.ga4MeasurementId] = false;
    win.dataLayer = [];
    win.gtag = function () { win.dataLayer.push(arguments); };
    win.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    win.gtag("js", new Date());
    win.gtag("consent", "update", { analytics_storage: "granted" });
    win.gtag("set", "ads_data_redaction", true);
    win.gtag("set", "url_passthrough", false);
    win.gtag("config", config.ga4MeasurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: "https://dulceaury.com/", page_referrer: "",
      page_title: "Dulce Aury", ignore_referrer: true,
      cookie_prefix: "dulceaury", cookie_domain: "dulceaury.com",
      cookie_expires: lifetime / 1000, cookie_update: false,
      ...(config.debugMode === true ? { debug_mode: true } : {})
    });
    const script = doc.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(config.ga4MeasurementId);
    script.referrerPolicy = "no-referrer";
    script.onerror = () => {
      tracker?.stop();
      state.active = false;
      state.reason = "tag-load-failed";
    };
    doc.head.append(script);
    tracker = startMeasurement(win, config);
    state.active = tracker.active;
    state.reason = "tag-requested"; // Not proof of provider ingestion.
  }
  function decline() {
    saveChoice("denied");
    showPanel(false);
    state.active = false;
    state.reason = "declined";
    if (!tagLoaded) return;
    win["ga-disable-" + config.ga4MeasurementId] = true;
    tracker?.stop();
    clearAnalyticsCookies();
    // A reload removes the loaded tag's timers. Basic mode sends no denied pings.
    win.location.reload();
  }

  const style = doc.createElement("style");
  style.textContent = `
    .da-consent{max-width:1120px;margin:16px auto;padding:16px 22px;border:1px solid #c9707d;border-radius:14px;background:#fff8f2;color:#4a2e2a;font:inherit}
    .da-consent[hidden]{display:none}.da-consent p{margin:0 0 12px}.da-consent strong{display:block;margin-bottom:4px}
    .da-consent-actions{display:flex;flex-wrap:wrap;gap:12px}.da-consent button,.da-consent-settings{min-height:44px;padding:10px 16px;border:1px solid #4a2e2a;border-radius:10px;background:#fff;color:#4a2e2a;font:inherit;cursor:pointer}
    .da-consent button:focus-visible,.da-consent-settings:focus-visible{outline:3px solid #8c6a16;outline-offset:3px}
    .da-consent-settings{display:block;margin:12px auto}.da-consent small{display:block;margin-top:10px}
    .da-consent-visible .fab{display:none}
    @media(max-width:600px){
      .da-consent{margin:8px 16px;padding:12px;font-size:14px;line-height:1.45}
      .da-consent p{margin-bottom:8px}.da-consent strong{margin-bottom:2px}
      .da-consent-actions{gap:8px}.da-consent-actions button{flex:1;padding:8px 12px}
      .da-consent small{margin-top:8px;font-size:12px;line-height:1.5}
    }
  `;
  doc.head.append(style);
  const panel = doc.createElement("aside");
  panel.className = "da-consent";
  panel.setAttribute("aria-label", "Estadísticas opcionales");
  panel.tabIndex = -1;
  panel.innerHTML = `<p><strong>Estadísticas opcionales</strong>Con tu permiso, Google Analytics usa cookies para contar visitas y clics a WhatsApp. Sin mensajes ni teléfono.</p><div class="da-consent-actions"><button type="button" data-da-choice="granted">Aceptar</button><button type="button" data-da-choice="denied">Rechazar</button></div><small><a href="https://policies.google.com/privacy?hl=es" target="_blank" rel="noopener noreferrer">Privacidad de Google</a> · Cambia tu elección al pie.</small>`;
  const header = doc.querySelector("header");
  if (header) header.after(panel); else doc.body.prepend(panel);
  panel.querySelector('[data-da-choice="granted"]').addEventListener("click", accept);
  panel.querySelector('[data-da-choice="denied"]').addEventListener("click", decline);
  const settings = doc.createElement("button");
  settings.type = "button";
  settings.className = "da-consent-settings";
  settings.textContent = "Privacidad de estadísticas";
  settings.addEventListener("click", () => {
    showPanel(true); panel.focus(); panel.scrollIntoView({ block: "center" });
  });
  (doc.querySelector("footer") || doc.body).append(settings);
  const saved = readChoice();
  if (saved === "granted") accept(false);
  else if (saved === "denied") { showPanel(false); state.reason = "declined"; }
  else showPanel(true);
  return state;
}

if (typeof window !== "undefined") initializeMeasurement(window);
