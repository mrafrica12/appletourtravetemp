/* ================================================================
   Apple Tours & Safaris — Admin Authentication Guard
   • Redirects to login.html if session is not active
   • Exposes window.ATS_AUTH for login / logout / credential change
   ================================================================ */
(function () {
  var DEFAULT_EMAIL    = 'bngie@umojaserv.com';
  var DEFAULT_PASSWORD = 'Welcome2026!';
  var SESSION_KEY      = 'ats_admin_session';
  var CREDS_KEY        = 'ats_admin_credentials';

  /* ---- Credential helpers ---- */
  function getCredentials() {
    try {
      var s = JSON.parse(localStorage.getItem(CREDS_KEY));
      if (s && s.email && s.password) return s;
    } catch (e) {}
    return { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
  }

  function updateCredentials(newEmail, newPassword) {
    if (!newEmail || !newPassword) return false;
    localStorage.setItem(CREDS_KEY, JSON.stringify({
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
    }));
    return true;
  }

  /* ---- Session helpers ---- */
  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === 'ats-auth-ok';
  }

  function login(email, password) {
    var creds = getCredentials();
    if (
      email.trim().toLowerCase() === creds.email.toLowerCase() &&
      password === creds.password
    ) {
      sessionStorage.setItem(SESSION_KEY, 'ats-auth-ok');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace('login.html');
  }

  /* ---- Guard: block access on every page except login.html ---- */
  var page = window.location.pathname.split('/').pop();
  if (page !== 'login.html' && !isAuthenticated()) {
    window.location.replace('login.html');
  }

  /* ---- After DOM ready: wire up logout + show email in topbar ---- */
  document.addEventListener('DOMContentLoaded', function () {
    /* Topbar user — click to sign out */
    var topbarUser = document.querySelector('.topbar-user');
    if (topbarUser) {
      topbarUser.style.cursor = 'pointer';
      topbarUser.title = 'Click to sign out';
      topbarUser.addEventListener('click', function () {
        if (confirm('Sign out of Apple Tours Admin?')) logout();
      });
      /* Show username from stored credentials */
      var nameEl = topbarUser.querySelector('.topbar-user-name');
      if (nameEl) {
        var email = getCredentials().email;
        nameEl.textContent = email.split('@')[0];
      }
    }

    /* Sidebar user name */
    var sidebarName = document.querySelector('.sidebar-user-name');
    if (sidebarName) {
      sidebarName.textContent = getCredentials().email.split('@')[0];
    }
  });

  /* ---- Public API ---- */
  window.ATS_AUTH = {
    login: login,
    logout: logout,
    isAuthenticated: isAuthenticated,
    updateCredentials: updateCredentials,
    getCredentials: getCredentials,
  };
})();
