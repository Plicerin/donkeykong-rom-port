from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size
print('Full size:', w, h)

# The game canvas is CSS-scaled 2x: 640x480
# Find the actual canvas within this screenshot
# Look for the black background (game bg is black, RGB < 20)
# Game canvas should be ~640x480

# Find rows that are mostly dark with some colored game content
game_y_start = None
game_y_end = None
for y in range(h):
    dark_count = sum(1 for x in range(0, w, 2) if img.getpixel((x, y))[0] < 20)
    # Skip rows that are mostly dark (black bg of the page)
    if dark_count < w * 0.7:
        # This row has content
        if game_y_start is None:
            game_y_start = y
        game_y_end = y

print('Game content y-range:', game_y_start, '-', game_y_end)
game_h = game_y_end - game_y_start + 1 if game_y_start else 0

if game_y_start:
    # Find x-range within those rows
    game_x_start = None
    game_x_end = None
    for y in range(game_y_start, game_y_end + 1, 3):
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            if r > 20 or g > 20 or b > 20:
                if game_x_start is None or x < game_x_start:
                    game_x_start = x
                if game_x_end is None or x > game_x_end:
                    game_x_end = x
    
    game_w = game_x_end - game_x_start + 1 if game_x_start else 0
    print('Game canvas x-range:', game_x_start, '-', game_x_end)
    print('Canvas size:', game_w, 'x', game_h)
    print('Expected 640x480 - scale:', game_w/640.0, 'x', game_h/480.0)
    
    # Now find RED marks in this canvas area and map to game coords
    sx = game_w / 320.0
    sy = game_h / 240.0
    
    # Find vertical red columns (ladders) - narrow red marks
    red_at_y = {}
    for y in range(game_y_start, game_y_end + 1):
        red_xs = []
        for x in range(game_x_start, game_x_end + 1):
            r, g, b, a = img.getpixel((x, y))
            if r > 200 and g < 100 and b < 100:
                gx = int((x - game_x_start) / sx)
                red_xs.append(gx)
        if red_xs:
            min_x = min(red_xs)
            max_x = max(red_xs)
            mid_x = (min_x + max_x) // 2
            gy = int((y - game_y_start) / sy)
            if gy not in red_at_y:
                red_at_y[gy] = []
            red_at_y[gy].append(mid_x)
    
    if red_at_y:
        print('\nRed marks in game coords:')
        for gy in sorted(red_at_y.keys()):
            xs = red_at_y[gy]
            # Average x
            avg_x = sum(xs) // len(xs)
            print('  y=%d: x≈%d (from %d values)' % (gy, avg_x, len(xs)))
        
        # Group into ladder segments
        segments = []
        cur = None
        for gy in sorted(red_at_y.keys()):
            xs = red_at_y[gy]
            avg_x = sum(xs) // len(xs)
            if cur is None or gy > cur['y_end'] + 3:
                cur = {'y_start': gy, 'y_end': gy, 'x': avg_x, 'count': len(xs)}
                segments.append(cur)
            else:
                cur['y_end'] = gy
                cur['x'] = (cur['x'] + avg_x) // 2
                cur['count'] += len(xs)
        
        print('\nLadder segments:')
        for s in segments:
            print('  x≈%d, y=%d-%d (h=%d)' % (s['x'], s['y_start'], s['y_end'], s['y_end']-s['y_start']+1))
