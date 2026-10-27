/**
 * Hover.dev TextParallaxContent Component Engine
 * Uses GSAP ScrollTrigger to power buttery smooth sticky image scaling,
 * scrim opacity fade, and dynamic Y-axis text parallax matching Framer Motion's useTransform.
 */

(function () {
  'use strict';

  function initTextParallax() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[TextParallax] GSAP or ScrollTrigger not loaded, falling back to CSS sticky');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const containers = document.querySelectorAll('.text-parallax-container');
    if (!containers.length) return;

    containers.forEach((container, idx) => {
      const stage = container.querySelector('.text-parallax-stage');
      const stickyImg = container.querySelector('.text-parallax-sticky-img');
      const overlayCopy = container.querySelector('.text-parallax-overlay-copy');
      const scrim = container.querySelector('.text-parallax-scrim');

      if (!stage || !stickyImg || !overlayCopy) return;

      // 1. Precise Pinning with ScrollTrigger
      // Pins the image inside the 150vh stage without jumping
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 12px',
        end: 'bottom bottom',
        pin: stickyImg,
        pinSpacing: false,
        anticipatePin: 1
      });

      // 2. Scale sticky image: [0, 1] -> [1, 0.85] as user scrolls through the end of stage
      gsap.fromTo(stickyImg, 
        { scale: 1 },
        {
          scale: 0.86,
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'bottom bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );

      // 3. Scrim opacity fade: [0, 1] -> [1, 0] as section leaves viewport
      if (scrim) {
        gsap.to(scrim, {
          opacity: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'bottom bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      }

      // 4. Parallax Text Overlay
      // Y moves from +250px to -250px
      // Opacity fades in at 0.25 -> 1 at 0.5 -> fades out at 0.75
      gsap.fromTo(overlayCopy, 
        { y: 250, opacity: 0 },
        {
          y: -250,
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            onUpdate: (self) => {
              const p = self.progress;
              let op = 0;
              if (p < 0.25) {
                op = Math.max(0, p / 0.25);
              } else if (p <= 0.5) {
                op = 1;
              } else if (p < 0.75) {
                op = Math.max(0, 1 - (p - 0.5) / 0.25);
              } else {
                op = 0;
              }
              overlayCopy.style.opacity = op;
            }
          }
        }
      );
    });

    console.log(`[TextParallax] Initialized ${containers.length} parallax stages successfully`);
  }

  // Auto-init on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initTextParallax, 150);
    });
  } else {
    setTimeout(initTextParallax, 150);
  }

  // Export to window
  window.initTextParallax = initTextParallax;

})();
