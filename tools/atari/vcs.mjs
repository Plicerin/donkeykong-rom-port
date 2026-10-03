// Dev oracle: the real cartridge interpreted by the 6502 core on the shared
// bus. Not used by the game itself.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { M6502 } from '../../src/cpu6502.mjs';
import { VcsBus, TIA, CYCLES_PER_LINE } from '../../src/vcsBus.mjs';

export { TIA, CYCLES_PER_LINE };

// Donkey Kong (Coleco, 1982), the standard NTSC cartridge
export const ROM_MD5 = '36b20c427975760cb9cf4a47e41369e4';

export function loadRom(path = 'rom/donkey_kong.a26') {
  const rom = readFileSync(path);
  const md5 = createHash('md5').update(rom).digest('hex');
  if (md5 !== ROM_MD5) throw new Error(`unexpected ROM md5 ${md5}`);
  return rom;
}

export class VCS extends VcsBus {
  constructor(rom, options = {}) {
    super(rom, options);
    this.cpu = new M6502(this);
    this.cpu.reset();
  }
}
