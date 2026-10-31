// All site content lives here. To use your own photos, drop them in ./assets
// and point the paths below at them (e.g. image: "assets/scoop.png").
const SITE = {
  // Face on the floating "Let's Talk" pills. Empty string = show the "VS" monogram.
  avatar: {
    talk: "",
  },

  // Dot-matrix portrait beside the About text. Empty `photo` hides it.
  // columns: dots across (more = finer detail). zoom/focus: crop in around a point (0..1 of the photo).
  // gamma: below 1 brightens mid-tones, above 1 darkens them.
  about: {
    photo: "assets/about.jpg",
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

  // Used by the hero slider and the Work list. `image` is optional (e.g. "assets/scoop.png").
  // `cats` must match a service `cat` below so the service rows can filter the Work list.
  projects: [
    { name: "Scoop", tagline: "Your media. Your device.", stack: "Kotlin · Jetpack Compose · Material 3 · Room", cats: ["mobile"], live: "https://vabxsen.github.io/Scoop/", source: "https://github.com/vabxsen/Scoop" },
    { name: "Kimi", tagline: "Small rituals. A brighter every day.", stack: "Kotlin · Jetpack Compose · Firebase", cats: ["mobile"], source: "https://github.com/vabxsen/Kimi" },
    { name: "Budgie", tagline: "A clearer picture of your subscriptions.", stack: "Kotlin · Jetpack Compose · WorkManager · React", cats: ["mobile"], source: "https://github.com/vabxsen/budgie" },
    { name: "Doclee", tagline: "Powerful PDF tools. Private by design.", stack: "React · TypeScript · pdf-lib", cats: ["web"], live: "https://doclee.web.app/", source: "https://github.com/vabxsen/Doclee" },
    { name: "Dailynx", tagline: "Small habits. Lasting progress.", stack: "React · TypeScript · Firebase", cats: ["web"], live: "https://dailynx.web.app/", source: "https://github.com/vabxsen/Dailynx" },
    { name: "PricePilot", tagline: "Know the right moment to buy.", stack: "React · TypeScript · Firebase", cats: ["web"], live: "https://pricepilot.web.app/", source: "https://github.com/vabxsen/PricePilot" },
    { name: "PinDrop", tagline: "Location sharing. Permission first.", stack: "React · Express · PostgreSQL", cats: ["web"], live: "https://pindrop-locationtracker.firebaseapp.com/", source: "https://github.com/vabxsen/PinDrop" },
    { name: "NexRig", tagline: "Plan the build. Check every part.", stack: "React · TypeScript · Zustand", cats: ["web"], live: "https://nexrig.web.app/", source: "https://github.com/vabxsen/Nexrig" },
    { name: "Gecko AI", tagline: "Exploring native AI experiences.", stack: "Kotlin · Android", cats: ["mobile", "ai"], source: "https://github.com/vabxsen/gecko" },
    { name: "Native AI", tagline: "A little help. Just a word away.", stack: "Python · Tkinter · SpeechRecognition", cats: ["desktop", "ai"], source: "https://github.com/vabxsen/Native-Ai" },
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

  // Big round buttons in the link marquee.
  tires: [
    { label: "GitHub", url: "https://github.com/vabxsen" },
    { label: "Email", url: "mailto:cheeseburst06@gmail.com" },
    { label: "Scoop", url: "https://vabxsen.github.io/Scoop/" },
    { label: "Doclee", url: "https://doclee.web.app/" },
    { label: "Dailynx", url: "https://dailynx.web.app/" },
    { label: "Repositories", url: "https://github.com/vabxsen?tab=repositories" },
  ],

  email: "cheeseburst06@gmail.com",

  // Looping background music. Starts on the visitor's first click/tap (browsers block sound
  // before that) and can be switched off with the ♪ button. Put the file at assets/music.mp3.
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
