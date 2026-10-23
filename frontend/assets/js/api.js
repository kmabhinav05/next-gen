/**
 * Next Gen Grading - Global API Client & Notification System
 * Compatible with both apiRequest() and api.get() / api.post() syntax
 */

const API_BASE = '/api';

/**
 * Toast Notification Dispatcher
 * @param {string} message 
 * @param {'success'|'error'|'danger'|'info'|'warning'} type 
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const normalizedType = type === 'danger' ? 'error' : type;
  toast.className = `toast-message custom-toast ${normalizedType}`;

  const iconMap = {
    success: 'fa-solid fa-circle-check text-success',
    error: 'fa-solid fa-triangle-exclamation text-danger',
    danger: 'fa-solid fa-triangle-exclamation text-danger',
    warning: 'fa-solid fa-circle-exclamation text-warning',
    info: 'fa-solid fa-circle-info text-info',
  };

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <i class="${iconMap[type] || 'fa-solid fa-circle-info'}"></i>
      <span>${message}</span>
    </div>
    <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 1.1rem; margin-left: auto;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

/**
 * Perform Authenticated Fetch Request
 * @param {string} endpoint - API path (e.g. '/admin/stats')
 * @param {object} options - Fetch options
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove content-type if uploading FormData (Multer sets boundary automatically)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1000);
      throw new Error(data.message || 'Unauthorized');
    }

    if (!response.ok) {
      const errMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

/**
 * Unified `api` Object supporting api.get, api.post, api.patch, api.delete
 */
const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  patch: (url, body) => apiRequest(url, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};

// Export to window global scope for all pages
window.api = api;
window.apiRequest = apiRequest;
window.showToast = showToast;

/**
 * Utility: Format ISO date string
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Utility: Format percentage
 */
function formatPercentage(num) {
  if (num === null || num === undefined || isNaN(num)) return '0.0%';
  return `${parseFloat(num).toFixed(1)}%`;
}

window.formatDate = formatDate;
window.formatPercentage = formatPercentage;

/* ============================================================================
   UNIVERSAL MODAL ACCESSIBILITY & INTERACTION SYSTEM
   ============================================================================ */

let lastActiveElementBeforeModal = null;

/**
 * Open a modal with accessibility, animation, and scroll lock
 * @param {string|HTMLElement} modalOrId 
 */
function openModalAccessible(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;

  lastActiveElementBeforeModal = document.activeElement;
  modal.style.display = 'flex';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  // Focus the first sensible input element
  const focusable = modal.querySelector('input:not([type="hidden"]), select, textarea, button:not([disabled])');
  if (focusable) {
    setTimeout(() => focusable.focus(), 80);
  }
}

/**
 * Close a modal and restore previous focus
 * @param {string|HTMLElement} modalOrId 
 */
function closeModalAccessible(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;

  modal.style.display = 'none';
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');

  // Check if any other modal is still open
  const anyOpenModal = document.querySelector('.modal-overlay.active, .modal-overlay[style*="display: flex"]');
  if (!anyOpenModal) {
    document.body.classList.remove('modal-open');
  }

  if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === 'function') {
    lastActiveElementBeforeModal.focus();
  }
}

/**
 * Password Visibility Toggle
 * @param {string} inputId 
 * @param {HTMLElement} btn 
 */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
  }
  btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
}

/**
 * Form Field Inline Error Helper
 * @param {string} fieldId 
 * @param {string|null} message 
 */
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  if (input) {
    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  }
  if (errorEl) {
    if (message) {
      errorEl.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> ${message}`;
      errorEl.classList.add('active');
    } else {
      errorEl.innerHTML = '';
      errorEl.classList.remove('active');
    }
  }
}

/**
 * Clear all field errors in a form
 * @param {string} formId 
 */
function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('.field-error-text').forEach(el => {
    el.innerHTML = '';
    el.classList.remove('active');
  });
}

// Global Keyboard Escape & Backdrop Click listeners
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal-overlay');
    openModals.forEach((modal) => {
      if (modal.style.display === 'flex' || modal.classList.contains('active')) {
        // Trigger the corresponding close function if available
        if (modal.id === 'student-modal' && typeof window.closeStudentModal === 'function') {
          window.closeStudentModal();
        } else if (modal.id === 'subject-modal' && typeof window.closeSubjectModal === 'function') {
          window.closeSubjectModal();
        } else if (modal.id === 'notice-modal' && typeof window.closeNoticeModal === 'function') {
          window.closeNoticeModal();
        } else if (modal.id === 'staff-modal' && typeof window.closeStaffModal === 'function') {
          window.closeStaffModal();
        } else if (modal.id === 'assign-modal' && typeof window.closeAssignModal === 'function') {
          window.closeAssignModal();
        } else {
          closeModalAccessible(modal);
        }
      }
    });
  }
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    if (e.target.id === 'student-modal' && typeof window.closeStudentModal === 'function') {
      window.closeStudentModal();
    } else if (e.target.id === 'subject-modal' && typeof window.closeSubjectModal === 'function') {
      window.closeSubjectModal();
    } else if (e.target.id === 'notice-modal' && typeof window.closeNoticeModal === 'function') {
      window.closeNoticeModal();
    } else if (e.target.id === 'staff-modal' && typeof window.closeStaffModal === 'function') {
      window.closeStaffModal();
    } else if (e.target.id === 'assign-modal' && typeof window.closeAssignModal === 'function') {
      window.closeAssignModal();
    } else {
      closeModalAccessible(e.target);
    }
  }
});

// Export to window
window.openModalAccessible = openModalAccessible;
window.closeModalAccessible = closeModalAccessible;
window.togglePasswordVisibility = togglePasswordVisibility;
window.setFieldError = setFieldError;
window.clearFormErrors = clearFormErrors;
