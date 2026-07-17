from PIL import Image
import sys

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
print('Size: %s, Mode: %s' % (str(img.size), img.mode))
w, h = img.size

if img.mode != 'RGB':
    img = img.convert('RGB')

# Scan for red pixels (R>200, G<80, B<80) - the traced ladder marks
red_rows = {}
for y in range(h):
    red_xs = []
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        if r > 200 and g < 80 and b < 80:
            red_xs.append(x)
    if red_xs:
        red_rows[y] = red_xs

if not red_rows:
    print('No red pixels found')
    for y in range(0, min(20, h)):
        row_vals = []
        for x in range(0, w, 20):
            r, g, b = img.getpixel((x, y))
            if r > 100:
                row_vals.append('(%d,%d,%d,%d)' % (x, r, g, b))
        if row_vals:
            print('y=%d: %s' % (y, ' '.join(row_vals)))
    sys.exit(0)

y_min = min(red_rows.keys())
y_max = max(red_rows.keys())
print('Red pixel y-range: %d to %d' % (y_min, y_max))
print('Total rows with red: %d' % len(red_rows))

# Group consecutive rows into ladder segments
ladders = []
current = None
for y in sorted(red_rows.keys()):
    xs = red_rows[y]
    x_center = (min(xs) + max(xs)) // 2
    if current is None or y > current['y_end'] + 3:
        current = {'y_start': y, 'y_end': y, 'x': x_center, 'x_min': min(xs), 'x_max': max(xs)}
        ladders.append(current)
    else:
        current['y_end'] = y
        current['x'] = (current['x'] + x_center) // 2
        current['x_min'] = min(current['x_min'], min(xs))
        current['x_max'] = max(current['x_max'], max(xs))

print('Found %d ladder segments:' % len(ladders))
for i, seg in enumerate(ladders):
    h = seg['y_end'] - seg['y_start'] + 1
    print('  Ladder %d: y=%d-%d (h=%d), x≈%d, x_range=%d-%d (w=%d)' % (
        i, seg['y_start'], seg['y_end'], h, seg['x'],
        seg['x_min'], seg['x_max'], seg['x_max'] - seg['x_min'] + 1))

# Map to walkway levels
wy_levels = [70, 95, 131, 155, 183, 228]
def walkway_for_y(y):
    best = -1
    best_dist = 999
    for i, wy in enumerate(wy_levels):
        d = abs(y - wy)
        if d < best_dist:
            best_dist = d
            best = i
    if best_dist <= 20:
        return best
    return -1

for seg in ladders:
    w0 = walkway_for_y(seg['y_start'])
    w1 = walkway_for_y(seg['y_end'])
    print()
    print('Ladder at x≈%d: y=%d-%d, W_top=%s, W_bottom=%s' % (
        seg['x'], seg['y_start'], seg['y_end'],
        str(w0) if w0 >= 0 else '?',
        str(w1) if w1 >= 0 else '?'))
    if w0 >= 0 and w1 >= 0:
        print('  Connection: W%d <-> W%d' % (w0, w1))
