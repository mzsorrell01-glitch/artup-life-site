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
    return (el && el.textContent.trim()) || 'info@artup.life';
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
    renderAllLists();
    injectCustomNavLinks();
    applyPageVisibility();
    applyAllSplitRatios();
    renderCustomPage();
    guardHiddenPage();
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


  // ---- repeatable card lists (data-cms-list) ----
  // A container marked <section data-cms-list="collection.works"> is managed as a list of
  // records rather than as free text: every card carries a photo, title, artist and price,
  // and an admin can add or remove cards. Stored as
  // content.lists[key] = [{ id, image, title, artist, price, href }, ...].
  //
  // Until an admin saves one, no list exists in storage and the cards that shipped in the
  // HTML are left exactly as they are — so the public page is unchanged by this feature.

  var LIST_TEXT_FIELDS = ['title', 'artist', 'price'];

  function listItems(key) {
    if (!editState.content) return [];
    var lists = editState.content.lists || (editState.content.lists = {});
    return lists[key] || (lists[key] = []);
  }

  function htmlToPlainText(value) {
    var tmp = document.createElement('div');
    tmp.innerHTML = valueToHtml(value, false);
    return (tmp.textContent || '').trim();
  }

  // Reads the cards already in the markup so the first edit inherits the shipped content
  // instead of starting from an empty grid.
  function seedListFromMarkup(container, key) {
    var seeded = [];
    container.querySelectorAll('.work-card').forEach(function (card) {
      var img = card.querySelector('img');
      var titleEl = card.querySelector('h3');
      var priceEls = card.querySelectorAll('.work-price');
      var link = card.querySelector('a[href]');
      seeded.push({
        id: genBlockId(),
        image: img ? img.getAttribute('src') : '',
        title: titleEl ? titleEl.textContent.trim() : '',
        artist: priceEls[0] ? priceEls[0].textContent.trim() : '',
        price: priceEls[1] ? priceEls[1].textContent.trim() : '',
        href: link ? link.getAttribute('href') : ''
      });
    });
    editState.content.lists[key] = seeded;
    return seeded;
  }

  function buildListCard(key, item, editing) {
    var href = rtSafeHref(item.href) || '';
    var card = document.createElement('div');
    card.className = 'work-card cms-list-card';
    card.setAttribute('data-list-key', key);
    card.setAttribute('data-item-id', item.id);

    // Outside edit mode the photo is the link to the artwork; inside it, clicking swaps it.
    var photo = document.createElement(href && !editing ? 'a' : 'div');
    if (href && !editing) photo.setAttribute('href', href);
    photo.className = 'cms-list-photo';
    if (item.image) {
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = htmlToPlainText(item.title);
      img.classList.add('cms-visible');
      photo.appendChild(img);
    } else {
      var empty = document.createElement('div');
      empty.className = 'cms-block-image-empty cms-list-photo-empty';
      empty.textContent = editing ? 'Click to add a photo' : '';
      photo.appendChild(empty);
    }
    card.appendChild(photo);

    var heading = document.createElement('h3');
    var titleEl = document.createElement(href && !editing ? 'a' : 'span');
    if (href && !editing) titleEl.setAttribute('href', href);
    titleEl.setAttribute('data-list-field', 'title');
    titleEl.innerHTML = valueToHtml(item.title, false);
    heading.appendChild(titleEl);
    card.appendChild(heading);

    ['artist', 'price'].forEach(function (field) {
      var p = document.createElement('p');
      p.className = 'work-price';
      p.setAttribute('data-list-field', field);
      p.innerHTML = valueToHtml(item[field], false);
      card.appendChild(p);
    });

    if (editing) {
      var linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'btn cms-list-link-btn';
      linkBtn.textContent = href ? 'Links to ' + href : 'Set artwork link';
      card.appendChild(linkBtn);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cms-block-remove cms-list-remove';
      remove.setAttribute('aria-label', 'Remove this artwork');
      remove.textContent = '×';
      card.appendChild(remove);
      card.classList.add('is-editing');
    } else if (href) {
      var view = document.createElement('a');
      view.href = href;
      view.className = 'btn';
      view.textContent = 'View Artwork';
      card.appendChild(view);
    }

    if (editing) {
      card.querySelectorAll('[data-list-field]').forEach(function (el) {
        el.contentEditable = 'true';
      });
    }
    return card;
  }

  // A "coming soon" style placeholder marked data-cms-list-empty="<key>" stands in whenever
  // its list has nothing in it, and steps aside as soon as a card is added.
  function updateListEmptyState(key, count) {
    document.querySelectorAll('[data-cms-list-empty="' + key + '"]').forEach(function (el) {
      el.classList.toggle('cms-empty-hidden', count > 0);
    });
  }

  function renderList(key) {
    var container = document.querySelector('[data-cms-list="' + key + '"]');
    if (!container) return;
    var stored = editState.content && editState.content.lists && editState.content.lists[key];
    updateListEmptyState(key, stored ? stored.length : container.querySelectorAll('.work-card').length);
    // No stored list and not editing: the shipped markup stands.
    if (!stored && !editState.editing) return;
    if (!stored) stored = seedListFromMarkup(container, key);

    container.innerHTML = '';
    stored.forEach(function (item) {
      container.appendChild(buildListCard(key, item, editState.editing));
    });
    if (editState.editing) {
      var controls = document.createElement('div');
      controls.className = 'cms-zone-controls cms-list-controls';
      controls.innerHTML = '<button type="button" class="cms-add-card-btn" data-list="' + key + '">+ Add artwork</button>';
      container.appendChild(controls);
    }
  }

  function renderAllLists() {
    document.querySelectorAll('[data-cms-list]').forEach(function (container) {
      renderList(container.getAttribute('data-cms-list'));
    });
  }


  // ---- page visibility ----
  // content.pages[path] = { hidden: true }. A hidden page drops out of every nav and turns
  // visitors away; a signed-in admin can still open it, to edit it or to put it back.
  //
  // Worth knowing: the page's HTML file is still served, so this hides a page from the site
  // rather than sealing it off. Anyone with the direct URL and JavaScript disabled can still
  // read the shipped markup. For a page that must be genuinely unreachable, delete the file.

  function normalizePath(value) {
    var path = String(value || '').split('#')[0].split('?')[0];
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
      if (!/^https?:/i.test(path)) return null;           // mailto:, tel:, …
      try { path = new URL(path).pathname; } catch (e) { return null; }
    }
    if (path.charAt(0) !== '/') return null;              // relative or off-site
    path = path.replace(/\/+$/, '');
    return path || '/';
  }

  function allPages() {
    // The header nav is the site's own list of pages; custom pages add themselves.
    var seen = {};
    var out = [];
    document.querySelectorAll('.site-header .nav a[href]').forEach(function (a) {
      var path = normalizePath(a.getAttribute('href'));
      if (!path || seen[path]) return;
      seen[path] = 1;
      out.push({ path: path, label: a.textContent.trim() });
    });
    var pages = (editState.content && editState.content.pages) || {};
    Object.keys(pages).forEach(function (path) {
      if (seen[path]) return;
      seen[path] = 1;
      out.push({ path: path, label: pages[path].title || path, custom: !!pages[path].custom });
    });
    return out;
  }

  function isPageHidden(path) {
    var pages = editState.content && editState.content.pages;
    return !!(pages && pages[path] && pages[path].hidden);
  }

  function setPageHidden(path, hidden) {
    var pages = editState.content.pages || (editState.content.pages = {});
    var entry = pages[path] || (pages[path] = {});
    if (hidden) entry.hidden = true; else delete entry.hidden;
    if (!Object.keys(entry).length) delete pages[path];
    applyPageVisibility();
    markDirty();
  }

  // Links to a hidden page disappear for visitors. While editing they stay put but are
  // struck through, so an admin can still see and reach what they have hidden.
  function applyPageVisibility() {
    document.querySelectorAll('.site-header a[href], .site-footer a[href]').forEach(function (a) {
      var path = normalizePath(a.getAttribute('href'));
      if (!path) return;
      var hidden = isPageHidden(path);
      a.classList.toggle('cms-hidden-link', hidden && !editState.editing);
      a.classList.toggle('cms-hidden-link-marked', hidden && editState.editing);
    });
  }

  // Called as soon as content lands — before we know whether anyone is signed in — so a
  // hidden page never sits on screen while that check is in flight.
  function guardHiddenPage() {
    if (isPageHidden(normalizePath(window.location.pathname))) {
      document.body.classList.add('cms-page-blocked');
    }
  }

  function resolveHiddenPage(isAdmin) {
    if (!document.body.classList.contains('cms-page-blocked')) return;
    if (!isAdmin) { window.location.replace('/'); return; }
    document.body.classList.remove('cms-page-blocked');
    var banner = document.createElement('div');
    banner.className = 'cms-hidden-banner';
    banner.id = 'cmsHiddenBanner';
    banner.textContent = 'This page is hidden from visitors. Only you can see it.';
    document.body.appendChild(banner);
  }

  function togglePagesPanel() {
    var existing = document.getElementById('cmsPagesPanel');
    if (existing) { existing.remove(); return; }
    var panel = document.createElement('div');
    panel.id = 'cmsPagesPanel';
    panel.className = 'cms-pages-panel';
    panel.innerHTML = '<p class="cms-panel-title">Pages on this site</p>' +
      allPages().map(function (page) {
        var hidden = isPageHidden(page.path);
        return '<label class="cms-page-row">' +
          '<input type="checkbox" data-page-path="' + escapeHtml(page.path) + '"' + (hidden ? '' : ' checked') + '>' +
          '<span class="cms-page-label">' + escapeHtml(page.label) + '</span>' +
          '<span class="cms-page-path">' + escapeHtml(page.path) + '</span>' +
          (page.custom ? '<button type="button" class="cms-page-delete" data-delete-page="' + escapeHtml(page.path) + '" aria-label="Delete this page">×</button>' : '') +
          '</label>';
      }).join('') +
      '<button type="button" class="cms-new-page-btn" id="cmsNewPageBtn">+ New page</button>' +
      '<p class="cms-panel-note">Unticked pages are hidden from the menu and turned away from visitors.</p>';
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-page-path]').forEach(function (box) {
      box.addEventListener('change', function () {
        setPageHidden(box.getAttribute('data-page-path'), !box.checked);
      });
    });
    var newBtn = panel.querySelector('#cmsNewPageBtn');
    if (newBtn) newBtn.addEventListener('click', createPage);
    panel.querySelectorAll('[data-delete-page]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        deletePage(btn.getAttribute('data-delete-page'));
      });
    });
  }

  // ---- adjustable photo/text split ----
  // A <section class="split" data-cms-split="how.layout"> can have its photo/text balance
  // moved by dragging the seam between the two halves. Stored as
  // content.layout[key] = { media: <percent of the row given to the photo side> }.
  // Below the layout's mobile breakpoint the two halves stack, so the ratio stops applying.

  var SPLIT_MIN = 20;
  var SPLIT_MAX = 75;

  function splitRatio(key) {
    var layout = editState.content && editState.content.layout;
    var value = layout && layout[key] && layout[key].media;
    value = parseFloat(value);
    if (!isFinite(value)) return null;
    return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
  }

  // `split--reverse` puts the photo first visually, so which grid track is the photo
  // depends on that class rather than on DOM order.
  function applySplitRatio(key) {
    var section = document.querySelector('[data-cms-split="' + key + '"]');
    if (!section) return;
    var ratio = splitRatio(key);
    if (ratio == null) { section.style.removeProperty('grid-template-columns'); return; }
    var mediaFirst = section.classList.contains('split--reverse');
    section.style.gridTemplateColumns = mediaFirst
      ? ratio + '% 1fr'
      : (100 - ratio) + '% 1fr';
  }

  function applyAllSplitRatios() {
    document.querySelectorAll('[data-cms-split]').forEach(function (section) {
      applySplitRatio(section.getAttribute('data-cms-split'));
    });
  }

  function currentSplitPercent(section, key) {
    var ratio = splitRatio(key);
    if (ratio != null) return ratio;
    // Nothing stored yet — read back whatever the stylesheet is currently doing.
    var media = section.classList.contains('split--reverse')
      ? section.querySelector('.split-content')
      : section.querySelector('.split-content');
    if (!media) return 50;
    var pct = (media.getBoundingClientRect().width / section.getBoundingClientRect().width) * 100;
    return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(pct)));
  }

  function renderSplitHandles() {
    document.querySelectorAll('.cms-split-handle').forEach(function (h) { h.remove(); });
    if (!editState.editing) return;
    document.querySelectorAll('[data-cms-split]').forEach(function (section) {
      if (getComputedStyle(section).gridTemplateColumns.split(' ').length < 2) return; // stacked
      var handle = document.createElement('div');
      handle.className = 'cms-split-handle';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-label', 'Drag to rebalance photo and text');
      handle.innerHTML = '<span class="cms-split-grip"></span><span class="cms-split-readout"></span>';
      section.style.position = section.style.position || 'relative';
      section.appendChild(handle);
      positionSplitHandle(section, handle);
    });
  }

  function positionSplitHandle(section, handle) {
    var key = section.getAttribute('data-cms-split');
    var pct = currentSplitPercent(section, key);
    var mediaFirst = section.classList.contains('split--reverse');
    var seam = mediaFirst ? pct : 100 - pct;
    handle.style.left = seam + '%';
    var readout = handle.querySelector('.cms-split-readout');
    if (readout) readout.textContent = Math.round(pct) + '% photo / ' + Math.round(100 - pct) + '% text';
  }

  function beginSplitDrag(e, handle) {
    var section = handle.closest('[data-cms-split]');
    if (!section) return;
    var key = section.getAttribute('data-cms-split');
    var mediaFirst = section.classList.contains('split--reverse');
    e.preventDefault();
    document.body.classList.add('cms-split-dragging');

    function onMove(ev) {
      var rect = section.getBoundingClientRect();
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      var seam = Math.min(100, Math.max(0, (x / rect.width) * 100));
      var pct = mediaFirst ? seam : 100 - seam;
      pct = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
      var layout = editState.content.layout || (editState.content.layout = {});
      (layout[key] || (layout[key] = {})).media = Math.round(pct);
      applySplitRatio(key);
      positionSplitHandle(section, handle);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.classList.remove('cms-split-dragging');
      markDirty();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  document.addEventListener('mousedown', function (e) {
    var handle = e.target.closest && e.target.closest('.cms-split-handle');
    if (handle) beginSplitDrag(e, handle);
  });
  document.addEventListener('touchstart', function (e) {
    var handle = e.target.closest && e.target.closest('.cms-split-handle');
    if (handle) beginSplitDrag(e, handle);
  }, { passive: false });

  window.addEventListener('resize', function () {
    if (editState.editing) renderSplitHandles();
  });


  // ---- admin-created pages ----
  // A page an admin adds lives entirely in content.pages[path] as
  // { custom: true, title, sections: [{ id, type, … }] }. There is no file for it — a
  // vercel.json rewrite serves /page/index.html for any path that isn't a real file, and
  // the shell below renders whichever page the URL asks for. Links are injected into the
  // nav at runtime, the same way every other bit of content is applied.

  var PAGE_TEMPLATES = [
    { type: 'heading', label: 'Heading', fields: ['eyebrow', 'heading', 'intro'] },
    { type: 'text', label: 'Text', fields: ['body'] },
    { type: 'columns', label: 'Two columns', fields: ['left', 'right'] },
    { type: 'photo', label: 'Photo', fields: ['caption'], image: true },
    { type: 'photo-text', label: 'Photo + text', fields: ['heading', 'body'], image: true }
  ];

  var TEMPLATE_DEFAULTS = {
    heading: { eyebrow: 'Section label', heading: 'A new heading', intro: 'Introduce this section.' },
    text: { body: 'Write something here.' },
    columns: { left: 'Left column.', right: 'Right column.' },
    photo: { caption: 'Photo caption', image: '' },
    'photo-text': { heading: 'Heading', body: 'Say more about it here.', image: '' }
  };

  function slugify(title) {
    var slug = String(title || '').toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'page';
  }

  function customPages() {
    var pages = (editState.content && editState.content.pages) || {};
    return Object.keys(pages).filter(function (p) { return pages[p].custom; });
  }

  function createPage() {
    var title = prompt('What should the new page be called?', 'New Page');
    if (title === null || !title.trim()) return;
    title = title.trim();
    var base = '/' + slugify(title);
    var path = base;
    var pages = editState.content.pages || (editState.content.pages = {});
    for (var n = 2; pages[path]; n++) path = base + '-' + n;
    pages[path] = { custom: true, title: title, sections: [] };
    markDirty();
    // Save immediately: the new page has to exist server-side before we can navigate to it.
    saveEdits(function () { window.location.href = path + '/'; });
  }

  function deletePage(path) {
    var pages = editState.content.pages || {};
    if (!pages[path] || !pages[path].custom) return;
    if (!confirm('Delete "' + (pages[path].title || path) + '" and everything on it? This cannot be undone.')) return;
    delete pages[path];
    markDirty();
    var here = normalizePath(window.location.pathname);
    if (here === path) { saveEdits(function () { window.location.href = '/'; }); return; }
    applyPageVisibility();
    togglePagesPanel(); togglePagesPanel();
  }

  // Custom pages have no hardcoded nav link, so one is added wherever the nav lives.
  function injectCustomNavLinks() {
    document.querySelectorAll('.cms-injected-nav-link').forEach(function (el) { el.remove(); });
    var pages = (editState.content && editState.content.pages) || {};
    customPages().forEach(function (path) {
      if (pages[path].hidden && !editState.editing) return;
      document.querySelectorAll('.site-header .nav, .site-footer nav').forEach(function (nav) {
        var a = document.createElement('a');
        a.href = path + '/';
        a.textContent = pages[path].title || path;
        a.className = 'cms-injected-nav-link';
        if (normalizePath(window.location.pathname) === path) a.classList.add('is-active');
        if (pages[path].hidden) a.classList.add('cms-hidden-link-marked');
        nav.appendChild(a);
      });
    });
  }

  function pageSections(path) {
    var page = (editState.content.pages || {})[path];
    if (!page) return [];
    return page.sections || (page.sections = []);
  }

  function fieldHtml(sectionId, field, value, tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    el.setAttribute('data-page-field', sectionId + '|' + field);
    el.innerHTML = valueToHtml(value, true);
    if (editState.editing) el.contentEditable = 'true';
    return el;
  }

  function photoHtml(section) {
    var wrap = document.createElement('div');
    wrap.className = 'cms-page-photo';
    wrap.setAttribute('data-section-id', section.id);
    if (section.image) {
      var img = document.createElement('img');
      img.src = section.image;
      img.alt = '';
      img.classList.add('cms-visible');
      wrap.appendChild(img);
    } else {
      var empty = document.createElement('div');
      empty.className = 'cms-block-image-empty';
      empty.textContent = editState.editing ? 'Click to add a photo' : '';
      wrap.appendChild(empty);
    }
    return wrap;
  }

  function buildSection(section) {
    var el = document.createElement('section');
    el.className = 'cms-page-section cms-page-section--' + section.type;
    el.setAttribute('data-section-id', section.id);

    if (section.type === 'heading') {
      el.classList.add('section-head');
      el.appendChild(fieldHtml(section.id, 'eyebrow', section.eyebrow, 'p', 'eyebrow'));
      el.appendChild(fieldHtml(section.id, 'heading', section.heading, 'h2', 'h-page'));
      var rule = document.createElement('hr');
      rule.className = 'gold-rule gold-rule--center';
      el.appendChild(rule);
      el.appendChild(fieldHtml(section.id, 'intro', section.intro, 'p', 'body-copy'));
    } else if (section.type === 'text') {
      el.appendChild(fieldHtml(section.id, 'body', section.body, 'div', 'body-copy'));
    } else if (section.type === 'columns') {
      var grid = document.createElement('div');
      grid.className = 'cms-page-columns';
      grid.appendChild(fieldHtml(section.id, 'left', section.left, 'div', 'body-copy'));
      grid.appendChild(fieldHtml(section.id, 'right', section.right, 'div', 'body-copy'));
      el.appendChild(grid);
    } else if (section.type === 'photo') {
      el.appendChild(photoHtml(section));
      el.appendChild(fieldHtml(section.id, 'caption', section.caption, 'p', 'cms-page-caption'));
    } else if (section.type === 'photo-text') {
      var split = document.createElement('div');
      split.className = 'cms-page-split';
      split.appendChild(photoHtml(section));
      var copy = document.createElement('div');
      copy.className = 'cms-page-split-copy';
      copy.appendChild(fieldHtml(section.id, 'heading', section.heading, 'h2', 'h-section'));
      copy.appendChild(fieldHtml(section.id, 'body', section.body, 'div', 'body-copy'));
      split.appendChild(copy);
      el.appendChild(split);
    }

    if (editState.editing) {
      el.classList.add('is-editing');
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cms-block-remove cms-section-remove';
      remove.setAttribute('aria-label', 'Remove this section');
      remove.textContent = '×';
      el.appendChild(remove);

      var up = document.createElement('button');
      up.type = 'button';
      up.className = 'cms-section-move';
      up.setAttribute('data-move', 'up');
      up.setAttribute('aria-label', 'Move section up');
      up.textContent = '↑';
      el.appendChild(up);

      var down = document.createElement('button');
      down.type = 'button';
      down.className = 'cms-section-move cms-section-move--down';
      down.setAttribute('data-move', 'down');
      down.setAttribute('aria-label', 'Move section down');
      down.textContent = '↓';
      el.appendChild(down);
    }
    return el;
  }

  function renderCustomPage() {
    var host = document.querySelector('[data-cms-page]');
    if (!host) return;
    var path = normalizePath(window.location.pathname);
    var page = (editState.content.pages || {})[path];

    if (!page || !page.custom) {
      host.innerHTML = '<section class="section-head"><h1 class="h-page">Page not found</h1>' +
        '<p class="body-copy" style="max-width:520px;margin:0 auto;">This page does not exist. ' +
        '<a href="/">Return home</a>.</p></section>';
      return;
    }
    document.title = page.title + ' — ArtUp Life';
    host.innerHTML = '';
    pageSections(path).forEach(function (section) { host.appendChild(buildSection(section)); });

    if (editState.editing) {
      var controls = document.createElement('div');
      controls.className = 'cms-zone-controls cms-section-controls';
      controls.innerHTML = PAGE_TEMPLATES.map(function (t) {
        return '<button type="button" class="cms-add-section-btn" data-template="' + t.type + '">+ ' + t.label + '</button>';
      }).join('');
      host.appendChild(controls);
    } else if (!pageSections(path).length) {
      host.innerHTML = '<section class="section-head"><h1 class="h-page">' + escapeHtml(page.title) + '</h1></section>';
    }
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
    if (el.hasAttribute('data-page-field')) {
      var parts = el.getAttribute('data-page-field').split('|');
      var section = pageSections(normalizePath(window.location.pathname)).filter(function (s) {
        return s.id === parts[0];
      })[0];
      if (section) section[parts[1]] = elementToStoredValue(el);
      markDirty();
      return;
    }
    if (el.hasAttribute('data-list-field')) {
      var card = el.closest('[data-item-id]');
      if (!card) return;
      var item = listItems(card.getAttribute('data-list-key')).filter(function (i) {
        return i.id === card.getAttribute('data-item-id');
      })[0];
      if (item) item[el.getAttribute('data-list-field')] = elementToStoredValue(el);
      markDirty();
      return;
    }
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

  function saveEdits(onDone) {
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
        if (typeof onDone === 'function') onDone();
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

  // Logos and other line art arrive as PNG/GIF/WebP with a transparent background, and
  // canvas flattens transparency onto BLACK when it encodes JPEG — which turned a
  // black-on-transparent logo into a solid black rectangle. So alpha-capable formats are
  // re-encoded as PNG and SVG is passed through untouched; photographs stay JPEG, where the
  // compression is worth having.
  var ALPHA_TYPES = { 'image/png': 1, 'image/gif': 1, 'image/webp': 1 };
  var MAX_UPLOAD_BASE64 = 3 * 1024 * 1024; // stay well under the serverless request ceiling

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var url = String(reader.result);
        resolve(url.slice(url.indexOf(',') + 1));
      };
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () { img.src = reader.result; };
      img.onerror = reject;
      img.onload = function () { resolve(img); };
      reader.readAsDataURL(file);
    });
  }

  function encodeImage(img, maxDim, keepAlpha, quality) {
    var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    var dataUrl = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  }

  function prepareUpload(file, maxDim, quality) {
    // Vector logos survive best untouched — rasterizing one would only throw away quality.
    if (file.type === 'image/svg+xml') {
      return fileToBase64(file).then(function (base64) {
        return { base64: base64, contentType: 'image/svg+xml', extension: '.svg' };
      });
    }
    var keepAlpha = !!ALPHA_TYPES[file.type];
    return loadImageFromFile(file).then(function (img) {
      // PNG is lossless, so a large transparent image can still come out big; step the
      // dimensions down until it fits rather than failing the upload outright.
      var dim = maxDim;
      var base64 = encodeImage(img, dim, keepAlpha, quality);
      for (var i = 0; i < 3 && base64.length > MAX_UPLOAD_BASE64; i++) {
        dim = Math.round(dim / 2);
        base64 = encodeImage(img, dim, keepAlpha, quality);
      }
      return {
        base64: base64,
        contentType: keepAlpha ? 'image/png' : 'image/jpeg',
        extension: keepAlpha ? '.png' : '.jpg'
      };
    });
  }

  function handleUpload(file, target) {
    var busyEls = target.mode === 'key'
      ? document.querySelectorAll('[data-cms="' + target.key + '"]')
      : target.mode === 'blockImage'
        ? document.querySelectorAll('[data-block-zone="' + target.zone + '"][data-block-id="' + target.blockId + '"]')
        : target.mode === 'listImage'
          ? document.querySelectorAll('[data-item-id="' + target.itemId + '"] .cms-list-photo')
          : [];
    busyEls.forEach(function (el) { el.classList.add('cms-uploading'); });
    prepareUpload(file, 1800, 0.82).then(function (prepared) {
      return apiCall('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name.replace(/\.[^.]+$/, '') + prepared.extension,
          contentType: prepared.contentType,
          dataBase64: prepared.base64
        })
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
      } else if (target.mode === 'sectionImage') {
        var sec = pageSections(normalizePath(window.location.pathname)).filter(function (s) { return s.id === target.sectionId; })[0];
        if (sec) sec.image = url;
        renderCustomPage();
      } else if (target.mode === 'listImage') {
        var listItem = listItems(target.key).filter(function (i) { return i.id === target.itemId; })[0];
        if (listItem) listItem.image = url;
        renderList(target.key);
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

  // Drops <span>s that no longer carry any styling, merges neighbours that carry exactly
  // the same one, then re-joins split text nodes.
  function tidyMarkup(root) {
    Array.prototype.slice.call(root.querySelectorAll('span')).forEach(function (span) {
      if (!span.getAttribute('style')) unwrapNode(span);
    });
    Array.prototype.slice.call(root.querySelectorAll('font')).forEach(unwrapNode);
    Array.prototype.slice.call(root.querySelectorAll('span')).forEach(function (span) {
      var prev = span.previousSibling;
      if (!prev || prev.nodeName !== 'SPAN') return;
      if (prev.getAttribute('style') !== span.getAttribute('style')) return;
      while (span.firstChild) prev.appendChild(span.firstChild);
      span.parentNode.removeChild(span);
    });
    root.normalize();
  }

  // Splits `parent` so that everything before `child` moves into a copy of it.
  function splitBefore(parent, child) {
    if (parent.firstChild === child) return;
    var clone = parent.cloneNode(false);
    while (parent.firstChild !== child) clone.appendChild(parent.firstChild);
    parent.parentNode.insertBefore(clone, parent);
  }

  // …and everything after `child` into a copy placed behind it.
  function splitAfter(parent, child) {
    if (parent.lastChild === child) return;
    var clone = parent.cloneNode(false);
    while (child.nextSibling) clone.appendChild(child.nextSibling);
    parent.parentNode.insertBefore(clone, parent.nextSibling);
  }

  // Isolates `node` from every ancestor up to `root` that sets `prop` — splitting each one
  // around it — and clears the property there. Without this, clearing a property on part of
  // a formatted run does nothing, because the ancestor keeps winning.
  function clearPropFromAncestors(node, prop, root) {
    var current = node;
    var parent = current.parentNode;
    while (parent && parent !== root && parent.nodeType === 1) {
      var grandparent = parent.parentNode;
      if (parent.style && parent.style.getPropertyValue(prop)) {
        splitBefore(parent, current);
        splitAfter(parent, current);
        parent.style.removeProperty(prop);
      }
      current = parent;
      parent = grandparent;
    }
  }

  // Wraps exactly the characters the selection covers in spans of their own, splitting the
  // boundary text nodes first. This is deliberately not execCommand's job: execCommand
  // ('fontSize') strips any font size already inside the range, so setting a colour through
  // it would quietly undo a size chosen a moment earlier.
  function wrapSelectionInSpans(range, root) {
    if (range.collapsed) return [];
    var startNode = range.startContainer;
    if (startNode.nodeType === 3 && range.startOffset > 0 && range.startOffset < startNode.nodeValue.length) {
      startNode.splitText(range.startOffset); // live ranges follow the split on their own
    }
    var endNode = range.endContainer;
    if (endNode.nodeType === 3 && range.endOffset > 0 && range.endOffset < endNode.nodeValue.length) {
      endNode.splitText(range.endOffset);
    }
    var covered = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.length) continue;
      try {
        // Boundary points count as inside, so a node that merely touches an edge of the
        // selection without sharing a character fails one of these two tests.
        if (range.comparePoint(node, 0) >= 0 && range.comparePoint(node, node.nodeValue.length) <= 0) covered.push(node);
      } catch (e) { /* node outside the range's tree */ }
    }
    return covered.map(function (textNode) {
      var span = document.createElement('span');
      textNode.parentNode.insertBefore(span, textNode);
      span.appendChild(textNode);
      return span;
    });
  }

  // With no selection there is nothing for a size/font/colour dropdown to act on, so treat
  // an empty selection as "the whole field".
  function selectWholeIfCollapsed(el) {
    var sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) return;
    var all = document.createRange();
    all.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(all);
    savedRange = all.cloneRange();
  }

  // Applies — or, with an empty `value`, clears — one inline CSS property across the selection.
  function applyInlineStyle(prop, value) {
    var el = activeEditable();
    if (!el) return;
    if (!restoreSelection()) return;
    selectWholeIfCollapsed(el);
    var sel = window.getSelection();
    if (!sel.rangeCount) return;

    var wrappers = wrapSelectionInSpans(sel.getRangeAt(0), el);
    wrappers.forEach(function (span) {
      if (value) span.style.setProperty(prop, value);
      else clearPropFromAncestors(span, prop, el);
    });
    tidyMarkup(el);

    var alive = wrappers.filter(function (span) { return span.isConnected; });
    if (alive.length) {
      var range = document.createRange();
      range.setStartBefore(alive[0]);
      range.setEndAfter(alive[alive.length - 1]);
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

  var CLEARABLE_PROPS = ['font-size', 'font-family', 'color', 'background-color', 'font-weight', 'font-style', 'text-decoration-line', 'letter-spacing', 'text-transform'];

  function clearFormatting() {
    var el = activeEditable();
    if (!el || !restoreSelection()) return;
    selectWholeIfCollapsed(el);
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    rememberSelection();
    CLEARABLE_PROPS.forEach(function (prop) { applyInlineStyle(prop, ''); });
    tidyMarkup(el);
    captureFromElement(el);
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
      '<button class="cms-colors-btn" id="cmsPagesBtn" type="button">Pages</button>' +
      '<button class="cms-colors-btn" id="cmsColorsBtn" type="button">Colors</button>' +
      '<span class="cms-status" id="cmsStatus">All changes saved</span>' +
      '<button class="cms-save-btn" id="cmsSaveBtn" type="button" disabled>Save changes</button>' +
      '<button class="cms-exit-btn" id="cmsExitBtn" type="button">Exit editing</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('cmsPagesBtn').addEventListener('click', togglePagesPanel);
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
    renderAllLists();
    injectCustomNavLinks();
    applyPageVisibility();
    renderSplitHandles();
    renderCustomPage();
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
    var pagesPanel = document.getElementById('cmsPagesPanel');
    if (pagesPanel) pagesPanel.remove();
    renderAllZones();
    renderAllLists();
    injectCustomNavLinks();
    applyPageVisibility();
    renderSplitHandles();
    renderCustomPage();
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
    var el = e.target.closest('.cms-block-text[data-block-zone][contenteditable], [data-cms][contenteditable], [data-list-field][contenteditable], [data-page-field][contenteditable]');
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
    if (e.target.closest && e.target.closest('.cms-toolbar, .cms-pages-panel, .cms-split-handle')) return;

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

    var addSection = e.target.closest && e.target.closest('.cms-add-section-btn');
    if (addSection) {
      e.preventDefault();
      var tpl = addSection.getAttribute('data-template');
      var fresh = { id: genBlockId(), type: tpl };
      Object.keys(TEMPLATE_DEFAULTS[tpl] || {}).forEach(function (k) { fresh[k] = TEMPLATE_DEFAULTS[tpl][k]; });
      pageSections(normalizePath(window.location.pathname)).push(fresh);
      renderCustomPage();
      markDirty();
      return;
    }

    var secRemove = e.target.closest && e.target.closest('.cms-section-remove');
    if (secRemove) {
      e.preventDefault();
      e.stopPropagation();
      var sList = pageSections(normalizePath(window.location.pathname));
      var sId = secRemove.closest('[data-section-id]').getAttribute('data-section-id');
      var sIdx = sList.map(function (s) { return s.id; }).indexOf(sId);
      if (sIdx !== -1) sList.splice(sIdx, 1);
      renderCustomPage();
      markDirty();
      return;
    }

    var secMove = e.target.closest && e.target.closest('.cms-section-move');
    if (secMove) {
      e.preventDefault();
      e.stopPropagation();
      var mList = pageSections(normalizePath(window.location.pathname));
      var mId = secMove.closest('[data-section-id]').getAttribute('data-section-id');
      var from = mList.map(function (s) { return s.id; }).indexOf(mId);
      var to = from + (secMove.getAttribute('data-move') === 'up' ? -1 : 1);
      if (from !== -1 && to >= 0 && to < mList.length) {
        mList.splice(to, 0, mList.splice(from, 1)[0]);
        renderCustomPage();
        markDirty();
      }
      return;
    }

    var secPhoto = e.target.closest && e.target.closest('.cms-page-photo');
    if (secPhoto) {
      e.preventDefault();
      e.stopPropagation();
      uploadTarget = { mode: 'sectionImage', sectionId: secPhoto.getAttribute('data-section-id') };
      ensureFileInput().click();
      return;
    }

    var addCard = e.target.closest && e.target.closest('.cms-add-card-btn');
    if (addCard) {
      e.preventDefault();
      var listKey = addCard.getAttribute('data-list');
      listItems(listKey).push({ id: genBlockId(), image: '', title: 'New artwork', artist: 'Artist name', price: '$0 CAD', href: '' });
      renderList(listKey);
      markDirty();
      return;
    }

    var cardRemove = e.target.closest && e.target.closest('.cms-list-remove');
    if (cardRemove) {
      e.preventDefault();
      e.stopPropagation();
      var rCard = cardRemove.closest('[data-item-id]');
      var rKey = rCard.getAttribute('data-list-key');
      var arr = listItems(rKey);
      var rIdx = arr.map(function (i) { return i.id; }).indexOf(rCard.getAttribute('data-item-id'));
      if (rIdx !== -1) arr.splice(rIdx, 1);
      renderList(rKey);
      markDirty();
      return;
    }

    var cardLink = e.target.closest && e.target.closest('.cms-list-link-btn');
    if (cardLink) {
      e.preventDefault();
      e.stopPropagation();
      var lCard = cardLink.closest('[data-item-id]');
      var lKey = lCard.getAttribute('data-list-key');
      var lItem = listItems(lKey).filter(function (i) { return i.id === lCard.getAttribute('data-item-id'); })[0];
      if (!lItem) return;
      var nextHref = prompt('Where should this artwork link to? (leave empty for no link)', lItem.href || '/artwork/');
      if (nextHref === null) return;
      nextHref = nextHref.trim();
      if (nextHref && !rtSafeHref(nextHref)) { alert('That link needs to start with / or https://.'); return; }
      lItem.href = nextHref;
      renderList(lKey);
      markDirty();
      return;
    }

    var cardPhoto = e.target.closest && e.target.closest('.cms-list-photo');
    if (cardPhoto) {
      e.preventDefault();
      e.stopPropagation();
      var pCard = cardPhoto.closest('[data-item-id]');
      uploadTarget = { mode: 'listImage', key: pCard.getAttribute('data-list-key'), itemId: pCard.getAttribute('data-item-id') };
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
      editState.content.lists = editState.content.lists || {};
      editState.content.pages = editState.content.pages || {};
      editState.content.layout = editState.content.layout || {};
      ensureFontsForContent(content);
      applyContent(content);
      revealDefaultImages();
      return apiCall('/api/admin/me');
    })
    .then(function (meRes) {
      var isAdmin = !!(meRes && meRes.ok && meRes.data && meRes.data.authenticated);
      resolveHiddenPage(isAdmin);
      if (isAdmin) {
        editState.username = meRes.data.username;
        renderSigninPill(meRes.data.username);
      }
    })
    .catch(function () {
      // offline, not logged in, or not yet configured — hardcoded content stands, just make it visible
      revealDefaultImages();
      document.body.classList.remove('cms-page-blocked');
    });
})();
