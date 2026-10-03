import sys
from PIL import Image

img = Image.open(sys.argv[1]).convert('RGBA')
w, h = img.size
pixels = img.load()

# Test a few broad thresholds
thresholds = [
    ("R>180, G<100, B<100", lambda r,g,b,a: r>180 and g<100 and b<100 and a>200),
    ("R>180, R>2G, R>2B", lambda r,g,b,a: r>180 and r>2*g and r>2*b and a>200),
    ("R>150, R>G, R>B", lambda r,g,b,a: r>150 and r>g and r>b and a>200),
]

for name, fn in thresholds:
    print(f"\n=== {name} ===")
    cols = []
    for x in range(w):
        count = 0
        ymin, ymax = h, 0
        for y in range(h):
            r,g,b,a = pixels[x,y]
            if fn(r,g,b,a):
                count += 1
                ymin = min(ymin, y)
                ymax = max(ymax, y)
        if count > 50:
            game_x = round(x * 320 / w)
            cols.append((x, game_x, count, ymin, ymax))
    # Group adjacent columns
    if cols:
        groups = []
        cur = [cols[0]]
        for c in cols[1:]:
            if c[0] - cur[-1][0] <= 3:
                cur.append(c)
            else:
                groups.append(cur)
                cur = [c]
        groups.append(cur)
        for g in groups:
            avg_x = sum(c[0] for c in g) // len(g)
            avg_game = sum(c[1] for c in g) // len(g)
            total_count = sum(c[2] for c in g)
            print(f"  Group at img_x={avg_x} game_x≈{avg_game} ({g[0][0]}-{g[-1][0]}) count={total_count} y={g[0][3]}-{g[-1][4]}")
