/**
 * Next Gen Grading - Authentication & Session State Management
 */

function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

/**
 * Route Guard: Verify authentication & role permission
 * @param {string|string[]} allowedRoles 
 */
function requireAuth(allowedRoles = []) {
  const token = localStorage.getItem('token');
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = '/login.html';
    return null;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (roles.length > 0 && !roles.includes(user.role)) {
    alert(`Access Denied: Your account role (${user.role}) is not authorized for this section.`);
    // Redirect to respective dashboard
    const redirects = {
      admin: '/admin/index.html',
      staff: '/staff/index.html',
      student: '/student/index.html',
      parent: '/parent/index.html',
    };
    window.location.href = redirects[user.role] || '/login.html';
    return null;
  }

  return user;
}

/**
 * Logout User with 3D Departure Loading Animation
 */
async function logout() {
  if (typeof window.show3DLoader === 'function') {
    window.show3DLoader({
      title: 'Signing Out...',
      subtitle: 'Securing academic session, clearing encrypted tokens and redirecting...',
      badge: 'Secure Logout',
      duration: 1200,
      onComplete: async () => {
        try {
          await apiRequest('/auth/logout', { method: 'POST' });
        } catch (err) {
          // Ignore network fail
        } finally {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login.html';
        }
      }
    });
  } else {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore error on network fail
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
  }
}

/**
 * Render Header & Sidebar User Details
 */
function renderUserBadge() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  const displayName = user.profile?.displayName || user.username;
  if (nameEl) nameEl.textContent = displayName;
  if (roleEl) roleEl.textContent = user.role.toUpperCase();
  if (avatarEl) {
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'U';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderUserBadge();
});
