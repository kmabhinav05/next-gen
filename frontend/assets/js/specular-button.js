/**
 * SpecularButton - React Bits WebGL2 Dynamic Specular Rim Lighting
 * Automatically adds luxury glassmorphic specular edge reflection to buttons.
 * Responds to pointer proximity, aim angle, and click flash physics.
 */

(function () {
  'use strict';

  const PAD = 24;
  const TAU = Math.PI * 2;

  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`;

  const UNIFORMS = [
    'uCenter',
    'uHalf',
    'uRadius',
    'uPx',
    'uSpot',
    'uEntry',
    'uLineColor',
    'uBaseColor',
    'uIntensity',
    'uWindow',
    'uThickness',
    'uGlow'
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = value => value - Math.floor(value);

  const loopPosition = (x, y, halfX, halfY, r) => {
    const innerX = halfX - r;
    const innerY = halfY - r;
    const arc = (Math.PI / 2) * r;
    const quarter = innerX + innerY + arc;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const qx = ax - innerX;
    const qy = ay - innerY;
    let s;
    if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
    else if (qx > qy) s = Math.min(ay, innerY);
    else s = innerY + arc + innerX - Math.min(ax, innerX);
    if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
    else if (y < 0) s = 4 * quarter - s;
    return wrap(s / Math.max(4 * quarter, 0.0001));
  };

  const rimPoint = (position, halfX, halfY, r) => {
    const innerX = halfX - r;
    const innerY = halfY - r;
    const arc = (Math.PI / 2) * r;
    const quarter = innerX + innerY + arc;
    let s = wrap(position) * 4 * quarter;
    let signX = 1;
    let signY = 1;
    if (s > 3 * quarter) {
      s = 4 * quarter - s;
      signY = -1;
    } else if (s > 2 * quarter) {
      s -= 2 * quarter;
      signX = -1;
      signY = -1;
    } else if (s > quarter) {
      s = 2 * quarter - s;
      signX = -1;
    }
    let x = innerX - (s - innerY - arc);
    let y = halfY;
    if (s <= innerY) {
      x = halfX;
      y = s;
    } else if (s <= innerY + arc) {
      const angle = (s - innerY) / Math.max(r, 0.0001);
      x = innerX + Math.cos(angle) * r;
      y = innerY + Math.sin(angle) * r;
    }
    return [x * signX, y * signY];
  };

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.warn('[SpecularButton] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const link = gl => {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    console.warn('[SpecularButton] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  };

  // Color probe for parsing CSS color strings to normalized RGB floats
  let probe = null;
  const colorMap = new Map();
  const toRgb = value => {
    if (!value) return [1, 1, 1];
    if (colorMap.has(value)) return colorMap.get(value);
    let rgb = [1, 1, 1];
    try {
      if (!probe && typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        probe = c.getContext('2d', { willReadFrequently: true });
      }
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const data = probe.getImageData(0, 0, 1, 1).data;
        rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
      }
    } catch (e) {
      rgb = [1, 1, 1];
    }
    colorMap.set(value, rgb);
    return rgb;
  };

  // Global pointer state shared across instances for peak efficiency
  const pointer = { x: 0, y: 0, known: false };
  const activeButtons = new Set();

  if (typeof window !== 'undefined') {
    const onMove = e => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.known = true;
      activeButtons.forEach(inst => inst.wake());
    };
    const onEnd = e => {
      if (e.pointerType !== 'mouse') {
        pointer.known = false;
        activeButtons.forEach(inst => inst.wake());
      }
    };
    const onLeave = () => {
      pointer.known = false;
      activeButtons.forEach(inst => inst.wake());
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onEnd, { passive: true });
    window.addEventListener('pointercancel', onEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }

  /**
   * Enhances a single button element with WebGL2 Specular Reflection
   * @param {HTMLElement} button 
   * @param {Object} options 
   */
  function createSpecularButton(button, options = {}) {
    if (!button || button.__specularButton || button.hasAttribute('data-no-specular')) {
      return button?.__specularButton || null;
    }

    button.classList.add('specular-button');

    // Ensure DOM structure: <canvas class="specular-button__light" /> followed by <span class="specular-button__label">
    let canvas = button.querySelector(':scope > .specular-button__light');
    let label = button.querySelector(':scope > .specular-button__label');

    if (!label) {
      label = document.createElement('span');
      label.className = 'specular-button__label';
      const children = Array.from(button.childNodes).filter(n => n !== canvas);
      children.forEach(c => label.appendChild(c));
    }

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'specular-button__light';
      canvas.setAttribute('aria-hidden', 'true');
      button.insertBefore(canvas, button.firstChild);
    }

    if (!button.contains(label)) {
      button.appendChild(label);
    }

    // Determine theme-adaptive base and line colors
    let defaultLine = '#ffffff';
    let defaultBase = '#525252';

    const classStr = button.className || '';
    if (classStr.includes('orange') || classStr.includes('warning')) {
      defaultLine = '#ffffff';
      defaultBase = '#d97706';
    } else if (classStr.includes('teal') || classStr.includes('success')) {
      defaultLine = '#ffffff';
      defaultBase = '#0f766e';
    } else if (classStr.includes('outline') || classStr.includes('glass')) {
      defaultLine = '#ffffff';
      defaultBase = 'rgba(255, 255, 255, 0.2)';
    }

    // Measure border-radius dynamically from computed style
    let compRadius = 18;
    try {
      const comp = window.getComputedStyle(button);
      const cr = parseFloat(comp.borderTopLeftRadius) || parseFloat(comp.borderRadius);
      if (!isNaN(cr) && cr > 0) compRadius = cr;
    } catch (e) {}

    const settings = {
      radius: Math.max(0, options.radius !== undefined ? options.radius : (parseFloat(button.dataset.specularRadius) || compRadius)),
      lineColor: String(options.lineColor || button.dataset.specularLineColor || defaultLine),
      baseColor: String(options.baseColor || button.dataset.specularBaseColor || defaultBase),
      intensity: Math.max(0, options.intensity !== undefined ? options.intensity : (parseFloat(button.dataset.specularIntensity) || 1)),
      idleIntensity: clamp(options.idleIntensity !== undefined ? options.idleIntensity : (parseFloat(button.dataset.specularIdleIntensity) || 0.35), 0, 1),
      shineSize: Math.max(0, options.shineSize !== undefined ? options.shineSize : (parseFloat(button.dataset.specularShineSize) || 10)),
      shineFade: Math.max(0, options.shineFade !== undefined ? options.shineFade : (parseFloat(button.dataset.specularShineFade) || 34)),
      thickness: Math.max(0, options.thickness !== undefined ? options.thickness : (parseFloat(button.dataset.specularThickness) || 1.2)),
      glow: Math.max(0, options.glow !== undefined ? options.glow : (parseFloat(button.dataset.specularGlow) || 1)),
      speed: options.speed !== undefined ? options.speed : (parseFloat(button.dataset.specularSpeed) || 0.35),
      followMouse: options.followMouse !== false,
      proximity: Math.max(1, options.proximity !== undefined ? options.proximity : (parseFloat(button.dataset.specularProximity) || 250)),
      autoAnimate: options.autoAnimate || button.dataset.specularAutoAnimate === 'true',
      disabled: button.disabled || options.disabled || false
    };

    let gl = null;
    let program = null;
    let uniforms = {};
    let buffer = null;
    let vao = null;

    const initGL = () => {
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          premultipliedAlpha: true,
          antialias: false,
          depth: false,
          stencil: false
        });
      } catch (e) {
        gl = null;
      }

      if (!gl) return false;

      program = link(gl);
      if (!program) return false;

      uniforms = {};
      for (const name of UNIFORMS) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }

      buffer = gl.createBuffer();
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      return true;
    };

    if (!initGL()) {
      return null;
    }

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const view = { width: 1, height: 1, ratio: 1 };
    const state = { spot: 0, level: 0, press: 0, ready: false };
    let raf = 0;
    let last = 0;
    let visible = true;

    const cornerRadius = s => Math.min(s.radius, view.width / 2, view.height / 2);

    const restSpot = s => {
      const r = cornerRadius(s);
      const inset = r * (1 - Math.SQRT1_2);
      return loopPosition(inset - view.width / 2, view.height / 2 - inset, view.width / 2, view.height / 2, r);
    };

    const aim = s => {
      if (!s.followMouse || s.disabled || !pointer.known) return null;
      const rect = button.getBoundingClientRect();
      const scale = rect.width / view.width || 1;
      const halfX = view.width / 2;
      const halfY = view.height / 2;
      const x = (pointer.x - rect.left - rect.width / 2) / scale;
      const y = (rect.top + rect.height / 2 - pointer.y) / scale;
      const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
      const t = clamp(1 - distance / s.proximity, 0, 1);
      const near = t * t * (3 - 2 * t);
      const nearest = loopPosition(x, y, halfX, halfY, cornerRadius(s));
      if (distance > 0) return { spot: nearest, near };
      const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
      const sway = restSpot(s) - (x / halfX) * 0.06 - (y / halfY) * 0.02;
      const offset = sway - nearest - Math.round(sway - nearest);
      return { spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
    };

    const draw = s => {
      if (!gl || !program) return;
      const { width, height } = view;
      const scaleX = canvas.width / (width + PAD * 2);
      const scaleY = canvas.height / (height + PAD * 2);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uCenter, (PAD + width / 2) * scaleX, (PAD + height / 2) * scaleY);
      gl.uniform2f(uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
      gl.uniform1f(uniforms.uRadius, Math.min(s.radius, width / 2, height / 2) * scaleX);
      gl.uniform1f(uniforms.uPx, view.ratio);
      const r = Math.min(s.radius, width / 2, height / 2);
      const [rimX, rimY] = rimPoint(state.spot, width / 2, height / 2, r);
      const pull = 1 - Math.min(0.35 * (height / 2), Math.hypot(rimX, rimY)) / Math.max(Math.hypot(rimX, rimY), 0.0001);
      gl.uniform1f(uniforms.uSpot, state.spot);
      gl.uniform2f(uniforms.uEntry, rimX * pull * scaleX, rimY * pull * scaleY);
      gl.uniform3fv(uniforms.uLineColor, toRgb(s.lineColor));
      gl.uniform3fv(uniforms.uBaseColor, toRgb(s.baseColor));
      gl.uniform1f(uniforms.uIntensity, s.intensity * (state.level + state.press * 0.8));
      gl.uniform2f(uniforms.uWindow, s.shineSize / 360 + state.press * 0.06, s.shineFade / 360 + 0.0001);
      gl.uniform1f(uniforms.uThickness, s.thickness);
      gl.uniform1f(uniforms.uGlow, s.glow);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };

    const frame = now => {
      raf = 0;
      if (!visible || !gl) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = aim(settings);
      const spinning = settings.autoAnimate && !reduce;
      const steering = !!target && target.near > 0;
      if (!state.ready) {
        state.spot = restSpot(settings);
        state.level = settings.autoAnimate ? 1 : settings.idleIntensity;
        state.ready = true;
      }
      let diff = 0;
      if (spinning && !steering) {
        state.spot = wrap(state.spot + (settings.speed / TAU) * dt);
      } else {
        diff = (steering ? target.spot : restSpot(settings)) - state.spot;
        diff -= Math.round(diff);
        state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
      }
      const level = settings.autoAnimate ? 1 : settings.idleIntensity + (1 - settings.idleIntensity) * (target ? target.near : 0);
      state.level += (level - state.level) * (1 - Math.exp(-dt * 7));
      state.press *= Math.exp(-dt * 5);
      draw(settings);
      const settling = Math.abs(diff) > 0.0002 || Math.abs(level - state.level) > 0.001 || state.press > 0.002;
      if (settling || (spinning && !steering)) {
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
      }
    };

    const wake = () => {
      if (!raf && visible && gl) {
        raf = requestAnimationFrame(frame);
      }
    };

    const measure = entry => {
      const box = entry?.borderBoxSize?.[0];
      view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth);
      view.height = Math.max(1, box ? box.blockSize : button.offsetHeight);
      view.ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round((view.width + PAD * 2) * view.ratio));
      canvas.height = Math.max(1, Math.round((view.height + PAD * 2) * view.ratio));
      if (state.ready) draw(settings);
      wake();
    };

    const onPointerDown = event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
      if (!settings.disabled) state.press = 1;
      wake();
    };

    button.addEventListener('pointerdown', onPointerDown);

    const resizeObserver = new ResizeObserver(entries => {
      measure(entries[entries.length - 1]);
    });
    resizeObserver.observe(button);

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(button);

    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    });

    canvas.addEventListener('webglcontextrestored', () => {
      initGL();
      draw(settings);
      wake();
    });

    measure();

    const api = {
      button,
      canvas,
      settings,
      wake,
      destroy: () => {
        cancelAnimationFrame(raf);
        activeButtons.delete(api);
        resizeObserver.disconnect();
        intersection.disconnect();
        button.removeEventListener('pointerdown', onPointerDown);
        if (gl) {
          gl.deleteBuffer(buffer);
          gl.deleteVertexArray(vao);
          gl.deleteProgram(program);
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
        delete button.__specularButton;
      }
    };

    button.__specularButton = api;
    activeButtons.add(api);

    return api;
  }

  /**
   * Initializes SpecularButton on all eligible buttons in the page
   */
  function initAllSpecularButtons(selector) {
    const sel = selector || [
      'button:not([data-no-specular]):not(.btn-close):not(.carousel-pill-dot)',
      'a.btn:not([data-no-specular])',
      'a.btn-explore-orange:not([data-no-specular])',
      'a.btn-login-teal:not([data-no-specular])',
      'a.btn-outline-custom:not([data-no-specular])',
      'a.btn-outline-teal:not([data-no-specular])',
      'a.btn-outline-light:not([data-no-specular])',
      'a.btn-secondary-navy:not([data-no-specular])',
      'a.nav-search-glass-btn:not([data-no-specular])',
      'a.crextio-close-circle-btn:not([data-no-specular])',
      '.specular-button:not([data-no-specular])'
    ].join(', ');

    if (typeof document === 'undefined') return;

    document.querySelectorAll(sel).forEach(btn => {
      createSpecularButton(btn);
    });
  }

  // Export globally
  window.SpecularButton = {
    create: createSpecularButton,
    initAll: initAllSpecularButtons
  };

  // Auto-initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initAllSpecularButtons());
    } else {
      initAllSpecularButtons();
    }

    // Auto-enhance dynamically added buttons (modals, dropdowns, async content)
    const observer = new MutationObserver(mutations => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.tagName === 'BUTTON' || node.classList?.contains('btn') || node.querySelector?.('button, .btn')) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }
      if (shouldScan) {
        initAllSpecularButtons();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Theme changes wake buttons to update appearance
    window.addEventListener('themechange', () => {
      activeButtons.forEach(inst => inst.wake());
    });
  }
})();
