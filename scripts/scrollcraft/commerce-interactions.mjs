import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
const base=process.argv[2]||'http://localhost:3106',out=process.argv[3]||'C:/hal-jobs/commerce-interactions';
if(os.freemem()<3*1024**3)throw Error('Under 3 GB free. Wait five minutes.');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:width===390?844:900}});
 await c.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.reject(Error('Disabled'));Element.prototype.setPointerCapture=()=>{};Element.prototype.releasePointerCapture=()=>{};Document.prototype.exitPointerLock=()=>{};});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const kind of ['hypnosis','vr']){
  let payload,requests=0;
  await p.route('**/api/custom-orders/brief',async r=>{requests++;payload=r.request().postDataJSON();await r.fulfill({json:{reference:'scrollcraft-test.private-reference'}});});
  await p.goto(base+'/store/custom-order/brief?kind='+kind);
  await p.locator('form button[type=submit]').click(); assert.equal(requests,0);
  await p.getByLabel('What would you like it to help with?',{exact:false}).fill('A calm evening appreciation session');
  await p.getByLabel('Your email',{exact:false}).fill('scrollcraft-test@example.com');
  await p.getByText('Optional preferences',{exact:true}).click();
  await p.getByLabel(/^Length/).selectOption('30');
  if(kind==='vr'){
   await p.getByLabel(/^Scene/).selectOption('other');
   await p.getByLabel('Anything to add about the scene',{exact:false}).fill('An evening garden');
   await p.getByLabel('I am sensitive to motion sickness or flashing light').check();
  }
  await p.getByLabel('I understand a session is never to be used',{exact:false}).check();
  await p.locator('form button[type=submit]').click();
  await p.getByText('Your brief is in.',{exact:true}).waitFor();
  assert.equal(payload.brief.kind,kind);assert.equal(payload.brief.lengthMinutes,30);assert.equal(payload.brief.acknowledgeSafeUse,true);assert.equal(payload.contact,'scrollcraft-test@example.com');
  if(kind==='vr'){assert.equal(payload.brief.vrScene,'other');assert.equal(payload.brief.vrComfortFlag,true);}
  assert.match(await p.getByRole('link',{name:'See where your request stands',exact:true}).first().getAttribute('href'),/ref=scrollcraft-test.private-reference/);
  await p.screenshot({path:`${out}/brief-${kind}-${width}-success.png`});
  await p.unroute('**/api/custom-orders/brief');
 }
 let lookup=0;
 await p.route('**/api/custom-orders/*',async r=>{lookup++;await r.fulfill(lookup===1?{status:404,json:{error:'not found'}}:{json:{order:{id:'scrollcraft-test',kind:'hypnosis',details:'A calm evening appreciation session',status:'in_review',updatedAt:'2026-11-06'}}});});
 await p.goto(base+'/store/custom-order');
 await p.getByLabel('Your reference',{exact:true}).fill('scrollcraft-test.private-reference');
 await p.locator('form button[type=submit]').click();
 await p.getByText('No request found.',{exact:false}).waitFor();
 assert.equal(await p.getByLabel('Your reference',{exact:true}).inputValue(),'scrollcraft-test.private-reference');
 await p.locator('form button[type=submit]').click();
 await p.getByRole('heading',{name:'Being read',exact:true}).waitFor();
 await p.screenshot({path:`${out}/lookup-${width}-success.png`});
 await p.goto(base+'/store/shelf');
 const links=await p.locator('.sc-shelf-item a[data-sc-primary]').evaluateAll(es=>es.map(e=>({href:e.href,rel:e.rel,target:e.target,label:e.textContent.trim()})));
 assert.ok(links.length);assert.ok(links.every(l=>l.target==='_blank'&&l.rel.includes('noopener')));
 await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(250);
 const dock=p.locator('.sc-action-dock a');assert.equal(await dock.count(),1);assert.equal(await dock.getAttribute('target'),'_blank');
 const dockHref=await dock.getAttribute('href'),selected=links.find(l=>l.href===dockHref);assert.ok(selected);assert.equal(await dock.getAttribute('rel'),selected.rel);
 results.push({width,briefKinds:['hypnosis','vr'],nativeValidation:true,lookupRetry:true,shelfLinks:links,errors});
 assert.deepEqual(errors,[]);await c.close();console.log('PASS commerce '+width);
}}
finally{await browser.close();writeFileSync(`${out}/interactions.json`,JSON.stringify({base,results},null,2));}
