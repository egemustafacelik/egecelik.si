/* Ocean: a raw WebGL point-cloud sea that answers the cursor.
   Aegean glass at the surface of the page, Atlantic blue at the bottom. */
(function () {
  'use strict';

  var canvas = document.getElementById('ocean');
  var api = {
    intro: 0,       // 0 flat and high, 1 alive (driven by main.js)
    mix: 0,         // 0 Aegean palette, 1 Atlantic palette
    amp: 1,         // wave amplitude multiplier
    dive: 0,        // 0 hero view, 1 camera pushed toward the water
    active: true,   // a transparent section currently shows the sea
    running: false, // main.js starts the loop when the curtain lifts
    ok: false       // true once WebGL is up
  };
  api.start = function () { api.running = true; };
  window.Ocean = api;
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VS = [
    'attribute vec2 a_p;',
    'uniform mat4 u_vp;',
    'uniform float u_time, u_amp, u_intro, u_dpr, u_size;',
    'uniform vec3 u_mouse;',
    'uniform vec4 u_click;',
    'varying float v_a;',
    'varying float v_h;',
    'float waves(vec2 p, float t) {',
    '  float h = 0.0;',
    '  h += sin(dot(p, vec2(0.28, 0.96)) * 0.42 + t * 0.85) * 0.55;',
    '  h += sin(dot(p, vec2(-0.74, 0.67)) * 0.71 + t * 1.15) * 0.30;',
    '  h += sin(dot(p, vec2(0.96, 0.28)) * 1.30 + t * 1.60) * 0.13;',
    '  h += sin(dot(p, vec2(-0.37, -0.93)) * 2.10 + t * 2.10) * 0.07;',
    '  h += sin(dot(p, vec2(0.60, -0.80)) * 3.30 + t * 2.70) * 0.035;',
    '  return h;',
    '}',
    'void main() {',
    '  float z = mix(1.2, 48.0, pow(a_p.y, 1.55));',
    '  float halfW = 7.0 + z * 0.95;',
    '  vec2 p = vec2(a_p.x * halfW, -z);',
    '  float h = waves(p, u_time) * u_amp * (0.15 + 0.85 * u_intro);',
    '  float dm = distance(p, u_mouse.xy);',
    '  h += sin(dm * 2.2 - u_time * 6.0) * exp(-dm * 0.38) * 0.65 * u_mouse.z;',
    '  float r = u_click.z * 7.5;',
    '  float dc = distance(p, u_click.xy);',
    '  float ring = exp(-pow(dc - r, 2.0) * 0.5) * exp(-u_click.z * 0.85) * u_click.w;',
    '  h += ring * 1.2 * sin((dc - r) * 2.4 + 1.57);',
    '  vec4 clip = u_vp * vec4(p.x, h, p.y, 1.0);',
    '  gl_Position = clip;',
    '  float depth = max(clip.w, 0.001);',
    '  gl_PointSize = clamp(u_size * u_dpr * (1.0 + h * 0.3) / depth, 0.7 * u_dpr, 5.5 * u_dpr);',
    '  float fog = 1.0 - smoothstep(16.0, 48.0, z);',
    '  float nearF = smoothstep(1.2, 3.6, z);',
    '  float edge = 1.0 - smoothstep(0.8, 1.0, abs(a_p.x));',
    '  v_a = fog * nearF * edge * u_intro;',
    '  v_h = h;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'varying float v_a;',
    'varying float v_h;',
    'uniform float u_mix;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = dot(c, c);',
    '  if (d > 0.25) discard;',
    '  float soft = 1.0 - smoothstep(0.04, 0.25, d);',
    '  float k = clamp(v_h * 0.62 + 0.5, 0.0, 1.0);',
    '  vec3 lowA = vec3(0.06, 0.30, 0.33);',
    '  vec3 highA = vec3(0.49, 0.95, 0.79);',
    '  vec3 lowB = vec3(0.09, 0.17, 0.46);',
    '  vec3 highB = vec3(0.70, 0.84, 1.00);',
    '  vec3 col = mix(mix(lowA, highA, k), mix(lowB, highB, k), u_mix);',
    '  col += vec3(1.0, 0.96, 0.88) * pow(k, 7.0) * 0.7;',
    '  float a = soft * v_a * (0.22 + 0.78 * k);',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  /* ---------- math ---------- */
  var proj = new Float32Array(16), view = new Float32Array(16), vp = new Float32Array(16);
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
  }
  function lookAt(out, e, c, up) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    var l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    out[15] = 1;
  }
  function mul(out, a, b) {
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      out[i * 4 + j] = s;
    }
  }

  /* ---------- state ---------- */
  var gl = null, prog = null, buf = null, aP = -1, U = {}, count = 0;
  var W = 0, H = 0, dpr = 1, fov = 0.9, quality = 1;
  var lastW = 0, lastH = 0;
  var eye = [0, 2.4, 2.2], target = [0, -0.4, -20], UP = [0, 1, 0];
  var mouseN = [0, 0], mouseS = [0, 0];
  var wake = [0, -12, 0], wakeT = [0, -12];
  var click = [0, -12, 99, 0], clickStart = -999, lastMove = 0;

  /* ---------- geometry ---------- */
  function build() {
    var w = window.innerWidth;
    var base = w < 640 ? 150 : (w < 1100 ? 200 : 240);
    var cols = Math.max(60, Math.round(base * quality));
    var rows = Math.round(cols * 0.85);
    var data = new Float32Array(cols * rows * 2);
    var k = 0;
    for (var j = 0; j < rows; j++) {
      var off = (j % 2) ? 0.5 / (cols - 1) : 0;
      for (var i = 0; i < cols; i++) {
        data[k++] = (i / (cols - 1)) * 2 - 1 + off * 2;
        data[k++] = j / (rows - 1);
      }
    }
    count = cols * rows;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  }

  function resize(force) {
    var w = window.innerWidth, h = window.innerHeight;
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
    var rebuild = force || w !== lastW;
    lastW = w; lastH = h;
    dpr = Math.min(window.devicePixelRatio || 1, w < 640 ? 1.5 : 2) * (quality < 1 ? 0.75 : 1);
    W = Math.round(w * dpr); H = Math.round(h * dpr);
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    fov = w < 640 ? 1.15 : 0.92;
    if (rebuild) build();
    draw(reduce ? 5.0 : lastTime);
  }

  /* ---------- camera + pointer ---------- */
  function cameraFor() {
    var intro = api.intro, dive = api.dive;
    eye[0] = mouseS[0] * 0.9;
    eye[1] = 2.4 + (1 - intro) * 3.4 - dive * 0.9 + mouseS[1] * 0.35;
    eye[2] = 2.2 - dive * 2.0;
    target[0] = mouseS[0] * 0.4;
    var portrait = W / H < 0.8;
    target[1] = (portrait ? -2.6 + api.mix * 2.6 : -0.4) - (1 - intro) * 2.6 - dive * 1.4;
    target[2] = -20;
    perspective(proj, fov, W / H, 0.1, 120);
    lookAt(view, eye, target, UP);
    mul(vp, proj, view);
  }

  function hitWater(nx, ny) {
    if (!W || !H) return null;
    var fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2];
    var l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
    var rx = fy * UP[2] - fz * UP[1], ry = fz * UP[0] - fx * UP[2], rz = fx * UP[1] - fy * UP[0];
    l = Math.hypot(rx, ry, rz); rx /= l; ry /= l; rz /= l;
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    var th = Math.tan(fov / 2), asp = W / H;
    var dx = fx + nx * th * asp * rx + ny * th * ux;
    var dy = fy + nx * th * asp * ry + ny * th * uy;
    var dz = fz + nx * th * asp * rz + ny * th * uz;
    if (dy > -0.002) return null;
    var t = -eye[1] / dy;
    return [eye[0] + dx * t, eye[2] + dz * t];
  }

  /* ---------- render ---------- */
  var lastTime = 0;
  function draw(time) {
    if (!gl || !count) return;
    cameraFor();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(U.u_vp, false, vp);
    gl.uniform1f(U.u_time, time);
    gl.uniform1f(U.u_amp, api.amp);
    gl.uniform1f(U.u_intro, reduce ? 1 : api.intro);
    gl.uniform1f(U.u_dpr, dpr);
    gl.uniform1f(U.u_size, lastW < 640 ? 24 : (lastW < 1100 ? 19 : 17));
    gl.uniform3f(U.u_mouse, wake[0], wake[1], wake[2]);
    gl.uniform4f(U.u_click, click[0], click[1], click[2], click[3]);
    gl.uniform1f(U.u_mix, api.mix);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  /* adaptive quality: if the device cannot hold ~40fps, thin the field once or twice */
  var t0 = 0, prevNow = 0, samples = 0, sum = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!api.running || !api.active || document.hidden) { prevNow = 0; return; }
    if (!t0) t0 = now;
    if (prevNow) {
      sum += now - prevNow; samples++;
      if (samples >= 90) {
        if (sum / samples > 26 && quality > 0.4) { quality *= 0.62; resize(true); }
        samples = 0; sum = 0;
      }
    }
    prevNow = now;
    var time = (now - t0) / 1000;
    lastTime = time;
    mouseS[0] += (mouseN[0] - mouseS[0]) * 0.04;
    mouseS[1] += (mouseN[1] - mouseS[1]) * 0.04;
    wake[0] += (wakeT[0] - wake[0]) * 0.08;
    wake[1] += (wakeT[1] - wake[1]) * 0.08;
    var moving = (now - lastMove) < 140 ? 1 : 0;
    wake[2] += (moving - wake[2]) * (moving ? 0.06 : 0.02);
    var age = (now - clickStart) / 1000;
    click[2] = age;
    click[3] = age < 6 ? 1 : 0;
    draw(time);
  }

  /* ---------- boot: after first paint, never blocking the main thread on shader compile ---------- */
  function ready() {
    gl.useProgram(prog);
    ['u_vp', 'u_time', 'u_amp', 'u_intro', 'u_dpr', 'u_size', 'u_mouse', 'u_click', 'u_mix'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    aP = gl.getAttribLocation(prog, 'a_p');
    buf = gl.createBuffer();
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0.0196, 0.0353, 0.0431, 1);

    window.addEventListener('pointermove', function (e) {
      mouseN[0] = (e.clientX / window.innerWidth) * 2 - 1;
      mouseN[1] = -((e.clientY / window.innerHeight) * 2 - 1);
      var hit = hitWater(mouseN[0], mouseN[1]);
      if (hit) { wakeT[0] = hit[0]; wakeT[1] = hit[1]; lastMove = performance.now(); }
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      if (!api.active || reduce) return;
      var hit = hitWater((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      if (!hit) return;
      click[0] = hit[0]; click[1] = hit[1]; clickStart = performance.now();
    }, { passive: true });
    window.addEventListener('resize', function () { resize(false); });

    canvas.classList.add('is-gl');
    api.ok = true;
    resize(true);
    if (!reduce) requestAnimationFrame(frame);
  }

  function boot() {
    try {
      /* software GL (blocklisted GPU, headless, VMs) would stall the page: keep the static sea instead */
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true });
    } catch (e) { gl = null; }
    if (!gl) return;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    var par = gl.getExtension('KHR_parallel_shader_compile');
    (function wait() {
      if (par && !gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) { requestAnimationFrame(wait); return; }
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('[ocean] shader:', gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(prog));
        gl = null;
        return;
      }
      ready();
    })();
  }

  api.start = function () { api.running = true; };
  api.redraw = function () { if (gl) draw(reduce ? 5.0 : lastTime); };

  requestAnimationFrame(function () { setTimeout(boot, 0); });
})();
