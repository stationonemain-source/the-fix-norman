"""Export the five cutout cups into site/img at the three sizes the page uses."""
import os
from PIL import Image
os.chdir('C:/Users/Circl/the-fix')
SLOTS = [('01', 'f_rainbow'), ('02', 'f_sunset'), ('03', 'f_pink'),
         ('04', 'f_shake'), ('05', 'f_sprinkle')]
total = 0
for n, f in SLOTS:
    im = Image.open('cutouts/%s.png' % f).convert('RGBA')
    im = im.crop(im.getbbox())
    for suffix, h in [('-cup', 1200), ('-cup-m', 760), ('-card', 520)]:
        w = max(1, round(im.size[0] * h / im.size[1]))
        im.resize((w, h), Image.LANCZOS).save('site/img/%s%s.webp' % (n, suffix),
                                              'WEBP', quality=90, method=6)
    kb = os.path.getsize('site/img/%s-cup.webp' % n) // 1024
    total += kb
    print(n, f, im.size, '->', kb, 'KB')
print('cups total', total, 'KB')
