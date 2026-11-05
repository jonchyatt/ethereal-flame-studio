const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
(async()=>{
 const root=process.cwd();
 fs.mkdirSync('public/brand/share',{recursive:true});
 await sharp('public/brand/carving/04.png').resize(64,64,{fit:'contain'}).png().toFile('public/brand/carving/icon.png');
 // Keep the conventional browser fallback identical to the declared PNG icon.
 const icon=fs.readFileSync('public/brand/carving/icon.png');
 const icoHeader=Buffer.alloc(22);
 icoHeader.writeUInt16LE(1,2); icoHeader.writeUInt16LE(1,4);
 icoHeader[6]=64; icoHeader[7]=64;
 icoHeader.writeUInt16LE(1,10); icoHeader.writeUInt16LE(32,12);
 icoHeader.writeUInt32LE(icon.length,14); icoHeader.writeUInt32LE(22,18);
 fs.writeFileSync('public/favicon.ico',Buffer.concat([icoHeader,icon]));
 await sharp('public/brand/carving/04.png').resize(180,180,{fit:'contain'}).png().toFile('public/brand/carving/apple-touch-icon.png');
 const mark=await sharp('public/brand/carving/04.png').resize(420,420).png().toBuffer();
 const families={home:'A moment of appreciation',programs:'Listen. Explore. Return.',store:'Carry the question with you',shelf:'The everyday shelf',patrons:'The people behind the work'};
 for(const [family,label] of Object.entries(families)) {
  const svg=Buffer.from(`<svg width="1200" height="630"><rect width="1200" height="630" fill="#0f0f19"/><rect x="64" y="88" width="430" height="430" fill="none" stroke="#786449"/><text x="552" y="216" font-family="Georgia" font-size="54" fill="#f4f1e8">What Am I</text><text x="552" y="280" font-family="Georgia" font-size="54" fill="#f4f1e8">Appreciating Now</text><rect x="552" y="325" width="72" height="3" fill="#a0d81d"/><text x="552" y="381" font-family="Segoe UI" font-size="26" fill="#b8b9c5">${label}</text></svg>`);
  await sharp(svg).composite([{input:mark,left:69,top:93}]).png().toFile(`public/brand/share/${family}.png`);
 }
 console.log('Carving icons and five share images prepared.');
})();
