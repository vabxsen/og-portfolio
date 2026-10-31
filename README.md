# Vaibhav Sen — Portfolio

A single-page portfolio. No build step: plain HTML, CSS and JavaScript.

## Preview

- **Quickest:** double-click `index.html`. It opens in your browser and works as-is, except the dot-matrix portrait shows as a plain black-and-white photo (browsers block reading image pixels from local files).
- **Like a real server:** double-click `preview.bat` (needs Python), which opens http://localhost:5500.

## Edit content

Everything you'd change lives in **`content.js`**:

| What | Key |
| --- | --- |
| Projects (name, tagline, stack, links, optional `image`) | `projects` |
| Dot-matrix portrait beside the About text (photo, dot count, crop, brightness) | `about` |
| Stat circles under "Always building" | `stats` |
| Face on the "Let's Talk" pills (empty = "VS") | `avatar.talk` |
| Tools strip, service rows, Journey cards, round link buttons | `tools`, `services`, `journey`, `tires` |
| Email shown and used by the form | `email` |

Put images in `assets/` and reference them like `"assets/scoop.png"`.

## Background music

The site loops `assets/music.mp3` (“Go!” by NEFFEX). To add it:

1. Download the MP3 from NEFFEX's official links (in the YouTube video's description or on neffex.com). Don't rip it from YouTube itself.
2. Save it as `assets/music.mp3`.

It starts on the visitor's first click or tap (browsers block sound before that), loops forever, and the **♪ Music** button in the bottom-right turns it off. The site remembers that choice. NEFFEX's copyright-free tracks require credit, which runs in the footer ticker (`music.credit` in `content.js`). Until the file exists, the button stays hidden and nothing plays.

## Contact form

With `formEndpoint` empty, **Send** opens the visitor's email app. To receive messages directly:

1. Create a free form at https://formspree.io.
2. Copy its endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. Paste it into `formEndpoint` in `content.js`.

## Before you deploy

- In `index.html`, change `og:image` to the full URL of `og-image.png` on your domain, so link previews show the image.
- Deploy the whole folder (e.g. drag it into Vercel or Netlify).
