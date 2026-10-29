(() => {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  const toggle = nav.querySelector(".nav-toggle");
  const links = nav.querySelector(".nav-links");
  const mq = window.matchMedia("(max-width: 720px)");

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  };

  const syncScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  syncScroll();
  window.addEventListener("scroll", syncScroll, { passive: true });

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      setOpen(!nav.classList.contains("is-open"));
    });

    links.addEventListener("click", (event) => {
      if (event.target.closest("a") && mq.matches) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) setOpen(false);
    });

    mq.addEventListener("change", () => {
      if (!mq.matches) setOpen(false);
    });
  }
})();
