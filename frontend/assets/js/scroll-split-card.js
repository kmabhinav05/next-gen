/**
 * ScrollSplitCard Component - Vanilla JS & GSAP ScrollTrigger
 * Accurately implements 3-Stage 3D Panoramic Image Split & Flip Card Scroll Interaction
 */

(function () {
  'use strict';

  function initScrollSplitCard() {
    const container = document.getElementById('scrollSplitCardContainer');
    if (!container) return;

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[ScrollSplitCard] GSAP or ScrollTrigger not loaded. Retrying...');
      setTimeout(initScrollSplitCard, 100);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const cardLeft = document.getElementById('scrollSplitCard0');
    const cardMiddle = document.getElementById('scrollSplitCard1');
    const cardRight = document.getElementById('scrollSplitCard2');
    const deck = document.getElementById('scrollSplitDeck');
    const startText = document.getElementById('scrollSplitStartText');
    const endText = document.getElementById('scrollSplitEndText');

    if (!cardLeft || !cardMiddle || !cardRight || !deck) return;

    const frontLeft = cardLeft.querySelector('.scroll-split-front');
    const frontMiddle = cardMiddle.querySelector('.scroll-split-front');
    const frontRight = cardRight.querySelector('.scroll-split-front');

    // Enable hardware-accelerated 3D transforms
    gsap.set([cardLeft, cardMiddle, cardRight], { transformStyle: 'preserve-3d' });
    gsap.set(deck, { transformStyle: 'preserve-3d' });

    // Initial seamless panoramic border radii
    if (frontLeft) frontLeft.style.borderRadius = '18px 0px 0px 18px';
    if (frontMiddle) frontMiddle.style.borderRadius = '0px';
    if (frontRight) frontRight.style.borderRadius = '0px 18px 18px 0px';

    // Build timeline scrubbed directly to scroll position
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.75,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          // Smoothly open up rounded corners from 0 to 0.2
          const rP = Math.min(1, Math.max(0, p / 0.2));
          const fullR = rP * 18;
          if (frontLeft) frontLeft.style.borderRadius = `18px ${fullR}px ${fullR}px 18px`;
          if (frontMiddle) frontMiddle.style.borderRadius = `${fullR}px`;
          if (frontRight) frontRight.style.borderRadius = `${fullR}px 18px 18px ${fullR}px`;
        }
      }
    });

    // 1. Initial Indicator: Fades out from 0 to 0.1
    if (startText) {
      tl.to(startText, { opacity: 0, y: 20, ease: 'none', duration: 0.1 }, 0);
    }

    // 2. Stage 1: Separation and scale (0 to 0.4)
    tl.to(cardLeft, { x: -48, ease: 'none', duration: 0.4 }, 0)
      .to(cardRight, { x: 48, ease: 'none', duration: 0.4 }, 0)
      .to(deck, { scale: 0.9, ease: 'none', duration: 0.4 }, 0);

    // 3. Stage 2: 3D Flip (180deg), Z-rotation and overlap closer (0.4 to 0.8)
    tl.to(cardLeft, {
      rotateY: 180,
      rotateZ: 6,
      x: -24,
      ease: 'none',
      duration: 0.4
    }, 0.4)
    .to(cardMiddle, {
      rotateY: 180,
      rotateZ: 0,
      ease: 'none',
      duration: 0.4
    }, 0.4)
    .to(cardRight, {
      rotateY: 180,
      rotateZ: -6,
      x: 24,
      ease: 'none',
      duration: 0.4
    }, 0.4);

    // 4. Stage 3: Slide up deck and reveal ending text (0.8 to 1.0)
    tl.to(deck, { y: -160, ease: 'none', duration: 0.2 }, 0.8);
    if (endText) {
      tl.to(endText, { opacity: 1, y: 0, ease: 'none', duration: 0.2 }, 0.8);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollSplitCard);
  } else {
    initScrollSplitCard();
  }
})();
