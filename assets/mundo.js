/* Globo de «Fuera del mapa»: países donde ha estado Miguel, ciudades, vuelos aproximados y el vuelo que falta.
   Se carga solo cuando la sección se acerca. Arrastra para girarlo; gira solo si no hay «reducir movimiento». */
(function () {
  const box = document.querySelector("[data-globe]");
  if (!box) return;
  const CDN = [
    "https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js",
    "https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js",
    "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js",
  ];
  const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
  const load = src => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });

  async function start() {
    for (const s of CDN) await load(s);
    const [atlas, data] = await Promise.all([fetch(ATLAS).then(r => r.json()), fetch(box.dataset.globe).then(r => r.json())]);
    const land = topojson.feature(atlas, atlas.objects.countries).features;
    const visited = new Set(data.countries.map(c => c.id));
    const borders = topojson.mesh(atlas, atlas.objects.countries, (a, b) => a !== b);
    const legs = data.legs.map(l => ({ type: "LineString", coordinates: [l.a, l.b] }));
    const miss = { type: "LineString", coordinates: [data.missing.a, data.missing.b] };
    const grat = d3.geoGraticule10();

    const cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
    box.innerHTML = ""; box.appendChild(cv);
    const tip = document.createElement("span"); tip.className = "globe-tip"; box.appendChild(tip);
    const ctx = cv.getContext("2d");
    const proj = d3.geoOrthographic().clipAngle(90).precision(0.4);
    const path = d3.geoPath(proj, ctx);
    let rot = [74, -8, 0], W = 0, dpr = 1, col = {};
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function colors() {
      const dark = document.documentElement.dataset.theme === "dark";
      col = dark ? { sea: "#0d0d0d", ring: "#3a3a3a", land: "#2c2c2c", line: "rgba(255,255,255,.08)", border: "#0d0d0d", red: "#E2231A", arc: "#ffffff", dot: "#ffffff", ink: "#ffffff" }
                 : { sea: "#f4f4f4", ring: "#d0d0d0", land: "#d9d9d9", line: "rgba(0,0,0,.06)", border: "#f4f4f4", red: "#E2231A", arc: "#111111", dot: "#ffffff", ink: "#111111" };
    }
    new MutationObserver(colors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    colors();

    function size() {
      W = box.clientWidth; dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = W * dpr; cv.style.width = cv.style.height = W + "px";
      proj.translate([W / 2, W / 2]).scale(W / 2 - 3);
    }
    let t0 = performance.now(), hover = null;
    function draw(now) {
      proj.rotate(rot);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, W);
      ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = col.sea; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = col.ring; ctx.stroke();
      ctx.beginPath(); path(grat); ctx.strokeStyle = col.line; ctx.lineWidth = .6; ctx.stroke();
      for (const f of land) { ctx.beginPath(); path(f); ctx.fillStyle = visited.has(f.id) ? col.red : col.land; ctx.fill(); }
      ctx.beginPath(); path(borders); ctx.strokeStyle = col.border; ctx.lineWidth = .5; ctx.stroke();
      ctx.lineWidth = 1.3; ctx.strokeStyle = col.arc; ctx.globalAlpha = .75;
      for (const l of legs) { ctx.beginPath(); path(l); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -((now - t0) / 60) % 22; ctx.lineWidth = 2.2; ctx.strokeStyle = col.red;
      ctx.beginPath(); path(miss); ctx.stroke(); ctx.setLineDash([]);
      const c = [-rot[0], -rot[1]];
      for (const p of data.cities) {
        if (d3.geoDistance([p.lon, p.lat], c) > Math.PI / 2 - .05) continue;
        const [x, y] = proj([p.lon, p.lat]);
        ctx.beginPath(); ctx.arc(x, y, p === hover ? 4.5 : 2.6, 0, 7); ctx.fillStyle = col.dot; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = col.ink; ctx.stroke();
      }
    }
    // arrastrar para girar
    let drag = null, idle = 0;
    cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, r: rot.slice() }; cv.setPointerCapture(e.pointerId); box.classList.add("is-drag"); });
    cv.addEventListener("pointermove", e => {
      if (drag) {
        const k = 180 / (W * 0.9);
        rot = [drag.r[0] + (e.clientX - drag.x) * k, Math.max(-70, Math.min(70, drag.r[1] - (e.clientY - drag.y) * k)), 0];
        idle = performance.now(); return;
      }
      const b = cv.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top, c = [-rot[0], -rot[1]];
      hover = null; let best = 12;
      for (const p of data.cities) {
        if (d3.geoDistance([p.lon, p.lat], c) > Math.PI / 2) continue;
        const [x, y] = proj([p.lon, p.lat]), d = Math.hypot(x - mx, y - my);
        if (d < best) { best = d; hover = p; }
      }
      if (hover) { const [x, y] = proj([hover.lon, hover.lat]); tip.textContent = document.documentElement.dataset.lang === "en" ? hover.en : hover.es; tip.style.transform = `translate(${x + 10}px,${y - 28}px)`; tip.classList.add("on"); }
      else tip.classList.remove("on");
    });
    const end = () => { drag = null; box.classList.remove("is-drag"); idle = performance.now(); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", () => { hover = null; tip.classList.remove("on"); });
    // ir a una ciudad desde la lista
    document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => {
      const [lon, lat] = b.dataset.goto.split(",").map(Number), from = rot.slice(), to = [-lon, Math.max(-60, Math.min(60, -lat)), 0];
      if (to[0] - from[0] > 180) to[0] -= 360; if (from[0] - to[0] > 180) to[0] += 360;
      const s = performance.now(), dur = reduce ? 0 : 900; idle = s + dur + 2500;
      (function step(n) { const u = dur ? Math.min(1, (n - s) / dur) : 1, e = 1 - Math.pow(1 - u, 3);
        rot = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, 0]; if (u < 1) requestAnimationFrame(step); })(s);
    }));
    let visible = true;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
    function loop(now) {
      if (visible) {
        if (!drag && !reduce && now - idle > 2500) rot[0] = (rot[0] + 0.12) % 360;
        draw(now);
      }
      requestAnimationFrame(loop);
    }
    addEventListener("resize", () => { size(); });
    size(); requestAnimationFrame(loop);
    box.classList.add("is-ready");
  }
  let go = false;
  const run = () => { if (go) return; go = true; start().catch(() => box.classList.add("is-fail")); };
  if (!("IntersectionObserver" in window)) return run();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { run(); io.disconnect(); } }, { rootMargin: "500px" });
  io.observe(box);
})();
