(function () {
  var app = document.getElementById('app');

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    Object.keys(opts.headers || {}).forEach(function (k) { headers[k] = opts.headers[k]; });
    opts.headers = headers;
    opts.credentials = 'same-origin';
    opts.cache = 'no-store';
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  function renderLogin(message) {
    app.innerHTML =
      '<div class="login-shell">' +
      '<h1>ArtUp Life</h1>' +
      '<p class="hint">Sign in to edit the site.</p>' +
      (message ? '<p class="error">' + message + '</p>' : '') +
      '<form id="loginForm">' +
      '<label>Username<input type="text" name="username" autocomplete="username" required></label>' +
      '<label>Password<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<button type="submit">Log in</button>' +
      '</form></div>';
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }) })
        .then(function (res) {
          if (res.ok) { window.location.href = '/'; } else { renderLogin('Incorrect username or password.'); }
        });
    });
  }

  // Editing itself now happens directly on the live site — this page is just the door in.
  api('/api/admin/me').then(function (res) {
    if (res.ok && res.data.authenticated) {
      window.location.href = '/';
      return;
    }
    renderLogin();
  });
})();
