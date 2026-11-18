/* Estudio · interacción del portafolio
   idioma en la misma página · lámpara de ideas (tema) · linterna sobre el mapa · cursor · inclinación ·
   imán · vista previa que sigue al mouse · revelados · videos que solo corren a la vista.
   Reglas: un solo listener de puntero, transform directo sobre cada elemento, posiciones medidas al entrar. */
(() => {
  const d = document, html = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- idioma ---------- */
  const ATTRS = ["alt", "label", "title"];
  const real = a => a === "label" ? "aria-label" : a;
  const biEls = [...d.querySelectorAll(ATTRS.map(a => `[data-${a}-en]`).join(","))];
  biEls.forEach(el => ATTRS.forEach(a => { if (el.dataset[a + "En"] !== undefined && el.dataset[a + "Es"] === undefined) el.dataset[a + "Es"] = el.getAttribute(real(a)) || ""; }));
  const titleEl = d.querySelector("title"), descEl = d.querySelector('meta[name="description"]');
  function setLang(l, o = {}) {
    if (l !== "es" && l !== "en") l = "es";
    const apply = () => {
      html.lang = l; html.dataset.lang = l;
      biEls.forEach(el => ATTRS.forEach(a => { const v = el.dataset[a + (l === "en" ? "En" : "Es")]; if (v !== undefined) el.setAttribute(real(a), v); }));
      if (titleEl && titleEl.dataset[l]) d.title = titleEl.dataset[l];
      if (descEl && descEl.dataset[l]) descEl.setAttribute("content", descEl.dataset[l]);
      d.querySelectorAll(".lang-toggle").forEach(b => b.setAttribute("aria-pressed", String(l === "en")));
      d.dispatchEvent(new CustomEvent("estudio:lang", { detail: l }));
    };
    if (o.save) store.set("lang", l);
    if (o.url !== false) { const u = new URL(location.href); l === "en" ? u.searchParams.set("lang", "en") : u.searchParams.delete("lang"); history.replaceState(null, "", u); }
    if (o.animate && !reduce) { html.classList.add("is-switching"); setTimeout(() => { apply(); html.classList.remove("is-switching"); }, 200); }
    else apply();
  }
  const q = new URLSearchParams(location.search).get("lang");
  const nav = (navigator.languages || [navigator.language || "es"])[0] || "es";
  setLang(q || store.get("lang") || (/^es/i.test(nav) ? "es" : "en"), { url: false });
  d.querySelectorAll(".lang-toggle").forEach(b => b.addEventListener("click", () => setLang(html.dataset.lang === "en" ? "es" : "en", { save: true, animate: true })));

  /* ---------- lámpara de ideas = tema ---------- */
  const themeMeta = d.querySelector('meta[name="theme-color"]');
  const pullBtns = d.querySelectorAll("[data-lamp]");
  function setLight(on, o = {}) {
    html.dataset.theme = on ? "light" : "dark";
    const mapLight = d.querySelector(".hero-map .lit"); if (mapLight && on) mapLight.style.clipPath = "";
    html.classList.toggle("lamp-on", on);
    pullBtns.forEach(b => b.setAttribute("aria-pressed", String(on)));
    if (themeMeta) themeMeta.setAttribute("content", on ? "#ffffff" : "#000000");
    if (o.save) store.set("light", on ? "1" : "0");
    if (o.flicker && !reduce) { html.classList.add("is-flicker"); setTimeout(() => html.classList.remove("is-flicker"), 480); }
  }
  const saved = store.get("light");
  setLight(saved ? saved === "1" : !matchMedia("(prefers-color-scheme: dark)").matches);
  const toggleLight = () => { const on = !html.classList.contains("lamp-on"); setLight(on, { save: true, flicker: on }); };
  pullBtns.forEach(b => b.addEventListener("click", () => { if (b.dataset.dragged === "1") { b.dataset.dragged = ""; return; } toggleLight(); }));
  // el cordón se estira al arrastrar (con amortiguación) y vuelve con resorte
  const cord = d.querySelector(".lamp-pull");
  if (cord) {
    const str = cord.querySelector(".str"), bead = cord.querySelector(".bead");
    let y0 = null, pulled = 0;
    const set = px => { str.style.transform = `scaleY(${(66 + px) / 66})`; bead.style.transform = `translateY(${px}px)`; };
    cord.addEventListener("pointerdown", e => { y0 = e.clientY; pulled = 0; cord.setPointerCapture(e.pointerId); html.classList.add("is-pulling"); str.style.transition = bead.style.transition = "none"; });
    cord.addEventListener("pointermove", e => { if (y0 === null) return; const raw = Math.max(0, e.clientY - y0); pulled = raw < 40 ? raw : 40 + (raw - 40) * .25; set(pulled); });
    const end = () => {
      if (y0 === null) return; y0 = null; html.classList.remove("is-pulling");
      str.style.transition = bead.style.transition = reduce ? "none" : "transform .55s cubic-bezier(.34,1.56,.64,1)";
      set(0);
      if (pulled > 16) { cord.dataset.dragged = "1"; toggleLight(); }
    };
    cord.addEventListener("pointerup", end); cord.addEventListener("pointercancel", end);
  }

  /* ---------- puntero compartido ---------- */
  const m = { x: innerWidth * .7, y: innerHeight * .45, nx: 0, ny: 0, moved: false };
  addEventListener("pointermove", e => { m.x = e.clientX; m.y = e.clientY; m.nx = e.clientX / innerWidth - .5; m.ny = e.clientY / innerHeight - .5; m.moved = true; }, { passive: true });

  let cur, ring, label;
  if (fine && !reduce) {
    cur = d.createElement("div"); cur.className = "cursor"; ring = d.createElement("div"); ring.className = "cursor-ring";
    label = d.createElement("span"); ring.appendChild(label); d.body.append(ring, cur); html.classList.add("has-cursor");
    d.addEventListener("pointerover", e => {
      const el = e.target.closest("[data-cursor], a, button, summary, input");
      ring.classList.toggle("is-link", !!el);
      const lab = el && el.dataset.cursor ? (html.dataset.lang === "en" ? (el.dataset.cursorEn || el.dataset.cursor) : el.dataset.cursor) : "";
      label.textContent = lab; ring.classList.toggle("has-label", !!lab);
    });
    d.addEventListener("pointerdown", () => ring.classList.add("is-down"));
    d.addEventListener("pointerup", () => ring.classList.remove("is-down"));
    d.documentElement.addEventListener("mouseleave", () => html.classList.add("cursor-out"));
    d.documentElement.addEventListener("mouseenter", () => html.classList.remove("cursor-out"));
  }
  const rp = { x: m.x, y: m.y };

  // capas con profundidad (portada), lámpara, linterna y vista previa
  const layers = reduce ? [] : [...d.querySelectorAll("[data-depth]")];
  const lamp = d.querySelector(".lamp");
  const lit = d.querySelector(".hero-map .lit");
  let litRect = null;
  const measure = () => { const r = lit ? lit.parentElement.getBoundingClientRect() : null; litRect = r ? {left:r.left, top:r.top + scrollY, width:r.width, height:r.height} : null; };
  addEventListener("resize", measure);
  new ResizeObserver(measure).observe(d.querySelector(".hero"));
  measure();
  const lp = { nx: 0, ny: 0, sway: 0, lx: 50, ly: 40 };
  const peek = d.querySelector(".peek"), peekImg = peek && peek.querySelector("img");
  const pp = { x: m.x, y: m.y };
  if (peek && fine && !reduce) d.querySelectorAll("[data-peek]").forEach(row => {
    row.addEventListener("pointerenter", () => { if (peekImg.getAttribute("src") !== row.dataset.peek) peekImg.src = row.dataset.peek; peek.classList.add("is-on"); });
    row.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
  });

  // cinta que corre: su velocidad y su sentido siguen al scroll
  const tracks = reduce ? [] : [...d.querySelectorAll(".track[data-ticker]")].map(el => ({ el, dir: +el.dataset.ticker || 1, x: 0, width: 0 }));
  const measureTracks = () => tracks.forEach(t => { const run = [...t.el.children].find(c => !c.lang || c.lang === html.dataset.lang); t.width = run ? run.offsetWidth : 0; });
  const trackObserver = new ResizeObserver(measureTracks);
  tracks.forEach(t => trackObserver.observe(t.el));
  d.addEventListener("estudio:lang", () => { measureTracks(); measure(); });
  d.fonts.ready.then(() => { measureTracks(); measure(); });
  addEventListener("resize", measureTracks);
  measureTracks();
  let lastSY = scrollY, sv = 0;
  let running = true, frameId;
  d.addEventListener("visibilitychange", () => { running = !d.hidden; cancelAnimationFrame(frameId); if (running) frameId = requestAnimationFrame(frame); });
  function frame() {
    if (!running) return;
    if (cur) {
      cur.style.transform = `translate3d(${m.x}px,${m.y}px,0)`;
      rp.x = lerp(rp.x, m.x, .2); rp.y = lerp(rp.y, m.y, .2);
      ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0)`;
    }
    lp.nx = lerp(lp.nx, m.nx, .06); lp.ny = lerp(lp.ny, m.ny, .06);
    for (const el of layers) { const k = +el.dataset.depth; el.style.transform = `translate3d(${(lp.nx * k).toFixed(2)}px,${(lp.ny * k).toFixed(2)}px,0)`; }
    if (lamp && !reduce) { lp.sway = lerp(lp.sway, clamp(m.nx * 6, -5, 5), .045); lamp.style.transform = `rotate(${lp.sway.toFixed(2)}deg)`; }
    if (lit && !html.classList.contains("lamp-on")) {
      if (!litRect) return;
      const tx = clamp((m.x - litRect.left) / litRect.width * 100, -20, 120), ty = clamp((m.y + scrollY - litRect.top) / litRect.height * 100, -20, 120);
      lp.lx = lerp(lp.lx, m.moved ? tx : 55, .12); lp.ly = lerp(lp.ly, m.moved ? ty : 42, .12);
      lit.style.setProperty("--lx", lp.lx.toFixed(1) + "%"); lit.style.setProperty("--ly", lp.ly.toFixed(1) + "%");
    }
    if (peek && peek.classList.contains("is-on")) {
      const vx = m.x - pp.x; pp.x = lerp(pp.x, m.x, .15); pp.y = lerp(pp.y, m.y, .15);
      peek.style.transform = `translate3d(${pp.x}px,${pp.y}px,0) rotate(${clamp(vx * .05, -6, 6).toFixed(2)}deg)`;
    } else if (peek) { pp.x = m.x; pp.y = m.y; }
    const vy = scrollY - lastSY; lastSY = scrollY; sv = lerp(sv, clamp(vy, -80, 80), .12);
    for (const t of tracks) {
      const w = t.width;
      if (w) { t.x -= (.7 + Math.abs(sv) * .5) * t.dir * (sv < -1 ? -1 : 1); t.x = ((t.x % w) - w) % w; t.el.style.transform = `translate3d(${t.x.toFixed(1)}px,0,0)`; }
    }
    updateScroll();
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);

  /* ---------- inclinación de las piezas (medida al entrar) ---------- */
  if (fine && !reduce) d.querySelectorAll("[data-tilt]").forEach(el => {
    let r = null; const media = el.querySelector("img, video");
    el.addEventListener("pointerenter", () => { r = el.getBoundingClientRect(); });
    el.addEventListener("pointermove", e => {
      if (!r) r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(1000px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
      if (media && !el.classList.contains("contain")) media.style.transform = `scale(1.09) translate3d(${(-x * 12).toFixed(1)}px,${(-y * 9).toFixed(1)}px,0)`;
    });
    el.addEventListener("pointerleave", () => { r = null; el.style.transform = ""; if (media) media.style.transform = ""; });
  });

  /* ---------- imán (solo en los dos llamados principales) ---------- */
  if (fine && !reduce) d.querySelectorAll("[data-magnet]").forEach(el => {
    let r = null;
    el.addEventListener("pointerenter", () => { r = el.getBoundingClientRect(); });
    el.addEventListener("pointermove", e => { if (!r) return; el.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * r.width * .12}px,${((e.clientY - r.top) / r.height - .5) * r.height * .3}px)`; });
    el.addEventListener("pointerleave", () => { r = null; el.style.transform = ""; });
  });

  /* ---------- títulos por palabras ---------- */
  d.querySelectorAll("[data-split]").forEach(root => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) return f.appendChild(d.createTextNode(p));
          const w = d.createElement("span"); w.className = "w"; const s = d.createElement("span");
          s.textContent = p; s.style.setProperty("--i", i++); w.appendChild(s); f.appendChild(w);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1 && !n.classList.contains("w")) { if (n.hasAttribute("lang")) i = 0; walk(n); }
    });
    walk(root);
  });

  /* ---------- revelados: títulos por palabras e imágenes con recorte, una sola vez ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -100px 0px" });
  d.querySelectorAll("[data-split], .reveal-img").forEach(el => reduce ? el.classList.add("is-in") : io.observe(el));

  /* ---------- videos: solo corren a la vista ---------- */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { if (v.preload === "none") v.preload = "auto"; const p = v.play(); p && p.catch(() => {}); } else v.pause();
  }), { threshold: .3 });
  d.querySelectorAll("video[data-autoplay]").forEach(v => { v.muted = true; vio.observe(v); });

  /* ---------- cabecera, progreso y área activa ---------- */
  const top = d.querySelector(".top"), prog = d.querySelector(".progress"); let lastY = scrollY, ticking = false;
  let scrollHeight = html.scrollHeight;
  new ResizeObserver(() => { scrollHeight = html.scrollHeight; ticking = true; }).observe(d.body);
  addEventListener("scroll", () => { ticking = true; }, { passive: true });
  function updateScroll() {
    if (!ticking) return;
    const y = scrollY;
    top.classList.toggle("is-scrolled", y > 24);
    top.classList.toggle("is-hidden", y > lastY && y > 500 && !d.querySelector("dialog[open]") && !top.contains(d.activeElement));
    lastY = y; ticking = false;
    if (prog) prog.style.transform = `scaleX(${clamp(y / Math.max(1, scrollHeight - innerHeight), 0, 1)})`;
  }
  const areaLinks = new Map([...d.querySelectorAll(".areas-nav a")].map(a => [a.getAttribute("href").slice(1), a]));
  if (areaLinks.size) {
    const aio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { areaLinks.forEach(a => a.classList.remove("is-active")); const a = areaLinks.get(e.target.id); a && a.classList.add("is-active"); }
    }), { rootMargin: "-40% 0px -55% 0px" });
    areaLinks.forEach((a, id) => { const s = d.getElementById(id); s && aio.observe(s); });
  }
  /* ---------- llamado fijo: aparece al dejar la portada y se esconde sobre la oferta y el contacto ---------- */
  const fcta = d.querySelector(".float-cta");
  if (fcta) {
    const seen = new Set();
    const fio = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); upd(); }, { threshold: .15 });
    ["#inicio", "#servicios", "#contacto"].forEach(s => { const el = d.querySelector(s); el && fio.observe(el); });
    function upd() { fcta.classList.toggle("is-shown", seen.size === 0); }
  }
  window.Estudio = { setLang, setLight };
})();
