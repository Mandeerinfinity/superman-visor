// WebGL2 vision pipeline v2: source (camera or demo Metropolis) -> mode pass (FBO ping-pong, echo/feedback)
// -> post pass (bloom via mips, lens dirt, chromatic aberration, grain, vignette, glitch, frost, shockwave, speed blur).
import { createCity } from './city.js';
const VS = `#version 300 es
in vec2 p;out vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const COMMON = `#version 300 es
precision mediump float;in vec2 vUv;out vec4 o;
float L(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
`;
const FS_MODE = COMMON + `
uniform sampler2D uTex,uPrev,uEcho;uniform int uMode;uniform vec2 uScale,uTexel,uCenter,uRes;
uniform float uZoom,uTime,uMirror,uFresh;uniform vec3 uTint,uBeam;uniform vec3 uK[4];uniform vec2 uEm[3];
vec2 mapUv(vec2 uv){uv=(uv-.5)/uZoom+uCenter;uv=(uv-.5)*uScale+.5;if(uMirror>.5)uv.x=1.-uv.x;return clamp(uv,0.,1.);}
vec3 S(vec2 uv){return texture(uTex,uv).rgb;}
vec3 thermal(float t){t=clamp(t,0.,1.)*5.;vec3 c0=vec3(0.,0.,.1),c1=vec3(.2,0.,.6),c2=vec3(.8,0.,.55),c3=vec3(1.,.28,0.),c4=vec3(1.,.82,.05),c5=vec3(1.,1.,.92);
 if(t<1.)return mix(c0,c1,t);if(t<2.)return mix(c1,c2,t-1.);if(t<3.)return mix(c2,c3,t-2.);if(t<4.)return mix(c3,c4,t-3.);return mix(c4,c5,t-4.);}
float sobel(vec2 uv,vec2 d){float tl=L(S(uv+vec2(-d.x,d.y))),t=L(S(uv+vec2(0.,d.y))),tr=L(S(uv+d)),l=L(S(uv-vec2(d.x,0.))),r=L(S(uv+vec2(d.x,0.))),
 bl=L(S(uv-d)),b=L(S(uv-vec2(0.,d.y))),br=L(S(uv+vec2(d.x,-d.y)));float gx=-tl-2.*l-bl+tr+2.*r+br,gy=-bl-2.*b-br+tl+2.*t+tr;return sqrt(gx*gx+gy*gy);}
vec3 blur(vec2 uv,vec2 d){return (S(uv)*4.+S(uv+vec2(d.x,0.))+S(uv-vec2(d.x,0.))+S(uv+vec2(0.,d.y))+S(uv-vec2(0.,d.y)))/8.;}
void main(){
 vec2 uv=mapUv(vUv);vec2 d=uTexel*1.5;vec3 c=S(uv);float l=L(c);vec3 col=c;vec2 asp=vec2(uRes.x/uRes.y,1.);
 vec2 sp=vUv*uRes;float vig=1.-smoothstep(.45,1.15,length((vUv-.5)*asp*1.6));
 float beamD=length((vUv-uBeam.xy)*asp);float bh=uBeam.z*exp(-beamD*beamD*180.);
 vec3 echo=texture(uEcho,vUv).rgb;
 if(uMode==0){col=c*1.06+vec3(-.01,.01,.04);col*=.95+.05*sin(sp.y*1.4);col=mix(col,uTint,.06*(1.-vig));}
 else if(uMode==1){vec3 bb=blur(uv,d*1.5);float t=pow(L(bb),.85)*1.05+.04*sin(uTime*2.+uv.y*20.)+bh*1.4;col=thermal(t);col*=.93+.07*sin(sp.y*.9-uTime*30.);}
 else if(uMode==2){float e=sobel(uv,d);float inv=1.-l;col=vec3(.02,.05,.14)+vec3(.3,.6,1.)*inv*.42+vec3(.6,.88,1.)*smoothstep(.12,1.1,e)*.75;
  vec2 g=abs(fract(sp/48.)-.5);col+=vec3(.1,.35,.6)*max(0.,1.-min(g.x,g.y)*90.)*.25;float sb=fract(uTime*.25);col+=vec3(.3,.7,1.)*exp(-pow((vUv.y-sb)*40.,2.))*.6;}
 else if(uMode==3){float ab=.004*length(vUv-.5);col=vec3(S(mapUv(vUv+vec2(ab,0.))).r,c.g,S(mapUv(vUv-vec2(ab,0.))).b);
  col=(col-.5)*1.12+.52;float r=length((vUv-.5)*asp);col*=smoothstep(.62,.52,r)*.75+.25;}
 else if(uMode==4){vec3 b=blur(uv,d);col=c+(c-b)*2.6;col=mix(col,vec3(L(col))*vec3(.85,1.,1.1),.35);col+=(hash(sp+fract(uTime)*91.)-.5)*.16;
  float sb=fract(uTime*.4);col+=vec3(.2,1.,.9)*exp(-pow((vUv.x-sb)*60.,2.))*.35;col*=1.-.25*step(.5,fract(sp.y*.25));}
 else if(uMode==5){vec3 b=blur(uv,d*2.);float g=pow(clamp(L(b)*2.4,0.,1.),.7);col=vec3(.12,1.,.72)*g+vec3(.6,1.,.9)*pow(g,6.)*.6;col+=(hash(sp*.5+uTime)-.5)*.12;col*=.9+.1*sin(sp.y*1.6);}
 else if(uMode==6){float e=sobel(uv,d);vec3 gold=vec3(1.,.78,.3);col=mix(c,vec3(l)*vec3(1.35,1.05,.55),.55)*1.12;
  col+=gold*smoothstep(.2,1.2,e)*(.35+.15*sin(uTime*4.));vec2 q=(vUv-.5)*asp;float a=atan(q.y,q.x);
  float rays=pow(.5+.5*sin(a*14.+uTime*1.5),8.)*smoothstep(.0,.6,length(q))*.16;col+=gold*rays+vec3(1.,.6,.2)*(1.-vig)*.35;}
 else if(uMode==7){ // near-infrared false colour: foliage/warm surfaces glow red-magenta, sky dark
  vec3 b=blur(uv,d);float ir=clamp(b.g*1.15+b.r*.55-b.b*.35,0.,1.);col=vec3(pow(ir,.8)*1.15,ir*ir*.5+b.r*.15,b.r*.35+.06);
  col+=vec3(1.,.25,.4)*smoothstep(.55,1.,ir)*.35;col*=.94+.06*sin(sp.y*1.2);}
 else if(uMode==8){ // ultraviolet: violet world, fluorescent whites & hidden patterns
  float e=sobel(uv,d);float fl=smoothstep(.55,.95,max(c.b,l));col=mix(vec3(.05,0.,.16),vec3(.48,.22,.95),pow(l,.9));
  col+=vec3(.55,1.,1.)*fl*.75+vec3(.8,.6,1.)*smoothstep(.15,1.,e)*.45;
  float hex=abs(sin(uv.x*uRes.x*.05+sin(uv.y*30.))*sin(uv.y*uRes.y*.04));col+=vec3(.3,.9,1.)*pow(hex,24.)*.25*l;}
 else if(uMode==9){ // electromagnetic: dim base + radio rings + wifi arcs + field noise
  vec3 base=vec3(L(blur(uv,d)))*vec3(.18,.26,.42);col=base;
  for(int i=0;i<3;i++){vec2 q=(vUv-uEm[i])*asp;float r=length(q);float f=float(i);
   float w=sin(r*90.-uTime*(6.+f*2.))*.5+.5;float ring=pow(w,10.)*exp(-r*2.2);
   vec3 hue=.5+.5*cos(6.283*(vec3(0.,.33,.67)+f*.27+r*1.5));col+=hue*ring*.85;col+=hue*exp(-r*r*900.)*1.5;}
  float fld=vnoise(vUv*asp*8.+vec2(uTime*.3,0.));col+=vec3(.1,.5,1.)*smoothstep(.48,.5,fld)*smoothstep(.52,.5,fld)*.7;
  col+=vec3(.2,.8,1.)*smoothstep(.15,1.,sobel(uv,d))*.25;}
 else if(uMode==10){ // motion vision: frame difference with decaying trails
  vec3 pv=texture(uPrev,uv).rgb;float m=smoothstep(.04,.25,length(c-pv))*uFresh;
  vec3 base=vec3(l)*vec3(.14,.2,.3);vec3 hot=mix(vec3(0.,1.,.85),vec3(1.,.2,.9),.5+.5*sin(uTime*2.+vUv.y*6.));
  col=max(base+hot*m,echo*vec3(.9,.92,.95)-.004);}
 else if(uMode==11){ // super speed: time echo / frame blending
  vec3 cur=c*1.08+vec3(.03,.01,-.02);vec3 e2=vec3(texture(uEcho,vUv+vec2(.003,0.)).r,echo.g,texture(uEcho,vUv-vec2(.003,0.)).b);
  col=mix(cur,e2,.84);col=mix(col,col*vec3(1.05,.98,1.12),.4);}
 else { // kryptonite detector
  float gdom=clamp((c.g-max(c.r,c.b))*3.,0.,1.);col=vec3(l)*vec3(.35,.75,.45)+vec3(.1,.9,.35)*gdom*(.6+.4*sin(uTime*6.));
  for(int i=0;i<4;i++){vec2 q=(vUv-uK[i].xy)*asp;float r=length(q);float k=uK[i].z;
   col+=vec3(.25,1.,.45)*k*(exp(-r*r*120.)*1.3+exp(-r*r*12.)*.35)*(.8+.2*sin(uTime*9.+float(i)));
   col+=vec3(.4,1.,.6)*k*pow(.5+.5*sin(r*120.-uTime*8.),16.)*exp(-r*5.)*.5;}
  col*=.92+.08*sin(sp.y*1.3);}
 col+=vec3(1.,.35,.08)*bh*1.6;
 col*=mix(.6,1.,vig);
 o=vec4(col,1.);}`;
const FS_POST = COMMON + `
uniform sampler2D uIn,uDirt;uniform int uTier;uniform vec2 uRes;uniform float uTime,uGlitch,uBlur,uWind,uFlash;uniform vec4 uFrost,uShock;
void main(){vec2 asp=vec2(uRes.x/uRes.y,1.);vec2 uv=vUv;
 if(uShock.w>0.){vec2 dd=(uv-uShock.xy)*asp;float r=length(dd);float k=exp(-pow((r-uShock.z)*14.,2.))*uShock.w;uv-=dd/(r+1e-4)/asp*k*.05;}
 if(uGlitch>0.){float row=floor(uv.y*36.);float h=hash(vec2(row,floor(uTime*24.)));if(h<uGlitch*.7)uv.x+=(hash(vec2(row,floor(uTime*24.)+3.))-.5)*.16*uGlitch;}
 if(uWind>0.){uv.x+=uWind*.008*sin(uv.y*38.+uTime*26.)*sin(uv.x*7.+uTime*4.);}
 vec3 col;vec2 dir=(uv-.5);
 if(uBlur>0.){vec3 a=vec3(0.);for(int i=0;i<8;i++){float s=1.-float(i)*.016*uBlur;a+=texture(uIn,dir*s+.5).rgb;}col=a/8.;}
 else if(uTier>=1||uGlitch>0.){float ca=.0035*dot(dir,dir)*4.+.012*uGlitch;col=vec3(texture(uIn,uv+dir*ca).r,texture(uIn,uv).g,texture(uIn,uv-dir*ca).b);}
 else col=texture(uIn,uv).rgb;
 if(uTier>=2){vec3 b=textureLod(uIn,uv,3.).rgb*.45+textureLod(uIn,uv,5.).rgb*.55;vec3 bl=max(b-.42,0.)*1.5;float dirt=texture(uDirt,vUv).r;col+=bl*(.55+dirt*2.2);}
 if(uFrost.w>0.){vec2 q=(vUv-uFrost.xy)*asp;float r=length(q);vec2 p=vUv*asp*9.;
  float n=vnoise(p)*.5+vnoise(p*2.1)*.3+vnoise(p*4.3)*.2;float ridge=1.-abs(vnoise(p*3.)*2.-1.);ridge=pow(ridge,6.);
  float a=atan(q.y,q.x);float spikes=vnoise(vec2(a*6.,r*4.))*.18;
  float cov=smoothstep(uFrost.z+.04,uFrost.z-.08,r+(n-.5)*.22-spikes)*uFrost.w;
  vec3 under=uTier>=2?textureLod(uIn,uv,2.).rgb:col;
  vec3 ice=mix(under*.55+vec3(.35,.55,.7),vec3(.92,.98,1.),ridge*.8+n*.15);
  float edge=smoothstep(.06,0.,abs(r+(n-.5)*.22-spikes-uFrost.z))*uFrost.w;
  col=mix(col,ice,cov*.82)+vec3(.7,.95,1.)*edge*.5;}
 float vig=1.-smoothstep(.55,1.25,length((vUv-.5)*asp*1.5));col*=mix(.72,1.,vig);
 if(uTier>=1){col+=(hash(vUv*uRes+fract(uTime*7.)*97.)-.5)*.045;}
 if(uGlitch>0.){col+=vec3(.2,.6,1.)*step(.985,hash(vec2(floor(vUv.y*80.),floor(uTime*30.))))*uGlitch;}
 col+=uFlash;
 o=vec4(col,1.);}`;

export function createVision(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 unavailable');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = (fs, names) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const U = {}; names.forEach(n => U[n] = gl.getUniformLocation(p, n)); return { p, U }; };
  const PM = prog(FS_MODE, ['uTex', 'uPrev', 'uEcho', 'uMode', 'uScale', 'uTexel', 'uCenter', 'uRes', 'uZoom', 'uTime', 'uMirror', 'uFresh', 'uTint', 'uBeam', 'uK', 'uEm']);
  const PP = prog(FS_POST, ['uIn', 'uDirt', 'uTier', 'uRes', 'uTime', 'uGlitch', 'uBlur', 'uWind', 'uFlash', 'uFrost', 'uShock']);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const mkTex = (mip) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const src = [mkTex(), mkTex()]; let si = 0, fresh = 1;
  src.forEach(t => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3)); });
  const fb = [0, 1].map(() => ({ t: mkTex(true), f: gl.createFramebuffer(), w: 0, h: 0 })); let fi = 0;
  // procedural lens dirt
  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dx = dc.getContext('2d'); dx.fillStyle = '#000'; dx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 26, g = dx.createRadialGradient(x, y, 0, x, y, r); const a = 0.08 + Math.random() * 0.25;
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.7, `rgba(255,255,255,${a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)'); dx.fillStyle = g; dx.beginPath();
    if (i % 4 === 0) { for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; dx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } } else dx.arc(x, y, r, 0, 7); dx.fill(); }
  dx.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 12; i++) { dx.lineWidth = 1 + Math.random() * 2; dx.beginPath(); dx.moveTo(Math.random() * 256, Math.random() * 256); dx.quadraticCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256); dx.stroke(); }
  const dirt = mkTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dc);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  let stream = null, facing = 'environment', lastVT = -1;
  const city = createCity();
  const K = new Float32Array(12), EM = new Float32Array([0.22, 0.72, 0.78, 0.62, 0.5, 0.18]);

  const v = {
    gl, canvas, video, city, mode: 0, zoom: 1, center: [0.5, 0.5], tint: [0.12, 0.42, 1], beam: [0.5, 0.5, 0], live: false, facing, tier: 2,
    fx: { glitch: 0, blur: 0, wind: 0, flash: 0, frost: [0.5, 0.5, 0, 0], shock: [0.5, 0.5, 0, 0] },
    kryp: [], // [{x,y,s}] screen uv (y up)
    async startCamera(f = facing) {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable (needs HTTPS)');
      v.stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: f }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false });
      facing = v.facing = f; video.srcObject = stream; await video.play(); v.live = true; lastVT = -1;
    },
    stopCamera() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.live = false; },
    async flip() { return v.startCamera(facing === 'environment' ? 'user' : 'environment'); },
    resize(scale) {
      const dpr = Math.min(2, devicePixelRatio || 1) * scale, w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      city.resize(canvas.clientWidth, canvas.clientHeight);
    },
    get srcW() { return v.live ? video.videoWidth : city.cv.width; }, get srcH() { return v.live ? video.videoHeight : city.cv.height; },
    render(t, ctxInfo) {
      const W = canvas.width, H = canvas.height; let sw, sh2, newFrame = false;
      if (v.live && video.readyState >= 2 && video.videoWidth) {
        sw = video.videoWidth; sh2 = video.videoHeight;
        if (video.currentTime !== lastVT) { si ^= 1; gl.bindTexture(gl.TEXTURE_2D, src[si]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); lastVT = video.currentTime; newFrame = true; }
      } else {
        city.draw(t, ctxInfo); sw = city.cv.width; sh2 = city.cv.height; si ^= 1;
        gl.bindTexture(gl.TEXTURE_2D, src[si]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, city.cv); newFrame = true;
      }
      fresh = newFrame ? 1 : fresh * 0.5;
      // ensure FBOs
      fb.forEach(F => { if (F.w !== W || F.h !== H) { F.w = W; F.h = H; gl.bindTexture(gl.TEXTURE_2D, F.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, F.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, F.t, 0); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } });
      const ca = W / H, sa = sw / sh2; let sx = 1, sy = 1; if (sa > ca) sx = ca / sa; else sy = sa / ca;
      v.cover = [sx, sy];
      const cur = fb[fi], prev = fb[fi ^ 1];
      // pass 1: mode
      gl.bindFramebuffer(gl.FRAMEBUFFER, cur.f); gl.viewport(0, 0, W, H); gl.useProgram(PM.p); const U = PM.U;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src[si]); gl.uniform1i(U.uTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src[si ^ 1]); gl.uniform1i(U.uPrev, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, prev.t); gl.uniform1i(U.uEcho, 2);
      gl.uniform1i(U.uMode, v.mode); gl.uniform2f(U.uScale, sx, sy); gl.uniform2f(U.uTexel, 1 / sw, 1 / sh2);
      gl.uniform2f(U.uCenter, v.center[0], v.center[1]); gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uZoom, v.zoom);
      gl.uniform1f(U.uTime, (t / 1000) % 1000); gl.uniform1f(U.uMirror, v.live && facing === 'user' ? 1 : 0); gl.uniform1f(U.uFresh, fresh);
      gl.uniform3fv(U.uTint, v.tint); gl.uniform3fv(U.uBeam, v.beam);
      K.fill(0); v.kryp.slice(0, 4).forEach((k, i) => K.set([k.x, k.y, k.s], i * 3)); gl.uniform3fv(U.uK, K); gl.uniform2fv(U.uEm, EM);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // pass 2: post
      const f = v.fx, needMip = v.tier >= 2;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cur.t); if (needMip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, needMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(PP.p); const P = PP.U;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cur.t); gl.uniform1i(P.uIn, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dirt); gl.uniform1i(P.uDirt, 1);
      gl.uniform1i(P.uTier, v.tier); gl.uniform2f(P.uRes, W, H); gl.uniform1f(P.uTime, (t / 1000) % 1000);
      gl.uniform1f(P.uGlitch, f.glitch); gl.uniform1f(P.uBlur, f.blur); gl.uniform1f(P.uWind, f.wind); gl.uniform1f(P.uFlash, f.flash);
      gl.uniform4fv(P.uFrost, f.frost); gl.uniform4fv(P.uShock, f.shock);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      fi ^= 1;
    }
  };
  return v;
}
