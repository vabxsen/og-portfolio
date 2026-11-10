/* global SITE, gsap, Draggable, InertiaPlugin, Lenis */
(() => {
  const CARD_COLORS = 6;
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

  /* ---------- Hero clothesline: project polaroids pegged to a line, swaying as they pass ---------- */
  // .card is the hanger the cursor build places; .pol-swing sways on its own (CSS), .pol-kick swings when the line is dragged
  const POL_TILTS = [-2, 1.5, -1, 2.5, -1.5, 1]; // each photo hangs a little crooked, like real pegged prints

  function buildCard(project, index) {
    const card = el("div", "card");
    card.style.setProperty("--tilt", `${POL_TILTS[index % POL_TILTS.length]}deg`);
    card.style.setProperty("--sway-time", `${(2.6 + (index % 4) * 0.35).toFixed(2)}s`);
    card.style.setProperty("--sway-delay", `${(-index * 0.7).toFixed(1)}s`);
    const swing = el("div", "pol-swing");
    const kick = el("div", "pol-kick");
    const peg = el("span", "peg");
    peg.setAttribute("aria-hidden", "true");
    const photo = el("div", "pol-photo");
    const pic = el("div", `pol-pic c${index % CARD_COLORS}`);
    const initial = () => {
      const letter = el("span", "card-initial", project.name[0]);
      letter.setAttribute("aria-hidden", "true");
      return letter;
    };
    if (project.cover) {
      const shot = framedShot(project.cover, `${project.name} screenshot`);
      shot.classList.add("pol-shot");
      // A missing screenshot falls back to the dotted initial
      shot.querySelector("img").addEventListener("error", () => shot.replaceWith(initial()), { once: true });
      pic.appendChild(shot);
    } else {
      pic.appendChild(initial());
    }
    const caption = el("div", "pol-caption");
    caption.append(el("span", "name serif", project.name), el("span", "tagline", project.tagline));
    const view = openProjectButton("View ↗", index, "view");
    view.setAttribute("aria-label", `View ${project.name}`);
    photo.append(pic, caption, view);
    kick.append(peg, photo);
    swing.appendChild(kick);
    card.appendChild(swing);
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

  /* ---------- Work: a crate of records (filterable by the service cards) ---------- */
  // Pick a cover from the crate and the big sleeve swaps to it: the vinyl slides back in, the art changes,
  // and the new record slides out and spins. The sleeve and "Open project" open the project's details.
  const SWAP_MS = 280; // how long the vinyl takes to slide back into its sleeve before the art swaps
  let onWorkFilter = null; // set by renderWork, so a filter can move the crate off a hidden record

  function externalLink(label, url) {
    const a = el("a", "", `${label} ↗`);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  /** The big album cover: the project's name, a "side" line, and its screenshot or dotted initial. */
  function fillSleeve(sleeve, p, i) {
    sleeve.className = `sleeve c${i % CARD_COLORS}`;
    sleeve.replaceChildren(el("span", "cover-name", p.name), el("span", "cover-meta", `Side ${String.fromCharCode(65 + (i % 2))} · ${p.platform}`));
    const initial = () => { const letter = el("span", "card-initial", p.name[0]); letter.setAttribute("aria-hidden", "true"); return letter; };
    if (!p.cover) { sleeve.appendChild(initial()); return; }
    const shot = framedShot(p.cover, "");
    shot.classList.add("cover-shot");
    shot.querySelector("img").loading = "eager";
    shot.querySelector("img").addEventListener("error", () => shot.replaceWith(initial()), { once: true });
    sleeve.appendChild(shot);
  }

  /** The small cover standing in the crate (phrasing content only, as it sits inside a button). */
  function miniCover(p, i) {
    const cover = el("span", `mini-cover c${i % CARD_COLORS}`);
    cover.appendChild(el("span", "mini-name", p.name));
    if (p.cover) {
      const img = el("img", `mini-shot mini-${p.cover.kind}`);
      img.src = p.cover.src;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove(), { once: true });
      cover.appendChild(img);
    } else {
      cover.appendChild(el("span", "card-initial", p.name[0]));
    }
    return cover;
  }

  function fillTrack(track, p, i, total) {
    const title = el("h3", "", p.name);
    const stack = el("ul", "track-stack");
    stack.setAttribute("aria-label", "Built with");
    p.stack.split(" · ").forEach((tool) => stack.appendChild(el("li", "", tool)));
    const actions = el("div", "track-actions");
    actions.appendChild(openProjectButton("Open project", i, "track-open"));
    if (p.live) actions.appendChild(externalLink(p.liveLabel || "Live", p.live));
    if (p.source) actions.appendChild(externalLink("Source", p.source));
    const nav = el("div", "track-nav");
    const prev = el("button", "", "←");
    const next = el("button", "", "→");
    prev.type = next.type = "button";
    prev.dataset.step = "-1";
    next.dataset.step = "1";
    prev.setAttribute("aria-label", "Previous project");
    next.setAttribute("aria-label", "Next project");
    nav.append(prev, next);
    const top = el("div", "track-top");
    top.append(el("span", "track-no", `Track ${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`), nav);
    track.replaceChildren(top, title, el("p", "track-tagline", p.tagline), stack, actions);
  }

  function renderWork() {
    const list = document.querySelector("[data-work]");
    const deck = document.querySelector("[data-deck]");
    const sleeve = document.querySelector("[data-sleeve]");
    const label = document.querySelector("[data-vinyl-label]");
    const track = document.querySelector("[data-track]");
    const scroller = document.querySelector("[data-crate-scroll]");
    const count = document.querySelector("[data-crate-count]");
    if (!list || !deck || !track) return;
    const total = SITE.projects.length;
    let current = -1;
    let swapTimer = 0;
    let refocusStep = null; // the ← / → button to put focus back on once the details are redrawn

    const rows = SITE.projects.map((p, i) => {
      const row = el("li", "work-row");
      row.dataset.cats = p.cats.join(" ");
      const btn = el("button", "crate-record");
      btn.type = "button";
      btn.setAttribute("aria-label", `${p.name}, ${p.platform}`);
      btn.appendChild(miniCover(p, i));
      btn.addEventListener("click", () => pick(i));
      row.appendChild(btn);
      list.appendChild(row);
      return row;
    });
    const visible = () => rows.filter((row) => !row.hidden);
    const updateCount = () => { const n = visible().length; count.textContent = `${n} record${n === 1 ? "" : "s"}`; };

    // Brings the picked cover to the middle of the crate (only the crate scrolls, never the page)
    const centre = (row) => {
      const s = scroller.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      scroller.scrollBy({ left: r.left - s.left - (s.width - r.width) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    };

    const show = (i) => {
      const p = SITE.projects[i];
      fillSleeve(sleeve, p, i);
      label.className = `vinyl-label c${i % CARD_COLORS}`;
      label.textContent = p.name;
      fillTrack(track, p, i, total);
      if (refocusStep) { track.querySelector(`[data-step="${refocusStep}"]`).focus({ preventScroll: true }); refocusStep = null; }
      // Clicking the big cover opens the project, like the Open project button
      sleeve.onclick = () => track.querySelector("[data-open-project]").click();
    };

    function pick(i, instant) {
      if (i === current) { refocusStep = null; return; }
      const first = current === -1;
      current = i;
      rows.forEach((row, j) => {
        row.classList.toggle("is-current", j === i);
        row.querySelector("button").setAttribute("aria-pressed", String(j === i));
      });
      if (!first) centre(rows[i]);
      clearTimeout(swapTimer);
      if (first || instant || reduceMotion) { show(i); if (!first) deck.classList.add("is-out"); return; }
      deck.classList.remove("is-out");
      track.classList.add("is-swapping");
      swapTimer = setTimeout(() => { show(i); deck.classList.add("is-out"); track.classList.remove("is-swapping"); }, SWAP_MS);
    }

    // Step through the visible records (the ← → buttons, or arrow keys in the crate)
    const step = (dir) => {
      const vis = visible();
      const at = vis.indexOf(rows[current]);
      const row = vis[(at + dir + vis.length) % vis.length];
      pick(rows.indexOf(row));
      return row;
    };
    track.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-step]");
      if (!btn) return;
      refocusStep = btn.dataset.step;
      step(Number(btn.dataset.step));
    });
    list.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? -1 : 1).querySelector("button").focus();
    });

    onWorkFilter = () => {
      updateCount();
      const vis = visible();
      if (vis.length && !vis.includes(rows[current])) pick(rows.indexOf(vis[0]), true);
    };

    pick(0);
    updateCount();
    // The first record slides out of its sleeve when the section comes into view
    if (reduceMotion || !("IntersectionObserver" in window)) { deck.classList.add("is-out"); return; }
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.disconnect();
      deck.classList.add("is-out");
    }, { threshold: 0.4 });
    seen.observe(deck);
  }

  function filterWork(cat, label) {
    const bar = document.querySelector("[data-work-filter]");
    document.querySelectorAll(".work-row").forEach((row) => {
      row.hidden = Boolean(cat) && !row.dataset.cats.split(" ").includes(cat);
    });
    bar.hidden = !cat;
    bar.querySelector("[data-filter-label]").textContent = label || "";
    if (onWorkFilter) onWorkFilter();
  }

  /* ---------- Simple marquee content ---------- */
  // Toolkit ribbon: words alternate the headline's bold and serif faces, every third gets a pastel highlight,
  // and a small number says how many projects list the tool in their stack (or platform)
  const RIBBON_MARKS = ["pink", "yellow", "sky", "mint", "orange"];
  function toolCount(tool) {
    const name = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^\\w])${name}(?!\\w)`, "i"); // whole names only: "Git" isn't counted in "GitHub"
    return SITE.projects.filter((p) => re.test(p.stack) || re.test(p.platform)).length;
  }

  function renderMarquees() {
    document.querySelectorAll("[data-pills]").forEach((set) => {
      SITE.tools.forEach((t, i) => {
        const word = el("span", i % 2 ? "tool-word serif" : "tool-word");
        if (i % 3 === 2) word.classList.add(`mark-${RIBBON_MARKS[Math.floor(i / 3) % RIBBON_MARKS.length]}`);
        word.appendChild(document.createTextNode(t));
        const n = toolCount(t);
        if (n) {
          const label = `${n} project${n === 1 ? "" : "s"}`;
          const count = el("sup", "tool-count", String(n));
          count.setAttribute("aria-hidden", "true");
          word.append(count, el("span", "sr-only", ` (${label})`));
          word.title = `Used in ${label}`;
        }
        const star = el("span", "tool-sep", "✦");
        star.setAttribute("aria-hidden", "true");
        set.append(word, star);
      });
    });
    // A stat is a fixed value, or counted from the content so it never goes stale
    const statValue = (s) => {
      if (s.value) return s.value;
      if (s.count === "projects") return String(SITE.projects.length);
      if (s.count === "tools") return String(SITE.tools.length);
      return String(SITE.projects.filter((p) => p.cats.includes(s.count)).length);
    };
    document.querySelectorAll("[data-stats]").forEach((set) => {
      const hidden = set.hasAttribute("aria-hidden");
      SITE.stats.forEach((s) => {
        const circle = el("div", "stat");
        if (!hidden) circle.setAttribute("role", "listitem");
        circle.append(el("b", "", statValue(s)), el("span", "", s.label));
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

  /* ---------- Services: cards that stack like pages as you scroll ---------- */
  const SHOT_LAYOUTS = { 1: [[0, 0]], 2: [[-16, -5], [16, 5]], 3: [[-21, -7], [0, 0], [21, 7]] }; // [x offset %, tilt deg]

  function serviceShots(projects, icon) {
    const shots = el("div", "service-shots");
    shots.setAttribute("aria-hidden", "true");
    const covers = projects.filter((p) => p.cover).slice(0, 3);
    // Nothing to show (e.g. Desktop has no screenshot yet): the category's icon, big
    if (!covers.length) { shots.appendChild(svgIcon(ICONS[icon])); return shots; }
    covers.forEach((p, i) => {
      const [x, r] = SHOT_LAYOUTS[covers.length][i];
      const frame = framedShot(p.cover, "");
      frame.style.setProperty("--x", x);
      frame.style.setProperty("--r", `${r}deg`);
      if (covers.length === 3 && i === 1) frame.style.zIndex = "2"; // the middle one sits on top
      frame.querySelector("img").addEventListener("error", () => frame.remove(), { once: true });
      shots.appendChild(frame);
    });
    return shots;
  }

  function renderServices() {
    const list = document.querySelector("[data-services]");
    const total = String(SITE.services.length).padStart(2, "0");
    SITE.services.forEach((s, i) => {
      const projects = SITE.projects.filter((p) => p.cats.includes(s.cat));
      const count = `${projects.length} project${projects.length === 1 ? "" : "s"}`;
      // Each card jumps to the Work list, filtered to this kind of project
      const card = el("a", `service-card s${i}`);
      card.href = "#work";
      card.style.setProperty("--i", i);
      card.setAttribute("aria-label", `${s.title}: see ${count}`);
      card.addEventListener("click", () => filterWork(s.cat, s.title));

      const info = el("div", "service-info");
      const top = el("div", "service-top");
      top.append(el("span", "", `${String(i + 1).padStart(2, "0")} / ${total}`), el("span", "", count));
      const title = el("div", "service-title");
      title.append(el("h3", "", s.title), svgIcon(ICONS[s.icon]));
      const chips = el("div", "service-chips");
      projects.forEach((p) => chips.appendChild(el("span", "", p.name)));
      const cta = el("span", "service-cta", `See ${s.title} projects`);
      cta.appendChild(svgIcon(ICONS.arrow));
      info.append(top, title, el("p", "", s.text), chips, cta);

      card.append(info, serviceShots(projects, s.icon));
      list.appendChild(card);
    });
  }

  // As the next card slides up over a stuck one, the one underneath shrinks back and dims, like a page in a pile
  function setupServiceStack() {
    const cards = [...document.querySelectorAll(".service-card")];
    if (!cards.length || reduceMotion) return;
    let queued = false;
    const update = () => {
      queued = false;
      const tops = cards.map((c) => c.getBoundingClientRect().top); // scaling is from the top edge, so tops stay true
      const stuckAt = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0);
      cards.forEach((card, i) => {
        let depth = 0;
        for (let j = i + 1; j < cards.length; j++) {
          depth += Math.min(1, Math.max(0, 1 - (tops[j] - stuckAt[j]) / card.offsetHeight));
        }
        card.style.setProperty("--depth", depth.toFixed(3));
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
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

  /* ---------- About: fact stickers beside the text (the portrait stays untouched) ---------- */
  const FACT_TILTS = [-6, 4, -3, 7, -5, 3];

  function renderFactStickers() {
    const list = document.querySelector("[data-fact-stickers]");
    if (!list || !SITE.aboutStickers) return;
    const fill = (text) => text.replace("{projects}", SITE.projects.length).replace("{tools}", SITE.tools.length);
    SITE.aboutStickers.forEach((s, i) => {
      const shape = s.shape || "pill";
      const item = el("li", `fact fact-${shape}`);
      const text = fill(s.text);
      const project = s.open ? SITE.projects.findIndex((p) => p.name === s.open) : -1;
      let face;
      if (project >= 0) face = openProjectButton(text, project, "fact-face");
      else if (s.href) { face = el("a", "fact-face", text); face.href = s.href; }
      else face = el("span", "fact-face", text);
      face.style.setProperty("--r", `${FACT_TILTS[i % FACT_TILTS.length]}deg`);
      const color = s.color || "yellow";
      // The scalloped one is drawn like the Journey and Say hi stickers; the rest are plain colour
      if (shape === "scallop") face.style.backgroundImage = scallopBackground(getComputedStyle(document.documentElement).getPropertyValue(`--${color}`).trim() || "#ffade4");
      else face.style.background = `var(--${color})`;
      item.appendChild(face);
      list.appendChild(item);
    });
  }

  // They slap on one by one when the About text scrolls into view; on a mouse they can be dragged around the text column
  function setupFactStickers() {
    const list = document.querySelector("[data-fact-stickers]");
    if (!list || !list.children.length || !hasGsap) return;
    const items = [...list.children];
    // Dragging starts only once they've landed: the drag bounds would otherwise shove the still-enlarged stickers sideways
    const enableDrag = () => {
      if (typeof Draggable === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;
      Draggable.create(items, { type: "x,y", bounds: list.closest(".texts"), zIndexBoost: true });
    };
    if (reduceMotion || !("IntersectionObserver" in window)) { enableDrag(); return; }
    gsap.set(items, { opacity: 0, scale: 1.5 });
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.disconnect();
      gsap.to(items, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.6)", stagger: 0.09, onComplete: enableDrag });
    }, { threshold: 0.4 });
    seen.observe(list);
  }

  function renderSayHi() {
    document.querySelector("[data-say-hi]").style.backgroundImage = scallopBackground("#fff570");
  }

  /* ---------- Journey timeline ---------- */
  // Oldest first: each stage is a scalloped sticker with a dashed arrow to the next,
  // and a black closing card says where it has led.
  const JOURNEY_COLORS = ["#fff570", "#ffade4", "#a3daf5"];
  const JOURNEY_TILTS = [-4, 3, -3, 4];

  function journeyStep(item, i, closing) {
    const step = el("li", closing ? "step step-end" : "step");
    const sticker = el("article", "sticker");
    sticker.style.backgroundImage = scallopBackground(closing ? "#000" : JOURNEY_COLORS[i % JOURNEY_COLORS.length]);
    sticker.style.setProperty("--tilt", `${JOURNEY_TILTS[i % JOURNEY_TILTS.length]}deg`);
    const badge = el("span", "badge", closing ? "✦" : String(i + 1).padStart(2, "0"));
    badge.setAttribute("aria-hidden", "true"); // the list itself already reads out in order
    const details = el("div", "details");
    details.append(el("h3", "", item.title), el("span", "", item.when ? `${item.when} · ${item.sub}` : item.sub));
    sticker.append(badge, el("p", "", `“${item.text}”`), details);
    step.appendChild(sticker);
    return step;
  }

  function renderJourney() {
    const list = document.querySelector("[data-timeline]");
    SITE.journey.forEach((item, i) => list.appendChild(journeyStep(item, i, false)));
    if (SITE.journeyEnd) list.appendChild(journeyStep(SITE.journeyEnd, SITE.journey.length, true));
  }

  // The first time the timeline scrolls into view, the stickers land one after another, oldest first
  function revealJourney() {
    const list = document.querySelector("[data-timeline]");
    const stickers = [...list.querySelectorAll(".sticker")];
    gsap.set(stickers, { opacity: 0, y: 60 });
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      gsap.to(stickers, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "back.out(1.6)", clearProps: "opacity,transform" });
    }, { threshold: 0.3 });
    observer.observe(list);
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

  /* ---------- Hero buddies: the laptop and mug watch the pointer, blink, and react to a click ---------- */
  const BUDDY_PUPIL_TRAVEL = 1.3; // max eye offset, in the drawing's own units (the dot eyes are 2.5–3 units)
  const BUDDY_REACT_MS = 1400;

  function setupHeroBuddies() {
    const box = document.querySelector("[data-buddies]");
    if (!box) return;
    const pupils = [...box.querySelectorAll("[data-buddy-pupil]")];
    let frame = 0;
    const lookAt = (x, y) => pupils.forEach((pupil) => {
      const r = pupil.previousElementSibling.getBoundingClientRect(); // its resting spot (.b-anchor), which never moves
      if (!r.width) return; // hidden (phones)
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const travel = Math.min(BUDDY_PUPIL_TRAVEL, dist / 30);
      pupil.style.transform = `translate(${(dx / dist) * travel}px, ${(dy / dist) * travel}px)`;
    });
    window.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => lookAt(e.clientX, e.clientY));
    }, { passive: true });

    // A click on either one sets off its reaction for a moment
    const react = (name) => {
      box.classList.remove(name);
      void box.offsetWidth; // restart the CSS animation if clicked again
      box.classList.add(name);
      clearTimeout(react[name]);
      react[name] = setTimeout(() => box.classList.remove(name), BUDDY_REACT_MS);
    };
    box.querySelector('[data-buddy="laptop"]').addEventListener("click", () => react("laptop-happy"));
    box.querySelector('[data-buddy="mug"]').addEventListener("click", () => react("mug-sip"));

    if (reduceMotion) return;
    // They blink now and then, the mug a beat after the laptop
    setInterval(() => {
      if (motionPaused) return;
      box.classList.add("blink-laptop");
      setTimeout(() => box.classList.replace("blink-laptop", "blink-mug"), 220);
      setTimeout(() => box.classList.remove("blink-mug"), 380);
    }, BLINK_MS * 0.8);
  }

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
        // Laid out at zero size (e.g. loaded in a hidden frame): there's nothing to sample yet, and throwing here
        // would stop the rest of the page's setup, intro included. A later resize builds it.
        if (!box.width || !box.height) return;
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
      // Tugging the line makes the photos swing: they trail behind the way it moves, then settle with a wobble
      const kicks = () => slider.querySelectorAll(".pol-kick");
      let lastX = 0;
      const swingWith = function () {
        keepInRange.call(this);
        const dx = this.x - lastX;
        lastX = this.x;
        if (reduceMotion || Math.abs(dx) > 200) return; // a jump from wrapping round isn't movement
        gsap.to(kicks(), { rotate: gsap.utils.clamp(-14, 14, dx * 0.9), duration: 0.3, ease: "power2.out", overwrite: true });
      };
      const settle = () => {
        if (!reduceMotion) gsap.to(kicks(), { rotate: 0, duration: 1.8, ease: "elastic.out(1, 0.25)", overwrite: true });
      };
      Draggable.create(slider, {
        type: "x", inertia: true, dragClickables: false,
        onPress() { lastX = this.x; },
        onDrag: swingWith, onThrowUpdate: swingWith, onThrowComplete: settle,
        onRelease() { if (!this.isThrowing) settle(); },
        // A tap (not a drag) anywhere on a photo opens that project
        onClick(e) {
          const card = e.target.closest(".card");
          if (card && !e.target.closest("button")) card.querySelector("[data-open-project]").click();
        },
      });
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

  /** Wrap each word of a heading or line of text in a span once, keeping inner elements (like the serif "Let's") whole. */
  function splitHeadlineWords(h2) {
    if (h2.dataset.split) return [...h2.querySelectorAll(".word")];
    const words = [];
    [...h2.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "BR") return; // line breaks stay as they are
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
    if (p.live) links.appendChild(Object.assign(externalLink(p.liveLabel || "Visit live", p.live), { className: "ps-btn ps-btn-dark" }));
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

  /* ---------- About lead: rolling ideas ---------- */
  // "random ideas" becomes a pink tag that rolls to the next of its data-words every few seconds while the text is
  // on screen. The tag is as wide as its longest word, so the sentence never reflows.
  // Screen readers just hear "random ideas"; with motion paused or reduced the tag holds still on it
  function setupIdeaRoll() {
    const tag = document.querySelector("[data-idea-roll]");
    if (!tag) return;
    const first = tag.textContent.trim();
    const words = [first, ...tag.dataset.words.split("|"), first];
    const track = document.createElement("span");
    track.className = "idea-roll-track";
    track.setAttribute("aria-hidden", "true");
    words.forEach((word) => track.append(Object.assign(document.createElement("span"), { textContent: word })));
    const spoken = Object.assign(document.createElement("span"), { className: "sr-only", textContent: first });
    tag.replaceChildren(spoken, track);
    tag.classList.add("is-rolling");
    const fit = () => {
      const widest = Math.max(...[...track.children].map((word) => word.offsetWidth));
      const edge = tag.offsetWidth - tag.clientWidth + parseFloat(getComputedStyle(tag).paddingLeft) * 2;
      tag.style.width = `${Math.ceil(widest + edge)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    if (document.fonts) document.fonts.ready.then(fit);
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    let at = 0, timer = 0;
    const roll = () => {
      if (motionPaused) return;
      at += 1;
      track.style.transform = `translateY(${-at * 1.12}em)`;
      if (at === words.length - 1) {
        // Landed on the repeated first word: once the roll finishes, jump back to the real one unseen
        setTimeout(() => {
          track.classList.add("no-anim");
          at = 0;
          track.style.transform = "";
          void track.offsetWidth;
          track.classList.remove("no-anim");
        }, 700);
      }
    };
    new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) timer = setInterval(roll, 2600);
    }).observe(tag);
  }

  /* ---------- Footer metro map: the tram rides the Quick Links line ---------- */
  // It hops one stop every couple of seconds while the map is on screen (back and forth, end to end), and runs
  // straight to any stop you hover or tab to. With motion paused or reduced it just waits at the stop you point at
  function setupMetro() {
    const rail = document.querySelector("[data-metro-line]");
    if (!rail) return;
    const stops = [...rail.querySelectorAll(".stop")];
    const tram = rail.querySelector(".metro-tram");
    let at = 0, dir = 1, holding = false, onScreen = false, timer = 0;
    const place = (i) => {
      stops[at].classList.remove("is-here");
      at = i;
      stops[at].classList.add("is-here");
      const dot = stops[at].querySelector(".stop-dot").getBoundingClientRect();
      const box = rail.getBoundingClientRect();
      tram.style.setProperty("--x", `${dot.left + dot.width / 2 - box.left}px`);
      tram.style.setProperty("--y", `${dot.top + dot.height / 2 - box.top}px`);
    };
    const hop = () => {
      if (!onScreen || holding || motionPaused || reduceMotion) return;
      if (at + dir < 0 || at + dir >= stops.length) dir = -dir;
      place(at + dir);
    };
    stops.forEach((stop, i) => {
      const go = () => { holding = true; place(i); };
      const leave = () => { holding = false; };
      stop.addEventListener("mouseenter", go);
      stop.addEventListener("mouseleave", leave);
      stop.addEventListener("focusin", go);
      stop.addEventListener("focusout", leave);
    });
    place(0);
    window.addEventListener("resize", () => place(at));
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      clearInterval(timer);
      if (onScreen) { place(at); timer = setInterval(hop, 1800); } // re-measure: fonts or layout may have shifted
    }).observe(rail);
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
      document.body.classList.toggle("music-on", playing); // the Work section's record spins faster while music plays
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
  /** @param {() => void} onReveal runs as the curtain starts lifting off the page */
  function playIntro(canvas, curtain, logoText, logoMark, done, onReveal) {
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
      .add(onReveal, "<")
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
    const heroBuild = prepareHeroBuild(); // the hero waits behind the curtain as a blank blueprint
    let tl = null;
    let skipped = false;
    const skip = () => { skipped = true; if (tl) tl.timeScale(4); }; // any click, tap or key fast-forwards it
    const reveal = () => heroBuild.play(skipped);
    const finish = () => {
      canvas.remove();
      curtain.remove();
      gsap.set([logoText, logoMark], { clearProps: "opacity,transform" });
      document.body.classList.remove("is-loading");
      if (lenis) lenis.start();
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      reveal(); // only does anything if the intro ended before the curtain lifted
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    // The dots copy the logo's letters, so wait (briefly) for its font
    const cs = getComputedStyle(logoText);
    const fontReady = document.fonts ? document.fonts.load(`${cs.fontWeight} 32px ${cs.fontFamily}`) : Promise.resolve();
    Promise.race([fontReady, new Promise((r) => setTimeout(r, INTRO_FONT_WAIT_MS))])
      .then(() => { tl = playIntro(canvas, curtain, logoText, logoMark, finish, reveal); })
      .catch(finish);
  }

  /* ---------- Toolkit cursors: they build the hero after the intro, then crowd round Let's Talk ---------- */
  // Each cursor carries a tool from SITE.tools, in the site's colours. Bottom-up, to match the curtain lifting.
  const BUILDERS = [
    { tool: "React", part: ".hero h1", label: "Headline", color: "#25a750", from: [-0.06, 1.1] },
    // The hero no longer has its Let's Talk sticker, so this cursor skips the build (a missing part is left out)
    // but still joins the crowd round the Let's Talk button further down
    { tool: "Tailwind CSS", part: ".talk-sticker", label: "Let’s Talk", color: "#e95935", from: [1.06, 1.1] },
    { tool: "TypeScript", part: ".hero .right-text", label: "Intro", color: "#0088cc", from: [1.06, 0.45] },
    { tool: "Figma", part: ".slider-wrap", outline: ".slider", label: "Projects", color: "#d747a7", from: [-0.06, 0.2] },
  ];
  const CURSOR_COLORS = BUILDERS.map((b) => b.color).concat("#ab6349");
  const CURSOR_PATH = "M2 2V19L6 15L9 22L11.5 21L8.5 14.2H14Z"; // a classic pointer, tip at (2, 2)
  const BUILD_SPEED = 1.5; // plays the whole cursor build this many times faster (1 = the timings below as written)
  const BUILD_START_S = 0.15;
  const BUILD_STAGGER_S = 0.18;
  const BUILD_FLY_S = 0.6;
  const BUILD_HOP_S = 0.08; // the cursor jumping to the start of the next line
  const BUILD_SWEEP_PX_S = 2400; // how fast it runs along a line while the words appear behind it
  const BUILD_SWEEP_MIN_S = 0.2;
  const FRAME_INSET = 8; // wireframes stay this far inside the hero's edges
  const FRAME_TAG_ROOM = 28; // space a name tag needs above its frame
  const SWARM_SIZE = 11;
  const SWARM_SIZE_PHONE = 7;

  /** A pointer with a name tag, like a teammate's cursor in a design tool. Its (0, 0) is the arrow's tip. */
  function toolCursor(color, label) {
    const cursor = el("span", "tool-cursor");
    cursor.style.setProperty("--c", color);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "tool-cursor-arrow");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", CURSOR_PATH);
    svg.appendChild(path);
    cursor.append(el("span", "tool-ripple"), svg);
    if (label) cursor.appendChild(el("span", "tool-cursor-label", label));
    return cursor;
  }

  /** A dashed blueprint frame over `target` (in `hero`'s coordinates), with a name tag and corner handles. */
  function buildFrame(layer, hero, target, label) {
    const box = hero.getBoundingClientRect();
    // Text is measured by its words, not its box (the headline's box spans the whole width)
    const range = document.createRange();
    range.selectNodeContents(target);
    const r = target.matches("h1, p") ? range.getBoundingClientRect() : target.getBoundingClientRect();
    const left = Math.max(FRAME_INSET, r.left - box.left - FRAME_INSET);
    const right = Math.min(box.width - FRAME_INSET, r.right - box.left + FRAME_INSET);
    const top = r.top - box.top - FRAME_INSET;
    const frame = el("div", target.matches(".talk-sticker") ? "build-frame round" : "build-frame");
    Object.assign(frame.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${r.height + FRAME_INSET * 2}px` });
    frame.append(el("span", "build-tag", label), el("i", "h-tl"), el("i", "h-tr"), el("i", "h-bl"), el("i", "h-br"));
    layer.appendChild(frame);
    return frame;
  }

  /**
   * Name tags sit above their frames, as in a design tool. Where that would hit another frame or the hero's top edge,
   * a tag goes below its frame instead, and inside it as a last resort.
   */
  function placeTags(frames) {
    const rects = frames.map((f) => ({ l: f.offsetLeft, t: f.offsetTop, r: f.offsetLeft + f.offsetWidth, b: f.offsetTop + f.offsetHeight }));
    const clear = (band, self) => band.t >= 0 && rects.every((o, j) => j === self || band.b <= o.t || band.t >= o.b || band.r <= o.l || band.l >= o.r);
    frames.forEach((frame, i) => {
      const { l, t, b } = rects[i];
      const r = l + frame.querySelector(".build-tag").offsetWidth + 4;
      if (clear({ l, r, t: t - FRAME_TAG_ROOM, b: t }, i)) return;
      frame.classList.add(clear({ l, r, t: b, b: b + FRAME_TAG_ROOM }, i) ? "tag-below" : "tag-inside");
    });
  }

  /** Where a cursor lands on its frame: its top-left corner, just past a name tag inside it, or a round frame's rim. */
  function frameTarget(frame) {
    if (frame.classList.contains("round")) return { x: frame.offsetLeft + frame.offsetWidth * 0.16, y: frame.offsetTop + frame.offsetHeight * 0.16 };
    if (!frame.classList.contains("tag-inside")) return { x: frame.offsetLeft + 14, y: frame.offsetTop + 14 };
    const tag = frame.querySelector(".build-tag");
    return { x: frame.offsetLeft + tag.offsetLeft + tag.offsetWidth + 10, y: frame.offsetTop + 12 };
  }

  /** Words grouped into the lines they sit on, top to bottom; positions are relative to `box`. */
  function wordLines(words, box) {
    const lines = [];
    words.forEach((node) => {
      const r = node.getBoundingClientRect();
      const left = r.left - box.left;
      const line = lines.find((l) => Math.abs(l.top - r.top) < r.height / 2);
      if (line) {
        line.items.push({ node, left });
        line.right = Math.max(line.right, r.right - box.left);
      } else {
        lines.push({ top: r.top, y: r.top + r.height / 2 - box.top, left, right: r.right - box.left, items: [{ node, left }] });
      }
    });
    return lines.sort((a, b) => a.top - b.top);
  }

  /** The cursor hops to `from`, then runs to `to`; each item renders as the cursor passes it. Returns when it's done. */
  function sweep(tl, cursor, items, { from, to, y }, start, fromVars, toVars) {
    const dur = Math.max(BUILD_SWEEP_MIN_S, (to - from) / BUILD_SWEEP_PX_S);
    const run = start + BUILD_HOP_S;
    tl.to(cursor, { x: from, y, duration: BUILD_HOP_S, ease: "power2.inOut" }, start)
      .to(cursor, { x: to, duration: dur, ease: "none" }, run);
    items.forEach(({ node, left }) => {
      tl.fromTo(node, { ...fromVars }, { ...toVars }, run + (Math.max(0, left - from) / Math.max(1, to - from)) * dur);
    });
    return run + dur;
  }

  /** The cursor writes `part` out line by line, the words appearing behind it. Returns when it's done. */
  function writeText(tl, cursor, part, box, start) {
    const words = splitHeadlineWords(part);
    gsap.set(words, { opacity: 0 });
    tl.set(part, { opacity: 1 }, start);
    return wordLines(words, box).reduce((t, line) =>
      sweep(tl, cursor, line.items, { from: line.left, to: line.right, y: line.y }, t, { opacity: 0 }, { opacity: 1, duration: 0.18 }), start);
  }

  /** The cursor runs along the project strip, putting the cards on screen one by one. Returns when it's done. */
  function placeCards(tl, cursor, part, box, start) {
    // The strip's scroll is paused for the build (.is-building), so these positions hold
    const all = [...part.querySelectorAll(".card")];
    const cards = all
      .map((node) => ({ node, r: node.getBoundingClientRect() }))
      .filter(({ r }) => r.right > box.left && r.left < box.right)
      .sort((a, b) => a.r.left - b.r.left)
      .map(({ node, r }) => ({ node, left: r.left - box.left, right: r.right - box.left, top: r.top - box.top }));
    gsap.set(all, { opacity: 0 });
    tl.set(part, { opacity: 1 }, start);
    if (!cards.length) { tl.set(all, { opacity: 1 }, start); return start; }
    const last = cards[cards.length - 1];
    // The cursor runs along the clothesline, and each photo drops onto its peg as the cursor passes
    const path = { from: Math.max(cards[0].left, 0) + 24, to: Math.min(last.right, box.width) - 48, y: cards[0].top + 14 };
    const done = sweep(tl, cursor, cards, path, start, { opacity: 0, y: -28, rotate: -8 }, { opacity: 1, y: 0, rotate: 0, duration: 0.5, ease: "back.out(2.2)" });
    tl.set(all.filter((node) => !cards.some((c) => c.node === node)), { opacity: 1 }, done); // the off-screen ones
    return done;
  }

  /** One cursor's job: fly to its frame and click it, then write, place or render its part. */
  function buildPart(tl, layer, box, { b, part, frame }, i) {
    const cursor = toolCursor(b.color, b.tool);
    layer.appendChild(cursor);
    const to = frameTarget(frame);
    const at = BUILD_START_S + i * BUILD_STAGGER_S;
    const click = at + BUILD_FLY_S;
    gsap.set(cursor, { x: b.from[0] * box.width, y: b.from[1] * box.height });
    tl.to(cursor, { x: to.x, duration: BUILD_FLY_S, ease: "power2.out" }, at)
      .to(cursor, { y: to.y, duration: BUILD_FLY_S, ease: "power3.out" }, at) // different eases curve the path
      .to(cursor.querySelector(".tool-cursor-arrow"), { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1 }, click)
      .fromTo(cursor.querySelector(".tool-ripple"), { scale: 0, opacity: 0.8 }, { scale: 1.6, opacity: 0, duration: 0.45, ease: "power2.out" }, click)
      .add(() => frame.classList.add("selected"), click);
    // Text is written out line by line and the cards are placed one by one; the sticker just renders in
    const start = click + 0.1;
    let done = start + 0.4;
    if (part.matches("h1, p")) done = writeText(tl, cursor, part, box, start);
    else if (part.matches(".slider-wrap")) done = placeCards(tl, cursor, part, box, start);
    else tl.fromTo(part, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }, start);
    tl.to(frame, { opacity: 0, duration: 0.3 }, done);
    return { cursor, done: done + 0.3 };
  }

  // Hides the hero's parts while the intro plays; play() then has the cursors build them back.
  function prepareHeroBuild() {
    const hero = document.querySelector(".hero");
    const parts = BUILDERS.map((b) => hero.querySelector(b.part)).filter(Boolean);
    gsap.set(parts, { opacity: 0 });
    let started = false;
    return {
      play(fast) {
        if (started) return;
        started = true;
        const box = hero.getBoundingClientRect();
        // Reloaded further down the page: nobody would see the build, so just show the hero
        if (box.bottom < 0 || box.top > innerHeight) { gsap.set(parts, { clearProps: "opacity" }); return; }
        const layer = el("div", "cursor-layer");
        layer.setAttribute("aria-hidden", "true");
        hero.appendChild(layer);
        hero.classList.add("is-building");
        const speedUp = () => tl.timeScale(4); // a click, tap or key during the build fast-forwards it too
        const tl = gsap.timeline({
          onComplete: () => {
            layer.remove();
            hero.classList.remove("is-building");
            window.removeEventListener("pointerdown", speedUp);
            window.removeEventListener("keydown", speedUp);
          },
        });
        const jobs = BUILDERS.map((b) => ({ b, part: hero.querySelector(b.part) }))
          .filter(({ part }) => part)
          .map((job) => ({ ...job, frame: buildFrame(layer, hero, hero.querySelector(job.b.outline || job.b.part), job.b.label) }));
        placeTags(jobs.map((job) => job.frame).filter((frame) => !frame.classList.contains("round")));
        const built = jobs.map((job, i) => buildPart(tl, layer, box, job, i));
        const end = Math.max(...built.map((job) => job.done));
        tl.to(built.map((job) => job.cursor), { x: "+=28", y: "-=18", opacity: 0, duration: 0.4, stagger: 0.05 }, end - 0.2)
          .set(parts, { clearProps: "opacity,transform" })
          .set(hero.querySelectorAll("h1 .word, .right-text .word, .card"), { clearProps: "opacity,transform" });
        tl.timeScale(fast ? 3 : BUILD_SPEED);
        window.addEventListener("pointerdown", speedUp);
        window.addEventListener("keydown", speedUp);
      },
    };
  }

  // The first time Let's Talk in the craft section is fully on screen, the cursors crowd round it, pointing at it
  function setupCtaSwarm() {
    const craft = document.querySelector(".craft");
    const btn = craft && craft.querySelector(".contact-btn");
    if (!btn || !hasGsap || reduceMotion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || motionPaused) return;
      observer.disconnect();
      swarmTo(craft, btn);
    }, { threshold: 1, rootMargin: "0px 0px -12% 0px" });
    observer.observe(btn);
  }

  function swarmTo(section, target) {
    const box = section.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const cx = t.left + t.width / 2 - box.left;
    const cy = t.top + t.height / 2 - box.top;
    const count = innerWidth <= 720 ? SWARM_SIZE_PHONE : SWARM_SIZE;
    const layer = el("div", "cursor-layer");
    layer.setAttribute("aria-hidden", "true");
    section.appendChild(layer);
    const cursors = [];
    const tl = gsap.timeline({ onComplete: () => layer.remove() });
    for (let i = 0; i < count; i++) {
      // Round the right side, under the button and up the left, clear of the words above it.
      // The four builders come back, spread round the ring so their name tags don't collide.
      const a = lerp(-0.2, 1.2, i / (count - 1)) * Math.PI;
      const rx = t.width / 2 + 30 + (i % 2) * 18;
      const ry = t.height / 2 + 22 + (i % 3) * 10;
      const builder = i % 3 === 0 ? BUILDERS[i / 3] : null;
      const cursor = builder ? toolCursor(builder.color, builder.tool) : toolCursor(CURSOR_COLORS[i % CURSOR_COLORS.length], "");
      if (Math.cos(a) < -0.3) cursor.classList.add("tag-left"); // left of the button: the tag goes on the outer side
      layer.appendChild(cursor);
      cursors.push(cursor);
      gsap.set(cursor.querySelector(".tool-cursor-arrow"), { rotate: (a * 180) / Math.PI - 45 }); // tip faces the button
      tl.fromTo(cursor,
        { x: cx + Math.cos(a) * box.width * 0.7, y: cy + Math.sin(a) * box.height * 0.9, opacity: 0 },
        { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, opacity: 1, duration: 0.9, ease: "power3.out" }, i * 0.06);
    }
    tl.to(cursors, { y: "+=5", duration: 0.45, yoyo: true, repeat: 3, ease: "sine.inOut", stagger: { each: 0.05, from: "random" } })
      .to(cursors, { opacity: 0, scale: 0.6, duration: 0.4, stagger: 0.04 }, "+=0.4");
  }

  renderSliders();
  renderWork();
  renderMarquees();
  renderServices();
  setupServiceStack();
  renderJourney();
  renderSayHi();
  renderFactStickers(); // before setupScroll, so its #work / #skills links get smooth scrolling
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
  setupMetro(); // after setupMotionToggle, which sets motionPaused
  setupIdeaRoll();
  setupMusic();
  setupPhoneControls();
  setupEyes();
  setupHeroBuddies();
  setupDotPortrait();
  runIntro();
  setupCtaSwarm();
  setupDraggableSliders();
  setupFactStickers(); // after setupDraggableSliders, which registers Draggable
  setupShake();
  if (hasGsap && !reduceMotion && !motionPaused) revealJourney();
})();
