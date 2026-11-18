/* Apps y modelos en vivo: cada imagen enlazada con class="live" abre la app en una hoja a pantalla completa.
   Sin JS el enlace abre la app en otra pestaña. */
(() => {
  const EN = document.documentElement.lang === "en";
  const S = EN ? {
    live: "Live", open: "Open in new tab ↗", close: "Close ✕",
    demo: "Runs on the company demo server, which is switched off outside Colombian office hours.",
    own: "Own viewer, served from this site.", agol: "Public app on ArcGIS Online.",
    wait: "Connecting to the demo server…",
    off: "The demo server is off right now. It runs during Colombian office hours (it is now {h} in Bogotá). Meanwhile you can see the capture below, or try again later.",
    retry: "Try again"
  } : {
    live: "En vivo", open: "Abrir en pestaña nueva ↗", close: "Cerrar ✕",
    demo: "Corre en el servidor de demostración de la empresa, que se apaga fuera del horario laboral de Colombia.",
    own: "Visor propio, servido desde este sitio.", agol: "App pública en ArcGIS Online.",
    wait: "Conectando con el servidor de demostración…",
    off: "El servidor de demostración está apagado en este momento. Funciona en horario laboral de Colombia (en Bogotá son las {h}). Mientras tanto puedes ver la captura, o volver más tarde.",
    retry: "Intentar de nuevo"
  };
  const PING = "https://arcgis.esri.co/portal/sharing/rest/info?f=json";
  const links = document.querySelectorAll("a.live");
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  const dlg = document.createElement("dialog");
  dlg.className = "live-dlg";
  dlg.setAttribute("aria-labelledby", "live-t");
  dlg.innerHTML = '<header><div class="lh"><p class="kicker"><i aria-hidden="true"></i><span class="lk"></span></p><h2 id="live-t" class="lt"></h2><p class="ln"></p></div>' +
    '<div class="la"><a class="lo" target="_blank" rel="noopener"></a><button type="button" class="lc"></button></div></header><div class="lb"></div>';
  document.body.appendChild(dlg);
  const q = s => dlg.querySelector(s);
  q(".lo").textContent = S.open; q(".lc").textContent = S.close; q(".lc").autofocus = true;
  let gen = 0;                                   // descarta respuestas de una apertura anterior
  const cleanup = () => { gen++; q(".lb").replaceChildren(); document.documentElement.classList.remove("live-open"); };
  // limpieza síncrona: el evento "close" llega tarde (o no llega) en pestañas en segundo plano
  q(".lc").addEventListener("click", () => { dlg.close(); cleanup(); });
  dlg.addEventListener("cancel", cleanup);
  // Esc dentro de los visores propios (mismo origen) también cierra la hoja
  addEventListener("message", e => {
    if (e.origin === location.origin && e.data === "vivo:cerrar" && dlg.open) { dlg.close(); cleanup(); }
  });
  dlg.addEventListener("close", () => { if (!dlg.open) cleanup(); });

  const kindOf = url => url.includes("arcgis.esri.co") ? "demo" : /^vivo\//.test(url) ? "own" : "agol";
  const bogota = () => new Date().toLocaleTimeString(EN ? "en-GB" : "es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });

  function frame(url, title) {
    const f = document.createElement("iframe");
    f.src = url; f.title = title; f.loading = "eager";
    f.allow = "fullscreen; geolocation; xr-spatial-tracking";
    f.setAttribute("allowfullscreen", "");
    q(".lb").replaceChildren(f);
  }
  async function reachable() {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    try { await fetch(PING, { mode: "no-cors", cache: "no-store", signal: c.signal }); return true; }
    catch (e) { return false; } finally { clearTimeout(t); }
  }
  async function load(url, title, img) {
    const g = gen;
    if (kindOf(url) !== "demo") return frame(url, title);
    const msg = document.createElement("p"); msg.className = "off-msg"; msg.textContent = S.wait;
    q(".lb").replaceChildren(msg);
    const ok = await reachable();
    if (g !== gen || !dlg.open) return;
    if (ok) return frame(url, title);
    const box = document.createElement("div"); box.className = "off";
    const p = document.createElement("p"); p.textContent = S.off.replace("{h}", bogota());
    const b = document.createElement("button"); b.type = "button"; b.className = "lc"; b.textContent = S.retry;
    b.addEventListener("click", () => load(url, title, img));
    box.append(p, b);
    if (img) { const i = document.createElement("img"); i.src = img; i.alt = ""; box.appendChild(i); }
    q(".lb").replaceChildren(box);
  }
  function open(a) {
    const url = a.getAttribute("href");
    const fig = a.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    const title = a.dataset.title || (cap ? cap.textContent.trim() : a.textContent.replace("↗", "").trim());
    const img = a.querySelector("img");
    q(".lk").textContent = S.live + " · " + (a.dataset.kind || "App");
    q(".lt").textContent = title;
    q(".ln").textContent = S[kindOf(url)];
    q(".lo").href = url;
    document.documentElement.classList.add("live-open");
    gen++;
    if (!dlg.open) dlg.showModal();
    load(url, title, img && img.currentSrc);
  }
  links.forEach(a => {
    if (a.querySelector("img")) {
      const chip = document.createElement("span"); chip.className = "chip";
      chip.innerHTML = '<i aria-hidden="true"></i>';
      chip.append(S.live + " · " + (a.dataset.kind || "App"));
      a.appendChild(chip);
    }
    a.addEventListener("click", e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault(); open(a);
    });
  });
})();
