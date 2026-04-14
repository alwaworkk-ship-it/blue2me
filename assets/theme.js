/* blue2me — Onepager theme JS */
(function () {
  'use strict';

  // ---- Measure header height → CSS var so .hero fits viewport ----
  const header = document.querySelector('.site-header');
  const setHeaderH = function () {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  };
  setHeaderH();
  window.addEventListener('resize', setHeaderH);
  if ('ResizeObserver' in window && header) {
    new ResizeObserver(setHeaderH).observe(header);
  }

  // ---- Header solid-on-scroll ----
  if (header) {
    const onScroll = function () {
      if (window.scrollY > 40) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Mobile nav toggle ----
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close on link tap
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Smooth-scroll for hash links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.replaceState(null, '', href);
    });
  });

  // ---- Reveal on scroll ----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  // ---- Recipes nav (decorative — scrolls track) ----
  const recipesPrev = document.querySelector('[data-recipes-prev]');
  const recipesNext = document.querySelector('[data-recipes-next]');
  const recipesTrack = document.querySelector('[data-recipes-track]');
  if (recipesPrev && recipesNext && recipesTrack) {
    const scrollBy = function (dir) {
      const card = recipesTrack.querySelector('.recipe-card');
      const w = card ? card.offsetWidth + 20 : 320;
      recipesTrack.scrollBy({ left: dir * w, behavior: 'smooth' });
    };
    recipesPrev.addEventListener('click', function () { scrollBy(-1); });
    recipesNext.addEventListener('click', function () { scrollBy(1); });
  }

  // ---- Buy-Section: quantity steppers + variant radios ----
  document.querySelectorAll('[data-buy-form]').forEach(function (form) {
    const qty = form.querySelector('input[name="quantity"]');
    const down = form.querySelector('[data-qty-down]');
    const up = form.querySelector('[data-qty-up]');
    if (qty && down && up) {
      down.addEventListener('click', function () {
        const v = Math.max(1, parseInt(qty.value || '1', 10) - 1);
        qty.value = v;
      });
      up.addEventListener('click', function () {
        const v = Math.min(20, parseInt(qty.value || '1', 10) + 1);
        qty.value = v;
      });
    }
    form.querySelectorAll('.buy-section__variant input[type="radio"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        form.querySelectorAll('.buy-section__variant').forEach(function (l) { l.classList.remove('is-active'); });
        radio.closest('.buy-section__variant').classList.add('is-active');
      });
    });
  });

  // ---- Newsletter forms (front-end only — Shopify customer create handled by form action) ----
  document.querySelectorAll('[data-newsletter-form]').forEach(function (form) {
    form.addEventListener('submit', function () {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✓';
      }
    });
  });
})();
