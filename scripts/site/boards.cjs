const fs=require('fs'),path=require('path'),sharp=require('sharp');
const out='C:/hal-jobs/WAIA-BUILD/proof';
const round=process.argv[2]||'1';
const groups={
 'home-listen':['home','listen'],
 'programs':['programs','programs-advanced-hypnosis-sessions','programs-belief-lock-in','store-bundles'],
 'store-merch-custom':['store','merch','store-custom-order','store-custom-order-brief'],
 'vr-about-handoff':['vr','about','from-reset-biology']
};
(async()=>{const spec=fs.readFileSync('C:/hal-jobs/WAIA-REVIEW/SPEC-SHEET.md','utf8');const brand=spec.slice(spec.indexOf('## 1.'),spec.indexOf('## 2.'));const accept=spec.slice(spec.indexOf('## 4.'),spec.indexOf('## 5.'));
for(const [family,pages] of Object.entries(groups)){
 const tileW=1280+390+40;const rowH=970;const width=tileW+40,height=rowH*pages.length+330;const layers=[];
 const heading=Buffer.from(`<svg width="${width}" height="330"><rect width="100%" height="100%" fill="#252630"/><text x="24" y="42" font-family="Segoe UI" font-size="28" fill="white">${family} — 1280×900 and 390×844 — production candidate</text><text x="24" y="86" font-family="Segoe UI" font-size="20" fill="white">Canonical 04 / wide 05. Ticket authorizes carving fallback while living scene awaits approval.</text><text x="24" y="120" font-family="Segoe UI" font-size="18" fill="#b8b9c5">Reference 10 is a target, not shipped hero. Current master removed the rejected food video; H1 remains audio.</text></svg>`);layers.push({input:heading,left:0,top:0});
 layers.push({input:await sharp('public/brand/carving/04.png').resize(150,150).png().toBuffer(),left:24,top:145});
 layers.push({input:await sharp('public/brand/carving/05.png').resize(300,150).png().toBuffer(),left:200,top:145});
 layers.push({input:await sharp('C:/hal-jobs/WAIA-REVIEW/brand-roots-2026-11-04/10-orb-over-ocean-purple-starfield.jpg').resize(268,150).png().toBuffer(),left:530,top:145});
 for(let i=0;i<pages.length;i++){const page=pages[i],top=330+i*rowH;layers.push({input:Buffer.from(`<svg width="${width}" height="50"><text x="20" y="32" font-family="Segoe UI" font-size="24" fill="white">/${page==='home'?'':page} — desktop / phone</text></svg>`),left:0,top});layers.push({input:path.join(out,page+'-1280-first.png'),left:20,top:top+50});layers.push({input:path.join(out,page+'-390-first.png'),left:1320,top:top+50});}
 await sharp({create:{width,height,channels:3,background:'#252630'}}).composite(layers).png().toFile(path.join(out,family+'-board-'+round+'.png'));
 const ctx=`# Candidate family: ${family}\n\nPages: ${pages.join(', ')}. Board includes exact desktop and phone first viewport captures and canonical references. Full-page evidence is also available in the proof bundle. Score the visible first view; do not invent a full-page verdict from it.\n\nTicket overrides: publishing is green; no payment/contract. Hero fallback is exact wide carving 05 with live analyser glow because no living scene round-three pass is available. Current master removed the rejected H1 video; it is honestly audio-only, with decorative carving. Merch are explicitly Gemini concepts, not approved print art, and defects are annotated on detail routes.\n\n${brand}\n\n${accept}\n`;
 fs.writeFileSync(path.join(out,family+'-context-'+round+'.md'),ctx);
 console.log(family,width,height);
}
})();
