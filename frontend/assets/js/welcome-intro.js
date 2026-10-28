/**
 * Welcome Intro Screen - Next Gen Grading
 * High-performance, zero-lag Indic multi-lingual welcoming speed-up screen
 * Words: Welcome, സ്വാഗതം, स्वागत है, வரவேற்பு, ସ୍ଵାଗତ, స్వాగతం, Welcome
 * Rapidly accelerating cadence without lag, ending cleanly on "Welcome".
 */

(function () {
  'use strict';

  // Only run on the public landing page
  const path = window.location.pathname;
  const isLandingPage = 
    path === '/' ||
    path.endsWith('/index.html') ||
    path.endsWith('/') ||
    path.endsWith('next%20gen/frontend/') ||
    path.endsWith('frontend/') ||
    path.endsWith('frontend/index.html');

  if (!isLandingPage) return;

  // Words requested by user in exact order, ending on Welcome
  const WORDS = [
    "Welcome",
    "സ്വാഗതം",
    "स्वागत है",
    "வரவேற்பு",
    "ସ୍ଵାଗତ",
    "స్వాగతం",
    "Welcome"
  ];

  // Highly responsive, fast-accelerating delays in milliseconds (speedy & zero lag)
  const DELAYS = [
    190, // Welcome
    145, // സ്വാഗതം (Malayalam)
    115, // स्वागत है (Hindi)
    90,  // வரவேற்பு (Tamil)
    75,  // ସ୍ଵାଗତ (Odia)
    65,  // స్వాగతం (Telugu)
    300  // Welcome (final resting greeting before smooth exit)
  ];

  function initIntroOverlay() {
    let overlay = document.getElementById('welcome-intro-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'welcome-intro-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Welcome to Next Gen Grading');

      overlay.innerHTML = `
        <div class="welcome-intro-skip-hint" id="welcomeIntroSkip">Skip ✕</div>
        <div class="welcome-intro-stage">
          <div class="welcome-intro-ambient-glow"></div>
          <div class="welcome-intro-word-wrap">
            <span id="welcome-intro-word" class="welcome-intro-word anim-even">${WORDS[0]}</span>
          </div>
        </div>
        <div class="welcome-intro-brand">
          Next Gen <span>Grading</span>
        </div>
      `;

      if (document.body) {
        document.body.prepend(overlay);
      } else {
        document.documentElement.appendChild(overlay);
      }
    }

    document.body.classList.add('welcome-intro-active');

    const wordEl = document.getElementById('welcome-intro-word');
    let currentIndex = 0;
    let timerId = null;
    let isFinished = false;

    function finish() {
      if (isFinished) return;
      isFinished = true;
      if (timerId) clearTimeout(timerId);

      overlay.classList.add('is-exiting');

      // Unblock page scrolling smoothly as curtain slides up
      setTimeout(() => {
        document.body.classList.remove('welcome-intro-active');
      }, 100);

      // Cleanly remove overlay after animation completes
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      }, 550);
    }

    // Dismiss on click/tap or skip button
    overlay.addEventListener('click', finish);

    // Dismiss on keypress (Escape / Space / Enter)
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finish();
        document.removeEventListener('keydown', onKey);
      }
    });

    function nextWord() {
      if (isFinished) return;
      currentIndex++;

      if (currentIndex >= WORDS.length) {
        finish();
        return;
      }

      if (wordEl) {
        wordEl.textContent = WORDS[currentIndex];
        // Toggle between anim-even and anim-odd for zero-lag hardware-accelerated transitions
        wordEl.className = 'welcome-intro-word ' + (currentIndex % 2 === 0 ? 'anim-even' : 'anim-odd');
      }

      timerId = setTimeout(nextWord, DELAYS[currentIndex] || 70);
    }

    // Begin accelerating sequence immediately
    timerId = setTimeout(nextWord, DELAYS[0]);
  }

  // Run instantaneously as soon as overlay element is available to eliminate all lag
  if (document.getElementById('welcome-intro-overlay')) {
    initIntroOverlay();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntroOverlay);
  } else {
    initIntroOverlay();
  }
})();
