/* Documentation only: isolated browser data, never loaded by the published site.
 * Run with Node.js and Playwright installed: node scripts/capture_guide.cjs
 * CHROME_PATH may select an installed Chromium browser.
 */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/guide');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.svg':'image/svg+xml'};

async function main(){
  const server = http.createServer((req,res)=>{
    const file=path.resolve(ROOT, '.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1.5,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const go=async url=>{await page.goto(origin+'/'+url);await page.evaluate(()=>document.fonts.ready);};
  const manifest={};
  // A uniform frame avoids adjacent controls leaking into component captures.
  async function shot(name,selector){
    await page.evaluate(()=>window.scrollTo(0,0));
    const b=await page.locator(selector).boundingBox();assert(b,selector);
    const pixels=await page.locator(selector).screenshot({type:'png',animations:'disabled'});
    const framed=await sharp(pixels).extend({top:36,bottom:36,left:36,right:36,background:'#f8f7f2'}).jpeg({quality:94}).toBuffer();
    fs.writeFileSync(path.join(OUT,name+'.jpg'),framed);
    const size=await sharp(framed).metadata();
    manifest[name]={width:size.width,height:size.height,source:page.url().split(origin)[1],selector,margin:24};
    console.log(name,manifest[name].width,manifest[name].height);
  }
  try{
    await go('config.html');
    await page.evaluate(()=>{
      const s=freshSetup();
      const names={
        primaria:[['Mateo Rivas','Lucía Vega'],['Diego Paredes','Ana Torres'],['Sofía Castro','Bruno Salas'],['Valeria Ponce','Tomás Medina']],
        secundaria_baja:[['Gabriel Soto','Camila Reyes'],['Adrián Flores','Ana Torres'],['Mateo Rojas','Lucas Vidal'],['Joaquín Ramos','Daniela Cruz']],
        secundaria_alta:[['Nicolás Rojas','Elena Campos'],['Martina Paz','Samuel Vela'],['Sebastián Luna','Paula Herrera'],['Isabella Reyes','Andrés Córdova']],
      };
      for(const m of MODALITIES)COLORS.forEach((c,i)=>{s[m.id].players[c]={bueno:names[m.id][i][0],malo:names[m.id][i][1]};});
      // The 100-point example matches the explanatory captions in the guide/PDF.
      s.pointTotals.secundaria_baja=100;s.pointTotals.secundaria_alta=100;
      s.locked=true;saveSetup(s);
      const orders={
        primaria:[['verde:malo','rojo:bueno','azul:bueno','amarillo:malo'],['rojo:malo','amarillo:bueno','azul:malo','verde:bueno']],
        secundaria_baja:[['azul:bueno','verde:malo','amarillo:malo','rojo:bueno'],['amarillo:bueno','rojo:malo','azul:malo','verde:bueno']],
        secundaria_alta:[['azul:bueno','verde:malo','amarillo:malo','rojo:bueno'],['amarillo:bueno','rojo:malo','verde:bueno','azul:malo']],
      };
      for(const mode of MODALITIES.map(m=>m.id)){
        const t=freshSecundaria(mode);t.seedOrder=['rojo','azul','verde','amarillo'];confirmGroupsS(t);
        ['A','B'].forEach((g,i)=>t.groupGames[g].forEach(game=>{game.result=orders[mode][i].indexOf(game.white)<orders[mode][i].indexOf(game.black)?'white':'black';}));
        autoAdvanceS(t);
        if(mode!=='primaria'){
          t.final.colorChoice='p1-white';t.final.games[0].result='white';t.final.games[1].result='black';
          for(const [place,m] of Object.entries(t.placementMatches)){
            m.colorChoice='p1-white';m.games[0].result=place==='3'?'draw':place==='5'?'white':'black';
          }
        }
        if(!validTournamentS(t,mode))throw new Error('Invalid documentation fixture: '+mode);
        saveSecundaria(t);
      }
    });
    await page.setViewportSize({width:1440,height:1700});
    await go('config.html');
    assert.equal(await page.getByText('Participante Mayor',{exact:true}).count(),12);
    await shot('configuracion','#app > .panel:has(> h2:text-is("Primaria"))');
    await page.setViewportSize({width:1440,height:1000});
    await go('arbitro-primaria.html');await page.evaluate(()=>{tab='grupos';render();});
    await shot('grupos-primaria','.round-timer');
    await page.setViewportSize({width:1440,height:1700});
    await go('arbitro-secundaria.html?categoria=baja');await page.evaluate(()=>{tab='grupos';render();});
    await shot('registro-grupos','#app > .group-columns > .panel:first-child');
    await page.setViewportSize({width:1440,height:1000});
    await go('publico-secundaria.html?categoria=baja');
    await shot('grupo-publico','.group-columns > .panel:first-child');
    await shot('final-secundaria','#mb-final');
    await shot('puntos-color','.public-sidebar');
    await go('publico-secundaria.html?categoria=alta');
    await shot('cruces-secundaria','#bracketWrap');
    await shot('publico-secundaria','body');
    await go('publico-primaria.html');await shot('publico-primaria','body');
    await go('index.html');await shot('portada','body');
    // A partially revealed draw demonstrates the visible Mayor/Menor labels.
    await go('publico-secundaria.html?categoria=alta#sorteo');
    await page.evaluate(()=>{
      const t=freshSecundaria('secundaria_alta');
      t.draw={version:1,order:['rojo','verde','azul','amarillo'],revealed:2,spin:null,lastSpin:null,readyAt:0};
      saveSecundaria(t);S=getSecundaria();render();
    });
    await shot('sorteo','body');
    assert.equal(errors.length,0,errors.join('\n'));
    // A fresh visitor must still see empty configuration and no tournament results.
    const clean=await browser.newContext({serviceWorkers:'block'});const blank=await clean.newPage();
    await blank.goto(origin+'/config.html');
    assert.equal(await blank.evaluate(()=>categoryConfigured('primaria')),false);
    assert.equal(await blank.evaluate(()=>getSetup().locked),false);
    assert.equal(await blank.evaluate(()=>getSecundaria('secundaria_alta').groups),null);
    await clean.close();
    fs.writeFileSync(path.join(OUT,'captures.json'),JSON.stringify(manifest,null,2)+'\n');
  }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exit(1);});
