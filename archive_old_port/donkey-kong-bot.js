// donkey-kong-bot.js — autonomous DK player agent
// Drives Mario via the game's `keys` object + `sp` start flag. Climbs Level 1
// while dodging barrels, then automatically switches to Level 2 to pull both
// rivets on each floor, jump Firefoxes, cross pulled-rivet gaps, and climb up.
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

const GEO2=[[64,255],[64,255],[64,255],[64,255],[64,255],[64,255]];
const LADDERS2=[];
for(let w=0;w<5;w++)for(const x of [82,122,194,234])LADDERS2.push({x,from:w,to:w+1});
const RIVET_X2=[108,212],RIVET_LEFT2=6,RIVET_RIGHT2=12,RIVET_DONE2=18;
function level2(){return st.screen===1;}
function spanFor(w){const g=(level2()?GEO2:GEO)[w];return [g[0]+5,g[1]-5];}


// nearest active obstacle ON Mario's current walkway, plus signed dx (obstacle-mario)
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

function ladderUpFrom2(w){
  let best=null,bestD=Infinity;
  for(const l of LADDERS2){
    if(l.to!==w)continue;
    const d=Math.abs(l.x-st.mx);
    if(d<bestD){bestD=d;best=l;}
  }
  return best;
}

function thinkLevel2(){
  const w=st.w;
  const [lo,hi]=spanFor(w);
  const t=threatOn(w);

  if(w===0){releaseAll();return;}
  if(st.cl!==0){
    releaseDir();noJump();
    if(st.cl>0)climbUp(); else climbDown();
    return;
  }
  if(st.flg||st.jht>0){releaseClimb();return;}

  // A pulled rivet is a real hole. If an evasive jump leaves Mario on the
  // wrong side, jump across the hole instead of walking through its exact x.
  if(w>=1&&w<=4){
    const rv=st.rivits[w-1]|0;
    if(rv===RIVET_LEFT2&&st.mx<=RIVET_X2[0]){
      goRight();st.md=1;releaseClimb();jump();return;
    }
    if(rv===RIVET_RIGHT2&&st.mx>=RIVET_X2[1]){
      goLeft();st.md=0;releaseClimb();jump();return;
    }
  }

  // Firefoxes are the only Level 2 hazards. Jump early enough to clear their
  // collision box without changing the rivet route.
  if(t&&t.dist<30){
    // Jump direction is latched from Mario's facing on the jump-start frame.
    // Climbing can leave that facing stale, so set it explicitly first.
    const atEdge=st.mx<=lo+8||st.mx>=hi-8;
    const closing=(t.dx>0&&t.b.d<0)||(t.dx<0&&t.b.d>0);
    const jumpRight=atEdge?(t.dx>0):(closing?t.dx>0:t.b.d>0);
    if(jumpRight){goRight();st.md=1;} else {goLeft();st.md=0;}
    releaseClimb();jump();
    return;
  }
  noJump();

  let targetX=null,wantClimb=false;
  if(w>=1&&w<=4){
    const rv=st.rivits[w-1]|0;
    if(rv<RIVET_LEFT2)targetX=RIVET_X2[0];
    else if(rv===RIVET_LEFT2)targetX=RIVET_X2[1];
    else if(rv<RIVET_RIGHT2)targetX=RIVET_X2[0];
    else if(rv<RIVET_DONE2)targetX=RIVET_X2[1];
  }
  if(targetX===null){
    const up=ladderUpFrom2(w);
    if(up){targetX=up.x;wantClimb=true;}
    else targetX=(lo+hi)/2;
  }

  const dxT=targetX-st.mx;
  const targetTolerance=wantClimb?3:0;
  if(Math.abs(dxT)>targetTolerance){
    if(dxT>0)goRight(); else goLeft();
    releaseClimb();
  }else{
    releaseDir();
    if(wantClimb)climbUp(); else releaseClimb();
  }
  if(st.mx<=lo)goRight();
  else if(st.mx>=hi)goLeft();
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

  if(level2()){thinkLevel2();return;}

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
  const targetTolerance=wantClimb?3:0;
  if(Math.abs(dxT)>targetTolerance){
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
