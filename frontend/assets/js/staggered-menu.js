/**
 * StaggeredMenu - React Bits GSAP Animated Layered Drawer Menu
 * Renders multiple staggered underlay layers with smooth item entrance, 
 * rotating icon morph, and rolling label animations.
 */

(function () {
  'use strict';

  function initStaggeredMenu(wrapperEl, userOptions = {}) {
    if (!wrapperEl || wrapperEl.__staggeredMenu) {
      return wrapperEl?.__staggeredMenu || null;
    }

    if (typeof gsap === 'undefined') {
      console.warn('[StaggeredMenu] GSAP is required. Please include gsap.min.js.');
      return null;
    }

    const options = Object.assign({
      position: 'right',
      colors: ['#fef3c7', '#f59e0b', '#3aa68c'],
      accentColor: '#f59e0b',
      menuButtonColor: '',
      openMenuButtonColor: '',
      changeMenuColorOnOpen: true,
      closeOnClickAway: true,
      displayItemNumbering: true,
      displaySocials: true,
      onMenuOpen: null,
      onMenuClose: null
    }, userOptions);

    let isOpen = false;
    let isBusy = false;

    const panel = wrapperEl.querySelector('.staggered-menu-panel');
    const preContainer = wrapperEl.querySelector('.sm-prelayers');
    const preLayers = preContainer ? Array.from(preContainer.querySelectorAll('.sm-prelayer')) : [];
    const toggleBtn = document.getElementById('staggeredMenuToggleBtn') || wrapperEl.querySelector('.sm-toggle');
    const icon = toggleBtn?.querySelector('.sm-icon');
    const plusH = toggleBtn?.querySelector('.sm-icon-line:not(.sm-icon-line-v)');
    const plusV = toggleBtn?.querySelector('.sm-icon-line-v');
    const textInner = toggleBtn?.querySelector('.sm-toggle-textInner');
    const backdrop = wrapperEl.querySelector('.staggered-menu-backdrop');

    if (!panel) return null;

    const offscreen = options.position === 'left' ? -100 : 100;

    // Initial setup
    gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
    if (preContainer) {
      gsap.set(preContainer, { xPercent: 0, opacity: 1 });
    }
    if (plusH) gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
    if (plusV) gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
    if (icon) gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
    if (textInner) gsap.set(textInner, { yPercent: 0 });

    let openTimeline = null;
    let closeTween = null;
    let spinTween = null;
    let textCycleAnim = null;

    function buildOpenTimeline() {
      openTimeline?.kill();
      if (closeTween) {
        closeTween.kill();
        closeTween = null;
      }

      const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
      const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
      const socialTitle = panel.querySelector('.sm-socials-title');
      const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

      const layerStates = preLayers.map(el => ({ el, start: offscreen }));
      const panelStart = offscreen;

      if (itemEls.length) {
        gsap.set(itemEls, { yPercent: 140, rotate: 10 });
      }
      if (numberEls.length) {
        gsap.set(numberEls, { '--sm-num-opacity': 0 });
      }
      if (socialTitle) {
        gsap.set(socialTitle, { opacity: 0 });
      }
      if (socialLinks.length) {
        gsap.set(socialLinks, { y: 25, opacity: 0 });
      }

      const tl = gsap.timeline({ paused: true });

      // Staggered underlay layers
      layerStates.forEach((ls, i) => {
        tl.fromTo(
          ls.el,
          { xPercent: ls.start },
          { xPercent: 0, duration: 0.5, ease: 'power4.out' },
          i * 0.07
        );
      });

      const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
      const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
      const panelDuration = 0.65;

      // Aside Panel
      tl.fromTo(
        panel,
        { xPercent: panelStart },
        { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
        panelInsertTime
      );

      // Item entrance animation
      if (itemEls.length) {
        const itemsStartRatio = 0.15;
        const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
        tl.to(
          itemEls,
          {
            yPercent: 0,
            rotate: 0,
            duration: 1,
            ease: 'power4.out',
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart
        );

        if (numberEls.length) {
          tl.to(
            numberEls,
            {
              duration: 0.6,
              ease: 'power2.out',
              '--sm-num-opacity': 1,
              stagger: { each: 0.07, from: 'start' }
            },
            itemsStart + 0.1
          );
        }
      }

      // Socials / Portals entrance
      if (socialTitle || socialLinks.length) {
        const socialsStart = panelInsertTime + panelDuration * 0.4;
        if (socialTitle) {
          tl.to(
            socialTitle,
            {
              opacity: 1,
              duration: 0.5,
              ease: 'power2.out'
            },
            socialsStart
          );
        }
        if (socialLinks.length) {
          tl.to(
            socialLinks,
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              ease: 'power3.out',
              stagger: { each: 0.08, from: 'start' },
              onComplete: () => {
                gsap.set(socialLinks, { clearProps: 'opacity' });
              }
            },
            socialsStart + 0.04
          );
        }
      }

      openTimeline = tl;
      return tl;
    }

    function playOpen() {
      if (isBusy) return;
      isBusy = true;
      wrapperEl.setAttribute('data-open', 'true');
      panel.setAttribute('aria-hidden', 'false');
      toggleBtn?.setAttribute('aria-expanded', 'true');

      const tl = buildOpenTimeline();
      if (tl) {
        tl.eventCallback('onComplete', () => {
          isBusy = false;
        });
        tl.play(0);
      } else {
        isBusy = false;
      }
    }

    function playClose() {
      openTimeline?.kill();
      openTimeline = null;

      const all = [...preLayers, panel];
      closeTween?.kill();

      closeTween = gsap.to(all, {
        xPercent: offscreen,
        duration: 0.32,
        ease: 'power3.in',
        overwrite: 'auto',
        onComplete: () => {
          wrapperEl.removeAttribute('data-open');
          panel.setAttribute('aria-hidden', 'true');
          toggleBtn?.setAttribute('aria-expanded', 'false');

          const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
          if (itemEls.length) {
            gsap.set(itemEls, { yPercent: 140, rotate: 10 });
          }
          const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
          if (numberEls.length) {
            gsap.set(numberEls, { '--sm-num-opacity': 0 });
          }
          const socialTitle = panel.querySelector('.sm-socials-title');
          const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
          if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
          if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
          isBusy = false;
        }
      });
    }

    function animateIcon(opening) {
      if (!icon) return;
      spinTween?.kill();
      if (opening) {
        spinTween = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
      } else {
        spinTween = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
      }
    }

    function animateText(opening) {
      if (!textInner) return;
      textCycleAnim?.kill();

      const currentLabel = opening ? 'Menu' : 'Close';
      const targetLabel = opening ? 'Close' : 'Menu';
      const cycles = 3;
      const seq = [currentLabel];
      let last = currentLabel;
      for (let i = 0; i < cycles; i++) {
        last = last === 'Menu' ? 'Close' : 'Menu';
        seq.push(last);
      }
      if (last !== targetLabel) seq.push(targetLabel);
      seq.push(targetLabel);

      // Re-render lines
      textInner.innerHTML = seq.map(l => `<span class="sm-toggle-line">${l}</span>`).join('');

      gsap.set(textInner, { yPercent: 0 });
      const lineCount = seq.length;
      const finalShift = ((lineCount - 1) / lineCount) * 100;
      textCycleAnim = gsap.to(textInner, {
        yPercent: -finalShift,
        duration: 0.45 + lineCount * 0.06,
        ease: 'power4.out'
      });
    }

    function toggleMenu() {
      isOpen = !isOpen;
      if (isOpen) {
        options.onMenuOpen?.();
        playOpen();
      } else {
        options.onMenuClose?.();
        playClose();
      }
      animateIcon(isOpen);
      animateText(isOpen);
    }

    function closeMenu() {
      if (isOpen) {
        isOpen = false;
        options.onMenuClose?.();
        playClose();
        animateIcon(false);
        animateText(false);
      }
    }

    // Toggle button click listener
    toggleBtn?.addEventListener('click', toggleMenu);

    // Backdrop click closes menu
    backdrop?.addEventListener('click', closeMenu);

    // Click outside listener
    if (options.closeOnClickAway) {
      document.addEventListener('mousedown', e => {
        if (!isOpen) return;
        if (
          panel &&
          !panel.contains(e.target) &&
          toggleBtn &&
          !toggleBtn.contains(e.target)
        ) {
          closeMenu();
        }
      });
    }

    // Escape key closes menu
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    });

    // Clicking any link in the panel closes the menu smoothly and handles hash smooth scroll
    panel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        closeMenu();
        if (href && href.startsWith('#')) {
          const target = document.getElementById(href.substring(1));
          if (target) {
            e.preventDefault();
            const navbar = document.querySelector('.lms-navbar');
            const navHeight = (navbar ? navbar.offsetHeight : 70) + 15;
            const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
            window.scrollTo({
              top: Math.max(0, targetPos),
              behavior: 'smooth'
            });
          }
        }
      });
    });

    const api = {
      open: () => { if (!isOpen) toggleMenu(); },
      close: closeMenu,
      toggle: toggleMenu,
      isOpen: () => isOpen
    };

    wrapperEl.__staggeredMenu = api;
    return api;
  }

  window.initStaggeredMenu = initStaggeredMenu;

  // Auto-initialize if #staggered-menu exists
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('staggered-menu');
    if (el) {
      initStaggeredMenu(el);
    }
  });
})();
