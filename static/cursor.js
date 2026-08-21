document.addEventListener("DOMContentLoaded", () => {
  // Create cursor elements
  const dot = document.createElement("div");
  dot.classList.add("cursor-dot");
  
  const outline = document.createElement("div");
  outline.classList.add("cursor-outline");
  
  document.body.appendChild(dot);
  document.body.appendChild(outline);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;

  // Track mouse position
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Dot follows instantly
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  // Smooth trail for outline
  function animate() {
    let distX = mouseX - outlineX;
    let distY = mouseY - outlineY;
    
    outlineX = outlineX + (distX * 0.15);
    outlineY = outlineY + (distY * 0.15);
    
    outline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
    requestAnimationFrame(animate);
  }
  animate();

  // Click Ripples
  window.addEventListener("mousedown", (e) => {
    outline.classList.add("cursor-clicking");
    
    // Create ripple effect
    const ripple = document.createElement("div");
    ripple.classList.add("click-ripple");
    document.body.appendChild(ripple);
    
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });

  window.addEventListener("mouseup", () => {
    outline.classList.remove("cursor-clicking");
  });

  // Hover states on interactive elements
  const interactives = document.querySelectorAll("a, button, input, .samples-card, .metric-card, .graph-card");
  
  interactives.forEach(el => {
    el.addEventListener("mouseenter", () => {
      outline.classList.add("cursor-hovering");
      dot.style.opacity = "0";
    });
    el.addEventListener("mouseleave", () => {
      outline.classList.remove("cursor-hovering");
      dot.style.opacity = "1";
    });
  });
});
