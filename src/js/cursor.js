(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.body.classList.add("bee-cursor-active");

  var bee = document.createElement("div");
  bee.className = "bee-cursor";
  bee.textContent = "\u{1F41D}";
  document.body.appendChild(bee);

  var targetX = window.innerWidth / 2;
  var targetY = window.innerHeight / 2;
  var curX = targetX;
  var curY = targetY;
  var lastTrailX = curX;
  var lastTrailY = curY;

  document.addEventListener("mousemove", function (e) {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function spawnTrail(x, y) {
    var dot = document.createElement("span");
    dot.className = "bee-trail";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    document.body.appendChild(dot);
    setTimeout(function () {
      dot.remove();
    }, 500);
  }

  function tick() {
    curX += (targetX - curX) * 0.2;
    curY += (targetY - curY) * 0.2;
    bee.style.transform = "translate3d(" + curX + "px," + curY + "px, 0) translate(-50%, -60%)";

    var dx = curX - lastTrailX;
    var dy = curY - lastTrailY;
    if (Math.sqrt(dx * dx + dy * dy) > 18) {
      spawnTrail(curX, curY);
      lastTrailX = curX;
      lastTrailY = curY;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
