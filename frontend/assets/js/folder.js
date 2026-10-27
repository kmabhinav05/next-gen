/**
 * Folder - React Bits 3D Interactive Folder Component
 * Physics-based 3D folder that holds, peeks, opens, and spreads interactive documents.
 * Features flap / book modes, hover peeking, click zoom, and drag-and-drop.
 */

(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const STEP = 1 / 240;
  const MAX_ITEMS = 6;
  const DEFAULT_ITEMS = [
    { title: 'Brand guidelines' },
    { title: 'Launch plan' },
    { title: 'Moodboard' }
  ];

  const PILE_TURN = [0.5, -1.1, 1.5, -0.7, 1.2, -1.6];
  const BOOK_REST = [
    { x: 0.14, y: -0.004, r: 1.4 },
    { x: 0.115, y: 0.008, r: -1.1 },
    { x: 0.09, y: 0, r: 0.6 }
  ];
  const BOOK_PEEK = [
    { x: 0.27, y: -0.016, r: 4.5 },
    { x: 0.2, y: 0.014, r: 1.2 },
    { x: 0.14, y: 0, r: -1.2 }
  ];
  const FLAP_REST = [
    { x: 0.16, rise: 0, r: 3 },
    { x: -0.17, rise: 0.05, r: -3.5 },
    { x: 0, rise: 0.1, r: 0.5 },
    { x: 0.25, rise: 0.08, r: 5 },
    { x: -0.25, rise: 0.09, r: -5.5 },
    { x: 0.08, rise: 0.12, r: 1.5 }
  ];
  const SPREAD_TURN = [4, -5, 3, -6, 5, -3];
  const SPREAD_DROP = [0.03, -0.04, 0.05, -0.02, 0.04, -0.05];
  const DROP_TURN = [-6, 4, -3, 7, -5, 3];
  const BOOK_ANGLES = { open: -180, receive: -24, peek: -13, rest: 0 };
  const FLAP_ANGLES = { open: -64, receive: -30, peek: -15, rest: 0 };
  const LAYERS = { out: 50, drag: 80, focus: 90 };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const colorCache = new Map();
  let colorContext = null;
  const parseColor = value => {
    const key = String(value || '#3d8bff');
    if (colorCache.has(key)) return colorCache.get(key);
    let rgb = [61, 139, 255];
    if (typeof document !== 'undefined') {
      if (!colorContext) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        colorContext = c.getContext('2d', { willReadFrequently: true });
      }
      if (colorContext) {
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = '#3d8bff';
        colorContext.fillStyle = key;
        colorContext.fillRect(0, 0, 1, 1);
        rgb = Array.from(colorContext.getImageData(0, 0, 1, 1).data.slice(0, 3));
      }
    }
    colorCache.set(key, rgb);
    return rgb;
  };

  const mixRgb = (rgb, target, amount) =>
    rgb.map((channel, i) => Math.round(channel + (target[i] - channel) * amount));
  const rgbString = rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const luma = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;

  const multiply = (a, b) => {
    const out = new Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[row] * b[col * 4] +
          a[4 + row] * b[col * 4 + 1] +
          a[8 + row] * b[col * 4 + 2] +
          a[12 + row] * b[col * 4 + 3];
      }
    }
    return out;
  };

  const chain = (...list) => list.reduce(multiply);
  const move = (x, y, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const stretch = (x, y) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  const turnX = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  };

  const turnY = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  };

  const turnZ = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  };

  const toCss = m =>
    `matrix3d(${m.map(v => (Math.abs(v) < 1e-7 ? 0 : Number(v.toFixed(6)))).join(', ')})`;

  const measureFolder = (book, scale, labelWidth, hasLabel, tabPosition) => {
    const w = (book ? 180 : 224) * scale;
    const h = (book ? 232 : 176) * scale;
    const tabH = 20 * scale;
    const r = 12 * scale;
    const shoulder = tabH * 0.75;
    const frontTop = book ? tabH : tabH + h * 0.3;
    const corners = book ? [0, r, r, 0] : [r, r, r, r];
    const maxTab = w - corners[0] - corners[1] - shoulder * 2 - 10 * scale;
    const tabW = clamp(
      hasLabel ? labelWidth + 14 * scale + shoulder : w * 0.34,
      Math.min(w * 0.3, maxTab),
      maxTab
    );
    const tabX =
      tabPosition === 'left'
        ? corners[0] + 5 * scale + shoulder
        : tabPosition === 'center'
          ? (w - tabW) / 2
          : w - corners[1] - 5 * scale - shoulder - tabW;
    const docW = book ? w * 0.8 : w * 0.54;
    return {
      book,
      scale,
      w,
      h,
      tabH,
      r,
      shoulder,
      corners,
      tabW,
      tabX,
      frontTop,
      frontH: tabH + h - frontTop,
      docW,
      docH: docW * (book ? 1.28 : 1.22)
    };
  };

  const backPath = g => {
    const { w, h, tabX, tabW, tabH, shoulder } = g;
    const [tl, tr, br, bl] = g.corners;
    const top = tabH;
    const bottom = tabH + h;
    return [
      `M 0 ${top + tl}`,
      `Q 0 ${top} ${tl} ${top}`,
      `L ${tabX - shoulder} ${top}`,
      `C ${tabX} ${top} ${tabX} 0 ${tabX + shoulder} 0`,
      `L ${tabX + tabW - shoulder} 0`,
      `C ${tabX + tabW} 0 ${tabX + tabW} ${top} ${tabX + tabW + shoulder} ${top}`,
      `L ${w - tr} ${top}`,
      `Q ${w} ${top} ${w} ${top + tr}`,
      `L ${w} ${bottom - br}`,
      `Q ${w} ${bottom} ${w - br} ${bottom}`,
      `L ${bl} ${bottom}`,
      `Q 0 ${bottom} 0 ${bottom - bl}`,
      'Z'
    ].join(' ');
  };

  const placeBook = (rank, count, phase, layout, g) => {
    const pileX = g.w / 2;
    const pileY = g.frontTop + g.frontH / 2;
    if (phase === 'open') {
      if (layout === 'row') {
        const gap = 10 * g.scale;
        const fit = Math.min(0.8, (g.w * 1.86 - gap * (count - 1)) / (count * g.docW));
        const step = g.docW * fit + gap;
        return { x: g.w / 2 + (rank - (count - 1) / 2) * step, y: pileY, z: 0, r: 0, ry: 0, s: fit };
      }
      if (layout === 'stack') {
        const fit = 0.74;
        const strip = Math.min(26 * g.scale, (g.h * 0.36) / Math.max(1, count - 1));
        const top = g.frontTop + 14 * g.scale + (count - 1) * strip;
        return { x: g.w, y: top + (g.docH * fit) / 2 - rank * strip, z: 0, r: 0, ry: 0, s: fit };
      }
      const fit = count > 4 ? 0.58 : count > 3 ? 0.64 : 0.72;
      const span = count === 2 ? g.w : Math.min(g.w * 1.3, g.w * 0.6 * (count - 1));
      const x = count > 1 ? span / 2 - (rank * span) / (count - 1) : g.w * 0.5;
      return { x: g.w / 2 + x, y: pileY + SPREAD_DROP[rank] * g.h, z: 0, r: SPREAD_TURN[rank], ry: 0, s: fit };
    }
    const offsets = phase === 'rest' ? BOOK_REST : BOOK_PEEK;
    const offset = offsets[rank] ?? { x: 0.06, y: 0, r: PILE_TURN[rank] ?? 0 };
    return {
      x: pileX + offset.x * g.w,
      y: pileY + offset.y * g.h + rank * 0.8 * g.scale,
      z: 0,
      r: offset.r,
      ry: 0,
      s: 1
    };
  };

  const placeFlap = (rank, count, phase, layout, g, pointer) => {
    const rest = FLAP_REST[rank] ?? FLAP_REST[FLAP_REST.length - 1];
    const floor = g.tabH + g.h - 5 * g.scale - g.docH / 2;
    const mid = (count - 1) / 2;
    if (phase === 'open') {
      const lift = g.tabH - g.h * 0.02;
      if (layout === 'stack') {
        const strip = Math.min(30 * g.scale, (g.h * 0.62) / Math.max(1, count - 1));
        const fit = 1.04 - rank * 0.05;
        return {
          x: g.w / 2,
          y: g.tabH + g.h * 0.1 - rank * strip - (g.docH * (1.04 - fit)) / 2,
          z: -rank * 18 * g.scale,
          r: 0,
          ry: 0,
          s: fit
        };
      }
      const gap = 12 * g.scale;
      const fit = Math.min(0.94, (g.w * 2.3 - gap * (count - 1)) / (count * g.docW));
      const step = g.docW * fit + gap;
      const tidy = layout === 'row';
      return {
        x: g.w / 2 + (rank - mid) * step,
        y: lift + (tidy ? 0 : SPREAD_DROP[rank] * g.h * 0.7),
        z: 0,
        r: tidy ? 0 : SPREAD_TURN[rank] * 0.55,
        ry: 0,
        s: fit
      };
    }
    const part = phase === 'receive' ? 1.7 : phase === 'peek' ? 1.3 : 1;
    const x = g.w / 2 + rest.x * g.w * part;
    if (phase === 'rest') return { x, y: floor - rest.rise * g.h, z: 0, r: rest.r, ry: 0, s: 1 };
    const near =
      phase === 'peek' && pointer != null
        ? Math.max(0, 1 - Math.abs(pointer - x) / (g.w * 0.32))
        : 0;
    const rise = rest.rise + (phase === 'receive' ? 0.03 : 0.1);
    return {
      x,
      y: floor - rise * g.h - near * near * g.h * 0.09,
      z: 0,
      r: rest.r * 1.6,
      ry: 0,
      s: 1
    };
  };

  /**
   * Instantiates an interactive 3D Folder inside containerEl
   * @param {HTMLElement} containerEl 
   * @param {Object} userOptions 
   */
  function initFolder(containerEl, userOptions = {}) {
    if (!containerEl) return null;

    const options = Object.assign({
      items: DEFAULT_ITEMS,
      label: 'Documents',
      mode: 'flap',
      variant: 'solid',
      color: '#3d8bff',
      paperColor: '#ffffff',
      tabPosition: 'right',
      layout: 'spread',
      size: 0.92,
      openOn: 'click',
      defaultOpen: false,
      draggable: true,
      zoomOnClick: true,
      peek: true,
      intro: true,
      tilt: 0.5,
      bounce: 0.4,
      speed: 1,
      frost: 0.25,
      closeOnOutsideClick: true,
      theme: 'light',
      onOpenChange: null,
      onItemClick: null
    }, userOptions);

    let isOpen = options.defaultOpen;
    const isBook = options.mode === 'book';
    const entries = (options.items || DEFAULT_ITEMS).slice(0, MAX_ITEMS);
    const count = entries.length;
    const scale = Math.max(0.3, Number(options.size) || 1);

    // Initial label measurement estimation
    let labelWidth = options.label ? options.label.length * 7 * scale : 0;
    let g = measureFolder(isBook, scale, labelWidth, Boolean(options.label), options.tabPosition);
    let total = g.tabH + g.h;

    const rgb = parseColor(options.color);
    const paper = parseColor(options.paperColor);
    const backTone = mixRgb(rgb, [0, 0, 0], 0.16);
    const insideTop = rgbString(mixRgb(rgb, [0, 0, 0], 0.08));
    const insideBottom = rgbString(backTone);
    const depth = Math.round(Math.max(g.w, g.h) * 5);

    // Build DOM inside container
    containerEl.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'folder-root';
    root.setAttribute('data-mode', isBook ? 'book' : 'flap');
    root.setAttribute('data-variant', options.variant);
    root.setAttribute('data-theme', options.theme === 'light' ? 'light' : 'dark');
    if (options.draggable) root.setAttribute('data-draggable', '');

    const applyCssVars = () => {
      root.style.setProperty('--folder-rgb', rgb.join(', '));
      root.style.setProperty('--folder-base', rgbString(rgb));
      root.style.setProperty('--folder-front-top', rgbString(mixRgb(rgb, [255, 255, 255], 0.12)));
      root.style.setProperty('--folder-front-bottom', rgbString(mixRgb(rgb, [0, 0, 0], 0.06)));
      root.style.setProperty('--folder-inside-top', insideTop);
      root.style.setProperty('--folder-inside-bottom', insideBottom);
      root.style.setProperty('--folder-tab-ink', luma(backTone) > 0.6 ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.92)');
      root.style.setProperty('--folder-paper', rgbString(paper));
      root.style.setProperty('--folder-paper-ink', rgbString(mixRgb(paper, [0, 0, 0], 0.11)));
      root.style.setProperty('--folder-paper-ink-strong', rgbString(mixRgb(paper, [0, 0, 0], 0.28)));
      root.style.setProperty('--folder-paper-text', rgbString(mixRgb(paper, [0, 0, 0], 0.72)));
      root.style.setProperty('--folder-w', `${g.w}px`);
      root.style.setProperty('--folder-h', `${g.h}px`);
      root.style.setProperty('--folder-tab-h', `${g.tabH}px`);
      root.style.setProperty('--folder-front-y', `${g.frontTop}px`);
      root.style.setProperty('--folder-front-h', `${g.frontH}px`);
      root.style.setProperty('--folder-r', `${g.r}px`);
      root.style.setProperty('--folder-front-radius', isBook ? `0 ${g.r}px ${g.r}px 0` : `${g.r}px`);
      root.style.setProperty('--folder-doc-w', `${g.docW}px`);
      root.style.setProperty('--folder-doc-h', `${g.docH}px`);
      root.style.setProperty('--folder-frost', `${(1.5 + clamp(options.frost, 0, 1) * 10) * scale}px`);
      root.style.setProperty('--folder-depth', `${depth}px`);
      root.style.setProperty('--folder-scale', scale);
    };

    applyCssVars();

    const shape = backPath(g);

    // Build stage HTML
    let itemsHtml = '';
    entries.forEach((it, idx) => {
      const title = typeof it === 'string' ? it : (it.title || '');
      const desc = (it.description || '');
      itemsHtml += `
        <div class="folder-layer folder-item" data-folder-item="${idx}" role="button" tabindex="0">
          <div class="folder-doc">
            ${title ? `<span class="folder-doc-title">${title}</span>` : `<span class="folder-doc-heading"></span>`}
            ${desc ? `<span class="folder-doc-text">${desc}</span>` : ''}
            <span class="folder-doc-line" style="width: 92%"></span>
            <span class="folder-doc-line" style="width: 84%"></span>
            <span class="folder-doc-line" style="width: 88%"></span>
            <span class="folder-doc-block"></span>
            <span class="folder-doc-line" style="width: 80%"></span>
            <span class="folder-doc-line" style="width: 62%"></span>
          </div>
        </div>
      `;
    });

    root.innerHTML = `
      <div class="folder-stage" role="button" tabindex="0" aria-expanded="${isOpen}">
        <span class="folder-layer folder-ground" aria-hidden="true"></span>
        ${isBook ? `<span class="folder-layer folder-cast" aria-hidden="true"></span>` : ''}
        <div class="folder-layer folder-back" aria-hidden="true">
          <div class="folder-back-fill" style="clip-path: path('${shape}')">
            ${isBook ? `<span class="folder-gutter"></span>` : ''}
          </div>
          <svg class="folder-back-rim" width="${g.w}" height="${total}" viewBox="0 0 ${g.w} ${total}">
            <path class="folder-focus" d="${shape}"></path>
          </svg>
          ${options.label ? `<span class="folder-tab-text" style="left: ${g.tabX}px; width: ${g.tabW}px">${options.label}</span>` : ''}
        </div>
        ${itemsHtml}
        ${isBook ? `<span class="folder-layer folder-shade" aria-hidden="true"></span>` : ''}
        <div class="folder-layer folder-front" data-face="outer" aria-hidden="true">
          <div class="folder-face folder-face-outer"></div>
          ${isBook ? `<div class="folder-face folder-face-inner"><span class="folder-inner-gutter"></span></div>` : ''}
        </div>
      </div>
      ${options.label ? `<span class="folder-tab-text folder-measure" aria-hidden="true">${options.label}</span>` : ''}
    `;

    containerEl.appendChild(root);

    // Cache element references
    const ground = root.querySelector('.folder-ground');
    const back = root.querySelector('.folder-back');
    const front = root.querySelector('.folder-front');
    const cast = root.querySelector('.folder-cast');
    const shade = root.querySelector('.folder-shade');
    const itemNodes = Array.from(root.querySelectorAll('.folder-item'));
    const measureNode = root.querySelector('.folder-measure');

    // Update label measurement if measureNode exists
    if (measureNode) {
      labelWidth = measureNode.offsetWidth || labelWidth;
      g = measureFolder(isBook, scale, labelWidth, Boolean(options.label), options.tabPosition);
      total = g.tabH + g.h;
      applyCssVars();
    }

    // Spring physics state
    const spring = value => ({ value, velocity: 0 });
    const state = {
      raf: 0,
      last: 0,
      ready: false,
      hovered: false,
      pressed: false,
      pointerX: 0,
      pointerY: 0,
      deskX: 0,
      deskY: 0,
      hoveredItem: -1,
      phase: 'rest',
      previous: 'rest',
      changedAt: 0,
      front: spring(0),
      rx: spring(0),
      ry: spring(0),
      lift: spring(0),
      squash: spring(1),
      items: [],
      focus: -1,
      drag: null,
      receiving: false,
      receiveUntil: 0,
      suppressClick: false,
      dropCount: 0,
      intro: { phase: 'done', start: 0, opening: false },
      anchor: spring(0),
      appear: 1
    };

    // Initialize item states
    entries.forEach(() => {
      state.items.push({
        x: spring(0),
        y: spring(0),
        z: spring(0),
        r: spring(0),
        ry: spring(0),
        s: spring(1),
        hover: spring(0),
        mx: spring(0),
        my: spring(0),
        alpha: spring(1),
        place: 'inside',
        rank: 0,
        layer: 'inside',
        elevated: false,
        insertUntil: 0,
        insertFrom: null,
        outX: 0,
        outY: 0,
        outR: 0,
        outS: 1,
        outOrder: 0,
        localX: 0,
        localY: 0,
        fresh: true
      });
    });

    const integrate = (item, target, omega, zeta, dt) => {
      const k = omega * omega;
      const d = 2 * zeta * omega;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const step = dt / steps;
      for (let i = 0; i < steps; i++) {
        item.velocity += (k * (target - item.value) - d * item.velocity) * step;
        item.value += item.velocity * step;
      }
      return Math.abs(target - item.value) > 0.01 || Math.abs(item.velocity) > 0.01;
    };

    const snap = (item, value) => {
      item.value = value;
      item.velocity = 0;
    };

    const toDesk = (clientX, clientY) => {
      const box = root.getBoundingClientRect();
      const kx = root.offsetWidth / (box.width || 1);
      const ky = root.offsetHeight / (box.height || 1);
      return [(clientX - box.left) * kx, (clientY - box.top) * ky];
    };

    const phaseOf = time => {
      if (isOpen) return 'open';
      if (state.receiving || time < state.receiveUntil) return 'receive';
      if (options.peek && state.hovered && !state.drag?.active) return 'peek';
      return 'rest';
    };

    const place = (rank, insideCount, phase) => {
      if (isBook) return placeBook(rank, insideCount, phase, options.layout, g);
      const pointer = state.hovered ? ((state.pointerX + 1) / 2) * g.w : null;
      return placeFlap(rank, insideCount, phase, options.layout, g, pointer);
    };

    const write = () => {
      const pivotX = g.w / 2;
      const pivotY = g.tabH + g.h / 2;
      const theta = state.front.value;
      const angle = (theta * Math.PI) / 180;
      const unfold = isBook ? clamp(-theta / 180, 0, 1) : 0;
      const shift = (g.w / 2) * unfold * (1 - state.anchor.value);
      const zoom = (1 + state.lift.value * 0.012) * state.squash.value * (0.94 + 0.06 * state.appear);

      const desk = chain(
        move(pivotX, pivotY),
        turnX(state.rx.value),
        turnY(state.ry.value),
        stretch(zoom, zoom),
        move(-pivotX, -pivotY)
      );
      const folder = multiply(desk, move(shift, 0));
      const flipped = isBook && theta < -90;
      const frontZ = flipped ? '3' : '40';

      if (back) {
        back.style.transform = toCss(folder);
        back.style.setProperty('--folder-gutter', unfold.toFixed(3));
        back.style.setProperty(
          '--folder-label',
          (isBook ? 1 : 1 - clamp((-theta - 18) / 26, 0, 1)).toFixed(3)
        );
      }

      const frontMatrix = isBook
        ? chain(folder, move(0, g.frontTop, 2 * scale * (1 - unfold)), turnY(theta))
        : chain(folder, move(0, g.tabH + g.h, 2 * scale), turnX(theta), move(0, -g.frontH));
      const facing = isBook
        ? Math.sin(angle) * -0.42 + Math.cos(angle) * 0.9
        : Math.sin(angle) * 0.5 + Math.cos(angle) * 0.86;
      const light = (flipped ? -facing : facing) / (isBook ? 0.9 : 0.86);
      const glint = clamp((light - 1) * 0.9, 0, 0.18);
      const dim = clamp((1 - light) * (isBook ? 0.5 : 0.22), 0, 0.5);

      if (front) {
        front.style.transform = toCss(frontMatrix);
        front.style.zIndex = frontZ;
        front.dataset.face = flipped ? 'inner' : 'outer';
        front.style.setProperty('--folder-glint', glint.toFixed(3));
        front.style.setProperty('--folder-dim', dim.toFixed(3));
      }

      const rise = isBook ? Math.max(0, Math.sin(-angle)) : 0;
      if (ground) {
        ground.style.transform = toCss(multiply(folder, move(0, isBook ? g.tabH : g.tabH + g.h)));
        ground.style.opacity = (0.75 + state.lift.value * 0.25).toFixed(3);
      }
      if (cast) {
        cast.style.transform = toCss(
          chain(folder, move(g.w * rise * 0.12, g.frontTop + g.h * rise * 0.04), stretch(Math.cos(angle), 1))
        );
        cast.style.opacity = (flipped ? 1 - rise * 0.7 : 0).toFixed(3);
      }
      if (shade) {
        const edge = g.w * Math.cos(angle) + g.w * rise * 0.36;
        shade.style.transform = toCss(
          chain(folder, move(0, g.frontTop + g.h * rise * 0.03), stretch(edge / g.w, 1))
        );
        shade.style.zIndex = edge > 0 ? '39' : '2';
        shade.style.opacity = (clamp(rise * 4, 0, 1) * (1 - rise * 0.45)).toFixed(3);
      }

      state.items.forEach((item, index) => {
        const node = itemNodes[index];
        const z = 3 * scale + item.z.value + item.hover.value * 26 * scale;
        const matrix = chain(
          desk,
          move(item.x.value + item.mx.value, item.y.value + item.my.value, z),
          turnY(item.ry.value),
          turnZ(item.r.value),
          stretch(item.s.value, item.s.value),
          move(-g.docW / 2, -g.docH / 2)
        );
        let layer = 10 + count - item.rank;
        if (item.layer === 'inside' && state.phase === 'open' && state.hoveredItem === index) layer = 30;
        if (item.layer === 'out') layer = LAYERS.out + index;
        if (item.layer === 'drag') layer = LAYERS.drag;
        if (item.layer === 'focus') layer = LAYERS.focus;

        if (node) {
          node.style.transform = toCss(matrix);
          node.style.zIndex = String(layer);
          node.style.setProperty('--folder-lift', clamp(item.hover.value, 0, 2.4).toFixed(3));
          node.style.opacity = item.alpha.value < 0.995 ? Math.max(0, item.alpha.value).toFixed(3) : '';
        }
      });
    };

    const frame = now => {
      state.raf = 0;
      const time = now / 1000;
      const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
      state.last = now;
      const zeta = 1 - 0.72 * options.bounce;
      const frontOmega = TAU * (isBook ? 1.55 : 2) * options.speed;
      const itemOmega = TAU * 2.1 * options.speed;
      const soft = TAU * 1.6 * options.speed;
      const phase = phaseOf(time);

      if (phase !== state.phase) {
        state.previous = state.phase;
        state.phase = phase;
        state.changedAt = now;
      }
      const elapsed = (now - state.changedAt) / 1000;
      let busy = time < state.receiveUntil;

      const ranks = [];
      state.items.forEach((item, index) => {
        if (item.place === 'inside') ranks.push(index);
      });
      const insideCount = ranks.length;
      ranks.forEach((index, rank) => {
        state.items[index].rank = rank;
      });

      const frontTarget = (isBook ? BOOK_ANGLES : FLAP_ANGLES)[phase];

      if (!state.ready) {
        state.ready = true;
        snap(state.front, frontTarget);
        state.items.forEach(item => {
          const slot = place(item.rank, insideCount, phase);
          snap(item.x, slot.x);
          snap(item.y, slot.y);
          snap(item.z, slot.z);
          snap(item.r, slot.r);
          snap(item.ry, slot.ry);
          snap(item.s, slot.s);
          snap(item.alpha, 1);
          item.fresh = false;
        });
      }

      busy = integrate(state.front, frontTarget, frontOmega, zeta, dt) || busy;

      const engaged = state.hovered;
      busy = integrate(state.rx, engaged ? -state.pointerY * 8 * options.tilt : 0, soft, 1, dt) || busy;
      busy = integrate(state.ry, engaged ? state.pointerX * 10 * options.tilt : 0, soft, 1, dt) || busy;
      busy = integrate(state.lift, state.hovered && phase !== 'open' ? 1 : 0, soft, 1, dt) || busy;
      busy = integrate(state.squash, state.pressed ? 0.975 : 1, TAU * 3.2, 0.6, dt) || busy;

      const drag = state.drag?.active ? state.drag : null;
      const focusScale = clamp(((g.tabH + g.h) * 1.18) / g.docH, 1.2, 2.2);
      const focusY = isBook ? g.tabH + g.h / 2 : g.tabH + g.h * 0.36;

      state.items.forEach((item, index) => {
        let target;
        let omega = itemOmega;
        let damping = zeta;
        let lift = 0;
        let fade = 1;

        if (state.focus === index) {
          target = { x: g.w / 2, y: focusY, z: 0, r: 0, ry: 0, s: focusScale };
          lift = 2.4;
          item.layer = 'focus';
        } else if (drag && drag.index === index) {
          target = {
            x: state.deskX + drag.grabX,
            y: state.deskY + drag.grabY,
            z: 0,
            r: 0,
            ry: 0,
            s: drag.scale * 1.05
          };
          omega = TAU * 5;
          damping = 0.78;
          lift = 1.4;
          item.layer = 'drag';
        } else if (item.place === 'out') {
          target = { x: item.outX, y: item.outY, z: 0, r: item.outR, ry: 0, s: item.outS };
          lift = state.hoveredItem === index ? 1 : 0.15;
          item.layer = 'out';
        } else {
          target = place(item.rank, insideCount, phase);
          item.layer = 'inside';
          if (phase === 'open') {
            if (state.hoveredItem === index) {
              target = { ...target, y: target.y - 6 * scale, r: target.r * 0.2, ry: 0, s: target.s * 1.05 };
              lift = 1;
            } else {
              lift = 0.2;
            }
          }
        }

        busy = integrate(item.x, target.x, omega, damping, dt) || busy;
        busy = integrate(item.y, target.y, omega, damping, dt) || busy;
        busy = integrate(item.z, target.z, itemOmega, zeta, dt) || busy;
        busy = integrate(item.r, target.r, omega, damping, dt) || busy;
        busy = integrate(item.ry, target.ry, itemOmega, zeta, dt) || busy;
        busy = integrate(item.s, target.s, itemOmega, zeta, dt) || busy;
        busy = integrate(item.hover, lift, itemOmega, zeta, dt) || busy;
        busy = integrate(item.alpha, fade, TAU * 3 * options.speed, 1, dt) || busy;
      });

      write();
      if (busy || drag) state.raf = requestAnimationFrame(frame);
      else state.last = 0;
    };

    const wake = () => {
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    };

    const setFolderOpen = val => {
      isOpen = Boolean(val);
      root.setAttribute('data-open', isOpen ? '' : undefined);
      root.querySelector('.folder-stage')?.setAttribute('aria-expanded', String(isOpen));
      options.onOpenChange?.(isOpen);
      wake();
    };

    const toggle = () => {
      if (state.focus >= 0) {
        state.focus = -1;
        wake();
        return;
      }
      setFolderOpen(!isOpen);
    };

    // Event listeners
    root.addEventListener('pointermove', event => {
      const box = root.getBoundingClientRect();
      state.pointerX = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1.5, 1.5);
      state.pointerY = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1.5, 1.5);
      const target = event.target.closest?.('[data-folder-item]');
      state.hoveredItem = target && root.contains(target) ? Number(target.getAttribute('data-folder-item')) : -1;
      if (!state.hovered) {
        state.hovered = true;
        if (options.openOn === 'hover') setFolderOpen(true);
      }
      wake();
    });

    root.addEventListener('pointerleave', () => {
      state.hovered = false;
      state.pressed = false;
      state.hoveredItem = -1;
      if (options.openOn === 'hover') setFolderOpen(false);
      wake();
    });

    root.querySelector('.folder-stage')?.addEventListener('click', e => {
      const itemEl = e.target.closest?.('[data-folder-item]');
      if (itemEl && root.contains(itemEl)) {
        const idx = Number(itemEl.getAttribute('data-folder-item'));
        if (isOpen || state.items[idx]?.place === 'out') {
          e.stopPropagation();
          if (options.zoomOnClick) {
            state.focus = state.focus === idx ? -1 : idx;
          }
          options.onItemClick?.(entries[idx], idx);
          wake();
          return;
        }
      }
      toggle();
    });

    document.addEventListener('pointerdown', e => {
      if (!root.contains(e.target)) {
        if (state.focus >= 0) {
          state.focus = -1;
          wake();
        }
        if (isOpen && options.closeOnOutsideClick) {
          setFolderOpen(false);
        }
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (state.focus >= 0) {
          state.focus = -1;
          wake();
          return;
        }
        if (isOpen && options.closeOnOutsideClick) {
          setFolderOpen(false);
        }
      }
    });

    wake();

    const api = {
      root,
      open: () => setFolderOpen(true),
      close: () => setFolderOpen(false),
      toggle,
      isOpen: () => isOpen
    };

    containerEl.__folder = api;
    return api;
  }

  window.initFolder = initFolder;
})();
