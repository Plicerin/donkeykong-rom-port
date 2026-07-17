from PIL import Image

img = Image.open(r'C:\Users\admin\Pictures\Screenshots\1.png')
w, h = img.size

# Find left and top edges of game content by looking at the W0 platform
# W0 is at game y=70, spans game x=[64,159]
# Find where W0's purple appears in the screenshot

# Scan for purple at W0 x-ranges mapped to screenshot
# First, find rows with continuous purple at the top of the game area
for y in range(60, 200):
    purple_count = 0
    for x in range(0, w, 2):
        r, g, b, a = img.getpixel((x, y))
        if 160 <= r <= 210 and 90 <= g <= 120 and 160 <= b <= 190:  # Purple
            purple_count += 1
    if purple_count > 20:
        # Found a row with significant purple
        purple_xs = []
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            if 160 <= r <= 210 and 90 <= g <= 120 and 160 <= b <= 190:
                purple_xs.append(x)
        if purple_xs:
            print(f'y={y}: purple x={min(purple_xs)}-{max(purple_xs)} (w={max(purple_xs)-min(purple_xs)+1}), count={len(purple_xs)}')
            if len(purple_xs) > 30 and (max(purple_xs)-min(purple_xs)) > 50:
                # This is likely a walkway surface
                # Check if width matches W0=[64,159]=96px or W1=[64,239]=176px etc
                span_px = max(purple_xs) - min(purple_xs) + 1
                # W0 is 96 game-px wide, W1 is 176 game-px, ground is 192
                # At the right scale, the span in screenshot px divided by game-px gives scale
                for name, game_w in [('W0', 96), ('W1', 176), ('W2', 48), ('W3', 56), ('W4', 72), ('W5', 192)]:
                    scale = span_px / game_w
                    if 1.5 < scale < 10:
                        print(f'  Possible {name}: scale={scale:.2f}x, left_edge_game_x={(min(purple_xs))//scale:.0f}')

# Also scan for the cyan text ARROWS: MOVE at y=60
print('\n=== Cyan text at game y=60 ===')
for y in range(70, 120):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if r < 50 and g > 100 and b > 100:  # Cyan text
            print(f'  Cyan pixel at screenshot ({x},{y}) = ({r},{g},{b})')
            break
