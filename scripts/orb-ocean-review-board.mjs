/** Assemble unmodified evidence frames; the external reference never enters the repo. */
import sharp from 'sharp';
import path from 'node:path';
const folder=process.argv[2] || 'C:/hal-jobs/FIREWATER/web/r3';
const output=process.argv[3] || 'argus-review-board-1.png';
const reference=process.argv[4] || 'C:/hal-jobs/WAIA-REVIEW/brand-roots-2026-11-04/10-orb-over-ocean-purple-starfield.jpg';
const panels=[
  ['Round 2', 'C:/hal-jobs/FIREWATER/web/r2/loud-1920x1080.png',0,0,960,540],
  ['Round 3 / music high',path.join(folder,'music-high-1920x1080.png'),960,0,960,540],
  ['Picture 10 / reference only',reference,1920,0,960,540],
  ['Round 3 / quiet voice',path.join(folder,'quiet-1920x1080.png'),0,600,1440,810],
  ['Round 3 / loud voice',path.join(folder,'loud-1920x1080.png'),1440,600,1440,810],
];
const layers=[];
for(const [label,file,left,top,width,height] of panels){
  layers.push({input:Buffer.from(`<svg width="${width}" height="52"><text x="20" y="36" fill="#eff3ff" font-family="Arial" font-size="28">${label}</text></svg>`),left,top});
  layers.push({input:await sharp(file).resize(width,height,{fit:'contain'}).png().toBuffer(),left,top:top+52});
}
await sharp({create:{width:2880,height:1472,channels:3,background:'#0d111b'}}).composite(layers).png().toFile(path.join(folder,output));
console.log(path.join(folder,output));
