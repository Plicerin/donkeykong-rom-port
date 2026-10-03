from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size

# Sample the image grid to understand layout
# Check a grid of points across the image
print('=== IMAGE LAYOUT (sampled every 20px) ===')
for y in range(0, h, 30):
    row_info = []
    for x in range(0, w, 50):
        r, g, b, a = img.getpixel((x, y))
        # Classify
        if r < 20 and g < 20 and b < 20:
            cls = 'BLK'
        elif r > 200 and g > 200 and b > 200:
            cls = 'WHT'
        elif r > 200 and g < 100 and b < 100:
            cls = 'RED'
        elif 160 <= r <= 200 and 90 <= g <= 120 and 160 <= b <= 195:
            cls = 'PUR'
        elif r > 200 and g > 150 and b < 100:
            cls = 'ORN'
        elif g > r and g > b:
            cls = 'GRN'
        else:
            cls = 'oth'
        row_info.append('%s(%d,%d,%d)' % (cls, r, g, b))
    print('y=%3d: %s' % (y, ' | '.join(row_info)))

# Find exact borders of the game area by looking for the PURPLE game content edges
# First find where purple content STARTS and ENDS vertically
print('\n=== Looking for purple game content ===')
purple_rows = []
for y in range(h):
    purple_count = 0
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 160 <= r <= 200 and 90 <= g <= 120 and 160 <= b <= 195:
            purple_count += 1
    if purple_count >= 3:
        purple_rows.append((y, purple_count))

if purple_rows:
    print('Purple y-range: %d to %d' % (purple_rows[0][0], purple_rows[-1][0]))
    # Find x range at mid y
    mid_y = purple_rows[len(purple_rows)//2][0]
    purple_xs = []
    for x in range(w):
        r, g, b, a = img.getpixel((x, mid_y))
        if 160 <= r <= 200 and 90 <= g <= 120 and 160 <= b <= 195:
            purple_xs.append(x)
    if purple_xs:
        print('Purple x-range at y=%d: %d to %d' % (mid_y, min(purple_xs), max(purple_xs)))
        print('Width: %d' % (max(purple_xs) - min(purple_xs) + 1))

# Now find the canvas boundaries by looking for the page background
# Look for a white or gray border around the canvas
print('\n=== Left edge analysis (x=0..100, sampling) ===')
for y in [50, 100, 150, 200, 300, 400, 500, 600, 700]:
    for x in range(0, min(100, w)):
        r, g, b, a = img.getpixel((x, y))
        if r > 30 or g > 30 or b > 30:
            print('  y=%d: first non-black at x=%d (%d,%d,%d)' % (y, x, r, g, b))
            break
