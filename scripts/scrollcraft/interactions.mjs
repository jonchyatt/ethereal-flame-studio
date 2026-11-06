import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const base = process.argv[2] || 'http://localhost:3106';
const out = process.argv[3] || 'C:/hal-jobs/scrollcraft-interactions';
if (os.freemem() < 3 * 1024 ** 3) throw new Error('Under 3 GB free. Wait five minutes.');
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const result = [];
const inView = locator => locator.evaluate(el => { const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth; });
try {
  for(const width of [390,1440]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
    await context.addInitScript(()=>{
      Element.prototype.requestPointerLock=()=>Promise.reject(new Error('Disabled'));
      Element.prototype.setPointerCapture=()=>{}; Element.prototype.releasePointerCapture=()=>{};
      Document.prototype.exitPointerLock=()=>{};
    });
    const p=await context.newPage();
    const errors=[]; p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'/?capture=1',{waitUntil:'domcontentloaded'});
    const begin=p.locator('.hero-action').getByRole('button',{name:'Begin · 41 sec',exact:true});
    await begin.waitFor(); assert.ok(await inView(begin),'Begin visible in opening');
    assert.equal(await p.locator('.begin-panel video').getAttribute('src'),'/media/appreciation/19.mp4');
    await begin.click();
    await p.waitForFunction(()=>{const v=document.querySelector('.begin-panel video');return v && !v.paused && v.currentTime>0;});
    assert.equal(await p.locator('.begin-panel').getAttribute('hidden'),null);
    await p.locator('.hero-action').getByRole('button',{name:'Listen to the scene',exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('.begin-panel video').paused);
    await p.waitForFunction(()=>window.__heroOrb?.audioState()==='running');
    await p.locator('.hero-action').getByRole('button',{name:'Pause scene',exact:true}).click();
    await p.screenshot({path:path.join(out,`home-${width}-begun.png`)});
    if(width===390){
      await p.getByRole('button',{name:'Menu',exact:true}).click();
      assert.ok(await p.locator('#primary-nav').isVisible());
      await p.keyboard.press('Escape');
      assert.equal(await p.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
      assert.equal(await p.evaluate(()=>document.activeElement?.className),'menu-toggle');
    }
    // Intercept test submissions so no real list subscription or email occurs.
    let payload;
    await p.route('**/api/subscribe',async route=>{
      payload=route.request().postDataJSON();
      await route.fulfill({json:{ok:true,message:'Thanks, you’re on the list.'}});
    });
    const signup=p.locator('form[data-email-signup]');
    await signup.locator('button[type=submit]').click();
    assert.equal(await signup.locator('input[type=email]').getAttribute('aria-invalid'),'true');
    await signup.locator('input[type=email]').fill('scrollcraft-check@example.com');
    await signup.locator('button[type=submit]').click();
    await p.waitForFunction(()=>document.querySelector('form[data-email-signup] [role=status]')?.textContent.includes('on the list'));
    assert.equal(payload.email,'scrollcraft-check@example.com'); assert.equal(payload.sourcePage,'/');
    await p.goto(base+'/listen',{waitUntil:'domcontentloaded'});
    for(const [i,id] of ['19','12','04','04'].entries()){
      const choice=p.locator('.clip-choice').nth(i===3?2:i);
      await choice.click();
      const play=p.locator('.listen-intro .player-actions > button').first();
      await p.waitForTimeout(160);
      assert.ok(await inView(play),`selected ${id} Play visible at ${width}`);
      assert.equal(await p.locator('.listen-intro video').getAttribute('src'),`/media/appreciation/${id}.mp4`);
      await play.click();
      await p.waitForFunction(()=>{const v=document.querySelector('.listen-intro video');return !v.paused&&v.currentTime>0;});
      await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));
      await p.waitForTimeout(200);
      const pause=p.locator('.sc-action-dock button');
      assert.ok(await inView(pause),'playing Pause stays visible');
      assert.match(await pause.textContent(),/Pause/);
      await pause.click();
      assert.ok(await p.locator('.listen-intro video').evaluate(v=>v.paused));
    }
    await p.locator('.credits summary').click();
    assert.ok(await p.locator('.transcript').isVisible());
    await p.screenshot({path:path.join(out,`listen-${width}-transcript.png`)});
    assert.deepEqual(errors,[]);
    result.push({width,begin:true,sceneArbitration:true,signupValidation:true,signupIntercepted:true,clips:['19','12','04'],repeatSelection:true,dockedPause:true,transcript:true,errors});
    writeFileSync(path.join(out,'interactions.json'),JSON.stringify({base,result},null,2));
    console.log(`PASS interactions ${width}`);
    await context.close();
  }
}finally{await browser.close();}
