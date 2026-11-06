(function () {
  var cv = document.getElementById('bg-canvas');
  if (!cv) return;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 r;uniform float t;',
    'float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}',
    'void main(){',
    '  float a=r.x/r.y;',
    '  vec2 p=vec2(gl_FragCoord.x/r.x*a,gl_FragCoord.y/r.y);',
    '  vec3 base=vec3(.973,.933,.918);',
    '  vec3 col=base;',
    '  vec2 c1=vec2(a*(.15+.12*sin(t*.11)),.15+.12*cos(t*.09));',      // dark mauve, bottom-left
    '  vec2 c2=vec2(a*(.85+.10*cos(t*.08)),.90+.08*sin(t*.12));',      // pink, top-right
    '  vec2 c3=vec2(a*(.50+.20*sin(t*.06+2.)),.50+.20*cos(t*.07));',   // white, centre
    '  vec2 c4=vec2(a*(.20+.15*cos(t*.05)),.75+.10*sin(t*.10));',      // blush, left
    '  col=mix(col,vec3(.97,.78,.85),smoothstep(.55,0.,distance(p,c4))*.8);',
    '  col=mix(col,vec3(.42,.19,.29),smoothstep(.75,0.,distance(p,c1))*.55);',
    '  col=mix(col,vec3(1.,.31,.60),smoothstep(.70,0.,distance(p,c2))*.55);',
    '  col=mix(col,vec3(1.),smoothstep(.50,0.,distance(p,c3))*.70);',
    '  float dev=clamp(length(col-base)*1.6,0.,1.);',
    '  vec2 g=gl_FragCoord.xy;float f=floor(t*24.);',                  // grain refreshes at 24 fps
    '  float n=h(floor(g)+f*vec2(37.,17.))*.6+h(floor(g/2.)+f*vec2(11.,53.))*.4;',
    '  col+=(n-.5)*(.07+.32*dev);',                                    // tweak .07 / .32 for grain strength
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't');

  function size() {
    var s = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(innerWidth * s); cv.height = Math.round(innerHeight * s);
    gl.viewport(0, 0, cv.width, cv.height);
  }
  size(); window.addEventListener('resize', size);

  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(ms) {
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, still ? 5 : ms / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!still) requestAnimationFrame(draw);
  }
  document.documentElement.classList.add('gl');
  requestAnimationFrame(draw);
})();