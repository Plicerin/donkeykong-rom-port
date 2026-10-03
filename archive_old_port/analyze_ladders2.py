from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size
print('Full size:', w, h)

# Find game canvas by looking for PAL purple ~(189,102,175) 
purple_rows = {}
for y in range(h):
    count = 0
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 160 < r < 210 and 80 < g < 130 and 150 < b < 200:
            count += 1
    if count > 10:
        purple_rows[y] = count

if not purple_rows:
    print('No purple found')
    # Show first row sample
    for x in range(0, min(w, 400), 20):
        r, g, b, a = img.getpixel((x, 0))
        print('x=%d: (%d,%d,%d)' % (x, r, g, b))
else:
    y_min = min(purple_rows.keys())
    y_max = max(purple_rows.keys())
    print('Purple y-range:', y_min, '-', y_max)
    
    # Find x-range
    purple_xs = []
    for y in range(y_min, y_max+1, 3):
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            if 160 < r < 210 and 80 < g < 130 and 150 < b < 200:
                purple_xs.append(x)
                break
    
    x_min = min(purple_xs) if purple_xs else 0
    x_max = max(purple_xs) if purple_xs else 0
    print('Purple x-range:', x_min, '-', x_max)
    
    game_w = x_max - x_min + 1
    game_h = y_max - y_min + 1
    print('Game area: (%d,%d) to (%d,%d) = %dx%d' % (x_min, y_min, x_max, y_max, game_w, game_h))
    print('Scale X: %.2f, Scale Y: %.2f' % (game_w/320.0, game_h/240.0))
    
    # Now find red ladder marks in the game area
    red_ladders = {}
    for y in range(y_min, y_max+1):
        for x in range(x_min, x_max+1):
            r, g, b, a = img.getpixel((x, y))
            if r > 200 and g < 80 and b < 80:
                # Map to game coordinates
                gx = int((x - x_min) * 320 / game_w)
                gy = int((y - y_min) * 240 / game_h)
                if gy not in red_ladders:
                    red_ladders[gy] = []
                red_ladders[gy].append(gx)
    
    if red_ladders:
        print('\nRed ladder pixels mapped to game coords (320x240):')
        for gy in sorted(red_ladders.keys()):
            xs = red_ladders[gy]
            x_min_g = min(xs)
            x_max_g = max(xs)
            print('  y=%d: x=%d-%d' % (gy, x_min_g, x_max_g))
    else:
        print('No red ladder pixels found in game area')
