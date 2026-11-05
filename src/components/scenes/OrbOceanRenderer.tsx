import { createRoot, extend, useFrame, type RootStore } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type EffectComposer as Composer } from 'postprocessing';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group,
  InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, RepeatWrapping, Scene, ShaderMaterial, TextureLoader,
  Vector3, WebGLRenderer, type WebGLRenderTarget,
} from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { Quality, SceneAudioLevels, SceneStats } from './renderer';

extend({ Group });

const tiers = [
  { name: 'low', particles: 160, reflection: 256, segments: 100, pixels: 550_000, dpr: 1 },
  { name: 'medium', particles: 240, reflection: 512, segments: 144, pixels: 1_100_000, dpr: 1 },
  { name: 'high', particles: 360, reflection: 1024, segments: 200, pixels: 2_100_000, dpr: 1.4 },
];

function random(seed: number) {
  return () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

/** One canvas-generated radial falloff shared by all the instanced sprites. */
function softSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const pixels=context.createImageData(128,128);
  for(let y=0;y<128;y++) for(let x=0;x<128;x++) {
    const r2=((x-63.5)**2+(y-63.5)**2)/(63.5**2), i=(y*128+x)*4;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
    pixels.data[i+3]=255*Math.max(0,(Math.exp(-5*r2)-Math.exp(-5))/(1-Math.exp(-5)));
  }
  context.putImageData(pixels,0,0);
  return new CanvasTexture(canvas);
}

function makeOrb() {
  const rand = random(140927);
  const texture = softSprite();
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-.5,-.5,0, .5,-.5,0, .5,.5,0, -.5,.5,0]), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0,0, 1,0, 1,1, 0,1]), 2));
  const centres = new InstancedBufferAttribute(new Float32Array(360 * 3), 3);
  const colours = new InstancedBufferAttribute(new Float32Array(360 * 3), 3);
  const sizes = new InstancedBufferAttribute(new Float32Array(360), 1);
  geometry.setAttribute('centre', centres); geometry.setAttribute('tint', colours); geometry.setAttribute('diameter', sizes);
  const material = new ShaderMaterial({
    uniforms: { glow: { value: texture }, radius:{value:15}, time:{value:0} }, transparent: true,
    blending: AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `attribute vec3 centre; attribute vec3 tint; attribute float diameter;
      uniform float radius; varying vec2 vUv; varying vec3 vTint; varying vec3 vField;
      void main(){ vUv=uv; vTint=tint;
        vec4 p=modelViewMatrix*vec4(centre,1.);
        p.xy+=position.xy*diameter; gl_Position=projectionMatrix*p;
        vField=vec3((centre.xy-vec2(0.,10.)+position.xy*diameter)/radius,(centre.z+68.)/10.); }`,
    fragmentShader: `uniform sampler2D glow; uniform float time; varying vec2 vUv; varying vec3 vTint; varying vec3 vField;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){ vec3 p=vField*7.+vec3(time*.12,-time*.09,time*.07);
        float density=noise(p)*.65+noise(p*2.03)*.35;
        float a=texture2D(glow,vUv).a*mix(.25,1.6,smoothstep(.24,.76,density));
        gl_FragColor=vec4(vTint,a); }`,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  // Twenty independent, incommensurate drift paths, distributed in a volume.
  const clusters = Array.from({ length: 20 }, (_, i) => {
    const azimuth = i * 2.399963;
    const y = i < 5 ? 1-2*(i+.5)/5 : 1-2*(i-5+.5)/15;
    const r = i < 5 ? .24 : .60 + rand() * .10;
    return { x: Math.cos(azimuth) * Math.sqrt(1 - y*y) * r, y: y*r,
      z: Math.sin(azimuth) * Math.sqrt(1 - y*y) * r, phase: rand()*30,
      speed: .11 + rand()*.17 };
  });
  const particles = Array.from({ length: 360 }, (_, i) => ({
    cluster: i % 20, x: (rand()-.5)*.42, y: (rand()-.5)*.42, z: (rand()-.5)*.58,
    diameter: .34+rand()*.24, phase: rand()*20,
  }));
  const colour = new Color();
  return {
    mesh,
    update(t: number, audio: SceneAudioLevels, reduced: boolean, count: number) {
      geometry.instanceCount = count;
      // A quiet 10° cloud, an 18° idle breath, and >30° full-scale peaks.
      // Both spacing and sprite diameter scale: overlap/emission stays constant.
      const active = audio.voice > .001 || audio.ocean > .001 || audio.music > .001;
      const radius = reduced || !active ? 15.0 + .45*Math.sin(t*.7) : 7.0 + 19.0*Math.sqrt(audio.voice);
      material.uniforms.radius.value=radius;material.uniforms.time.value=t;
      const hue = (t / 6) % 1;
      for (let i = 0; i < count; i++) {
        const p = particles[i], c = clusters[p.cluster], phase = c.phase;
        const x = c.x + .115*Math.sin(t*c.speed+phase) + .055*Math.sin(t*.319+phase*2.7) + p.x;
        const y = c.y + .12*Math.sin(t*c.speed*.837+phase*1.9) + .04*Math.cos(t*.237+phase) + p.y;
        const z = c.z + .10*Math.sin(t*c.speed*.731+phase*2.3) + p.z;
        // Lower wisps contract around the waterline, so quiet speech does not
        // lift the whole cloud clear of the sea. The luminous centre stays put.
        const skirt=Math.max(0,15-radius)*Math.max(0,-y)*1.5;
        centres.setXYZ(i, x*radius, 10+y*radius-skirt, -68+z*10);
        const edge = Math.min(1, Math.hypot(x,y,z));
        // Adjacent spectral colours, with a small speech-centroid edge lead.
        colour.setHSL((hue + edge*(.22+.045*audio.voiceTone) + .018*Math.sin(p.phase))%1, 1, .5);
        const energy = (360/count) * (.10 + .02*Math.sin(p.phase));
        // A very small spectral floor burns white only where many sprites stack.
        const spectralFloor=1.0*Math.pow(1-edge,8);
        colours.setXYZ(i, (colour.r+spectralFloor)*energy, (colour.g+spectralFloor)*energy, (colour.b+spectralFloor)*energy);
        const shimmer = edge > .7 ? 1 + .035*audio.music*Math.sin(t*2.7+p.phase) : 1;
        sizes.setX(i, p.diameter*radius*shimmer);
      }
      centres.needsUpdate = colours.needsUpdate = sizes.needsUpdate = true;
    },
    dispose() { geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}

function makeStars(blueGold: boolean) {
  const group = new Group();
  const rand = random(79513);
  const layers = [24000, 3400, 420].map((count, layer) => {
    const geometry = new BufferGeometry();
    const positions = [], magnitudes = [], phases = [], colours = [];
    for (let i=0; i<count; i++) {
      const angle = rand()*Math.PI*2, y=rand()*1.95-.95, r=Math.sqrt(1-y*y);
      positions.push(Math.cos(angle)*r*3000, y*3000, Math.sin(angle)*r*3000);
      magnitudes.push(.5+rand()*.5); phases.push(rand()*30);
      const c = new Color(blueGold ? (i%3 ? '#fff3b2' : '#cddcff') : (i%7===0 ? '#ffd3a1' : i%3 ? '#cbdfff' : '#ffffff'));
      colours.push(c.r,c.g,c.b);
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions),3));
    geometry.setAttribute('magnitude', new BufferAttribute(new Float32Array(magnitudes),1));
    geometry.setAttribute('phase', new BufferAttribute(new Float32Array(phases),1));
    geometry.setAttribute('tint', new BufferAttribute(new Float32Array(colours),3));
    const material = new ShaderMaterial({ transparent:true, depthWrite:false, blending:AdditiveBlending, toneMapped:false,
      uniforms: { time:{value:0}, music:{value:0}, pixelRatio:{value:1}, pointSize:{value:[1.2,2.1,3.7][layer]}, brightness:{value:[.34,.7,1.3][layer]} },
      vertexShader:`attribute float magnitude; attribute float phase; attribute vec3 tint;
        uniform float time; uniform float music; uniform float pointSize; uniform float pixelRatio; uniform float brightness;
        varying vec3 vColor;
        void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
          gl_PointSize=pointSize*pixelRatio*(.75+.25*magnitude);
          float twinkle=.85+.15*sin(time*(.8+magnitude)+phase);
          vColor=tint*brightness*magnitude*(.38+music*3.5)*twinkle; }`,
      fragmentShader:`varying vec3 vColor; void main(){float r=length(gl_PointCoord-.5)*2.;
        gl_FragColor=vec4(vColor,pow(max(0.,1.-r*r),2.));}`,
    });
    const points = new Points(geometry, material); points.frustumCulled=false; group.add(points);
    return { geometry, material, points };
  });
  return { group,
    update(t:number, music:number, dpr:number) { layers.forEach(({material,points},i)=>{
      points.rotation.y=t*(.0008+i*.0002); points.rotation.z=.09*i;
      material.uniforms.time.value=t; material.uniforms.music.value=music; material.uniforms.pixelRatio.value=dpr;
    }); },
    dispose(){ layers.forEach(({geometry,material})=>{ geometry.dispose(); material.dispose(); }); },
  };
}

function makeWater(tier: typeof tiers[number], blueGold: boolean, onFailure: () => void) {
  const normals = new TextureLoader().load('/textures/waternormals.jpg', undefined, undefined, onFailure);
  normals.wrapS=normals.wrapT=RepeatWrapping;
  const geometry = new PlaneGeometry(2,2,tier.segments,tier.segments);
  const positions = geometry.getAttribute('position');
  // Cubic spacing concentrates vertices under the low camera and preserves a
  // single continuous plane all the way to the hard, undisturbed horizon.
  for(let i=0;i<positions.count;i++) {
    positions.setXYZ(i, Math.pow(positions.getX(i),3)*16000, Math.pow(positions.getY(i),3)*16000, 0);
  }
  geometry.computeBoundingSphere();
  const water = new Water(geometry, { textureWidth:tier.reflection, textureHeight:tier.reflection,
    waterNormals:normals, sunDirection:new Vector3(0,.095,-1).normalize(), sunColor:0xffffff,
    waterColor:blueGold ? 0x334888 : 0x324752, distortionScale:2.5, fog:false });
  water.rotation.x=-Math.PI/2;
  water.frustumCulled=false;
  const material=water.material;
  material.uniforms.size.value=24;
  material.uniforms.swell={value:.35}; material.uniforms.glintStrength={value:1};
  material.uniforms.horizonTint={value:new Color(blueGold ? 0x4e5ca4 : 0x4b5465)};
  // The mirror camera, projective reflection, animated normal sampling, Fresnel
  // and sunLight all remain Water.js. Add physical swells and their derivatives.
  const swellGLSL=`
    uniform float swell;
    float heightAt(vec2 p) {
      float fade=1.-smoothstep(120.,600.,length(p));
      return swell*fade*(.52*sin(dot(p,vec2(.12,.21))+time*.7)
        +.28*sin(dot(p,vec2(-.23,.09))-time*.51)
        +.20*sin(dot(p,vec2(.37,.16))+time*.83));
    }`;
  material.vertexShader=material.vertexShader.replace('void main() {',`${swellGLSL}\nvoid main() {`)
    .replace('mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      'vec3 displaced=position; displaced.z+=heightAt(vec2(position.x,-position.y)); mirrorCoord = modelMatrix * vec4(displaced,1.);')
    .replace('modelViewMatrix * vec4( position, 1.0 )','viewMatrix * worldPosition');
  material.fragmentShader=material.fragmentShader
    .replace('void main() {',`${swellGLSL}\nuniform float glintStrength; uniform vec3 horizonTint;\nvoid main() {`)
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`
      vec2 p=worldPosition.xz;
      vec2 slope=vec2(heightAt(p+vec2(.3,0.))-heightAt(p-vec2(.3,0.)),
        heightAt(p+vec2(0.,.3))-heightAt(p-vec2(0.,.3)))/.6;
      vec3 surfaceNormal=normalize(vec3(noise.x*1.2-slope.x, max(.45,noise.z),noise.y*1.2-slope.y));`)
    .replace('100.0, 2.0, 0.5', 'mix(70.0,480.0,smoothstep(5.0,45.0,length(worldToEye))), glintStrength, 0.5')
    .replace('vec3 outgoingLight = albedo;',`
      float horizon=pow(1.-max(eyeDirection.y,0.),8.);
      vec3 base=mix(waterColor,horizonTint,horizon);
      float crest=.45+.95*max(0.,dot(surfaceNormal,normalize(vec3(-.5,.5,-.65))));
      float trough=.60+.40*smoothstep(-swell,swell,heightAt(worldPosition.xz));
      float foreground=.13+.87*(1.-smoothstep(12.,85.,distance));
      // The resolved near facets have a broader sun lobe than distant chop.
      // A second normal-map octave breaks it into glints without drawing a
      // screen-space stripe or borrowing the orb's coloured mirror image.
      vec4 micro=getNoise(worldPosition.xz*size*3.7);
      float facets=pow(smoothstep(.08,.30,micro.x-micro.y*.6),2.);
      float nearRoad=1.-smoothstep(7.,28.,distance);
      vec3 glitter=specularLight*foreground*(1.+nearRoad*1.4)*facets*3.0;
      // White sun glints replace coloured mirror light on the lit microfacets;
      // adding both without this energy split turns the white road pink.
      float sunFacet=smoothstep(.12,.65,glitter.r);
      vec3 reflected=reflectionSample*reflectance*(.95-nearRoad*.80)*(1.-sunFacet);
      vec3 outgoingLight=base*crest*trough + reflected + glitter;
    `);
  // Water.js keeps its target private. Retain it once, for deterministic cleanup.
  let reflectionTarget: Pick<WebGLRenderTarget, 'dispose'> | null=null;
  const original=water.onBeforeRender;
  water.onBeforeRender=function(renderer,...args){
    const setTarget=renderer.setRenderTarget;
    renderer.setRenderTarget=function(target,...rest){
      if(target?.texture===material.uniforms.mirrorSampler.value) reflectionTarget=target;
      return setTarget.call(this,target,...rest);
    };
    try { original.call(this,renderer,...args); } finally { renderer.setRenderTarget=setTarget; }
  };
  return {water,
    update(t:number,ocean:number,reduced:boolean){
      material.uniforms.time.value=t;
      material.uniforms.swell.value=reduced ? .22 : .30+ocean*.55;
      material.uniforms.distortionScale.value=1.8+ocean*2.5;
      material.uniforms.glintStrength.value=1.0+ocean*50.;
    },
    dispose(){ reflectionTarget?.dispose(); normals.dispose(); geometry.dispose(); material.dispose(); },
  };
}

export function createOrbOceanRenderer(canvas:HTMLCanvasElement,onFailure:()=>void) {
  const query=new URLSearchParams(location.search), blueGold=query.get('sky')==='bluegold';
  const phone=innerWidth<700 || navigator.hardwareConcurrency<=4;
  let tierIndex=phone?0:2, mode:Quality='auto';
  const scene=new Scene(); scene.background=blueGold ? new Color(0x3234a5) : new Color().setRGB(.033,.026,.042);
  const camera=new PerspectiveCamera(54,1,.1,50000);
  camera.position.set(0,3,12); camera.rotation.x=.105;
  const gl=new WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:query.get('capture')==='1'});
  gl.debug.onShaderError=onFailure;
  const orb=makeOrb(), stars=makeStars(blueGold);
  let ocean=makeWater(tiers[tierIndex],blueGold,onFailure);
  scene.add(ocean.water,orb.mesh,stars.group);
  let audio:SceneAudioLevels={voice:0,ocean:0,music:0,voiceTone:.38};
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=motion.matches, paused=false, lost=false, disposed=false;
  let elapsed=0,frames=0,previous=0,frameStart=0,cooldown=240;
  const intervals:number[]=[],cpuTimes:number[]=[];
  let store:RootStore|undefined;
  const root=createRoot(canvas);
  function resize() {
    if(disposed) return;
    const {width,height}=canvas.getBoundingClientRect(), tier=tiers[tierIndex];
    const dpr=Math.min(devicePixelRatio||1,tier.dpr,Math.sqrt(tier.pixels/Math.max(1,width*height)));
    // Keep a useful horizontal view on portrait phones; the orb fits when loud.
    camera.fov=width<height ? 74 : 54;
    camera.aspect=width/Math.max(1,height); camera.updateProjectionMatrix();
    if(store) { store.getState().setSize(width,height); store.getState().setDpr(dpr); }
    return {size:{width,height,top:0,left:0},dpr};
  }
  function changeQuality(value:Quality) {
    mode=value;
    const next=value==='auto'?(phone?0:2):['low','medium','high'].indexOf(value);
    if(next!==tierIndex){
      tierIndex=next; scene.remove(ocean.water); ocean.dispose();
      ocean=makeWater(tiers[tierIndex],blueGold,onFailure); scene.add(ocean.water);
    }
    resize();
  }
  function Frame() {
    const composer=useRef<Composer>(null);
    useEffect(()=>{const active=composer.current;return ()=>active?.dispose();},[]);
    useFrame(()=>{
      frameStart=performance.now();
      const dt=previous?frameStart-previous:0; previous=frameStart;
      if(dt>0 && dt<250){ intervals.push(dt); if(intervals.length>1200) intervals.shift(); }
      elapsed+=Math.min(dt,50)/1000*(reduced?.13:1);
      const reactive=reduced?{voice:0,ocean:0,music:0,voiceTone:.38}:audio;
      orb.update(elapsed,reactive,reduced,tiers[tierIndex].particles);
      ocean.update(elapsed,reactive.ocean,reduced);
      stars.update(elapsed,reactive.music,gl.getPixelRatio()); frames++;
      if(mode==='auto' && --cooldown<=0){
        const recent=intervals.slice(-120),mean=recent.reduce((a,b)=>a+b,0)/Math.max(1,recent.length);
        if(mean>21 && tierIndex>0) { changeQuality(tiers[tierIndex-1].name as Quality); mode='auto'; }
        cooldown=300;
      }
    },-1);
    useFrame(()=>{cpuTimes.push(performance.now()-frameStart);if(cpuTimes.length>1200)cpuTimes.shift();},2);
    return <EffectComposer ref={composer} multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={.2} luminanceSmoothing={.15} intensity={.38} levels={4} radius={.32}/>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/>
    </EffectComposer>;
  }
  const initial=resize()!;
  void root.configure({gl,scene,camera,frameloop:'always',...initial}).then(()=>{
    if(disposed){root.unmount();return;}
    store=root.render(<Frame/>);
  }).catch(onFailure);
  const restart=()=>{previous=0; store?.getState().setFrameloop(paused||document.hidden||lost?'never':'always');};
  const motionChange=()=>{reduced=motion.matches;};
  const contextLost=(event:Event)=>{event.preventDefault();lost=true;restart();};
  const contextRestored=()=>{lost=false;restart();};
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  document.addEventListener('visibilitychange',restart);motion.addEventListener('change',motionChange);
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  return {
    setQuality:changeQuality,
    setAudioLevels(value:SceneAudioLevels){audio={...value};},
    setPaused(value:boolean){paused=value;restart();},
    stats():SceneStats{return {frames,time:elapsed,quality:tiers[tierIndex].name,resolution:[canvas.width,canvas.height],
      reducedMotion:reduced,paused:paused||document.hidden,contextLost:lost,frameIntervals:[...intervals],renderCpuTimes:[...cpuTimes],
      audioLevel:audio.voice,oceanLevel:audio.ocean,musicLevel:audio.music,voiceTone:audio.voiceTone};},
    dispose(){disposed=true;observer.disconnect();root.unmount();orb.dispose();stars.dispose();ocean.dispose();
      document.removeEventListener('visibilitychange',restart);motion.removeEventListener('change',motionChange);
      canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
    },
  };
}
