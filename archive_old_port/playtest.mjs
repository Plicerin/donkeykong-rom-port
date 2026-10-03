/**
 * Deterministic DK port playtest via window.__DK.tick (no wall-clock races).
 * node playtest.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = process.env.DK_URL || 'http://127.0.0.1:5500/game.html';
const OUT = path.resolve('playtest-out');
fs.mkdirSync(OUT, { recursive: true });

const report = { started: new Date().toISOString(), url: URL, checks: [], errors: [] };

function check(name, pass, detail) {
  report.checks.push({ name, pass: !!pass, detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail != null && detail !== '' ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  page.on('pageerror', (e) => report.errors.push(String(e.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') report.errors.push('console: ' + m.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__DK && window.__DK.getState);

  const st = () => page.evaluate(() => window.__DK.getState());
  const snap = async (n) => {
    await page.locator('canvas').screenshot({ path: path.join(OUT, n + '.png') });
  };
  const run = (fn) => page.evaluate(fn);

  await run(() => {
    window.__DK.pause(true);
    window.__DK.clearKeys();
    window.__DK.start();
    window.__DK.tick(5);
  });
  let s = await st();
  check('starts_game', s.mode === 128, `mode=${s.mode}`);
  await snap('00-start');

  await run(() => {
    window.__DK.forceL1();
    window.__DK.place(6, 160);
    window.__DK.clearKeys();
    window.__DK.keys({ right: true });
    window.__DK.tick(40);
  });
  s = await st();
  const dx = s.mx - 160;
  check('mario_speed_1px_per_2f', dx >= 18 && dx <= 22, `dx=${dx} expect 20`);
  await run(() => window.__DK.clearKeys());

  await run(() => {
    window.__DK.forceL1();
    window.__DK.place(6, 80);
    window.__DK.clearKeys();
    window.__DK.keys({ up: true });
    window.__DK.tick(80);
  });
  s = await st();
  check('l1_climb_starts_or_up', s.cl !== 0 || s.w < 6, `w=${s.w} cl=${s.cl} my=${s.my}`);
  await snap('01-l1-climb');

  await run(() => {
    window.__DK.forceL1();
    window.__DK.tick(60);
  });
  s = await st();
  check('bonus_stable_60f', s.bonus === 0x50, `bonus=${s.bonus}`);
  await run(() => window.__DK.tick(70));
  s = await st();
  check('bonus_tick_by_128', s.bonus !== 0x50, `bonus=${s.bonus} dec=${s.bonusDec}`);

  await run(() => {
    window.__DK.forceL2();
    window.__DK.place(1, 108);
    window.__DK.tick(3);
  });
  s = await st();
  check('walk_rivet_pull', s.rivits[0] === 6, `rivits0=${s.rivits[0]}`);

  await run(() => {
    window.__DK.forceL2();
    window.__DK.place(1, 100);
    window.__DK.clearKeys();
    window.__DK.keys({ right: true });
    window.__DK.tick(4);
    window.__DK.keys({ right: true, jump: true });
    window.__DK.tick(2);
    window.__DK.keys({ right: true, jump: false });
    window.__DK.tick(40);
  });
  s = await st();
  check('jump_rivet_pull', (s.rivits[0] & 0xff) >= 6, `rivits0=${s.rivits[0]} mx=${s.mx} jht=${s.jht}`);
  await snap('02-jump-rivet');

  const foxCross = await run(() => {
    window.__DK.forceL2();
    window.__DK.setRivit(0, 6);
    const prev = new Map();
    let bad = 0;
    for (let i = 0; i < 500; i++) {
      window.__DK.tick(1);
      const st = window.__DK.getState();
      st.obs.forEach((o, idx) => {
        if (o.kind !== 'fox' || o.w !== 1) return;
        const p = prev.get(idx);
        if (p != null) {
          if ((p < 108 && o.x > 108) || (p > 108 && o.x < 108)) bad++;
        }
        prev.set(idx, o.x);
      });
    }
    return { bad, n: prev.size };
  });
  check('fox_no_cross_left_gap', foxCross.bad === 0, JSON.stringify(foxCross));
  await snap('03-fox-gap');

  const ham = await run(() => {
    window.__DK.forceL1();
    window.__DK.place(6, 160);
    window.__DK.grantHammer();
    window.__DK.keys({ right: true });
    const counts = [];
    for (let i = 0; i < 32; i++) {
      window.__DK.tick(1);
      counts.push(window.__DK.hammerPixelCount());
    }
    return counts;
  });
  const minH = Math.min(...ham);
  const maxH = Math.max(...ham);
  check('hammer_visible_both_poses', minH >= 8 && maxH >= 12, `min=${minH} max=${maxH} sample=${ham.slice(0, 12).join(',')}`);
  await snap('04-hammer');

  await run(() => {
    window.__DK.forceL2();
    window.__DK.pullAllRivets();
    window.__DK.tick(2);
  });
  s = await st();
  check('l2_all_rivets_wins', s.mode === 2, `mode=${s.mode}`);

  await run(() => {
    window.__DK.forceL1();
    window.__DK.place(0, 100);
    window.__DK.tick(2);
  });
  s = await st();
  check('l1_top_wins', s.mode === 2, `mode=${s.mode} w=${s.w}`);

  await run(() => window.__DK.forceL1());
  s = await st();
  check('l1_has_ladders', s.ladders >= 10, `ladders=${s.ladders}`);
  await snap('05-l1-ladders');

  // Fox AI determinism: same seed → identical fox x after N frames (LF900 path)
  const foxA = await run(() => {
    window.__DK.forceL2();
    window.__DK.setSeed(0x10);
    window.__DK.tick(200);
    return window.__DK.getState().obs.filter((o) => o.kind === 'fox').map((o) => o.x + ',' + o.d);
  });
  const foxB = await run(() => {
    window.__DK.forceL2();
    window.__DK.setSeed(0x10);
    window.__DK.tick(200);
    return window.__DK.getState().obs.filter((o) => o.kind === 'fox').map((o) => o.x + ',' + o.d);
  });
  check('fox_seed_deterministic', JSON.stringify(foxA) === JSON.stringify(foxB) && foxA.length === 4,
    `A=${foxA.join('|')} B=${foxB.join('|')}`);

  // Hammer smash: ASM SMASHING_OBSTACLE=$08 → +800 display pts
  const smash = await run(() => {
    window.__DK.forceL1();
    window.__DK.place(5, 130);
    window.__DK.grantHammer();
    // clear auto-spawned barrels then plant one in swing range
    const st0 = window.__DK.getState();
    window.__DK.tick(0);
    return (() => {
      // use internal: wipe obs via force then respawn single
      window.__DK.forceL1();
      window.__DK.place(5, 130);
      window.__DK.grantHammer();
      window.__DK.spawnBarrel(5, 142);
      const before = window.__DK.getState();
      const nBefore = before.obs.length;
      window.__DK.tick(2);
      const after = window.__DK.getState();
      return {
        beforeScore: before.score,
        score: after.score,
        nBefore,
        nAfter: after.obs.length,
        delta: after.score - before.score,
      };
    })();
  });
  // nAfter may stay ≥1 because StartNewBarrel can refill a top slot same ticks
  check('hammer_smash_800', smash.delta >= 800, JSON.stringify(smash));

  // Hammer duration: dec only on frameCount wrap → still holding after 200 frames
  const hamDur = await run(() => {
    window.__DK.forceL1();
    window.__DK.grantHammer();
    window.__DK.tick(200);
    return window.__DK.getState().ham;
  });
  check('hammer_duration_long', hamDur >= 2, `ham=${hamDur} after 200f`);

  // Barrel spawn at ASM STARTING_BARREL_HORIZ=$25 → canvas 74
  const bspawn = await run(() => {
    window.__DK.forceL1();
    window.__DK.clearObstacles();
    window.__DK.tick(2); // allow one spawn
    const b = window.__DK.getState().obs.filter((o) => (o.kind || 'barrel') !== 'fox');
    return b.map((o) => ({ x: o.x, w: o.w, tiaX: o.tiaX, tiaY: o.tiaY }));
  });
  check(
    'barrel_spawn_top',
    bspawn.some((b) => b.tiaX === 0x25 && b.tiaY === 0x0c),
    JSON.stringify(bspawn.slice(0, 4))
  );

  // Stage flip L1 win → after wt, screen becomes L2
  const flip = await run(() => {
    window.__DK.forceL1();
    window.__DK.place(0, 100);
    window.__DK.tick(2); // win
    const m2 = window.__DK.getState().mode;
    window.__DK.tick(160); // past wt
    const s = window.__DK.getState();
    return { m2, mode: s.mode, screen: s.screen, level: s.level };
  });
  check('stage_flip_after_win', flip.m2 === 2 && flip.mode === 128 && flip.screen === 1,
    JSON.stringify(flip));
  await snap('06-stage-flip');

  // Bot: walk every rivet cell on L2 (foxes cleared — certifies CheckRivits path, not combat)
  const l2clear = await run(() => {
    window.__DK.forceL2();
    window.__DK.clearObstacles();
    const floors = [1, 2, 3, 4];
    const xs = [108, 212];
    for (const w of floors) {
      for (const x of xs) {
        window.__DK.place(w, x);
        window.__DK.tick(1);
      }
    }
    window.__DK.tick(2);
    return window.__DK.getState();
  });
  check('l2_bot_pull_all_wins', l2clear.mode === 2 && l2clear.rivits.every((v) => v >= 0x12),
    `mode=${l2clear.mode} rivits=${l2clear.rivits.join(',')}`);
  await snap('07-l2-bot-clear');

  // Fox FAIR_PIXEL_DELTA: (foxTiaY+9)==marioTiaY enables chase when seed<2
  const foxChase = await run(() => {
    window.__DK.forceL2();
    window.__DK.clearKeys();
    window.__DK.place(1, 80);
    const base = 0x0c;
    const groundedY = (base + 9) & 0xff;
    const dirs = [];
    for (let i = 0; i < 8; i++) {
      // update: seed++ first → set 0 so fox sees 1
      window.__DK.setSeed(0);
      window.__DK.tick(1);
      const s = window.__DK.getState();
      const f = s.obs.find((o) => o.kind === 'fox' && o.w === 1);
      if (f) dirs.push({ d: f.d, foxY: f.tiaY, mY: s.marioTiaY, fx: f.x, mx: s.mx });
    }
    // Jump breaks exact Y match ( - JUMPING_HEIGHT )
    window.__DK.place(1, 80);
    window.__DK.keys({ jump: true });
    window.__DK.setSeed(0);
    window.__DK.tick(1);
    window.__DK.keys({});
    const mid = window.__DK.getState();
    return {
      dirs,
      groundedY,
      groundedMatch: dirs.filter((x) => x.mY === groundedY).length,
      // ASM: cmp horPos → face toward Mario when Y matches
      chaseToward: dirs.some(
        (x) =>
          x.mY === groundedY &&
          ((x.fx > x.mx && x.d === -1) || (x.fx < x.mx && x.d === 1))
      ),
      jumped: { jht: mid.jht, mY: mid.marioTiaY, eqGround: mid.marioTiaY === groundedY },
    };
  });
  check(
    'fox_fair_pixel_y_chase',
    foxChase.groundedMatch >= 1 &&
      foxChase.chaseToward === true &&
      foxChase.jumped.jht > 0 &&
      foxChase.jumped.eqGround === false,
    JSON.stringify(foxChase)
  );

  // Barrel ladder tables: place on exact grab cell (LadderHoriz/Down-FAIR)
  const barrelLad = await run(() => {
    window.__DK.forceL1();
    window.__DK.clearObstacles();
    // idx0: horiz $6D, grabY=$84-$09=$7B. Compare uses (tiaX-1)==horiz → start tiaX=$6E
    // Move right first frame → tiaX=$6F before check — so pre-place at $6D after move from $6C:
    // right move: start $6C → $6D, then check (tiaX-1)=$6C !== $6D.
    // Need after move tiaX-1 == $6D → tiaX == $6E after move → start $6D if right.
    // start tiaX=$6D, dir right → after inc $6E; ($6E-1)=$6D match. Y must stay grabY.
    const grabY = (0x84 - 0x09) & 0xff;
    window.__DK.spawnBarrelTia(0x6d, grabY, 0x01);
    window.__DK.setSeed(0x10); // full ladder scan ( < $30 )
    // may need 2 ticks if half-rate skips
    let hit = null;
    for (let i = 0; i < 4; i++) {
      window.__DK.setSeed(0x10);
      window.__DK.tick(1);
      const s = window.__DK.getState();
      const b = s.obs.find((o) => (o.kind || 'barrel') !== 'fox');
      if (b && ((b.dir & 0x80) || b.ladderIdx != null)) {
        hit = { i, dir: b.dir, ladderIdx: b.ladderIdx, tiaX: b.tiaX, tiaY: b.tiaY };
        break;
      }
    }
    return hit;
  });
  check('barrel_ladder_table_grab', !!barrelLad && (barrelLad.dir & 0x80) !== 0, JSON.stringify(barrelLad));

  // Ramp table: at exact RampHoriz X while not top/bottom, tiaY increments
  const ramp = await run(() => {
    window.__DK.forceL1();
    window.__DK.clearObstacles();
    // RampHoriz[6]=$2D; moving right: match hx===ramp. start $2C → $2D.
    const y0 = 0x40;
    window.__DK.spawnBarrelTia(0x2c, y0, 0x01);
    window.__DK.setSeed(0xff); // seed>=thr → ladder scan starts mid (avoid accidental grab)
    let y1 = null;
    for (let i = 0; i < 4; i++) {
      window.__DK.setSeed(0xff);
      window.__DK.tick(1);
      const b = window.__DK.getState().obs[0];
      if (b && b.tiaX === 0x2d) {
        y1 = b.tiaY;
        break;
      }
      if (b) y1 = b.tiaY;
    }
    return { y0, y1, bumped: y1 === y0 + 1 || y1 === ((y0 + 1) & 0xff) };
  });
  check('barrel_ramp_table_bump', ramp.bumped === true, JSON.stringify(ramp));
  await snap('08-barrel-tables');

  // ASM sound: death PlayMusic dur=4 idx=$11; score dur=3; level dur=5
  const sfx = await run(() => {
    window.__DK.forceL1();
    const out = {};
    // jump sets duration 1
    window.__DK.place(6, 160);
    window.__DK.clearKeys();
    window.__DK.keys({ jump: true });
    window.__DK.tick(1);
    out.jump = { ...pick(window.__DK.getState()) };
    window.__DK.keys({});
    // death
    window.__DK.forceL1();
    window.__DK.tick(1);
    // call death via falling off? use evaluate of internal through score path
    // trigger level complete music
    window.__DK.place(0, 100);
    window.__DK.tick(1);
    out.level = { ...pick(window.__DK.getState()) };
    // score music from rivet
    window.__DK.forceL2();
    window.__DK.clearObstacles();
    window.__DK.place(1, 108);
    window.__DK.tick(1);
    out.score = { ...pick(window.__DK.getState()) };
    // walk: duration 2 when moving and quiet
    window.__DK.forceL1();
    window.__DK.place(6, 160);
    window.__DK.clearKeys();
    // drain any sound
    for (let i = 0; i < 80; i++) window.__DK.tick(1);
    window.__DK.keys({ right: true });
    let walk = null;
    for (let i = 0; i < 8; i++) {
      window.__DK.tick(1);
      const s = window.__DK.getState();
      if (s.sndDur === 2) {
        walk = pick(s);
        break;
      }
    }
    out.walk = walk;
    return out;
    function pick(s) {
      return { mode: s.mode, sndDur: s.sndDur, sndIdx: s.sndIdx, audc: s.audc, audv: s.audv };
    }
  });
  check('sfx_jump_dur1', sfx.jump && sfx.jump.sndDur === 1, JSON.stringify(sfx.jump));
  check('sfx_level_dur5', sfx.level && sfx.level.sndDur === 5 && sfx.level.mode === 2, JSON.stringify(sfx.level));
  check('sfx_score_dur3', sfx.score && sfx.score.sndDur === 3, JSON.stringify(sfx.score));
  check('sfx_walk_dur2', sfx.walk && sfx.walk.sndDur === 2 && sfx.walk.audc === 5, JSON.stringify(sfx.walk));

  check('no_page_errors', report.errors.length === 0, report.errors.slice(0, 3).join(' | '));

  report.finished = new Date().toISOString();
  report.passed = report.checks.filter((c) => c.pass).length;
  report.failed = report.checks.filter((c) => !c.pass).length;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nSUMMARY passed=${report.passed} failed=${report.failed}`);
  await browser.close();
  process.exit(report.failed || report.errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  report.errors.push(String(e));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(2);
});
