// Renders the site's images from the translated cartridge (no ROM needed):
// the poster (the screen after Game Reset), sprite plates cropped from the
// barrel and rivet screens, and the app icons. Pixels are 2:1 like the game.
// usage: node tools/gen-images.mjs   -> img/*.png
import { mkdirSync } from 'node:fs';
import { DkMachine } from '../src/dkMachine.mjs';
import { writeFramePng } from './atari/png.mjs';

const FIRST = 42, LINES = 191;
const d = new DkMachine();
const z = (a) => d.bus.ram[a & 0x7f];
const poke = (a, v) => { d.bus.ram[a & 0x7f] = v; };
const run = (n) => { for (let i = 0; i < n; i += 1) d.runFrame(); };
const visible = () => d.bus.tia.lastFrame.slice(FIRST, FIRST + LINES).map((r) => Array.from(r));
const fire = () => { d.bus.inpt4 = 0; run(2); d.bus.inpt4 = 0x80; };
const crop = (rows, [x0, y0, x1, y1]) => rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));

mkdirSync('img', { recursive: true });
run(60); d.bus.swchb = 0x0a; run(5); d.bus.swchb = 0x0b; run(10);
while (z(0x8f)) run(1);
const title = visible();
fire(); run(400);
const barrel = visible();
poke(0x9b, 0x0f); run(1);               // Mario onto the top girder: clear the screen
while (z(0x8c) !== 1) run(1);
while (z(0x8f)) run(1);
fire(); run(200);
const rivet = visible();

writeFramePng('img/start.png', title, 4, 2);
writeFramePng('img/barrels.png', barrel, 4, 2);
writeFramePng('img/rivets.png', rivet, 4, 2);
const PLATES = {
  kong: [barrel, [33, 9, 50, 29]],
  pauline: [barrel, [62, 12, 71, 29]],
  mario: [barrel, [44, 169, 54, 187]],
  barrel: [barrel, [115, 46, 124, 54]],
  firefox: [rivet, [113, 74, 122, 82]],
  hammer: [barrel, [38, 62, 43, 70]],
};
for (const [name, [frame, box]] of Object.entries(PLATES)) writeFramePng(`img/sprite_${name}.png`, crop(frame, box), 6, 3);

// icons: Donkey Kong centered on black
const kong = crop(barrel, [33, 9, 50, 29]);
for (const size of [180, 192, 512]) {
  const scale = Math.floor((size * 0.7) / (kong[0].length * 2));
  const w = kong[0].length * 2 * scale, h = kong.length * scale;
  const rows = Array.from({ length: size }, () => new Array(size).fill(0));
  const left = Math.floor((size - w) / 2), top = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) rows[top + y][left + x] = kong[Math.floor(y / scale)][Math.floor(x / (2 * scale))];
  writeFramePng(`img/icon-${size}.png`, rows, 1, 1);
}
console.log('wrote img/');
