/**
 * Generate ALL ladder connections at a given x position.
 * Ladders can skip non-adjacent walkways if intermediate walkways
 * don't have surface at x and BOTH the higher and lower walkways do.
 */
function makeAllLaddersAt(x) {
  const ZIG = [[64,159],[64,239],[96,143],[128,183],[96,167],[64,255]];
  const result = [];
  // Find all walkways that have this x
  const onWalkways = [];
  for (let w = 0; w < ZIG.length; w++) {
    const [l, r] = ZIG[w];
    if (x >= l && x <= r) onWalkways.push(w);
  }
  // Connect every pair where upper > lower (upper = smaller index = higher walkway)
  for (let i = 0; i < onWalkways.length; i++) {
    for (let j = i + 1; j < onWalkways.length; j++) {
      const upper = Math.min(onWalkways[i], onWalkways[j]);
      const lower = Math.max(onWalkways[i], onWalkways[j]);
      // Add DIRECT connection (skip-ladder)
      result.push({x, from: upper, to: lower});
    }
  }
  return result;
}

const RED_MARKS = [68, 131, 156, 171, 194, 255];
const LADDERS = [];
for (const rx of RED_MARKS) {
  const lads = makeAllLaddersAt(rx);
  for (const l of lads) {
    if (!LADDERS.some(e => e.x === l.x && e.from === l.from && e.to === l.to)) {
      LADDERS.push(l);
    }
  }
}
console.log(JSON.stringify(LADDERS));
