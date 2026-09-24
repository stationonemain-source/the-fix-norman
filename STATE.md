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

## The cups — v3, 2026-09-16 (Circle: "the cups are still not clean. You can tell")

v2 was **not clean** and was reported as clean: it was judged from thumbnails. At full size the Rainbow and
Sunset repaints showed rectangular blocks, a seam and ragged edges. **Judge a cup at the size it is shown**
(`verify/cupshots.js W H TAG` clicks through all five; crop the frame at 100%) — never from a contact sheet.

| Cup | Source | How |
|---|---|---|
| 01 Rainbow | g08 right cup | **GPT Image 2 edit** removed the hand (`gptedit.py --one right`), then BiRefNet matte + upright |
| 02 Sunset | g08 left cup | **GPT Image 2 edit** removed the hand and sleeve (`gptedit.py --one left`), then matte + upright |
| 03 Pink | g03 | BiRefNet matte of the photograph, loose straw removed, stood upright (it leaned 8°) |
| 04 Cinnamon | g04 | BiRefNet matte of the photograph |
| 05 Sprinkles | g09 | **GPT Image 2 edit** removed the hand, then matte, straight sides, level |

- **Rainbow and Sunset are their photo with the hands removed by an image model**, the same thing The Tower's
  site did with Kling O1 (v4.1 there). The drink, colours, lid, striped straw, ice and ribbing all match
  photo g08; the model rebuilt what the hand covered. Two edits, ~$0.16 on the OpenAI key. The other three
  cups are untouched photographs.
- Edit each cup **on its own crop**, padded to 2:3, with `--one`: editing both at once gives two cups whose
  lids overlap, and splitting them clips one lid. The prompt names the cup by colour and says to remove any
  second cup at the frame edge. `input_fidelity` is not supported on gpt-image-2 (400).
- `finishedit.py sunset|rainbow` mattes and stands the cup up by fitting its own axis. **One cup per
  process**: a second BiRefNet run in the same process dies with "bad allocation" on this box, and the
  matte is predicted on a 1024 px copy.
- Rejected, do not retry: repainting from the clean half (`repair.py::dehand` — kept for reference, it is
  what shipped the blocky v2), skin-by-colour masks, u2net_human_seg as a hand mask.
- **Cup outlines (Circle, 2026-09-16: "it's a cup, it doesn't curve anywhere").** Every hero cup now goes
  through `straightcup.py SRC DST [RIM_FRAC]` then `level.py DST [RIM_FRAC]`, from the untouched cutouts
  `cutouts/f_{rainbow,sunset,pink,shake}.bak.png` and `f_sprinkle.edit.bak.png`:
  - each side is ONE straight line fitted to the real edge under the lid rim;
  - the cup ends on the last full-width row above the rounded heel, with a flat bottom (a 3.5% arc for
    perspective, meeting the sides at a corner). The heel is dropped, not rebuilt: stretching it smeared the
    texture and mirroring it drew a visible reflection on Cinnamon and Sprinkles. Cups lose 3-6% height;
  - `level.py` rotates until both sides taper equally (Sprinkles leaned 2.4 deg, the rest under 1).
  Measured after: every side within 0.6 px of a straight line at display size, lean under 0.15 deg.
- **Do not reuse `smoothside` (deleted).** It fitted the sides as curves with a rounded base and made the
  Sunset taper to a point. Circle's words for it are in the session; a cup is a frustum.
- Sprinkles is now also an image edit (`gptedit.py --src photos/raw/g09_hi.jpg --box 256,1067,966,2048`):
  the hand in g09 had bitten the bottom-left of the cup away. Sticker text checked against the photo.
- Cup `<img>` URLs carry `?v=` like css/js, so a phone that has seen an old cup gets the new one.
- The shakes have no straw, so they draw at 64% (phone 40%) of the stage instead of 74% (47%) to read the
  same size as the teas.

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
- **The logo is theirs** (2026-09-16, Circle sent it): their Facebook profile picture, pulled at 500×500 to
  `brand/fb_logo.jpg` by `verify/fblogo.js`. Black disc, THE FIX one colour per letter —
  T `#FD65C3` · H `#7ED958` · E `#03C2CB` · F `#FE914C` · I `#8B52FB` · X `#5371FB` (sampled from the file) —
  ENERGY & NUTRITION in white. On the site: the disc in the header and footer lockups, the favicon and the
  touch icon (`logopatch.py` masks the white corners off); the wordmarks beside it and the giant footer word
  are live type in **Bebas Neue** in those six colours, which is what keeps them sharp. The storefront sign
  (white slab letters, ENERGY AND NUTRITION in blue) is a different mark and is only in the photos.
  No vector exists yet; 500 px is enough for the web but not for print.

## Audit 2026-09-16 — desktop 1920 + 1440, phone 360 / 390 / 430

`verify/audit.js W H TAG [mobile]` walks the whole page in viewport steps and reports overflow, upscaled
images and sub-12 px text; `verify/boardwalk.js` captures each stacking card settled; `verify/foothit.js`
hit-tests the curtain footer at the page bottom (scrollIntoView cannot reach a fixed footer, so the generic
hit test reports its links as blocked — that is the test, not the page).

Desktop: the visit banner was a 1400 px crop of a green cup stretched to 1920 → now their interior photo at
native 2016 px. Photo rows stopped short on wide screens and started at x=0 → they start on the page wrap
and scale with the screen. The white rules above/below a photo row were the browser's focus ring on the
scroller (it has tabindex) → no ring on click, a brand ring for keyboard. Stickers hung off the left edge
and out of the bottom of the story at 1920 → four stickers in space that is empty at every width.
Board card content now sits on the page wrap. **The photo rows' screen-reader label said "Photos from The
Tower"** → fixed, and every Tower mention in public JS/CSS comments removed. The holidays line still
leaned on the "ones still open" claim → "Holiday hours go up on their Instagram." Header subline 9 → 10.5 px,
chips 11 → 12 px. Card titles no longer touch line to line. The menu-board thumbnail opens full size.

Phone: the cup base slid behind the drink panel → smaller and higher. Headlines left "IT." and "ST." alone
→ `text-wrap:balance`. The board numerals ran through the titles; then, moved under the copy, **the next
card covered the copy before it could be read** → copy at the top of each card, numeral in the bottom
corner (the part that is covered first). One sticker covered the heading and one hung off the edge → one,
pinned inside. The drink arrows were squeezed to 27 px ovals → `flex:none`. Subline 7.5 → 9 px.

## Gates passed 2026-09-16 (after the audit)

- accesslint live audit: **0 violations**.
- Console/page errors: **none**, desktop 1440×900 and phone 390×844 (Pixel UA, touch).
- Hit test across the whole page: nothing paints over the copy, every link and button is reachable, and
  **no tap target under 24 px** (the nav links were 19 px tall and were padded).
- Phone: `scrollWidth` 390, no horizontal overflow; page height 10,243 px.
- Every drink screenshotted in place at 1920, 390 and 360 (`verify/cupshots.js`) and inspected at 100%.
- No horizontal overflow at 360, 390, 430, 1440, 1920; no tap target under 24 px; no console errors.

## Fall menu — added 2026-09-24

Circle sent their fall menu card (peach gingham, brown ink). New section `#fall` between the board and
Visit, plus a "Fall menu" nav link. **Teas:** Caramel Apple, Hocus Pocus, Harvest Moon, Wicked Witch.
**Shakes:** Pumpkin Spice, Pumpkin Pie, Pumpkin Spice Teddy Graham, Pumpkin Peanut Butter Cookie — copied
exactly off the card, no descriptions or prices added. The card itself is `site/img/p/fall(-s).webp`
(original in `brand/fall-menu-2026.webp`), shown as a thumbnail that opens full size. The section is styled
after the card: peach gingham, dashed brown border, ink `#6B1D0C`. These are the first **real flavour names**
on the site. When the season ends, delete the `#fall` section and its nav link.
`verify/fallshot.js [port]` screenshots it at 1440/1920/390/360 and reports overflow, tiny text, tap targets.

## Not done / next

- Owner has to confirm: the phone number and the prices. A vector of the logo is only needed for print.
- No ordering integration (the CTA is `tel:` + directions).
- The green tea (`cutouts/f_green.png`) is cut out and exportable but is only used as a photo; it is the
  sixth cup if a slot is ever wanted.
- Instagram cannot be harvested from this box (same as The Tower). If flavour names are ever wanted, the
  owner or a phone can screenshot the TEAS and TEA DROPS highlights.
