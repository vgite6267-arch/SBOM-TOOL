document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("matrix-bg");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();

  const letters = "010101010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*";
  const fontSize = 14;
  let columns = canvas.width / fontSize;

  let drops = [];
  for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * 100; // Random starting positions
  }

  function draw() {
    // Translucent dark background to create the fade/trail effect
    ctx.fillStyle = "rgba(7, 10, 19, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cyan/Blue text color to match the app theme
    ctx.fillStyle = "#00f0ff"; 
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      
      // Draw the character
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      // Reset drop to top randomly after it crosses the screen
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 35);

  window.addEventListener('resize', () => {
    resizeCanvas();
    columns = canvas.width / fontSize;
    drops = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * 100;
    }
  });
});
