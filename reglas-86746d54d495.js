/* =====================================================================
   TORNEO DE AJEDREZ — MODELO COMPARTIDO
   Compartido por configuración y los paneles de las tres categorías.
   Persiste en localStorage y se sincroniza en vivo entre pestañas del
   mismo navegador (misma máquina) vía el evento 'storage' + un poll de
   respaldo, para que publico.html se actualice sola.
   ===================================================================== */

/* ============================= DATOS BASE ============================= */
const ARMAGEDDON_MAX_SECONDS = 15 * 60;
const COLORS = ['rojo','azul','verde','amarillo'];
const COLOR_META = {
  rojo:     {label:'Rojo',     hex:'#bd4d42'},
  azul:     {label:'Azul',     hex:'#4178b0'},
  verde:    {label:'Verde',    hex:'#36815a'},
  amarillo: {label:'Amarillo', hex:'#d7aa36'},
};
const PRIMARY_ROUND_MS = 20 * 60 * 1000;
const PLACE_POINTS_PRIMARIA = {1:20, 2:12, 3:4, 4:4, 5:2, 6:2, 7:1, 8:1};

// Secundaria: patrón de blancas/negras para las 6 partidas de la fase de grupos ([blancas, negras] por slot).
// Los participantes A (Bx internos) juegan 2 con negras y 1 con blancas; los B (Mx), al revés.
// A es quien cursa mayor grado; a igual grado, quien tiene mayor edad. No indica habilidad.
// Reparto de piezas fijo por pareja (igual que antes). El ORDEN en que se listan estas 6 parejas
// está pensado para jugarse en 3 rondas de 2 tableros en paralelo: cada ronda enfrenta a los 4
// jugadores del grupo a la vez (0 y 1 no comparten jugador, ídem 2-3 y 4-5), así ambos tableros
// arrancan y terminan juntos y nadie se queda esperando su siguiente partida.
const PAIR_TEMPLATE = [ ['B1','B2'], ['M1','M2'], ['M1','B1'], ['M2','B2'], ['M2','B1'], ['B2','M1'] ];
const PLACE_POINTS_SECUNDARIA = {1:20, 2:12, 3:4, 4:4, 5:2, 6:2, 7:1, 8:1};

/* ============================= ALMACENAMIENTO ============================= */
const MODALITIES = [
  {id:'primaria', label:'Primaria', grades:'1.º a 6.º de primaria', factor:1},
  {id:'secundaria_baja', label:'Secundaria baja', grades:'1.º y 2.º de secundaria', factor:1},
  {id:'secundaria_alta', label:'Secundaria alta', grades:'3.º, 4.º y 5.º de secundaria', factor:1},
];
const SECONDARY_MODE = new URLSearchParams(window.location.search).get('categoria')==='alta'
  ? 'secundaria_alta' : 'secundaria_baja';
function modalityMeta(mode){ return MODALITIES.find(m=>m.id===mode); }
const LS_KEYS = {
  setup: 'ajedrez_setup_v2',
  primaria: 'ajedrez_primaria_grupos_v3',
  secundaria_baja: 'ajedrez_secundaria_baja_v2',
  secundaria_alta: 'ajedrez_secundaria_alta_v2',
};
function secondaryNav(page){
  return MODALITIES.filter(m=>m.id!=='primaria').map(m=>
    `<a class="category-link ${m.id===SECONDARY_MODE?'selected':''}" href="${page}?categoria=${m.id==='secundaria_alta'?'alta':'baja'}" ${m.id===SECONDARY_MODE?'aria-current="page"':''}>${m.label}</a>`
  ).join('');
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
// Se conservan los decimales: el ajuste de reparto y la escala olímpica son factores separados.
function scaledPoints(points, mode){ return Number((points*modalityWeight(mode)).toFixed(10)); }
function formatPoints(points){ return Number(points).toLocaleString('es-PE', {maximumFractionDigits:10}); }

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){ console.error('Error leyendo', key, e); return fallback; }
}
function saveJSON(key, data){
  localStorage.setItem(key, JSON.stringify(data));
  // El evento 'storage' del navegador NO se dispara en la misma pestaña que hizo el cambio,
  // así que avisamos aquí mismo para que la propia página también pueda reaccionar si lo necesita.
  window.dispatchEvent(new CustomEvent('torneo:local-update', {detail:{key}}));
}

function freshDelegation(){
  return {
    players: Object.fromEntries(COLORS.map(c=>[c,{bueno:'',malo:''}])),
  };
}
function freshSetup(){
  return {
    ...Object.fromEntries(MODALITIES.map(m=>[m.id,freshDelegation()])),
    conduct: Object.fromEntries(COLORS.map(c=>[c,0])),
    weights: Object.fromEntries(MODALITIES.map(m=>[m.id,1])),
    locked:false, savedAt:null,
  };
}
function getSetup(){
  const s = loadJSON(LS_KEYS.setup, null);
  const fresh = freshSetup();
  if(!s) return fresh;
  return {
    ...fresh, ...s,
    ...Object.fromEntries(MODALITIES.map(m=>[m.id,{
      players:{...fresh[m.id].players,...((s[m.id]&&s[m.id].players)||{})},
    }])),
    conduct:{...fresh.conduct,...(s.conduct||{})},
    weights:{...fresh.weights,...(s.weights||{})},
  };
}

function categoryConfigured(mode, setup=getSetup()){
  return COLORS.every(c=>['bueno','malo'].every(role=>String(setup[mode]?.players?.[c]?.[role]||'').trim()));
}
function saveSetup(setup){
  setup.savedAt = new Date().toISOString();
  saveJSON(LS_KEYS.setup, setup);
}

// Puntaje = puntos por puesto × ajuste de reparto × escala olímpica configurable.
// Las tres categorías reparten 46 puntos base; solo se aplica su escala olímpica.
function modalityWeight(mode){
  const setup = getSetup();
  const w = Number(setup.weights[mode]);
  const base = Number.isFinite(w) && w>=0 ? w : 1;
  return base*modalityMeta(mode).factor;
}

function freshPrimaria(){ return freshSecundaria('primaria'); }
function getPrimaria(){ return getSecundaria('primaria'); }
function savePrimaria(P){ saveSecundaria(P); }

// El plazo absoluto conserva el tiempo al recargar o cambiar de pestaña.
function primaryTimer(S, round=S.activeRound||0){
  return S.roundTimers?.[round] || {remainingMs:PRIMARY_ROUND_MS, deadline:null, started:false};
}
function primaryRemaining(S, round=S.activeRound||0, now=Date.now()){
  const timer=primaryTimer(S,round);
  return Math.max(0,timer.deadline==null ? timer.remainingMs : timer.deadline-now);
}
function setPrimaryTimer(S, action, round=S.activeRound||0, now=Date.now()){
  if(!Number.isInteger(round) || round<0 || round>2) return false;
  S.roundTimers ||= {};
  const timer={...primaryTimer(S,round)};
  if(action==='reset') S.roundTimers[round]={remainingMs:PRIMARY_ROUND_MS,deadline:null,started:false};
  else if(action==='pause') S.roundTimers[round]={...timer,remainingMs:primaryRemaining(S,round,now),deadline:null};
  else if(action==='start'){
    // Una sola ronda puede estar corriendo. No reiniciar un reloj activo.
    if(timer.deadline!=null || primaryRemaining(S,round,now)<=0 || Object.keys(S.roundTimers).some(r=>Number(r)!==round && S.roundTimers[r].deadline>now)) return false;
    S.roundTimers[round]={remainingMs:timer.remainingMs,deadline:now+timer.remainingMs,started:true};
  } else return false;
  S.activeRound=round;
  return true;
}
function primaryMaterialResult(white,black){ return Math.abs(white-black)>1 ? (white>black?'white':'black') : 'draw'; }

function freshSecundaria(mode=SECONDARY_MODE){
  return {
    category: mode,
    seedOrder: ['','','',''],
    groups: null,        // {A:[{slot,pid}], B:[{slot,pid}]}
    groupGames: null,    // {A:[{white,black,result}], B:[...]}
    manualOverride: {},  // pid -> numero (mayor = gana desempate manual)
    final: null,
  };
}
function getSecundaria(mode=SECONDARY_MODE){
  const S=loadJSON(LS_KEYS[mode],null) || freshSecundaria(mode);
  autoAdvanceS(S);
  return S;
}
function saveSecundaria(S){
  saveJSON(LS_KEYS[S.category], S);
}

/* Suscripción a cambios en vivo (para que las páginas se refresquen solas). */
function onLiveUpdate(cb){
  const keys=Object.values(LS_KEYS);
  window.addEventListener('storage', e=>{ if(keys.includes(e.key)) cb(e.key); });
  window.addEventListener('torneo:local-update', e=>cb(e.detail.key));
  const previous=Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)]));
  setInterval(()=>keys.forEach(key=>{
    const value=localStorage.getItem(key);
    if(value!==previous[key]){ previous[key]=value; cb(key); }
  }),1500);
}

/* ============================= HELPERS DE JUGADORES ============================= */
function pid(color, role){ return color+':'+role; }
function pidColor(p){ return p.split(':')[0]; }
function pidRole(p){ return p.split(':')[1]; }
function playerName(p, mode='primaria'){
  const setup = getSetup();
  const bucket = setup[mode] || setup.primaria;
  const c = pidColor(p), r = pidRole(p);
  const n = bucket.players[c] && bucket.players[c][r];
  if(n && n.trim()) return escapeHTML(n.trim());
  return `${COLOR_META[c].label} — participante ${r==='bueno'?'A':'B'}`;
}
function penaltyOf(p, mode='primaria'){
  // La conducta es del color, no de la modalidad: mode se ignora aquí y solo se conserva
  // en la firma para no tener que tocar cada llamada existente (playerName/chip sí lo usan).
  const setup = getSetup();
  return Number(setup.conduct[pidColor(p)])||0;
}
function chip(p, mode='primaria'){
  const c = pidColor(p);
  return `<span class="chip"><span class="dot" style="--c:${COLOR_META[c].hex}"></span>${playerName(p, mode)}</span>`;
}

function shuffleSeedArr(){
  const arr = [...COLORS];
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function ensureArmageddon(match, maxSeconds=ARMAGEDDON_MAX_SECONDS){
  maxSeconds = Math.min(ARMAGEDDON_MAX_SECONDS, maxSeconds);
  // Al cambiar el tope, las pujas pendientes se repiten; un ganador registrado se conserva.
  if(!match.armageddon || (!match.armageddon.winnerPid && match.armageddon.maxSeconds!==maxSeconds)) match.armageddon = {maxSeconds, bid1:null, bid2:null, attempts:0, resolvedColors:null, winnerPid:null};
  return match.armageddon;
}
function registerArmageddonBid(match, maxSeconds, n1, n2){
  const A = ensureArmageddon(match, maxSeconds);
  n1 = Math.max(0, Math.min(A.maxSeconds, Math.floor(Number(n1)||0)));
  n2 = Math.max(0, Math.min(A.maxSeconds, Math.floor(Number(n2)||0)));
  if(n1===n2){ A.attempts++; A.bid1=n1; A.bid2=n2; return {tie:true}; }
  if(n1<n2) A.resolvedColors = {blackPid:match.p1, whitePid:match.p2, blackSeconds:n1};
  else A.resolvedColors = {blackPid:match.p2, whitePid:match.p1, blackSeconds:n2};
  return {tie:false};
}
function randomArmageddonColors(match){
  const A = match.armageddon;
  const sharedTime = A.bid1 ?? Math.floor(A.maxSeconds/2);
  if(Math.random()<0.5) A.resolvedColors = {blackPid:match.p1, whitePid:match.p2, blackSeconds: sharedTime||60};
  else A.resolvedColors = {blackPid:match.p2, whitePid:match.p1, blackSeconds: sharedTime||60};
}
function setArmageddonWinner(match, winnerPid){
  match.armageddon.winnerPid = winnerPid;
}

/* ============================= SECUNDARIA: FASE DE GRUPOS ============================= */
function seedCompleteS(S){
  return S.seedOrder.every(c=>c) && new Set(S.seedOrder).size===4;
}
function confirmGroupsS(S){
  if(!seedCompleteS(S)) return false;
  const [c1,c2,c3,c4] = S.seedOrder;
  // Grupo A: participantes A de c1,c2 y B de c3,c4. Grupo B: reparto inverso.
  const groupA = [
    {slot:'B1', pid: pid(c1,'bueno')},
    {slot:'B2', pid: pid(c2,'bueno')},
    {slot:'M1', pid: pid(c3,'malo')},
    {slot:'M2', pid: pid(c4,'malo')},
  ];
  const groupB = [
    {slot:'B1', pid: pid(c3,'bueno')},
    {slot:'B2', pid: pid(c4,'bueno')},
    {slot:'M1', pid: pid(c1,'malo')},
    {slot:'M2', pid: pid(c2,'malo')},
  ];
  S.groups = {A:groupA, B:groupB};
  const buildGames = (g) => PAIR_TEMPLATE.map(([w,b])=>({
    white: g.find(x=>x.slot===w).pid,
    black: g.find(x=>x.slot===b).pid,
    result: null,
  }));
  S.groupGames = { A: buildGames(groupA), B: buildGames(groupB) };
  S.manualOverride = {};
  S.final = null;
  return true;
}

/* ---- Desempate genérico (compartido entre grupos y cruces 5º-8º) ---- */
function clusterBy(arr, keyFn){
  const groups = new Map();
  arr.forEach(x=>{
    const k = keyFn(x);
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  });
  return [...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([,v])=>v);
}
function rankPlayers(pids, games, pointsOf, sbOf, winsOf, conductOf, overrideOf, unresolved=[]){
  const byPoints = clusterBy(pids, pointsOf);
  let out = [];
  for(const cluster of byPoints) out.push(...resolveCluster(cluster));
  return out;

  function resolveCluster(cluster){
    if(cluster.length<=1) return cluster;
    const mini = {}; cluster.forEach(p=>mini[p]=0);
    for(const g of games){
      if(!g.result) continue;
      if(cluster.includes(g.white) && cluster.includes(g.black)){
        if(g.result==='white') mini[g.white]+=2;
        else if(g.result==='black') mini[g.black]+=2;
        else { mini[g.white]+=1; mini[g.black]+=1; }
      }
    }
    const subs = clusterBy(cluster, p=>mini[p]);
    let res=[];
    for(const sub of subs){
      if(sub.length===1){ res.push(sub[0]); continue; }
      if(sub.length===2){
        const g = games.find(g=> (g.white===sub[0]&&g.black===sub[1]) || (g.white===sub[1]&&g.black===sub[0]));
        if(g && g.result){
          if(g.result==='draw'){
            res.push(g.black, sub.find(p=>p!==g.black));
          } else {
            const w = g.result==='white'?g.white:g.black;
            res.push(w, sub.find(p=>p!==w));
          }
        } else {
          res.push(...bySB(sub));
        }
        continue;
      }
      res.push(...bySB(sub));
    }
    return res;
  }
  function bySB(sub){
    let res=[];
    for(const c of clusterBy(sub, sbOf)){
      if(c.length===1){res.push(c[0]); continue;}
      for(const c2 of clusterBy(c, winsOf)){
        if(c2.length===1){res.push(c2[0]); continue;}
        for(const c3 of clusterBy(c2, conductOf)){
          if(c3.length===1){res.push(c3[0]); continue;}
          for(const roleCluster of clusterBy(c3, p=>pidRole(p)==='malo'?1:0)) for(const c4 of clusterBy(roleCluster, overrideOf)){
            if(c4.length>1) unresolved.push(c4);
            res.push(...c4);
          }
        }
      }
    }
    return res;
  }
}
function groupStatsS(S, g){
  const gps = S.groups[g];
  const pids = gps.map(x=>x.pid);
  const games = S.groupGames[g];
  const points={}, wins={};
  pids.forEach(p=>{points[p]=0; wins[p]=0;});
  for(const gm of games){
    if(!gm.result) continue;
    if(gm.result==='white'){ points[gm.white]+=2; wins[gm.white]++; }
    else if(gm.result==='black'){ points[gm.black]+=2; wins[gm.black]++; }
    else { points[gm.white]+=1; points[gm.black]+=1; }
  }
  const sb={};
  pids.forEach(p=>{
    let s=0;
    for(const gm of games){
      if(!gm.result) continue;
      if(gm.white===p){
        if(gm.result==='white') s+=points[gm.black];
        else if(gm.result==='draw') s+=points[gm.black]*0.5;
      } else if(gm.black===p){
        if(gm.result==='black') s+=points[gm.white];
        else if(gm.result==='draw') s+=points[gm.white]*0.5;
      }
    }
    sb[p]=s;
  });
  return {pids, games, points, wins, sb};
}
function overrideOfS(S, p){ return S.manualOverride[p]||0; }
// Para el desempate: menos penalizaciones = mejor, por eso se usa el valor negado como "puntaje" a maximizar.
function conductRankKeyS(p){ return -penaltyOf(p); }
function groupRankingS(S, g){
  const st=groupStatsS(S,g), unresolved=[];
  const order=rankPlayers(st.pids,st.games,p=>st.points[p],p=>st.sb[p],p=>st.wins[p],conductRankKeyS,p=>overrideOfS(S,p),unresolved);
  return {order,unresolved};
}
function groupOrderS(S,g){ return groupRankingS(S,g).order; }
function groupCompleteS(S,g){ return !!S.groupGames && S.groupGames[g].every(gm=>gm.result); }
function unresolvedPairsS(S,order,g){
  return groupRankingS(S,g).unresolved.flatMap(tied=>tied.slice(1).map((p,i)=>[tied[i],p]));
}
function groupLeaderS(S,g){
  if(!S.groups || !groupCompleteS(S,g)) return null;
  const {order,unresolved}=groupRankingS(S,g);
  return unresolved.some(tied=>tied.includes(order[0])) ? null : order[0];
}
function setOverrideWinnerS(S, p, otherP){
  const cur = Math.max(overrideOfS(S,p), overrideOfS(S,otherP));
  S.manualOverride[p] = cur+1;
}
function combinedStatsS(S){
  const a = groupStatsS(S,'A'), b = groupStatsS(S,'B');
  return {
    points:{...a.points,...b.points},
    sb:{...a.sb,...b.sb},
    wins:{...a.wins,...b.wins},
  };
}

/* ---- Explicación de desempate (para mostrar en arbitro/publico SOLO cuando de verdad decide algo) ----
   Cascada real (ver rankPlayers): puntos -> enfrentamiento directo (si el empate, tras el mini-torneo
   entre los empatados, se reduce a exactamente 2 jugadores que ya se enfrentaron) -> SB -> victorias
   -> conducta -> B o B efectivo. Devuelve null si a y b no están empatados en puntos
   (no hace falta desempatar) o si están en empate total tras todos los criterios. */
function tieBreakLabelS(S, g, a, b){
  const st = groupStatsS(S, g);
  if(st.points[a] !== st.points[b]) return null;
  const gm = st.games.find(x => (x.white===a && x.black===b) || (x.white===b && x.black===a));
  if(gm && gm.result) return 'enfrentamiento directo';
  if(st.sb[a] !== st.sb[b]) return 'SB (Sonneborn-Berger)';
  if(st.wins[a] !== st.wins[b]) return 'victorias';
  if(penaltyOf(a) !== penaltyOf(b)) return 'conducta';
  if(pidRole(a)!==pidRole(b)) return 'prioridad B';
  if(overrideOfS(S,a) !== overrideOfS(S,b)) return 'B efectivo (grado y nacimiento)';
  return 'empate total (sin desempate)';
}
// Misma idea para comparar jugadores de grupos distintos (5º-8º puesto): no hay partidos entre
// ellos, así que el enfrentamiento directo nunca aplica aquí.
function tieBreakLabelCombinedS(S, a, b){
  const cs = combinedStatsS(S);
  if(cs.points[a] !== cs.points[b]) return null;
  if(cs.sb[a] !== cs.sb[b]) return 'SB (Sonneborn-Berger)';
  if(cs.wins[a] !== cs.wins[b]) return 'victorias';
  if(penaltyOf(a) !== penaltyOf(b)) return 'conducta';
  if(pidRole(a)!==pidRole(b)) return 'prioridad B';
  if(overrideOfS(S,a) !== overrideOfS(S,b)) return 'B efectivo (grado y nacimiento)';
  return 'empate total (sin desempate)';
}

/* ---- Motor de partidos de secundaria (final directa: colorChoice + Armagedón) ---- */
function gameColorsS(match, idx){
  const parity = idx%2===0;
  const p1White = parity ? (match.colorChoice==='p1-white') : (match.colorChoice==='p1-black');
  return p1White? {white:match.p1, black:match.p2} : {white:match.p2, black:match.p1};
}
function matchTallyS(match){
  let s1=0,s2=0, played=0;
  match.games.forEach((gm,i)=>{
    if(!gm.result) return;
    played++;
    const {white} = gameColorsS(match, i);
    const val = gm.result==='draw'?0.5:1;
    if(gm.result==='draw'){ s1+=0.5; s2+=0.5; }
    else if((gm.result==='white'&&white===match.p1)||(gm.result==='black'&&white!==match.p1)) s1+=val;
    else s2+=val;
  });
  return {s1,s2,played};
}
function matchWinnerS(match){
  if(!match.colorChoice) return null;
  const t = matchTallyS(match);
  if(t.played < match.games.length) return null;
  if(t.s1>t.s2) return match.p1;
  if(t.s2>t.s1) return match.p2;
  if(match.armageddon && match.armageddon.winnerPid) return match.armageddon.winnerPid;
  return null;
}
function needsArmageddonS(match){
  if(!match.colorChoice) return false;
  const t = matchTallyS(match);
  return t.played===match.games.length && t.s1===t.s2;
}
// Comparación entre líderes: puntos, SB, victorias, conducta y B efectivo. Sin enfrentamiento directo.
function finalColorRankingS(S){
  const pids=[groupLeaderS(S,'A'),groupLeaderS(S,'B')];
  if(pids.some(p=>!p)) return {order:[],unresolved:[]};
  const cs=combinedStatsS(S), unresolved=[];
  const order=rankPlayers(pids,[],p=>cs.points[p],p=>cs.sb[p],p=>cs.wins[p],conductRankKeyS,p=>S.colorChoiceOverride?.[p]||0,unresolved);
  return {order,unresolved};
}
function finalColorChooserS(S){
  const ranking=finalColorRankingS(S);
  return ranking.unresolved.length ? null : ranking.order[0]||null;
}
function placementLabelS(place){ return place>=3 ? `${place}.º-${place+1}.º` : `${place}.º`; }
function placementTiersS(S){
  const places=computePlacementsS(S);
  if(!places) return [];
  return [1,2,3,5,7].map(place=>({place,players:Object.keys(places).filter(p=>places[p]===place)})).filter(t=>t.players.length);
}
function generateFinalS(S){
  const p1=groupLeaderS(S,'A'), p2=groupLeaderS(S,'B');
  if(!p1 || !p2) return false;
  S.final={p1,p2,colorChoice:null,games:[{result:null},{result:null}],armageddon:null};
  return true;
}
// Al corregir grupos, no se conservan resultados de una final con otros participantes.
function autoAdvanceS(S){
  if(!S.groups){ S.final=null; return; }
  const p1=groupLeaderS(S,'A'), p2=groupLeaderS(S,'B');
  if(!p1 || !p2){ S.final=null; return; }
  if(!S.final || S.final.p1!==p1 || S.final.p2!==p2){ S.colorChoiceOverride={}; generateFinalS(S); }
}
function provisionalFinalS(S){
  if(S.final) return S.final;
  if(!S.groups) return null;
  return {provisional:true,p1:groupLeaderS(S,'A'),p2:groupLeaderS(S,'B')};
}

/* ============================= SECUNDARIA: PUNTOS OLIMPIADA ============================= */
function computePlacementsS(S){
  if(!S.groups || !groupCompleteS(S,'A') || !groupCompleteS(S,'B')) return null;
  const oa=groupOrderS(S,'A'), ob=groupOrderS(S,'B');
  const placements={};
  [1,2,3].forEach((position,i)=>[oa[position],ob[position]].forEach(p=>placements[p]=3+2*i));
  const a=groupLeaderS(S,'A'), b=groupLeaderS(S,'B');
  if(!a || !b) return null;
  if(S.final){
    const winner=matchWinnerS(S.final);
    if(winner){ placements[winner]=1; placements[winner===a?b:a]=2; }
    else { placements[a]=2; placements[b]=2; }
  } else { placements[a]=2; placements[b]=2; }
  return placements;
}

