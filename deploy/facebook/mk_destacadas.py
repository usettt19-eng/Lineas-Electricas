import sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]
sys.argv = [sys.argv[0], OUT]
exec(open('mk_fb.py', encoding='utf-8').read().split('# ---------- 1.')[0])
W, H = 1080, 1920; CX, CY = 540, 960
LN = 16
def canvas():
    img = Image.new('RGB', (W, H), '#0b1324'); d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=(int(11 + 12*t), int(19 + 16*t), int(36 + 30*t)))
    d.ellipse([CX-400, CY-400, CX+400, CY+400], outline=ORANGE, width=14)
    return img, d
def line(d, pts, c=WHITE, w=LN): d.line(pts, fill=c, width=w, joint='curve')
def circ(d, x, y, r, c=WHITE, w=LN): d.ellipse([x-r, y-r, x+r, y+r], outline=c, width=w)

def transformadores(d):
    d.rounded_rectangle([CX-190, CY-60, CX+190, CY+250], radius=22, outline=WHITE, width=LN, fill=(20,33,61))
    d.rectangle([CX-190, CY-60, CX+190, CY-20], fill=ORANGE)
    for i in range(5): x = CX-135+i*68; d.rounded_rectangle([x, CY+10, x+34, CY+215], radius=10, outline=STEEL, width=8)
    for bx in (CX-110, CX, CX+110):
        d.rectangle([bx-12, CY-170, bx+12, CY-60], fill=WHITE)
        for k in range(3): d.ellipse([bx-26, CY-165+k*26, bx+26, CY-140+k*26], outline=ORANGE, width=8)
        line(d, [(bx, CY-230), (bx, CY-170)], WHITE, 10)
    line(d, [(CX-110, CY-230), (CX+110, CY-230)], STEEL, 8)
def alumbrado(d):
    line(d, [(CX+140, CY+280), (CX+140, CY-170)], WHITE, 18)
    line(d, [(CX+140, CY-170), (CX-110, CY-170)], WHITE, 18)
    d.polygon([(CX-200, CY-150), (CX-20, CY-150), (CX-40, CY-110), (CX-180, CY-110)], fill=ORANGE)
    ov = Image.new('RGBA', (W, H), (0,0,0,0)); od = ImageDraw.Draw(ov)
    od.polygon([(CX-185, CY-105), (CX-35, CY-105), (CX+60, CY+280), (CX-280, CY+280)], fill=(255,214,102,80))
    return ov
def cotizar(d):
    d.rounded_rectangle([CX-170, CY-250, CX+170, CY+250], radius=26, outline=WHITE, width=LN, fill=(20,33,61))
    for i, w in enumerate([240, 240, 180]): line(d, [(CX-120, CY-150+i*80), (CX-120+w, CY-150+i*80)], STEEL, 12)
    for i in range(2):
        yy = CY+110+i*0; 
    d.rounded_rectangle([CX-120, CY+110, CX+120, CY+190], radius=40, fill=ORANGE)
    line(d, [(CX-45, CY+150), (CX-10, CY+178), (CX+50, CY+122)], WHITE, 14)
def proyectos(d):
    for cx, top, s in [(CX-150, CY-200, .9), (CX+160, CY-120, .7)]:
        hw = 130*s; by = CY+260
        line(d, [(cx-hw, by), (cx-24*s, top+70*s)], WHITE, 12); line(d, [(cx+hw, by), (cx+24*s, top+70*s)], WHITE, 12)
        line(d, [(cx-24*s, top+70*s), (cx, top)], WHITE, 12); line(d, [(cx+24*s, top+70*s), (cx, top)], WHITE, 12)
        sp = by-top
        for fy, a in [(.2, 190), (.36, 140)]: line(d, [(cx-a*s, top+sp*fy), (cx+a*s, top+sp*fy)], ORANGE, 14)
        for fy, h in [(.75, .7), (.55, .5)]: line(d, [(cx-hw*h, top+sp*fy), (cx+hw*h, top+sp*fy)], STEEL, 8)
    line(d, [(CX-150-170*.9, CY-200+(CY+260-(CY-200))*.2), (CX+160-170*.7, CY-120+(CY+260-(CY-120))*.2)], STEEL, 5)
def envios(d):
    d.polygon([(CX, CY-150), (CX+210, CY-60), (CX+210, CY+160), (CX, CY+250), (CX-210, CY+160), (CX-210, CY-60)], outline=WHITE, fill=(20,33,61), width=LN)
    line(d, [(CX-210, CY-60), (CX, CY+40), (CX+210, CY-60)], WHITE, LN)
    line(d, [(CX, CY+40), (CX, CY+250)], WHITE, LN)
    line(d, [(CX-105, CY-105), (CX+105, CY+5)], ORANGE, 22)
items = [('1-transformadores', transformadores), ('2-alumbrado', alumbrado), ('3-cotizar', cotizar), ('4-proyectos', proyectos), ('5-envios', envios)]
for name, fn in items:
    img, d = canvas()
    r = fn(d)
    if r is not None:
        img = Image.alpha_composite(img.convert('RGBA'), r).convert('RGB')
        d = ImageDraw.Draw(img)
        alumbrado_post = True
        # redibujar luminaria encima del haz
        d.polygon([(CX-200, CY-150), (CX-20, CY-150), (CX-40, CY-110), (CX-180, CY-110)], fill=ORANGE)
        d.line([(CX+140, CY+280), (CX+140, CY-170)], fill=WHITE, width=18); d.line([(CX+140, CY-170), (CX-110, CY-170)], fill=WHITE, width=18)
    img.save(f'{OUT}/destacada-{name}.jpg', quality=93, optimize=True)
# hoja de vista previa (circulos recortados)
sheet = Image.new('RGB', (5*260, 360), '#ffffff'); 
for i, (name, _) in enumerate(items):
    im = Image.open(f'{OUT}/destacada-{name}.jpg').crop((CX-540, CY-540, CX+540, CY+540)).resize((220, 220))
    m = Image.new('L', (220, 220), 0); ImageDraw.Draw(m).ellipse([0, 0, 219, 219], fill=255)
    sheet.paste(im, (20+i*260, 60), m)
sheet.save(f'{OUT}/_preview.jpg')
print('ok')
