// WebGL vision pipeline: live camera (or demo Metropolis canvas) -> fragment shader modes.
const VS = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FS = `precision mediump float;
varying vec2 vUv;uniform sampler2D uTex;uniform int uMode;uniform vec2 uScale,uTexel,uCenter,uRes;
uniform float uZoom,uTime,uMirror;uniform vec3 uTint,uBeam;
float L(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec2 mapUv(vec2 uv){uv=(uv-.5)/uZoom+uCenter;uv=(uv-.5)*uScale+.5;if(uMirror>.5)uv.x=1.-uv.x;return clamp(uv,0.,1.);}
vec3 S(vec2 uv){return texture2D(uTex,uv).rgb;}
vec3 thermal(float t){t=clamp(t,0.,1.)*5.;
 vec3 c0=vec3(0.,0.,.1),c1=vec3(.2,0.,.6),c2=vec3(.8,0.,.55),c3=vec3(1.,.28,0.),c4=vec3(1.,.82,.05),c5=vec3(1.,1.,.92);
 if(t<1.)return mix(c0,c1,t);if(t<2.)return mix(c1,c2,t-1.);if(t<3.)return mix(c2,c3,t-2.);if(t<4.)return mix(c3,c4,t-3.);return mix(c4,c5,t-4.);}
float sobel(vec2 uv,vec2 d){
 float tl=L(S(uv+vec2(-d.x,d.y))),t=L(S(uv+vec2(0.,d.y))),tr=L(S(uv+d)),l=L(S(uv-vec2(d.x,0.))),r=L(S(uv+vec2(d.x,0.))),
 bl=L(S(uv-d)),b=L(S(uv-vec2(0.,d.y))),br=L(S(uv+vec2(d.x,-d.y)));
 float gx=-tl-2.*l-bl+tr+2.*r+br,gy=-bl-2.*b-br+tl+2.*t+tr;return sqrt(gx*gx+gy*gy);}
vec3 blur(vec2 uv,vec2 d){return (S(uv)*4.+S(uv+vec2(d.x,0.))+S(uv-vec2(d.x,0.))+S(uv+vec2(0.,d.y))+S(uv-vec2(0.,d.y)))/8.;}
void main(){
 vec2 uv=mapUv(vUv);vec2 d=uTexel*1.5;vec3 c=S(uv);float l=L(c);vec3 col=c;
 vec2 sp=vUv*uRes;float vig=1.-smoothstep(.45,1.15,length((vUv-.5)*vec2(uRes.x/uRes.y,1.)*1.6));
 float beamD=length((vUv-uBeam.xy)*vec2(uRes.x/uRes.y,1.));float bh=uBeam.z*exp(-beamD*beamD*180.);
 if(uMode==0){col=c*1.06+vec3(-.01,.01,.04);col*=.94+.06*sin(sp.y*1.4);col=mix(col,uTint,.06*(1.-vig));}
 else if(uMode==1){vec3 bb=blur(uv,d*1.5);float t=pow(L(bb),.85)*1.05+.04*sin(uTime*2.+uv.y*20.)+bh*1.4;
  col=thermal(t);col*=.93+.07*sin(sp.y*.9-uTime*30.);}
 else if(uMode==2){float e=sobel(uv,d);float inv=1.-l;
  col=vec3(.02,.05,.14)+vec3(.3,.6,1.)*inv*.42+vec3(.6,.88,1.)*smoothstep(.12,1.1,e)*.75;
  vec2 g=abs(fract(sp/48.)-.5);float grid=1.-smoothstep(0.,.02*48./48.,min(g.x,g.y)-.48);col+=vec3(.1,.35,.6)*max(0.,1.-min(g.x,g.y)*90.)*.25;
  float sb=fract(uTime*.25);col+=vec3(.3,.7,1.)*exp(-pow((vUv.y-sb)*40.,2.))*.6;}
 else if(uMode==3){float ab=.004*length(vUv-.5);col=vec3(S(mapUv(vUv+vec2(ab,0.))).r,c.g,S(mapUv(vUv-vec2(ab,0.))).b);
  col=(col-.5)*1.12+.52;float r=length((vUv-.5)*vec2(uRes.x/uRes.y,1.));col*=smoothstep(.62,.52,r)*.75+.25;}
 else if(uMode==4){vec3 b=blur(uv,d);col=c+(c-b)*2.6;col=mix(col,vec3(L(col))*vec3(.85,1.,1.1),.35);
  col+=(hash(sp+fract(uTime)*91.)-.5)*.16;float sb=fract(uTime*.4);col+=vec3(.2,1.,.9)*exp(-pow((vUv.x-sb)*60.,2.))*.35;
  col*=1.-.25*step(.5,fract(sp.y*.25));}
 else if(uMode==5){vec3 b=blur(uv,d*2.);float g=pow(clamp(L(b)*2.4,0.,1.),.7);
  col=vec3(.12,1.,.72)*g+vec3(.6,1.,.9)*pow(g,6.)*.6;col+=(hash(sp*.5+uTime)-.5)*.12;col*=.9+.1*sin(sp.y*1.6);}
 else{float e=sobel(uv,d);vec3 gold=vec3(1.,.78,.3);col=mix(c,vec3(l)*vec3(1.35,1.05,.55),.55)*1.12;
  col+=gold*smoothstep(.2,1.2,e)*(.35+.15*sin(uTime*4.));vec2 q=(vUv-.5)*vec2(uRes.x/uRes.y,1.);float a=atan(q.y,q.x);
  float rays=pow(.5+.5*sin(a*14.+uTime*1.5),8.)*smoothstep(.0,.6,length(q))*.16;col+=gold*rays+vec3(1.,.6,.2)*(1.-vig)*.35;}
 col+=vec3(1.,.35,.08)*bh*1.6;
 col*=mix(.55,1.,vig);
 gl_FragColor=vec4(col,1.);}`;

export function createVision(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL unavailable');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uTex', 'uMode', 'uScale', 'uTexel', 'uCenter', 'uRes', 'uZoom', 'uTime', 'uMirror', 'uTint', 'uBeam'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(U.uTex, 0);

  const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  let stream = null, facing = 'environment', lastVT = -1;
  const demo = createDemoCity();

  const v = {
    gl, canvas, mode: 0, zoom: 1, center: [0.5, 0.5], tint: [0.12, 0.42, 1], beam: [0.5, 0.5, 0], live: false, facing,
    async startCamera(f = facing) {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable (needs HTTPS)');
      v.stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: f }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false });
      facing = v.facing = f; video.srcObject = stream; await video.play(); v.live = true; lastVT = -1;
    },
    stopCamera() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.live = false; },
    async flip() { return v.startCamera(facing === 'environment' ? 'user' : 'environment'); },
    resize(scale) {
      const dpr = Math.min(2, devicePixelRatio || 1) * scale, w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      demo.resize(canvas.clientWidth, canvas.clientHeight);
    },
    render(t) {
      const W = canvas.width, H = canvas.height; let sw, sh2;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (v.live && video.readyState >= 2 && video.videoWidth) {
        sw = video.videoWidth; sh2 = video.videoHeight;
        if (video.currentTime !== lastVT) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); lastVT = video.currentTime; } // upload only new frames
      } else {
        demo.draw(t); sw = demo.cv.width; sh2 = demo.cv.height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, demo.cv);
      }
      // cover fit
      const ca = W / H, sa = sw / sh2; let sx = 1, sy = 1; if (sa > ca) sx = ca / sa; else sy = sa / ca;
      gl.viewport(0, 0, W, H);
      gl.uniform1i(U.uMode, v.mode); gl.uniform2f(U.uScale, sx, sy); gl.uniform2f(U.uTexel, 1 / sw, 1 / sh2);
      gl.uniform2f(U.uCenter, v.center[0], v.center[1]); gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uZoom, v.zoom);
      gl.uniform1f(U.uTime, t / 1000); gl.uniform1f(U.uMirror, v.live && facing === 'user' ? 1 : 0);
      gl.uniform3fv(U.uTint, v.tint); gl.uniform3fv(U.uBeam, v.beam);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  return v;
}

// ---------- Animated demo Metropolis (canvas 2D, low-res, uploaded as texture) ----------
function createDemoCity() {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, layers = [], stars = [], lights = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function building(c, x, w, h, base, col, winCol, density, globe) {
    c.fillStyle = col; c.fillRect(x, base - h, w, h);
    // setbacks / spire
    if (Math.random() < 0.5) { c.fillRect(x + w * 0.2, base - h - h * 0.12, w * 0.6, h * 0.12); }
    if (Math.random() < 0.35) { c.fillRect(x + w * 0.47, base - h - h * 0.3, Math.max(1, w * 0.06), h * 0.3); lights.push({ x: x + w * 0.5, y: base - h - h * 0.3, ph: Math.random() * 6, layer: layers.length }); }
    // edge highlight
    c.fillStyle = 'rgba(140,180,255,.12)'; c.fillRect(x, base - h, Math.max(1, w * 0.06), h);
    const ww = Math.max(1.5, w / 13), wh = Math.max(1.5, ww * 1.15);
    for (let yy = base - h + 4; yy < base - 3; yy += wh * 1.9) for (let xx = x + 3; xx < x + w - 3; xx += ww * 1.8) {
      if (Math.random() < density) { c.fillStyle = Math.random() < 0.15 ? '#cfe8ff' : winCol; c.globalAlpha = rnd(0.45, 1); c.fillRect(xx, yy, ww, wh); }
    }
    c.globalAlpha = 1;
    if (globe) { // original ringed-globe rooftop ornament
      const gx = x + w / 2, gy = base - h - w * 0.55, r = w * 0.42;
      c.fillStyle = col; c.fillRect(gx - w * 0.15, gy, w * 0.3, w * 0.55);
      const g = c.createRadialGradient(gx - r * 0.3, gy - r * 0.3, 1, gx, gy, r); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#e0a930'); g.addColorStop(1, '#6b4206');
      c.fillStyle = g; c.beginPath(); c.arc(gx, gy, r, 0, 7); c.fill();
      c.strokeStyle = '#ffe9a8'; c.lineWidth = Math.max(1, r * 0.12); c.beginPath(); c.ellipse(gx, gy, r * 1.5, r * 0.4, -0.25, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(120,70,0,.7)'; c.lineWidth = 1; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(gx, gy, r * Math.cos(k * 0.5) * 0.98, r, 0, 0, 7); c.stroke(); }
    }
  }
  function build() {
    layers = []; lights = [];
    const defs = [
      { h: [0.18, 0.42], w: [0.06, 0.12], col: '#16224a', win: '#5f7fc8', d: 0.16, base: 0.74 },
      { h: [0.25, 0.6], w: [0.09, 0.16], col: '#0d1636', win: '#ffd27a', d: 0.22, base: 0.82 },
      { h: [0.3, 0.75], w: [0.14, 0.24], col: '#070c20', win: '#ffc457', d: 0.28, base: 0.92 }
    ];
    defs.forEach((d, li) => {
      const lc = document.createElement('canvas'); lc.width = W * 2; lc.height = H; const c = lc.getContext('2d');
      let x = -10, gi = li === 1 ? Math.floor(rnd(3, 6)) : -1, n = 0;
      while (x < lc.width) { const w = rnd(...d.w) * W, h = rnd(...d.h) * H; building(c, x, w, h, d.base * H, d.col, d.win, d.d, n === gi || (li === 1 && n === gi + 9)); x += w + rnd(-0.01, 0.02) * W; n++; }
      c.fillStyle = d.col; c.fillRect(0, d.base * H, lc.width, H);
      layers.push({ cv: lc, speed: [0.4, 1, 2.2][li] });
    });
    stars = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.5, a: Math.random() }));
  }
  const cars = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), lane: i % 2, sp: rnd(0.05, 0.12) }));
  const flyers = Array.from({ length: 4 }, () => ({ x: Math.random(), y: rnd(0.12, 0.4), sp: rnd(0.02, 0.05), dir: Math.random() < 0.5 ? 1 : -1 }));
  return {
    cv,
    resize(cw, ch) {
      const w = 480, h = Math.round(480 * ch / cw) || 900;
      if (w === W && h === H) return; W = cv.width = w; H = cv.height = h; build();
    },
    draw(t) {
      const T = t / 1000;
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#040a24'); g.addColorStop(0.45, '#1a2a6c'); g.addColorStop(0.68, '#b03a5b'); g.addColorStop(0.82, '#ff9a4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(T + s.a * 9))})`; ctx.fillRect(s.x, s.y, 1, 1); }
      // sun disc low on horizon (hot spot for thermal)
      g = ctx.createRadialGradient(W * 0.7, H * 0.7, 2, W * 0.7, H * 0.7, W * 0.35); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.15, 'rgba(255,190,90,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.3, W, H * 0.7);
      // searchlights
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const bx = W * (0.2 + i * 0.3), a = -Math.PI / 2 + Math.sin(T * 0.5 + i * 2) * 0.5;
        ctx.save(); ctx.translate(bx, H * 0.8); ctx.rotate(a);
        const sg = ctx.createLinearGradient(0, 0, H, 0); sg.addColorStop(0, 'rgba(200,230,255,.35)'); sg.addColorStop(1, 'rgba(200,230,255,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H, -H * 0.06); ctx.lineTo(H, H * 0.06); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      layers.forEach((L, li) => {
        const off = (T * L.speed * 3) % W;
        ctx.drawImage(L.cv, -off, 0);
        if (li === 0) {
          // flying traffic between far and mid
          for (const f of flyers) { f.x += f.sp * f.dir / 60; if (f.x > 1.1) f.x = -0.1; if (f.x < -0.1) f.x = 1.1;
            ctx.fillStyle = '#fff'; ctx.fillRect(f.x * W, f.y * H, 3, 1.5); ctx.fillStyle = Math.sin(T * 8) > 0 ? '#ff3030' : '#30ff60'; ctx.fillRect(f.x * W - 2 * f.dir, f.y * H, 1.5, 1.5); }
        }
      });
      // antenna lights
      for (const l of lights) { if (Math.sin(T * 3 + l.ph) > 0.3) { const sp = layers[l.layer] ? layers[l.layer].speed : 1; const x = ((l.x - (T * sp * 3) % W) + W * 2) % (W * 2); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(x - 1, l.y - 1, 2.5, 2.5); } }
      // street with car lights (hot)
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, H * 0.92, W, H * 0.08);
      for (const c of cars) { c.x = (c.x + c.sp / 60 * (c.lane ? 1 : -1) + 1) % 1; const y = H * (0.935 + c.lane * 0.025);
        ctx.fillStyle = c.lane ? '#fff8d0' : '#ff3a2a'; ctx.fillRect(c.x * W, y, 4, 2); ctx.fillRect(c.x * W + 7, y, 4, 2); }
      // hero streak: red/blue blur crossing the sky every ~7s
      const ph = (T % 7) / 7; if (ph < 0.35) { const k = ph / 0.35, hx = -40 + k * (W + 80), hy = H * (0.35 - k * 0.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(hx - 60, hy + 20, hx, hy); sg.addColorStop(0, 'rgba(255,40,40,0)'); sg.addColorStop(1, 'rgba(255,60,60,.9)');
        ctx.strokeStyle = sg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - 60, hy + 20); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, 7); ctx.fill(); ctx.restore(); }
    }
  };
}
