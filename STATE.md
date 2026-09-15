# The Fix Energy & Nutrition Lounge — spec site — STATE (HEAD file; read this first)

Built 2026-09-15 on the PC, for **The Fix Energy & Nutrition Lounge**, 2100 W Lindsey St Ste 104,
Norman OK. This is **our spec/demo build**, the same shape as `~/tower-nutrition` (LOADOUT) and
`~/downtown-fitness`. Circle asked for "the Tower site, same style, with their info".

**They have no working website.** Their Facebook still points at `thefixnorman.business.site`, which is a
Google 404 — Google retired Business sites in 2024 — and their Google profile shows "Add website". That
dead link is the pitch.

## Where things are

- `site/` — the deliverable. `index.html`, `css/site.css`, `js/loadout.js` (the engine),
  `js/manifest.js` (`{}` — the frame engine is dormant, the still path drives everything),
  `js/vendor/` (GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.18), `img/NN-cup|cup-m|card.webp` (the five
  cutout cups), `img/p/gNN(-s).webp` (eleven of their own photos). **3.6 MB total.**
- `BRIEF.md` — every claim on the page with its source. Read it before showing the site to the owner.
- `photos/raw/` — the 13 Google Business photos at full resolution + `urls.json` + `reviews.txt`. Not in git.
- `cutouts/` — the working cup cutouts (`f_rainbow`, `f_sunset`, `f_pink`, `f_shake`, `f_sprinkle`,
  `f_green`). Not in git; `export.py` turns them into `site/img`.
- Scripts: `cuprebuild.py` (the radial-profile rebuild), `mirrorcup.py` (`conefix`, the earlier mirror
  approach, still used for the three easy cups), `finish.py` (strip a neighbouring cup's sliver, stand the
  cup upright), `export.py` (cups → `site/img`), `stamp.py` (re-stamp the `?v=` cache-busters),
  `verify/*.js` (harvesters, screenshots, hit tests).
- Preview: `.claude/launch.json` entry `the-fix` → `python -m http.server 8767` on `site/`.

## The cups — how five real drinks got onto a black stage

Every cup on the page is **cut out of The Fix's own photograph**. No cup is generated; no image model was
used anywhere in this build; nothing was paid for. The pipeline, in order of how hard the photo was:

1. **`rembg` (u2net, local, free)** mattes the cup. Installed this session with `pip install rembg`
   (`~/.rembg/models/u2net.onnx`, 176 MB, downloaded once). It is fast — under 2 s for a 3000 px photo —
   and it **removes the hand on its own** on three of the five (pink, sprinkles, green): the hand is not
   salient enough to survive. Keep this tool: it replaces the Higgsfield/Kling matte credits entirely.
2. **`mirrorcup.conefix`** repairs the bites rembg takes out of a straight cup side: fit the side as a
   line from clean rows, restore the silhouette to it, fill from the nearest real pixel in the same row.
3. **`cuprebuild.build`** is for the two cups a hand genuinely covers (the two ombré teas in photo g08 —
   they are being clinked together, one hand each). It rebuilds the cup as a **radial profile of its own
   pixels**: measure the row profile on the clean half only, median it over ±6 rows, paint both halves from
   it. Every colour written is that drink's real colour at that height.
   - Three earlier attempts are worth not repeating. Plain saturation masking called skin "cup" and the
     silhouette ballooned. Mirroring pixel-for-pixel about the axis left a hard seam at the split row, a
     squared-off base and stair-stepped edges — all of it obvious at hero size. **Fitting the cup side as a
     straight line is the load-bearing idea**, and it must be fitted on rows BELOW the lid: the lid flares
     wider than the body, and a line fitted through it lets a stray saturated pixel widen the silhouette
     (that is what put a salmon bar across the red cup).
   - The skin rule that works: skin is the one family that is red-dominant AND weakly saturated
     (`R>=G>=B and sat<0.55`). Red, orange, blue, green and yellow drinks all clear it.
4. **`finish.py`** drops the neighbouring cup's sliver out of the lid rows and rotates each cup upright.
   Both g08 cups were photographed tilted, and a tilted cup floating in a void reads as a mistake.

The sunset and rainbow still carry faint vertical ghosts where the highlight was mirrored; they read as
condensation. If the owner gives us real product shots, replace `cutouts/f_*.png` and rerun `export.py` —
nothing else changes.

## The design

Concept is theirs, not ours: **"get your daily fix"** off their own wall neon, so the photos section
heading is that sentence in a script face with a blue tube-glow and a pink bloom. Palette is read off
their own surfaces — sign blue `#2BB3F3`, menu-board yellow `#F6E24B`, wall-neon pink `#FF5FA2`, black
lounge. Faces: **Anton** (display), **Archivo Black** (the lockup and the cup sticker), **Caveat** (the
neon line, which is also the hand-written "the fix ♡" on their cup), Space Mono, Manrope.

Sections: one-screen drink selector (chips + arrows + swipe, no scroll hijack) → ticker → story with the
sticker bomb, the four proof numbers and three Google quotes → their photos in two draggable strips →
four stacking board cards → the ingredient wall off their menu board → visit + hours + FIX FAM → curtain
footer. Same engine contract as The Tower — read `~/tower-nutrition/STATE.md` "Engine facts you must not
break" before touching `loadout.js`, all of it still applies.

## Claims on the page and where each comes from

- 4.4 / 28 reviews ← Google, 2026-09-15. 4.2K ← Instagram (4,246). "Seven days" ← their own hours.
- Hours Mon–Fri 7–7, Sat–Sun 10–7 ← **their own Instagram bio** (first-party).
- "The OG nutrition lounge" · "Join the FIX FAM" ← their Instagram bio, verbatim.
- "Your local caffeine dealer" ← their own storefront window.
- The board cards and the ingredient wall ← their own menu board photo (g13) and their Facebook intro.
- The three review quotes ← Google, verbatim, first names as Google shows them.
- The five drink names are **descriptions of the photographs, not menu items** — no public menu names
  their flavours. The page says flavours rotate and to point at a colour. Only "cinnamon roll" is a real
  name, and it is attributed to the reviews, not to the cup in the picture.
- ⚠️ **The phone number is third-party.** (405) 495-1299 is on restaurantguru, restaurantji and Yahoo, but
  NOT on their Google profile. It appears three times on the page (header, visit CTA, footer).
  **Confirm it with the owner before sending this to anyone.**
- ⚠️ **No prices anywhere**, on purpose — see `BRIEF.md`.
- The lockup mark is our own square-T device, **not their logo file**. Their real wordmark is the blue
  slab in the storefront photo. Get the vector from the owner before this ships as theirs.

## Gates passed 2026-09-15

- accesslint live audit: **0 violations**.
- Console/page errors: **none**, desktop 1440×900 and phone 390×844 (Pixel UA, touch).
- Hit test across the whole page: nothing paints over the copy, every link and button is reachable, and
  **no tap target under 24 px** (the nav links were 19 px tall and were padded).
- Phone: `scrollWidth` 390, no horizontal overflow; page height 10,211 px.
- Weight 3.6 MB, cups 390 KB for all five.

## Not done / next

- Owner has to confirm: the phone number, the prices, and hand over the real logo vector.
- No ordering integration (the CTA is `tel:` + directions).
- The green tea (`cutouts/f_green.png`) is cut out and exportable but is only used as a photo; it is the
  sixth cup if a slot is ever wanted.
- Instagram cannot be harvested from this box (same as The Tower). If flavour names are ever wanted, the
  owner or a phone can screenshot the TEAS and TEA DROPS highlights.
