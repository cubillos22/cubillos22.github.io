/* Apps, modelos y videos en vivo: un enlace con class="live" abre una hoja a pantalla completa.
   Sin JS el enlace abre la app en otra pestaña. Lee el idioma en el momento de abrir. */
(() => {
  const d = document, html = d.documentElement;
  const TXT = {
    es: { live: "En vivo", video: "Video", open: "Abrir en pestaña nueva ↗", close: "Cerrar ✕",
      demo: "Corre en el servidor de demostración de la empresa, que se apaga fuera del horario laboral de Colombia.",
      own: "Visor propio, servido desde este sitio.", agol: "App pública en ArcGIS Online.",
      vid: "Grabación de la app: el piloto es privado del cliente, así que aquí va en video.",
      wait: "Conectando con el servidor de demostración…",
      off: "El servidor de demostración está apagado en este momento. Funciona en horario laboral de Colombia (en Bogotá son las {h}). Mientras tanto puedes ver la captura, o volver más tarde.",
      retry: "Intentar de nuevo" },
    en: { live: "Live", video: "Video", open: "Open in new tab ↗", close: "Close ✕",
      demo: "Runs on the company demo server, which is switched off outside Colombian office hours.",
      own: "Own viewer, served from this site.", agol: "Public app on ArcGIS Online.",
      vid: "Screen recording of the app: the pilot is private to the client, so it is shown as video.",
      wait: "Connecting to the demo server…",
      off: "The demo server is off right now. It runs during Colombian office hours (it is now {h} in Bogotá). Meanwhile you can see the capture below, or try again later.",
      retry: "Try again" }
  };
  const L = () => html.dataset.lang === "en" ? "en" : "es";
  const S = () => TXT[L()];
  const PING = "https://arcgis.esri.co/portal/sharing/rest/info?f=json";
  const links = d.querySelectorAll("a.live");
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  const dlg = d.createElement("dialog");
  dlg.className = "live-dlg";
  dlg.setAttribute("aria-labelledby", "live-t");
  dlg.innerHTML = '<header><div class="lh"><p class="lk"><i aria-hidden="true"></i><span></span></p><h2 id="live-t" class="lt"></h2><p class="ln"></p></div>' +
    '<div class="la"><a class="lo" target="_blank" rel="noopener"></a><button type="button" class="lc" autofocus></button></div></header><div class="lb"></div>';
  d.body.appendChild(dlg);
  const q = s => dlg.querySelector(s);
  let gen = 0;
  const cleanup = () => { gen++; q(".lb").replaceChildren(); html.classList.remove("live-open"); };
  q(".lc").addEventListener("click", () => { dlg.close(); cleanup(); });
  dlg.addEventListener("cancel", cleanup);
  dlg.addEventListener("close", () => { if (!dlg.open) cleanup(); });
  addEventListener("message", e => {
    if (e.origin === location.origin && e.data === "vivo:cerrar" && dlg.open) { dlg.close(); cleanup(); }
  });

  const kindOf = (url, a) => a.dataset.video ? "vid" : url.includes("arcgis.esri.co") ? "demo" : /^vivo\//.test(url) ? "own" : "agol";
  const withLang = url => {
    if (!/^vivo\//.test(url) || L() !== "en") return url;
    const [p, h] = url.split("#"); return p + (p.includes("?") ? "&" : "?") + "lang=en" + (h ? "#" + h : "");
  };
  const bogota = () => new Date().toLocaleTimeString(L() === "en" ? "en-GB" : "es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });
  const pick = (a, k) => (L() === "en" && a.dataset[k + "En"]) || a.dataset[k] || "";

  function frame(url, title) {
    const f = d.createElement("iframe");
    f.src = url; f.title = title; f.allow = "fullscreen; geolocation; xr-spatial-tracking"; f.setAttribute("allowfullscreen", "");
    q(".lb").replaceChildren(f);
  }
  function movie(src, poster, title) {
    const v = d.createElement("video");
    Object.assign(v, { src, poster: poster || "", controls: true, autoplay: true, muted: true, loop: true, playsInline: true });
    v.setAttribute("aria-label", title);
    q(".lb").replaceChildren(v);
  }
  async function reachable() {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    try { await fetch(PING, { mode: "no-cors", cache: "no-store", signal: c.signal }); return true; }
    catch (e) { return false; } finally { clearTimeout(t); }
  }
  async function load(url, title, img, a) {
    const g = gen, k = kindOf(url, a);
    if (k === "vid") return movie(a.dataset.video, img, title);
    if (k !== "demo") return frame(url, title);
    const msg = d.createElement("p"); msg.className = "off-msg"; msg.textContent = S().wait;
    q(".lb").replaceChildren(msg);
    const ok = await reachable();
    if (g !== gen || !dlg.open) return;
    if (ok) return frame(url, title);
    const box = d.createElement("div"); box.className = "off";
    const p = d.createElement("p"); p.textContent = S().off.replace("{h}", bogota());
    const b = d.createElement("button"); b.type = "button"; b.className = "lc"; b.textContent = S().retry;
    b.addEventListener("click", () => load(url, title, img, a));
    box.append(p, b);
    if (img) { const i = d.createElement("img"); i.src = img; i.alt = ""; box.appendChild(i); }
    q(".lb").replaceChildren(box);
  }
  function open(a) {
    const url = withLang(a.getAttribute("href"));
    const fig = a.closest("figure, .piece");
    const cap = fig && fig.querySelector(`figcaption [lang="${L()}"], figcaption, h3 [lang="${L()}"], h3`);
    const title = pick(a, "title") || (cap ? cap.textContent.trim() : a.textContent.replace("↗", "").trim());
    const img = a.querySelector("img, video");
    const k = kindOf(url, a), s = S();
    q(".lk span").textContent = (k === "vid" ? s.video : s.live) + " · " + (pick(a, "kind") || "App");
    q(".lt").textContent = title;
    q(".ln").textContent = s[k];
    q(".lo").href = k === "vid" ? a.dataset.video : url;
    q(".lo").textContent = s.open; q(".lc").textContent = s.close;
    html.classList.add("live-open");
    gen++;
    if (!dlg.open) dlg.showModal();
    load(url, title, img && (img.currentSrc || img.getAttribute("poster")), a);
  }
  function chipText(a) { return (a.dataset.video ? S().video : S().live) + " · " + (pick(a, "kind") || "App"); }
  links.forEach(a => {
    if (a.querySelector("img, video")) {
      const chip = d.createElement("span"); chip.className = "chip";
      chip.innerHTML = '<i aria-hidden="true"></i><span></span>'; chip.lastChild.textContent = chipText(a);
      a.appendChild(chip);
    }
    a.addEventListener("click", e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault(); open(a);
    });
  });
  d.addEventListener("estudio:lang", () => links.forEach(a => { const c = a.querySelector(".chip span"); if (c) c.textContent = chipText(a); }));
})();
