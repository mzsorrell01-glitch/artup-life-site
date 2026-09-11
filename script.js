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

  // ---- rich text: allow-list sanitizer ----
  // Stored strings may carry inline formatting (bold/italic/underline/strikethrough,
  // font size, font family, colour, links). Anything that came from storage or from a
  // paste is rebuilt tag by tag through this allow-list before it reaches the page, so a
  // tampered content blob can never inject markup or script into the public site.

  var RT_ALLOWED = { B: 'b', STRONG: 'strong', I: 'i', EM: 'em', U: 'u', S: 's', BR: 'br', SPAN: 'span', A: 'a', SUP: 'sup', SUB: 'sub', MARK: 'mark' };
  var RT_ALIASES = { STRIKE: 's', DEL: 's', FONT: 'span', BIG: 'span', SMALL: 'span', ABBR: 'span', CITE: 'i', VAR: 'i', CODE: 'span', KBD: 'span' };
  var RT_DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1, SVG: 1, MATH: 1, CANVAS: 1, FORM: 1, INPUT: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, NOSCRIPT: 1, TEMPLATE: 1, IMG: 1, VIDEO: 1, AUDIO: 1, HEAD: 1, TITLE: 1, BASE: 1 };
  var RT_BLOCK = { DIV: 1, P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, LI: 1, TR: 1, BLOCKQUOTE: 1, PRE: 1, SECTION: 1, ARTICLE: 1, HEADER: 1, FOOTER: 1, ASIDE: 1, FIGURE: 1 };
  var RT_STYLE_PROPS = { 'font-size': 1, 'font-family': 1, 'font-weight': 1, 'font-style': 1, 'text-decoration': 1, 'text-decoration-line': 1, 'color': 1, 'background-color': 1, 'letter-spacing': 1, 'text-transform': 1, 'vertical-align': 1 };
  var RT_FONT_SIZE_ATTR = { '1': '11px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
  var RT_ALIGNMENTS = { left: 1, center: 1, right: 1, justify: 1 };
  var RT_ELEMENT_STYLES = { 'text-align': RT_ALIGNMENTS };

  // Tells a formatted value apart from a legacy plain-text one. Deliberately keyed to the
  // tags we actually emit, so prose like "a < b" or "<3" is never mistaken for markup.
  var RT_MARKUP_RE = /<\/?(?:b|strong|i|em|u|s|strike|br|span|a|sup|sub|mark|font|div|p)\b[^>]*>/i;

  function rtSafeHref(value) {
    var s = String(value == null ? '' : value).trim();
    if (/^(?:https?:|mailto:|tel:)/i.test(s)) return s;
    if (/^[/#]/.test(s)) return s;
    return null;
  }

  // Round-trips a style attribute through a detached element so the browser itself decides
  // what is a valid declaration, then keeps only the properties we allow.
  function rtSafeStyle(cssText) {
    var probe = document.createElement('span');
    try { probe.setAttribute('style', String(cssText == null ? '' : cssText)); } catch (e) { return ''; }
    var out = [];
    for (var i = 0; i < probe.style.length; i++) {
      var prop = probe.style[i];
      if (!RT_STYLE_PROPS[prop]) continue;
      var val = probe.style.getPropertyValue(prop);
      if (!val || /url\(|expression|javascript:|@import|[<>]/i.test(val)) continue;
      out.push(prop + ': ' + val);
    }
    return out.join('; ');
  }

  function rtCopyAttributes(source, target, sourceTag) {
    var style = rtSafeStyle(source.getAttribute('style'));
    if (sourceTag === 'FONT') {
      // <font size|face|color> is what execCommand and older pasted markup produce.
      var extra = [];
      var size = RT_FONT_SIZE_ATTR[source.getAttribute('size')];
      if (size) extra.push('font-size: ' + size);
      var face = source.getAttribute('face');
      if (face && !/[<>;{}]/.test(face)) extra.push('font-family: ' + face);
      var color = source.getAttribute('color');
      if (color && /^[#a-z0-9(),.%\s]+$/i.test(color)) extra.push('color: ' + color);
      if (extra.length) style = style ? extra.join('; ') + '; ' + style : extra.join('; ');
    }
    if (style) target.setAttribute('style', style);
    if (target.tagName === 'A') {
      var href = rtSafeHref(source.getAttribute('href'));
      if (!href) return false; // an unusable link — unwrap it rather than keep a dead <a>
      target.setAttribute('href', href);
      if (!/^[/#]/.test(href)) {
        target.setAttribute('target', '_blank');
        target.setAttribute('rel', 'noopener noreferrer');
      }
    }
    return true;
  }

  function rtCopyChildren(source, dest) {
    Array.prototype.forEach.call(source.childNodes, function (node) {
      if (node.nodeType === 3) {
        if (node.nodeValue) dest.appendChild(document.createTextNode(node.nodeValue));
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (RT_DROP[tag]) return;
      if (tag === 'BR') { dest.appendChild(document.createElement('br')); return; }
      var mapped = RT_ALLOWED[tag] || RT_ALIASES[tag];
      if (!mapped) {
        // Unknown wrapper: keep the words, drop the tag. Block-level wrappers leave a line
        // break behind so pasted paragraphs don't run together.
        if (RT_BLOCK[tag] && dest.lastChild && dest.lastChild.nodeName !== 'BR') dest.appendChild(document.createElement('br'));
        rtCopyChildren(node, dest);
        return;
      }
      var el = document.createElement(mapped);
      var keep = rtCopyAttributes(node, el, tag);
      rtCopyChildren(node, el);
      if (!keep || (mapped === 'span' && !el.attributes.length)) {
        while (el.firstChild) dest.appendChild(el.firstChild);
        return;
      }
      dest.appendChild(el);
    });
  }

  function sanitizeHtml(html) {
    // Parsed in an inert document: nothing loads, nothing runs, no event handler fires.
    var doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = String(html == null ? '' : html);
    var out = document.createElement('div');
    rtCopyChildren(doc.body, out);
    return out.innerHTML;
  }

  // The single render path for every stored string and freeform text block. Values written
  // before formatting existed are plain text (with \n line breaks on rich fields); values
  // written since are sanitized HTML.
  function valueToHtml(value, multiline) {
    var s = String(value == null ? '' : value);
    if (!RT_MARKUP_RE.test(s)) {
      var esc = escapeHtml(s);
      return multiline ? esc.split('\n').join('<br>') : esc;
    }
    return sanitizeHtml(multiline ? s.replace(/\r?\n/g, '<br>') : s);
  }

  // Fonts an admin can pick from. `google` families are fetched on demand — either when a
  // page's saved content already uses them, or the moment one is chosen — so pages that
  // don't use them carry no extra weight.
  var FONT_CHOICES = [
    { label: 'Default', value: '' },
    { label: 'Bodoni Moda', value: "'Bodoni Moda', serif", google: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400' },
    { label: 'Libre Caslon', value: "'Libre Caslon Display', serif", google: 'Libre+Caslon+Display' },
    { label: 'Playfair Display', value: "'Playfair Display', serif", google: 'Playfair+Display:ital@1' },
    { label: 'Jost', value: "'Jost', sans-serif", google: 'Jost:wght@300;400;500' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: 'Courier', value: "'Courier New', Courier, monospace" }
  ];
  var FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 80];
  var loadedFonts = {};

  function ensureFontLoaded(googleSpec) {
    if (!googleSpec || loadedFonts[googleSpec]) return;
    loadedFonts[googleSpec] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + googleSpec + '&display=swap';
    document.head.appendChild(link);
  }

  function primaryFamily(stack) {
    return String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  }

  function ensureFontsForContent(content) {
    var blob = JSON.stringify(content || {});
    FONT_CHOICES.forEach(function (f) {
      if (f.google && blob.indexOf(primaryFamily(f.value)) !== -1) ensureFontLoaded(f.google);
    });
  }

  // Element-level styling (currently alignment), stored as content.styles[key] = { 'text-align': … }.
  function applyElementStyles(key) {
    var saved = (editState.content && editState.content.styles && editState.content.styles[key]) || null;
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) {
      Object.keys(RT_ELEMENT_STYLES).forEach(function (prop) { el.style.removeProperty(prop); });
      if (!saved) return;
      Object.keys(saved).forEach(function (prop) {
        var allowed = RT_ELEMENT_STYLES[prop];
        if (allowed && allowed[saved[prop]]) el.style.setProperty(prop, saved[prop]);
      });
    });
  }

  function cssVarName(key) {
    return '--' + key.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  function applyStringValue(key, value) {
    if (value == null) return;
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) {
      if (document.activeElement === el) return;
      el.innerHTML = valueToHtml(value, !!RICH_TEXT_KEYS[key]);
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
    Object.keys(content.styles || {}).forEach(function (k) { applyElementStyles(k); });
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
        content.innerHTML = valueToHtml(block.value, true);
        if (RT_ALIGNMENTS[block.align]) content.style.textAlign = block.align;
      }
      content.setAttribute('data-block-zone', zone);
      content.setAttribute('data-block-id', block.id);
      row.appendChild(content);
      if (editState.editing) {
        if (block.type === 'text') content.contentEditable = 'true';
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

  // Reads one editable back out. Fields the admin never formatted keep being stored as
  // plain text, so content.json stays readable and every value written before formatting
  // existed round-trips unchanged.
  function elementToStoredValue(el) {
    var html = sanitizeHtml(el.innerHTML);
    if (!RT_MARKUP_RE.test(html)) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent;
    }
    return html;
  }

  // Pulls an editable's current DOM state back into editState. Called by the `input` event
  // and again after every toolbar command, which rewrites the DOM without firing `input`.
  function captureFromElement(el) {
    if (el.hasAttribute('data-block-zone')) {
      var zone = el.getAttribute('data-block-zone');
      var blockId = el.getAttribute('data-block-id');
      var block = zoneBlocks(zone).filter(function (b) { return b.id === blockId; })[0];
      if (block) block.value = elementToStoredValue(el);
      markDirty();
      return;
    }
    var key = el.getAttribute('data-cms');
    if (!key) return;
    var value = elementToStoredValue(el);
    editState.content.strings[key] = value;
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (other) {
      if (other !== el) applyStringValue(key, value);
    });
    if (key === 'contact.email') {
      var mailLink = el.closest('a');
      if (mailLink) mailLink.setAttribute('href', 'mailto:' + el.textContent.trim());
    }
    markDirty();
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


  // ---- formatting toolbar ----
  // Floats above whichever field is being edited. Commands run through execCommand for its
  // range splitting, then the markup it leaves behind is normalized into the small tag set
  // the sanitizer allows.

  var activeEl = null;     // the contenteditable currently holding the caret
  var savedRange = null;   // its selection, kept alive across clicks on the toolbar's controls

  function activeEditable() {
    if (activeEl && activeEl.isConnected && activeEl.getAttribute('contenteditable') === 'true') return activeEl;
    return null;
  }

  function rememberSelection() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var node = sel.getRangeAt(0).commonAncestorContainer;
    var host = node.nodeType === 1 ? node : node.parentNode;
    host = host && host.closest && host.closest('[contenteditable="true"]');
    if (!host) return null;
    activeEl = host;
    savedRange = sel.getRangeAt(0).cloneRange();
    return host;
  }

  function restoreSelection() {
    var el = activeEditable();
    if (!el) return false;
    el.focus();
    // A range left over from a field that has since been re-rendered (or from a drag that
    // escaped this one) must never be handed to execCommand — drop it and let the caller's
    // own fallback decide what to format.
    if (savedRange && !el.contains(savedRange.commonAncestorContainer)) savedRange = null;
    if (!savedRange) return true;
    var sel = window.getSelection();
    try {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch (e) { /* range went stale — the caret stays wherever focus put it */ }
    return true;
  }

  function unwrapNode(node) {
    var parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  // Drops <span>s that no longer carry any styling, then re-joins split text nodes.
  function tidyMarkup(root) {
    Array.prototype.slice.call(root.querySelectorAll('span')).forEach(function (span) {
      if (!span.getAttribute('style')) unwrapNode(span);
    });
    Array.prototype.slice.call(root.querySelectorAll('font')).forEach(unwrapNode);
    root.normalize();
  }

  // Moves `prop` off wrapper spans and onto their children. Without this, clearing a
  // property on part of a selection can't win against an ancestor that still sets it.
  function pushDownStyle(root, prop) {
    Array.prototype.slice.call(root.querySelectorAll('span[style]')).forEach(function (span) {
      var val = span.style.getPropertyValue(prop);
      if (!val || !span.querySelector('*')) return;
      span.style.removeProperty(prop);
      Array.prototype.slice.call(span.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          if (!/\S/.test(child.nodeValue)) return;
          var wrap = document.createElement('span');
          wrap.style.setProperty(prop, val);
          span.insertBefore(wrap, child);
          wrap.appendChild(child);
        } else if (child.nodeType === 1 && child.style && !child.style.getPropertyValue(prop)) {
          child.style.setProperty(prop, val);
        }
      });
      if (!span.getAttribute('style')) unwrapNode(span);
    });
  }

  // Applies (or clears, when `value` is empty) one inline CSS property across the selection.
  // execCommand('fontSize', 7) is used purely as a splitter: it wraps exactly the selected
  // range in <font size="7">, which we then convert into the span we actually want.
  // With no selection there is nothing for a size/font/colour dropdown to act on, and a
  // caret-only execCommand would only arm a pending style. Treat it as "the whole field".
  function selectWholeIfCollapsed(el) {
    var sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) return;
    var all = document.createRange();
    all.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(all);
    savedRange = all.cloneRange();
  }

  function applyInlineStyle(prop, value) {
    var el = activeEditable();
    if (!el) return;
    if (!restoreSelection()) return;
    selectWholeIfCollapsed(el);
    if (!value) pushDownStyle(el, prop);
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
    document.execCommand('fontSize', false, '7');

    var wrappers = [];
    Array.prototype.slice.call(el.querySelectorAll('font[size="7"]')).forEach(function (font) {
      var span = document.createElement('span');
      var face = font.getAttribute('face');
      var color = font.getAttribute('color');
      if (face) span.style.fontFamily = face;
      if (color) span.style.color = color;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.parentNode.replaceChild(span, font);
      wrappers.push(span);
    });

    wrappers.forEach(function (span) {
      Array.prototype.slice.call(span.querySelectorAll('*')).forEach(function (child) {
        if (child.style) child.style.removeProperty(prop);
      });
      if (value) span.style.setProperty(prop, value);
      else span.style.removeProperty(prop);
    });

    tidyMarkup(el);

    var alive = wrappers.filter(function (span) { return span.isConnected; });
    if (alive.length) {
      var range = document.createRange();
      range.setStartBefore(alive[0]);
      range.setEndAfter(alive[alive.length - 1]);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange = range.cloneRange();
    }
    captureFromElement(el);
    syncToolbarState();
  }

  function execSimple(command) {
    if (!restoreSelection()) return;
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
    document.execCommand(command);
    var el = activeEditable();
    if (!el) return;
    rememberSelection();
    captureFromElement(el);
    syncToolbarState();
  }

  function applyLink() {
    var el = activeEditable();
    if (!el || !restoreSelection()) return;
    var sel = window.getSelection();
    var anchorNode = sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
    var anchorEl = anchorNode && (anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentNode);
    var existing = anchorEl && anchorEl.closest ? anchorEl.closest('a') : null;
    if (!existing && sel.isCollapsed) {
      alert('Select the words you want to turn into a link first.');
      return;
    }
    var next = prompt('Link URL (leave empty to remove the link):', existing ? existing.getAttribute('href') : 'https://');
    if (next === null) return;
    next = next.trim();
    restoreSelection();
    if (!next) {
      document.execCommand('unlink');
    } else if (!rtSafeHref(next)) {
      alert('That link needs to start with https://, mailto: or /.');
      return;
    } else {
      document.execCommand('createLink', false, next);
    }
    captureFromElement(el);
    syncToolbarState();
  }

  function clearFormatting() {
    var el = activeEditable();
    if (!el || !restoreSelection()) return;
    selectWholeIfCollapsed(el);
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    ['font-size', 'font-family', 'color', 'background-color', 'font-weight', 'font-style', 'letter-spacing', 'text-transform'].forEach(function (prop) {
      pushDownStyle(el, prop);
    });
    tidyMarkup(el);
    captureFromElement(el);
    rememberSelection();
    syncToolbarState();
  }

  // Alignment is a property of the whole field rather than of a selection, so it is stored
  // beside the text: on content.styles[key] for a page field, on the block for a freeform one.
  function applyAlign(value) {
    var el = activeEditable();
    if (!el) return;
    var key = el.getAttribute('data-cms');
    if (key) {
      var styles = editState.content.styles || (editState.content.styles = {});
      var entry = styles[key] || (styles[key] = {});
      if (value) entry['text-align'] = value; else delete entry['text-align'];
      if (!Object.keys(entry).length) delete styles[key];
      applyElementStyles(key);
    } else if (el.hasAttribute('data-block-zone')) {
      var block = zoneBlocks(el.getAttribute('data-block-zone')).filter(function (b) { return b.id === el.getAttribute('data-block-id'); })[0];
      if (block) block.align = value || '';
      el.style.textAlign = value || '';
    }
    markDirty();
    syncToolbarState();
  }

  function rgbToHex(value) {
    var m = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(String(value || ''));
    if (!m) return null;
    return '#' + [m[1], m[2], m[3]].map(function (n) {
      return ('0' + parseInt(n, 10).toString(16)).slice(-2);
    }).join('');
  }

  function selectionElement() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return activeEditable();
    var node = sel.getRangeAt(0).startContainer;
    return node.nodeType === 1 ? node : node.parentNode;
  }

  function alignIcon(align) {
    var rows = { left: [14, 9, 13], center: [14, 8, 12], right: [14, 9, 13] };
    var widths = rows[align];
    return '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">' + widths.map(function (w, i) {
      var x = align === 'left' ? 1 : align === 'right' ? 15 - w : (16 - w) / 2;
      return '<rect x="' + x + '" y="' + (2 + i * 5.2) + '" width="' + w + '" height="1.6" fill="currentColor"/>';
    }).join('') + '</svg>';
  }

  function renderToolbar() {
    var bar = document.createElement('div');
    bar.className = 'cms-toolbar';
    bar.id = 'cmsToolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Text formatting');

    var sizeOptions = '<option value="">Size</option>' + FONT_SIZES.map(function (s) {
      return '<option value="' + s + 'px">' + s + '</option>';
    }).join('');
    var fontOptions = FONT_CHOICES.map(function (f, i) {
      return '<option value="' + i + '">' + f.label + '</option>';
    }).join('');

    bar.innerHTML =
      '<button type="button" data-cmd="bold" title="Bold (⌘B)" aria-label="Bold"><b>B</b></button>' +
      '<button type="button" data-cmd="italic" title="Italic (⌘I)" aria-label="Italic"><i>I</i></button>' +
      '<button type="button" data-cmd="underline" title="Underline (⌘U)" aria-label="Underline"><u>U</u></button>' +
      '<button type="button" data-cmd="strikeThrough" title="Strikethrough" aria-label="Strikethrough"><s>S</s></button>' +
      '<span class="cms-tb-sep"></span>' +
      '<select id="cmsTbSize" title="Font size" aria-label="Font size">' + sizeOptions + '</select>' +
      '<select id="cmsTbFont" title="Font" aria-label="Font">' + fontOptions + '</select>' +
      '<label class="cms-tb-color" title="Text colour"><span class="cms-tb-a">A</span><span class="cms-tb-swatch"></span>' +
      '<input type="color" id="cmsTbColor" value="#070707" aria-label="Text colour"></label>' +
      '<span class="cms-tb-sep"></span>' +
      '<button type="button" data-align="left" title="Align left" aria-label="Align left">' + alignIcon('left') + '</button>' +
      '<button type="button" data-align="center" title="Centre" aria-label="Centre">' + alignIcon('center') + '</button>' +
      '<button type="button" data-align="right" title="Align right" aria-label="Align right">' + alignIcon('right') + '</button>' +
      '<span class="cms-tb-sep"></span>' +
      '<button type="button" data-cmd="link" title="Add or edit a link" aria-label="Link">&#128279;</button>' +
      '<button type="button" data-cmd="clear" title="Clear formatting" aria-label="Clear formatting">T<sub>x</sub></button>';

    document.body.appendChild(bar);

    // Keep the caret where it is: a button press must never move focus out of the field.
    bar.addEventListener('mousedown', function (e) {
      if (e.target.closest('select, input')) return;
      e.preventDefault();
    });

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      var align = btn.getAttribute('data-align');
      if (align) { applyAlign(btn.classList.contains('is-on') ? '' : align); return; }
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'link') applyLink();
      else if (cmd === 'clear') clearFormatting();
      else if (cmd) execSimple(cmd);
    });

    bar.querySelector('#cmsTbSize').addEventListener('change', function (e) {
      applyInlineStyle('font-size', e.target.value);
    });
    bar.querySelector('#cmsTbFont').addEventListener('change', function (e) {
      var choice = FONT_CHOICES[parseInt(e.target.value, 10)] || FONT_CHOICES[0];
      if (choice.google) ensureFontLoaded(choice.google);
      applyInlineStyle('font-family', choice.value);
    });
    var colorInput = bar.querySelector('#cmsTbColor');
    colorInput.addEventListener('input', function (e) {
      applyInlineStyle('color', e.target.value);
      var swatch = bar.querySelector('.cms-tb-swatch');
      if (swatch) swatch.style.background = e.target.value;
    });
  }

  function setSizeSelect(select, px) {
    var match = Array.prototype.some.call(select.options, function (o) { return o.value === px; });
    if (!match) {
      var custom = select.querySelector('option[data-custom]');
      if (!custom) {
        custom = document.createElement('option');
        custom.setAttribute('data-custom', '');
        select.appendChild(custom);
      }
      custom.value = px;
      custom.textContent = parseInt(px, 10) || '–';
    }
    select.value = px;
  }

  function syncToolbarState() {
    var bar = document.getElementById('cmsToolbar');
    var el = activeEditable();
    if (!bar || !el) return;

    ['bold', 'italic', 'underline', 'strikeThrough'].forEach(function (cmd) {
      var btn = bar.querySelector('[data-cmd="' + cmd + '"]');
      if (!btn) return;
      var on = false;
      try { on = document.queryCommandState(cmd); } catch (e) {}
      btn.classList.toggle('is-on', !!on);
    });

    var probe = selectionElement();
    if (probe && probe.nodeType === 1) {
      var computed = getComputedStyle(probe);
      setSizeSelect(bar.querySelector('#cmsTbSize'), Math.round(parseFloat(computed.fontSize)) + 'px');
      var family = primaryFamily(computed.fontFamily).toLowerCase();
      var fontIndex = 0;
      FONT_CHOICES.forEach(function (f, i) {
        if (i && primaryFamily(f.value).toLowerCase() === family) fontIndex = i;
      });
      bar.querySelector('#cmsTbFont').value = String(fontIndex);
      var hex = rgbToHex(computed.color);
      if (hex) {
        bar.querySelector('#cmsTbColor').value = hex;
        bar.querySelector('.cms-tb-swatch').style.background = hex;
      }
    }

    var key = el.getAttribute('data-cms');
    var current = key
      ? ((editState.content.styles && editState.content.styles[key] && editState.content.styles[key]['text-align']) || '')
      : (el.style.textAlign || '');
    bar.querySelectorAll('[data-align]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-align') === current);
    });
  }

  function positionToolbar() {
    var bar = document.getElementById('cmsToolbar');
    var el = activeEditable();
    if (!bar || !el) return;
    bar.style.visibility = 'hidden';
    bar.style.display = 'flex';
    var rect = el.getBoundingClientRect();
    var top = rect.top - bar.offsetHeight - 10;
    if (top < 8) top = Math.min(rect.bottom + 10, window.innerHeight - bar.offsetHeight - 72);
    bar.style.top = Math.max(8, top) + 'px';
    bar.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - bar.offsetWidth - 8)) + 'px';
    bar.style.visibility = 'visible';
  }

  document.addEventListener('selectionchange', function () {
    if (!editState.editing) return;
    if (!rememberSelection()) return;
    positionToolbar();
    syncToolbarState();
  });

  window.addEventListener('scroll', function () { if (editState.editing) positionToolbar(); }, true);
  window.addEventListener('resize', function () { if (editState.editing) positionToolbar(); });

  function renderEditBar() {
    var bar = document.createElement('div');
    bar.className = 'cms-editbar';
    bar.id = 'cmsEditBar';
    bar.innerHTML =
      '<span class="cms-hint">Click any text or photo to change it. Select words to format them.</span>' +
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
    renderToolbar();
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      if (el.tagName === 'IMG' || el.classList.contains('art-placeholder-fill')) return;
      el.contentEditable = 'true';
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
    var toolbar = document.getElementById('cmsToolbar');
    if (toolbar) toolbar.remove();
    activeEl = null;
    savedRange = null;
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
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest('.cms-block-text[data-block-zone][contenteditable], [data-cms][contenteditable]');
    if (!el) return;
    captureFromElement(el);
    positionToolbar();
  });

  // Enter inserts a line break rather than letting the browser open a new <div>, which the
  // sanitizer would only have to unpick again.
  document.addEventListener('keydown', function (e) {
    if (!editState.editing || e.key !== 'Enter') return;
    var el = e.target && e.target.closest && e.target.closest('[contenteditable="true"]');
    if (!el) return;
    e.preventDefault();
    if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>');
    captureFromElement(el);
  });

  // Paste keeps whatever formatting the allow-list recognises and discards the rest, so
  // pasting from Word or a web page can't drag foreign styling into the page.
  document.addEventListener('paste', function (e) {
    if (!editState.editing || !e.clipboardData) return;
    var el = e.target && e.target.closest && e.target.closest('[contenteditable="true"]');
    if (!el) return;
    e.preventDefault();
    var html = e.clipboardData.getData('text/html');
    var clean = html
      ? sanitizeHtml(html)
      : escapeHtml(e.clipboardData.getData('text/plain')).split('\n').join('<br>');
    document.execCommand('insertHTML', false, clean);
    captureFromElement(el);
  });

  document.addEventListener('click', function (e) {
    if (!editState.editing) return;
    if (e.target.closest && e.target.closest('.cms-toolbar')) return;

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
      editState.content.styles = editState.content.styles || {};
      ensureFontsForContent(content);
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
