# Vaibhav Sen — Portfolio

A single-page portfolio. No build step: plain HTML, CSS and JavaScript.

## Preview

- **Quickest:** double-click `index.html`. It opens in your browser and works as-is.
- **Like a real server:** double-click `preview.bat` (needs Python), which opens http://localhost:5500.

## Edit content

Everything you'd change lives in **`content.js`**:

| What | Key |
| --- | --- |
| Projects: name, tagline, stack, links, card visual (`cover`), pop-up screenshots (`gallery`), `summary` and `features` | `projects` |
| Dot-matrix portrait beside the About text (dot count, crop, brightness). The dots come from `about-map.js`, a small brightness map made from the photo, so the photo itself is never published. To change the photo, ask for a new map. | `about` |
| Stat circles under "Always building" | `stats` |
| Tools strip, service rows, Journey cards, big scrolling social links | `tools`, `services`, `journey`, `bigLinks` |
| Email the contact chat sends to | `email` |
| What the contact chat says at each step (`{name}` becomes the visitor's name) | `chat` |

Put images in `assets/` and reference them like `"assets/scoop.png"`.

## Background music

The site loops `assets/music.mp3` (“Go!” by NEFFEX). To add it:

1. Download the MP3 from NEFFEX's official links (in the YouTube video's description or on neffex.com). Don't rip it from YouTube itself.
2. Save it as `assets/music.mp3`.

It's opt-in: nothing plays until the visitor presses **♪ Play music** in the bottom-right (on phones it's at the end of the Menu, with Pause motion, so neither covers the page). Then it loops, and the same button turns it off. If a visitor leaves it on, it resumes on their first click next visit. NEFFEX's copyright-free tracks require credit, which runs in the footer ticker (`music.credit` in `content.js`). Until the file exists, the button stays hidden and nothing plays.

## Contact chat

**Let’s Talk** opens a short chat that asks for the visitor's name, message and email, one at a time. With `formEndpoint` empty, **Send** opens the visitor's email app with everything filled in. To receive messages directly:

1. Create a free form at https://formspree.io.
2. Copy its endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. Paste it into `formEndpoint` in `content.js`.

## Share image

`og-image.png` is the picture shown when the site's link is shared (WhatsApp, LinkedIn, Discord, X). It's a 1200 × 630 copy of the hero, made from `tools/og-image.html` with the site's own styles and screenshots. After changing the design, remake it with the command at the top of that file, then bump the `?v=` number on the two `og-image.png` links in `index.html` so sharing apps fetch the new one.

## Deploying

The site lives at https://vabxsen.vercel.app. Every push to `main` deploys it automatically.

If you move to a custom domain, replace `vabxsen.vercel.app` with the new domain in:

- `index.html`: the canonical link, the share-preview tags and the structured data
- `robots.txt`
- `sitemap.xml`
