# Donkey Kong barrel level — authoritative geometry (extracted from ref.gif, 320x266)

Extracted programmatically by scanning ref.gif pink (189,102,175) surface pixels.
This is the SOURCE OF TRUTH for platforms + ladders. Do NOT guess.

## Walkways (girders) — surface y as function of x
Slant is linear across the girder's x-span.

| Walkway | x-span    | y at left | y at right | slant | shape                |
|---------|-----------|-----------|------------|-------|----------------------|
| W0      | [64,159]  | 70        | 70         | 0     | flat                 |
| W1      | [64,239]  | 95        | 95         | 0     | flat                 |
| W2      | [80,255]  | 123       | 116        | -7    | slants UP to right   |
| W3      | [64,239]  | 144       | 151        | +7    | slants DOWN to right |
| W4      | [80,255]  | 179       | 172        | -7    | slants UP to right   |
| W5      | [64,239]  | 200       | 207        | +7    | slants DOWN to right |
| GND     | [64,255]  | 228       | 228        | 0     | flat                 |

surface_y(w, x) = y_left + (x - x_left) * (y_right - y_left) / (x_right - x_left)

## Ladders — each connects ONE adjacent walkway pair (staggered, from ref.gif gaps)

| Connects   | ladder x-centers |
|------------|------------------|
| W0 <-> W1  | 67, 155          |
| W1 <-> W2  | 119, 219         |
| W2 <-> W3  | 99, 139          |
| W3 <-> W4  | 179, 219         |
| W4 <-> W5  | 99, 163          |
| W5 <-> GND | 79, 219          |

Ladder top y = surface_y(upper_walkway, ladder_x)
Ladder bottom y = surface_y(lower_walkway, ladder_x)

Ladders are SHORT (one gap each), NOT full-height columns.
