(function () {
  if (typeof Lenis === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  var NAV_OFFSET = 80;

  document.querySelectorAll('a[href^="#"], a[href*="/#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var hash = link.getAttribute("href").split("#")[1];
      if (!hash) return;
      var target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -NAV_OFFSET });
    });
  });
})();
