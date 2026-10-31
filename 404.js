// Pupils lean toward the pointer (or a tapped point), capped inside the eye
(() => {
  const eyes = [...document.querySelectorAll(".eye")];
  const look = (x, y) => eyes.forEach((eye) => {
    const r = eye.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const max = r.width * 0.22;
    const travel = Math.min(max, dist / 8);
    eye.firstElementChild.style.transform = `translate(${(dx / dist) * travel}px, ${(dy / dist) * travel}px)`;
  });
  window.addEventListener("pointermove", (e) => look(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => look(e.clientX, e.clientY), { passive: true });
})();
