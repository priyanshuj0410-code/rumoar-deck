/* ============================================================================
   RUMOAR — landing page behaviour
   Four things: sections fade up, the hero drifts on scroll, the nav gains a rule
   once the page moves, and the rails can be driven by their arrows. None of it is
   required for the page to be readable or usable.
   ========================================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── sections fade up on entry ──────────────────────────────────────── */
  const reveals = document.querySelectorAll(".reveal");

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    // Content must never depend on the animation having run.
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    reveals.forEach((el) => observer.observe(el));
  }

  /* ── nav rule + hero parallax ───────────────────────────────────────── */
  const nav = document.querySelector("[data-nav]");
  const hero = document.querySelector("[data-parallax]");
  const MAX_SCALE = 0.05;
  let ticking = false;

  const onFrame = () => {
    ticking = false;

    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8);

    if (hero && !reduceMotion.matches) {
      const section = hero.parentElement;
      if (!section) return;
      const { top, height } = section.getBoundingClientRect();
      // 0 while the hero is at rest, 1 once it has scrolled fully past.
      const progress = Math.min(Math.max(-top / (height || 1), 0), 1);
      hero.style.transform = `scale(${1 + progress * MAX_SCALE})`;
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onFrame);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onFrame();

  /* ── rails ──────────────────────────────────────────────────────────── */
  document.querySelectorAll("[data-rail]").forEach((rail) => {
    const next = document.querySelector(`[data-rail-next="${rail.dataset.rail}"]`);

    const step = () => {
      const card = rail.querySelector(".card");
      if (!card) return rail.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle(rail).columnGap || "0");
      return card.getBoundingClientRect().width + gap;
    };

    const sync = () => {
      if (!next) return;
      // Hidden rather than greyed at the end: the control has nothing left to do.
      next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 1;
    };

    const advance = (direction) =>
      rail.scrollBy({
        left: direction * step(),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });

    next?.addEventListener("click", () => advance(1));
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });

    // The rail is focusable, so it must answer the arrow keys too.
    rail.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        advance(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        advance(-1);
      }
    });

    sync();
  });
})();
