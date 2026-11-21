import sys
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]
W = H = 1080
ORANGE, WHITE, MUTED, STEEL = (245, 124, 0), (255, 255, 255), (170, 184, 214), (110, 130, 175)
F = lambda n, s: ImageFont.truetype(f'/usr/share/fonts/opentype/inter/{n}.otf', s)

def base(footer=True):
    img = Image.new('RGB', (W, H), '#0b1324'); d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=(int(11 + 9 * t), int(19 + 14 * t), int(36 + 25 * t)))
    d.rectangle([0, 0, W, 14], fill=ORANGE); d.rectangle([0, 0, 14, H], fill=ORANGE)
    d.text((64, 58), 'USE UNION DE SERVICIOS ESPECIALIZADOS', font=F('Inter-Bold', 24), fill=ORANGE)
    if footer: d.text((64, 1010), 'energia.useservices.company', font=F('Inter-Medium', 28), fill=MUTED)
    t = 'Panamá'; f = F('Inter-SemiBold', 26); w = d.textlength(t, font=f)
    d.rounded_rectangle([W - 64 - w - 36, 1000, W - 64, 1048], radius=24, outline=STEEL, width=2); d.text((W - 64 - w - 18, 1010), t, font=f, fill=WHITE)
    return img, d

def lines(d, x, y, text_lines, font, fill, gap):
    for i, t in enumerate(text_lines): d.text((x, y + i * gap), t, font=font, fill=fill)

def bullets(d, x, y, items, size=36, gap=64):
    f = F('Inter-SemiBold', size)
    for i, t in enumerate(items):
        yy = y + i * gap; d.rectangle([x, yy + 12, x + 16, yy + 28], fill=ORANGE); d.text((x + 36, yy), t, font=f, fill=WHITE)

def tower(d, cx, base_y, top, scale=1.0):
    s = scale; L = lambda p, q, w=8, c=WHITE: d.line([p, q], fill=c, width=max(2, int(w * s)))
    hw = 150 * s
    L((cx - hw, base_y), (cx - 30 * s, top + 80 * s)); L((cx + hw, base_y), (cx + 30 * s, top + 80 * s)); L((cx - 30 * s, top + 80 * s), (cx, top)); L((cx + 30 * s, top + 80 * s), (cx, top))
    span = base_y - top
    levels = [(base_y, hw), (top + span * .72, hw * .74), (top + span * .52, hw * .53), (top + span * .36, hw * .36)]
    for y, h in levels: L((cx - h, y), (cx + h, y), 7)
    for (y1, h1), (y2, h2) in zip(levels[:-1], levels[1:]):
        L((cx - h1, y1), (cx + h2, y2), 4, (150, 165, 200)); L((cx + h1, y1), (cx - h2, y2), 4, (150, 165, 200))
    for fy, arm in [(.2, 230), (.33, 175)]:
        yy = top + span * fy; a = arm * s; L((cx - a, yy), (cx + a, yy), 10, ORANGE)
        for sx in (-a, a): L((cx + sx, yy), (cx + sx, yy + 34 * s), 6); d.ellipse([cx + sx - 9 * s, yy + 34 * s, cx + sx + 9 * s, yy + 52 * s], fill=WHITE)

def save(img, name): img.save(f'{OUT}/{name}.jpg', quality=92, optimize=True); print(name)

# ---------- 1. Presentación ----------
img, d = base()
lines(d, 64, 130, ['Materiales y', 'equipos para', 'líneas eléctricas'], F('Inter-ExtraBold', 82), WHITE, 98)
d.text((64, 450), '13.8 · 34.5 · 115 · 230 kV', font=F('Inter-SemiBold', 44), fill=ORANGE)
fnt = F('Inter-SemiBold', 28); x = 64
for row, (y, items) in enumerate([(540, ['Transformadores', 'Alumbrado público']), (600, ['Estructuras', 'Aisladores y herrajes'])]):
    x = 64
    for t in items:
        w = d.textlength(t, font=fnt); d.rounded_rectangle([x, y, x + w + 40, y + 50], radius=25, outline=STEEL, width=2); d.text((x + 20, y + 9), t, font=fnt, fill=WHITE); x += w + 56
tower(d, 850, 960, 640, 0.78)
save(img, 'post1-presentacion')

# ---------- 2. Transformadores ----------
img, d = base()
d.text((64, 150), 'Transformadores', font=F('Inter-ExtraBold', 100), fill=WHITE)
d.text((64, 272), 'de distribución y de potencia', font=F('Inter-SemiBold', 44), fill=ORANGE)
bullets(d, 64, 380, ['Monofásicos y trifásicos', 'Tipo poste y pedestal (pad-mounted)', 'Potencia y subestaciones', 'Redes de 13.8 a 230 kV'], 36, 66)
# transformador de pedestal
cx, gy = 760, 940
d.rounded_rectangle([cx - 230, gy - 330, cx + 230, gy], radius=18, outline=WHITE, width=8, fill=(20, 33, 61))
d.rectangle([cx - 230, gy - 330, cx + 230, gy - 300], fill=ORANGE)
for i in range(7):                                             # aletas del radiador
    x = cx - 190 + i * 63; d.rounded_rectangle([x, gy - 270, x + 36, gy - 40], radius=8, outline=STEEL, width=4)
for bx in (cx - 140, cx, cx + 140):                            # aisladores (bushings)
    d.rectangle([bx - 14, gy - 400, bx + 14, gy - 330], fill=WHITE)
    for k in range(3): d.ellipse([bx - 26, gy - 395 + k * 20, bx + 26, gy - 375 + k * 20], outline=ORANGE, width=4)
    d.line([(bx, gy - 440), (bx, gy - 400)], fill=WHITE, width=6)
d.line([(cx - 140, gy - 440), (cx + 140, gy - 440)], fill=STEEL, width=4)
save(img, 'post2-transformadores')

# ---------- 3. Alumbrado público ----------
img, d = base()
d.text((64, 150), 'Alumbrado', font=F('Inter-ExtraBold', 100), fill=WHITE); d.text((64, 262), 'público LED', font=F('Inter-ExtraBold', 100), fill=WHITE)
d.text((64, 400), 'Vialidades, parques y áreas deportivas', font=F('Inter-SemiBold', 38), fill=ORANGE)
bullets(d, 64, 500, ['Luminarias LED y proyectores', 'Postes, brazos y bases', 'Fotoceldas y controladores'], 36, 66)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
px, ground, hx = 975, 950, 790
od.polygon([(hx - 75, 372), (hx + 75, 372), (hx + 235, ground), (hx - 235, ground)], fill=(255, 214, 102, 70))
img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB'); d = ImageDraw.Draw(img)
d.ellipse([hx - 235, ground - 22, hx + 235, ground + 22], fill=(255, 214, 102))
d.line([(px, ground), (px, 340)], fill=WHITE, width=14); d.line([(px, 340), (hx + 40, 340)], fill=WHITE, width=12)
d.rounded_rectangle([hx - 90, 326, hx + 110, 374], radius=16, fill=WHITE); d.rounded_rectangle([hx - 82, 354, hx + 102, 374], radius=8, fill=(255, 214, 102))
d.rectangle([px - 40, ground - 60, px + 40, ground], fill=STEEL)
save(img, 'post3-alumbrado')

# ---------- 4. Cotiza ----------
img, d = base(footer=False)
lines(d, 64, 140, ['Cotiza tu lista', 'de materiales'], F('Inter-ExtraBold', 100), WHITE, 118)
steps = [('1', 'Envíanos tu lista de materiales o tus planos'), ('2', 'Te respondemos con precio y tiempo de entrega'), ('3', 'Fichas técnicas y atención personalizada')]
for i, (n, t) in enumerate(steps):
    y = 440 + i * 100; d.ellipse([64, y, 124, y + 60], fill=ORANGE); d.text((84, y + 8), n, font=F('Inter-Bold', 36), fill=(11, 19, 36)); d.text((148, y + 10), t, font=F('Inter-SemiBold', 33), fill=WHITE)
d.rounded_rectangle([64, 770, 1016, 870], radius=50, fill=(31, 168, 85))
d.ellipse([98, 788, 152, 842], outline=WHITE, width=6); d.polygon([(104, 846), (100, 866), (124, 852)], fill=WHITE)
d.text((176, 795), 'WhatsApp  +507 6975 9851', font=F('Inter-Bold', 46), fill=WHITE)
d.rounded_rectangle([64, 890, 1016, 980], radius=45, outline=ORANGE, width=4); d.text((106, 912), 'energia.useservices.company', font=F('Inter-Bold', 42), fill=WHITE)
save(img, 'post4-cotiza')
