from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size

# First, find the game canvas within this image
# The CSS is: canvas fills viewport with object-fit:contain
# Look for the ARROWS: MOVE text (cyan/teal) at top of the game area
# Check for teal/cyan text pixels (R~0, G~100-200, B~100-200)

# Find the bounding box of the game content by looking for non-black pixels
content_rows = []
for y in range(h):
    has_content = False
    for x in range(0, w, 2):
        r, g, b, a = img.getpixel((x, y))
        if r > 15 or g > 15 or b > 15:
            has_content = True
            break
    content_rows.append(has_content)

# Find top and bottom of game content
top_content = None
bottom_content = None
for y, has in enumerate(content_rows):
    if has and top_content is None:
        top_content = y
    if has:
        bottom_content = y

print('Content Y-range: %d to %d' % (top_content, bottom_content))

# Find the game canvas boundary at the top
# The canvas has a black background. Look for the first row that has content
# and then scan for the actual game elements.

# Find the canvas top edge by looking for where game elements start
# The game draws text at the top: ARROWS: MOVE SPACE: JUMP in cyan/teal
# at approximately y=5-15 in game coords

# Look at rows near the top content edge
print('\n=== Top area rows ===')
for y in range(max(0, top_content-5), min(h, top_content+30)):
    pixel_info = []
    for x in range(0, w, 20):
        r, g, b, a = img.getpixel((x, y))
        if r > 10 or g > 10 or b > 10:
            pixel_info.append('x=%d:(%d,%d,%d)' % (x, r, g, b))
    if pixel_info:
        print('y=%d: %s' % (y, ' '.join(pixel_info[:5])))

# Now scan for ALL red pixels
red_by_column = {}  # x -> list of y positions
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if r > 200 and g < 80 and b < 80:
            if x not in red_by_column:
                red_by_column[x] = []
            red_by_column[x].append(y)

print('\n=== Red pixel columns (sorted by frequency) ===')
col_stats = []
for x, ys in red_by_column.items():
    if len(ys) > 5:  # At least 5 red pixels in this column
        col_stats.append((x, min(ys), max(ys), len(ys)))

col_stats.sort(key=lambda c: -c[3])  # Sort by most red pixels

for x, y_min, y_max, count in col_stats[:20]:
    print('x=%d: y=%d-%d (h=%d, count=%d)' % (x, y_min, y_max, y_max-y_min+1, count))

# Now group adjacent x columns into LADDER features
# A ladder is a set of adjacent x-columns that together form a vertical band
print('\n=== Grouped red features ===')
x_sorted = sorted(red_by_column.keys())
features = []
current_feature = None
for x in x_sorted:
    ys = red_by_column[x]
    if current_feature is None or x > current_feature['x_end'] + 3:
        current_feature = {'x_start': x, 'x_end': x, 'ys': set(ys), 'total': len(ys)}
        features.append(current_feature)
    else:
        current_feature['x_end'] = x
        current_feature['ys'].update(ys)
        current_feature['total'] += len(ys)

for f in features:
    width = f['x_end'] - f['x_start'] + 1
    y_min = min(f['ys'])
    y_max = max(f['ys'])
    height = y_max - y_min + 1
    x_center = (f['x_start'] + f['x_end']) // 2
    
    # A real ladder line should be narrow (small width) and tall
    if width <= 30:  # Thin vertical marks
        print('  Feature: x=%d-%d (w=%d, center=%d), y=%d-%d (h=%d), pixels=%d, ratio=%.1f' % (
            f['x_start'], f['x_end'], width, x_center, y_min, y_max, height, f['total'], height/width if width > 0 else 0))
