/* global SITE, gsap, Draggable, InertiaPlugin, Lenis */
(() => {
  const CARD_COLORS = 6;
  const PILL_COLORS = 7;
  const TIRE_COLORS = 6;
  const REVIEW_ANGLES = [-14, 6, -4, 12, -8];
  const REVIEW_COLORS = ["#fff570", "#ab6349", "#ffade4", "#25a750", "#a3daf5"];
  const REVIEW_INTERVAL_MS = 3500;
  const SHAKE_INTERVAL_MS = 4000;
  const NAV_OFFSET = -90;
  const LOADER_SEEN_KEY = "vs-loader-seen";
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

  /* ---------- Avatar: photo if provided, monogram otherwise ---------- */
  function renderAvatars() {
    document.querySelectorAll("[data-avatar]").forEach((img) => {
      const src = SITE.avatar[img.dataset.avatar];
      if (src) {
        img.src = src;
        return;
      }
      img.replaceWith(el("span", "monogram", "VS"));
    });
  }

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
  function buildCard(project, index) {
    const card = el("div", `card c${index % CARD_COLORS}`);
    // Text cards keep the name in the bottom corner, clear of the floating "Let's Talk" pill
    const textCard = () => {
      card.classList.add("text-card");
      card.prepend(el("span", "tagline", project.tagline), el("span", "name", project.name));
    };
    if (project.cover) {
      card.classList.add("shot-card");
      const frame = framedShot(project.cover, `${project.name} screenshot`);
      frame.querySelector("img").addEventListener("error", () => { frame.remove(); card.classList.remove("shot-card"); textCard(); }, { once: true });
      card.append(frame, el("span", "shot-name", project.name));
    } else {
      textCard();
    }
    card.appendChild(openProjectButton(`View ${project.name}`, index, "view"));
    return card;
  }

  function renderSliders() {
    document.querySelectorAll("[data-slider]").forEach((slider) => {
      [0, 1].forEach((copy) => {
        const set = el("div", "marquee-set");
        if (copy) set.setAttribute("aria-hidden", "true");
        SITE.projects.forEach((p, i) => {
          const card = buildCard(p, i);
          if (copy) card.querySelectorAll("a, button").forEach((a) => (a.tabIndex = -1));
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
    document.querySelectorAll("[data-tires]").forEach((set) => {
      const hidden = set.hasAttribute("aria-hidden");
      SITE.tires.forEach((t, i) => {
        const a = el("a", `tire t${i % TIRE_COLORS}`);
        a.href = t.url;
        if (!t.url.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
        if (hidden) a.tabIndex = -1;
        a.appendChild(el("span", "", t.label));
        set.appendChild(a);
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
   * Brightness grid (0..1) for the photo, cropped to cover a cols×rows grid.
   * `zoom` > 1 crops in around `focus` (0..1 of the photo). Throws if pixels are unreadable.
   */
  function sampleBrightness(img, cols, rows, zoom = 1, focus = [0.5, 0.5]) {
    const c = document.createElement("canvas");
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight) * zoom;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    // Place the focus point at the grid centre, without exposing empty edges
    const x = Math.min(0, Math.max(cols - w, cols / 2 - focus[0] * w));
    const y = Math.min(0, Math.max(rows - h, rows / 2 - focus[1] * h));
    ctx.drawImage(img, x, y, w, h);
    const data = ctx.getImageData(0, 0, cols, rows).data; // throws on file:// (tainted canvas)
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
    if (!SITE.about || !SITE.about.photo) { wrap.remove(); return; }
    const img = new Image();
    img.addEventListener("error", () => wrap.remove(), { once: true });
    img.addEventListener("load", () => {
      try {
        start(img);
      } catch {
        // Pixels unreadable (page opened straight from disk): show the plain photo instead
        canvas.replaceWith(Object.assign(img, { className: "dots-fallback", alt: "Vaibhav Sen" }));
      }
    }, { once: true });
    img.src = SITE.about.photo;

    function start(photo) {
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
        const lum = sampleBrightness(photo, cols, rows, SITE.about.zoom || 1, SITE.about.focus || [0.5, 0.5]);
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
  async function sendToEndpoint(form) {
    const res = await fetch(SITE.formEndpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
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
    document.querySelectorAll(".talk-float").forEach((b) => add(b, b.querySelector(".talk-pill")));
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

  function setupContact() {
    const layer = document.querySelector("[data-contact]");
    const sheet = layer.querySelector(".contact-sheet");
    const form = document.querySelector("[data-contact-form]");
    const error = document.querySelector("[data-form-error]");
    const success = document.querySelector("[data-form-success]");
    const sendBtn = form.querySelector(".send-btn");
    const animate = hasGsap && !reduceMotion;
    let opener = null;
    let closing = false;
    const open = (e) => {
      opener = e.currentTarget;
      closing = false;
      form.hidden = false;
      success.hidden = true;
      layer.hidden = false;
      if (lenis) lenis.stop();
      document.body.style.overflow = "hidden";
      if (animate) inkOpen(layer, sheet, opener, [...sheet.querySelectorAll(".contact-form:not([hidden]) > :not(.form-error), .form-success:not([hidden]) > *")]);
      form.querySelector("input").focus({ preventScroll: true });
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
      // The ink drains back into the button that opened it (if it's still on screen)
      const target = opener && opener.getBoundingClientRect().width ? opener : sheet.querySelector(".close-btn");
      if (!animate) { finishClose(); return; }
      closing = true;
      inkClose(layer, sheet, target, finishClose);
    };
    document.querySelectorAll("[data-open-contact]").forEach((b) => b.addEventListener("click", open));
    document.querySelectorAll("[data-close-contact]").forEach((b) => b.addEventListener("click", close));
    layer.addEventListener("click", (e) => { if (e.target === layer) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!layer.hidden) close();
      closeMenu();
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();
      if (!name || !email || !message || !form.checkValidity()) {
        error.textContent = "Please fill in your name, a valid email and a message.";
        return;
      }
      error.textContent = "";
      if (!SITE.formEndpoint) {
        const subject = encodeURIComponent(`Hello from ${name}`);
        const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
        window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
        return;
      }
      sendBtn.disabled = true;
      sendBtn.firstChild.textContent = "Sending… ";
      try {
        await sendToEndpoint(form);
        form.reset();
        form.hidden = true;
        success.hidden = false;
        success.querySelector("button").focus();
      } catch {
        error.textContent = `Couldn’t send right now. Please email me at ${SITE.email}.`;
      } finally {
        sendBtn.disabled = false;
        sendBtn.firstChild.textContent = "Send ";
      }
    });
  }

  /* ---------- Project detail sheet ---------- */
  const SHEET_COLORS = ["#0088cc", "#ffade4", "#25a750", "#fff570", "#ab6349", "#ffa970"];

  /** Fill the sheet with one project's details; returns the parts to stagger in. */
  function renderProjectBody(body, index) {
    const p = SITE.projects[index];
    const total = String(SITE.projects.length).padStart(2, "0");
    body.replaceChildren();

    const top = el("div", "ps-top");
    top.append(el("span", "ps-chip", p.platform), el("span", "ps-count", `${String(index + 1).padStart(2, "0")} / ${total}`));
    const title = el("h2", "", p.name);
    title.id = "project-title";
    const tagline = el("p", "ps-tagline", p.tagline);

    const links = el("div", "ps-links");
    if (p.live) links.appendChild(Object.assign(externalLink("Visit live", p.live), { className: "ps-btn ps-btn-dark" }));
    if (p.source) links.appendChild(Object.assign(externalLink("Source code", p.source), { className: "ps-btn" }));

    const parts = [tagline, links];
    if (p.gallery && p.gallery.length) {
      const gallery = el("div", "ps-gallery");
      gallery.tabIndex = 0;
      gallery.setAttribute("aria-label", `${p.name} screenshots, scroll sideways`);
      p.gallery.forEach((shot, i) => {
        const f = framedShot(shot, `${p.name} screenshot ${i + 1}`);
        if (shot.wide) f.classList.add("frame-wide");
        gallery.appendChild(f);
      });
      parts.push(gallery);
    }
    const details = el("div", "ps-details");
    if (p.summary) details.appendChild(el("p", "ps-summary", p.summary));
    if (p.features && p.features.length) {
      const list = el("ul", "ps-features");
      p.features.forEach((f) => list.appendChild(el("li", "", f)));
      details.appendChild(list);
    }
    if (details.childElementCount) parts.push(details);

    const stack = el("div", "ps-stack");
    stack.appendChild(el("span", "ps-stack-label", "Built with"));
    p.stack.split(" · ").forEach((t) => stack.appendChild(el("span", "ps-chip", t)));
    parts.push(stack);

    const next = (index + 1) % SITE.projects.length;
    const nextBtn = el("button", "ps-next", `Next project: ${SITE.projects[next].name} →`);
    nextBtn.type = "button";
    nextBtn.dataset.nextProject = String(next);
    parts.push(nextBtn);

    body.append(top, title, ...parts);
    return parts;
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
      sheet.scrollTop = 0;
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

  /* ---------- Looping background music ---------- */
  const MUSIC_KEY = "vs-music"; // "off" once the visitor switches it off

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
      label.textContent = playing ? "Music on" : "Music off";
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

    // Browsers only allow sound after a user gesture, so start on the first click / tap / key
    const startOnFirstGesture = (e) => {
      if (btn.contains(e.target)) return; // the button handles itself
      if (readStore(MUSIC_KEY) !== "off" && audio.paused) play();
    };
    document.addEventListener("pointerdown", startOnFirstGesture, { once: true, capture: true });
    document.addEventListener("keydown", startOnFirstGesture, { once: true, capture: true });
  }

  function setupWorkFilter() {
    document.querySelector("[data-clear-filter]").addEventListener("click", () => filterWork(null));
  }

  /* ---------- Preloader: numbered dial spins to 100 (first visit only) ---------- */
  function runLoader() {
    const loader = document.querySelector(".loading");
    if (!hasGsap || reduceMotion || readStore(LOADER_SEEN_KEY)) { loader.remove(); return; }
    writeStore(LOADER_SEEN_KEY, "1");
    document.body.classList.add("is-loading");
    const dial = loader.querySelector(".dial");
    const numbers = [];
    for (let i = 1; i <= 100; i++) {
      const stripe = el("div", "stripe");
      stripe.style.transform = `translate(50%, -50%) rotate(${(i - 1) * 3.6}deg)`;
      const n = el("div", "number", String(i));
      stripe.appendChild(n);
      dial.appendChild(stripe);
      numbers.push(n);
    }
    gsap.set(dial, { x: -50, yPercent: -50, xPercent: 0, rotation: 0 });
    numbers[0].classList.add("on");
    let current = 0;
    const highlight = () => {
      const idx = Math.round(-gsap.getProperty(dial, "rotation") / 3.6) % 100;
      if (idx !== current) { numbers[current].classList.remove("on"); numbers[idx].classList.add("on"); current = idx; }
    };
    const stops = [68.4, 129.6, 180, 291.6];
    const first = stops[Math.floor(Math.random() * stops.length)];
    const finish = () => {
      gsap.to(loader, { height: 0, padding: 0, duration: 0.8, ease: "power4.inOut", onComplete: () => { loader.remove(); document.body.classList.remove("is-loading"); } });
    };
    // ~2.4s total: two quick spins, then the sheet slides away
    const start = () => gsap.timeline({ onComplete: finish })
      .to(dial, { rotation: -first, duration: 0.8, ease: "power3.inOut", onUpdate: highlight })
      .to(dial, { rotation: -356.4, duration: 0.8, ease: "power3.inOut", onUpdate: highlight }, "+=0.15");
    // Start right away: waiting for every font and image to finish could hold visitors for many seconds
    start();
  }

  renderAvatars();
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
  setupMotionToggle();
  setupMusic();
  setupEyes();
  setupDotPortrait();
  runLoader();
  setupDraggableSliders();
  setupShake();
  if (hasGsap && !reduceMotion) cycleReviews();
})();
