// ArtUp — Queen's × Kingston pilot behaviours: nav state, the rotating artwork in the
// homepage frame, and sign-up links that aren't open yet. Loaded after script.js, which
// owns the CMS overlay and editor.
(function () {
  var body = document.body;
  function editing() { return body.classList.contains('cms-editing'); }

  // ---- nav: current page + Escape to close the mobile menu ----
  var here = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.site-header nav a[href], .site-header .nav-apply--bar').forEach(function (a) {
    var path = a.getAttribute('href').replace(/#.*$/, '').replace(/\/$/, '') || '/';
    if (path === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
  });
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.setAttribute('aria-controls', nav.id || 'site-nav');
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // ---- homepage frame: a different memory each visit, then a slow crossfade ----
  var ROTATE_MS = 60000;
  var frame = document.querySelector('[data-frame-rotator]');
  if (frame) {
    var slides = Array.prototype.slice.call(frame.querySelectorAll('.frame-slide'));
    var pauseBtn = document.querySelector('[data-frame-pause]');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false;
    var current = -1;

    // A slide only joins the rotation once it has an image — an empty CMS slot is skipped.
    function usable() {
      return slides.filter(function (s) {
        var img = s.querySelector('img');
        return img && img.getAttribute('src');
      });
    }

    function show(slide) {
      slides.forEach(function (s) {
        var on = s === slide;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      current = slides.indexOf(slide);
    }

    var pool = usable();
    if (pool.length) show(pool[Math.floor(Math.random() * pool.length)]);

    function advance() {
      if (paused || document.hidden || editing()) return;
      var list = usable();
      if (list.length < 2) return;
      var at = list.indexOf(slides[current]);
      show(list[(at + 1) % list.length]);
    }

    if (!reduced && pool.length > 1) {
      window.setInterval(advance, ROTATE_MS);
    } else if (pauseBtn) {
      pauseBtn.hidden = true;
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        pauseBtn.setAttribute('aria-label', paused ? 'Resume rotating artwork' : 'Pause rotating artwork');
      });
    }
  }

  // ---- sign-up links: disabled until a real form URL is saved through the CMS ----
  // The live href arrives asynchronously (script.js applies data-cms-href after fetching
  // content), so keep the disabled state in sync with the attribute rather than checking once.
  var applyLinks = document.querySelectorAll('a[data-apply-link]');
  function syncApply(a) {
    var href = (a.getAttribute('href') || '').trim();
    var open = href !== '' && href !== '#';
    a.setAttribute('aria-disabled', open ? 'false' : 'true');
    var note = a.getAttribute('data-apply-note') && document.getElementById(a.getAttribute('data-apply-note'));
    if (note) note.hidden = open;
  }
  applyLinks.forEach(function (a) {
    syncApply(a);
    if (window.MutationObserver) {
      new MutationObserver(function () { syncApply(a); }).observe(a, { attributes: true, attributeFilter: ['href'] });
    }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-apply-link]');
    if (!a || editing()) return;
    if (a.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });
})();
