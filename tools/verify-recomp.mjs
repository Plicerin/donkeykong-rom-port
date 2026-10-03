// Differential test of the translated cartridge (src/dkMachine.mjs) against
// the real ROM interpreted on the 6502 core: both get the same inputs each
// frame, and after every frame the CPU registers, cycle count, RAM, TIA write
// log and finished picture must be identical.
// With 'cover', identical RAM pokes in both machines force level clears (so
// both screens are played), hand Mario the hammer and leave long idle spells
// for attract mode.
// usage: node tools/verify-recomp.mjs [frames] [seed] [cover]
import { VCS, loadRom } from './atari/vcs.mjs';
import { DkMachine } from '../src/dkMachine.mjs';
import { ROM_DATA } from '../src/dkRomData.mjs';

const frames = Number(process.argv[2] ?? 3000), seed = Number(process.argv[3] ?? 1), cover = process.argv[4] === 'cover';
const rom = new VCS(loadRom());
const dk = new DkMachine();
// every ROM read the translated code makes must land on a byte in the data image
const mapped = new Uint8Array(4096);
for (const [at, h] of ROM_DATA) for (let i = 0; i < h.length / 2; i += 1) mapped[(at + i) & 0xfff] = 1;
const unmapped = new Set();
const busRead = dk.bus.read.bind(dk.bus);
dk.bus.read = (addr) => { if ((addr & 0x1000) && !mapped[addr & 0xfff]) unmapped.add((0xf000 | (addr & 0xfff)).toString(16)); return busRead(addr); };
let s = seed >>> 0;
const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
const hex = (v) => v.toString(16);

let stick = 0xff, bad = 0;
const stats = { deaths: 0, gameOvers: 0, levels: 0, firefoxFrames: 0, hammerFrames: 0, maxScoreHi: 0 };
for (let f = 0; f < frames; f += 1) {
  // inputs: joystick changes every ~20 frames, fire 25% of frames, RESET after game over
  if (f % 20 === 0) { const r = rand(); stick = r < 0.25 ? 0x7f : r < 0.45 ? 0xbf : r < 0.65 ? 0xef : r < 0.8 ? 0xdf : 0xff; }
  let fire = rand() < 0.25 ? 0x00 : 0x80;
  if (cover) {
    const poke = (addr, v) => { rom.ram[addr & 0x7f] = v; dk.bus.ram[addr & 0x7f] = v; };
    const z = (a) => rom.ram[a & 0x7f];
    const playing = z(0x8c) === 0xff && z(0x8d) !== 0xff;
    if (playing && f % 700 === 350) {
      if (z(0x90)) for (let i = 0; i < 4; i += 1) poke(0x9f + i, 0x12); // all rivits pulled
      else if (!z(0x85)) poke(0x9b, 0x0f);                            // Mario on the top girder
    }
    if (playing && f % 500 === 120 && !z(0x86)) poke(0x86, 0x03);     // hammer time
    if (f % 9000 > 7000) { stick = 0xff; fire = 0x80; }                 // idle: attract mode
  }
  const reset = f < 4 || (rom.ram[0x8c & 0x7f] === 0 && f % 200 < 3) ? 0x0a : 0x0b;
  for (const m of [rom, dk.bus]) { m.swcha = stick; m.inpt4 = fire; m.swchb = reset; }
  const before = rom.ram.slice();
  rom.runFrames(1);
  dk.runFrame();
  const diffs = [];
  for (const r of ['a', 'x', 'y', 's', 'p', 'pc', 'cycles']) if (rom.cpu[r] !== dk.cpu[r]) diffs.push(`${r} rom ${hex(rom.cpu[r])} js ${hex(dk.cpu[r])}`);
  for (let i = 0; i < 128; i += 1) if (rom.ram[i] !== dk.bus.ram[i]) diffs.push(`$${hex(0x80 + i)} rom ${hex(rom.ram[i])} js ${hex(dk.bus.ram[i])}`);
  const wr = rom.lastFrameWrites, wj = dk.bus.lastFrameWrites;
  if (wr.length !== wj.length) diffs.push(`writes rom ${wr.length} js ${wj.length}`);
  for (let i = 0; i < Math.min(wr.length, wj.length); i += 1) {
    if (wr[i].reg !== wj[i].reg || wr[i].value !== wj[i].value || wr[i].cycle !== wj[i].cycle) { diffs.push(`write ${i} rom ${JSON.stringify(wr[i])} js ${JSON.stringify(wj[i])}`); break; }
  }
  const pr = rom.tia.lastFrame, pj = dk.bus.tia.lastFrame;
  if (pr && pr.some((row, y) => row.some((c, x) => c !== pj[y][x]))) diffs.push('picture differs');
  if (diffs.length) { bad += 1; if (bad <= 5) console.log(`frame ${f}: ${diffs.slice(0, 8).join(', ')}`); if (bad === 5) break; }
  const z = (a) => rom.ram[a & 0x7f];
  if (before[0x8d & 0x7f] !== 0xff && z(0x8d) === 0xff) stats.deaths += 1;
  if (before[0x8c & 0x7f] !== 0 && z(0x8c) === 0) stats.gameOvers += 1;
  if (before[0x90 & 0x7f] !== z(0x90)) stats.levels += 1;
  if (z(0x90)) stats.firefoxFrames += 1;
  if (z(0x86)) stats.hammerFrames += 1;
  stats.maxScoreHi = Math.max(stats.maxScoreHi, z(0x87));
}
if (unmapped.size) console.log('reads outside the data image:', [...unmapped].join(' '));
console.log({ frames, bad, ...stats });
process.exit(bad || unmapped.size ? 1 : 0);
