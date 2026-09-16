"""Put The Fix's real logo on the site (2026-09-16, Circle sent it; the file is their
Facebook profile picture, brand/fb_logo.jpg, 500x500).

The logo: a black disc, THE FIX in a tall condensed face with every letter its own
colour, ENERGY & NUTRITION in white beneath. Letter colours sampled from the file:
T #FD65C3 · H #7ED958 · E #03C2CB · F #FE914C · I #8B52FB · X #5371FB."""
import io, os
import numpy as np
from PIL import Image, ImageDraw
os.chdir('C:/Users/Circl/the-fix')

# ---- 1. image assets: the disc with its white corners made transparent ----
src = Image.open('brand/fb_logo.jpg').convert('RGB')
W, H = src.size
S = 4
mask = Image.new('L', (W * S, H * S), 0)
# the disc is inset a few px from the square edge in their file
ImageDraw.Draw(mask).ellipse((26 * S, 26 * S, (W - 26) * S, (H - 26) * S), fill=255)
mask = mask.resize((W, H), Image.LANCZOS)
disc = src.convert('RGBA'); disc.putalpha(mask)
disc = disc.crop(disc.getbbox())
disc.save('brand/logo-disc.png')
os.makedirs('site/img', exist_ok=True)
for px in (128, 256, 512):
    disc.resize((px, px), Image.LANCZOS).save('site/img/logo-%d.webp' % px, 'WEBP', quality=92, method=6)
disc.resize((64, 64), Image.LANCZOS).save('site/img/favicon-64.png')
disc.resize((180, 180), Image.LANCZOS).save('site/img/apple-touch-icon.png')
print('logo assets written', disc.size)

# ---- 2. markup ----
p = 'site/index.html'
s = io.open(p, encoding='utf-8').read()
n = 0


def sub(old, new, why, count=1):
    global s, n
    assert s.count(old) >= count, 'NOT FOUND: ' + why
    s = s.replace(old, new); n += 1
    print('ok  -', why)


WORD = ('<span class="fx-word" aria-hidden="true"><i style="--lc:#FD65C3">T</i><i style="--lc:#7ED958">H</i>'
        '<i style="--lc:#03C2CB">E</i> <i style="--lc:#FE914C">F</i><i style="--lc:#8B52FB">I</i>'
        '<i style="--lc:#5371FB">X</i></span>')
OLD_MARK = ('<span class="mark" aria-hidden="true"><svg viewBox="0 0 34 34" fill="none"><rect x="1.2" y="1.2" width="31.6" height="31.6" rx="8" stroke="currentColor" stroke-width="2.2"/>'
            '<path d="M9 11.5h16M17 11.5v13.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></span>')
NEW_MARK = '<img class="mark" src="img/logo-128.webp" srcset="img/logo-128.webp 1x, img/logo-256.webp 2x" width="40" height="40" alt="" decoding="async">'

sub(OLD_MARK, NEW_MARK, 'header + footer: their logo replaces our square-T mark', count=2)
sub('<span class="lockup-text"><b>The Fix</b><small>Energy &amp; Nutrition Lounge</small></span>',
    '<span class="lockup-text"><b>' + WORD + '<span class="sr-only">The Fix</span></b><small>Energy &amp; Nutrition</small></span>',
    'header lockup: the wordmark in the logo colours, subline as the logo writes it')
sub('<div><b>The Fix</b><span>Energy &amp; Nutrition Lounge</span></div>',
    '<div><b>' + WORD + '<span class="sr-only">The Fix</span></b><span>Energy &amp; Nutrition Lounge</span></div>',
    'footer lockup: wordmark in the logo colours')
sub('<p class="foot-word" aria-hidden="true">The <em>Fix</em></p>',
    '<p class="foot-word" aria-hidden="true">' + WORD.replace('class="fx-word" aria-hidden="true"', 'class="fx-word"') + '</p>',
    'footer giant word: THE FIX letter by letter, as the logo is')

# favicon + touch icon: the real disc
old_icon = s[s.index('<link rel="icon"'):]
old_icon = old_icon[:old_icon.index('>') + 1]
sub(old_icon, '<link rel="icon" type="image/png" href="img/favicon-64.png">\n<link rel="apple-touch-icon" href="img/apple-touch-icon.png">',
    'favicon: their logo')

# the wordmark face: condensed like the logo
sub('family=Anton&family=Archivo+Black', 'family=Anton&family=Bebas+Neue&family=Archivo+Black', 'fonts: add Bebas Neue for the wordmark')

# their own sunny storefront shot from the Facebook cover — it shows "104" on the door
sub('      <img src="img/p/g12-s.webp" alt="The lounge corner: couch, glass table and the striped mural" loading="lazy" decoding="async">',
    '      <img src="img/p/g12-s.webp" alt="The lounge corner: couch, glass table and the striped mural" loading="lazy" decoding="async">\n'
    '      <img src="img/p/fbcover-s.webp" alt="A blue tea held up under THE FIX sign on a sunny day" loading="lazy" decoding="async">',
    'photos: add their Facebook cover (storefront in the sun, suite 104 on the door)')

io.open(p, 'w', encoding='utf-8').write(s)
print(n, 'markup edits')

cov = Image.open('brand/fb_cover.jpg').convert('RGB')
cov.save('site/img/p/fbcover-s.webp', 'WEBP', quality=82, method=6)
print('fbcover-s.webp', cov.size)

# ---- 3. styles ----
c = io.open('site/css/site.css', encoding='utf-8').read()
c = c.replace('.mark{width:32px;height:32px;flex:none;color:var(--brand);display:block}\n.mark svg{width:100%;height:100%;display:block}',
              '.mark{width:40px;height:40px;flex:none;display:block;border-radius:50%;box-shadow:0 0 0 1px rgba(244,239,232,.16)}')
c = c.replace('.lockup-text b{font-family:var(--brand-face);font-size:20px;letter-spacing:.02em;text-transform:uppercase}',
              '.lockup-text b{font-family:var(--wordmark);font-weight:400;font-size:27px;line-height:.9;letter-spacing:.02em;text-transform:uppercase}')
c = c.replace('.foot-lockup b{display:block;font-family:var(--brand-face);font-size:26px;text-transform:uppercase;line-height:.95;letter-spacing:.02em}',
              '.foot-lockup b{display:block;font-family:var(--wordmark);font-weight:400;font-size:34px;text-transform:uppercase;line-height:.9;letter-spacing:.02em}')
c = c.replace('.foot-word em{font-style:normal;color:var(--accent)}',
              '.foot-word{font-family:var(--wordmark);letter-spacing:.01em}')
c = c.replace('  --brand-face:"Archivo Black","Arial Black",sans-serif;',
              '  --brand-face:"Archivo Black","Arial Black",sans-serif;\n'
              '  /* the logo\'s wordmark: tall condensed caps, one colour per letter */\n'
              '  --wordmark:"Bebas Neue","Anton","Arial Narrow",sans-serif;')
c = c.replace('/* ---------- the film / stage ---------- */',
              '.fx-word{white-space:nowrap}\n.fx-word i{font-style:normal;color:var(--lc)}\n\n/* ---------- the film / stage ---------- */')
c = c.replace('  .mark{width:26px;height:26px}', '  .mark{width:34px;height:34px}')
c = c.replace('  .lockup-text b{font-size:18px}', '  .lockup-text b{font-size:23px}')
io.open('site/css/site.css', 'w', encoding='utf-8').write(c)
print('css done; wordmark token present:', '--wordmark' in c)
