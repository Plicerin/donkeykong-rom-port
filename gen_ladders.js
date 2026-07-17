/**
 * Generate ladder connections at a given x position.
 * A ladder connects walkways that BOTH have surface at that x.
 */
function makeLaddersAt(x) {
  const ZIG = [[64,159],[64,239],[96,143],[128,183],[96,167],[64,255]];
  const result = [];
  // Check all adjacent walkway pairs
  for (let w = 0; w < ZIG.length - 1; w++) {
    const lower = w + 1; // higher y = lower walkway
    const upper = w;     // lower y = upper walkway
    const [l1, r1] = ZIG[upper];
    const [l2, r2] = ZIG[lower];
    // Does x fall on BOTH surfaces?
    if (x >= l1 && x <= r1 && x >= l2 && x <= r2) {
      // upper (from) = higher walkway, lower (to) = lower
      result.push({x, from: upper, to: lower});
    }
  }
  return result;
}

// Generate from red mark centers
const RED_MARKS = [68, 131, 156, 171, 194, 255];
const LADDERS = [];
for (const rx of RED_MARKS) {
  const lads = makeLaddersAt(rx);
  for (const l of lads) {
    // Avoid duplicates
    if (!LADDERS.some(e => e.x === l.x && e.from === l.from && e.to === l.to)) {
      LADDERS.push(l);
    }
  }
}
console.log(JSON.stringify(LADDERS));
