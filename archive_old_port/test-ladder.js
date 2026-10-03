(function testLadder() {
  console.log('=== LADDER TEST ===');
  console.log('State before: w=' + st.w + ' mx=' + st.mx + ' my=' + st.my + ' cl=' + st.cl);
  
  st.mx = 132;
  st.my = 155;
  st.w = 3;
  st.cl = 0;
  st.flg = 0;
  st.jht = 0;
  st.dcd = 0;
  st.mr = 2;
  
  var ladder = LADDERS.find(function(l) { return l.to === st.w && Math.abs(l.x - st.mx) <= 8; });
  console.log('LADDERS:', JSON.stringify(LADDERS));
  console.log('Found ladder: ' + (ladder ? JSON.stringify(ladder) : 'NULL'));
  console.log('LADDER_RANGE:', LADDER_RANGE);
  
  keys['ArrowUp'] = true;
  console.log('keys ArrowUp =', keys['ArrowUp']);
  
  update();
  console.log('State after: w=' + st.w + ' mx=' + st.mx + ' my=' + st.my + ' cl=' + st.cl + ' ct=' + (st.ct !== undefined ? st.ct : 'undef'));
  
  keys['ArrowUp'] = false;
  
  console.log('=== TEST DONE ===');
})();
