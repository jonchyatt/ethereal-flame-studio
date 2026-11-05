import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2] || 'http://127.0.0.1:3103';
const output=process.argv[3] || 'C:/hal-jobs/FIREWATER/web/r3';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:[
  '--use-gl=angle','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist',
]});
const results={};
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/scenes/rainbow-falls?capture=1`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__livingScene?.stats().frames>20);
  assert.equal(await page.evaluate(()=>window.__livingScene.audioState()),'not-started');
  await page.locator('main').click({position:{x:60,y:60}});
  await page.getByRole('button',{name:'Mute waterfall',exact:true}).waitFor();
  await page.getByRole('button',{name:'Mute waterfall',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Unmute waterfall'}).getAttribute('aria-pressed'),'true');
  results.rainbowFalls=await page.evaluate(()=>({
    audio:window.__livingScene.audioState(),resolution:window.__livingScene.stats().resolution,
    glError:document.querySelector('canvas').getContext('webgl2').getError(),
  }));
  assert.equal(results.rainbowFalls.glError,0);
  await page.screenshot({path:path.join(output,'rainbow-falls-smoke.png')});

  await page.goto(`${base}/scenes/orb-ocean?capture=1&controls=1&sky=bluegold`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__livingScene?.stats().frames>30);
  assert.equal(await page.evaluate(()=>window.__livingScene.audioState()),'not-started');
  await page.screenshot({path:path.join(output,'bluegold-smoke.png')});
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.waitForFunction(()=>window.__livingScene.audioState()==='running');
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>window.__livingScene.audio().getAudioTracks()[0].readyState),'live');
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  const pausedFrames=await page.evaluate(()=>window.__livingScene.stats().frames);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__livingScene.stats().frames),pausedFrames);
  await page.getByRole('button',{name:'Resume motion',exact:true}).click();
  await page.waitForFunction(n=>window.__livingScene.stats().frames>n+3,pausedFrames);
  for(const quality of ['low','medium','high','auto']) {
    await page.getByLabel('Quality').selectOption(quality);await page.waitForTimeout(80);
  }
  results.orb={noAutoplay:true,beginStartsMix:true,pauseResume:true,qualitySwitch:true};

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${base}/scenes/orb-ocean?capture=1`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__livingScene?.stats().frames>20);
  const before=await page.evaluate(()=>({stats:window.__livingScene.stats(),pixels:document.querySelector('canvas').toDataURL()}));
  await page.waitForTimeout(1200);
  const after=await page.evaluate(()=>({stats:window.__livingScene.stats(),pixels:document.querySelector('canvas').toDataURL()}));
  assert.equal(after.stats.reducedMotion,true);
  assert.ok(after.stats.time>before.stats.time);
  assert.notEqual(after.pixels,before.pixels);
  assert.equal(await page.evaluate(()=>window.__livingScene.audioState()),'not-started');
  results.reducedMotion={animated:true,noAutoplay:true,slowSecondsAdvanced:after.stats.time-before.stats.time};
  assert.deepEqual(errors,[]);results.pageErrors=errors;
  await writeFile(path.join(output,'smoke-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
