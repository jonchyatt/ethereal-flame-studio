precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uQuality;
uniform float uFalls;
uniform sampler2D uNoise;
varying vec2 vUv;

#define PI 3.14159265359

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return texture2D(uNoise, (i + f + .5)/256.).r;
}
float fbm(vec2 p) {
  float s = 0., a = .54;
  mat2 turn = mat2(.8, .6, -.6, .8);
  for (int i=0; i<6; i++) {
    if (float(i) > uQuality + 2.) break;
    s += a * noise(p);
    p = turn*p*2.03 + 11.7;
    a *= .48;
  }
  return s;
}
vec3 rainbow(float x) {
  return pow(.5 + .5*cos(6.28318*(x + vec3(.02, .69, .36))), vec3(2.0));
}
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 d = b-a;
  return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));
}

// Clouds are lit density layers, not a photograph or a video texture.
vec3 nebula(vec2 p, bool detail) {
  float t = uTime*.014;
  vec2 q = p*vec2(2.2,2.7);
  float warp = fbm(q*.85 + vec2(t,-t*.4));
  float n = fbm(q*2.3 + warp*2.4 + vec2(-t*.7,t));
  float arch = p.y - (.23 + .43*pow(abs(p.x), .72));
  float mass = exp(-abs(arch)*4.6);
  float density = smoothstep(.25,.77,n)*mass;
  vec3 shade = mix(vec3(.035,.025,.105),vec3(.38,.035,.22),smoothstep(.25,.7,warp));
  vec3 gold = vec3(1.3,.46,.10);
  float rim = pow(max(0.,n-.36)*2.4,3.)*mass;
  vec3 c = vec3(.004,.007,.022) + shade*density*.78;
  c += mix(vec3(.65,.035,.38),gold,smoothstep(.42,.65,warp))*rim*.65;
  // Nearer, opaque banks with a warm, back-lit edge.
  float bank = .12 + .25*abs(p.x) + (fbm(q*3.1+vec2(t,4.))-.5)*.25;
  float edge = p.y-bank;
  float cloud = smoothstep(.05,-.07,edge)*smoothstep(.10,.38,abs(p.x));
  c = mix(c, vec3(.014,.012,.033)+vec3(.09,.035,.065)*n, cloud*.85);
  c += vec3(.58,.23,.11)*exp(-abs(edge)*65.)*smoothstep(.1,.5,abs(p.x))*(.25+n)*.25;
  c += vec3(.34,.12,.16)*exp(-max(p.y,0.)*22.)*.5;
  if(detail) {
    // Overlapping billows with a noisy silhouette and backlit surface relief.
    float bankWeight=0.;
    vec3 weightedNormal=vec3(0.);
    for(int i=0;i<7;i++) {
      float fi=float(i);
      vec2 center=vec2(.36+fi*.137,.15+fi*.065+sin(fi*4.+sign(p.x))*.035);
      float rad=.095+fi*.018;
      vec2 delta=vec2(abs(p.x),p.y)-center;
      float distance=length(delta)-rad;
      float weight=exp(-distance*32.);
      float z=sqrt(max(.01,1.-dot(delta,delta)/(rad*rad)));
      weightedNormal+=normalize(vec3(delta/rad,z))*weight;
      bankWeight+=weight;
    }
    float surface=fbm(p*39.+vec2(t,-t*.4));
    float bankDistance=-log(bankWeight)/32.+(surface-.5)*.075;
    float coverage=smoothstep(.014,-.012,bankDistance);
    vec3 normal=normalize(weightedNormal);
    float lighting=max(0.,dot(normal,normalize(vec3(-.6,.7,.5))));
    vec3 bankColor=vec3(.018,.016,.04)+vec3(.072,.035,.09)*lighting*(.35+surface);
    float backlight=exp(-abs(bankDistance)*90.)*(.2+.8*lighting);
    bankColor+=vec3(.50,.21,.10)*backlight*.6;
    c=mix(c,bankColor,coverage*.96);
    cloud=max(cloud,coverage);
  }
  if(detail) {
    for(int layer=0;layer<2;layer++) {
      float scale = layer==0 ? 95. : 171.;
      vec2 cell = floor(p*scale), f = fract(p*scale);
      float h = hash(cell+float(layer)*31.);
      vec2 center = vec2(hash(cell+1.7),hash(cell+9.2))*.7+.15;
      float d = length(f-center);
      float twinkle = .65+.35*sin(uTime*(.35+h)+h*100.);
      float star = exp(-d*d*(layer==0?600.:1000.))*step(.91,h)*twinkle;
      vec3 tint = mix(vec3(.40,.65,1.),vec3(1.,.68,.31),hash(cell+8.));
      c += tint*star*(layer==0?1.4:.6)*(1.-cloud*.9);
      if(layer==0) {
        float cross = exp(-abs(f.x-center.x)*100.)*exp(-abs(f.y-center.y)*13.);
        cross += exp(-abs(f.y-center.y)*100.)*exp(-abs(f.x-center.x)*13.);
        c += tint*cross*step(.993,h)*twinkle*.7;
      }
    }
    vec2 cp = p;
    cp.x = abs(cp.x);
    vec2 a=vec2(.43,.43),b=vec2(.59,.67),d=vec2(.79,.53),e=vec2(.91,.79);
    float line=min(segment(cp,a,b),min(segment(cp,b,d),segment(cp,d,e)));
    float draw = smoothstep(-.8,.7,sin(uTime*.10 + cp.x*3.));
    c += vec3(.23,.32,.52)*exp(-line*1100.)*draw*.045;
  }
  return c;
}

vec3 orb(vec2 p) {
  vec2 q = p-vec2(0.,.205);
  float r = length(q), angle=atan(q.y,q.x), radius=.105;
  float breath = 1.+.045*sin(uTime*.55);
  vec3 c = vec3(1.,.32,.055)*exp(-r*r*75.)*.34;
  c += vec3(.015,.63,.78)*exp(-pow((r-.124)/.018,2.))*.58;
  float corona = .126 + .003*sin(angle*9.+uTime*.21) + .003*sin(angle*17.-uTime*.14);
  c += vec3(.10,1.1,1.3)*exp(-abs(r-corona)*650.)*.46;
  float body = smoothstep(radius+.002,radius-.002,r);
  float turbulence = fbm(q*95.+vec2(uTime*.075,angle*.35));
  vec3 shell = mix(vec3(.75,.14,.018),vec3(2.2,.87,.12),turbulence);
  shell += vec3(3.5,2.1,.68)*exp(-r*r*650.);
  shell += vec3(1.8,.60,.07)*pow(.5+.5*sin(r*420.+turbulence*8.-uTime*.18),9.)*.33;
  c += shell*body*breath;
  c += vec3(1.5,.65,.1)*exp(-abs(r-radius)*750.);
  return c;
}

// Multi-direction deep-water dispersion. Analytic derivatives avoid four
// extra height-field evaluations per pixel. Fine octaves are normal detail.
vec3 waves(vec2 p, float t, bool falls) {
  float height=0.; vec2 slope=vec2(0.);
  float amplitude=.054, frequency=.55;
  for(int i=0;i<12;i++) {
    if(float(i)>5.+uQuality*2.) break;
    float fi=float(i), angle=fi*2.39996+.4;
    vec2 d=vec2(cos(angle),sin(angle));
    float phase=dot(d,p)*frequency-sqrt(9.81*frequency)*t*.48+fi*1.37;
    height += amplitude*sin(phase);
    slope += amplitude*frequency*d*cos(phase);
    frequency *= 1.72;
    amplitude *= .51;
  }
  if(falls) {
    for(int i=0;i<5;i++) {
      float fi=float(i);
      vec2 delta=p-vec2((fi-2.)*2.0,8.+sin(fi*7.)*.7);
      float r=length(delta), phase=r*14.-t*4.5-fi;
      float amp=.011*exp(-r*.22);
      height+=sin(phase)*amp;
      slope+=delta/max(.1,r)*cos(phase)*amp*14.;
    }
  }
  return vec3(height,slope);
}

float streamMask(float x, float y, float t) {
  float cell=floor((x+1.)*103.);
  float seed=hash(vec2(cell,5.));
  float center=(cell+.18+.64*seed)/103.-1.;
  center+=sin(y*14.+seed*70.+t*.23)*.00065;
  float filamentWidth=.0005+seed*.0007;
  float width=max(filamentWidth,fwidth(x)*.65);
  float d=abs(x-center);
  float bead=.52+.48*pow(.5+.5*sin(y*(75.+seed*90.)+t*(8.+seed*16.)+seed*90.),3.);
  return (exp(-d*d/(width*width))*filamentWidth/width*1.1+exp(-d*180.)*.07)*bead*step(.20,seed)*(.35+seed*.9);
}

vec3 fallingLight(vec2 p) {
  float t=uTime;
  float width=.53;
  float edge=smoothstep(width,width-.055,abs(p.x));
  float bottom=.014, top=.96;
  float ends=smoothstep(bottom-.006,bottom+.04,p.y)*smoothstep(top,top-.08,p.y);
  vec3 color=rainbow(p.x*1.65+.24);
  color=mix(color,vec3(.65,.85,1.),.035);
  float strands=streamMask(p.x,p.y,t);
  float veil=(.5+.5*sin(p.x*139.+sin(p.y*4.-t*.6)*.25))*.026;
  vec3 c=color*(strands+veil)*ends*edge*1.5;
  // The impact is a soft pool of light, with individual ballistic spray beads.
  float impact=exp(-pow((p.y-bottom)/.016,2.));
  c+=color*impact*edge*(.22+.6*noise(vec2(p.x*70.,t*1.5)));
  c+=color*exp(-abs(p.y-bottom)*27.)*edge*.055;
  vec2 sp=vec2(p.x*142.,(p.y-bottom)*160.);
  vec2 id=floor(sp); float seed=hash(id+17.);
  vec2 f=fract(sp)-.5;
  f.y+=sin(t*(1.+seed)*1.7+seed*100.)*.35;
  float spray=exp(-dot(f,f)*100.)*step(.81,seed)*exp(-max(p.y-bottom,0.)*35.);
  c+=color*spray*edge*step(bottom,p.y)*.8;
  return c;
}

vec3 storm(vec2 p) {
  float t=uTime*.035;
  vec2 q=(p-vec2(0.,1.045))/vec2(.63,.16);
  float n=fbm(q*3.+vec2(t,-t*.4));
  float d=length(q)+.34*(n-.5);
  float cloud=smoothstep(1.06,.76,d);
  float form=fbm(q*7.+n*2.+vec2(t*.4,5.));
  vec3 c=mix(vec3(.004,.009,.021),vec3(.055,.058,.12),form)*cloud;
  vec3 edge=vec3(0.);
  float a=atan(q.y,q.x);
  for(int i=0;i<4;i++) {
    float fi=float(i);
    float curl=.07*sin(a*8.+n*7.+t+fi*.7)+.035*sin(a*17.-t);
    float ring=abs(d-(.89+fi*.045+curl));
    float line=exp(-ring*180.)+exp(-ring*30.)*.14;
    float underside=.35+.65*smoothstep(.45,-.4,q.y);
    edge+=rainbow(a*.18+fi*.12+t*.03)*line*underside*.85;
  }
  c+=edge;
  c+=vec3(.08,.055,.19)*cloud*max(0.,form-.48)*2.;
  // Small curls break the silhouette of the bank at both ends.
  vec2 curlp=vec2(abs(p.x)-.59,p.y-1.025);
  float cr=length(curlp),ca=atan(curlp.y,curlp.x);
  float spiral=abs(sin(cr*95.-ca*2.+t));
  c+=rainbow(ca*.14+cr*2.)*exp(-spiral*20.)*exp(-cr*19.)*.14;
  return c;
}

vec3 sideSmoke(vec2 p) {
  float t=uTime*.065;
  vec2 q=vec2(abs(p.x)*4.,p.y*3.);
  float warp=fbm(q+vec2(t,-t));
  float n=fbm(q*3.+warp*3.-vec2(0.,t*1.6));
  float w=.68+.07*sin(p.y*10.+warp*4.);
  float shape=exp(-pow((abs(p.x)-w)/.14,2.));
  shape*=smoothstep(-.03,.12,p.y)*smoothstep(1.2,.3,p.y);
  float density=smoothstep(.28,.74,n)*shape;
  vec3 color=rainbow(p.y*.7+sign(p.x)*.17+t*.035);
  return color*density*.12 + vec3(.012,.013,.03)*density;
}

vec3 ocean(vec2 screen, vec2 p, float horizon, bool falls) {
  // Eye at 1.8m, looking along +Z. Intersect and refine the wave surface.
  vec3 eye=vec3(0.,1.8,0.);
  vec3 ray=normalize(vec3(screen.x,screen.y-horizon,1.35));
  float travel=min(700.,-eye.y/min(ray.y,-.001));
  vec3 pos=eye+ray*travel;
  vec3 wave=waves(pos.xz,uTime,falls);
  travel=(wave.x-eye.y)/min(ray.y,-.001);
  pos=eye+ray*travel;
  wave=waves(pos.xz,uTime,falls);
  vec3 N=normalize(vec3(-wave.y,1.,-wave.z));
  vec3 V=-ray;
  float NoV=max(.001,dot(N,V));
  float fresnel=.0204+.9796*pow(1.-NoV,5.);
  vec3 R=reflect(ray,N);
  vec2 reflected=vec2(R.x,abs(R.y))/max(.15,R.z)*1.35;
  vec3 sky=nebula(reflected,false);
  vec3 c=vec3(.005,.014,.025)*(1.-fresnel)+sky*fresnel*.75;
  if(!falls) {
    vec3 L=normalize(vec3(0.,.205,1.35));
    vec3 H=normalize(V+L);
    float NoH=max(0.,dot(N,H)), NoL=max(.001,dot(N,L));
    // GGX distribution + Smith masking, dielectric F0 of sea water.
    float roughness=.105, a2=pow(roughness,4.);
    float denom=NoH*NoH*(a2-1.)+1.;
    float D=a2/(PI*denom*denom);
    float k=pow(roughness+1.,2.)/8.;
    float G=NoV/(NoV*(1.-k)+k)*NoL/(NoL*(1.-k)+k);
    float F=.0204+.9796*pow(1.-max(0.,dot(V,H)),5.);
    float spec=D*G*F/max(.001,4.*NoV*NoL);
    c+=vec3(1.,.63,.22)*spec*NoL*3.5;
    // Finite angular orb reflected in the resolved surface. Broad halo and
    // microfacet highlights make a continuous but broken path to the camera.
    float angular=length(reflected-vec2(0.,.205));
    c+=vec3(1.4,.63,.17)*exp(-angular*angular/ .008)*fresnel*1.5;
    c+=vec3(.025,.23,.30)*exp(-pow((angular-.13)/.04,2.))*fresnel*.3;
  } else {
    // Perspective-compressed mirror image, distorted by the same wave normals.
    float depth=(horizon-screen.y);
    vec2 mirror=vec2(p.x+wave.y*.19,depth*2.5+wave.z*.10);
    float breakup=.35+.65*smoothstep(-.15,.12,wave.z);
    c=vec3(.002,.007,.014)+fallingLight(mirror)*breakup*.48;
    c+=storm(vec2(mirror.x,.95+depth*.3))*.055;
    c+=rainbow(mirror.x*1.65+.24)*exp(-depth*6.)*smoothstep(.57,.48,abs(mirror.x))*.05;
    c*=.55+.45*fresnel;
  }
  float fog=1.-exp(-travel*.006);
  vec3 horizonColor=falls?vec3(.006,.014,.023):vec3(.13,.065,.12);
  return mix(c,horizonColor,fog*.7);
}

void main() {
  float aspect=uResolution.x/uResolution.y;
  // Portrait retains the scene's full width; landscape reveals more sky/sea.
  float scale=mix(1.65,1.13,smoothstep(.6,1.5,aspect));
  vec2 screen=(vUv-.5)*vec2(aspect,1.)*scale;
  bool falls=uFalls>.5;
  float horizon=falls?-.28*scale:-.15*scale;
  vec2 p=vec2(screen.x,screen.y-horizon);
  if(falls) {
    float composition=aspect<1.? 1.65/(aspect*scale):1.62/scale;
    p.x*=composition;
    // Keep both the crown and impact pool in frame on either orientation.
    p.y=(vUv.y-.22)*1.62;
  }
  vec3 c;
  if(screen.y<horizon) c=ocean(screen,p,horizon,falls);
  else if(falls) c=vec3(.002,.005,.012)+sideSmoke(p)+fallingLight(p)+storm(p);
  else c=nebula(p,true)+orb(p);
  // Filmic shoulder preserves gold and cyan around emissive whites.
  c=max(vec3(0.),c);
  c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);
  c=pow(clamp(c,0.,1.),vec3(1./2.2));
  float vignette=1.-.20*pow(length((vUv-.5)*vec2(1.,.8)),1.6);
  c*=vignette;
  c+=(hash(gl_FragCoord.xy+fract(uTime)*67.)-.5)/650.;
  gl_FragColor=vec4(c,1.);
}
