/* ============================================================================
   QUINTASOFT: MAIN SCRIPT
   ----------------------------------------------------------------------------
   All site behavior, grouped by feature. Depends on I18N (js/i18n.js), which
   must load first. Edit these source files, then run `npm run build` to
   regenerate the production bundle (js/app.min.js).

   TABLE OF CONTENTS
   01. Language switching (i18n)
   02. Navbar scroll state
   03. Mobile menu
   04. Scroll-reveal animations
   05. Toast notifications
   06. Contact form (FormSubmit AJAX)
   07. Testimonials slider
   08. Init
   ========================================================================== */

(() => {
  'use strict';

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

    // Swap translated aria-labels (slider arrows, menu toggle)
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = dict[el.dataset.i18nAria];
      if (value) el.setAttribute('aria-label', value);
    });

    // Document title + meta description follow the active language
    document.title = dict['meta.title'];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', dict['meta.description']);

    // Highlight the active language buttons (navbar, mobile menu, footer)
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* non-critical */
    }
  }

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      closeMenu(); // if switched from the mobile menu
    });
  });

  /* ── 02. NAVBAR SCROLL STATE ──
     Single rAF-throttled scroll listener: adds a solid background + shadow
     once the page is scrolled. */
  const navbar = document.getElementById('navbar');
  let scrollTicking = false;

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  /* ── 03. MOBILE MENU ── */
  const menu = document.getElementById('mobile-menu');
  const hamburger = document.getElementById('nav-toggle');

  function closeMenu() {
    menu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close when a menu link is clicked, on outside click, or on Escape
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ── 04. SCROLL-REVEAL ANIMATIONS ──
     Elements with .reveal fade in once; they are unobserved after revealing
     so the observer does no further work. */
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

  /* ── 05. TOAST NOTIFICATIONS ── */
  const toast = document.getElementById('toast');
  let toastTimer;

  function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  /* ── 06. CONTACT FORM (FormSubmit AJAX) ──
     Submits in-page: no redirect, shows a success/error toast instead. */
  const contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
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

  /* ── 07. TESTIMONIALS SLIDER ──
     Responsive carousel: 3 cards per view on desktop, 2 on tablet, 1 on
     mobile. Supports arrows, dots and touch swipe. */
  (() => {
    const track = document.getElementById('testimonialsTrack');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    const dotsContainer = document.getElementById('sliderDots');
    if (!track) return;

    const cards = track.querySelectorAll('.testimonial-card');
    const total = cards.length;
    const GAP = 20; // must match .testimonials-grid gap in CSS
    let current = 0;

    function getPerView() {
      if (window.innerWidth <= 480) return 1;
      if (window.innerWidth <= 768) return 2;
      return 3;
    }

    function maxIndex() {
      return Math.max(0, total - getPerView());
    }

    function buildDots() {
      dotsContainer.innerHTML = '';
      const perView = getPerView();
      const pages = Math.ceil(total / perView);
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', (currentLang === 'es' ? 'Página ' : 'Page ') + (i + 1));
        dot.addEventListener('click', () => goTo(i * perView));
        dotsContainer.appendChild(dot);
      }
    }

    function updateDots() {
      const activePage = Math.floor(current / getPerView());
      dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === activePage);
      });
    }

    function goTo(index) {
      current = Math.max(0, Math.min(index, maxIndex()));
      const cardWidth = cards[0].getBoundingClientRect().width;
      track.style.transform = `translateX(-${current * (cardWidth + GAP)}px)`;
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current >= maxIndex();
      updateDots();
    }

    prevBtn.addEventListener('click', () => goTo(current - getPerView()));
    nextBtn.addEventListener('click', () => goTo(current + getPerView()));

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + getPerView() : current - getPerView());
    }, { passive: true });

    // Rebuild on resize (debounced) since cards-per-view may change
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        buildDots();
        goTo(0);
      }, 150);
    }, { passive: true });

    buildDots();
    goTo(0);
  })();

  /* ── 08. TECH MARQUEE ──
     Each marquee track holds one set of tech pills. We clone that set once so
     the CSS animation (translateX 0 -> -50%) loops seamlessly: when the clone
     reaches the original's start position the two are pixel-identical, so there
     is no visible jump or reset. Motion is pure CSS (linear, infinite). */
  document.querySelectorAll('.marquee-track').forEach((track) => {
    const set = track.querySelector('.marquee-set');
    if (!set) return;
    const clone = set.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true'); // duplicate is decorative only
    track.appendChild(clone);
  });

  /* ── 09. INIT ── */
  setLang(getSavedLang());
})();
