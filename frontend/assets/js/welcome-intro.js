/**
 * Welcome Intro Screen - Next Gen Grading
 * High-performance, zero-lag multi-lingual welcoming preloader
 */

(function () {
  'use strict';

  // Only run on the public landing page (root or index.html)
  const path = window.location.pathname;
  const isLandingPage = 
    path === '/' ||
    path.endsWith('/index.html') ||
    path.endsWith('/') ||
    path.endsWith('next%20gen/frontend/') ||
    path.endsWith('frontend/') ||
    path.endsWith('frontend/index.html');

  if (!isLandingPage) return;

  // Words requested by user in order
  const WORDS = [
    "Welcome",
    "സ്വാഗതം",
    "स्वागत है",
    "வரவேற்பு",
    "ସ୍ଵାଗତ",
    "స్వాగతం",
    "सुस्वागतम्",
    "স্বাগতম",
    "Welcome"
  ];

  // Accelerating delays in milliseconds (starts clearly, speeds up, pauses briefly on climax)
  const DELAYS = [
    320, // Welcome
    250, // സ്വാഗതം (Malayalam)
    210, // स्वागत है (Hindi)
    170, // வரவேற்பு (Tamil)
    140, // ସ୍ଵାଗତ (Odia)
    115, // స్వాగతం (Telugu)
    95,  // सुस्वागतम् (Sanskrit)
    85,  // স্বাগতম (Bengali)
    280  // Welcome (Final punctuation)
  ];

  function createIntroOverlay() {
    if (document.getElementById('welcome-intro-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'welcome-intro-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welcome to Next Gen Grading');

    overlay.innerHTML = `
      <div class="welcome-intro-skip-hint" id="welcomeIntroSkip">Skip ✕</div>
      <div class="welcome-intro-stage">
        <div class="welcome-intro-dot"></div>
        <div class="welcome-intro-word-wrap">
          <span id="welcome-intro-word" class="welcome-intro-word anim-even">${WORDS[0]}</span>
        </div>
      </div>
      <div class="welcome-intro-brand">
        Next Gen <span>Grading</span>
      </div>
    `;

    document.body.prepend(overlay);
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
      }, 150);

      // Cleanly remove overlay after animation completes
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
      }, 700);
    }

    // Dismiss on click/tap
    overlay.addEventListener('click', finish);

    // Dismiss on keypress (Escape / Space)
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ') {
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
        // Toggle between anim-even and anim-odd classes to trigger zero-lag hardware-accelerated animations
        wordEl.className = 'welcome-intro-word ' + (currentIndex % 2 === 0 ? 'anim-even' : 'anim-odd');
      }

      timerId = setTimeout(nextWord, DELAYS[currentIndex] || 100);
    }

    // Begin accelerating cadence
    timerId = setTimeout(nextWord, DELAYS[0]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createIntroOverlay);
  } else {
    createIntroOverlay();
  }
})();
