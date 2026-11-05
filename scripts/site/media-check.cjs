const {chromium,expect}=require('playwright/test');
const fs=require('fs');
const out='C:/hal-jobs/WAIA-BUILD/proof';
(async()=>{const b=await chromium.launch({channel:'chrome'});const checks=[];try{const p=await b.newPage();
for(const [route,selector,seconds] of [['/listen?clip=19','video',41.333333],['/listen?clip=12','video',59.266667],['/listen?clip=04','video',65.533333],['/listen#longer','audio',237.982896],['/programs/advanced-hypnosis-sessions','audio',635.716009]]){
 await p.goto('http://localhost:3137'+route,{waitUntil:'networkidle'});const media=p.locator(selector).first();await expect.poll(()=>media.evaluate(m=>m.readyState)).toBeGreaterThan(0);const before=await media.evaluate(m=>({src:m.currentSrc,duration:m.duration,paused:m.paused}));if(!before.paused||Math.abs(before.duration-seconds)>.2)throw Error('Wrong media '+route);
 await media.evaluate(m=>m.play());await expect.poll(()=>media.evaluate(m=>m.currentTime)).toBeGreaterThan(.2);await media.evaluate(m=>{m.currentTime=20;m.pause()});const after=await media.evaluate(m=>({paused:m.paused,time:m.currentTime,error:m.error?.message||null}));if(!after.paused||after.error||Math.abs(after.time-20)>1)throw Error('Playback failed '+route);checks.push({route,...before,...after,status:'PASS'});
}
const vtt=fs.readFileSync('public/samples/gentle-reset-free-sample.vtt','utf8');const cues=[...vtt.matchAll(/(\d\d):(\d\d):(\d\d\.\d+) --> (\d\d):(\d\d):(\d\d\.\d+)/g)].map(m=>({start:+m[1]*3600 + +m[2]*60 + +m[3],end:+m[4]*3600 + +m[5]*60 + +m[6]}));if(!cues.every((c,i)=>c.start<c.end&&c.end<=635.716009&&(!i||c.start>=cues[i-1].start)))throw Error('Invalid transcript timing');checks.push({source:'preserved food VTT',cues:cues.length,lastEnd:cues.at(-1).end,status:'PASS',limit:'Timestamp structure only; not a new human timing audition.'});
}finally{await b.close();fs.writeFileSync(out+'/media-playback.json',JSON.stringify(checks,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
