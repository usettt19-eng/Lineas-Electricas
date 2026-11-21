import sys
sys.argv = [sys.argv[0], sys.argv[1]]
src = open('mk_fb.py', encoding='utf-8').read().split('# ---------- 1.')[0]
exec(src)

def bolt(d, cx, cy, s, fill):
    pts = [(0.15,-1),(-0.65,0.1),(-0.05,0.1),(-0.3,1),(0.7,-0.2),(0.05,-0.2)]
    d.polygon([(cx + x*s, cy + y*s) for x, y in pts], fill=fill)

# ---- PERFIL 1080x1080 (se recorta en círculo: todo dentro del centro)
img = Image.new('RGB', (W, H), '#0b1324'); d = ImageDraw.Draw(img)
for y in range(H):
    t = y / H; d.line([(0, y), (W, y)], fill=(int(11 + 12*t), int(19 + 16*t), int(36 + 30*t)))
d.ellipse([90, 90, 990, 990], outline=ORANGE, width=14)
bolt(d, 540, 430, 215, ORANGE)
f = F('Inter-ExtraBold', 250); t = 'USE'; w = d.textlength(t, font=f)
d.text(((W - w) / 2, 650), t, font=f, fill=WHITE)
img.save(f'{OUT}/perfil-use.jpg', quality=94, optimize=True)

# ---- COVER 1640x624 (zona segura central ~ 1100 px; perfil tapa abajo-izquierda en escritorio)
CW, CH = 1640, 624
img = Image.new('RGB', (CW, CH), '#0b1324'); d = ImageDraw.Draw(img)
for y in range(CH):
    t = y / CH; d.line([(0, y), (CW, y)], fill=(int(11 + 9*t), int(19 + 14*t), int(36 + 25*t)))
d.rectangle([0, 0, CW, 12], fill=ORANGE)
# torres tenues al fondo (laterales)
sub = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); sd = ImageDraw.Draw(sub)
import types
def mini_tower(dd, cx, by, top, sc, col):
    L = lambda p, q, wd=5: dd.line([p, q], fill=col, width=wd)
    hw = 120*sc; L((cx-hw, by), (cx-25*sc, top+60*sc)); L((cx+hw, by), (cx+25*sc, top+60*sc))
    L((cx-25*sc, top+60*sc), (cx, top)); L((cx+25*sc, top+60*sc), (cx, top))
    span = by - top
    for fy, arm in [(.2, 200), (.34, 150)]:
        yy = top + span*fy; L((cx-arm*sc, yy), (cx+arm*sc, yy), 7)
    for fy, h in [(1, 1), (.7, .72), (.5, .5)]:
        yy = top + span*fy; L((cx-hw*h, yy), (cx+hw*h, yy), 4)
for cx, top, sc in [(120, 120, 1.25), (330, 250, .9), (1520, 120, 1.25), (1310, 250, .9)]:
    mini_tower(sd, cx, CH+40, top, sc, (110, 130, 175, 110))
sd.line([(120, 175), (330, 285)], fill=(110, 130, 175, 110), width=3); sd.line([(1520, 175), (1310, 285)], fill=(110, 130, 175, 110), width=3)
img = Image.alpha_composite(img.convert('RGBA'), sub).convert('RGB'); d = ImageDraw.Draw(img)
cx = CW // 2
def ct(y, t, font, fill):
    w = d.textlength(t, font=font); d.text((cx - w/2, y), t, font=font, fill=fill)
# Solo se usa la franja superior (y < 325): el logo tapa el centro/izquierda inferior según el dispositivo
ct(34, 'USE UNION DE SERVICIOS ESPECIALIZADOS', F('Inter-Bold', 26), ORANGE)
ct(78, 'Materiales y equipos para', F('Inter-ExtraBold', 64), WHITE)
ct(152, 'líneas eléctricas', F('Inter-ExtraBold', 64), WHITE)
ct(238, '13.8 · 34.5 · 115 · 230 kV', F('Inter-SemiBold', 36), ORANGE)
ct(290, 'Transformadores  ·  Alumbrado público  ·  Estructuras  ·  Herrajes', F('Inter-SemiBold', 26), WHITE)
img.save(f'{OUT}/cover-use.jpg', quality=93, optimize=True)
print('ok')
