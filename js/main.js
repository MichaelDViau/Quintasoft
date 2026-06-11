/* ============================================================================
   QUINTASOFT: MAIN SCRIPT
   ----------------------------------------------------------------------------
   All site behavior, grouped by feature. Depends on I18N (js/i18n.js), which
   must load first. Edit these source files, then run `npm run build` to
   regenerate the production bundle (js/app.min.js).

   TABLE OF CONTENTS
   01. Language switching (i18n)
   02. Navbar scroll state + reading progress
   03. Active-section highlight (dock + nav links)
   04. Accordions (services index + FAQ)
   05. Process rail (drag scroll, arrows, progress)
   06. Voices carousel (testimonials)
   07. Tech ticker (seamless loop)
   08. Scroll-reveal animations
   09. Toast + contact form (FormSubmit AJAX)
   10. Magnetic buttons (pointer: fine only)
   11. Liquid Glass engine (SVG displacement refraction, Chromium)
   12. Init
   ========================================================================== */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 01. LANGUAGE SWITCHING ──
     Spanish is the default; English is secondary. The choice persists in
     localStorage so returning visitors keep their language. */
  const LANG_STORAGE_KEY = 'quintasoft.lang';
  const DEFAULT_LANG = 'es';
  let currentLang = DEFAULT_LANG;

  function getSavedLang() {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return I18N[saved] ? saved : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG; // localStorage unavailable (private mode, etc.)
    }
  }

  function setLang(lang) {
    if (!I18N[lang]) lang = DEFAULT_LANG;
    currentLang = lang;
    const dict = I18N[lang];

    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);

    // Swap text content (or placeholder for form fields)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = dict[el.dataset.i18n];
      if (value === undefined) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    });

    // Swap translated aria-labels (rail arrows, etc.)
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = dict[el.dataset.i18nAria];
      if (value) el.setAttribute('aria-label', value);
    });

    // Document title + meta description follow the active language
    document.title = dict['meta.title'];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', dict['meta.description']);

    // Segmented controls: highlight buttons and slide the glass thumb
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.lang-switch').forEach((sw) => {
      sw.setAttribute('data-active', lang);
    });

    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* non-critical */
    }
  }

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  /* ── 02. NAVBAR SCROLL STATE + READING PROGRESS ──
     One rAF-throttled scroll listener drives both the navbar shadow and the
     hairline progress bar at the top of the viewport. */
  const navbar = document.getElementById('navbar');
  const progressFill = document.getElementById('progressFill');
  let scrollTicking = false;

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressFill.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    scrollTicking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(onScroll);
    },
    { passive: true }
  );
  onScroll();

  /* ── 03. ACTIVE-SECTION HIGHLIGHT ──
     Watches the main chapters and mirrors the current one onto the mobile
     dock items and the desktop nav links. */
  const sectionMap = {
    hero: ['hero', 'stats'],
    services: ['services', 'stack'],
    process: ['process', 'solutions'],
    contact: ['faq', 'contact']
  };
  const sectionToDock = {};
  Object.entries(sectionMap).forEach(([dock, ids]) => ids.forEach((id) => { sectionToDock[id] = dock; }));

  const dockItems = document.querySelectorAll('.dock-item');
  const navLinkEls = document.querySelectorAll('.nav-links a');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        const dockId = sectionToDock[id];
        if (dockId) {
          dockItems.forEach((item) => item.classList.toggle('active', item.dataset.section === dockId));
        }
        navLinkEls.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  document.querySelectorAll('main section[id], #hero').forEach((s) => sectionObserver.observe(s));

  /* ── 04. ACCORDIONS (services index + FAQ) ──
     One item open at a time per list. Height animates via the CSS
     grid-template-rows 0fr -> 1fr transition on .index-panel. */
  document.querySelectorAll('[data-accordion]').forEach((list) => {
    const items = list.querySelectorAll('.index-item');
    items.forEach((item) => {
      const head = item.querySelector('.index-head');
      head.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach((other) => {
          other.classList.remove('open');
          other.querySelector('.index-head').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          head.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  /* ── 05. PROCESS RAIL ──
     Horizontal scroll-snap track with a progress hairline, desktop arrows
     and pointer drag-to-scroll. */
  (() => {
    const rail = document.getElementById('processRail');
    if (!rail) return;
    const fill = document.getElementById('railFill');
    const prev = document.getElementById('railPrev');
    const next = document.getElementById('railNext');

    let railTicking = false;
    function updateRail() {
      const max = rail.scrollWidth - rail.clientWidth;
      const x = rail.scrollLeft;
      fill.style.transform = `scaleX(${max > 0 ? Math.min(x / max, 1) : 1})`;
      prev.disabled = x <= 2;
      next.disabled = x >= max - 2;
      railTicking = false;
    }
    rail.addEventListener('scroll', () => {
      if (railTicking) return;
      railTicking = true;
      requestAnimationFrame(updateRail);
    }, { passive: true });
    window.addEventListener('resize', updateRail, { passive: true });

    function step() {
      const card = rail.querySelector('.rail-card');
      return card ? card.getBoundingClientRect().width + 14 : 320;
    }
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));

    // Drag-to-scroll for mouse users (touch scrolls natively)
    let dragging = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.classList.add('dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('dragging');
    });
    // Swallow the click that would follow a drag
    rail.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);

    updateRail();
  })();

  /* ── 06. VOICES CAROUSEL ──
     One quote at a time: fade/lift transitions, dash pagination, swipe and
     gentle auto-advance (paused while the tab is hidden or motion reduced). */
  (() => {
    const stage = document.getElementById('voices');
    if (!stage) return;
    const voices = stage.querySelectorAll('.voice');
    const dots = document.getElementById('voiceDots');
    const AUTO_MS = 8000;
    let current = 0;
    let timer;

    voices.forEach((_, i) => {
      const dash = document.createElement('button');
      dash.className = 'voice-dash' + (i === 0 ? ' active' : '');
      dash.setAttribute('role', 'tab');
      dash.setAttribute('aria-selected', String(i === 0));
      dash.setAttribute('aria-label', (currentLang === 'es' ? 'Testimonio ' : 'Voice ') + (i + 1));
      dash.addEventListener('click', () => { goTo(i); restart(); });
      dots.appendChild(dash);
    });
    const dashes = dots.querySelectorAll('.voice-dash');

    function goTo(i) {
      current = (i + voices.length) % voices.length;
      voices.forEach((v, k) => v.classList.toggle('is-active', k === current));
      dashes.forEach((d, k) => {
        d.classList.toggle('active', k === current);
        d.setAttribute('aria-selected', String(k === current));
      });
    }

    function restart() {
      clearInterval(timer);
      if (reducedMotion) return;
      timer = setInterval(() => goTo(current + 1), AUTO_MS);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(timer);
      else restart();
    });

    // Touch swipe
    let touchX = 0;
    stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        goTo(diff > 0 ? current + 1 : current - 1);
        restart();
      }
    }, { passive: true });

    // Keep the stage as tall as its tallest voice so the layout never jumps
    function sizeStage() {
      let h = 0;
      voices.forEach((v) => { h = Math.max(h, v.scrollHeight); });
      stage.style.minHeight = h + 'px';
    }
    let sizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(sizeStage, 150);
    }, { passive: true });
    // Re-measure after fonts load and after language switches
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeStage);
    document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => setTimeout(sizeStage, 50)));
    sizeStage();

    restart();
  })();

  /* ── 07. TECH TICKER ──
     The single set of names is cloned once so the CSS animation
     (translateX 0 -> -50%) loops without a visible seam. */
  document.querySelectorAll('[data-ticker] .ticker-track').forEach((track) => {
    const set = track.querySelector('.ticker-set');
    if (!set) return;
    const clone = set.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  /* ── 08. SCROLL-REVEAL ANIMATIONS ──
     Elements with .reveal lift into focus once, then are unobserved. */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ── 09. TOAST + CONTACT FORM ──
     The form posts via FormSubmit AJAX: no redirect, a glass toast confirms. */
  const toast = document.getElementById('toast');
  let toastTimer;

  function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = 'toast glass ' + type;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  const contactForm = document.getElementById('contactForm');
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!contactForm.reportValidity()) return;
    const btn = contactForm.querySelector('.btn-submit');
    const originalLabel = btn.textContent;
    btn.textContent = I18N[currentLang]['form.sending'];
    btn.disabled = true;

    fetch('https://formsubmit.co/ajax/el/delali', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(contactForm)
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success === 'true' || data.success === true) {
          showToast(I18N[currentLang]['toast.success'], 'success');
          contactForm.reset();
        } else {
          showToast(I18N[currentLang]['toast.error']);
        }
      })
      .catch(() => showToast(I18N[currentLang]['toast.error']))
      .finally(() => {
        btn.textContent = originalLabel;
        btn.disabled = false;
      });
  });

  /* ── 10. MAGNETIC BUTTONS ──
     Desktop only: primary CTAs lean a few pixels toward the cursor and
     spring back when it leaves. Subtle by design. */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const STRENGTH = 0.22;
      const LIMIT = 7;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * STRENGTH;
        const dy = (e.clientY - r.top - r.height / 2) * STRENGTH;
        el.style.transform = `translate(${Math.max(-LIMIT, Math.min(LIMIT, dx))}px, ${Math.max(-LIMIT, Math.min(LIMIT, dy))}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ── 11. LIQUID GLASS ENGINE ──
     True refraction for surfaces marked [data-liquid]. For each element we
     compute a displacement map on a canvas: pixels near the edge of the
     rounded shape store an outward direction vector (R = x, G = y, neutral
     at 128) whose strength follows a smoothstep "bezel" profile, like the
     curved rim of real glass. The map feeds an SVG feDisplacementMap that
     Chromium applies to the backdrop via backdrop-filter: url(#...), so the
     page behind each surface genuinely bends at the edges. Safari and
     Firefox keep the layered blur fallback from the stylesheet. */
  (() => {
    // Per-surface tuning: bezel = rim width (px), scale = refraction depth (px)
    const PRESETS = {
      nav:  { bezel: 14, scale: 36, blur: 16, saturate: 1.8 },
      dock: { bezel: 16, scale: 44, blur: 16, saturate: 1.8 },
      lens: { bezel: 90, scale: 90, blur: 2,  saturate: 1.6 }
    };

    // backdrop-filter: url() only renders in Chromium. CSS.supports also
    // returns true in some engines that parse but never paint it, so gate
    // on actual engine markers as well.
    const parses = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'url(#lg)');
    const isFirefox = 'MozAppearance' in document.documentElement.style;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (!parses || isFirefox || isSafari) return;

    // SVG defs container shared by every generated filter
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(svgNS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);

    let uid = 0;

    /* Build the displacement map for a rounded-rect of w x h with corner
       radius r and bezel width b, using the signed-distance field of the
       shape: direction = SDF gradient (outward normal), strength =
       smoothstep over the bezel. */
    function buildMap(w, h, r, b) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(w, h);
      const data = img.data;

      const cx = w / 2, cy = h / 2;
      const hx = w / 2 - 0.5, hy = h / 2 - 0.5;
      const rr = Math.min(r, hx, hy);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x + 0.5 - cx;
          const py = y + 0.5 - cy;
          // Rounded-box SDF
          const qx = Math.abs(px) - (hx - rr);
          const qy = Math.abs(py) - (hy - rr);
          const ax = Math.max(qx, 0);
          const ay = Math.max(qy, 0);
          const outside = Math.hypot(ax, ay);
          const sd = outside + Math.min(Math.max(qx, qy), 0) - rr; // < 0 inside
          const depth = -sd; // distance from the edge, inward

          let dx = 0, dy = 0;
          if (depth >= 0 && depth < b) {
            // Outward normal from the SDF gradient
            let nx, ny;
            if (outside > 0) {
              nx = (ax / outside) * Math.sign(px);
              ny = (ay / outside) * Math.sign(py);
            } else if (qx > qy) {
              nx = Math.sign(px); ny = 0;
            } else {
              nx = 0; ny = Math.sign(py);
            }
            // Smoothstep bezel profile: strongest at the rim, easing inward
            const t = 1 - depth / b;
            const s = t * t * (3 - 2 * t);
            dx = nx * s;
            dy = ny * s;
          }

          const i = (y * w + x) * 4;
          data[i] = Math.round(127.5 + dx * 127.5);
          data[i + 1] = Math.round(127.5 + dy * 127.5);
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL();
    }

    function radiusOf(el, w, h) {
      const raw = getComputedStyle(el).borderTopLeftRadius;
      const v = parseFloat(raw) || 0;
      if (raw.includes('%')) return Math.min(w, h) * (v / 100);
      return Math.min(v, Math.min(w, h) / 2);
    }

    function apply(el) {
      const preset = PRESETS[el.dataset.liquid] || PRESETS.nav;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) return;

      const map = buildMap(w, h, radiusOf(el, w, h), preset.bezel);
      const id = el.dataset.lgId || ('lg-' + ++uid);
      el.dataset.lgId = id;

      let filter = defs.querySelector('#' + id);
      if (!filter) {
        filter = document.createElementNS(svgNS, 'filter');
        filter.setAttribute('id', id);
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        defs.appendChild(filter);
      }
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', String(w));
      filter.setAttribute('height', String(h));
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
      filter.innerHTML = '';

      const feImage = document.createElementNS(svgNS, 'feImage');
      feImage.setAttribute('href', map);
      feImage.setAttribute('x', '0');
      feImage.setAttribute('y', '0');
      feImage.setAttribute('width', String(w));
      feImage.setAttribute('height', String(h));
      feImage.setAttribute('preserveAspectRatio', 'none');
      feImage.setAttribute('result', 'map');
      filter.appendChild(feImage);

      const feDisp = document.createElementNS(svgNS, 'feDisplacementMap');
      feDisp.setAttribute('in', 'SourceGraphic');
      feDisp.setAttribute('in2', 'map');
      feDisp.setAttribute('scale', String(preset.scale));
      feDisp.setAttribute('xChannelSelector', 'R');
      feDisp.setAttribute('yChannelSelector', 'G');
      filter.appendChild(feDisp);

      const chain = `url(#${id}) blur(${preset.blur}px) saturate(${preset.saturate}) brightness(1.06)`;
      el.style.backdropFilter = chain;
      el.style.webkitBackdropFilter = chain;
    }

    const elements = document.querySelectorAll('[data-liquid]');
    if (!elements.length) return;

    // Rebuild maps when a surface is resized (debounced per batch)
    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => elements.forEach(apply), 180);
    });
    elements.forEach((el) => {
      apply(el);
      ro.observe(el);
    });

    document.documentElement.classList.add('lg-on');
  })();

  /* ── 12. INIT ── */
  setLang(getSavedLang());
})();
