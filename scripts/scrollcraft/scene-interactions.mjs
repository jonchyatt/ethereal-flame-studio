import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
const base=process.argv[2]||'http://localhost:3106',out=process.argv[3]||'C:/hal-jobs/scene-interactions';
if(os.freemem()<3*1024**3)throw Error('Under 3 GB free. Wait five minutes.');
const require=createRequire(import.meta.url),axe=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
mkdirSync(out,{recursive:true});const results=[],browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [390,1440,360]){
 const reduced=width===360;
 const c=await browser.newContext({viewport:{width,height:width===1440?900:width===360?640:844},reducedMotion:reduced?'reduce':'no-preference'});
 await c.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.reject(Error('Disabled'));Element.prototype.setPointerCapture=()=>{};Element.prototype.releasePointerCapture=()=>{};Document.prototype.exitPointerLock=()=>{};});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const kind of ['orb-ocean','rainbow-falls']){
  await p.goto(base+'/scenes/'+kind+'?capture=1');
  await p.waitForFunction(()=>window.__livingScene?.stats().frames>0);
  assert.ok(await p.getByRole('heading',{level:1}).isVisible());
  await p.getByLabel('Quality',{exact:false}).selectOption('low');
  await p.waitForFunction(()=>window.__livingScene?.stats().quality==='low');
  const pause=p.getByRole('button',{name:'Pause motion',exact:true});await pause.focus();await p.keyboard.press('Space');
  await p.waitForFunction(()=>window.__livingScene?.stats().paused===true);
  assert.equal(await p.evaluate(()=>window.__livingScene.audioState()),'not-started');
  await p.getByRole('button',{name:'Resume motion',exact:true}).click();await p.waitForFunction(()=>window.__livingScene?.stats().paused===false);
  if(kind==='orb-ocean'){
   if(reduced)assert.equal(await p.getByRole('button',{name:'Motion reduced',exact:true}).isDisabled(),true);
   else {await p.getByRole('button',{name:'Begin',exact:true}).click();await p.waitForFunction(()=>window.__livingScene?.audioState()==='running');}
  }else{
   await p.getByRole('button',{name:'Start sound',exact:true}).click();await p.waitForFunction(()=>window.__livingScene?.audioState()==='running');
   await p.getByRole('button',{name:'Mute waterfall',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Unmute waterfall',exact:true}).getAttribute('aria-pressed'),'true');
   await p.getByRole('button',{name:'Unmute waterfall',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Mute waterfall',exact:true}).getAttribute('aria-pressed'),'false');
  }
  await p.evaluate(axe);const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
  await p.screenshot({path:`${out}/${kind}-${width}-working.png`});
  results.push({route:'/scenes/'+kind,width,reduced,stats:await p.evaluate(()=>window.__livingScene.stats()),controls:true,sound:!reduced||kind==='rainbow-falls',violations});
 }
 await p.goto(base+'/mist');await p.getByRole('heading',{name:'Mist',exact:true}).waitFor();
 await p.getByRole('button',{name:'Open mist controls',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.thinking-glow-root')?.dataset.webgl==='true');
 const root=p.locator('.thinking-glow-root').first();
 for(const style of ['vortex','blend','mist']){await p.getByLabel('Style',{exact:false}).selectOption(style);await p.waitForFunction(value=>document.querySelector('.thinking-glow-root')?.dataset.style===value,style);}
 const palette=p.getByLabel('Palette',{exact:false});const options=await palette.locator('option').evaluateAll(es=>es.map(e=>e.value));assert.ok(options.length>1);await palette.selectOption(options[1]);assert.equal(await palette.inputValue(),options[1]);
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.equal(overflow,0);
 const controlsInView=await p.locator('.scene-toolbar button,#mist-controls select').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));assert.ok(controlsInView);
 await p.evaluate(axe);const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
 await p.screenshot({path:`${out}/mist-${width}-controls.png`});
 await p.getByRole('button',{name:'Close mist controls',exact:true}).click();assert.equal(await p.locator('#mist-controls').count(),0);
 await p.goto(base+'/mist?controls=1&style=blend');await p.waitForFunction(()=>document.querySelector('.thinking-glow-root')?.dataset.style==='blend');assert.equal(await p.getByRole('button',{name:'Close mist controls',exact:true}).getAttribute('aria-expanded'),'true');
 results.push({route:'/mist',width,reduced,styles:['vortex','blend','mist'],palette:true,queryInitialization:true,controlsInView,violations,errors});assert.deepEqual(errors,[]);
 console.log('PASS scenes '+width);await c.close();
}}
finally{await browser.close();writeFileSync(`${out}/interactions.json`,JSON.stringify({base,results},null,2));}
