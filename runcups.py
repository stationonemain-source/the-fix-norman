import os
os.chdir('C:/Users/Circl/the-fix')
import importlib, cuprebuild
importlib.reload(cuprebuild)
from PIL import Image

# RAINBOW — right hand occludes the right side from y~560, so the clean half is the LEFT.
cuprebuild.build('photos/raw/g08_hi.jpg', 'cutouts/g08_rembg.png', (530, 220, 1010, 1050),
                 'cutouts/f_rainbow.png', clean='left', lid_y=120, body_from=130,
                 satmin=0.40, rowsmooth=6, base_round=0.05)
# SUNSET — left hand occludes the left side from y~420, so the clean half is the RIGHT.
cuprebuild.build('photos/raw/g08_hi.jpg', 'cutouts/g08_rembg.png', (180, 240, 542, 920),
                 'cutouts/f_sunset.png', clean='right', lid_y=90, body_from=95,
                 satmin=0.42, rowsmooth=6, base_round=0.05)

sheet = Image.new('RGB', (1000, 840), (9, 9, 11))
for i, f in enumerate(['cutouts/f_rainbow.png', 'cutouts/f_sunset.png']):
    im = Image.open(f); im.thumbnail((460, 800))
    sheet.paste(im, (60 + i * 470, 20), im)
sheet.save('verify/rebuild.jpg', quality=92)
print('sheet ok')
