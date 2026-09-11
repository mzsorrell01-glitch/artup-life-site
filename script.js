(function () {
  // ---- mobile nav ----
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', nav.classList.contains('is-open') ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); });
    });
  }

  // ---- artwork thumbnail gallery ----
  var mainImg = document.querySelector('.gallery-main img');
  var thumbButtons = document.querySelectorAll('.thumb-gallery button');
  if (mainImg && thumbButtons.length) {
    thumbButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-full') || (btn.querySelector('img') && btn.querySelector('img').src);
        if (src) mainImg.src = src;
        thumbButtons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });
  }

  // ---- artist directory filters ----
  var filterButtons = document.querySelectorAll('.filter-tabs button');
  var artistCards = document.querySelectorAll('.artist-card');
  if (filterButtons.length && artistCards.length) {
    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var filter = btn.getAttribute('data-filter');
        artistCards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-medium') === filter;
          card.hidden = !match;
        });
      });
    });
  }

  // ---- campus canvas vote demo (visual only) ----
  document.querySelectorAll('.vote-buttons').forEach(function (group) {
    group.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-picked'); });
        btn.classList.add('is-picked');
      });
    });
  });

  // ---- contact form: real submission via /api/contact, with a mailto: fallback
  // if the email backend isn't configured yet (see api/contact.js) ----
  function currentContactEmail() {
    var el = document.querySelector('[data-cms="contact.email"]');
    return (el && el.textContent.trim()) || 'hello@artup.life';
  }

  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var contactSubmitBtn = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      contactForm.querySelectorAll('[required]').forEach(function (field) {
        var wrap = field.closest('.form-field');
        var ok = field.type === 'email'
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())
          : field.value.trim().length > 0;
        if (wrap) wrap.classList.toggle('has-error', !ok);
        if (!ok) valid = false;
      });
      if (!valid) return;

      var payload = {
        name: contactForm.elements.name.value.trim(),
        email: contactForm.elements.email.value.trim(),
        subject: contactForm.elements.subject.value.trim(),
        message: contactForm.elements.message.value.trim()
      };

      function showSuccess() {
        contactForm.classList.add('is-submitted');
        var success = document.getElementById('contactSuccess');
        if (success) success.classList.add('is-visible');
      }

      if (contactSubmitBtn) contactSubmitBtn.disabled = true;
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (r.ok) { showSuccess(); return; }
        if (r.status === 503) {
          // Email backend not configured yet — fall back to the visitor's own mail client.
          var to = currentContactEmail();
          var body = encodeURIComponent(payload.message + '\n\n— ' + payload.name + ' (' + payload.email + ')');
          window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(payload.subject) + '&body=' + body;
          showSuccess();
          return;
        }
        alert('Something went wrong sending your message. Please email us directly at ' + currentContactEmail() + '.');
      }).catch(function () {
        alert('Something went wrong sending your message. Please email us directly at ' + currentContactEmail() + '.');
      }).then(function () {
        if (contactSubmitBtn) contactSubmitBtn.disabled = false;
      });
    });
  }

  // ---- nav active state ----
  document.querySelectorAll('.nav a[href]').forEach(function (a) {
    var path = a.getAttribute('href').replace(/\/$/, '') || '/';
    var here = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === here) a.classList.add('is-active');
  });

  // ---- client-editable content overlay ----
  // Fields whose default markup contains an intentional line break are re-applied
  // via innerHTML with \n turned back into <br>; every other field is a plain-text swap.
  var RICH_TEXT_KEYS = {};
  document.querySelectorAll('[data-cms-rich]').forEach(function (el) {
    RICH_TEXT_KEYS[el.getAttribute('data-cms')] = true;
  });

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function cssVarName(key) {
    return '--' + key.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  function applyStringValue(key, value) {
    if (value == null) return;
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) {
      if (document.activeElement === el) return;
      if (RICH_TEXT_KEYS[key]) {
        el.innerHTML = String(value).split('\n').map(escapeHtml).join('<br>');
      } else {
        el.textContent = value;
      }
      // The Contact page email link's href always tracks its displayed address,
      // so editing the text can never leave a stale mailto: link behind.
      if (key === 'contact.email') {
        var mailLink = el.closest('a');
        if (mailLink) mailLink.setAttribute('href', 'mailto:' + value);
      }
    });
  }

  // Arbitrary link URLs (Instagram, LinkedIn, …) that aren't tied to visible text —
  // stored alongside strings in content.strings, applied to any <a data-cms-href="key">.
  function applyHrefValue(key, value) {
    if (!value) return;
    document.querySelectorAll('[data-cms-href="' + key + '"]').forEach(function (el) {
      el.setAttribute('href', value);
    });
  }

  // <img data-cms> elements start hidden (see .cms-loading / .cms-visible in style.css) so the
  // hardcoded default markup never flashes before the real CMS image is known. Whichever image
  // wins — a preloaded CMS override, or the default when there's no override — fades in once
  // it's actually ready, instead of popping in over whatever the HTML shipped with.
  function applyImageValue(key, value) {
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) {
      if (el.tagName !== 'IMG') {
        if (!value) return;
        el.style.backgroundImage = 'url(' + value + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        var label = el.querySelector('span');
        if (label) label.style.display = 'none';
        return;
      }
      if (!value) return; // no override for this key — the reveal sweep below shows the default as-is
      el.classList.add('cms-loading');
      var preload = new Image();
      preload.onload = function () { el.src = value; el.classList.remove('cms-loading'); el.classList.add('cms-visible'); };
      preload.onerror = function () { el.classList.remove('cms-loading'); el.classList.add('cms-visible'); };
      preload.src = value;
    });
  }

  // Reveals every <img data-cms> that isn't mid-preload — i.e. images with no CMS override,
  // or every image at all if the content fetch failed outright.
  function revealDefaultImages() {
    document.querySelectorAll('img[data-cms]:not(.cms-loading)').forEach(function (el) {
      el.classList.add('cms-visible');
    });
  }

  function applyColorValue(key, value) {
    if (!value) return;
    document.documentElement.style.setProperty(cssVarName(key), value);
  }

  function applyContent(content) {
    if (!content) return;
    Object.keys(content.strings || {}).forEach(function (k) { applyStringValue(k, content.strings[k]); applyHrefValue(k, content.strings[k]); });
    Object.keys(content.images || {}).forEach(function (k) { applyImageValue(k, content.images[k]); });
    Object.keys(content.colors || {}).forEach(function (k) { applyColorValue(k, content.colors[k]); });
    renderAllZones();
  }

  // ---- freeform blocks (admin-added text/photo blocks in a `data-cms-zone`) ----
  // Stored as content.blocks[zoneKey] = [{ id, type: 'text'|'image', value }, ...].
  // Any element written as <div data-cms-zone="some.unique.key"></div> becomes a
  // drop target with "+ Add text" / "+ Add photo" controls while an admin is editing.

  function genBlockId() {
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function zoneBlocks(zone) {
    if (!editState.content) return [];
    var blocks = editState.content.blocks || (editState.content.blocks = {});
    return blocks[zone] || (blocks[zone] = []);
  }

  function renderZone(zone) {
    var container = document.querySelector('[data-cms-zone="' + zone + '"]');
    if (!container) return;
    var blocks = (editState.content && editState.content.blocks && editState.content.blocks[zone]) || [];
    container.innerHTML = '';
    blocks.forEach(function (block) {
      var row = document.createElement('div');
      row.className = 'cms-block-row';
      var content;
      if (block.type === 'image') {
        content = document.createElement('div');
        content.className = 'cms-block cms-block-image-wrap';
        content.innerHTML = block.value ? '<img class="cms-block-image" src="' + block.value + '" alt="">' : '<div class="cms-block-image cms-block-image-empty">Click to add a photo</div>';
      } else {
        content = document.createElement('p');
        content.className = 'cms-block cms-block-text body-copy';
        content.textContent = block.value || '';
      }
      content.setAttribute('data-block-zone', zone);
      content.setAttribute('data-block-id', block.id);
      row.appendChild(content);
      if (editState.editing) {
        if (block.type === 'text') {
          content.contentEditable = 'plaintext-only';
          if (content.contentEditable !== 'plaintext-only') content.contentEditable = 'true';
        }
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cms-block-remove';
        remove.setAttribute('aria-label', 'Remove this block');
        remove.textContent = '×';
        remove.setAttribute('data-block-zone', zone);
        remove.setAttribute('data-block-id', block.id);
        row.appendChild(remove);
        row.classList.add('is-editing');
      }
      container.appendChild(row);
    });
    if (editState.editing) {
      var controls = document.createElement('div');
      controls.className = 'cms-zone-controls';
      controls.innerHTML =
        '<button type="button" class="cms-add-text-btn" data-zone="' + zone + '">+ Add text</button>' +
        '<button type="button" class="cms-add-photo-btn" data-zone="' + zone + '">+ Add photo</button>';
      container.appendChild(controls);
    }
  }

  function renderAllZones() {
    document.querySelectorAll('[data-cms-zone]').forEach(function (container) {
      renderZone(container.getAttribute('data-cms-zone'));
    });
  }

  // ---- inline on-page editor (visible only to a signed-in admin) ----
  var editState = { content: null, username: null, dirty: false, saving: false, editing: false };
  var fileInput = null;
  var uploadTarget = null; // { mode: 'key', key } | { mode: 'newBlock', zone } | { mode: 'blockImage', zone, blockId }

  var COLOR_FIELDS = [
    { key: 'gold', label: 'Accent (buttons, links)' },
    { key: 'black', label: 'Dark panels & primary text' },
    { key: 'ivory', label: 'Page background' },
    { key: 'ivoryAlt', label: 'Panel background' }
  ];

  function deepClone(o) { return o ? JSON.parse(JSON.stringify(o)) : o; }

  function apiCall(path, opts) {
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

  function elementToStoredText(el, isRich) {
    if (!isRich) return el.textContent;
    // Enter in a plaintext-only contenteditable typically wraps each new line in
    // its own <div> (Chrome) rather than inserting <br> — normalize both forms.
    var html = el.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>/gi, '\n')
      .replace(/<\/div>/gi, '');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var text = tmp.textContent || '';
    return text.replace(/^\n+/, '').replace(/\n{2,}/g, '\n');
  }

  function markDirty() {
    editState.dirty = true;
    var btn = document.getElementById('cmsSaveBtn');
    if (btn) btn.disabled = false;
    setEditStatus('Unsaved changes', false);
  }

  function setEditStatus(text, ok) {
    var el = document.getElementById('cmsStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'cms-status' + (ok ? ' ok' : '');
  }

  function saveEdits() {
    if (editState.saving) return;
    editState.saving = true;
    var btn = document.getElementById('cmsSaveBtn');
    if (btn) btn.disabled = true;
    setEditStatus('Saving…', false);
    apiCall('/api/admin/save', { method: 'POST', body: JSON.stringify(editState.content) }).then(function (res) {
      editState.saving = false;
      if (res.ok) {
        editState.dirty = false;
        setEditStatus('All changes saved', true);
      } else {
        if (btn) btn.disabled = false;
        setEditStatus('Save failed — try again', false);
      }
    });
  }

  function ensureFileInput() {
    if (fileInput) return fileInput;
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      var target = uploadTarget;
      fileInput.value = '';
      uploadTarget = null;
      if (!file || !target) return;
      handleUpload(file, target);
    });
    return fileInput;
  }

  function fileToResizedBase64(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () { img.src = reader.result; };
      img.onerror = reject;
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
      };
      reader.readAsDataURL(file);
    });
  }

  function handleUpload(file, target) {
    var busyEls = target.mode === 'key'
      ? document.querySelectorAll('[data-cms="' + target.key + '"]')
      : target.mode === 'blockImage'
        ? document.querySelectorAll('[data-block-zone="' + target.zone + '"][data-block-id="' + target.blockId + '"]')
        : [];
    busyEls.forEach(function (el) { el.classList.add('cms-uploading'); });
    fileToResizedBase64(file, 1800, 0.82).then(function (base64) {
      return apiCall('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name.replace(/\.[^.]+$/, '.jpg'), contentType: 'image/jpeg', dataBase64: base64 })
      });
    }).then(function (res) {
      busyEls.forEach(function (el) { el.classList.remove('cms-uploading'); });
      if (!res.ok || !res.data.url) { alert('Upload failed. Please try a smaller image.'); return; }
      var url = res.data.url;
      if (target.mode === 'key') {
        editState.content.images[target.key] = url;
        applyImageValue(target.key, url);
      } else if (target.mode === 'newBlock') {
        zoneBlocks(target.zone).push({ id: genBlockId(), type: 'image', value: url });
        renderZone(target.zone);
      } else if (target.mode === 'blockImage') {
        var block = zoneBlocks(target.zone).filter(function (b) { return b.id === target.blockId; })[0];
        if (block) block.value = url;
        renderZone(target.zone);
      }
      markDirty();
    }).catch(function () {
      busyEls.forEach(function (el) { el.classList.remove('cms-uploading'); });
      alert('Upload failed. Please try again.');
    });
  }

  function toggleColorPopover() {
    var existing = document.getElementById('cmsColorPopover');
    if (existing) { existing.remove(); return; }
    var pop = document.createElement('div');
    pop.id = 'cmsColorPopover';
    pop.className = 'cms-color-popover';
    var colors = editState.content.colors || (editState.content.colors = {});
    pop.innerHTML = COLOR_FIELDS.map(function (f) {
      var current = getComputedStyle(document.documentElement).getPropertyValue(cssVarName(f.key)).trim();
      var val = colors[f.key] || current || '#000000';
      return '<div class="cms-color-row"><input type="color" data-color-key="' + f.key + '" value="' + val + '">' +
        '<span class="cms-color-label">' + f.label + '</span></div>';
    }).join('');
    document.body.appendChild(pop);
    pop.querySelectorAll('[data-color-key]').forEach(function (inputEl) {
      inputEl.addEventListener('input', function () {
        var key = inputEl.getAttribute('data-color-key');
        editState.content.colors[key] = inputEl.value;
        applyColorValue(key, inputEl.value);
        markDirty();
      });
    });
  }

  function renderEditBar() {
    var bar = document.createElement('div');
    bar.className = 'cms-editbar';
    bar.id = 'cmsEditBar';
    bar.innerHTML =
      '<span class="cms-hint">Click any text or photo on this page to change it.</span>' +
      '<div class="cms-actions">' +
      '<button class="cms-colors-btn" id="cmsColorsBtn" type="button">Colors</button>' +
      '<span class="cms-status" id="cmsStatus">All changes saved</span>' +
      '<button class="cms-save-btn" id="cmsSaveBtn" type="button" disabled>Save changes</button>' +
      '<button class="cms-exit-btn" id="cmsExitBtn" type="button">Exit editing</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('cmsColorsBtn').addEventListener('click', toggleColorPopover);
    document.getElementById('cmsSaveBtn').addEventListener('click', saveEdits);
    document.getElementById('cmsExitBtn').addEventListener('click', function () { exitEditMode(false); });
  }

  function enterEditMode() {
    if (editState.editing || !editState.content) return;
    editState.editing = true;
    document.body.classList.add('cms-editing');
    var pill = document.getElementById('cmsSigninPill');
    if (pill) pill.remove();
    renderEditBar();
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      if (el.tagName === 'IMG' || el.classList.contains('art-placeholder-fill')) return;
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    });
    renderAllZones();
  }

  function exitEditMode(skipConfirm) {
    if (!editState.editing) return;
    if (editState.dirty && !skipConfirm) {
      if (!confirm('You have unsaved changes. Exit without saving?')) return;
    }
    editState.editing = false;
    editState.dirty = false;
    document.body.classList.remove('cms-editing');
    document.querySelectorAll('[data-cms][contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    var bar = document.getElementById('cmsEditBar');
    if (bar) bar.remove();
    var pop = document.getElementById('cmsColorPopover');
    if (pop) pop.remove();
    renderAllZones();
    renderSigninPill(editState.username);
  }

  function renderSigninPill(username) {
    var existing = document.getElementById('cmsSigninPill');
    if (existing) existing.remove();
    var pill = document.createElement('div');
    pill.id = 'cmsSigninPill';
    pill.className = 'cms-signin-pill';
    pill.innerHTML = '<span>' + escapeHtml(username || 'admin') + '</span>' +
      '<button class="cms-edit-btn" type="button">Edit this page</button>' +
      '<button class="cms-logout-btn" type="button">Log out</button>';
    document.body.appendChild(pill);
    pill.querySelector('.cms-edit-btn').addEventListener('click', enterEditMode);
    pill.querySelector('.cms-logout-btn').addEventListener('click', function () {
      apiCall('/api/admin/logout', { method: 'POST' }).then(function () { window.location.reload(); });
    });
  }

  document.addEventListener('input', function (e) {
    var blockEl = e.target.closest && e.target.closest('.cms-block-text[data-block-zone][contenteditable]');
    if (blockEl) {
      var zone = blockEl.getAttribute('data-block-zone');
      var blockId = blockEl.getAttribute('data-block-id');
      var block = zoneBlocks(zone).filter(function (b) { return b.id === blockId; })[0];
      if (block) block.value = blockEl.textContent;
      markDirty();
      return;
    }
    var el = e.target.closest && e.target.closest('[data-cms][contenteditable]');
    if (!el) return;
    var key = el.getAttribute('data-cms');
    var isRich = !!RICH_TEXT_KEYS[key];
    var value = elementToStoredText(el, isRich);
    editState.content.strings[key] = value;
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (other) {
      if (other !== el) applyStringValue(key, value);
    });
    if (key === 'contact.email') {
      var mailLink = el.closest('a');
      if (mailLink) mailLink.setAttribute('href', 'mailto:' + value);
    }
    markDirty();
  });

  document.addEventListener('click', function (e) {
    if (!editState.editing) return;

    var addText = e.target.closest && e.target.closest('.cms-add-text-btn');
    if (addText) {
      e.preventDefault();
      var zone = addText.getAttribute('data-zone');
      zoneBlocks(zone).push({ id: genBlockId(), type: 'text', value: '' });
      renderZone(zone);
      markDirty();
      var newEl = document.querySelector('[data-cms-zone="' + zone + '"] .cms-block-text:last-of-type');
      if (newEl) { newEl.focus(); }
      return;
    }

    var addPhoto = e.target.closest && e.target.closest('.cms-add-photo-btn');
    if (addPhoto) {
      e.preventDefault();
      uploadTarget = { mode: 'newBlock', zone: addPhoto.getAttribute('data-zone') };
      ensureFileInput().click();
      return;
    }

    var removeBtn = e.target.closest && e.target.closest('.cms-block-remove');
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      var blockEl = removeBtn.closest('[data-block-zone]');
      var rZone = blockEl.getAttribute('data-block-zone');
      var rId = blockEl.getAttribute('data-block-id');
      var arr = zoneBlocks(rZone);
      var idx = arr.map(function (b) { return b.id; }).indexOf(rId);
      if (idx !== -1) arr.splice(idx, 1);
      renderZone(rZone);
      markDirty();
      return;
    }

    var blockImg = e.target.closest && e.target.closest('.cms-block-image-wrap[data-block-zone]');
    if (blockImg) {
      e.preventDefault();
      e.stopPropagation();
      uploadTarget = { mode: 'blockImage', zone: blockImg.getAttribute('data-block-zone'), blockId: blockImg.getAttribute('data-block-id') };
      ensureFileInput().click();
      return;
    }

    var imgTarget = e.target.closest && e.target.closest('img[data-cms], .art-placeholder-fill[data-cms]');
    if (imgTarget) {
      e.preventDefault();
      e.stopPropagation();
      uploadTarget = { mode: 'key', key: imgTarget.getAttribute('data-cms') };
      ensureFileInput().click();
      return;
    }
    var hrefTarget = e.target.closest && e.target.closest('a[data-cms-href]');
    if (hrefTarget) {
      e.preventDefault();
      e.stopPropagation();
      var hrefKey = hrefTarget.getAttribute('data-cms-href');
      var current = editState.content.strings[hrefKey] || hrefTarget.getAttribute('href') || '';
      var next = prompt('Edit link URL:', current === '#' ? 'https://' : current);
      if (next !== null && next.trim()) {
        editState.content.strings[hrefKey] = next.trim();
        applyHrefValue(hrefKey, next.trim());
        markDirty();
      }
      return;
    }

    var link = e.target.closest && e.target.closest('a');
    if (link) e.preventDefault();
  }, true);

  // Absolute fallback: if the content fetch hangs instead of failing outright, never leave
  // images hidden indefinitely.
  setTimeout(revealDefaultImages, 2500);

  fetch('/api/content', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (content) {
      editState.content = deepClone(content) || {};
      editState.content.strings = editState.content.strings || {};
      editState.content.images = editState.content.images || {};
      editState.content.colors = editState.content.colors || {};
      editState.content.blocks = editState.content.blocks || {};
      applyContent(content);
      revealDefaultImages();
      return apiCall('/api/admin/me');
    })
    .then(function (meRes) {
      if (meRes && meRes.ok && meRes.data && meRes.data.authenticated) {
        editState.username = meRes.data.username;
        renderSigninPill(meRes.data.username);
      }
    })
    .catch(function () {
      // offline, not logged in, or not yet configured — hardcoded content stands, just make it visible
      revealDefaultImages();
    });
})();
