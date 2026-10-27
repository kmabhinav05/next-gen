/**
 * KokonutUI SwitchButton JS (v2.0.0 adapted for Next Gen Grading)
 * @author: @dorianbaffier
 * @license: MIT
 *
 * Implements:
 * 1. Web Animations API (WAAPI) keyframe morphing for sun rays, crescent bite, central disc, and typography labels.
 * 2. View Transitions API circular theme expansion emanating from the button center.
 * 3. Bidirectional sync with Next Gen Grading's theme manager.
 */

(function () {
  'use strict';

  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const EASE_REVEAL = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const REVEAL_ATTR = 'data-theme-reveal';
  const REVEAL_STYLE_ID = 'kokonut-theme-reveal';
  const REVEAL_CSS = `html[${REVEAL_ATTR}]::view-transition-old(root),html[${REVEAL_ATTR}]::view-transition-new(root){animation:none;mix-blend-mode:normal}`;

  const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  const RAYS = RAY_ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const at = (r) => ({
      x: Number((12 + r * Math.cos(rad)).toFixed(2)),
      y: Number((12 + r * Math.sin(rad)).toFixed(2)),
    });
    return { deg, from: at(7.5), to: at(10) };
  });

  const ANIMATED_PROPS = ['opacity', 'scale', 'translate', 'filter'];

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function ensureRevealStyle() {
    if (document.getElementById(REVEAL_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = REVEAL_STYLE_ID;
    style.textContent = REVEAL_CSS;
    document.head.appendChild(style);
  }

  function snapshot(elements) {
    const map = new Map();
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      const frame = { offset: 0 };
      for (const prop of ANIMATED_PROPS) {
        frame[prop] = style.getPropertyValue(prop);
      }
      map.set(el, frame);
      for (const anim of el.getAnimations()) {
        anim.cancel();
      }
    }
    return map;
  }

  function timing(el, toDark) {
    const { part, index = '0' } = el.dataset;
    const i = Number(index);
    switch (part) {
      case 'ray':
        // Rays retract sequentially; on return they wait for the bite to clear
        return {
          delay: toDark ? i * 18 : 140 + i * 22,
          duration: 260,
          easing: EASE_OUT,
        };
      case 'bite':
        return { delay: toDark ? 60 : 0, duration: 380, easing: EASE_IN_OUT };
      case 'disc':
        return { delay: toDark ? 40 : 0, duration: 380, easing: EASE_OUT };
      default:
        return { duration: 240, easing: EASE_OUT };
    }
  }

  function morph(fromSnapshot, toDark) {
    if (prefersReducedMotion()) return;
    for (const [el, frame] of fromSnapshot) {
      el.animate([frame, {}], { ...timing(el, toDark), fill: 'backwards' });
    }
  }

  let revealRunning = false;

  function revealFrom(button, apply) {
    const doc = document;
    if (
      typeof doc.startViewTransition !== 'function' ||
      prefersReducedMotion() ||
      revealRunning ||
      doc.activeViewTransition
    ) {
      apply();
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const root = document.documentElement;

    ensureRevealStyle();
    root.setAttribute(REVEAL_ATTR, '');
    revealRunning = true;

    let transition;
    try {
      transition = doc.startViewTransition(() => {
        apply();
      });
    } catch (err) {
      root.removeAttribute(REVEAL_ATTR);
      revealRunning = false;
      apply();
      return;
    }

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 520,
            easing: EASE_REVEAL,
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {});

    transition.finished
      .catch(() => {})
      .finally(() => {
        root.removeAttribute(REVEAL_ATTR);
        revealRunning = false;
      });
  }

  /**
   * Render Kokonut SVG Icon inside the button container
   */
  let idCounter = 0;
  function renderButtonContents(button, showLabel = true) {
    idCounter++;
    const maskId = `kokonut-mask-${idCounter}`;

    const raysSvg = RAYS.map((ray, index) =>
      `<line class="kokonut-ray" data-index="${index}" data-part="ray" x1="${ray.from.x}" y1="${ray.from.y}" x2="${ray.to.x}" y2="${ray.to.y}" />`
    ).join('');

    const labelHtml = showLabel ? `
      <span aria-hidden="true" class="kokonut-switch-label-wrap">
        <span class="kokonut-switch-label kokonut-label-light" data-part="label">Light</span>
        <span class="kokonut-switch-label kokonut-label-dark" data-part="label">Dark</span>
      </span>
    ` : '';

    button.innerHTML = `
      <svg aria-hidden="true" class="kokonut-switch-icon" fill="none" height="16" width="16" viewBox="0 0 24 24">
        <mask id="${maskId}">
          <rect fill="white" height="32" width="32" x="-4" y="-4" />
          <circle cx="17" cy="7" r="7.5" fill="black" data-part="bite" class="kokonut-bite" />
        </mask>
        <g mask="url(#${maskId})">
          <circle cx="12" cy="12" r="4.75" fill="currentColor" data-part="disc" class="kokonut-disc" />
        </g>
        <g stroke="currentColor" stroke-linecap="round" stroke-width="2">
          ${raysSvg}
        </g>
      </svg>
      ${labelHtml}
    `;
  }

  /**
   * Primary Click Handler for Kokonut Switch Button
   */
  function handleKokonutClick(e) {
    const button = e.currentTarget || e.target.closest('.kokonut-switch-btn');
    if (!button) return;

    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || (root.classList.contains('dark') ? 'dark' : 'light');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    const apply = () => {
      // Capture WAAPI snapshot across all buttons
      const buttons = document.querySelectorAll('.kokonut-switch-btn');
      const allParts = [];
      buttons.forEach(b => {
        allParts.push(...b.querySelectorAll('[data-part]'));
      });
      const beforeSnapshot = snapshot(allParts);

      // Apply theme to DOM
      if (typeof setTheme === 'function') {
        setTheme(nextTheme);
      } else {
        root.setAttribute('data-theme', nextTheme);
        root.classList.toggle('dark', nextTheme === 'dark');
        if (document.body) {
          document.body.classList.toggle('dark-theme', nextTheme === 'dark');
        }
        localStorage.setItem('ngg_theme', nextTheme);
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: nextTheme } }));
      }

      // Update ARIA states
      buttons.forEach(b => {
        b.setAttribute('aria-pressed', nextTheme === 'dark');
        b.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      });

      // Run WAAPI morphing
      morph(beforeSnapshot, nextTheme === 'dark');
    };

    revealFrom(button, apply);
  }

  /**
   * Initialize all Kokonut Switch Buttons on the page
   */
  function initKokonutSwitch() {
    const buttons = document.querySelectorAll('.kokonut-switch-btn');
    const root = document.documentElement;
    const isDark = (root.getAttribute('data-theme') || (root.classList.contains('dark') ? 'dark' : 'light')) === 'dark';

    buttons.forEach((btn) => {
      const showLabel = !btn.classList.contains('icon-only');
      renderButtonContents(btn, showLabel);
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('aria-pressed', isDark);

      // Attach click handler (idempotent)
      btn.removeEventListener('click', handleKokonutClick);
      btn.addEventListener('click', handleKokonutClick);
    });
  }

  // Auto-init on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKokonutSwitch);
  } else {
    initKokonutSwitch();
  }

  // Export to global scope
  window.initKokonutSwitch = initKokonutSwitch;
  window.handleKokonutClick = handleKokonutClick;

})();
