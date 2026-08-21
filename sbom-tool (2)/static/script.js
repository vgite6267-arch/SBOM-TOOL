/**
 * SBOM Guardian - High-Visibility 3D WebGL & 2D Force Visualizer
 * Supports True 3D WebGL (Three.js / 3d-force-graph) + 2D D3.js fallback & toggle.
 */

let currentProject = null;
let graph3DInstance = null;
let currentViewMode = '3D'; // Change this to '2D' if you want it to default to the flat version
let isAutoRotating = true;
let pulsingMeshes = [];
let d3Simulation = null;

// ==========================================
// 1. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initNeuralBackground();
  initEventListeners();
  loadSample('python'); // Auto-load initial sample
});

function initEventListeners() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  // File Upload Handlers
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
      }
    });
  }

  // Preset Sample Buttons
  document.getElementById('btn-sample-python').addEventListener('click', () => loadSample('python'));
  document.getElementById('btn-sample-node').addEventListener('click', () => loadSample('node'));

  // Export SBOM Button
  document.getElementById('btn-export-sbom').addEventListener('click', exportCycloneDX);

  // Close Inspector Panel
  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    document.getElementById('inspector-panel').classList.remove('open');
  });

  // Toggle 3D / 2D View Mode
  const toggleDimBtn = document.getElementById('btn-toggle-dim');
  if (toggleDimBtn) {
    toggleDimBtn.addEventListener('click', () => {
      currentViewMode = (currentViewMode === '3D') ? '2D' : '3D';
      toggleDimBtn.innerHTML = currentViewMode === '3D' ? '🌐 3D View' : '📊 2D View';
      if (currentProject) {
        renderGraphByMode();
      }
    });
  }

  // 3D Auto-Rotate Toggle
  const rotateBtn = document.getElementById('btn-toggle-rotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      isAutoRotating = !isAutoRotating;
      rotateBtn.classList.toggle('active', isAutoRotating);
      if (graph3DInstance) {
        graph3DInstance.controls().autoRotate = isAutoRotating;
        graph3DInstance.controls().autoRotateSpeed = 1.0;
      }
    });
  }

  // 3D Center View Button
  const resetCamBtn = document.getElementById('btn-reset-camera');
  if (resetCamBtn) {
    resetCamBtn.addEventListener('click', () => {
      if (currentViewMode === '3D' && graph3DInstance) {
        graph3DInstance.cameraPosition({ x: 0, y: 0, z: 220 }, { x: 0, y: 0, z: 0 }, 800);
      } else if (currentViewMode === '2D') {
        render2DGraph(currentProject.graph);
      }
    });
  }

  // Export PDF Report Button
  const exportPdfBtn = document.getElementById('btn-export-pdf');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

// ==========================================
// 2. INTERACTIVE NEURAL NETWORK PARTICLE BG
// ==========================================

function initNeuralBackground() {
  const canvas = document.getElementById('neural-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor((width * height) / 20000), 65);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.6 + 1,
      color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : 'rgba(168, 85, 247, '
    });
  }

  let mouseX = -1000;
  let mouseY = -1000;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '0.7)';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          const opacity = (1 - dist / 110) * 0.2;
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      const mDx = p.x - mouseX;
      const mDy = p.y - mouseY;
      const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
      if (mDist < 130) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouseX, mouseY);
        const mOpacity = (1 - mDist / 130) * 0.3;
        ctx.strokeStyle = `rgba(0, 240, 255, ${mOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// ==========================================
// 3. GRAPH DISPATCHER (3D vs 2D)
// ==========================================

function renderGraphByMode() {
  if (!currentProject) return;
  const container = document.getElementById('graph-container');
  if (!container) return;

  if (currentViewMode === '3D' && typeof ForceGraph3D !== 'undefined') {
    render3DGraph(currentProject.graph);
  } else {
    render2DGraph(currentProject.graph);
  }
}

// ==========================================
// 4. TRUE 3D WEBGL FORCE GRAPH (THREE.JS)
// ==========================================

function render3DGraph(graphData) {
  const container = document.getElementById('graph-container');
  if (!container) return;

  container.innerHTML = '';
  pulsingMeshes = [];

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 520;

  try {
    graph3DInstance = ForceGraph3D()(container)
      .width(width)
      .height(height)
      .backgroundColor('#090d18')
      .showNavInfo(false)
      .nodeRelSize(8)
      .linkWidth(2.2)
      .linkColor(() => 'rgba(56, 189, 248, 0.45)')
      .linkDirectionalParticles(3)
      .linkDirectionalParticleSpeed(0.007)
      .linkDirectionalParticleWidth(2.5)
      .linkDirectionalParticleColor(() => '#00f0ff')
      .nodeThreeObject(node => create3DNodeObject(node))
      .graphData({
        nodes: JSON.parse(JSON.stringify(graphData.nodes)),
        links: JSON.parse(JSON.stringify(graphData.links))
      })
      .onNodeClick(node => {
        if (node.type !== 'root') {
          showInspector(node);
          const distance = 85;
          const distRatio = 1 + distance / (Math.hypot(node.x, node.y, node.z) || 1);
          graph3DInstance.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
            node,
            1000
          );
        }
      });

    const scene = graph3DInstance.scene();
    if (scene && typeof THREE !== 'undefined') {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);
      const pointLight = new THREE.PointLight(0x00f0ff, 1.5, 500);
      pointLight.position.set(50, 100, 150);
      scene.add(pointLight);
    }

    graph3DInstance.cameraPosition({ x: 0, y: 0, z: 220 }, { x: 0, y: 0, z: 0 }, 600);
    graph3DInstance.controls().autoRotate = isAutoRotating;
    graph3DInstance.controls().autoRotateSpeed = 1.0;

    function animate3DHalos() {
      const time = Date.now() * 0.004;
      pulsingMeshes.forEach(mesh => {
        const scale = 1 + Math.sin(time) * 0.25;
        mesh.scale.set(scale, scale, scale);
      });
      if (currentViewMode === '3D') {
        requestAnimationFrame(animate3DHalos);
      }
    }
    animate3DHalos();

  } catch (err) {
    console.error('3D initialization failed, falling back to 2D:', err);
    render2DGraph(graphData);
  }
}

function create3DNodeObject(node) {
  if (typeof THREE === 'undefined') return null;

  const group = new THREE.Group();

  let color = 0x10b981; 
  let emissive = 0x059669;
  let isVulnerable = false;

  if (node.type === 'root') {
    color = 0xa855f7; 
    emissive = 0x7e22ce;
  } else if (node.severity === 'CRITICAL' || node.severity === 'HIGH') {
    color = 0xff0055; 
    emissive = 0xbe123c;
    isVulnerable = true;
  } else if (node.severity === 'MEDIUM') {
    color = 0xfbbf24; 
    emissive = 0xd97706;
  }

  const radius = node.radius ? node.radius * 0.5 : 8;

  const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
  const sphereMat = new THREE.MeshLambertMaterial({
    color: color,
    emissive: emissive,
    emissiveIntensity: 0.8
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  if (isVulnerable) {
    const haloGeo = new THREE.IcosahedronGeometry(radius * 1.6, 1);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    group.add(haloMesh);
    pulsingMeshes.push(haloMesh);
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 80;

  context.fillStyle = 'rgba(8, 12, 24, 0.9)';
  context.beginPath();
  context.roundRect(10, 10, 280, 60, 12);
  context.fill();
  context.strokeStyle = isVulnerable ? '#ff0055' : (node.type === 'root' ? '#a855f7' : '#38bdf8');
  context.lineWidth = 3;
  context.stroke();

  context.font = 'Bold 22px Inter, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(node.label || '', 150, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(28, 7.5, 1);
  sprite.position.set(0, radius + 8, 0);
  group.add(sprite);

  return group;
}

// ==========================================
// 5. 2D HIGH-CONTRAST D3 FORCE GRAPH
// ==========================================

function render2DGraph(graphData) {
  const container = document.getElementById('graph-container');
  if (!container || typeof d3 === 'undefined') return;

  container.innerHTML = '';
  if (d3Simulation) d3Simulation.stop();

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 520;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height]);

  const defs = svg.append('defs');
  const glowFilter = defs.append('filter').attr('id', 'glow-2d');
  glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
  const feMerge = glowFilter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
    g.attr('transform', event.transform);
  }));

  const nodes = JSON.parse(JSON.stringify(graphData.nodes));
  const links = JSON.parse(JSON.stringify(graphData.links));

  d3Simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(110))
    .force('charge', d3.forceManyBody().strength(-360))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.radius + 18));

  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', 'rgba(56, 189, 248, 0.4)')
    .attr('stroke-width', 2);

  const node = g.append('g')
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', (event) => {
        if (!event.active) d3Simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) d3Simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }));

  node.filter(d => d.severity === 'CRITICAL' || d.severity === 'HIGH')
    .append('circle')
    .attr('r', d => d.radius + 7)
    .attr('fill', 'none')
    .attr('stroke', '#ff0055')
    .attr('stroke-width', 2)
    .attr('opacity', 0.8)
    .attr('filter', 'url(#glow-2d)');

  node.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => {
      if (d.type === 'root') return '#a855f7';
      if (d.severity === 'CRITICAL' || d.severity === 'HIGH') return '#ff0055';
      if (d.severity === 'MEDIUM') return '#fbbf24';
      return '#10b981';
    })
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      if (d.type !== 'root') showInspector(d);
    });

  node.append('text')
    .attr('dy', d => d.radius + 16)
    .attr('text-anchor', 'middle')
    .attr('fill', '#ffffff')
    .attr('font-size', '12px')
    .attr('font-weight', '700')
    .attr('font-family', 'Inter, sans-serif')
    .style('text-shadow', '0 2px 6px rgba(0,0,0,0.9)')
    .text(d => d.label);

  d3Simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

// ==========================================
// SCROLL REVEAL ANIMATIONS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.scroll-reveal').forEach(el => {
    observer.observe(el);
  });
});

// ==========================================
// 6. API & DATA PIPELINE
// ==========================================

async function uploadFile(file) {
  const overlay = document.getElementById('processing-overlay');
  if (overlay) overlay.classList.add('active');

  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('File processing failed');
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    alert('Upload failed: ' + err.message);
  } finally {
    if (overlay) overlay.classList.remove('active');
  }
}

async function loadSample(type) {
  const overlay = document.getElementById('processing-overlay');
  if (overlay) overlay.classList.add('active');

  try {
    const res = await fetch(`/api/sample/${type}`);
    if (!res.ok) throw new Error('Failed to load sample');
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    alert('Failed to load preset: ' + err.message);
  } finally {
    if (overlay) overlay.classList.remove('active');
  }
}

function renderAll(data) {
  currentProject = data;

  document.getElementById('project-name').textContent = data.project_name;

  document.getElementById('metric-total').textContent = data.stats.total;
  document.getElementById('metric-vulnerable').textContent = data.stats.vulnerable;
  document.getElementById('metric-clean').textContent = data.stats.clean;
  document.getElementById('table-count').textContent = `${data.stats.total} Packages`;

  renderGraphByMode();

  renderTable(data.packages);
}

function renderTable(packages) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = packages.map(p => `
    <tr>
      <td><strong style="color: #ffffff;">${p.name}</strong></td>
      <td><span class="code-badge">v${p.version}</span></td>
      <td><span class="badge-pill">${p.ecosystem.toUpperCase()}</span></td>
      <td><span class="badge-pill">${p.license}</span></td>
      <td><span class="badge-status ${p.severity}">${p.cve ? `${p.severity} (${p.cve})` : 'CLEAN'}</span></td>
      <td><span style="color: ${p.severity !== 'CLEAN' ? 'var(--cyan)' : 'var(--text-muted)'}; font-weight: 600;">${p.fix}</span></td>
    </tr>
  `).join('');
}

function showInspector(node) {
  document.getElementById('inspect-name').textContent = node.label;
  document.getElementById('inspect-version').textContent = `v${node.version}`;
  document.getElementById('inspect-license').textContent = node.license || 'Unknown';
  document.getElementById('inspect-context').textContent = node.context || 'No context available.';
  
  const statusEl = document.getElementById('inspect-status');
  if (node.cve) {
    statusEl.innerHTML = `<span class="badge-status ${node.severity}">${node.severity}: ${node.cve}</span>`;
  } else {
    statusEl.innerHTML = `<span class="badge-status CLEAN">Safe / Verified</span>`;
  }

  document.getElementById('inspect-fix').textContent = node.fix || 'Up to date';
  document.getElementById('inspector-panel').classList.add('open');
}

async function exportCycloneDX() {
  if (!currentProject) return;

  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: currentProject.project_name,
        packages: currentProject.packages
      })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyclonedx-sbom.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
}