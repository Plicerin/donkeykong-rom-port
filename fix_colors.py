#!/usr/bin/env python3
with open(r'C:\Users\admin\DonkeyKong\game.html', 'r') as f:
    lines = f.readlines()

COLORS = ['LG', 'BR', 'OR', 'RD', 'YL', 'TQ', 'BL', 'BG', 'PU', 'W']
for c in COLORS:
    old_pat = f"{c}.join"
    new_pat = f"C.{c}.join"
    for i, line in enumerate(lines):
        if old_pat in line and f"C.{c}.join" not in line:
            lines[i] = line.replace(old_pat, new_pat)

lines = [l.replace('rgb=rgb||YL;', 'rgb=rgb||[180,160,30];') for l in lines]
lines = [l.replace('drawLad(lx,wy,WSP,YL)', 'drawLad(lx,wy,WSP,[180,160,30])') for l in lines]

with open(r'C:\Users\admin\DonkeyKong\game.html', 'w') as f:
    f.writelines(lines)

for i, line in enumerate(lines, 1):
    if 'cx.fillStyle' in line:
        for c in COLORS:
            if f'{c}.join' in line and f'C.{c}.join' not in line:
                print(f"UNFIXED {i}: {line.strip()}")
    if 'rgb=rgb||' in line:
        print(f"UNFIXED {i}: {line.strip()}")

print("Done")
