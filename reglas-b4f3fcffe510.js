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
// Config. de esta versión de primaria: qué rondas se juegan a 2 partidas (alternando colores) vs. partido único.
const ROUND_IS_DOUBLE = { qf:false, sf:false, final:true };
const PRIMARIA_VARIANT_NOTE = "Cuartos y semifinales se juegan a partido único: empate → revancha con colores invertidos → si persiste, decide la conducta (menos penalizaciones) → si también empatan ahí, avanza quien inició con blancas. La final es un caso especial con árbitro dedicado: dos partidas (una con cada color) y Armagedón directo si hay empate 1–1.";
const PLACE_POINTS_PRIMARIA = {1:8, 2:4, 3:2, 4:2, 5:1, 6:1, 7:1, 8:1};

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
  {id:'primaria', label:'Primaria', grades:'1.º a 6.º de primaria', factor:2.3},
  {id:'secundaria_baja', label:'Secundaria baja', grades:'1.º y 2.º de secundaria', factor:1},
  {id:'secundaria_alta', label:'Secundaria alta', grades:'3.º, 4.º y 5.º de secundaria', factor:1},
];
const SECONDARY_MODE = new URLSearchParams(window.location.search).get('categoria')==='alta'
  ? 'secundaria_alta' : 'secundaria_baja';
function modalityMeta(mode){ return MODALITIES.find(m=>m.id===mode); }
const LS_KEYS = {
  setup: 'ajedrez_setup_v2',
  primaria: 'ajedrez_primaria_v2',
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

function saveSetup(setup){
  setup.savedAt = new Date().toISOString();
  saveJSON(LS_KEYS.setup, setup);
}

// Puntaje = puntos por puesto × ajuste de reparto × escala olímpica configurable.
// Primaria reparte 20 puntos base; cada secundaria, 46. Por eso el ajuste es 46/20 = 2.3.
function modalityWeight(mode){
  const setup = getSetup();
  const w = Number(setup.weights[mode]);
  const base = Number.isFinite(w) && w>=0 ? w : 1;
  return base*modalityMeta(mode).factor;
}

function freshPrimaria(){
  return { seedOrder:['','','',''], bracket:null, matches:null };
}
function getPrimaria(){
  const P=loadJSON(LS_KEYS.primaria,null)||freshPrimaria();
  if(P.matches){
    const matches=[...Object.values(P.matches.QF),...Object.values(P.matches.SF),P.matches.FINAL].filter(Boolean);
    for(const m of matches){
      if(m.firstColorRule===2) continue;
      if(pidRole(m.p1)!==pidRole(m.p2)){
        const newWhite=pidRole(m.p1)==='malo';
        if(newWhite!==m.whiteFirstIsP1) m.games.forEach(g=>{g.result=({white:'black',black:'white','stalemate-white':'stalemate-black','stalemate-black':'stalemate-white'})[g.result]||g.result;});
        m.whiteFirstIsP1=newWhite;
      }else if(!m.games.some(g=>g.result)) m.whiteFirstIsP1=null;
      m.firstColorRule=2;
    }
  }
  return P;
}
function savePrimaria(P){
  saveJSON(LS_KEYS.primaria, P);
}

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

/* ============================= PRIMARIA: MOTOR DE LLAVES ============================= */
function seedCompleteP(P){
  return P.seedOrder.every(c=>c) && new Set(P.seedOrder).size===4;
}
function shuffleSeedArr(){
  const arr = [...COLORS];
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function mkMatch(P, pA, pB, isDouble, roundType){
  // A/B: B empieza con blancas. Mismo rol: el árbitro indica menor grado/edad.
  const whiteFirstIsP1=pidRole(pA)!==pidRole(pB) ? pidRole(pA)==='malo' : null;
  return {
    p1: pA, p2: pB,
    whiteFirstIsP1, firstColorRule:2,
    roundType, // 'qf' | 'sf' | 'final' — determina la cascada de desempate
    games: isDouble ? [{result:null},{result:null}] : [{result:null}],
    tiebreakWinner: null, // último recurso en cuartos/semis: empate también en conducta → criterio del árbitro
    armageddon: null,     // solo se usa en la final, tras empate en dos partidas
  };
}
function confirmBracket(P){
  if(!seedCompleteP(P)) return false;
  const [c1,c2,c3,c4] = P.seedOrder;
  const half1 = [
    {slot:'A1', pid: pid(c1,'bueno')},
    {slot:'A2', pid: pid(c2,'bueno')},
    {slot:'B1', pid: pid(c3,'malo')},
    {slot:'B2', pid: pid(c4,'malo')},
  ];
  const half2 = [
    {slot:'A1', pid: pid(c3,'bueno')},
    {slot:'A2', pid: pid(c4,'bueno')},
    {slot:'B1', pid: pid(c1,'malo')},
    {slot:'B2', pid: pid(c2,'malo')},
  ];
  P.bracket = {half1, half2};
  const find = (half,slot) => half.find(x=>x.slot===slot).pid;
  P.matches = {
    QF: {
      h1a: mkMatch(P, find(half1,'A1'), find(half1,'B1'), ROUND_IS_DOUBLE.qf, 'qf'),
      h1b: mkMatch(P, find(half1,'A2'), find(half1,'B2'), ROUND_IS_DOUBLE.qf, 'qf'),
      h2a: mkMatch(P, find(half2,'A1'), find(half2,'B1'), ROUND_IS_DOUBLE.qf, 'qf'),
      h2b: mkMatch(P, find(half2,'A2'), find(half2,'B2'), ROUND_IS_DOUBLE.qf, 'qf'),
    },
    SF: { h1:null, h2:null },
    FINAL: null,
  };
  return true;
}
function generateSF(P, half){
  const M = P.matches;
  const qfA = half==='h1'? M.QF.h1a : M.QF.h2a;
  const qfB = half==='h1'? M.QF.h1b : M.QF.h2b;
  const wa = pMatchWinner(qfA), wb = pMatchWinner(qfB);
  if(!wa||!wb) return false;
  M.SF[half] = mkMatch(P, wa, wb, ROUND_IS_DOUBLE.sf, 'sf');
  return true;
}
function generateFinalP(P){
  const M = P.matches;
  const w1 = M.SF.h1 && pMatchWinner(M.SF.h1), w2 = M.SF.h2 && pMatchWinner(M.SF.h2);
  if(!w1||!w2) return false;
  M.FINAL = mkMatch(P, w1, w2, ROUND_IS_DOUBLE.final, 'final');
  return true;
}
// Genera automáticamente semis/final en cuanto ambos lados estén listos. Llamar tras cada resultado.
function autoAdvance(P){
  if(!P.matches) return;
  const M = P.matches;
  if(!M.SF.h1) generateSF(P,'h1');
  if(!M.SF.h2) generateSF(P,'h2');
  if(!M.FINAL) generateFinalP(P);
}
// Slot provisional: cuando la siguiente ronda todavía no existe como partido real, pero uno (o los
// dos) de sus jugadores ya se conoce. Devuelve null si ninguno de los dos se conoce todavía.
function pProvisionalSF(P, half){
  const M = P.matches;
  if(M.SF[half]) return M.SF[half];
  const qfA = half==='h1'? M.QF.h1a : M.QF.h2a;
  const qfB = half==='h1'? M.QF.h1b : M.QF.h2b;
  const wa = pMatchWinner(qfA), wb = pMatchWinner(qfB);
  if(!wa && !wb) return null;
  return { provisional:true, p1:wa, p2:wb };
}
function pProvisionalFinal(P){
  const M = P.matches;
  if(M.FINAL) return M.FINAL;
  const w1 = M.SF.h1 ? pMatchWinner(M.SF.h1) : null;
  const w2 = M.SF.h2 ? pMatchWinner(M.SF.h2) : null;
  if(!w1 && !w2) return null;
  return { provisional:true, p1:w1, p2:w2 };
}
function pGameColors(match, idx){
  const whiteIsP1 = (idx%2===0) ? match.whiteFirstIsP1 : !match.whiteFirstIsP1;
  return whiteIsP1 ? {white:match.p1, black:match.p2} : {white:match.p2, black:match.p1};
}
function pMatchTally(match){
  let s1=0,s2=0,played=0;
  match.games.forEach((gm,i)=>{
    if(!gm.result) return;
    played++;
    const result=gm.result==='stalemate-white' ? (match.roundType==='final'?'draw':'black')
      : gm.result==='stalemate-black' ? (match.roundType==='final'?'draw':'white') : gm.result;
    const {white,black} = pGameColors(match,i);
    if(result==='draw'){ s1+=0.5; s2+=0.5; return; }
    const winner = result==='white' ? white : black;
    if(winner===match.p1) s1+=1; else s2+=1;
  });
  return {s1,s2,played};
}
function pConductWinner(match){
  // Desempate de conducta (solo cuartos/semis): menos penalizaciones avanza. Empate en conducta → null.
  const pen1 = penaltyOf(match.p1), pen2 = penaltyOf(match.p2);
  if(pen1 < pen2) return match.p1;
  if(pen2 < pen1) return match.p2;
  return null;
}
function pMatchWinner(match){
  if(!match) return null;
  const t = pMatchTally(match);
  if(t.played < match.games.length) return null;
  if(t.s1>t.s2) return match.p1;
  if(t.s2>t.s1) return match.p2;
  // Empate exacto en el marcador de las partidas ya jugadas.
  if(match.roundType==='final'){
    return (match.armageddon && match.armageddon.winnerPid) || null; // decide el Armagedón
  }
  if(match.games.length < 2) return null; // falta la revancha con colores invertidos
  const cw = pConductWinner(match);
  if(cw) return cw; // decide la conducta (menos penalizaciones)
  return match.whiteFirstIsP1==null ? null : pGameColors(match,0).white; // empate también en conducta: avanza quien empezó con blancas
}
function pNeedsRematch(match){
  if(match.roundType==='final') return false;
  const t = pMatchTally(match);
  return match.games.length===1 && t.played===1 && t.s1===t.s2;
}
function pFinalNeedsArmageddon(match){
  if(match.roundType!=='final') return false;
  const t = pMatchTally(match);
  return match.games.length===2 && t.played===2 && t.s1===t.s2 && !pMatchWinner(match);
}

/* ---- Mutadores de partido (usados por arbitro.html; operan directo sobre el objeto match) ---- */
function setGameResult(match, idx, result){
  match.games[idx].result = result || null;
}
function pushRematchGame(match){
  match.games.push({result:null});
}

function setRefereeWinner(match, winnerPid){
  match.tiebreakWinner = winnerPid;
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

/* ============================= PRIMARIA: PUNTOS OLIMPIADA ============================= */
function computePlacementsPrimaria(P){
  const M = P.matches;
  if(!M) return null;
  const placements = {};
  [['h1a',M.QF.h1a],['h1b',M.QF.h1b],['h2a',M.QF.h2a],['h2b',M.QF.h2b]].forEach(([k,m])=>{
    const w = pMatchWinner(m);
    if(w) placements[w===m.p1?m.p2:m.p1]=5; // 5º-8º comparten valor de puntos
  });
  ['h1','h2'].forEach(h=>{
    const m = M.SF[h];
    if(m){
      const w = pMatchWinner(m);
      if(w) placements[w===m.p1?m.p2:m.p1]=3; // 3º-4º comparten valor de puntos
    }
  });
  if(M.FINAL){
    const w = pMatchWinner(M.FINAL);
    if(w){
      placements[w]=1;
      placements[w===M.FINAL.p1?M.FINAL.p2:M.FINAL.p1]=2;
    } else {
      placements[M.FINAL.p1]=2; placements[M.FINAL.p2]=2; // provisional
    }
  } else {
    const w1=M.SF.h1?pMatchWinner(M.SF.h1):null, w2=M.SF.h2?pMatchWinner(M.SF.h2):null;
    if(w1) placements[w1]=2; if(w2) placements[w2]=2; // provisional
  }
  return placements;
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
          for(const c4 of clusterBy(c3, overrideOf)){
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
   -> conducta -> desempate manual del árbitro. Devuelve null si a y b no están empatados en puntos
   (no hace falta desempatar) o si están en empate total tras todos los criterios. */
function tieBreakLabelS(S, g, a, b){
  const st = groupStatsS(S, g);
  if(st.points[a] !== st.points[b]) return null;
  const gm = st.games.find(x => (x.white===a && x.black===b) || (x.white===b && x.black===a));
  if(gm && gm.result) return 'enfrentamiento directo';
  if(st.sb[a] !== st.sb[b]) return 'SB (Sonneborn-Berger)';
  if(st.wins[a] !== st.wins[b]) return 'victorias';
  if(penaltyOf(a) !== penaltyOf(b)) return 'conducta';
  if(overrideOfS(S,a) !== overrideOfS(S,b)) return 'desempate manual del árbitro';
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
  if(overrideOfS(S,a) !== overrideOfS(S,b)) return 'desempate manual del árbitro';
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
// Comparación entre líderes: puntos, SB, victorias, conducta y árbitro. Sin enfrentamiento directo.
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

function placementTiersP(P){
  const placements=computePlacementsPrimaria(P)||{};
  return [1,2,3,5].map(place=>({place,players:Object.keys(placements).filter(p=>placements[p]===place)})).filter(t=>t.players.length);
}
function placementLabelP(place){ return place===3?'3.º-4.º':place===5?'5.º-8.º':`${place}.º`; }
