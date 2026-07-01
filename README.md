# Metehan Ulusoy — Portfolio

A fast, no-build static portfolio with awwwards-adjacent motion: a WebGL Simplex-noise
hero, Lenis smooth scroll bridged into GSAP ScrollTrigger, hand-rolled masked text
reveals, a pinned horizontal project gallery, a custom magnetic cursor, and a themed
boot-sequence preloader.

The design is **data-driven**: it implements the techniques that ranked highest across an
analysis of **1,806 developer portfolios** (see [`research/ANALYSIS.md`](research/ANALYSIS.md)).

## Tech

- **No build step.** Plain HTML/CSS/JS. Libraries load from CDN as classic globals.
- **GSAP + ScrollTrigger** — scroll choreography, pinning, reveals.
- **Lenis** — inertial smooth scroll, correctly bridged to ScrollTrigger.
- **Three.js** (lazy-loaded, DPR-capped) — the hero shader background.
- Graceful degradation: if any CDN is blocked, the page still renders and scrolls; the
  hero falls back to a CSS gradient.
- Respects `prefers-reduced-motion`, `save-data`, low-core devices and coarse pointers
  via an inline performance-tier boot script (`html[data-perf]`).

## Run locally

It opens by double-clicking `index.html`, but a tiny local server avoids any browser
file:// restrictions and is recommended:

```bash
cd "my portfolio"
python3 -m http.server 8000
# then open http://localhost:8000
```

(or `npx serve`).

## Deploy

It's a static folder — drag it into **Netlify**, **Vercel**, or push to a
`username.github.io` repo for **GitHub Pages**. No configuration needed.

## Make it yours — edit checklist

Search the code for `EDIT:` comments. The key spots:

| What | Where |
|---|---|
| Name, title, meta, social preview | `index.html` `<head>` + `<h1 class="hero__title">` |
| Role rotator words | `js/main.js` → `initRotator()` → `roles` array |
| Skills marquee | `index.html` → `.marquee__track` |
| Bio + meta + stats | `index.html` → `.about` section (and `data-count` numbers) |
| Projects (the 4 cards) | `index.html` → `.work__track` articles |
| Timeline / path | `index.html` → `.timeline` list |
| Social links | `index.html` → `.contact` section (LinkedIn + X are `#` placeholders) |
| Accent color / theme tokens | `css/styles.css` → `:root` (`--accent`) and the `[data-theme]` blocks |
| Hero shader colors | `js/hero.js` → `PALETTES` |

> No public email (by choice) — GitHub is the primary contact. LinkedIn / X are still `#`
> placeholders; set or remove them before publishing. The GitHub link already points to
> `github.com/metehanulusoy`.

## Structure

```
my portfolio/
├── index.html          # markup + content (edit here)
├── css/styles.css      # design tokens + all styling
├── js/
│   ├── main.js         # motion orchestration (Lenis/GSAP/cursor/reveals/work/…)
│   └── hero.js         # Three.js WebGL hero shader (lazy-loaded)
├── assets/             # favicon, OG image
└── research/           # the 1,806-portfolio analysis that informed this build
    ├── ANALYSIS.md     # ranked technique catalog + blueprint (read this!)
    ├── catalog.json    # the synthesized technique catalog
    ├── site-profiles.json  # deep-dives of the 27 standout sites
    ├── aggregate.json  # corpus-wide signature counts
    └── raw-stats.md    # the same counts as a table
```
