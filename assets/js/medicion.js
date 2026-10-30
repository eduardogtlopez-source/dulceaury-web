import { measurementConfig } from "./medicion-config.js?v=1";

// Lista cerrada: nunca leer el mensaje de WhatsApp, el teléfono o datos del visitante.
export const buttons = Object.freeze({
  cabecera: { occasion: "general", placement: "cabecera" },
  principal: { occasion: "general", placement: "principal" },
  bodas: { occasion: "bodas", placement: "ocasiones" },
  xv_anos: { occasion: "xv_anos", placement: "ocasiones" },
  cumpleanos: { occasion: "cumpleanos", placement: "ocasiones" },
  baby_shower: { occasion: "baby_shower", placement: "ocasiones" },
  bautizos: { occasion: "bautizos", placement: "ocasiones" },
  eventos: { occasion: "eventos", placement: "ocasiones" },
  contacto: { occasion: "general", placement: "contacto" },
  flotante: { occasion: "general", placement: "flotante" }
});

const installed = Symbol.for("dulceaury.measurement");
const hosts = new Set(["dulceaury.com", "www.dulceaury.com"]);

export function startMeasurement(win, config = measurementConfig) {
  const doc = win.document;
  if (doc[installed]) return doc[installed];
  const state = { active: false, reason: "disabled", queued: 0, failed: 0 };
  if (config.enabled !== true) return state;
  if (win.location.protocol !== "https:" || !hosts.has(win.location.hostname)) {
    state.reason = "non-production-host";
    return state;
  }
  if (win.navigator.globalPrivacyControl === true || win.navigator.doNotTrack === "1") {
    state.reason = "privacy-preference";
    return state;
  }
  if (!/^G-[A-Z0-9]{4,20}$/.test(config.existingGa4MeasurementId) || typeof win.gtag !== "function") {
    state.reason = "no-existing-receiver";
    return state;
  }

  state.active = true;
  state.reason = "existing-receiver";
  doc[installed] = state;
  const receiver = win.gtag;
  function send(name, fields = {}) {
    try {
      // Override automatic URL context; never send query strings, hash or referral URL.
      receiver("event", name, {
        send_to: config.existingGa4MeasurementId,
        page_location: "https://dulceaury.com/",
        page_referrer: "",
        page_title: "Dulce Aury",
        ...fields
      });
      state.queued += 1; // Queued by the adapter, NOT proof of delivery to the provider.
    } catch {
      // Optional analytics must not prevent someone contacting the business.
      // Expose the failure count for local checks; never claim successful delivery.
      state.failed += 1;
    }
  }

  // A distinct event avoids duplicating the receiver's automatic page_view.
  // This counts page loads, not unique people or sessions.
  send("dulceaury_view");
  function onClick(event) {
    if (!event.isTrusted || event.defaultPrevented) return;
    if (event.type === "click" && event.button !== 0) return;
    if (event.type === "auxclick" && event.button !== 1) return;
    const anchor = event.target.closest?.("a[data-wa-button]");
    if (!anchor || !Object.hasOwn(buttons, anchor.dataset.waButton)) return;
    const entry = buttons[anchor.dataset.waButton];
    // Delegation covers keyboard activation and clicks on icons inside the link.
    // Keep the native href/target and do not delay, redirect or cancel navigation.
    send("whatsapp_click", {
      button_id: anchor.dataset.waButton,
      occasion: entry.occasion,
      placement: entry.placement
    });
  }
  doc.addEventListener("click", onClick);
  doc.addEventListener("auxclick", onClick);
  state.stop = () => {
    doc.removeEventListener("click", onClick);
    doc.removeEventListener("auxclick", onClick);
    delete doc[installed];
    state.active = false;
    state.reason = "stopped";
  };
  return state;
}

if (typeof window !== "undefined") startMeasurement(window);
