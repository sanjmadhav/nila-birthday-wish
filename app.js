/* ═══════════════════════════════════════════
   BIRTHDAY WISH — CINEMATIC ENGINE v4
   Three.js 3D + Morph Transitions + SVG Effects
   ═══════════════════════════════════════════ */

// ══════════ THREE.JS SETUP (transparent alpha) ══════════
var scene, camera, renderer, stars, starMat, moon;
var mainLight, rimLight, ambientLight, moonGlow;
var threeReady = false;

var targetCameraZ = 8;
var targetCameraY = 0;
var targetStarOpacity = 0.6;
var targetLightColor = null;
var targetLightIntensity = 1.0;
var targetMoonScale = 0.8;
var targetMoonGlowIntensity = 0.5;
var mouseX = 0, mouseY = 0;

try {
  scene = new THREE.Scene();
  // NO scene.background — let CSS show through transparent canvas

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("bg"),
    antialias: true,
    alpha: true,  // TRANSPARENT — CSS cosmic-bg shows through
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.setClearColor(0x000000, 0); // fully transparent

  // Lights
  ambientLight = new THREE.AmbientLight(0x606080, 0.8);
  scene.add(ambientLight);

  mainLight = new THREE.PointLight(0xfff8e7, 1.8, 50);
  mainLight.position.set(5, 5, 5);
  scene.add(mainLight);

  rimLight = new THREE.PointLight(0x8888ff, 1.0, 30);
  rimLight.position.set(-5, -3, 3);
  scene.add(rimLight);

  // Moon glow — dedicated light behind moon for halo effect
  moonGlow = new THREE.PointLight(0xddeeff, 0.5, 20);
  moonGlow.position.set(0, 0, -2);
  scene.add(moonGlow);

  // Stars — 3000 points
  var starCount = 3000;
  var starPositions = new Float32Array(starCount * 3);
  for (var i = 0; i < starCount; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 160;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 160;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

  starMat = new THREE.PointsMaterial({
    color: 0xffeedd,
    size: 0.18,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Moon GLB model (larger, brighter, with glow)
  var loader = new THREE.GLTFLoader();
  loader.load(
    "assets/moon.glb",
    function (gltf) {
      moon = gltf.scene;
      moon.scale.set(2.0, 2.0, 2.0);
      moon.traverse(function (child) {
        if (child.isMesh) {
          child.material.emissive = new THREE.Color(0x556688);
          child.material.emissiveIntensity = 0.35;
          child.material.roughness = 0.5;
        }
      });
      scene.add(moon);
      console.log("Moon GLB loaded successfully");
    },
    undefined,
    function (err) {
      console.warn("Moon GLB failed, using procedural:", err);
      // Beautiful procedural fallback
      var moonGeo = new THREE.SphereGeometry(2.0, 64, 64);
      var moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8e0d0,
        roughness: 0.55,
        metalness: 0.08,
        emissive: 0x556688,
        emissiveIntensity: 0.4,
      });
      moon = new THREE.Mesh(moonGeo, moonMaterial);
      scene.add(moon);
    }
  );

  targetLightColor = new THREE.Color(0x8866cc);
  threeReady = true;

} catch (e) {
  console.warn("Three.js init failed:", e);
  var c = document.getElementById("bg");
  if (c) c.style.display = "none";
}

// ══════════ PHASE 3D CONFIGS ══════════
var phaseConfigs = {
  intro:     { cameraZ: 8,   cameraY: 0,    starOp: 0.7, light: 0x8866cc, li: 1.2,  mScale: 0.8,  glow: 0.3 },
  morning:   { cameraZ: 7,   cameraY: 0.3,  starOp: 0.35,light: 0xffb347, li: 2.2,  mScale: 0.5,  glow: 0.2 },
  noon:      { cameraZ: 7.5, cameraY: 0.5,  starOp: 0.12,light: 0xffeedd, li: 2.8,  mScale: 0.3,  glow: 0.1 },
  evening:   { cameraZ: 6.5, cameraY: 0.2,  starOp: 0.5, light: 0xff8844, li: 1.6,  mScale: 0.7,  glow: 0.4 },
  night:     { cameraZ: 5.5, cameraY: -0.2, starOp: 1.0, light: 0x4444aa, li: 0.9,  mScale: 1.5,  glow: 0.8 },
  moonPhase: { cameraZ: 3.8, cameraY: 0,    starOp: 1.0, light: 0xddeeff, li: 2.5,  mScale: 2.8,  glow: 2.0 },
  final:     { cameraZ: 6,   cameraY: 0,    starOp: 0.9, light: 0xcc88ff, li: 2.2,  mScale: 1.5,  glow: 1.0 },
};

function setPhaseScene(name) {
  var cfg = phaseConfigs[name];
  if (!cfg || !threeReady) return;
  targetCameraZ = cfg.cameraZ;
  targetCameraY = cfg.cameraY;
  targetStarOpacity = cfg.starOp;
  targetLightColor = new THREE.Color(cfg.light);
  targetLightIntensity = cfg.li;
  targetMoonScale = cfg.mScale;
  targetMoonGlowIntensity = cfg.glow;
}

// ══════════ RENDER LOOP ══════════
var clock = threeReady ? new THREE.Clock() : null;

function animate() {
  requestAnimationFrame(animate);
  if (!threeReady) return;

  var t = clock.getElapsedTime();

  // Camera with mouse parallax
  camera.position.z += (targetCameraZ - camera.position.z) * 0.02;
  camera.position.y += (targetCameraY - camera.position.y) * 0.02;
  camera.position.x += (mouseX * 0.5 + Math.sin(t * 0.25) * 0.15 - camera.position.x) * 0.03;
  camera.position.y += (mouseY * -0.3 - camera.position.y) * 0.01;

  // Stars
  if (starMat) starMat.opacity += (targetStarOpacity - starMat.opacity) * 0.02;
  if (stars) {
    stars.rotation.y += 0.0002;
    stars.rotation.x += 0.00008;
  }

  // Light
  if (mainLight && targetLightColor) {
    mainLight.color.lerp(targetLightColor, 0.02);
    mainLight.intensity += (targetLightIntensity - mainLight.intensity) * 0.02;
  }

  // Moon glow
  if (moonGlow) {
    moonGlow.intensity += (targetMoonGlowIntensity - moonGlow.intensity) * 0.02;
  }

  // Moon
  if (moon) {
    var s = moon.scale.x + (targetMoonScale - moon.scale.x) * 0.012;
    moon.scale.set(s, s, s);
    moon.rotation.y += 0.0015;
    moon.position.y = Math.sin(t * 0.4) * 0.2;
    moon.position.x = Math.sin(t * 0.15) * 0.1;
  }

  renderer.render(scene, camera);
}
animate();

// Mouse parallax
document.addEventListener("mousemove", function (e) {
  mouseX = (e.clientX / innerWidth - 0.5) * 2;
  mouseY = (e.clientY / innerHeight - 0.5) * 2;
});

window.addEventListener("resize", function () {
  if (!threeReady) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});


// ══════════════════════════════════════════
// UI — Morph Phase Transitions
// ══════════════════════════════════════════

var screens = {
  intro:     document.getElementById("intro"),
  morning:   document.getElementById("morning"),
  noon:      document.getElementById("noon"),
  evening:   document.getElementById("evening"),
  night:     document.getElementById("night"),
  moonPhase: document.getElementById("moonPhase"),
  final:     document.getElementById("final"),
};

var phaseOrder = ["intro", "morning", "noon", "evening", "night", "moonPhase", "final"];
var currentPhaseIndex = 0;
var dots = document.querySelectorAll(".phase-dots .dot");
var morphOverlay = document.getElementById("morphOverlay");
var isTransitioning = false;

// Morph colors per phase
var morphColors = {
  intro: "rgba(100, 60, 180, 0.4)",
  morning: "rgba(255, 160, 50, 0.5)",
  noon: "rgba(255, 220, 120, 0.4)",
  evening: "rgba(200, 100, 50, 0.5)",
  night: "rgba(40, 30, 100, 0.5)",
  moonPhase: "rgba(180, 180, 220, 0.4)",
  final: "rgba(160, 80, 220, 0.5)",
};

function updateDots(idx) {
  dots.forEach(function (d, i) {
    d.classList.remove("active", "completed");
    if (i < idx) d.classList.add("completed");
    if (i === idx) d.classList.add("active");
  });
}

function goToPhase(name) {
  if (isTransitioning) return;
  isTransitioning = true;

  // Morph transition
  var color = morphColors[name] || "rgba(100, 60, 180, 0.4)";
  morphOverlay.style.background = color;
  morphOverlay.classList.add("morph-active");

  // Deactivate all screens
  Object.keys(screens).forEach(function (k) {
    if (screens[k]) screens[k].classList.remove("active");
  });

  // CSS phase attribute
  document.body.setAttribute("data-phase", name);

  // 3D scene
  setPhaseScene(name);

  // Update celestial SVG morph
  updateCelestial(name);

  // Update phase dots
  var idx = phaseOrder.indexOf(name);
  if (idx >= 0) updateDots(idx);

  // After morph circle covers screen, reveal new screen
  setTimeout(function () {
    if (screens[name]) screens[name].classList.add("active");

    // Typewriter for phase titles
    var textMap = {
      morning: "morningText",
      noon: "noonText",
      evening: "eveningText",
      night: "nightText",
      moonPhase: "moonText",
    };
    if (textMap[name] && phaseTexts[name]) {
      var el = document.getElementById(textMap[name]);
      if (el) typeWriter(el, phaseTexts[name]);
    }

    // Confetti on final
    if (name === "final") launchConfetti();

    // Retract morph circle
    setTimeout(function () {
      morphOverlay.classList.remove("morph-active");
      setTimeout(function () { isTransitioning = false; }, 600);
    }, 300);
  }, 600);
}

function goNext() {
  if (isTransitioning) return;
  currentPhaseIndex++;
  if (currentPhaseIndex < phaseOrder.length) {
    goToPhase(phaseOrder[currentPhaseIndex]);
  }
}

// ══════════ CELESTIAL SVG MORPH ══════════
var celBody = document.getElementById("celBody");
var celRays = document.getElementById("celRays");
var celInner = document.getElementById("celInner");
var celestialEl = document.getElementById("celestial");

var celestialConfigs = {
  intro:     { r: 35, fill: "url(#gG)",   raysOp: 0.15, opacity: 0.3, scale: 0.8 },
  morning:   { r: 40, fill: "url(#sunG)",  raysOp: 0.4,  opacity: 0.6, scale: 1.0 },
  noon:      { r: 48, fill: "url(#sunG)",  raysOp: 0.6,  opacity: 0.7, scale: 1.2 },
  evening:   { r: 38, fill: "url(#sunG)",  raysOp: 0.3,  opacity: 0.5, scale: 0.9 },
  night:     { r: 30, fill: "url(#gG)",    raysOp: 0,    opacity: 0.4, scale: 0.7 },
  moonPhase: { r: 42, fill: "url(#moonG)", raysOp: 0,    opacity: 0.7, scale: 1.1 },
  final:     { r: 36, fill: "url(#purpleG)", raysOp: 0.1, opacity: 0.5, scale: 0.9 },
};

function updateCelestial(name) {
  var cfg = celestialConfigs[name];
  if (!cfg || !celBody) return;
  celBody.setAttribute("r", cfg.r);
  celBody.setAttribute("fill", cfg.fill);
  celBody.style.opacity = cfg.opacity;
  if (celRays) celRays.style.opacity = cfg.raysOp;
  if (celestialEl) celestialEl.style.transform = "translate(-50%,-50%) scale(" + cfg.scale + ")";
}

// ══════════ TYPEWRITER ══════════
function typeWriter(element, text, speed) {
  speed = speed || 40;
  element.innerHTML = "";
  var idx = 0;
  var cursor = document.createElement("span");
  cursor.className = "cursor";
  element.appendChild(cursor);

  function type() {
    if (idx < text.length) {
      element.insertBefore(document.createTextNode(text.charAt(idx)), cursor);
      idx++;
      setTimeout(type, speed);
    } else {
      setTimeout(function () { if (cursor.parentNode) cursor.remove(); }, 2500);
    }
  }
  type();
}

// ══════════ PHASE TEXTS ══════════
var phaseTexts = {
  morning:   "A new day rises\u2026 just like you bring light into every life you touch.",
  noon:      "When life was at its hardest, you stood beside me like the sun \u2014 unwavering.",
  evening:   "Every golden memory I hold close\u2026 has you in it.",
  night:     "Close your eyes\u2026 something magical is about to unfold.",
  moonPhase: "Like the moon, you shine brightest when the world is at its darkest.",
};

// ══════════ BUTTON BINDINGS ══════════
document.getElementById("startBtn").addEventListener("click", function () {
  startMusic();
  goNext();
});

document.getElementById("morningBtn").addEventListener("click", goNext);
document.getElementById("noonBtn").addEventListener("click", goNext);
document.getElementById("eveningBtn").addEventListener("click", goNext);
document.getElementById("nightBtn").addEventListener("click", goNext);
document.getElementById("moonBtn").addEventListener("click", goNext);

document.getElementById("replayBtn").addEventListener("click", function () {
  currentPhaseIndex = 0;
  goToPhase("intro");
});

// ══════════ MAGNETIC BUTTONS ══════════
document.querySelectorAll(".magnetic").forEach(function (btn) {
  btn.addEventListener("mousemove", function (e) {
    var rect = btn.getBoundingClientRect();
    var x = e.clientX - rect.left - rect.width / 2;
    var y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = "translate(" + (x * 0.12) + "px," + (y * 0.12) + "px)";
  });
  btn.addEventListener("mouseleave", function () {
    btn.style.transform = "";
  });
});

// ══════════ FLOATING PARTICLES ══════════
var particlesContainer = document.getElementById("particles");

function createParticle() {
  if (!particlesContainer) return;
  var p = document.createElement("div");
  p.className = "particle";
  p.style.left = Math.random() * 100 + "%";
  var size = Math.random() * 3.5 + 1.5;
  p.style.width = size + "px";
  p.style.height = size + "px";
  p.style.animationDuration = (Math.random() * 10 + 8) + "s";
  p.style.animationDelay = (Math.random() * 5) + "s";
  p.style.opacity = Math.random() * 0.4 + 0.15;
  particlesContainer.appendChild(p);
  setTimeout(function () { if (p.parentNode) p.remove(); }, 20000);
}

setInterval(createParticle, 600);
for (var pi = 0; pi < 25; pi++) {
  (function (d) { setTimeout(createParticle, d); })(pi * 150);
}

// ══════════ CONFETTI ══════════
function launchConfetti() {
  var container = document.getElementById("confetti-container");
  if (!container) return;
  var colors = [
    "#ff6b9d", "#c44dff", "#6e8efb", "#ffd700",
    "#ff8a5c", "#a8ff78", "#ff4757", "#70a1ff",
    "#ff6348", "#eccc68", "#a29bfe", "#fd79a8",
  ];

  function spawn(delay) {
    setTimeout(function () {
      var p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = (Math.random() * 10 + 5) + "px";
      p.style.height = (Math.random() * 10 + 5) + "px";
      p.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      p.style.animationDuration = (Math.random() * 3 + 2) + "s";
      p.style.animationDelay = (Math.random() * 0.5) + "s";
      container.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.remove(); }, 6000);
    }, delay);
  }

  for (var c = 0; c < 120; c++) spawn(c * 30);
  setTimeout(function () { for (var c2 = 0; c2 < 60; c2++) spawn(c2 * 50); }, 2000);
}


// ══════════════════════════════════════════
// MUSIC — Happy Birthday Ambient Melody
// ══════════════════════════════════════════

var audioCtx = null;
var musicPlaying = false;
var musicNodes = [];
var musicInterval = null;
var audioToggle = document.getElementById("audioToggle");

function startMusic() {
  if (musicPlaying) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return; }
  musicPlaying = true;
  if (audioToggle) {
    audioToggle.textContent = "\uD83D\uDD0A";
    audioToggle.classList.add("playing");
  }
  playMelodyLoop();
}

function stopMusic() {
  musicPlaying = false;
  if (audioToggle) {
    audioToggle.textContent = "\uD83D\uDD07";
    audioToggle.classList.remove("playing");
  }
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  musicNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
  musicNodes = [];
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

function playMelodyLoop() {
  if (!musicPlaying || !audioCtx) return;

  var melody = [
    [262, 0.3, 0.0],  [262, 0.3, 0.35], [294, 0.5, 0.7],
    [262, 0.5, 1.25], [349, 0.5, 1.8],  [330, 0.8, 2.35],
    [262, 0.3, 3.5],  [262, 0.3, 3.85], [294, 0.5, 4.2],
    [262, 0.5, 4.75], [392, 0.5, 5.3],  [349, 0.8, 5.85],
    [262, 0.3, 7.0],  [262, 0.3, 7.35], [523, 0.5, 7.7],
    [440, 0.5, 8.25], [349, 0.5, 8.8],  [330, 0.5, 9.35],
    [294, 0.8, 9.9],
    [466, 0.3, 11.0], [466, 0.3, 11.35],[440, 0.5, 11.7],
    [349, 0.5, 12.25],[392, 0.5, 12.8], [349, 0.8, 13.35],
  ];

  var loopDuration = 15;

  function playOnce() {
    if (!musicPlaying || !audioCtx) return;
    var now = audioCtx.currentTime;

    // Ambient pad
    [262, 330, 392].forEach(function (freq) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * 0.5;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 1);
      gain.gain.setValueAtTime(0.03, now + loopDuration - 2);
      gain.gain.linearRampToValueAtTime(0, now + loopDuration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + loopDuration);
      musicNodes.push(osc);
    });

    // Melody notes
    melody.forEach(function (n) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = n[0];
      gain.gain.setValueAtTime(0, now + n[2]);
      gain.gain.linearRampToValueAtTime(0.08, now + n[2] + 0.05);
      gain.gain.setValueAtTime(0.08, now + n[2] + n[1] * 0.7);
      gain.gain.linearRampToValueAtTime(0, now + n[2] + n[1]);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + n[2]); osc.stop(now + n[2] + n[1] + 0.1);
      musicNodes.push(osc);
    });
  }

  playOnce();
  musicInterval = setInterval(function () {
    if (!musicPlaying) return;
    musicNodes = [];
    playOnce();
  }, loopDuration * 1000);
}

if (audioToggle) {
  audioToggle.addEventListener("click", function () {
    if (!musicPlaying) startMusic(); else stopMusic();
  });
}


// ══════════ INIT ══════════
if (threeReady) setPhaseScene("intro");