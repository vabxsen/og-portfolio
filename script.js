/* global SITE, gsap, Draggable, InertiaPlugin, Lenis */
(() => {
  const CARD_COLORS = 6;
  const PILL_COLORS = 7;
  const REVIEW_ANGLES = [-14, 6, -4, 12, -8];
  const REVIEW_COLORS = ["#fff570", "#ab6349", "#ffade4", "#25a750", "#a3daf5"];
  const REVIEW_INTERVAL_MS = 3500;
  const SHAKE_INTERVAL_MS = 4000;
  const NAV_OFFSET = -90;
  const MOTION_KEY = "vs-motion-paused";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  let motionPaused = false;

  // localStorage can throw (private mode, blocked storage); treat that as "nothing stored"
  function readStore(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable: setting just won't persist */ }
  }

  /** @param {string} tag @param {string} [className] @param {string} [text] */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function svgIcon(pathD) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  const ICONS = {
    web: "M3 5h18v12H3zM3 9h18M7 21h10M12 17v4",
    mobile: "M7 2h10v20H7zM11 18h2",
    desktop: "M2 4h20v13H2zM8 21h8M12 17v4",
    ai: "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z",
    arrow: "M7 17 17 7M9 7h8v8",
  };

  /** @param {{ live?: string, source?: string }} project */
  const primaryUrl = (project) => project.live || project.source;

  /**
   * A screenshot inside a device frame.
   * @param {{ src: string, kind: "phone" | "browser" | "icon" | "plain" }} shot
   */
  function framedShot(shot, alt) {
    const frame = el("div", `frame frame-${shot.kind}`);
    if (shot.kind === "browser") frame.appendChild(el("span", "frame-bar"));
    const img = el("img");
    img.src = shot.src;
    img.alt = alt;
    img.loading = "lazy";
    img.draggable = false;
    frame.appendChild(img);
    return frame;
  }

  function openProjectButton(label, index, className) {
    const btn = el("button", className, label);
    btn.type = "button";
    btn.dataset.openProject = String(index);
    return btn;
  }

  /* ---------- Hero slider cards ---------- */
  // Poster layout: name + tagline top-left, the screenshot (or a dotted initial) rising from the bottom edge
  function buildCard(project, index) {
    const card = el("div", `card c${index % CARD_COLORS}`);
    const head = el("div", "card-head");
    head.append(el("span", "name", project.name), el("span", "tagline", project.tagline));
    const initial = () => {
      const letter = el("span", "card-initial", project.name[0]);
      letter.setAttribute("aria-hidden", "true");
      return letter;
    };
    let visual = initial();
    if (project.cover) {
      const kind = `card-${project.cover.kind}`;
      card.classList.add(kind);
      visual = framedShot(project.cover, `${project.name} screenshot`);
      visual.classList.add("card-shot");
      // A missing screenshot falls back to the dotted initial
      visual.querySelector("img").addEventListener("error", () => { card.classList.remove(kind); visual.replaceWith(initial()); }, { once: true });
    }
    const view = openProjectButton("View project", index, "view");
    view.setAttribute("aria-label", `View ${project.name}`);
    card.append(head, visual, view);
    return card;
  }

  function renderSliders() {
    document.querySelectorAll("[data-slider]").forEach((slider) => {
      [0, 1].forEach((copy) => {
        const set = el("div", "marquee-set");
        if (copy) set.setAttribute("aria-hidden", "true");
        SITE.projects.forEach((p, i) => {
          const card = buildCard(p, i);
          // Tab skips this moving strip (a focused card would slide off screen);
          // the same projects are listed, keyboard-friendly, in the Work section
          card.querySelectorAll("a, button").forEach((a) => (a.tabIndex = -1));
          set.appendChild(card);
        });
        slider.appendChild(set);
      });
    });
  }

  /* ---------- Work list (filterable by the service rows) ---------- */
  function externalLink(label, url) {
    const a = el("a", "", `${label} ↗`);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  function renderWork() {
    const list = document.querySelector("[data-work]");
    SITE.projects.forEach((p, i) => {
      const row = el("li", `work-row w${i % CARD_COLORS}`);
      row.dataset.cats = p.cats.join(" ");
      const main = el("div", "work-main");
      const title = el("h3");
      title.appendChild(openProjectButton(p.name, i, "work-open"));
      main.append(title, el("p", "", p.tagline));
      // Clicking anywhere on the row (except its Live/Source links) opens the details
      row.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) return;
        title.querySelector("button").click();
      });
      const links = el("div", "work-links");
      if (p.live) links.appendChild(externalLink("Live", p.live));
      if (p.source) links.appendChild(externalLink("Source", p.source));
      row.append(el("span", "work-num", String(i + 1).padStart(2, "0")), main, el("span", "work-stack", p.stack), links);
      list.appendChild(row);
    });
  }

  function filterWork(cat, label) {
    const bar = document.querySelector("[data-work-filter]");
    document.querySelectorAll(".work-row").forEach((row) => {
      row.hidden = Boolean(cat) && !row.dataset.cats.split(" ").includes(cat);
    });
    bar.hidden = !cat;
    bar.querySelector("[data-filter-label]").textContent = label || "";
  }

  /* ---------- Simple marquee content ---------- */
  function renderMarquees() {
    document.querySelectorAll("[data-pills]").forEach((set) => {
      SITE.tools.forEach((t, i) => set.appendChild(el("p", `pill-item p${i % PILL_COLORS}`, t)));
    });
    document.querySelectorAll("[data-stats]").forEach((set) => {
      const hidden = set.hasAttribute("aria-hidden");
      SITE.stats.forEach((s) => {
        const circle = el("div", "stat");
        if (!hidden) circle.setAttribute("role", "listitem");
        circle.append(el("b", "", s.value), el("span", "", s.label));
        set.appendChild(circle);
      });
    });
    // Social links: the first set is the real one; the aria-hidden copy only keeps the loop seamless
    document.querySelectorAll("[data-big-links]").forEach((set) => {
      const copy = set.hasAttribute("aria-hidden");
      SITE.bigLinks.forEach((link) => {
        const a = el("a", "big-link", link.label);
        a.href = link.url;
        if (!link.url.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
        if (copy) a.tabIndex = -1;
        const arrow = el("span", "big-link-arrow", "↗");
        const star = el("span", "big-link-sep", "✦");
        arrow.setAttribute("aria-hidden", "true");
        star.setAttribute("aria-hidden", "true");
        a.appendChild(arrow);
        set.append(a, star);
      });
    });
    document.querySelectorAll("[data-ticker]").forEach((set) => {
      for (let i = 0; i < 4; i++) {
        set.appendChild(el("p", "", SITE.copyright));
        set.appendChild(el("p", "", "( © )"));
        if (SITE.music && SITE.music.credit) {
          set.appendChild(el("p", "", SITE.music.credit));
          set.appendChild(el("p", "", "( ♪ )"));
        }
      }
    });
  }

  /* ---------- Services: hover-expand rows ---------- */
  function renderServices() {
    const list = document.querySelector("[data-services]");
    SITE.services.forEach((s, i) => {
      // Each row jumps to the Work list, filtered to this kind of project
      const row = el("a", "service-row");
      row.href = "#work";
      row.setAttribute("aria-label", `See ${s.title} projects`);
      row.addEventListener("click", () => filterWork(s.cat, s.title));
      const service = el("div", `service s${i}`);
      service.appendChild(el("h3", "", s.title));
      service.appendChild(svgIcon(ICONS[s.icon]));
      service.appendChild(el("p", "", s.text));
      const arrow = el("div", `service-arrow s${i}`);
      arrow.appendChild(svgIcon(ICONS.arrow));
      row.append(service, arrow);
      list.appendChild(row);
    });
  }

  /* ---------- Scalloped sticker shape (journey cards) ---------- */
  function scallopBackground(color) {
    const size = 440;
    const r = 22;
    const step = 40;
    let circles = "";
    for (let p = r; p <= size - r; p += step) {
      circles += `<circle cx="${p}" cy="${r}" r="${r}"/><circle cx="${p}" cy="${size - r}" r="${r}"/>`;
      circles += `<circle cx="${r}" cy="${p}" r="${r}"/><circle cx="${size - r}" cy="${p}" r="${r}"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><g fill="${color}"><rect x="${r}" y="${r}" width="${size - 2 * r}" height="${size - 2 * r}"/>${circles}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function fillReview(card, item, index) {
    card.querySelector("p").textContent = `“${item.text}”`;
    card.querySelector("h4").textContent = item.title;
    card.querySelector("span").textContent = item.sub;
    card.querySelector(".badge").textContent = String(index + 1).padStart(2, "0");
    card.dataset.item = String(index);
  }

  function renderSayHi() {
    document.querySelector("[data-say-hi]").style.backgroundImage = scallopBackground("#fff570");
  }

  function renderReviews() {
    const wrap = document.querySelector("[data-reviews]");
    REVIEW_ANGLES.forEach((angle, i) => {
      const card = el("article", "review");
      card.style.backgroundImage = scallopBackground(REVIEW_COLORS[i]);
      card.style.transform = `rotate(${angle}deg)`;
      card.dataset.angle = String(angle);
      card.appendChild(el("p"));
      card.appendChild(el("div", "badge"));
      const details = el("div", "details");
      details.append(el("h4"), el("span"));
      card.appendChild(details);
      fillReview(card, SITE.journey[i % SITE.journey.length], i % SITE.journey.length);
      wrap.appendChild(card);
    });
  }

  function cycleReviews() {
    const cards = [...document.querySelectorAll(".review")];
    let lastCard = -1;
    function next() {
      if (motionPaused) return;
      let cardIdx = Math.floor(Math.random() * cards.length);
      if (cardIdx === lastCard) cardIdx = (cardIdx + 1) % cards.length;
      lastCard = cardIdx;
      const shown = new Set(cards.map((c) => c.dataset.item));
      const free = SITE.journey.map((_, i) => i).filter((i) => !shown.has(String(i)));
      if (!free.length) return;
      const itemIdx = free[Math.floor(Math.random() * free.length)];
      const card = cards[cardIdx];
      const angle = Number(card.dataset.angle);
      gsap.timeline()
        .to(card, { x: 100, y: 500, opacity: 0, rotate: angle + 45, duration: 0.4 })
        .to(card, { x: -100, y: 500, rotate: angle - 45, duration: 0.6, onComplete: () => fillReview(card, SITE.journey[itemIdx], itemIdx) })
        .to(card, { x: 0, y: 0, opacity: 1, rotate: angle, duration: 0.5 });
    }
    const section = document.querySelector(".journey");
    let timer = null;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) { next(); timer = setInterval(next, REVIEW_INTERVAL_MS); }
      if (!entry.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe(section);
  }

  /* ---------- Starburst + elastic arrow (craft section) ---------- */
  function starPath(points, outer, inner, c) {
    let d = "";
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 ? inner : outer;
      const a = (Math.PI * i) / points - Math.PI / 2;
      d += `${i ? "L" : "M"}${(c + rad * Math.cos(a)).toFixed(1)} ${(c + rad * Math.sin(a)).toFixed(1)}`;
    }
    return d + "Z";
  }

  function setupCraft() {
    document.querySelectorAll(".craft .star").forEach((p) => p.setAttribute("d", starPath(14, 200, 172, 214)));
    if (!hasGsap || reduceMotion) return;
    const craft = document.querySelector(".craft");
    const shapes = {
      rest: { line: "M356.53 214L71.47 214", top: "M214 71.47C214 144.74 278.53 214 356.53 214", bottom: "M214 356.53C214 283.26 278.53 214 356.53 214" },
      hover: { line: "M375 214L45 214", top: "M237 71.47C237 144.74 302 214 370 214", bottom: "M237 356.53C237 283.26 302 214 370 214" },
    };
    const morph = (s) => {
      const opts = { duration: 1.5, ease: "elastic.out(1, 0.3)" };
      gsap.to("#line", { ...opts, attr: { d: s.line } });
      gsap.to("#curveTop", { ...opts, attr: { d: s.top } });
      gsap.to("#curveBottom", { ...opts, attr: { d: s.bottom } });
    };
    craft.addEventListener("mouseenter", () => morph(shapes.hover));
    craft.addEventListener("mouseleave", () => morph(shapes.rest));
  }

  /* ---------- Eyes that follow the cursor (craft starburst) ---------- */
  const PUPIL_TRAVEL = 20; // max pupil offset, in SVG units
  const IDLE_GLANCE_MS = 2600;
  const BLINK_MS = 4200;

  function setupEyes() {
    const svg = document.querySelector(".craft-face svg");
    const eyes = [...document.querySelectorAll("[data-eye]")];
    const pupils = eyes.map((eye) => eye.querySelector("[data-pupil]"));
    let lastPointer = 0;
    let frame = 0;

    // Move each pupil toward a screen point, capped so it stays inside the white
    const lookAt = (x, y) => {
      const unit = svg.getBoundingClientRect().width / 428;
      eyes.forEach((eye, i) => {
        const r = eye.querySelector(".sclera").getBoundingClientRect();
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const travel = Math.min(PUPIL_TRAVEL, dist / unit / 6);
        pupils[i].style.transform = `translate(${(dx / dist) * travel}px, ${(dy / dist) * travel}px)`;
      });
    };

    window.addEventListener("pointermove", (e) => {
      lastPointer = Date.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => lookAt(e.clientX, e.clientY));
    }, { passive: true });
    window.addEventListener("pointerdown", (e) => { lastPointer = Date.now(); lookAt(e.clientX, e.clientY); }, { passive: true });

    if (reduceMotion) return;
    // With no pointer for a while (phones, keyboard users), glance around on their own
    setInterval(() => {
      if (motionPaused || Date.now() - lastPointer < IDLE_GLANCE_MS) return;
      const r = svg.getBoundingClientRect();
      const angle = Math.random() * Math.PI * 2;
      lookAt(r.left + r.width / 2 + Math.cos(angle) * 400, r.top + r.height / 2 + Math.sin(angle) * 400);
    }, IDLE_GLANCE_MS);
    setInterval(() => {
      if (motionPaused) return;
      eyes.forEach((eye) => eye.classList.add("blink"));
      setTimeout(() => eyes.forEach((eye) => eye.classList.remove("blink")), 160);
    }, BLINK_MS);
  }

  /* ---------- Dot-matrix portrait (About) ---------- */
  const DOT_PUSH_RADIUS = 90; // px around the cursor that dots react to
  const DOT_PUSH = 16; // max px a dot is pushed outward
  const DOT_INTRO_MS = 1400;

  /**
   * Brightness grid (0..1) for the portrait map, cropped to cover a cols×rows grid.
   * `zoom` > 1 crops in around `focus` (0..1 of the map).
   */
  function sampleBrightness(source, cols, rows, zoom = 1, focus = [0.5, 0.5]) {
    const c = document.createElement("canvas");
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const scale = Math.max(cols / source.width, rows / source.height) * zoom;
    const w = source.width * scale;
    const h = source.height * scale;
    // Place the focus point at the grid centre, without exposing empty edges
    const x = Math.min(0, Math.max(cols - w, cols / 2 - focus[0] * w));
    const y = Math.min(0, Math.max(rows - h, rows / 2 - focus[1] * h));
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, x, y, w, h);
    const data = ctx.getImageData(0, 0, cols, rows).data;
    const lum = [];
    for (let i = 0; i < data.length; i += 4) lum.push((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255);
    // Auto-levels: stretch the 3rd–98th percentile to 0..1 so the face pops
    const sorted = [...lum].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.03)];
    const hi = sorted[Math.floor(sorted.length * 0.98)] || 1;
    return lum.map((v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1))));
  }

  function setupDotPortrait() {
    const wrap = document.querySelector("[data-dots-wrap]");
    const canvas = wrap.querySelector("[data-dots]");
    const map = SITE.about && SITE.about.map;
    if (!map) { wrap.remove(); return; }
    start(mapToCanvas(map));

    // Turns the published brightness map (not the photo itself) into a canvas the sampler can read
    function mapToCanvas({ width, height, gray }) {
      const bytes = Uint8Array.from(atob(gray), (ch) => ch.charCodeAt(0));
      const pixels = new ImageData(width, height);
      bytes.forEach((v, i) => pixels.data.set([v, v, v, 255], i * 4));
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d").putImageData(pixels, 0, 0);
      return c;
    }

    function start(source) {
      const ctx = canvas.getContext("2d");
      let dots = [];
      let size = { w: 0, h: 0, cell: 0 };
      let pointer = null;
      let introStart = 0;
      let frame = 0;

      const build = () => {
        const box = wrap.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cols = SITE.about.columns || 52;
        const cell = box.width / cols;
        const rows = Math.round(box.height / cell);
        const lum = sampleBrightness(source, cols, rows, SITE.about.zoom || 1, SITE.about.focus || [0.5, 0.5]);
        size = { w: box.width, h: box.height, cell };
        dots = [];
        lum.forEach((v, i) => {
          // gamma < 1 lifts mid-tones so eyes, beard and hair edges keep some dots
          const r = Math.pow(v, SITE.about.gamma || 0.8) * cell * 0.5;
          if (r < cell * 0.06) return; // skip near-black cells: keeps the background clean
          dots.push({ x: (i % cols + 0.5) * cell, y: (Math.floor(i / cols) + 0.5) * cell, r, ox: 0, oy: 0, s: 1, row: Math.floor(i / cols) / rows });
        });
      };

      const draw = (now) => {
        ctx.clearRect(0, 0, size.w, size.h);
        const intro = reduceMotion ? 1 : Math.min(1, (now - introStart) / DOT_INTRO_MS);
        let moving = intro < 1;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (const d of dots) {
          let tx = 0, ty = 0, ts = 1;
          if (pointer) {
            const dx = d.x - pointer.x;
            const dy = d.y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < DOT_PUSH_RADIUS) {
              const f = Math.pow(1 - dist / DOT_PUSH_RADIUS, 2);
              tx = (dx / (dist || 1)) * f * DOT_PUSH;
              ty = (dy / (dist || 1)) * f * DOT_PUSH;
              ts = 1 + f * 0.6;
            }
          }
          d.ox += (tx - d.ox) * 0.18;
          d.oy += (ty - d.oy) * 0.18;
          d.s += (ts - d.s) * 0.18;
          if (Math.abs(tx - d.ox) > 0.1 || Math.abs(ty - d.oy) > 0.1 || Math.abs(ts - d.s) > 0.01) moving = true;
          else { d.ox = tx; d.oy = ty; d.s = ts; } // snap the last sub-pixel so the loop can stop
          // Intro: dots ripple in from the top
          const grow = Math.min(1, Math.max(0, intro * 1.6 - d.row * 0.6));
          const r = d.r * d.s * (1 - Math.pow(1 - grow, 3));
          if (r <= 0.2) continue;
          ctx.moveTo(d.x + d.ox + r, d.y + d.oy);
          ctx.arc(d.x + d.ox, d.y + d.oy, r, 0, Math.PI * 2);
        }
        ctx.fill();
        frame = moving || pointer ? requestAnimationFrame(draw) : 0;
      };
      const kick = () => { if (!frame) frame = requestAnimationFrame(draw); };

      build();
      // Start the ripple-in the first time the portrait scrolls into view
      new IntersectionObserver(([entry], obs) => {
        if (!entry.isIntersecting) return;
        introStart = performance.now();
        kick();
        obs.disconnect();
      }, { threshold: 0.25 }).observe(wrap);

      canvas.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        kick();
      });
      canvas.addEventListener("pointerleave", () => { pointer = null; kick(); });

      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { build(); introStart = performance.now() - DOT_INTRO_MS; kick(); }, 150);
      });
    }
  }

  /* ---------- Infinite draggable sliders ---------- */
  function setupDraggableSliders() {
    if (!hasGsap || typeof Draggable === "undefined") return;
    gsap.registerPlugin(Draggable, InertiaPlugin);
    document.querySelectorAll("[data-slider]").forEach((slider) => {
      const setWidth = () => slider.firstElementChild.offsetWidth;
      const wrapX = (x) => gsap.utils.wrap(-setWidth(), 0, x);
      const keepInRange = function () {
        const wrapped = wrapX(this.x);
        if (wrapped !== this.x) { gsap.set(slider, { x: wrapped }); this.update(); }
      };
      Draggable.create(slider, { type: "x", inertia: true, dragClickables: false, onDrag: keepInRange, onThrowUpdate: keepInRange });
    });
  }

  /* ---------- "Always building" ring shake ---------- */
  function setupShake() {
    if (!hasGsap || reduceMotion) return;
    const target = document.querySelector(".since");
    setInterval(() => {
      if (motionPaused) return;
      gsap.timeline().to(target, { x: 20, duration: 0.1 }).to(target, { x: -20, duration: 0.1 })
        .to(target, { x: 20, duration: 0.1 }).to(target, { x: -20, duration: 0.1 })
        .to(target, { x: 20, duration: 0.1 }).to(target, { x: 0, duration: 0.1 });
    }, SHAKE_INTERVAL_MS);
  }

  /* ---------- Smooth scroll + anchor links ---------- */
  let lenis = null;
  function setupScroll() {
    if (typeof Lenis !== "undefined" && !reduceMotion) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(target, { offset: NAV_OFFSET });
        else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + NAV_OFFSET });
      });
    });
  }

  /* ---------- Menu dropdown ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const menuList = document.getElementById("menu-list");
  function closeMenu() {
    menuList.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  function setupMenu() {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menuList.classList.contains("active");
      menuList.classList.toggle("active", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => { if (!menuList.contains(e.target)) closeMenu(); });
  }

  /* ---------- Copy to clipboard ---------- */
  function toast(message) {
    const label = document.querySelector(".copy-label");
    label.textContent = message;
    label.classList.add("show");
    setTimeout(() => label.classList.remove("show"), 2000);
  }
  function setupCopy() {
    document.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          toast("Copied to clipboard");
        } catch {
          toast(`Couldn’t copy — it’s ${btn.dataset.copy}`);
        }
      });
    });
  }

  /* ---------- Contact sheet ---------- */
  /** @param {Record<string, string>} fields */
  async function sendToEndpoint(fields) {
    const body = new FormData();
    Object.entries(fields).forEach(([name, value]) => body.append(name, value));
    const res = await fetch(SITE.formEndpoint, { method: "POST", body, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Form service responded ${res.status}`);
  }

  /* ---------- Circular reveal on "Let's Talk" buttons ---------- */
  // A fill circle grows from where the pointer enters and shrinks toward where it leaves.
  function setupButtonReveal() {
    const add = (trigger, target) => {
      const fill = el("span", "reveal");
      fill.setAttribute("aria-hidden", "true");
      target.appendChild(fill);
      const setOrigin = (e) => {
        const box = target.getBoundingClientRect();
        target.style.setProperty("--x", `${e.clientX - box.left}px`);
        target.style.setProperty("--y", `${e.clientY - box.top}px`);
      };
      trigger.addEventListener("pointerenter", setOrigin);
      trigger.addEventListener("pointerleave", setOrigin);
      // Keyboard focus reveals from the centre
      trigger.addEventListener("focus", () => { target.style.setProperty("--x", "50%"); target.style.setProperty("--y", "50%"); });
    };
    document.querySelectorAll(".contact-pill, .contact-arrow").forEach((t) => add(t, t));
    document.querySelectorAll(".talk-sticker").forEach((b) => add(b, b.querySelector(".talk-core")));
  }

  /* ---------- Ink-drop open / close for the contact sheet ---------- */
  const INK_OPEN_S = 0.75;
  const INK_CLOSE_S = 0.5;

  /** Wrap each word of the sheet headline in a span once, keeping the serif "Let's". */
  function splitHeadlineWords(h2) {
    if (h2.dataset.split) return [...h2.querySelectorAll(".word")];
    const words = [];
    [...h2.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add("word");
        words.push(node);
        return;
      }
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const span = el("span", "word", part);
        words.push(span);
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    });
    h2.dataset.split = "1";
    return words;
  }

  /** Circle clip (in sheet coordinates) centred on `origin`, big enough to cover the whole sheet. */
  function inkCircle(sheet, origin) {
    const s = sheet.getBoundingClientRect();
    const o = origin.getBoundingClientRect();
    const x = o.left + o.width / 2 - s.left;
    const y = o.top + o.height / 2 - s.top;
    const r = Math.max(...[[0, 0], [s.width, 0], [0, s.height], [s.width, s.height]].map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
    return { from: `circle(0px at ${x}px ${y}px)`, to: `circle(${Math.ceil(r)}px at ${x}px ${y}px)` };
  }

  /** @param {Element[]} parts elements that slide up one after another once the ink lands */
  function inkOpen(layer, sheet, origin, parts) {
    const words = splitHeadlineWords(sheet.querySelector("h2"));
    const closeBtn = sheet.querySelector(".close-btn");
    const circle = inkCircle(sheet, origin);
    gsap.killTweensOf([layer, sheet, closeBtn, ...words, ...parts]);
    // Fade the blur veil via --veil, not the layer's opacity: opacity on the parent would switch the blur off mid-fade
    return gsap.timeline()
      .fromTo(layer, { "--veil": 0 }, { "--veil": 1, duration: 0.35, ease: "power1.out" }, 0)
      .fromTo(sheet, { clipPath: circle.from }, { clipPath: circle.to, duration: INK_OPEN_S, ease: "power3.inOut", clearProps: "clipPath" }, 0)
      .fromTo(words, { yPercent: 120, rotate: 10, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.8)" }, INK_OPEN_S * 0.45)
      .fromTo(parts, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: "power3.out" }, INK_OPEN_S * 0.6)
      .fromTo(closeBtn, { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2.2)" }, INK_OPEN_S * 0.7);
  }

  function inkClose(layer, sheet, origin, done) {
    const circle = inkCircle(sheet, origin);
    gsap.killTweensOf([layer, sheet]);
    gsap.timeline({ onComplete: done })
      .fromTo(sheet, { clipPath: circle.to }, { clipPath: circle.from, duration: INK_CLOSE_S, ease: "power3.in" }, 0)
      .to(layer, { "--veil": 0, duration: 0.3, ease: "power1.in" }, INK_CLOSE_S - 0.25)
      .set(sheet, { clearProps: "clipPath" })
      .set(layer, { "--veil": 1 });
  }

  /* ---------- Envelope open / close for the contact form ---------- */
  // The form itself plays the letter: shrunk to tuck inside the envelope, then lifted out and grown into place.
  function envelopeFit(layer, sheet) {
    const back = layer.querySelector(".env-back");
    const scale = Math.min((back.offsetWidth * 0.84) / sheet.offsetWidth, (back.offsetHeight * 0.8) / sheet.offsetHeight);
    const letterH = sheet.offsetHeight * scale;
    const half = back.offsetHeight / 2;
    // On short screens the lifted letter would reach under the navbar: rest the envelope lower so it fits
    const room = layer.clientHeight / 2 - parseFloat(getComputedStyle(layer).paddingTop);
    const drop = Math.max(0, half + 6 + letterH - room);
    return {
      scale,
      drop,
      inY: drop - half + 14 + letterH / 2, // tucked in, its top just below the envelope's top edge
      outY: drop - half - letterH / 2 - 6, // lifted clear, resting just above the envelope
      env: [...layer.querySelectorAll(".env")],
      front: layer.querySelector(".env-front"),
      flap: layer.querySelector(".env-flap"),
    };
  }

  /** @param {Element[]} parts elements that slide up one after another once the letter is out */
  function envelopeOpen(layer, sheet, parts) {
    const { scale, drop, inY, outY, env, front, flap } = envelopeFit(layer, sheet);
    const words = splitHeadlineWords(sheet.querySelector("h2"));
    const closeBtn = sheet.querySelector(".close-btn");
    gsap.killTweensOf([layer, sheet, ...env, ...words, ...parts, closeBtn]);
    gsap.set(env, { opacity: 1, y: -innerHeight, rotation: -8 });
    gsap.set(front, { zIndex: 3 });
    gsap.set(flap, { rotationX: 0, zIndex: 4, transformPerspective: 900 });
    gsap.set(sheet, { scale, y: inY, opacity: 0 });
    return gsap.timeline()
      .fromTo(layer, { "--veil": 0 }, { "--veil": 1, duration: 0.3, ease: "power1.out" }, 0)
      .to(env, { y: drop, rotation: 0, duration: 0.55, ease: "back.out(1.4)" }, 0) // drops in
      .set(sheet, { opacity: 1 }, 0.5) // inside, hidden by the front pocket and the closed flap
      .to(flap, { rotationX: 180, duration: 0.4, ease: "power2.inOut" }, 0.6) // flap swings open…
      .set(flap, { zIndex: 1 }, 0.8) // …and past halfway falls behind the letter
      .to(sheet, { y: outY, duration: 0.4, ease: "power2.out" }, 0.95) // the letter slides up out
      .set(front, { zIndex: 1 }, 1.3) // now clear of the pocket: the envelope falls behind the growing letter
      .to(env, { y: innerHeight * 0.75, rotation: 10, duration: 0.55, ease: "power2.in" }, 1.3) // envelope drops away
      .to(sheet, { y: 0, scale: 1, duration: 0.6, ease: "power3.out" }, 1.3) // letter grows into place
      .fromTo(words, { yPercent: 120, rotate: 10, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.8)" }, 1.55)
      .fromTo(parts, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power3.out" }, 1.6)
      .fromTo(closeBtn, { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.2)" }, 1.7)
      .set(sheet, { clearProps: "transform,opacity" })
      .set(env, { opacity: 0 });
  }

  function envelopeClose(layer, sheet, done) {
    const { scale, drop, inY, outY, env, front, flap } = envelopeFit(layer, sheet);
    gsap.killTweensOf([layer, sheet, ...env]);
    gsap.set(env, { opacity: 1, y: innerHeight * 0.75, rotation: 10 });
    gsap.set(front, { zIndex: 1 });
    gsap.set(flap, { rotationX: 180, zIndex: 1, transformPerspective: 900 });
    return gsap.timeline({ onComplete: done })
      .to(sheet, { y: outY, scale, duration: 0.45, ease: "power3.inOut" }, 0) // the letter shrinks…
      .to(env, { y: drop, rotation: 0, duration: 0.45, ease: "power3.out" }, 0) // …as the envelope rises behind it
      .set(front, { zIndex: 3 }, 0.45) // the pocket comes in front again…
      .to(sheet, { y: inY, duration: 0.25, ease: "power2.in" }, 0.45) // …as the letter tucks in
      .to(flap, { rotationX: 0, duration: 0.3, ease: "power2.inOut" }, 0.65) // flap closes…
      .set(flap, { zIndex: 4 }, 0.8) // …over the letter
      .set(sheet, { opacity: 0 }, 0.95)
      .to(env, { y: -innerHeight, rotation: -12, duration: 0.45, ease: "power3.in" }, 0.95) // and off it flies
      .to(layer, { "--veil": 0, duration: 0.3, ease: "power1.in" }, 1.1)
      .set(sheet, { clearProps: "transform,opacity" })
      .set(env, { opacity: 0 })
      .set(layer, { "--veil": 1 });
  }

  /* ---------- Contact chat ---------- */
  // The contact form as a chat: it asks for a name, a message and an email, one at a time.
  // Its lines come from SITE.chat; answers only ever go in as text, never as HTML.
  const CHAT_STEPS = [
    { key: "name", line: "hello", label: "Your name", hint: "Type your name", type: "text", autocomplete: "name" },
    { key: "message", line: "message", label: "Your message", hint: "Type your message", multiline: true },
    { key: "email", line: "email", label: "Your email", hint: "you@example.com", type: "email", autocomplete: "email" },
  ];
  const CHAT_START_MS = 1700; // the first question waits for the envelope to deliver the chat
  const CHAT_BOX_MAX_PX = 160;

  /** How long "typing" shows before a line lands: a little longer for longer lines. */
  const typingMs = (text) => Math.min(350 + text.length * 8, 1000);

  function setupChat(sheet) {
    const log = sheet.querySelector("[data-chat-log]");
    const bar = sheet.querySelector("[data-chat-form]");
    const line = bar.querySelector("[data-chat-line]");
    const box = bar.querySelector("[data-chat-box]");
    const done = sheet.querySelector("[data-chat-done]");
    const sendBtn = done.querySelector("[data-chat-send]");
    const restartBtn = done.querySelector("[data-chat-restart]");
    let answers = {};
    let step = -1; // -1: not started; CHAT_STEPS.length: everything answered
    let pending = null; // a line on its way (waiting or "typing")
    let opened = false; // the email app was opened at least once

    const fill = (text) => text.replace(/\{(\w+)\}/g, (match, key) => (key === "email" ? SITE.email : answers[key] || match));
    const field = () => (CHAT_STEPS[step] && CHAT_STEPS[step].multiline ? box : line);
    const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    const grow = () => {
      box.style.height = "";
      if (box.scrollHeight > box.clientHeight) box.style.height = `${Math.min(box.scrollHeight, CHAT_BOX_MAX_PX)}px`;
    };

    function bubble(text, who) {
      const b = el("p", `bubble ${who}`);
      b.append(el("span", "sr-only", who === "me" ? "You: " : "Vaibhav: "), text);
      log.append(b);
      scrollDown();
    }

    /** Vaibhav "types" for a moment, then the line lands; `then` runs once it's shown. */
    function say(key, { delay = 0, then } = {}) {
      if (pending) pending.land();
      const text = fill(SITE.chat[key]);
      const reply = { timer: 0, dots: null };
      reply.cancel = () => {
        clearTimeout(reply.timer);
        if (reply.dots) reply.dots.remove();
        if (pending === reply) pending = null;
      };
      reply.land = () => {
        reply.cancel();
        bubble(text, "bot");
        if (then) then();
      };
      const type = () => {
        if (reduceMotion) { reply.land(); return; }
        reply.dots = el("p", "bubble bot typing");
        reply.dots.setAttribute("aria-hidden", "true");
        reply.dots.append(el("span"), el("span"), el("span"));
        log.append(reply.dots);
        scrollDown();
        reply.timer = setTimeout(reply.land, typingMs(text));
      };
      pending = reply;
      if (delay) reply.timer = setTimeout(type, delay);
      else type();
    }

    /** Switch the answer field to suit question `i` (one line, or a box for the message), then ask it. */
    function ask(i, delay = 0) {
      const s = CHAT_STEPS[i];
      const hadFocus = document.activeElement === line || document.activeElement === box;
      step = i;
      line.hidden = Boolean(s.multiline);
      box.hidden = !s.multiline;
      if (!s.multiline) {
        line.type = s.type;
        line.setAttribute("autocomplete", s.autocomplete);
        line.setAttribute("inputmode", s.type === "email" ? "email" : "text");
      }
      const f = field();
      f.setAttribute("aria-label", s.label);
      f.placeholder = s.hint;
      f.value = "";
      if (hadFocus) f.focus({ preventScroll: true });
      say(s.line, { delay });
    }

    function answer(e) {
      e.preventDefault();
      if (step < 0 || step >= CHAT_STEPS.length) return;
      const s = CHAT_STEPS[step];
      const f = field();
      const value = s.multiline ? f.value.trim() : f.value.trim().replace(/\s+/g, " ");
      if (!value) { f.focus({ preventScroll: true }); return; }
      const valid = s.type !== "email" || line.checkValidity();
      if (pending) pending.land(); // answered before the question finished "typing": show the question first
      bubble(value, "me");
      f.value = "";
      grow();
      if (!valid) { say("badEmail"); return; }
      answers = { ...answers, [s.key]: value };
      if (step + 1 < CHAT_STEPS.length) ask(step + 1);
      else finish();
    }

    // All answered: once the last line lands, the answer bar turns into Send and Start over
    function finish() {
      step = CHAT_STEPS.length;
      say("ready", {
        then: () => {
          const hadFocus = bar.contains(document.activeElement);
          bar.hidden = true;
          done.hidden = false;
          scrollDown();
          if (hadFocus) sendBtn.focus({ preventScroll: true });
        },
      });
    }

    async function send() {
      const { name, message, email } = answers;
      if (!SITE.formEndpoint) {
        const subject = encodeURIComponent(`Hello from ${name}`);
        const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
        window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
        if (!opened) say("opened");
        opened = true;
        return;
      }
      sendBtn.disabled = true;
      sendBtn.firstChild.textContent = "Sending… ";
      try {
        await sendToEndpoint({ name, email, message });
        sendBtn.hidden = true;
        restartBtn.focus({ preventScroll: true });
        say("sent");
      } catch {
        say("failed");
      } finally {
        sendBtn.disabled = false;
        sendBtn.firstChild.textContent = "Send ";
      }
    }

    function restart() {
      if (pending) pending.cancel();
      log.replaceChildren();
      answers = {};
      opened = false;
      sendBtn.hidden = false;
      done.hidden = true;
      bar.hidden = false;
      ask(0);
      line.focus({ preventScroll: true });
    }

    bar.addEventListener("submit", answer);
    box.addEventListener("input", grow);
    // In the message box, Enter sends and Shift+Enter starts a new line
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) answer(e);
    });
    // Pressing the arrow mustn't pull focus out of the field (on phones that would drop the keyboard)
    bar.querySelector(".chat-send").addEventListener("mousedown", (e) => e.preventDefault());
    sendBtn.addEventListener("click", send);
    restartBtn.addEventListener("click", restart);

    return {
      /** Starts the conversation on the first open; later opens carry on where it left off. */
      start: (delay) => { if (step < 0) ask(0, delay); },
      /** Where focus goes when the chat opens. */
      focusTarget: () => {
        if (done.hidden) return field();
        return sendBtn.hidden ? restartBtn : sendBtn;
      },
    };
  }

  function setupContact() {
    const layer = document.querySelector("[data-contact]");
    const sheet = layer.querySelector(".contact-sheet");
    const chat = setupChat(sheet);
    const animate = hasGsap && !reduceMotion;
    let opener = null;
    let closing = false;
    let anim = null; // the envelope animation in flight
    const open = (e) => {
      if (!layer.hidden && !closing) return; // already open: don't replay the envelope
      opener = e.currentTarget;
      closing = false;
      if (anim) anim.kill(); // reopened mid-close: that close must not finish and hide the chat
      layer.hidden = false;
      if (lenis) lenis.stop();
      document.body.style.overflow = "hidden";
      if (animate) anim = envelopeOpen(layer, sheet, [...sheet.querySelectorAll(".chat-avatar, .chat-who p, .chat-log, .chat-bar:not([hidden]), .chat-done:not([hidden])")]);
      else if (hasGsap) gsap.fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: "opacity" }); // reduced motion: a quick fade
      chat.start(animate ? CHAT_START_MS : 0);
      // On touch screens, focusing a field would pop the keyboard over the opening chat
      const touch = window.matchMedia("(pointer: coarse)").matches;
      (touch ? sheet.querySelector(".close-btn") : chat.focusTarget()).focus({ preventScroll: true });
    };
    const finishClose = () => {
      anim = null;
      layer.hidden = true;
      closing = false;
      if (lenis) lenis.start();
      document.body.style.overflow = "";
      if (opener) opener.focus({ preventScroll: true });
    };
    const close = () => {
      if (layer.hidden || closing) return;
      if (!animate) { finishClose(); return; }
      closing = true;
      // Closed before it finished opening: rewind the opening, so the letter goes back the way it came
      if (anim && anim.isActive()) anim.eventCallback("onReverseComplete", finishClose).timeScale(1.6).reverse();
      else anim = envelopeClose(layer, sheet, finishClose);
    };
    document.querySelectorAll("[data-open-contact]").forEach((b) => b.addEventListener("click", open));
    document.querySelectorAll("[data-close-contact]").forEach((b) => b.addEventListener("click", close));
    layer.addEventListener("click", (e) => { if (e.target === layer) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!layer.hidden) close();
      closeMenu();
    });
  }

  /* ---------- Project detail sheet ---------- */
  const SHEET_COLORS = ["#0088cc", "#ffade4", "#25a750", "#fff570", "#ab6349", "#ffa970"];

  /** Screenshots that scroll sideways, or the dotted initial when a project has none. */
  function projectMedia(p) {
    const media = el("div", "ps-media");
    if (!p.gallery || !p.gallery.length) {
      const letter = el("span", "ps-initial", p.name[0]);
      letter.setAttribute("aria-hidden", "true");
      media.appendChild(letter);
      return media;
    }
    const gallery = el("div", "ps-gallery");
    gallery.tabIndex = 0;
    gallery.setAttribute("aria-label", `${p.name} screenshots, scroll sideways`);
    p.gallery.forEach((shot, i) => {
      const f = framedShot(shot, `${p.name} screenshot ${i + 1}`);
      if (shot.wide) f.classList.add("frame-wide");
      gallery.appendChild(f);
    });
    media.appendChild(gallery);
    return media;
  }

  /** Fill the sheet with one project's details; returns the parts to stagger in. */
  function renderProjectBody(body, index) {
    const p = SITE.projects[index];
    const total = String(SITE.projects.length).padStart(2, "0");
    body.replaceChildren();

    const top = el("div", "ps-top");
    top.append(el("span", "ps-chip", p.platform), el("span", "ps-count", `${String(index + 1).padStart(2, "0")} / ${total}`));

    // The words get their own column, which scrolls if a project has a lot to say
    const info = el("div", "ps-info");
    const title = el("h2", "", p.name);
    title.id = "project-title";
    const tagline = el("p", "ps-tagline", p.tagline);
    const links = el("div", "ps-links");
    if (p.live) links.appendChild(Object.assign(externalLink("Visit live", p.live), { className: "ps-btn ps-btn-dark" }));
    if (p.source) links.appendChild(Object.assign(externalLink("Source code", p.source), { className: "ps-btn" }));
    info.append(title, tagline, links);
    const parts = [tagline, links];

    const details = el("div", "ps-details");
    if (p.summary) details.appendChild(el("p", "ps-summary", p.summary));
    if (p.features && p.features.length) {
      const list = el("ul", "ps-features");
      p.features.forEach((f) => list.appendChild(el("li", "", f)));
      details.appendChild(list);
    }
    if (details.childElementCount) { info.appendChild(details); parts.push(details); }

    const stack = el("div", "ps-stack");
    stack.appendChild(el("span", "ps-stack-label", "Built with"));
    p.stack.split(" · ").forEach((t) => stack.appendChild(el("span", "ps-chip", t)));
    info.appendChild(stack);

    const foot = el("div", "ps-foot");
    const next = (index + 1) % SITE.projects.length;
    const nextBtn = el("button", "ps-next", `Next project: ${SITE.projects[next].name} →`);
    nextBtn.type = "button";
    nextBtn.dataset.nextProject = String(next);
    foot.appendChild(nextBtn);

    const media = projectMedia(p);
    body.append(top, info, media, foot);
    return [...parts, stack, media, foot];
  }

  function setupProjectSheet() {
    const layer = document.querySelector("[data-project-layer]");
    // A stale cached index.html (right after a deploy) won't have the sheet; don't take the rest of the page down
    if (!layer) return;
    const sheet = layer.querySelector(".project-sheet");
    const body = sheet.querySelector("[data-project-body]");
    const closeBtn = sheet.querySelector("[data-close-project]");
    const animate = hasGsap && !reduceMotion;
    let opener = null;
    let closing = false;

    const show = (index) => {
      sheet.style.setProperty("--sheet", SHEET_COLORS[index % SHEET_COLORS.length]);
      return renderProjectBody(body, index);
    };
    const open = (btn) => {
      opener = btn;
      closing = false;
      const parts = show(Number(btn.dataset.openProject));
      layer.hidden = false;
      if (lenis) lenis.stop();
      document.body.style.overflow = "hidden";
      if (animate) inkOpen(layer, sheet, opener, parts);
      closeBtn.focus({ preventScroll: true });
    };
    const finishClose = () => {
      layer.hidden = true;
      closing = false;
      if (lenis) lenis.start();
      document.body.style.overflow = "";
      if (opener) opener.focus({ preventScroll: true });
    };
    const close = () => {
      if (layer.hidden || closing) return;
      const target = opener && opener.getBoundingClientRect().width ? opener : closeBtn;
      if (!animate) { finishClose(); return; }
      closing = true;
      inkClose(layer, sheet, target, finishClose);
    };

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-project]");
      if (btn) { open(btn); return; }
      const nextBtn = e.target.closest("[data-next-project]");
      if (!nextBtn) return;
      const parts = show(Number(nextBtn.dataset.nextProject));
      if (animate) gsap.fromTo([body.querySelector("h2"), ...parts], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: "power3.out" });
      sheet.querySelector("[data-next-project]").focus({ preventScroll: true });
    });
    closeBtn.addEventListener("click", close);
    layer.addEventListener("click", (e) => { if (e.target === layer) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !layer.hidden) close(); });
  }

  /* ---------- Social links strip: keep a keyboard-focused link on screen ---------- */
  function setupBigLinks() {
    const strip = document.querySelector(".big-links");
    if (!strip) return;
    // The strip pauses while it holds focus (CSS); jump both copies of the loop so the word sits at the left
    strip.addEventListener("focusin", (e) => {
      const link = e.target.closest(".big-link");
      if (!link) return;
      const sets = [...strip.querySelectorAll(".marquee-set")];
      const progress = Math.max(0, (link.offsetLeft - sets[0].offsetLeft - 32) / sets[0].offsetWidth);
      sets.forEach((set) => set.getAnimations().forEach((anim) => { anim.currentTime = progress * anim.effect.getTiming().duration; }));
    });
  }

  /* ---------- Pause / play all motion ---------- */
  function setupMotionToggle() {
    const btn = document.querySelector("[data-motion-toggle]");
    if (reduceMotion) { btn.remove(); return; }
    const apply = (paused) => {
      motionPaused = paused;
      document.body.classList.toggle("motion-paused", paused);
      btn.setAttribute("aria-pressed", String(paused));
      btn.textContent = paused ? "Play motion" : "Pause motion";
    };
    apply(readStore(MOTION_KEY) === "1");
    btn.addEventListener("click", () => {
      apply(!motionPaused);
      writeStore(MOTION_KEY, motionPaused ? "1" : "0");
    });
  }

  /* ---------- Looping background music (opt-in) ---------- */
  const MUSIC_KEY = "vs-music"; // "on" once the visitor chooses music, "off" once they turn it off

  function setupMusic() {
    const audio = document.querySelector("[data-music]");
    const btn = document.querySelector("[data-music-toggle]");
    const label = btn.querySelector("[data-music-label]");
    if (!SITE.music || !SITE.music.src) return;

    audio.volume = SITE.music.volume ?? 0.35;
    const sync = () => {
      const playing = !audio.paused;
      btn.setAttribute("aria-pressed", String(playing));
      btn.classList.toggle("playing", playing);
      label.textContent = playing ? "Music on" : "Play music";
    };
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    // Only reveal the button once the file is known to exist and be playable
    audio.addEventListener("loadedmetadata", () => { btn.hidden = false; }, { once: true });
    audio.addEventListener("error", () => { btn.hidden = true; }, { once: true });
    audio.src = SITE.music.src;

    const play = () => audio.play().catch(() => { /* blocked or unavailable: stay silent, button still works */ });

    btn.addEventListener("click", () => {
      if (audio.paused) { writeStore(MUSIC_KEY, "on"); play(); }
      else { writeStore(MUSIC_KEY, "off"); audio.pause(); }
    });

    // Music is opt-in: it only plays from the ♪ button. A visitor who turned it on before gets it back
    // on their first click / tap / key (browsers block sound until a user gesture).
    if (readStore(MUSIC_KEY) !== "on") return;
    const resumeOnFirstGesture = (e) => {
      if (btn.contains(e.target)) return; // the button handles itself
      if (audio.paused) play();
    };
    document.addEventListener("pointerdown", resumeOnFirstGesture, { once: true, capture: true });
    document.addEventListener("keydown", resumeOnFirstGesture, { once: true, capture: true });
  }

  /* ---------- Phones: Pause motion and Play music move into the menu ---------- */
  // Floating in the bottom corners they covered the page on small screens, so there they become menu items.
  // The buttons themselves move (not copies), so their labels and state stay in one place.
  function setupPhoneControls() {
    const phone = window.matchMedia("(max-width: 720px)");
    const buttons = [...document.querySelectorAll("[data-motion-toggle], [data-music-toggle]")];
    if (!buttons.length) return;
    const homes = buttons.map((btn) => ({ btn, parent: btn.parentNode, next: btn.nextSibling }));
    const slot = el("li", "menu-controls");
    const place = () => {
      if (phone.matches) {
        slot.append(...buttons);
        menuList.append(slot);
        return;
      }
      homes.forEach(({ btn, parent, next }) => parent.insertBefore(btn, next));
      slot.remove();
    };
    place();
    phone.addEventListener("change", place);
  }

  function setupWorkFilter() {
    document.querySelector("[data-clear-filter]").addEventListener("click", () => filterWork(null));
  }

  /* ---------- Intro (every page load): a dot swarm spells the name, then flies into the navbar logo ---------- */
  const INTRO_ROWS = 14; // dots across the height of a capital letter
  const INTRO_WIDTH = 0.86; // the spelled-out name spans this share of the screen width…
  const INTRO_MAX_WIDTH = 1100; // …up to this many px
  const INTRO_FONT_WAIT_MS = 800; // longest we wait for the logo font before drawing anyway
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  /**
   * Dot positions that spell the logo text, in the logo's own px (0,0 = its top-left corner).
   * Each letter is drawn where the browser placed it in the navbar, so kerning and letter-spacing match.
   */
  function sampleLogoDots(textEl, scale) {
    const node = textEl.firstChild;
    const box = textEl.getBoundingClientRect();
    const cs = getComputedStyle(textEl);
    const size = parseFloat(cs.fontSize) * scale;
    const pad = Math.ceil(size * 0.2);
    const c = document.createElement("canvas");
    c.width = Math.ceil(box.width * scale) + pad * 2;
    c.height = Math.ceil(box.height * scale) + pad * 2;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const m = ctx.measureText(node.data);
    const ascent = m.fontBoundingBoxAscent ?? size * 0.8;
    const descent = m.fontBoundingBoxDescent ?? size * 0.2;
    // The baseline sits in the middle of any extra line height, as it does in the navbar
    const baseline = pad + (box.height * scale - ascent - descent) / 2 + ascent;
    const range = document.createRange();
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      ctx.fillText(node.data[i], pad + (range.getBoundingClientRect().left - box.left) * scale, baseline);
    }
    const step = Math.max(3, (size * 0.72) / INTRO_ROWS); // a capital is ~0.72em tall
    const alpha = ctx.getImageData(0, 0, c.width, c.height).data;
    const points = [];
    for (let y = step / 2; y < c.height; y += step) {
      for (let x = step / 2; x < c.width; x += step) {
        if (alpha[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] > 128) points.push({ x: (x - pad) / scale, y: (y - pad) / scale });
      }
    }
    return { points, width: box.width, height: box.height, radius: (step * 0.42) / scale };
  }

  /** Gives each dot a far-off start, a curved path in, and a delay so the letters fill in left to right. */
  function scatterDots(points, width, toScreen) {
    const far = Math.hypot(innerWidth, innerHeight) * 0.6;
    return points.map((p) => {
      const end = toScreen(p);
      const angle = Math.random() * TAU;
      const reach = far * (0.8 + Math.random() * 0.5);
      const start = { x: innerWidth / 2 + Math.cos(angle) * reach, y: innerHeight / 2 + Math.sin(angle) * reach };
      const bend = (Math.random() - 0.5) * 0.8;
      const ctrl = { x: (start.x + end.x) / 2 - (end.y - start.y) * bend, y: (start.y + end.y) / 2 + (end.x - start.x) * bend };
      return { u: p, start, ctrl, end, delay: (p.x / width) * 0.35 + Math.random() * 0.15 };
    });
  }

  /** Draws the swarm on `canvas` and returns the timeline (~2.6s), so a tap can speed it up. */
  function playIntro(canvas, curtain, logoText, logoMark, done) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fff";
    const scale = Math.min(innerWidth * INTRO_WIDTH, INTRO_MAX_WIDTH) / logoText.getBoundingClientRect().width;
    const { points, width, height, radius } = sampleLogoDots(logoText, scale);
    const center = { x: innerWidth / 2, y: innerHeight / 2 };
    const dots = scatterDots(points, width, (p) => ({ x: center.x + (p.x - width / 2) * scale, y: center.y + (p.y - height / 2) * scale }));
    const state = { form: 0, shine: -0.3, fly: 0 };
    let target = center;

    const draw = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.beginPath();
      const k = Math.pow(scale, 1 - state.fly); // shrinks from the big name down to the logo's size
      const cx = lerp(center.x, target.x, state.fly);
      const cy = lerp(center.y, target.y, state.fly);
      for (const d of dots) {
        const glow = 1 + 0.45 * Math.exp(-(((d.u.x / width - state.shine) / 0.08) ** 2)); // the shimmer sweep
        let x = cx + (d.u.x - width / 2) * k;
        let y = cy + (d.u.y - height / 2) * k;
        let r = Math.max(0.6, radius * k) * glow;
        if (state.form < 1) {
          const t = 1 - (1 - Math.min(1, Math.max(0, (state.form - d.delay) / 0.5))) ** 3; // ease-out per dot
          const s = 1 - t;
          x = s * s * d.start.x + 2 * s * t * d.ctrl.x + t * t * d.end.x;
          y = s * s * d.start.y + 2 * s * t * d.ctrl.y + t * t * d.end.y;
          r *= 0.25 + 0.75 * t;
        }
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    };

    // Swarm in → shimmer → fly into the logo spot while the curtain wipes away → solid logo fades in
    return gsap.timeline({ onUpdate: draw, onComplete: done })
      .to(state, { form: 1, duration: 1, ease: "none" })
      .to(state, { shine: 1.3, duration: 0.45, ease: "power1.inOut" }, "-=0.1")
      .add(() => { const b = logoText.getBoundingClientRect(); target = { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })
      .to(state, { fly: 1, duration: 0.85, ease: "power3.inOut" })
      .fromTo(curtain, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.8, ease: "power3.inOut" }, "<")
      .to(canvas, { opacity: 0, duration: 0.3 }, ">-0.05")
      .to(logoText, { opacity: 1, duration: 0.3 }, "<")
      .fromTo(logoMark, { scale: 0, rotate: -120 }, { scale: 1, rotate: 0, duration: 0.55, ease: "back.out(2.4)" }, "<");
  }

  function runIntro() {
    const curtain = document.querySelector(".intro");
    const logoText = document.querySelector(".logo-text");
    const logoMark = document.querySelector(".logo-mark");
    // Plays on every page load, except for visitors who asked for less motion
    if (!hasGsap || reduceMotion || readStore(MOTION_KEY) === "1" || !logoText) { curtain.remove(); return; }
    document.body.classList.add("is-loading");
    if (lenis) lenis.stop();
    gsap.set(logoText, { opacity: 0 });
    gsap.set(logoMark, { scale: 0 });

    const canvas = el("canvas", "intro-dots");
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    let tl = null;
    const skip = () => { if (tl) tl.timeScale(4); }; // any click, tap or key fast-forwards it
    const finish = () => {
      canvas.remove();
      curtain.remove();
      gsap.set([logoText, logoMark], { clearProps: "opacity,transform" });
      document.body.classList.remove("is-loading");
      if (lenis) lenis.start();
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    // The dots copy the logo's letters, so wait (briefly) for its font
    const cs = getComputedStyle(logoText);
    const fontReady = document.fonts ? document.fonts.load(`${cs.fontWeight} 32px ${cs.fontFamily}`) : Promise.resolve();
    Promise.race([fontReady, new Promise((r) => setTimeout(r, INTRO_FONT_WAIT_MS))])
      .then(() => { tl = playIntro(canvas, curtain, logoText, logoMark, finish); })
      .catch(finish);
  }

  renderSliders();
  renderWork();
  renderMarquees();
  renderServices();
  renderReviews();
  renderSayHi();
  setupCraft();
  setupMenu();
  setupScroll();
  setupCopy();
  setupContact();
  setupProjectSheet();
  setupButtonReveal();
  setupWorkFilter();
  setupBigLinks();
  setupMotionToggle();
  setupMusic();
  setupPhoneControls();
  setupEyes();
  setupDotPortrait();
  runIntro();
  setupDraggableSliders();
  setupShake();
  if (hasGsap && !reduceMotion) cycleReviews();
})();
