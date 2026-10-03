import sys, json
from PIL import Image
import numpy as np

img = Image.open(sys.argv[1]).convert('RGBA')
arr = np.array(img)
h, w, _ = arr.shape

# Approach: find columns with high red (R > 1.5*G, R > 1.5*B, R > 150)
# This catches various red tones including marker reds
for x in range(w):
    col = arr[:, x, :]
    r, g, b, a = col[:,0], col[:,1], col[:,2], col[:,3]
    mask = (r > g * 1.5) & (r > b * 1.5) & (r > 150) & (a > 200)
    count = np.sum(mask)
    if count > 100:
        # Find the vertical span
        ys = np.where(mask)[0]
        game_x = round(x * 320 / w)
        print(f'Col x={x} game_x={game_x} count={count} y_span={ys[0]}-{ys[-1]}')

# Also try: just pure red (R > 200, G < 100, B < 100) - tighter
print("--- Tighter red ---")
for x in range(w):
    col = arr[:, x, :]
    r, g, b, a = col[:,0], col[:,1], col[:,2], col[:,3]
    mask = (r > 200) & (g < 100) & (b < 100) & (a > 200)
    count = np.sum(mask)
    if count > 50:
        ys = np.where(mask)[0]
        game_x = round(x * 320 / w)
        print(f'Col x={x} game_x={game_x} count={count} y_span={ys[0]}-{ys[-1]}')

# Also try: R > B*2, R > G*2 (any shade that's primarily red)
print("--- Very broad red ---")
for x in range(w):
    col = arr[:, x, :]
    r, g, b, a = col[:,0], col[:,1], col[:,2], col[:,3]
    mask = (r > 120) & (r > b * 2) & (r > g * 1.2) & (a > 200)
    count = np.sum(mask)
    if count > 300:
        ys = np.where(mask)[0]
        game_x = round(x * 320 / w)
        print(f'Col x={x} game_x={game_x} count={count} y_span={ys[0]}-{ys[-1]}')
