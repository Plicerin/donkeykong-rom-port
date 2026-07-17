from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size

# Find canvas bounding box by looking at where game content starts/ends
# The game canvas has a black background. First non-black pixels define content.
# But page bg is also black, so we look for GAME elements: text, platforms, sprites

# Sample many rows to find consistent canvas edges
left_edges = set()
right_edges = set()
top_edges = set()
bottom_edges = set()

for y in range(h):
    # Find leftmost non-black pixel
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if r > 20 or g > 20 or b > 20:
            if y < 200 and y > 70:
                left_edges.add(x)
            break
    
    # Find rightmost non-black pixel
    for x in range(w-1, -1, -1):
        r, g, b, a = img.getpixel((x, y))
        if r > 20 or g > 20 or b > 20:
            if y < 200 and y > 70:
                right_edges.add(x)
            break

if left_edges:
    print('Left edges (sample):', sorted(left_edges)[:10])
    left_consistent = min(left_edges)  # Consistent left edge
    print('Consistent left edge:', left_consistent)
if right_edges:
    print('Right edges (sample):', sorted(right_edges, reverse=True)[:10])
    right_consistent = max(right_edges)
    print('Consistent right edge:', right_consistent)

# Now find top and bottom of canvas by looking for the game content bounds
game_y_top = None
game_y_bottom = None

# At a known x position (center-ish), find where game content exists
check_x = 400  # Near center
for y in range(h):
    r, g, b, a = img.getpixel((check_x, y))
    if r > 20 or g > 20 or b > 20:
        if game_y_top is None:
            game_y_top = y
        game_y_bottom = y

print('Game content at x=%d: y=%d to y=%d' % (check_x, game_y_top, game_y_bottom))

# The canvas is known to be 320x240 with object-fit:contain
# Find the canvas size by looking at the content bounding rectangle
# The content is scaled to fit within the viewport with aspect ratio maintained

# Let's find a known reference: the W0 top walkway
# W0 is at game y=70, spans game x=[64,159]
# At 2x CSS, that's game y=70*scale, x=[64*scale, 159*scale]

# But at what scale? Let's find the content width
content_x_min = min(left_edges) if left_edges else 0
content_x_max = max(right_edges) if right_edges else 0
content_w = content_x_max - content_x_min + 1
content_h = game_y_bottom - game_y_top + 1 if game_y_top else 0

print('\nContent bounding box: (%d, %d) to (%d, %d)' % (content_x_min, game_y_top, content_x_max, game_y_bottom))
print('Content dimensions: %d x %d' % (content_w, content_h))
print('Expected canvas 320x240 at 2x: 640x480')
print('Expected canvas 320x240 at 3x: 960x720')

# Now map the red features to game coordinates
# The content is the game canvas rendered inside the viewport with object-fit:contain
# So scale = content_w / 320

scale_x = content_w / 320.0
scale_y = content_h / 240.0 if game_y_top else 1
print('\nScale: %.2f x horizontal, %.2f x vertical' % (scale_x, scale_y))

# The red features (excluding the arrow at x=47):
red_features_screenshot = [
    (166, 366, 646, 281),
    (321, 351, 440, 90),
    (381, 149, 238, 90),
    (417, 543, 663, 121),
    (473, 462, 547, 86),
    (623, 258, 752, 495),
]

print('\n=== Red features mapped to game coords ===')
canvas_left = content_x_min
canvas_top = game_y_top

for sx, sy_start, sy_end, sh in red_features_screenshot:
    gx = (sx - canvas_left) / scale_x
    gy_start = (sy_start - canvas_top) / scale_y
    gy_end = (sy_end - canvas_top) / scale_y
    print('  Screenshot x=%d: game x=%.0f, y=%.0f-%.0f' % (sx, gx, gy_start, gy_end))
    
# Also let's verify by looking at the W0 walkway color (PAL purple 189,102,175)
# At game y=70, W0 spans x=[64,159]
# In the screenshot, this should be at: 
#   sx = 64*scale + canvas_left
#   sy = 70*scale + canvas_top
print('\n=== Verification: W0 expected position ===')
w0_gx_start = 64
w0_gx_end = 159
w0_gy = 70
sx_start = int(w0_gx_start * scale_x + canvas_left)
sx_end = int(w0_gx_end * scale_x + canvas_left)
sy = int(w0_gy * scale_y + canvas_top)
print('W0 expected at sx=%d-%d, sy=%d' % (sx_start, sx_end, sy))
if 0 <= sy < h:
    colors = []
    for sx in range(max(0, sx_start-5), min(w, sx_end+5), 2):
        r, g, b, a = img.getpixel((sx, sy))
        colors.append((sx, r, g, b, 'PUR' if 160<=r<=200 and 90<=g<=120 else ''))
    for sx, r, g, b, tag in colors[:20]:
        print('  sx=%d: (%d,%d,%d) %s' % (sx, r, g, b, tag))
