/* La vista pública presenta el sorteo; el estado y los plazos viven en el modelo. */
function drawPublicURL(mode){
  return mode==='primaria'?'publico-primaria.html#sorteo':`publico-secundaria.html?categoria=${mode==='secundaria_alta'?'alta':'baja'}#sorteo`;
}
function drawGroupHTML(S,mode,group,targets=[]){
  const slots=drawSlotsS(S)[group];
  return `<section class="draw-group" data-draw-group="${group}" aria-label="${groupLabelS(group)}">
    <h3>${groupLabelS(group)}</h3><ol>${slots.map((p,i)=>{
      const active=targets.some(t=>t.group===group && t.position===i);
      return `<li class="draw-slot ${active?'draw-target':''} ${p?'filled':''}" data-draw-position="${i}">
        <span class="draw-position">${i+1}</span>
        ${p?`<span class="dot" style="--c:${COLOR_META[pidColor(p)].hex}"></span>`:'<span class="draw-empty-dot"></span>'}
        <span class="draw-player">${p?playerName(p,mode):`Participante ${i<2?'A':'B'}`}</span>
        ${p?`<span class="draw-role">${pidRole(p)==='bueno'?'A':'B'}</span>`:''}
      </li>`;
    }).join('')}</ol>
  </section>`;
}
function drawAdminHTML(S,mode){
  const count=S.draw?.revealed||0;
  return `<div class="panel draw-admin"><h2>Sorteo de grupos</h2>
    <p>${S.groups?'Grupos confirmados.':count===4?'El sorteo terminó. Confirma los grupos en la pantalla pública.':S.draw?`${count} de 4 colores asignados${S.draw.spin?' · ruleta en curso':''}.`:'Realiza el sorteo en la pantalla pública.'}</p>
    <div class="rowbtns"><a class="btn" href="${drawPublicURL(mode)}" target="_blank" rel="noopener">Abrir ${S.groups?'grupos':'sorteo'} ↗</a>
      ${S.groups||S.draw?'<button class="btn ghost" onclick="resetGroupsUI()">Rehacer sorteo</button>':''}
    </div>
    ${S.groups||S.draw?`<div class="draw-admin-groups">${drawGroupHTML(S,mode,'A')}${drawGroupHTML(S,mode,'B')}</div>`:''}
  </div>`;
}
function wheelDiscHTML(colors){
  const radius=241,cx=250,cy=250,slice=360/colors.length;
  const point=angle=>[cx+radius*Math.sin(angle*Math.PI/180),cy-radius*Math.cos(angle*Math.PI/180)];
  return `<svg class="wheel-disc" viewBox="0 0 500 500" aria-hidden="true">
    ${colors.map((c,i)=>{
      const start=point(i*slice),end=point((i+1)*slice),mid=(i+.5)*slice;
      const x=cx+158*Math.sin(mid*Math.PI/180),y=cy-158*Math.cos(mid*Math.PI/180);
      return `${colors.length===1?`<circle cx="250" cy="250" r="241" fill="${COLOR_META[c].hex}"/>`:`<path d="M250 250 L${start.join(' ')} A241 241 0 ${slice>180?1:0} 1 ${end.join(' ')} Z" fill="${COLOR_META[c].hex}" stroke="#14212b" stroke-width="3"/>`}
        <text x="${x}" y="${y}" fill="${c==='amarillo'?'#17212a':'#fff'}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${mid},${x},${y})">${COLOR_META[c].label}</text>`;
    }).join('')}<circle cx="250" cy="250" r="243" fill="none" stroke="#d9d7c7" stroke-width="5"/>
  </svg>`;
}
function drawSpinProgress(elapsed,duration){
  const x=Math.max(0,Math.min(1,elapsed/duration));
  if(x===0 || x===1)return x;
  // La misma curva que la animación CSS: cubic-bezier(.12,.72,.14,1).
  let lo=0,hi=1,t=.5;
  for(let i=0;i<20;i++){
    t=(lo+hi)/2;
    const at=3*.12*(1-t)**2*t+3*.14*(1-t)*t*t+t*t*t;
    if(at<x)lo=t;else hi=t;
  }
  return 3*.72*(1-t)**2*t+3*(1-t)*t*t+t*t*t;
}
function createDrawAudio(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return {unlock(){},follow(){},stop(){}};
  let context,buffer,frame=null,owner=null;
  const bytes=fetch('assets/audio/wheel-tick.mp3').then(r=>{
    if(!r.ok)throw new Error('Audio no disponible');return r.arrayBuffer();
  }).catch(()=>null);
  function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
  function unlock(spin){
    owner=spin.startedAt;
    try{
      context ||= new Context();
      context.resume().catch(()=>{});
      if(!buffer)bytes.then(data=>data&&context.decodeAudioData(data.slice(0))).then(decoded=>{if(decoded)buffer=decoded;}).catch(()=>{});
    }catch{/* La falta de audio no impide realizar el sorteo. */}
  }
  function follow(spin,sectors){
    stop();
    if(!spin || owner!==spin.startedAt || !context)return;
    let last=Math.floor(drawSpinProgress(Date.now()-spin.startedAt,spin.durationMs)*spin.angle/(360/sectors));
    function tick(){
      const elapsed=Date.now()-spin.startedAt;
      if(elapsed>=spin.durationMs || document.hidden){stop();return;}
      const current=Math.floor(drawSpinProgress(elapsed,spin.durationMs)*spin.angle/(360/sectors));
      if(current!==last && buffer && context.state==='running'){
        const source=context.createBufferSource(),gain=context.createGain();
        source.buffer=buffer;gain.gain.value=.5;
        source.connect(gain);gain.connect(context.destination);source.start();
        source.onended=()=>{source.disconnect();gain.disconnect();};
      }
      last=current;frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  return {unlock,follow,stop};
}
function createPublicDraw(mode,refresh){
  let timer=null,observer=null,animation=null;
  const sound=createDrawAudio();
  const read=()=>getSecundaria(mode);
  const title=document.querySelector('header.top');
  const switcher=document.createElement('div');
  switcher.className='public-view-switch';switcher.setAttribute('aria-label','Vista pública');title.append(switcher);
  window.addEventListener('hashchange',refresh);
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-draw-action]')?.dataset.drawAction;
    if(!action)return;
    const state=read();
    if(action==='spin' && categoryConfigured(mode) && startDrawSpinS(state)){
      sound.unlock(state.draw.spin);saveSecundaria(state);
    }
    if(action==='confirm' && confirmDrawGroupsS(state)){
      history.replaceState(null,'',location.pathname+location.search);
      saveSecundaria(state);
    }
    if(action==='tournament'){
      history.replaceState(null,'',location.pathname+location.search);refresh();
    }
  });
  function connectTargets(){
    const stage=document.querySelector('.draw-stage'),links=document.querySelector('.draw-links'),wheel=document.querySelector('.draw-wheel-shell');
    if(!stage||!links||!wheel)return;
    const s=stage.getBoundingClientRect(),w=wheel.getBoundingClientRect();
    links.setAttribute('viewBox',`0 0 ${s.width} ${s.height}`);
    links.querySelectorAll(':scope > path').forEach(p=>p.remove());
    stage.querySelectorAll('.draw-target').forEach(row=>{
      const r=row.getBoundingClientRect(),left=row.closest('[data-draw-group]').dataset.drawGroup==='A';
      const x=(left?r.right:r.left)-s.left,y=r.top+r.height/2-s.top;
      const endX=(left?w.left:w.right)-s.left+(left?-8:8),endY=w.top+w.height/2-s.top;
      const bend=Math.max(24,Math.abs(endX-x)*.55);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x} ${y} C${x+(left?bend:-bend)} ${y}, ${endX+(left?-bend:bend)} ${endY}, ${endX} ${endY}`);
      path.setAttribute('marker-end','url(#draw-arrowhead)');links.append(path);
    });
  }
  function render(state){
    const visible=!state.groups || location.hash==='#sorteo';
    document.body.classList.toggle('draw-mode',visible);
    switcher.innerHTML=state.groups?`<a href="#sorteo" ${visible?'aria-current="page"':''}>Sorteo</a><button type="button" data-draw-action="tournament" ${!visible?'aria-current="page"':''}>Torneo</button>`:'';
    clearTimeout(timer);observer?.disconnect();animation?.cancel();
    if(!visible){sound.stop();return false;}
    const draw=validDrawS(state.draw)?state.draw:null,now=Date.now();
    const holding=!!draw?.lastSpin && now<draw.readyAt;
    const spin=draw?.spin || (holding?draw.lastSpin:null);
    const complete=!!state.groups || draw?.revealed===4 && !holding;
    const step=spin?.step ?? draw?.revealed ?? 0;
    const targets=complete?[]:DRAW_TARGETS[step];
    const colors=complete?(draw?.order||COLORS):draw?COLORS.filter(c=>!draw.order.slice(0,Math.min(step,3)).includes(c)):COLORS;
    const configured=categoryConfigured(mode),busy=!!spin;
    const destination=targets?.map(t=>`${t.role==='bueno'?'A':'B'} → grupo ${t.group==='A'?1:2}, posición ${t.position+1}`).join(' · ');
    const message=complete?'Grupos completos':holding?COLOR_META[draw.order[step]].label:['Primera salida','Segunda salida','Tercera salida'][step];
    const revealed=draw?.revealed||0;
    document.getElementById('app').innerHTML=`<section class="draw-screen" aria-label="Sorteo de grupos">
      <h2 class="draw-title">Sorteo de grupos</h2>
      <div class="draw-stage">
        <svg class="draw-links" aria-hidden="true"><defs><marker id="draw-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs></svg>
        ${drawGroupHTML(state,mode,'A',targets)}
        <div class="draw-wheel-column"><div class="draw-wheel-shell ${busy?'busy':''}">
          ${wheelDiscHTML(colors)}<span class="wheel-pointer" aria-hidden="true"></span>
          ${complete?'<div class="wheel-hub wheel-finished" aria-hidden="true">✓</div>':`<button type="button" class="wheel-hub" data-draw-action="spin" ${busy||!configured?'disabled':''} aria-label="${busy?'Ruleta en curso':'Girar ruleta'}">${busy?holding?'✓':'•••':'Girar'}</button>`}
        </div><div class="draw-message" aria-live="polite" aria-atomic="true"><h3>${message}</h3><p>${complete?'Dos A y dos B en cada grupo.':destination}</p></div></div>
        ${drawGroupHTML(state,mode,'B',targets)}
      </div>
      <div class="draw-bottom">
        <ol class="draw-history" aria-label="Orden de salida">${draw?draw.order.slice(0,revealed).map((c,i)=>`<li><span class="dot" style="--c:${COLOR_META[c].hex}"></span><span>${COLOR_META[c].label}</span><small>${i+1}</small></li>`).join(''):''}</ol>
        ${!configured?'<a class="btn ghost" href="config.html">Completar participantes</a>':complete?`<button class="btn" data-draw-action="${state.groups?'tournament':'confirm'}">${state.groups?'Ver torneo':'Confirmar grupos'} →</button>`:''}
      </div></section>`;
    const disc=document.querySelector('.wheel-disc');
    sound.follow(draw?.spin,colors.length);
    if(spin){
      const elapsed=now-spin.startedAt;
      if(elapsed>=spin.durationMs || window.matchMedia('(prefers-reduced-motion: reduce)').matches)disc.style.transform=`rotate(${spin.angle}deg)`;
      else animation=disc.animate([{transform:'rotate(0deg)'},{transform:`rotate(${spin.angle}deg)`}],{duration:spin.durationMs,delay:-Math.max(0,elapsed),easing:'cubic-bezier(.12,.72,.14,1)',fill:'forwards'});
      const due=draw.spin?spin.startedAt+spin.durationMs:draw.readyAt;
      timer=setTimeout(()=>{
        const fresh=read();
        if(settleDrawSpinS(fresh))saveSecundaria(fresh);else refresh();
      },Math.max(0,due-Date.now())+20);
    }
    observer=new ResizeObserver(connectTargets);observer.observe(document.querySelector('.draw-stage'));
    requestAnimationFrame(connectTargets);
    return true;
  }
  return {render};
}
