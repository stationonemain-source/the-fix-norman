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
- Scripts: `cuts2.py` (BiRefNet + human-seg mattes → `cutouts2/`), `repair.py` (`plain`, `dehand`,
  `straighten`), `runcuts.py` (rebuilds all six cups), `export.py` (cups → `site/img`), `stamp.py` (re-stamp
  the `?v=` cache-busters), `verify/*.js` (harvesters, screenshots, `cupshots.js` per-drink, hit tests).
- Preview: `.claude/launch.json` entry `the-fix` → `python -m http.server 8767` on `site/`.

## The cups — v2, 2026-09-16 (Circle: "the hero cups are not clean")

Every cup on the page is **cut out of The Fix's own photograph**. Nothing generated, nothing paid for.
`runcuts.py` rebuilds all six from `photos/raw/` + `cutouts2/`; `export.py` writes `site/img`.

1. **`cuts2.py` — BiRefNet (`birefnet-general-lite`) mattes, not u2net.** The v1 u2net mattes bit chunks out
   of the cup sides, dropped every straw, and left soft edges; BiRefNet keeps the straw and the clear lid
   with a crisp edge, and on **four of five photos it drops the hand by itself**. `birefnet-general` (full)
   dies with "bad allocation" on this box — the matte is predicted on a 1400 px copy and resized back up,
   applied to the full-resolution photo.
2. **`repair.plain`** for pink, cinnamon, sprinkles, green: the photograph, matted. That is all.
   The pink photo has a second straw standing in the holder behind the cup; `runcuts.py` keeps only the
   largest connected piece so it does not float beside the lid.
3. **`repair.dehand`** for the two clinked ombré teas (g08), which each have a hand on them. The v1 approach
   repainted the whole body and looked painted. v2 repaints **only the half the hand is on, below the row
   the hand starts** (25% and 35% of each cut); everything else is the untouched photograph.
   - Skin detection by colour **failed** — a blown-out knuckle and a highlight on the plastic are the same
     colour. Do not go back to it. The hand's extent is given by `hand=` and `occ_from=`.
   - `u2net_human_seg` does not isolate a hand: it returns hand AND cup as one "person holding a thing".
   - The repaint is the drink's own radial profile from the clean half, median-smoothed over ±6 rows.
   - The light is one-sided, so a **luminance** gain measured just above the hand carries the brightness
     across. A per-channel gain turned the red cup orange (G≈50, B≈36 — 20% there is a hue shift).
   - Both joins are feathered, but only where the photo under the feather is already close in colour;
     unguarded, the fade let a thumb-tip ghost through.
   - `straighten()` stands both upright; they were photographed mid-clink.

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

## Fact-check, 2026-09-16

Everything re-verified; `BRIEF.md` → "Fact-check log" has the table and the 12 changes. The one that was
flat **wrong**: "creatine" in the boosters, from misreading "Cr7" on their board. Also removed a customer's
false claim that they are the only club still open (The Tower is), a guessed flavour ("watermelon"), a
per-cup protein figure that belongs to the board, and two invented details about the lounge. Google search
now serves this box a bot check — do not try to get past it.

## Claims on the page and where each comes from

- 4.4 / 28 reviews ← Google, 2026-09-15. 4.2K ← Instagram (4,246). "Seven days" ← their own hours.
- Hours Mon–Fri 7–7, Sat–Sun 10–7 ← **their own Instagram bio** (first-party).
- "The OG nutrition lounge" · "Join the FIX FAM" ← their Instagram bio, verbatim.
- "Your local caffeine dealer" ← their own storefront window.
- The board cards and the ingredient wall ← their own menu board photo (g13) and their Facebook intro.
- The three review quotes ← Google, first names as Google shows them; Monica C.'s trimmed with an ellipsis.
- The five drink names are **descriptions of the photographs, not menu items** ("Cinnamon" is the one that reaches:
  the photo shows brown flecks, and the HUD says only that plus that a review names the cinnamon roll shake) — no public menu names
  their flavours. The page says flavours rotate and to point at a colour. Only "cinnamon roll" is a real
  name, and it is attributed to the reviews, not to the cup in the picture.
- ⚠️ **The phone number is third-party.** (405) 495-1299 is on restaurantguru, restaurantji and Yahoo, but
  NOT on their Google profile. It appears three times on the page (header, visit CTA, footer).
  **Confirm it with the owner before sending this to anyone.**
- ⚠️ **No prices anywhere**, on purpose — see `BRIEF.md`.
- The lockup mark is our own square-T device, **not their logo file**. Their real wordmark is the blue
  slab in the storefront photo. Get the vector from the owner before this ships as theirs.

## Gates passed 2026-09-16 (re-run after the cup and fact-check pass)

- accesslint live audit: **0 violations**.
- Console/page errors: **none**, desktop 1440×900 and phone 390×844 (Pixel UA, touch).
- Hit test across the whole page: nothing paints over the copy, every link and button is reachable, and
  **no tap target under 24 px** (the nav links were 19 px tall and were padded).
- Phone: `scrollWidth` 390, no horizontal overflow; page height 10,243 px.
- Every drink screenshotted in place (`verify/cupshots.js`). Cups 435 KB for all five.

## Not done / next

- Owner has to confirm: the phone number, the prices, and hand over the real logo vector.
- No ordering integration (the CTA is `tel:` + directions).
- The green tea (`cutouts/f_green.png`) is cut out and exportable but is only used as a photo; it is the
  sixth cup if a slot is ever wanted.
- Instagram cannot be harvested from this box (same as The Tower). If flavour names are ever wanted, the
  owner or a phone can screenshot the TEAS and TEA DROPS highlights.
