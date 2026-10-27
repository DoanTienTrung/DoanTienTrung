/* Doan Tien Trung — portfolio interactions (vanilla JS, no dependencies) */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Preloader ----------
     Fills as page resources finish loading, then fades out. It is capped so a slow
     image or font never holds the page hostage (the <head> script also forces
     .is-loaded after 3s). */
  var preloader = document.getElementById("preloader");
  var preloaderFill = document.getElementById("preloaderFill");
  var preloaderCount = document.getElementById("preloaderCount");
  var loaderDone = false;

  function setProgress(p) {
    if (preloaderFill) preloaderFill.style.transform = "scaleX(" + p / 100 + ")";
    if (preloaderCount) preloaderCount.textContent = Math.round(p) + "%";
  }

  function finishLoading() {
    if (loaderDone) return;
    loaderDone = true;
    setProgress(100);
    window.setTimeout(function () {
      root.classList.add("is-loaded");
      if (preloader) preloader.classList.add("is-done");
      // Deep links like /#projects: jump there once the layout is final
      if (window.location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        // "instant" overrides the CSS smooth scrolling, which is meant for clicks, not page load
        if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }, reduceMotion ? 0 : 220);
  }

  if (reduceMotion || document.readyState === "complete") {
    finishLoading();
  } else {
    var assets = Array.prototype.slice.call(document.images).filter(function (img) { return img.loading !== "lazy"; });
    var total = assets.length + 2; // + DOM ready + web fonts
    var loaded = 0;
    var tick = function () { loaded += 1; setProgress(Math.min(95, (loaded / total) * 100)); };
    assets.forEach(function (img) {
      if (img.complete) tick();
      else { img.addEventListener("load", tick, { once: true }); img.addEventListener("error", tick, { once: true }); }
    });
    tick(); // DOM is parsed (script is deferred)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(tick, tick); else tick();
    window.addEventListener("load", finishLoading, { once: true });
    window.setTimeout(finishLoading, 2500);
  }

  /* ---------- Theme toggle ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeColorMeta) themeColorMeta.setAttribute("content", theme === "light" ? "#f7f7fb" : "#0b0d12");
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
    }
  }

  applyTheme(root.getAttribute("data-theme") || "dark");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable: theme still switches for this visit */ }
    });
  }

  /* ---------- Header background + scroll progress (one rAF per frame) ---------- */
  var header = document.querySelector(".site-header");
  var progressBar = document.getElementById("scrollProgress");
  var scrollTicking = false;

  function updateScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    }
    scrollTicking = false;
  }
  updateScroll();
  window.addEventListener("scroll", function () {
    if (!scrollTicking) { scrollTicking = true; window.requestAnimationFrame(updateScroll); }
  }, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var nav = document.getElementById("nav");

  function setMenu(open) {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function () {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 780) setMenu(false);
    });
  }

  /* ---------- Active nav link ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  var statNums = document.querySelectorAll(".stat-num[data-count]");
  if ("IntersectionObserver" in window) {
    var statObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    statNums.forEach(function (el) { statObserver.observe(el); });
  }

  /* ---------- Spotlight on project screenshots ---------- */
  if (!reduceMotion) {
    document.querySelectorAll(".browser").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - rect.left) + "px");
        card.style.setProperty("--my", (e.clientY - rect.top) + "px");
      });
    });
  }

  /* ---------- Copy email ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  var copyBtn = document.getElementById("copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(
          function () { showToast("Email copied to clipboard"); },
          function () { showToast(email); }
        );
      } else {
        showToast(email);
      }
    });
  }

  /* ---------- Hide resume links until the PDF is uploaded ---------- */
  var resumeLinks = document.querySelectorAll(".resume-link");
  if (resumeLinks.length) {
    var resumeUrl = resumeLinks[0].getAttribute("href");
    function hideResume() {
      resumeLinks.forEach(function (link) {
        var item = link.closest(".resume-item");
        (item || link).classList.add("is-hidden");
      });
    }
    if (window.location.protocol === "file:" || !window.fetch) {
      hideResume();
    } else {
      fetch(resumeUrl, { method: "HEAD" })
        .then(function (res) { if (!res.ok) hideResume(); })
        .catch(hideResume);
    }
  }

  /* ---------- Rotating hero word (types and deletes) ---------- */
  var rotator = document.querySelector(".rotator");
  if (rotator && !reduceMotion) {
    var words = (rotator.getAttribute("data-words") || "").split(",").map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length > 1) {
      var wordIndex = 0;
      var charIndex = words[0].length;
      var deleting = false;
      var typeLoop = function () {
        var word = words[wordIndex];
        if (!deleting && charIndex === word.length) {
          deleting = true;
          return window.setTimeout(typeLoop, 2200);
        }
        if (deleting && charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          word = words[wordIndex];
        }
        charIndex += deleting ? -1 : 1;
        rotator.textContent = word.slice(0, charIndex);
        window.setTimeout(typeLoop, deleting ? 45 : 85);
      };
      window.setTimeout(typeLoop, 3200);
    }
  }

  /* ---------- Pointer effects (mouse/trackpad only, skipped for reduced motion) ---------- */
  if (finePointer && !reduceMotion) {
    // Soft glow that trails the cursor, eased in a single rAF loop
    var glow = document.getElementById("cursorGlow");
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2, tx = gx, ty = gy, glowRunning = false;
    function glowFrame() {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
      if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) window.requestAnimationFrame(glowFrame);
      else glowRunning = false;
    }
    if (glow) {
      window.addEventListener("pointermove", function (e) {
        tx = e.clientX; ty = e.clientY;
        glow.classList.add("is-active");
        if (!glowRunning) { glowRunning = true; window.requestAnimationFrame(glowFrame); }
      }, { passive: true });
      document.addEventListener("pointerleave", function () { glow.classList.remove("is-active"); });
    }

    // Magnetic buttons
    document.querySelectorAll(".magnetic").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        btn.style.transform = "translate(" + dx + "px," + dy + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });

    // 3D tilt on the code card
    var heroVisual = document.getElementById("heroVisual");
    if (heroVisual) {
      heroVisual.addEventListener("pointermove", function (e) {
        var r = heroVisual.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        heroVisual.classList.add("is-tilting");
        heroVisual.style.setProperty("--ry", (px * 12).toFixed(2) + "deg");
        heroVisual.style.setProperty("--rx", (-py * 10).toFixed(2) + "deg");
      });
      heroVisual.addEventListener("pointerleave", function () {
        heroVisual.classList.remove("is-tilting");
      });
    }

    // Spotlight that follows the pointer inside cards
    document.querySelectorAll(".focus-item, .skill-card, .timeline-card, .stat").forEach(function (card) {
      card.classList.add("spotlight");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--sx", (e.clientX - r.left) + "px");
        card.style.setProperty("--sy", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Pause hero animations when it scrolls out of view ---------- */
  var hero = document.querySelector(".hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      hero.classList.toggle("is-offscreen", !entries[0].isIntersecting);
    }).observe(hero);
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
