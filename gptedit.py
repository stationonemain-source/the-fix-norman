"""Remove the hands from The Fix's clinked-teas photo (g08) with GPT Image 2's edit
endpoint. The drinks, lids, straws and colours are theirs; only what the hands and the
sleeve covered is rebuilt. Billed to the OpenAI account (~$0.08 per image at high).

    python gptedit.py OUT.png [--quality high] [--dry-run]
"""
import argparse, base64, json, pathlib, sys
import requests

PROMPT = (
    "Photo edit. Remove BOTH hands, every finger, the painted nails and the dark sleeve completely. "
    "Keep the two plastic cups exactly as they are in this photo: the same two drinks, the same "
    "position, size and tilt of each cup, the left cup red fading down to orange, the right cup blue "
    "fading down through green to yellow, the same flat clear plastic lids, the same thin white "
    "straws, the same ice, reflections and highlights. Where a hand covered part of a cup, rebuild "
    "that part of the cup so it matches the rest of the same cup, including its straight tapered "
    "sides and its rounded base. Nothing holds the cups. Background: plain, even, pure white. "
    "Do not add, restyle or re-colour anything else. Photorealistic, same lighting."
)

ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('--src', default='photos/raw/g08_hi.jpg')
ap.add_argument('--quality', default='high')
ap.add_argument('--fidelity', default='')
ap.add_argument('--dry-run', action='store_true')
ap.add_argument('--one', choices=['left', 'right'], help='edit a single cup: crop it from g08, pad to 2:3, portrait output')
ap.add_argument('--box', help='x0,y0,x1,y1 crop of --src for a single-cup edit (use with --what)')
ap.add_argument('--what', help='how to name the cup in the prompt, e.g. "a purple and white milkshake under a clear dome lid"')
a = ap.parse_args()

cfg = json.loads((pathlib.Path.home() / '.station' / 'secrets' / 'openai.json').read_text(encoding='utf-8'))
model = cfg.get('image_model', 'gpt-image-2')

size = '1024x1024'
prompt = PROMPT
src_path = a.src
if a.one or a.box:
    from PIL import Image
    im = Image.open(a.src).convert('RGB')
    if a.box:
        box = tuple(int(v) for v in a.box.split(','))
    else:
        box = (0, 0, 560, im.size[1]) if a.one == 'left' else (490, 0, im.size[0], im.size[1])
    crop = im.crop(box)
    H = max(1150, int(crop.size[1] * 1.08)); W = int(H * 2 / 3)
    if crop.size[0] > W: W = int(crop.size[0] * 1.08); H = int(W * 3 / 2)
    canvas = Image.new('RGB', (W, H), (250, 250, 250))
    canvas.paste(crop, ((W - crop.size[0]) // 2, (H - crop.size[1]) // 2))
    src_path = 'edits/_in_%s.png' % (a.one or 'box')
    canvas.save(src_path)
    size = '1024x1536'
    what = a.what or ('the RED cup that fades down to orange' if a.one == 'left'
            else 'the BLUE cup that fades down through green to yellow')
    prompt = ("Photo edit. This photo shows " + what + " held by a hand. Remove the hand, every finger, "
              "the painted nails and any sleeve completely, and remove any part of a second cup, lid or straw "
              "at the edge of the frame. Keep this one cup exactly as it is: the same drink colours and "
              "layering, the same flat clear plastic lid, the same thin white straw with a red stripe, the "
              "same ice, reflections and highlights, the same tilt. Where the hand covered the cup, rebuild "
              "that part so it matches the rest of the same cup, with straight tapered sides and a rounded "
              "base. Show the whole cup, nothing cut off. Nothing holds it. Background: plain, even, pure "
              "white. Do not add, restyle or re-colour anything. Photorealistic, same lighting.")
    if a.box:
        prompt = ("Photo edit. This photo shows " + what + " held by a hand in front of a neon sign. "
                  "Remove the hand and every finger completely. Keep this one cup exactly as it is: the same "
                  "clear dome lid with the rainbow sprinkles on top, the same cream shake, the same purple "
                  "streaks inside the cup, the same round black sticker with its exact white text "
                  "(@thefixnorman, THE FIX, ENERGY & NUTRITION, 2100 W Lindsey Norman, OK), the same angle "
                  "and lighting. Where the hand covered the cup, rebuild that part to match the rest of the "
                  "same cup. A plastic cup has straight tapered sides and a flat bottom: no curve in the "
                  "sides. Show the whole cup, nothing cut off. Nothing holds it. Background: plain, even, "
                  "pure white, no sign. Do not add, restyle, re-colour or re-letter anything. Photorealistic.")
if a.dry_run:
    print('DRY RUN', model, src_path, size, a.quality, a.out); sys.exit(0)
data = {'model': model, 'prompt': prompt, 'size': size, 'quality': a.quality, 'n': '1'}
if a.fidelity:
    data['input_fidelity'] = a.fidelity
with open(src_path, 'rb') as fh:
    files = {'image[]': (pathlib.Path(src_path).name, fh, 'image/png' if src_path.endswith('.png') else 'image/jpeg')}
    r = requests.post('https://api.openai.com/v1/images/edits',
                      headers={'Authorization': 'Bearer ' + cfg['api_key']},
                      data=data, files=files, timeout=300)
if r.status_code != 200:
    print('HTTP', r.status_code, r.text[:600]); sys.exit(1)
j = r.json()
pathlib.Path(a.out).write_bytes(base64.b64decode(j['data'][0]['b64_json']))
u = j.get('usage', {})
print('wrote', a.out, 'usage', json.dumps(u)[:300])
