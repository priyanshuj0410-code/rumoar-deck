/* ============================================================================
   RUMOAR — landing page behaviour
   Three things only: sections fade up as they enter, the hero image drifts on
   scroll, and the places rail can be driven by its arrows. Nothing here is
   required for the page to be readable or usable.
   ========================================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── sections fade up on entry ──────────────────────────────────────── */
  const reveals = document.querySelectorAll(".reveal");

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    // No observer, no preference for motion: show everything immediately. The
    // content must never depend on the animation having run.
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
      // Fire a little before the element arrives, so it is already settled by
      // the time it is properly in view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    reveals.forEach((el) => observer.observe(el));
  }

  /* ── hero parallax ──────────────────────────────────────────────────── */
  const hero = document.querySelector("[data-parallax]");

  if (hero && !reduceMotion.matches) {
    const MAX_SCALE = 0.05; // 5% over the height of the hero
    let ticking = false;

    const update = () => {
      ticking = false;
      const frame = hero.parentElement;
      if (!frame) return;

      const { top, height } = frame.getBoundingClientRect();
      // 0 while the hero is at rest, 1 once it has scrolled fully past.
      const progress = Math.min(Math.max(-top / (height || 1), 0), 1);
      hero.style.transform = `scale(${1 + progress * MAX_SCALE})`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* ── places rail ────────────────────────────────────────────────────── */
  const rail = document.querySelector(".rail");
  const prev = document.querySelector("[data-rail-prev]");
  const next = document.querySelector("[data-rail-next]");

  if (rail && prev && next) {
    const step = () => {
      const card = rail.querySelector(".card");
      if (!card) return rail.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle(rail).columnGap || "0");
      return card.getBoundingClientRect().width + gap;
    };

    const syncControls = () => {
      const max = rail.scrollWidth - rail.clientWidth - 1;
      prev.disabled = rail.scrollLeft <= 0;
      next.disabled = rail.scrollLeft >= max;
    };

    const scrollBy = (direction) =>
      rail.scrollBy({
        left: direction * step(),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });

    prev.addEventListener("click", () => scrollBy(-1));
    next.addEventListener("click", () => scrollBy(1));
    rail.addEventListener("scroll", syncControls, { passive: true });
    window.addEventListener("resize", syncControls, { passive: true });

    // The rail is focusable, so it must answer the arrow keys too.
    rail.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollBy(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollBy(-1);
      }
    });

    syncControls();
  }
})();
