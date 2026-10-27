/**
 * Next Gen Grading - Theme Manager (Light/Dark Mode) & 3D Transition Loader
 * Handles persistent theme switching and 3D isometric transition animations
 */

(function () {
  // 1. Immediate Theme Pre-load (Prevents FOUC / White Flash)
  const savedTheme = localStorage.getItem('ngg_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);

  if (document.body) {
    document.body.classList.toggle('dark-theme', initialTheme === 'dark');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.toggle('dark-theme', initialTheme === 'dark');
      updateThemeToggleIcons();
      injectLoaderHTML();
    });
  }
})();

/**
 * Get current theme
 * @returns {'light'|'dark'}
 */
function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Set active theme and update UI
 * @param {'light'|'dark'} theme 
 * @param {boolean} notify 
 */
function setTheme(theme) {
  const isDark = theme === 'dark';
  const root = document.documentElement;

  // Add temporary transition class for smooth visual shift
  root.classList.add('theme-transitioning');
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', isDark);
  
  if (document.body) {
    document.body.classList.toggle('dark-theme', isDark);
  }
  
  localStorage.setItem('ngg_theme', theme);
  updateThemeToggleIcons();

  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));

  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 350);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme(event) {
  if (window.handleKokonutClick && document.querySelector('.kokonut-switch-btn')) {
    const targetBtn = (event && (event.currentTarget || event.target.closest('.kokonut-switch-btn'))) || document.querySelector('.kokonut-switch-btn');
    if (targetBtn) {
      window.handleKokonutClick({ currentTarget: targetBtn });
      return;
    }
  }

  // Fallback animation for legacy toggle buttons
  const btn = (event && (event.currentTarget || event.target)) || document.querySelector('.theme-toggle-btn');
  const icon = btn ? (btn.tagName === 'I' ? btn : btn.querySelector('i')) : null;
  if (icon) {
    icon.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    icon.style.transform = 'rotate(180deg) scale(0.7)';
    setTimeout(() => {
      icon.style.transform = 'rotate(360deg) scale(1.15)';
      setTimeout(() => {
        icon.style.transform = '';
      }, 200);
    }, 150);
  }

  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

/**
 * Update all theme toggle buttons across the page
 */
function updateThemeToggleIcons() {
  const current = getTheme();
  const isDark = current === 'dark';

  document.querySelectorAll('.kokonut-switch-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', isDark);
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  });

  document.querySelectorAll('.theme-toggle-btn:not(.kokonut-switch-btn)').forEach((btn) => {
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    btn.classList.toggle('is-dark', isDark);
    
    // Support FontAwesome or Bootstrap Icons
    const icon = btn.querySelector('i');
    if (icon) {
      if (icon.className.includes('bi')) {
        icon.className = isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill';
      } else {
        icon.className = isDark ? 'fa-solid fa-sun text-warning' : 'fa-solid fa-moon';
      }
    }
  });
}

/**
 * Generate 3D Loader HTML Overlay
 */
function injectLoaderHTML() {
  if (document.getElementById('loader3DOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'loader3DOverlay';
  overlay.className = 'loader-3d-overlay';
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('role', 'alert');

  overlay.innerHTML = `
    <div class="loader-3d-container">
      <div class="loader-3d-scene">
        <div class="loader-orbit-ring ring-1"></div>
        <div class="loader-orbit-ring ring-2"></div>
        
        <div class="cube-3d-wrap">
          <div class="cube-3d-face face-front">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.55L4.45 9 12 4.91 19.55 9 12 11.55zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
          </div>
          <div class="cube-3d-face face-back">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z"/></svg>
          </div>
          <div class="cube-3d-face face-right">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.4-7.2L2.4 12l7.2-2.8L12 2z"/></svg>
          </div>
          <div class="cube-3d-face face-left">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="5"/><path d="M15.5 13.5L19 21l-7-3.2L5 21l3.5-7.5"/></svg>
          </div>
          <div class="cube-3d-face face-top"><span>NGG</span></div>
          <div class="cube-3d-face face-bottom"><div class="cube-glow-core"></div></div>
        </div>
        
        <div class="loader-3d-ground-shadow"></div>
      </div>

      <div class="loader-3d-meta">
        <div class="loader-3d-badge">
          <span class="loader-3d-pulse-dot"></span>
          <span id="loader3DBadgeText">Next Gen Grading</span>
        </div>
        <h3 class="loader-3d-title" id="loader3DTitle">Authenticating Session</h3>
        <p class="loader-3d-subtitle" id="loader3DSubtitle">Securing credentials and verifying cryptographic permissions...</p>
        
        <div class="loader-3d-progress-track">
          <div class="loader-3d-progress-fill" id="loader3DFill"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Trigger 3D Animated Loading Transition
 * @param {object} options
 * @param {string} options.title - Header message
 * @param {string} options.subtitle - Supporting text
 * @param {string} options.badge - Optional badge text
 * @param {number} options.duration - Duration in ms (default 1200)
 * @param {function} options.onComplete - Callback executed when animation finishes
 */
function show3DLoader(options = {}) {
  injectLoaderHTML();

  const overlay = document.getElementById('loader3DOverlay');
  const titleEl = document.getElementById('loader3DTitle');
  const subtitleEl = document.getElementById('loader3DSubtitle');
  const badgeEl = document.getElementById('loader3DBadgeText');
  const fillEl = document.getElementById('loader3DFill');

  const title = options.title || 'Authenticating Academic Session';
  const subtitle = options.subtitle || 'Verifying credentials and loading portal services...';
  const badge = options.badge || 'Next Gen Grading';
  const duration = options.duration || 1200;

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (badgeEl) badgeEl.textContent = badge;
  if (fillEl) fillEl.style.width = '0%';

  overlay.style.display = 'flex';
  // Force reflow
  void overlay.offsetWidth;
  overlay.classList.add('active');

  // Smoothly fill progress bar
  setTimeout(() => {
    if (fillEl) fillEl.style.width = '100%';
  }, 50);

  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.style.display = 'none';
      if (typeof options.onComplete === 'function') {
        options.onComplete();
      }
    }, 250);
  }, duration);
}

/**
 * Force hide 3D loader immediately
 */
function hide3DLoader() {
  const overlay = document.getElementById('loader3DOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
}

// Global exports
window.getTheme = getTheme;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.show3DLoader = show3DLoader;
window.hide3DLoader = hide3DLoader;

/**
 * Automatically adapt Chart.js theme defaults if Chart.js is present
 */
function updateChartDefaults() {
  if (typeof window.Chart === 'undefined') return;
  const isDark = getTheme() === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.8)';
  
  if (Chart.defaults) {
    Chart.defaults.color = textColor;
    if (Chart.defaults.scale && Chart.defaults.scale.grid) {
      Chart.defaults.scale.grid.color = gridColor;
    }
  }
}

window.addEventListener('themechange', () => {
  updateChartDefaults();
});

document.addEventListener('DOMContentLoaded', () => {
  updateThemeToggleIcons();
  injectLoaderHTML();
  updateChartDefaults();
});

/**
 * Universal Mobile Sidebar Navigation Drawer Manager
 */
function toggleStudentSidebar() {
  const sidebar = document.querySelector('.student-clay-sidebar');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('show');
  let backdrop = document.getElementById('claySidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'claySidebarBackdrop';
    backdrop.className = 'clay-sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.onclick = () => closeAllSidebars();
    document.body.appendChild(backdrop);
  }
  backdrop.classList.toggle('show', isOpen);
  document.body.classList.toggle('sidebar-drawer-open', isOpen);
}

function toggleSidebar() {
  const claySidebar = document.querySelector('.student-clay-sidebar');
  if (claySidebar) {
    toggleStudentSidebar();
    return;
  }
  const sidebar = document.querySelector('.sidebar, .app-sidebar');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('show');
  let backdrop = document.getElementById('claySidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'claySidebarBackdrop';
    backdrop.className = 'clay-sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.onclick = () => closeAllSidebars();
    document.body.appendChild(backdrop);
  }
  backdrop.classList.toggle('show', isOpen);
  document.body.classList.toggle('sidebar-drawer-open', isOpen);
}

function closeAllSidebars() {
  document.querySelectorAll('.student-clay-sidebar, .sidebar, .app-sidebar').forEach(el => {
    el.classList.remove('show');
  });
  const backdrop = document.getElementById('claySidebarBackdrop');
  if (backdrop) backdrop.classList.remove('show');
  document.body.classList.remove('sidebar-drawer-open');
}

// Auto-close drawer when clicking any sidebar link on mobile (< 1024px)
document.addEventListener('click', (e) => {
  if (window.innerWidth < 1024) {
    const navLink = e.target.closest('.student-nav-link, .nav-link, .nav-link-custom, .sidebar-menu a');
    if (navLink) {
      closeAllSidebars();
    }
  }
});

// Close drawer on Escape key press
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllSidebars();
  }
});

window.toggleStudentSidebar = toggleStudentSidebar;
window.toggleSidebar = toggleSidebar;
window.closeAllSidebars = closeAllSidebars;

// Synchronize with OS color scheme changes when user hasn't set an explicit preference
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('ngg_theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}


