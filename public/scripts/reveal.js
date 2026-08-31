/*
 * Purinton Analytics scroll motion (vanilla JS, no dependencies).
 *
 * No-JS-safe by construction: [data-reveal] elements are visible by default.
 * This script adds .reveal-armed to <html> before observing, and the CSS
 * hides unrevealed elements only under html.reveal-armed inside a
 * prefers-reduced-motion: no-preference media query. If the script never
 * runs, or the browser lacks IntersectionObserver, or the visitor prefers
 * reduced motion, nothing is ever hidden.
 *
 * Count-up ([data-countup]): animates numerals on first reveal and always
 * finishes by restoring the element's exact original text, so the rendered
 * stat strings stay byte-identical to SITE.stats.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;

  /* ---- Count-up numerals ---- */
  function animateCount(el) {
    var original = el.textContent;
    var match = original.match(/^([^0-9]*)([\d,]+)(.*)$/);
    if (!match) return;
    var prefix = match[1];
    var suffix = match[3];
    var target = parseInt(match[2].replace(/,/g, ''), 10);
    if (!isFinite(target) || target <= 0) return;
    var useCommas = match[2].indexOf(',') !== -1;
    var duration = 700;
    var start = null;

    function fmt(n) {
      return useCommas ? n.toLocaleString('en-US') : String(n);
    }

    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        el.textContent = prefix + fmt(Math.round(target * eased)) + suffix;
        requestAnimationFrame(frame);
      } else {
        el.textContent = original; /* exact original string, always */
      }
    }

    requestAnimationFrame(frame);
  }

  var counted = new WeakSet();
  var countObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !counted.has(entry.target)) {
          counted.add(entry.target);
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 },
  );

  document.querySelectorAll('[data-countup]').forEach(function (el) {
    countObserver.observe(el);
  });

  /* ---- Scroll reveals ---- */
  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  document.documentElement.classList.add('reveal-armed');

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  targets.forEach(function (el) {
    revealObserver.observe(el);
  });

  /* Safety net: no element stays hidden past a short grace period, and
     nothing is ever hidden in print output, regardless of scroll position
     or IntersectionObserver timing. */
  function revealAll() {
    targets.forEach(function (el) {
      el.classList.add('is-visible');
      revealObserver.unobserve(el);
    });
  }
  window.addEventListener('beforeprint', revealAll);
  window.setTimeout(revealAll, 2500);
})();
