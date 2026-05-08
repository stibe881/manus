/* Manu's Coiffeur — interactive layer */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Info banner ---------- */
  const banner = $("#banner");
  const bannerClose = $("#banner-close");
  const BANNER_KEY = "manus_banner_dismissed_v1";
  if (banner && bannerClose) {
    const dismissed = (() => {
      try { return sessionStorage.getItem(BANNER_KEY) === "1"; }
      catch { return false; }
    })();

    if (!dismissed) {
      banner.hidden = false;
      // Reserve nav offset variable based on actual height
      requestAnimationFrame(() => {
        const h = banner.offsetHeight;
        document.documentElement.style.setProperty("--banner-h", h + "px");
        document.body.classList.add("has-banner");
        // Slide in slightly delayed so it doesn't compete with the hero animation
        setTimeout(() => banner.classList.add("is-visible"), 700);
      });
    }

    const dismiss = () => {
      banner.classList.add("is-leaving");
      banner.classList.remove("is-visible");
      document.body.classList.remove("has-banner");
      try { sessionStorage.setItem(BANNER_KEY, "1"); } catch {}
      setTimeout(() => { banner.hidden = true; }, 700);
    };
    bannerClose.addEventListener("click", dismiss);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && banner.classList.contains("is-visible")) dismiss();
    });
  }

  /* ---------- Cookie notice ---------- */
  const cookie = $("#cookie");
  const cookieAccept = $("#cookie-accept");
  const cookieDecline = $("#cookie-decline");
  const COOKIE_KEY = "manus_cookie_choice_v1";
  if (cookie && cookieAccept && cookieDecline) {
    let stored = null;
    try { stored = localStorage.getItem(COOKIE_KEY); } catch {}

    if (!stored) {
      cookie.hidden = false;
      // Delay so it doesn't compete with banner / hero
      setTimeout(() => cookie.classList.add("is-visible"), 1400);
    }

    const close = (choice) => {
      cookie.classList.remove("is-visible");
      cookie.classList.add("is-leaving");
      try { localStorage.setItem(COOKIE_KEY, choice); } catch {}
      setTimeout(() => { cookie.hidden = true; }, 700);
    };
    cookieAccept.addEventListener("click", () => close("accepted"));
    cookieDecline.addEventListener("click", () => close("declined"));
  }

  /* ---------- Year ---------- */
  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Sticky nav ---------- */
  const nav = $("#nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $(".nav__burger");
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".nav__links a").forEach(a => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add("is-visible"));
  }

  /* ---------- Counter animation ---------- */
  const counters = $$("[data-counter]");
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10) || 0;
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObs.observe(el));

  /* ---------- Parallax ---------- */
  const parallaxEls = $$("[data-parallax]");
  let lastY = window.scrollY;
  let ticking = false;
  const updateParallax = () => {
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed * -1;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    lastY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
  updateParallax();

  /* ---------- Open / closed status ---------- */
  // Schedule (24h time)
  // 0 = Sunday … 6 = Saturday
  const schedule = {
    1: null,                 // Mo: closed
    2: [9, 0, 18, 30],       // Di
    3: [9, 0, 18, 30],       // Mi
    4: [9, 0, 18, 30],       // Do
    5: [11, 0, 19, 0],       // Fr
    6: [7, 30, 15, 0],       // Sa
    0: null,                 // So: closed
  };

  const status = $("#status");
  if (status) {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const cur = hours * 60 + mins;
    const today = schedule[day];

    let state, text;
    if (!today) {
      state = "is-closed";
      text = "Heute geschlossen";
    } else {
      const open = today[0] * 60 + today[1];
      const close = today[2] * 60 + today[3];
      if (cur >= open && cur < close) {
        state = "is-open";
        const closeStr = `${String(today[2]).padStart(2,"0")}:${String(today[3]).padStart(2,"0")}`;
        text = `Jetzt geöffnet · bis ${closeStr}`;
      } else if (cur < open) {
        state = "is-closed";
        const openStr = `${String(today[0]).padStart(2,"0")}:${String(today[1]).padStart(2,"0")}`;
        text = `Heute geschlossen · öffnet ${openStr}`;
      } else {
        state = "is-closed";
        text = "Heute bereits geschlossen";
      }
    }
    status.classList.add(state);
    $(".status-text", status).textContent = text;

    // Highlight today's row
    const rows = $$(".hours__row");
    // map JS day -> our row order: Mo,Di,Mi,Do,Fr,Sa,So  (rows index 0..6)
    const map = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 };
    const rowIdx = map[day];
    if (rows[rowIdx]) rows[rowIdx].classList.add("is-today");
  }

  /* ---------- Custom cursor ---------- */
  const cursor = $("#cursor");
  if (cursor && matchMedia("(hover: hover)").matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
    });
    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    const hoverables = "a, button, .service, .price-list li";
    $$(hoverables).forEach(el => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- Service: split content for mobile ---------- */
  // (no-op; CSS handles it)
})();
