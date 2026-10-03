// Boots the cartridge, presses Game Reset and renders a few frames to
// tools/out/smoke-*.png so the oracle can be eyeballed against Stella.
import { mkdirSync } from 'node:fs';
import { VCS, loadRom, CYCLES_PER_LINE, TIA } from './vcs.mjs';
import { writeFramePng } from './png.mjs';

mkdirSync('tools/out', { recursive: true });
const vcs = new VCS(loadRom());
// visible lines: from VBLANK off to VBLANK on
const visible = (writes) => {
  const vb = writes.filter((w) => w.reg === TIA.VBLANK);
  const on = vb.find((w) => !(w.value & 2)), off = vb.findLast((w) => w.value & 2);
  // a line counts as visible when VBLANK changes during its horizontal blank
  const line = (w) => Math.floor(w.cycle / CYCLES_PER_LINE) + ((w.cycle % CYCLES_PER_LINE) * 3 >= 68 ? 1 : 0);
  const first = line(on), last = line(off);
  return { first, count: last - first };
};
const shot = (name) => {
  const { first, count } = visible(vcs.lastFrameWrites);
  const rows = vcs.tia.lastFrame.slice(first, first + count);
  writeFramePng(`tools/out/smoke-${name}.png`, rows);
  console.log(name, 'state', vcs.ramByte(0x8c).toString(16), 'mario', vcs.ramByte(0x93), vcs.ramByte(0x9b), 'frame', vcs.frame, 'visible', first, count, 'lines total', Math.round(vcs.lastFrameWrites.at(-1).cycle / CYCLES_PER_LINE));
};
vcs.runFrames(60); shot('boot');
vcs.swchb &= ~1; vcs.runFrames(5); vcs.swchb |= 1;
vcs.runFrames(120);
// play starts on fire once the start music has finished
while (vcs.ramByte(0x8f)) vcs.runFrames(1);
vcs.inpt4 = 0; vcs.runFrames(2); vcs.inpt4 = 0x80;
vcs.runFrames(120); shot('play');
vcs.swcha = 0x7f; vcs.runFrames(60); vcs.swcha = 0xff; shot('right');
