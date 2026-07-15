// donkey-kong-bot.js — autonomous DK player agent
// Controls Mario via the keys object. Hooks into game loop.
(function(){
'use strict';

const BOT={
  active:false,frame:0,
  log:function(msg){console.log('%c🐒 DKBot: '+msg,'color:#0ff')}
};

function threatOn(w){
  let best=null,bestD=Infinity;
  for(let o of st.obs){
    if(!o.a||o.w!==w)continue;
    const d=Math.abs(o.x-st.mx);
    if(d<bestD){bestD=d;best=o}
  }
  return best?{b:best,dist:bestD}:null;
}

function think(){
  BOT.frame++;

  // ATTRACT MODE — press Space to start via sp flag
  if(st.mode===0){
    sp=true;
    releaseDir();
    return;
  }

  // GAME OVER — wait for attract
  if(st.mode===1){release();return}

  // dying animation — release controls
  if(st.dcd>0){release();return}

  // falling or jumping — can't steer, release keys but keep from edge
  if(st.flg||st.jht>0){
    keys['ArrowLeft']=false;keys['ArrowRight']=false;
    return;
  }

  const w=st.w,s=ZIG[w];
  if(!s){release();return}
  const lSafe=s[0]+6,rSafe=s[1]-6,ctr=(lSafe+rSafe)/2;

  const t=threatOn(w);
  if(t){
    const b=t.b,dist=t.dist;
    if(dist<20){
      // CRITICAL — barrel about to hit! JUMP
      keys['Space']=true;
      if(b.d>0){goLeft()}else{goRight()}
      return;
    }
    if(dist<50){
      // barrel approaching — move away from direction
      if(b.d>0&&b.x<st.mx){goRight()}
      else if(b.d<0&&b.x>st.mx){goLeft()}
      else if(st.mx<ctr){goRight()}
      else if(st.mx>ctr){goLeft()}
      else{releaseDir()}
      keys['Space']=false;
      return;
    }
  }

  // no threat — idle near center, watch edges
  if(st.mx<ctr-8){goRight()}
  else if(st.mx>ctr+8){goLeft()}
  else{releaseDir()}
  keys['Space']=false;

  // edge guard: don't fall off
  if(st.mx<=lSafe+2){goRight()}
  else if(st.mx>=rSafe-2){goLeft()}
}

function goLeft(){keys['ArrowLeft']=true;keys['ArrowRight']=false}
function goRight(){keys['ArrowLeft']=false;keys['ArrowRight']=true}
function releaseDir(){keys['ArrowLeft']=false;keys['ArrowRight']=false}
function release(){keys['ArrowLeft']=false;keys['ArrowRight']=false;keys['Space']=false}

function loop(){
  if(!BOT.active)return;
  think();
  requestAnimationFrame(loop);
}

function start(){
  if(BOT.active)return;
  BOT.active=true;BOT.log('STARTED');
  loop();
}

function stop(){
  BOT.active=false;release();
  BOT.log('STOPPED');
}

window.dkBot={start,stop,active:()=>BOT.active};
BOT.log('loaded — run dkBot.start() to begin');
})();