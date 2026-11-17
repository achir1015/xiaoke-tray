# 產生程式圖示：小柯機器人（頭盔造型）＋藍色便當分格托盤（等角視圖）
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024


def layer():
    return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def iso(x, y, z, ox=430, oy=560, k=1.0):
    # 等角投影：x 往右下、y 往左下、z 往上
    return (ox + (x - y) * 0.866 * k, oy + (x + y) * 0.5 * k - z * k)


img = layer()
bg = layer()
d = ImageDraw.Draw(bg)
d.rounded_rectangle((36, 36, 988, 988), 190, fill=(26, 58, 110, 255))
d.rounded_rectangle((70, 70, 954, 954), 164, fill=(232, 240, 250, 255))
img = Image.alpha_composite(img, bg)
# 列印床格線（只畫在內框裡）
grid = layer()
g = ImageDraw.Draw(grid)
OX, OY = 400, 640
for i in range(-8, 9):
    g.line([iso(i * 50, -420, 0, OX, OY), iso(i * 50, 420, 0, OX, OY)], fill=(205, 216, 232, 255), width=3)
    g.line([iso(-420, i * 50, 0, OX, OY), iso(420, i * 50, 0, OX, OY)], fill=(205, 216, 232, 255), width=3)
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle((70, 70, 954, 954), 164, fill=255)
grid.putalpha(Image.composite(grid.split()[3], Image.new('L', (S, S), 0), mask))
img = Image.alpha_composite(img, grid)

# 托盤：13×13 格的柱體依前後順序畫（畫家演算法），外圈與十字隔板較高
N, C, H, F = 13, 24, 96, 20
TOP, LEFT, RIGHT = (70, 158, 240, 255), (16, 96, 190, 255), (10, 74, 152, 255)
FTOP = (44, 128, 222, 255)
tr = layer()
t = ImageDraw.Draw(tr)
off = -N * C / 2
cols = []
for a in range(N):
    for b in range(N):
        wall = a in (0, N - 1) or b in (0, N - 1) or a == N // 2 or b == N // 2
        cols.append((a + b, a, b, H if wall else F))
for _, a, b, z in sorted(cols):
    x0, y0 = off + a * C, off + b * C
    x1, y1 = x0 + C, y0 + C
    P = lambda x, y, zz: iso(x, y, zz, OX, OY)
    t.polygon([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, z), P(x0, y1, z)], fill=LEFT)
    t.polygon([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, z), P(x1, y0, z)], fill=RIGHT)
    t.polygon([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill=TOP if z == H else FTOP)
h = N * C / 2
t.line([iso(-h, h, H, OX, OY), iso(-h, -h, H, OX, OY), iso(h, -h, H, OX, OY)], fill=(160, 212, 255, 255), width=5)
t.line([iso(-h, h, H, OX, OY), iso(h, h, H, OX, OY), iso(h, -h, H, OX, OY)], fill=(130, 196, 255, 255), width=4)
sh = layer()
ImageDraw.Draw(sh).polygon([iso(-h + 30, -h + 30, 0, OX, OY), iso(h + 50, -h + 30, 0, OX, OY), iso(h + 50, h + 50, 0, OX, OY), iso(-h + 30, h + 50, 0, OX, OY)], fill=(0, 0, 0, 90))
img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(22)))
img = Image.alpha_composite(img, tr)

# 小柯機器人（頭盔造型），在右上
rb = layer()
r = ImageDraw.Draw(rb)
cx, cy = 740, 300
s = 0.72
def R(a, b, c, e):
    return (cx + a * s, cy + b * s, cx + c * s, cy + e * s)
r.line((cx, cy - 250 * s, cx, cy - 190 * s), fill=(90, 100, 120, 255), width=16)
r.ellipse(R(-34, -290, 34, -222), fill=(255, 196, 40, 255))
r.rounded_rectangle(R(-262, -70, -210, 80), 20, fill=(40, 120, 220, 255))
r.rounded_rectangle(R(210, -70, 262, 80), 20, fill=(40, 120, 220, 255))
r.ellipse(R(-230, -210, 230, 220), fill=(70, 150, 240, 255))
r.ellipse(R(-214, -196, 214, 200), fill=(240, 246, 255, 255))
r.rounded_rectangle(R(-170, -110, 170, 90), int(90 * s), fill=(24, 36, 64, 255))
for ex in (-72, 72):
    r.arc(R(ex - 46, -50, ex + 46, 30), 200, 340, fill=(90, 230, 255, 255), width=18)
r.arc(R(-50, 10, 50, 70), 20, 160, fill=(90, 230, 255, 255), width=12)
r.ellipse(R(-160, 40, -110, 80), fill=(255, 140, 160, 200))
r.ellipse(R(110, 40, 160, 80), fill=(255, 140, 160, 200))
sh2 = layer()
ImageDraw.Draw(sh2).ellipse(R(-240, -190, 260, 260), fill=(0, 0, 0, 110))
img = Image.alpha_composite(img, sh2.filter(ImageFilter.GaussianBlur(22)))
img = Image.alpha_composite(img, rb)

os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
img.save(os.path.join(ROOT, 'build', 'icon.png'))
img.save(os.path.join(ROOT, 'build', 'icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
pub = os.path.join(ROOT, 'public')
img.resize((512, 512), Image.LANCZOS).save(os.path.join(pub, 'icon-512.png'))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(pub, 'icon-192.png'))
img.resize((180, 180), Image.LANCZOS).save(os.path.join(pub, 'apple-touch-icon.png'))
img.resize((64, 64), Image.LANCZOS).save(os.path.join(pub, 'favicon.png'))
print('icon ok')
