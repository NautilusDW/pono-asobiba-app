(function (global) {
  'use strict';

  var DEFAULTS = {
    simWidth: 256,
    simHeight: 144,
    pressureIterations: 16,
    simulationHz: 30,
    maxSubsteps: 3,
    maxPointers: 6,
    maxSplats: 192,
    dprCap: 2,
    strokeRadius: 0.052,
    strokeAmount: 0.82,
    velocityScale: 820,
    velocityDissipation: 0.986,
    dyeDissipation: 0.978,
    pressureDissipation: 0.82,
    curlStrength: 5.5
  };

  var VERTEX_SHADER = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main() {
      vec2 p = vec2(gl_VertexID == 2 ? 3.0 : -1.0,
                    gl_VertexID == 1 ? 3.0 : -1.0);
      vUv = p * 0.5 + 0.5;
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  var COPY_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uScale;
    out vec4 outColor;
    void main() { outColor = texture(uTexture, vUv) * uScale; }
  `;

  var SPLAT_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform vec4 uValue;
    uniform float uRadius;
    uniform float uAspect;
    out vec4 outColor;
    void main() {
      vec2 d = vUv - uPoint;
      d.x *= uAspect;
      float falloff = exp(-dot(d, d) / max(0.00001, uRadius * uRadius));
      outColor = texture(uTarget, vUv) + uValue * falloff;
    }
  `;

  var ADVECT_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 uTexel;
    uniform float uDt;
    uniform float uDissipation;
    out vec4 outColor;

    vec4 bilerp(sampler2D tex, vec2 uv) {
      vec2 st = uv / uTexel - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);
      vec2 a = (i + vec2(0.5)) * uTexel;
      vec4 c00 = texture(tex, clamp(a, uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c10 = texture(tex, clamp(a + vec2(uTexel.x, 0.0), uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c01 = texture(tex, clamp(a + vec2(0.0, uTexel.y), uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c11 = texture(tex, clamp(a + uTexel, uTexel * 0.5, 1.0 - uTexel * 0.5));
      return mix(mix(c00, c10, f.x), mix(c01, c11, f.x), f.y);
    }

    void main() {
      vec2 velocity = bilerp(uVelocity, vUv).xy;
      vec2 previous = vUv - uDt * velocity * uTexel;
      outColor = bilerp(uSource, previous) * uDissipation;
    }
  `;

  var CURL_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 uTexel;
    out vec4 outColor;
    void main() {
      float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
      float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
      float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
      float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
      outColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
    }
  `;

  var VORTICITY_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform vec2 uTexel;
    uniform float uDt;
    uniform float uStrength;
    out vec4 outColor;
    void main() {
      float left = abs(texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
      float right = abs(texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
      float bottom = abs(texture(uCurl, vUv - vec2(0.0, uTexel.y)).x);
      float top = abs(texture(uCurl, vUv + vec2(0.0, uTexel.y)).x);
      float center = texture(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(top - bottom, right - left);
      force /= length(force) + 0.0001;
      force *= uStrength * center;
      force.y *= -1.0;
      vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
      outColor = vec4(clamp(velocity, vec2(-900.0), vec2(900.0)), 0.0, 1.0);
    }
  `;

  var DIVERGENCE_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 uTexel;
    out vec4 outColor;
    void main() {
      vec2 center = texture(uVelocity, vUv).xy;
      float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
      float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
      float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
      float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
      if (vUv.x <= uTexel.x) left = -center.x;
      if (vUv.x >= 1.0 - uTexel.x) right = -center.x;
      if (vUv.y <= uTexel.y) bottom = -center.y;
      if (vUv.y >= 1.0 - uTexel.y) top = -center.y;
      outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
    }
  `;

  var PRESSURE_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    uniform vec2 uTexel;
    out vec4 outColor;
    void main() {
      float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      float divergence = texture(uDivergence, vUv).x;
      outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
    }
  `;

  var PROJECT_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    uniform vec2 uTexel;
    out vec4 outColor;
    void main() {
      float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      vec2 velocity = texture(uVelocity, vUv).xy;
      velocity -= vec2(right - left, top - bottom);
      if (vUv.x <= uTexel.x || vUv.x >= 1.0 - uTexel.x) velocity.x = 0.0;
      if (vUv.y <= uTexel.y || vUv.y >= 1.0 - uTexel.y) velocity.y = 0.0;
      outColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  var DISPLAY_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uDye;
    uniform vec2 uTexel;
    out vec4 outColor;

    vec4 bilerp(vec2 uv) {
      vec2 st = uv / uTexel - 0.5;
      vec2 i = floor(st);
      vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(st));
      vec2 a = (i + vec2(0.5)) * uTexel;
      vec4 c00 = texture(uDye, clamp(a, uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c10 = texture(uDye, clamp(a + vec2(uTexel.x, 0.0), uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c01 = texture(uDye, clamp(a + vec2(0.0, uTexel.y), uTexel * 0.5, 1.0 - uTexel * 0.5));
      vec4 c11 = texture(uDye, clamp(a + uTexel, uTexel * 0.5, 1.0 - uTexel * 0.5));
      return mix(mix(c00, c10, f.x), mix(c01, c11, f.x), f.y);
    }

    float densityAt(vec2 uv) {
      vec4 d = bilerp(uv);
      return max(d.a, max(d.r, max(d.g, d.b)));
    }

    void main() {
      vec4 dye = bilerp(vUv);
      float density = max(dye.a, max(dye.r, max(dye.g, dye.b)));
      if (density < 0.012) {
        outColor = vec4(0.0);
        return;
      }

      vec3 pigment = clamp(dye.rgb / max(dye.a, 0.08), 0.0, 1.0);
      pigment = floor(pigment * 4.0 + 0.5) / 4.0;

      float band1 = step(0.025, density);
      float band2 = step(0.17, density);
      float band3 = step(0.46, density);
      float level = band1 + band2 + band3;
      vec3 fill = pigment * (0.68 + level * 0.095) + vec3(level * 0.018);
      float alpha = band1 * 0.30 + band2 * 0.20 + band3 * 0.20;

      float left = densityAt(vUv - vec2(uTexel.x * 1.5, 0.0));
      float right = densityAt(vUv + vec2(uTexel.x * 1.5, 0.0));
      float bottom = densityAt(vUv - vec2(0.0, uTexel.y * 1.5));
      float top = densityAt(vUv + vec2(0.0, uTexel.y * 1.5));
      float edge = clamp(length(vec2(right - left, top - bottom)) * 1.9, 0.0, 1.0);
      float localMask = smoothstep(0.018, 0.075, density);
      float neighborMask = min(min(smoothstep(0.018, 0.075, left), smoothstep(0.018, 0.075, right)),
                               min(smoothstep(0.018, 0.075, bottom), smoothstep(0.018, 0.075, top)));
      float outerRim = clamp(localMask - neighborMask, 0.0, 1.0);
      float rim = clamp(outerRim * 1.35 + edge * outerRim * 0.22, 0.0, 0.86);
      vec3 inkRim = mix(vec3(0.055, 0.075, 0.12), pigment * 0.24, 0.28);
      fill = mix(fill, inkRim, rim);
      alpha = clamp(alpha + rim * 0.16, 0.0, 0.78);
      outColor = vec4(clamp(fill, 0.0, 1.0), alpha);
    }
  `;

  function clamp(value, min, max) {
    value = Number(value);
    if (!isFinite(value)) value = min;
    return Math.max(min, Math.min(max, value));
  }

  function numberOption(options, key, fallback, min, max) {
    return clamp(options && options[key] != null ? options[key] : fallback, min, max);
  }

  function normalizeColor(input) {
    var r = 0.22, g = 0.72, b = 0.96;
    if (typeof input === 'string') {
      var hex = input.trim().replace(/^#/, '');
      if (/^[0-9a-f]{3}$/i.test(hex)) {
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      } else if (/^[0-9a-f]{6}$/i.test(hex)) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (Array.isArray(input) || (input && typeof input.length === 'number')) {
      r = Number(input[0]); g = Number(input[1]); b = Number(input[2]);
    } else if (input && typeof input === 'object') {
      r = Number(input.r); g = Number(input.g); b = Number(input.b);
    }
    if (!isFinite(r)) r = 0.22;
    if (!isFinite(g)) g = 0.72;
    if (!isFinite(b)) b = 0.96;
    if (Math.max(r, g, b) > 1.001) { r /= 255; g /= 255; b /= 255; }
    return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
  }

  function unavailable(reason) {
    var stats = {
      available: false,
      initialized: false,
      enabled: false,
      contextLost: false,
      reason: reason || 'unavailable',
      simWidth: 0,
      simHeight: 0,
      drawWidth: 0,
      drawHeight: 0,
      pressureIterations: 0,
      queuedSplats: 0,
      activePointers: 0,
      frames: 0,
      steps: 0,
      droppedSplats: 0,
      contextLosses: 0,
      contextRestores: 0
    };
    function noOp() {}
    return {
      resize: noOp,
      setEnabled: noOp,
      beginStroke: noOp,
      moveStroke: noOp,
      endStroke: noOp,
      inject: noOp,
      frame: noOp,
      reset: noOp,
      destroy: noOp,
      getStats: function () { return Object.assign({}, stats); }
    };
  }

  function createFluid(canvas, inputOptions) {
    if (!canvas || typeof canvas.getContext !== 'function') return unavailable('invalid canvas');

    var options = inputOptions || {};
    var simWidth = Math.round(numberOption(options, 'simWidth', DEFAULTS.simWidth, 64, 512));
    var simHeight = Math.round(numberOption(options, 'simHeight', DEFAULTS.simHeight, 36, 512));
    var pressureIterations = Math.round(numberOption(options, 'pressureIterations', DEFAULTS.pressureIterations, 14, 40));
    var fixedStep = 1 / numberOption(options, 'simulationHz', DEFAULTS.simulationHz, 15, 60);
    var maxSubsteps = Math.round(numberOption(options, 'maxSubsteps', DEFAULTS.maxSubsteps, 1, 6));
    var maxPointers = Math.round(numberOption(options, 'maxPointers', DEFAULTS.maxPointers, 1, 12));
    var maxSplats = Math.round(numberOption(options, 'maxSplats', DEFAULTS.maxSplats, 24, 384));
    var dprCap = numberOption(options, 'dprCap', DEFAULTS.dprCap, 1, 3);
    var strokeRadius = numberOption(options, 'strokeRadius', DEFAULTS.strokeRadius, 0.008, 0.18);
    var strokeAmount = numberOption(options, 'strokeAmount', DEFAULTS.strokeAmount, 0.05, 3);
    var velocityScale = numberOption(options, 'velocityScale', DEFAULTS.velocityScale, 100, 4000);
    var velocityDissipation = numberOption(options, 'velocityDissipation', DEFAULTS.velocityDissipation, 0.85, 1);
    var dyeDissipation = numberOption(options, 'dyeDissipation', DEFAULTS.dyeDissipation, 0.85, 1);
    var pressureDissipation = numberOption(options, 'pressureDissipation', DEFAULTS.pressureDissipation, 0, 1);
    var curlStrength = numberOption(options, 'curlStrength', DEFAULTS.curlStrength, 0, 40);

    var gl = null;
    var initialized = false;
    var failed = false;
    var lost = false;
    var enabled = false;
    var destroyed = false;
    var reason = '';
    var cssWidth = 1;
    var cssHeight = 1;
    var accumulator = 0;
    var pointers = new Map();
    var splats = [];
    var programs = {};
    var targets = null;
    var vao = null;

    var counters = {
      frames: 0,
      steps: 0,
      droppedSplats: 0,
      contextLosses: 0,
      contextRestores: 0
    };

    function compileShader(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var message = gl.getShaderInfoLog(shader) || 'shader compile failed';
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    function makeProgram(fragmentSource) {
      var vertex = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      var fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
      var handle = gl.createProgram();
      gl.attachShader(handle, vertex);
      gl.attachShader(handle, fragment);
      gl.linkProgram(handle);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
        var message = gl.getProgramInfoLog(handle) || 'program link failed';
        gl.deleteProgram(handle);
        throw new Error(message);
      }
      return { handle: handle, uniforms: Object.create(null) };
    }

    function uniform(program, name) {
      if (!(name in program.uniforms)) {
        program.uniforms[name] = gl.getUniformLocation(program.handle, name);
      }
      return program.uniforms[name];
    }

    function createTarget(width, height) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);

      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(framebuffer);
        gl.deleteTexture(texture);
        throw new Error('RGBA16F framebuffer unavailable');
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture: texture, framebuffer: framebuffer, width: width, height: height };
    }

    function createDoubleTarget(width, height) {
      var result = {
        read: createTarget(width, height),
        write: createTarget(width, height),
        swap: function () {
          var temp = result.read;
          result.read = result.write;
          result.write = temp;
        }
      };
      return result;
    }

    function bindTexture(unit, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function draw(program, destination, width, height) {
      gl.useProgram(program.handle);
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination ? destination.framebuffer : null);
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function deleteTarget(target) {
      if (!gl || !target) return;
      if (target.framebuffer) gl.deleteFramebuffer(target.framebuffer);
      if (target.texture) gl.deleteTexture(target.texture);
    }

    function releaseResources(canDelete) {
      if (canDelete && gl) {
        if (targets) {
          deleteTarget(targets.velocity && targets.velocity.read);
          deleteTarget(targets.velocity && targets.velocity.write);
          deleteTarget(targets.dye && targets.dye.read);
          deleteTarget(targets.dye && targets.dye.write);
          deleteTarget(targets.pressure && targets.pressure.read);
          deleteTarget(targets.pressure && targets.pressure.write);
          deleteTarget(targets.divergence);
          deleteTarget(targets.curl);
        }
        Object.keys(programs).forEach(function (key) {
          if (programs[key] && programs[key].handle) gl.deleteProgram(programs[key].handle);
        });
        if (vao) gl.deleteVertexArray(vao);
      }
      targets = null;
      programs = {};
      vao = null;
      initialized = false;
    }

    function clearScreen() {
      if (!gl || lost) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, Math.max(1, canvas.width), Math.max(1, canvas.height));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function ensureInitialized() {
      if (destroyed || failed || lost) return false;
      if (initialized) return true;
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        });
        if (!gl) throw new Error('WebGL2 unavailable');
        if (!gl.getExtension('EXT_color_buffer_float')) {
          throw new Error('EXT_color_buffer_float unavailable');
        }

        programs.copy = makeProgram(COPY_FRAGMENT);
        programs.splat = makeProgram(SPLAT_FRAGMENT);
        programs.advect = makeProgram(ADVECT_FRAGMENT);
        programs.curl = makeProgram(CURL_FRAGMENT);
        programs.vorticity = makeProgram(VORTICITY_FRAGMENT);
        programs.divergence = makeProgram(DIVERGENCE_FRAGMENT);
        programs.pressure = makeProgram(PRESSURE_FRAGMENT);
        programs.project = makeProgram(PROJECT_FRAGMENT);
        programs.display = makeProgram(DISPLAY_FRAGMENT);
        vao = gl.createVertexArray();
        targets = {
          velocity: createDoubleTarget(simWidth, simHeight),
          dye: createDoubleTarget(simWidth, simHeight),
          pressure: createDoubleTarget(simWidth, simHeight),
          divergence: createTarget(simWidth, simHeight),
          curl: createTarget(simWidth, simHeight)
        };
        gl.disable(gl.BLEND);
        resize(cssWidth, cssHeight);
        initialized = true;
        reason = '';
        clearScreen();
        return true;
      } catch (error) {
        reason = error && error.message ? error.message : 'WebGL2 initialization failed';
        releaseResources(true);
        failed = true;
        enabled = false;
        pointers.clear();
        splats.length = 0;
        accumulator = 0;
        gl = null;
        return false;
      }
    }

    function clearTarget(target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function reset() {
      pointers.clear();
      splats.length = 0;
      accumulator = 0;
      if (!initialized || lost || !targets) {
        clearScreen();
        return;
      }
      clearTarget(targets.velocity.read);
      clearTarget(targets.velocity.write);
      clearTarget(targets.dye.read);
      clearTarget(targets.dye.write);
      clearTarget(targets.pressure.read);
      clearTarget(targets.pressure.write);
      clearTarget(targets.divergence);
      clearTarget(targets.curl);
      clearScreen();
    }

    function resize(width, height) {
      if (destroyed) return;
      cssWidth = Math.max(1, Math.round(Number(width) || canvas.clientWidth || 1));
      cssHeight = Math.max(1, Math.round(Number(height) || canvas.clientHeight || 1));
      var dpr = Math.min(dprCap, Math.max(1, Number(global.devicePixelRatio) || 1));
      var pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      var pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      if (initialized) clearScreen();
    }

    function queueSplat(x, y, dx, dy, color, radius, amount) {
      if (destroyed || !enabled) return;
      if (splats.length >= maxSplats) {
        splats.shift();
        counters.droppedSplats++;
      }
      splats.push({
        x: clamp(x, 0, 1),
        y: 1 - clamp(y, 0, 1),
        dx: clamp(dx, -1, 1),
        dy: -clamp(dy, -1, 1),
        color: normalizeColor(color),
        radius: clamp(radius == null ? strokeRadius : radius, 0.006, 0.24),
        amount: clamp(amount == null ? strokeAmount : amount, 0, 4)
      });
    }

    function inject(x, y, dx, dy, color, radius, amount) {
      queueSplat(x, y, dx || 0, dy || 0, color, radius, amount);
    }

    function beginStroke(pointerId, x, y, color) {
      if (destroyed || !enabled) return;
      var key = String(pointerId);
      if (!pointers.has(key) && pointers.size >= maxPointers) return;
      var point = { x: clamp(x, 0, 1), y: clamp(y, 0, 1), color: normalizeColor(color) };
      pointers.set(key, point);
      queueSplat(point.x, point.y, 0, 0, point.color, strokeRadius, strokeAmount);
    }

    function moveStroke(pointerId, x, y, color) {
      if (destroyed || !enabled) return;
      var key = String(pointerId);
      var currentX = clamp(x, 0, 1);
      var currentY = clamp(y, 0, 1);
      var previous = pointers.get(key);
      if (!previous) {
        beginStroke(pointerId, currentX, currentY, color);
        return;
      }
      var nextColor = normalizeColor(color || previous.color);
      var dx = currentX - previous.x;
      var dy = currentY - previous.y;
      var distance = Math.hypot(dx * (simWidth / simHeight), dy);
      var segments = Math.max(1, Math.min(18, Math.ceil(distance / Math.max(0.008, strokeRadius * 0.42))));
      for (var i = 1; i <= segments; i++) {
        var t = i / segments;
        queueSplat(
          previous.x + dx * t,
          previous.y + dy * t,
          dx / segments,
          dy / segments,
          nextColor,
          strokeRadius,
          strokeAmount * 0.72
        );
      }
      previous.x = currentX;
      previous.y = currentY;
      previous.color = nextColor;
    }

    function endStroke(pointerId) {
      pointers.delete(String(pointerId));
    }

    function applySplat(target, point, value) {
      var program = programs.splat;
      gl.useProgram(program.handle);
      bindTexture(0, target.read.texture);
      gl.uniform1i(uniform(program, 'uTarget'), 0);
      gl.uniform2f(uniform(program, 'uPoint'), point.x, point.y);
      gl.uniform4f(uniform(program, 'uValue'), value[0], value[1], value[2], value[3]);
      gl.uniform1f(uniform(program, 'uRadius'), point.radius);
      gl.uniform1f(uniform(program, 'uAspect'), simWidth / simHeight);
      draw(program, target.write, simWidth, simHeight);
      target.swap();
    }

    function flushSplats() {
      if (!splats.length) return;
      var pending = splats.splice(0, splats.length);
      for (var i = 0; i < pending.length; i++) {
        var point = pending[i];
        var forceX = point.dx * velocityScale;
        var forceY = point.dy * velocityScale;
        applySplat(targets.velocity, point, [forceX, forceY, 0, 0]);
        var amount = point.amount;
        applySplat(targets.dye, point, [
          point.color[0] * amount,
          point.color[1] * amount,
          point.color[2] * amount,
          amount
        ]);
      }
    }

    function runPass(program, destination, textures, setup) {
      gl.useProgram(program.handle);
      for (var i = 0; i < textures.length; i++) {
        var source = textures[i].texture;
        bindTexture(i, source && source.texture ? source.texture : source);
        gl.uniform1i(uniform(program, textures[i].name), i);
      }
      if (setup) setup(program);
      draw(program, destination, simWidth, simHeight);
    }

    function simulate(dt) {
      var texelX = 1 / simWidth;
      var texelY = 1 / simHeight;

      // Advection can introduce divergence. Run it first so pressure projection
      // remains the final velocity operation in every completed fluid step.
      runPass(programs.advect, targets.velocity.write, [
        { name: 'uVelocity', texture: targets.velocity.read },
        { name: 'uSource', texture: targets.velocity.read }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
        gl.uniform1f(uniform(program, 'uDt'), dt);
        gl.uniform1f(uniform(program, 'uDissipation'), velocityDissipation);
      });
      targets.velocity.swap();

      runPass(programs.curl, targets.curl, [
        { name: 'uVelocity', texture: targets.velocity.read }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
      });

      runPass(programs.vorticity, targets.velocity.write, [
        { name: 'uVelocity', texture: targets.velocity.read },
        { name: 'uCurl', texture: targets.curl }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
        gl.uniform1f(uniform(program, 'uDt'), dt);
        gl.uniform1f(uniform(program, 'uStrength'), curlStrength);
      });
      targets.velocity.swap();

      runPass(programs.divergence, targets.divergence, [
        { name: 'uVelocity', texture: targets.velocity.read }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
      });

      runPass(programs.copy, targets.pressure.write, [
        { name: 'uTexture', texture: targets.pressure.read }
      ], function (program) {
        gl.uniform1f(uniform(program, 'uScale'), pressureDissipation);
      });
      targets.pressure.swap();

      for (var i = 0; i < pressureIterations; i++) {
        runPass(programs.pressure, targets.pressure.write, [
          { name: 'uPressure', texture: targets.pressure.read },
          { name: 'uDivergence', texture: targets.divergence }
        ], function (program) {
          gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
        });
        targets.pressure.swap();
      }

      runPass(programs.project, targets.velocity.write, [
        { name: 'uPressure', texture: targets.pressure.read },
        { name: 'uVelocity', texture: targets.velocity.read }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
      });
      targets.velocity.swap();

      runPass(programs.advect, targets.dye.write, [
        { name: 'uVelocity', texture: targets.velocity.read },
        { name: 'uSource', texture: targets.dye.read }
      ], function (program) {
        gl.uniform2f(uniform(program, 'uTexel'), texelX, texelY);
        gl.uniform1f(uniform(program, 'uDt'), dt);
        gl.uniform1f(uniform(program, 'uDissipation'), dyeDissipation);
      });
      targets.dye.swap();
      counters.steps++;
    }

    function render() {
      var program = programs.display;
      gl.disable(gl.BLEND);
      gl.useProgram(program.handle);
      bindTexture(0, targets.dye.read.texture);
      gl.uniform1i(uniform(program, 'uDye'), 0);
      gl.uniform2f(uniform(program, 'uTexel'), 1 / simWidth, 1 / simHeight);
      draw(program, null, Math.max(1, canvas.width), Math.max(1, canvas.height));
    }

    function frame(dtSeconds) {
      if (destroyed || !enabled || lost) return;
      if (!ensureInitialized()) return;
      try {
        var dt = clamp(dtSeconds == null ? fixedStep : dtSeconds, 0, 0.1);
        accumulator = Math.min(accumulator + dt, fixedStep * maxSubsteps);
        flushSplats();
        var substeps = 0;
        while (accumulator >= fixedStep && substeps < maxSubsteps) {
          simulate(fixedStep);
          accumulator -= fixedStep;
          substeps++;
        }
        render();
        counters.frames++;
      } catch (error) {
        reason = error && error.message ? error.message : 'fluid frame failed';
        failed = true;
        enabled = false;
        try { releaseResources(!!gl && !lost); } catch (_) { initialized = false; }
        gl = null;
      }
    }

    function setEnabled(value) {
      enabled = !!value && !destroyed && !failed;
      if (!enabled) {
        pointers.clear();
        splats.length = 0;
        accumulator = 0;
        clearScreen();
      }
    }

    function getStats() {
      return {
        available: initialized ? true : ((failed || lost || destroyed) ? false : null),
        initialized: initialized,
        enabled: enabled,
        contextLost: lost,
        reason: reason,
        simWidth: simWidth,
        simHeight: simHeight,
        drawWidth: Math.max(0, canvas.width || 0),
        drawHeight: Math.max(0, canvas.height || 0),
        pressureIterations: pressureIterations,
        queuedSplats: splats.length,
        activePointers: pointers.size,
        frames: counters.frames,
        steps: counters.steps,
        droppedSplats: counters.droppedSplats,
        contextLosses: counters.contextLosses,
        contextRestores: counters.contextRestores
      };
    }

    function onContextLost(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      counters.contextLosses++;
      lost = true;
      reason = 'webgl context lost';
      pointers.clear();
      splats.length = 0;
      accumulator = 0;
      releaseResources(false);
      gl = null;
    }

    function onContextRestored() {
      counters.contextRestores++;
      lost = false;
      failed = false;
      reason = '';
      gl = null;
      if (enabled) ensureInitialized();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      pointers.clear();
      splats.length = 0;
      try { canvas.removeEventListener('webglcontextlost', onContextLost, false); } catch (_) {}
      try { canvas.removeEventListener('webglcontextrestored', onContextRestored, false); } catch (_) {}
      releaseResources(!!gl && !lost);
      gl = null;
      reason = 'destroyed';
    }

    try {
      canvas.addEventListener('webglcontextlost', onContextLost, false);
      canvas.addEventListener('webglcontextrestored', onContextRestored, false);
    } catch (error) {
      return unavailable(error && error.message ? error.message : 'canvas events unavailable');
    }

    return {
      resize: resize,
      setEnabled: setEnabled,
      beginStroke: beginStroke,
      moveStroke: moveStroke,
      endStroke: endStroke,
      inject: inject,
      frame: frame,
      reset: reset,
      destroy: destroy,
      getStats: getStats
    };
  }

  global.OtoColorFluid = {
    create: function (canvas, options) {
      try {
        return createFluid(canvas, options);
      } catch (error) {
        return unavailable(error && error.message ? error.message : 'fluid creation failed');
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
