// Playable Donkey Kong for the site: the translated cartridge (dkMachine.mjs)
// on a canvas, keyboard input while the game has focus, a gamepad, touch
// buttons on phones, and the TIA sound worklet. Mount with mountPlayer(root);
// root holds the canvas and the [data-*] controls.
import { DkMachine } from './dkMachine.mjs';
import { NTSC_PALETTE_RGB } from './palette.mjs';
import { createTiaAudio } from './tiaAudio.mjs';
import { readGamepad, gamepadEdges } from './gamepad.mjs';

export const FIRST_LINE = 42;    // VBLANK goes off early in frame line 42 and back on in line 233
export const VISIBLE_LINES = 191;
const FRAME_MS = 1000 / 60;
const KEYS = {
  ArrowRight: 'right', KeyD: 'right', ArrowLeft: 'left', KeyA: 'left',
  ArrowDown: 'down', KeyS: 'down', ArrowUp: 'up', KeyW: 'up', Space: 'fire', KeyZ: 'fire',
};
const GAME_STATE = 0x8c, SOUND_DURATION = 0x8f;

export function mountPlayer(root) {
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const playButton = root.querySelector('[data-play]');
  const poster = root.querySelector('[data-poster]');
  const hint = root.querySelector('[data-hint]');
  const muteButton = root.querySelector('[data-mute]');
  const pauseButton = root.querySelector('[data-pause]');

  const dk = new DkMachine();
  const held = new Set();
  const audio = createTiaAudio(new URL('./tiaSound.worklet.js', import.meta.url).href);
  const screen = document.createElement('canvas');
  screen.width = 160;
  screen.height = VISIBLE_LINES;
  const screenCtx = screen.getContext('2d');
  const image = screenCtx.createImageData(160, VISIBLE_LINES);

  let started = false, paused = false, muted = false, resetHold = 0, sinceReset = 0;
  let last = 0, acc = 0, pad = null, lastState = -1;

  const setHint = (text) => { if (hint) hint.textContent = text; };
  const silence = () => audio.setSilent(muted || paused || !started);
  const ram = (addr) => dk.bus.ram[addr & 0x7f];

  function step() {
    const on = (control) => held.has(control) || !!pad?.[control];
    let swcha = 0xff;
    if (on('right')) swcha &= ~0x80;
    if (on('left')) swcha &= ~0x40;
    if (on('down')) swcha &= ~0x20;
    if (on('up')) swcha &= ~0x10;
    dk.bus.swcha = swcha;
    dk.bus.inpt4 = on('fire') ? 0x00 : 0x80;
    dk.bus.swchb = resetHold > 0 ? 0x0a : 0x0b; // bit 0 low: the RESET switch
    dk.runFrame();
    if (resetHold > 0) resetHold -= 1;
    sinceReset += 1;
    audio.update(dk.bus.audio);
    const state = ram(GAME_STATE);
    if (started && state !== lastState) {
      if (state === 0x01) setHint('Press fire to go on.'); // after a lost life or a cleared screen
      else if (state === 0xff) setHint('Arrows, WASD or a gamepad move; Space, Z or A jumps. P pauses, M mutes.');
      else if (state === 0x00 && sinceReset > 4) setHint('Game over. Press Enter or Reset to play again.'); // not the reset itself
    }
    lastState = state;
  }

  function draw() {
    const rows = dk.bus.tia.lastFrame;
    if (!rows) return;
    const data = image.data;
    for (let y = 0; y < VISIBLE_LINES; y += 1) {
      const row = rows[FIRST_LINE + y];
      for (let x = 0; x < 160; x += 1) {
        const rgb = NTSC_PALETTE_RGB[(row[x] >> 1) & 0x7f];
        const o = (y * 160 + x) * 4;
        data[o] = rgb >> 16; data[o + 1] = (rgb >> 8) & 0xff; data[o + 2] = rgb & 0xff; data[o + 3] = 255;
      }
    }
    screenCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
  }

  function frame(t) {
    if (!last) last = t;
    const dt = Math.min(100, t - last);
    last = t;
    pad = readGamepad();
    const edges = gamepadEdges(pad);
    if (edges.start) (started ? pressReset() : play());
    if (edges.back && started) togglePause();
    if (!paused && !document.hidden) {
      acc += dt;
      while (acc >= FRAME_MS) { step(); acc -= FRAME_MS; }
    }
    draw();
    requestAnimationFrame(frame);
  }

  function pressReset() {
    resetHold = 2;
    sinceReset = 0;
    paused = false;
    if (pauseButton) pauseButton.textContent = 'Pause';
    setHint('Wait for the music, then press fire to start.');
    silence();
  }

  async function play() {
    started = true;
    if (poster) poster.hidden = true;
    canvas.focus({ preventScroll: true });
    await audio.start();
    silence();
    pressReset();
  }

  function togglePause() {
    paused = !paused;
    if (pauseButton) pauseButton.textContent = paused ? 'Resume' : 'Pause';
    silence();
  }

  function toggleMute() {
    muted = !muted;
    if (muteButton) {
      muteButton.textContent = muted ? 'Sound on' : 'Mute';
      muteButton.setAttribute('aria-pressed', String(muted));
    }
    silence();
  }

  playButton?.addEventListener('click', play);
  pauseButton?.addEventListener('click', () => { if (started) togglePause(); });
  muteButton?.addEventListener('click', toggleMute);
  root.querySelector('[data-reset]')?.addEventListener('click', () => { if (started) pressReset(); else play(); });

  canvas.addEventListener('keydown', (event) => {
    const control = KEYS[event.code];
    if (control) { event.preventDefault(); held.add(control); }
    if (event.code === 'Enter') { event.preventDefault(); started ? pressReset() : play(); }
    if (event.code === 'KeyP') togglePause();
    if (event.code === 'KeyM') toggleMute();
  });
  canvas.addEventListener('keyup', (event) => { const control = KEYS[event.code]; if (control) held.delete(control); });
  canvas.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', () => { if (!started) play(); });

  // touch controls: hold to press
  root.querySelectorAll('[data-hold]').forEach((button) => {
    const control = button.dataset.hold;
    const down = (event) => {
      event.preventDefault();
      held.add(control);
      if (!started) play();
      try { button.setPointerCapture(event.pointerId); } catch { /* finger already lifted: the press still counts */ }
    };
    const up = () => held.delete(control);
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));

  step();
  draw();
  requestAnimationFrame(frame);

  // dev hook for headless checks: runs frames without the animation loop
  return {
    machine: dk,
    step(n = 1) { for (let i = 0; i < n; i += 1) step(); draw(); },
    hold(control, on) { if (on) held.add(control); else held.delete(control); },
    reset: pressReset,
    play,
    soundPlaying: () => ram(SOUND_DURATION) !== 0,
  };
}
