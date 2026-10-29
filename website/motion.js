(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  document.documentElement.classList.add('js-motion');

  const sections = document.querySelectorAll('.section');

  if (!sections.length || !('IntersectionObserver' in window)) {
    sections.forEach(function (section) {
      section.classList.add('is-in');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
