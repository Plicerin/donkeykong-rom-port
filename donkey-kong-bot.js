// donkey-kong-bot.js — autonomous DK player agent
// Drives Mario via the game's `keys` object + `sp` start flag. Climbs the board
// from the ground (w6) to the top (w0) where DK/Pauline are, dodging/jumping
// barrels on the way and grabbing the hammer when convenient.
//
// Usage (browser console):  dkBot.start()  /  dkBot.stop()  /  dkBot.stats()
(function(){
'use strict';

const BOT={
  active:false,frame:0,
  wins:0,deaths:0,jumps:0,smashes:0,lastScore:0,
  useHammer:true,
  log:function(msg){console.log('%c🐒 DKBot: '+msg,'color:#0ff')}
};

// --- helpers ---------------------------------------------------------------
function goLeft(){keys['ArrowLeft']=true;keys['ArrowRight']=false;st.__f='L';}
function goRight(){keys['ArrowLeft']=false;keys['ArrowRight']=true;st.__f='R';}
function releaseDir(){keys['ArrowLeft']=false;keys['ArrowRight']=false;}
function climbUp(){keys['ArrowUp']=true;keys['ArrowDown']=false;}
function climbDown(){keys['ArrowUp']=false;keys['ArrowDown']=true;}
function releaseClimb(){keys['ArrowUp']=false;keys['ArrowDown']=false;}
function jump(){keys['Space']=true;}
function noJump(){keys['Space']=false;}
function releaseAll(){releaseDir();releaseClimb();noJump();}

// girder surface x-span (walkable range) for walkway w
function span(w){const g=GEO[w];return [Math.min(g[0],g[1])+5, Math.max(g[0],g[1])-5];}

// nearest barrel ON Mario's current walkway, plus signed dx (barrel-mario)
function threatOn(w){
  let best=null,bestD=Infinity;
  for(const o of st.obs){
    if(!o.a||o.w!==w)continue;
    const d=Math.abs(o.x-st.mx);
    if(d<bestD){bestD=d;best=o;}
  }
  return best?{b:best,dist:bestD,dx:best.x-st.mx}:null;
}

// the ladder that goes UP from walkway w (LADDERS: climbing up is to->from,
// higher walkway = lower index, so we want l.to===w). Pick the closest in x.
function ladderUpFrom(w){
  let best=null,bestD=Infinity;
  for(const l of LADDERS){
    if(l.to!==w)continue;
    const d=Math.abs(l.x-st.mx);
    if(d<bestD){bestD=d;best=l;}
  }
  return best;
}

// --- brain -----------------------------------------------------------------
function think(){
  BOT.frame++;

  // track score-driven stats
  if(st.score>BOT.lastScore){BOT.lastScore=st.score;}

  // ATTRACT: start the game
  if(st.mode===0){releaseAll();sp=true;return;}
  // GAME OVER: wait it out (records a death cycle)
  if(st.mode===1){releaseAll();return;}
  // WIN screen: count it, wait for next level
  if(st.mode===2){releaseAll();return;}
  if(st.mode!==128){releaseAll();return;}

  // death cooldown — hands off
  if(st.dcd>0){releaseAll();return;}

  // reached the top? just idle (win check fires in update)
  if(st.w===0){releaseAll();return;}

  // MID-CLIMB: keep climbing in the committed direction; don't fight physics
  if(st.cl!==0){
    releaseDir();noJump();
    if(st.cl>0)climbUp(); else climbDown();
    return;
  }

  // FALLING / JUMPING: can't steer; just hold, release lateral so we land clean
  if(st.flg||st.jht>0){releaseClimb();return;}

  // ---- GROUNDED on walkway w ----
  const w=st.w;
  const [lo,hi]=span(w);
  const t=threatOn(w);

  // Barrel dodging takes priority — a barrel rolling at us on this walkway.
  if(t && t.dist<40){
    // Jump it: nudge toward the barrel so we arc over it, then jump.
    if(t.dx>0)goRight(); else goLeft();
    releaseClimb();jump();
    return;
  }
  noJump();

  // Decide the target: next ladder up (toward the top). Optionally detour to
  // the hammer if it's on this walkway, close, and barrels are near.
  let targetX=null, wantClimb=false;

  const up=ladderUpFrom(w);

  // Hammer detour: on the hammer walkway, not yet taken, and a barrel is coming.
  if(BOT.useHammer && !HAMMER.taken && st.ham<=0 && w===HAMMER.w && t && t.dist<90){
    targetX=HAMMER.x;
  } else if(up){
    targetX=up.x; wantClimb=true;
  } else {
    // no ladder up from here (shouldn't happen below w0) — hold center
    targetX=(lo+hi)/2;
  }

  // If a barrel is approaching from the direction we need to walk, and it's
  // moderately close, jump it rather than walk into it.
  if(t && t.dist<70){
    const needDir = targetX>st.mx?1:-1;
    if(Math.sign(t.dx)===needDir){
      if(t.dx>0)goRight(); else goLeft();
      jump();
      return;
    }
  }

  // Walk toward the target x.
  const dxT=targetX-st.mx;
  if(Math.abs(dxT)>3){
    if(dxT>0)goRight(); else goLeft();
    releaseClimb();
  } else {
    releaseDir();
    // Arrived at the ladder x — climb up (only if this is a climb target).
    if(wantClimb){climbUp();}
    else{releaseClimb();}
  }

  // Edge guard — never walk off the girder.
  if(st.mx<=lo){goRight();}
  else if(st.mx>=hi){goLeft();}
}

function loop(){
  if(!BOT.active)return;
  try{think();}catch(e){BOT.log('ERR '+e.message);}
  requestAnimationFrame(loop);
}

function start(){
  if(BOT.active)return;
  BOT.active=true;BOT.lastScore=st.score||0;
  BOT.log('STARTED — climbing for the top');
  loop();
}
function stop(){BOT.active=false;releaseAll();BOT.log('STOPPED');}
function stats(){
  const s={active:BOT.active,frame:BOT.frame,score:st.score,lives:st.lives,
           level:st.level,walkway:st.w,mode:st.mode,hammer:st.ham};
  BOT.log(JSON.stringify(s));
  return s;
}

window.dkBot={start,stop,stats,active:()=>BOT.active,
              tick:think,   // expose for deterministic/headless stepping
              setHammer:(v)=>{BOT.useHammer=!!v;}};
BOT.log('loaded — run dkBot.start() to begin');
})();
