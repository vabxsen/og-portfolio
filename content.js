// All site content lives here. To use your own photos, drop them in ./assets
// and point the paths below at them (e.g. image: "assets/scoop.png").
const SITE = {
  // Dot-matrix portrait beside the About text, drawn from the brightness map in about-map.js
  // (the photo itself is never published). Delete about-map.js's script tag to hide it.
  // columns: dots across (more = finer detail). zoom/focus: crop in around a point (0..1 of the photo).
  // gamma: below 1 brightens mid-tones, above 1 darkens them.
  about: {
    columns: 60,
    zoom: 1.45,
    focus: [0.48, 0.42],
    gamma: 0.8,
  },

  // Big stat circles in the "Always building" marquee (counts from the old portfolio).
  stats: [
    { value: "10", label: "Projects" },
    { value: "13", label: "Tools" },
    { value: "6", label: "Web apps" },
    { value: "4", label: "Mobile apps" },
    { value: "3", label: "AI projects" },
  ],

  // Used by the hero slider, the Work list and the project detail pop-up.
  // cover: card visual — kind "phone" | "browser" | "icon"; omit for a styled text card.
  // gallery: images shown in the pop-up. summary/features come from each repo's README.
  // `cats` must match a service `cat` below so the service rows can filter the Work list.
  projects: [
    {
      name: "Scoop", tagline: "Your media. Your device.", platform: "Android", cats: ["mobile"],
      stack: "Kotlin · Jetpack Compose · Material 3 · Room",
      live: "https://vabxsen.github.io/Scoop/", source: "https://github.com/vabxsen/Scoop",
      cover: { src: "assets/projects/scoop-home.jpg", kind: "phone" },
      gallery: [
        { src: "assets/projects/scoop-home.jpg", kind: "phone" },
        { src: "assets/projects/scoop-configure.jpg", kind: "phone" },
        { src: "assets/projects/scoop-downloads.jpg", kind: "phone" },
        { src: "assets/projects/scoop-settings.jpg", kind: "phone" },
      ],
      summary: "A free, local-first image, video and audio downloader for Android. Scoop resolves a pasted or shared link, lets you configure exactly how it's saved, and downloads it straight to your device through a bundled yt-dlp runtime — no server in the middle, no account, no ads, no analytics.",
      features: [
        "Paste or share a link from any app — Scoop registers as a share target",
        "Analyze before downloading: title, uploader, duration and thumbnail",
        "Video or audio-only, chosen per download",
        "Playlists: pick exactly which videos to grab from a checklist",
        "Live download queue that keeps running in the background",
        "Embedded subtitles and cover art, plus direct image and gallery downloads",
      ],
    },
    {
      name: "Kimi", tagline: "Small rituals. A brighter every day.", platform: "Android", cats: ["mobile"],
      stack: "Kotlin · Jetpack Compose · Firebase",
      source: "https://github.com/vabxsen/Kimi",
      cover: { src: "assets/projects/kimi-today.jpg", kind: "phone" },
      gallery: [
        { src: "assets/projects/kimi-overview.jpg", kind: "plain", wide: true },
        { src: "assets/projects/kimi-today.jpg", kind: "phone" },
        { src: "assets/projects/kimi-insights.jpg", kind: "phone" },
        { src: "assets/projects/kimi-new-habit.jpg", kind: "phone" },
      ],
      summary: "A joyful, privacy-conscious habit tracker that makes building habits feel encouraging instead of demanding. Create small rituals, check in each day, reflect in a private journal, and see your progress without being punished for rest days. Fully native — no WebView — with light and dark themes and Kimi's flower mascot.",
      features: [
        "Today: check off habits by tap or swipe, or run a timed focus session with ambient sound",
        "Habits with custom icons, colours, schedules, dayparts and goals",
        "Insights: weekly wins, streaks and 30-day consistency",
        "A garden that grows with petals, badges, weekly quests and streak freezes",
        "A private journal with moods and voice notes that stay on your phone",
        "Rest days are not failures — they're left out of streaks entirely",
      ],
    },
    {
      name: "Budgie", tagline: "A clearer picture of your subscriptions.", platform: "Android · Web", cats: ["mobile"],
      stack: "Kotlin · Jetpack Compose · WorkManager · Firebase · React",
      source: "https://github.com/vabxsen/budgie",
      summary: "Budgie brings recurring payments, renewal dates and spending into one place. It's a native Android app plus a companion website prototype, sharing a butter-yellow and botanical-ink visual direction.",
      features: [
        "Weekly, monthly and yearly billing with a renewal calendar",
        "Renewal notifications, budgets and free-trial tracking",
        "Category insights, search and archiving",
        "Offline-first, with optional Google sign-in and sync",
        "Light and dark themes, plus CSV/JSON backups",
        "An interactive React + Vite website prototype",
      ],
    },
    {
      name: "Doclee", tagline: "Powerful PDF tools. Private by design.", platform: "Web", cats: ["web"],
      stack: "React 19 · TypeScript · Vite · Tailwind CSS · Zustand · pdf-lib · Firebase",
      live: "https://doclee.web.app/", source: "https://github.com/vabxsen/Doclee",
      cover: { src: "assets/projects/doclee.jpg", kind: "browser" },
      gallery: [{ src: "assets/projects/doclee.jpg", kind: "browser" }],
      summary: "A privacy-first PDF toolkit built as an installable Progressive Web App. Images are decoded, edited and assembled into a PDF right in the browser — no server, no upload, no account required.",
      features: [
        "Image → PDF: multi-format upload, crop, rotate, live adjustments, undo/redo",
        "Merge, split, rotate, extract and delete pages",
        "Sign, mark up, watermark and number pages",
        "Compress, lock and unlock PDFs — encryption runs fully client-side",
        "Camera document scanner with perspective correction",
        "Installs on desktop and mobile, and works offline",
      ],
    },
    {
      name: "Dailynx", tagline: "Small habits. Lasting progress.", platform: "Web", cats: ["web"],
      stack: "React 19 · TypeScript · Vite · Tailwind CSS · Firebase · Recharts",
      live: "https://dailynx.web.app/", source: "https://github.com/vabxsen/Dailynx",
      cover: { src: "assets/projects/dailynx.jpg", kind: "browser" },
      gallery: [{ src: "assets/projects/dailynx.jpg", kind: "browser" }],
      summary: "A modern, installable habit tracker with streaks, XP levels, achievements, sleep tracking and an AI coach.",
      features: [
        "A daily time table that resets itself at your local midnight",
        "Streaks, best streak, monthly counts and a today-progress ring",
        "XP and levels from 0 to 100, plus 13 unlockable achievements",
        "Sleep tracker with weekly and monthly charts",
        "Optional Gemini-powered AI coach",
        "Cloud sync with offline support",
      ],
    },
    {
      name: "PricePilot", tagline: "Know the right moment to buy.", platform: "Web", cats: ["web"],
      stack: "React · TypeScript · Firebase · Cloudflare Workers · GitHub Actions",
      live: "https://pricepilot.web.app/", source: "https://github.com/vabxsen/PricePilot",
      summary: "A mobile-first, installable price tracker. Paste a product link from almost any store — Amazon, Flipkart, Myntra, Best Buy and more — and PricePilot resolves the price, watches it around the clock and charts its history. Built to run entirely on free tiers, a constraint that shaped the whole architecture.",
      features: [
        "Track any product URL and set a target price",
        "Insights: price drops, potential savings, all-time low and high",
        "Hourly price-history charts from one week to all time",
        "Real retailer logos for 20+ stores",
        "A wishlist for things you're not ready to track yet",
        "Installable and works offline",
      ],
    },
    {
      name: "PinDrop", tagline: "Location sharing. Permission first.", platform: "Web", cats: ["web"],
      stack: "React 19 · TypeScript · Express 5 · Socket.IO · Prisma · PostgreSQL",
      live: "https://pindrop-locationtracker.firebaseapp.com/", source: "https://github.com/vabxsen/PinDrop",
      cover: { src: "assets/projects/pindrop.jpg", kind: "browser" },
      gallery: [
        { src: "assets/projects/pindrop.jpg", kind: "browser" },
        { src: "assets/projects/pindrop-share.jpg", kind: "plain", wide: true },
      ],
      summary: "Consent-based location sharing links: create a link, share it anywhere, and see exactly where it was opened the moment someone says yes — never before.",
      features: [
        "Shareable links with expiry dates and usage caps",
        "Explicit opt-in only — nothing is captured until the visitor agrees",
        "Real-time delivery over Socket.IO, plotted on a map with addresses",
        "Analytics: acceptance rate, daily volume and top countries",
        "CSV export of every response",
        "Google or email sign-in, light and dark mode",
      ],
    },
    {
      name: "NexRig", tagline: "Plan the build. Check every part.", platform: "Web", cats: ["web"],
      stack: "React · TypeScript · Zustand · Firebase",
      live: "https://nexrig.web.app/", source: "https://github.com/vabxsen/Nexrig",
      summary: "A PC build planner that catches incompatible parts before you buy them. Pick a CPU, then a motherboard, and NexRig tells you right away whether they fit — not after checkout.",
      features: [
        "Live compatibility checks across 8 part categories",
        "Wattage meter with a recommended PSU size",
        "Monthly and yearly running-cost estimates in your currency",
        "FPS estimates across 30+ games",
        "A 1–10 build rating with a transparent breakdown",
        "Side-by-side build comparison, synced across devices",
      ],
    },
    {
      name: "Gecko AI", tagline: "Exploring native AI experiences.", platform: "Android · AI", cats: ["mobile", "ai"],
      stack: "Kotlin · Android",
      source: "https://github.com/vabxsen/gecko",
      cover: { src: "assets/projects/gecko.jpg", kind: "icon" },
      gallery: [{ src: "assets/projects/gecko.jpg", kind: "icon" }],
    },
    {
      name: "Native AI", tagline: "A little help. Just a word away.", platform: "Desktop · AI", cats: ["desktop", "ai"],
      stack: "Python · Tkinter · SpeechRecognition · pyttsx3 · Claude API",
      source: "https://github.com/vabxsen/Native-Ai",
      summary: "A desktop voice assistant built with Python, with speech recognition, text-to-speech, system monitoring, Claude AI integration and a Tkinter interface.",
      features: [
        "Real-time voice input with speech recognition",
        "Natural, offline text-to-speech replies",
        "Claude AI as a conversational fallback",
        "System monitoring: CPU, RAM, disk and OS info",
        "Opens websites, searches Google and reads Wikipedia summaries",
      ],
    },
  ],
  tools: ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "Python", "Firebase", "Android", "Jetpack Compose", "Figma", "UI/UX Design", "Git", "GitHub"],

  services: [
    { title: "Web", cat: "web", text: "Web apps in React and TypeScript — Doclee, Dailynx, PricePilot, PinDrop, and NexRig.", icon: "web" },
    { title: "Mobile", cat: "mobile", text: "Native Android with Kotlin and Jetpack Compose — Scoop, Kimi, Budgie, and Gecko.", icon: "mobile" },
    { title: "Desktop", cat: "desktop", text: "Desktop voice interaction with Native AI, built in Python.", icon: "desktop" },
    { title: "AI", cat: "ai", text: "Exploring native AI experiences, across Android and desktop.", icon: "ai" },
  ],

  // Rotating sticker cards (the waxyweb "testimonial" slot).
  journey: [
    { text: "Started with Python automation and computer vision: drowsiness detection, QR tools, and text-to-speech.", title: "Foundation", sub: "Python & automation" },
    { text: "Building with TypeScript, React, and Firebase — from daily habits and PDF tools to price tracking and PC planning.", title: "Products", sub: "Web & interface design" },
    { text: "Extending the work into native Android with Scoop and Gecko, and desktop voice interaction with Native AI.", title: "Exploring", sub: "Android, desktop & AI" },
    { text: "On-device media downloads with a native Android interface. Built in the open, with contribution guidelines and release notes.", title: "Scoop", sub: "Open source · Kotlin" },
    { text: "A shared learning path from Python fundamentals to advanced topics, for students and independent learners.", title: "Python Roadmap", sub: "Open source · Python" },
    { text: "A browser-first PDF toolkit. Explore the document pipeline, offline support, and client-side processing.", title: "Doclee", sub: "Open source · TypeScript" },
    { text: "From the first wireframe to the final interaction, I care about the details that make software feel effortless.", title: "The craft", sub: "How I work" },
  ],

  // Big scrolling text links between the link lists and the contact block.
  bigLinks: [
    { label: "GitHub", url: "https://github.com/vabxsen" },
    { label: "Email", url: "mailto:cheeseburst06@gmail.com" },
    { label: "Scoop", url: "https://vabxsen.github.io/Scoop/" },
    { label: "Doclee", url: "https://doclee.web.app/" },
    { label: "Dailynx", url: "https://dailynx.web.app/" },
    { label: "Repositories", url: "https://github.com/vabxsen?tab=repositories" },
  ],

  email: "cheeseburst06@gmail.com",

  // Looping background music, opt-in: it plays only when the visitor presses the ♪ "Play music"
  // button (and resumes on later visits if they left it on). Put the file at assets/music.mp3.
  // If the file is missing, the ♪ button simply stays hidden.
  music: {
    src: "assets/music.mp3",
    volume: 0.35,
    credit: "Music: “Go!” by NEFFEX",
  },

  // Contact form delivery. Leave empty to open the visitor's email app instead.
  // To receive messages directly: make a free form at https://formspree.io,
  // then paste its endpoint here, e.g. "https://formspree.io/f/abcdwxyz".
  formEndpoint: "",  copyright: "2026 Vaibhav Sen. All rights reserved.",
};
