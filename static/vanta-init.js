document.addEventListener("DOMContentLoaded", () => {
  if (typeof VANTA !== 'undefined' && document.getElementById('vanta-bg')) {
    VANTA.GLOBE({
      el: "#vanta-bg",
      mouseControls: true,
      touchControls: true,
      gyroControls: true,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x00f0ff,       // Cyan
      color2: 0x38bdf8,      // Light blue
      size: 1.50,
      backgroundColor: 0x070a13
    });
  }
});
