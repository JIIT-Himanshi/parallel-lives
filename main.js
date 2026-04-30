import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";

const canvas = document.querySelector("#scene");
const entryLayer = document.querySelector("#entry");
const hubLayer = document.querySelector("#hub");
const lifeLayer = document.querySelector("#life");
const compareLayer = document.querySelector("#compare");
const portalLabel = document.querySelector("#portalLabel");
const lifeScene = document.querySelector("#lifeScene");
const lifeTitle = document.querySelector("#lifeTitle");
const lifeSub = document.querySelector("#lifeSub");
const compareBtn = document.querySelector("#compareBtn");
const backToHub = document.querySelector("#backToHub");
const exitCompare = document.querySelector("#exitCompare");
const globalHint = document.querySelector("#globalHint");
const soundToggle = document.querySelector("#soundToggle");

const statEls = {
  happiness: document.querySelector("#statH"),
  money: document.querySelector("#statM"),
  freedom: document.querySelector("#statF"),
  stress: document.querySelector("#statS"),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 14);

const ambient = new THREE.AmbientLight(0x88aaff, 0.8);
scene.add(ambient);

const pointLight = new THREE.PointLight(0x55d5ff, 1.6, 60);
pointLight.position.set(0, 6, 10);
scene.add(pointLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let state = "entry";
let hoveredPortal = null;
let activeLife = null;
let ambientAudio = null;
let audioEnabled = true;

const lives = [
  {
    id: "artist",
    label: "Artist",
    tone: "Freedom + chaos",
    color: "#b45cff",
    base: { happiness: 70, money: 35, freedom: 88, stress: 40 },
  },
  {
    id: "corporate",
    label: "Corporate",
    tone: "Pressure + stability",
    color: "#55d5ff",
    base: { happiness: 45, money: 80, freedom: 32, stress: 75 },
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    tone: "Risk + momentum",
    color: "#ff8b3d",
    base: { happiness: 60, money: 60, freedom: 58, stress: 62 },
  },
  {
    id: "traveler",
    label: "Traveler",
    tone: "Wonder + motion",
    color: "#36f3a2",
    base: { happiness: 78, money: 40, freedom: 82, stress: 35 },
  },
  {
    id: "scientist",
    label: "Scientist",
    tone: "Focus + discovery",
    color: "#7ef0ff",
    base: { happiness: 55, money: 65, freedom: 45, stress: 50 },
  },
];

const simulation = {
  values: { happiness: 60, money: 60, freedom: 60, stress: 50 },
  target: { happiness: 60, money: 60, freedom: 60, stress: 50 },
  drift: { happiness: 0, money: 0, freedom: 0, stress: 0 },
  setBase(base) {
    this.values = { ...base };
    this.target = { ...base };
  },
  nudge(delta) {
    Object.keys(delta).forEach((key) => {
      this.target[key] = clamp(this.target[key] + delta[key], 5, 95);
    });
  },
  step() {
    Object.keys(this.values).forEach((key) => {
      this.values[key] += (this.target[key] - this.values[key]) * 0.04;
      this.values[key] = clamp(this.values[key] + this.drift[key], 0, 100);
    });
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createParticles() {
  const geometry = new THREE.BufferGeometry();
  const count = 1500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

    const color = new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.8, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Points(geometry, material);
}

function createPortals() {
  const group = new THREE.Group();
  const portalsData = [];

  const ringGeometry = new THREE.TorusGeometry(1.6, 0.25, 24, 120);
  const coreGeometry = new THREE.SphereGeometry(0.9, 32, 32);

  const positions = [
    new THREE.Vector3(-5, 2.6, 0),
    new THREE.Vector3(0, 3.4, -1.4),
    new THREE.Vector3(5.2, 2.2, 0.8),
    new THREE.Vector3(-3.6, -2.6, 1.2),
    new THREE.Vector3(3.8, -3.0, -0.6),
  ];

  lives.forEach((life, index) => {
    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(life.color),
      emissive: new THREE.Color(life.color),
      emissiveIntensity: 1.8,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    const ring = new THREE.Mesh(ringGeometry, glowMat);
    const core = new THREE.Mesh(coreGeometry, glowMat.clone());
    core.material.emissiveIntensity = 2.4;
    core.scale.set(0.9, 0.9, 0.9);

    const portalGroup = new THREE.Group();
    portalGroup.add(ring);
    portalGroup.add(core);
    portalGroup.position.copy(positions[index]);
    portalGroup.userData = { life };

    portalsData.push(portalGroup);
    group.add(portalGroup);
  });

  return { group, items: portalsData };
}

const particles = createParticles();
scene.add(particles);

const portals = createPortals();
portals.group.visible = false;
scene.add(portals.group);

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
  requestAnimationFrame(animate);
  particles.rotation.y += 0.0008;
  particles.rotation.x += 0.0004;

  portals.group.rotation.y += 0.001;
  portals.group.children.forEach((portal, index) => {
    portal.rotation.y += 0.003;
    portal.rotation.x += 0.001 + index * 0.0002;
  });

  if (state === "hub") {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(portals.items, true);
    if (intersects.length) {
      const parent = intersects[0].object.parent;
      if (hoveredPortal !== parent) {
        hoveredPortal = parent;
        const { life } = parent.userData;
        portalLabel.textContent = life.label;
        portalLabel.style.opacity = 1;
      }
      hoveredPortal.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.08);
    } else {
      portalLabel.style.opacity = 0;
      hoveredPortal = null;
      portals.items.forEach((portal) => {
        portal.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
      });
    }
  }

  if (state === "life" && activeLife) {
    simulation.step();
    updateStatBars(simulation.values);
  }

  renderer.render(scene, camera);
}

function updateStatBars(values) {
  statEls.happiness.style.width = `${values.happiness}%`;
  statEls.money.style.width = `${values.money}%`;
  statEls.freedom.style.width = `${values.freedom}%`;
  statEls.stress.style.width = `${values.stress}%`;
}

function setState(next) {
  [entryLayer, hubLayer, lifeLayer, compareLayer].forEach((layer) => layer.classList.remove("active"));
  if (next === "entry") entryLayer.classList.add("active");
  if (next === "hub") hubLayer.classList.add("active");
  if (next === "life") lifeLayer.classList.add("active");
  if (next === "compare") compareLayer.classList.add("active");

  state = next;
  compareBtn.disabled = next !== "life";
  globalHint.textContent =
    next === "hub"
      ? "Hover portals. Click to enter."
      : next === "life"
        ? "Interact to shape the timeline."
        : next === "compare"
          ? "Compare in real time."
          : "";
}

function enterHub() {
  portals.group.visible = true;
  gsap.to(camera.position, { z: 12, duration: 2, ease: "power3.inOut" });
  gsap.to(entryLayer, { opacity: 0, duration: 1, onComplete: () => setState("hub") });
}

function enterLife(life) {
  activeLife = life;
  simulation.setBase(life.base);
  updateStatBars(life.base);
  lifeTitle.textContent = life.label;
  lifeSub.textContent = life.tone;
  lifeScene.dataset.life = life.id;
  setupLifeScene(life.id);

  gsap.to(camera.position, { z: 8, duration: 1.6, ease: "power3.inOut" });
  setState("life");
}

function returnToHub() {
  gsap.to(camera.position, { z: 12, duration: 1.2, ease: "power3.inOut" });
  setState("hub");
}

function openCompare() {
  if (!activeLife) return;
  buildCompare();
  setState("compare");
}

function exitCompareMode() {
  setState(activeLife ? "life" : "hub");
}

function setupLifeScene(id) {
  lifeScene.innerHTML = "";
  lifeScene.onmousemove = null;
  lifeScene.onclick = null;
  lifeScene.onwheel = null;
  if (id === "artist") {
    const canvas = document.createElement("canvas");
    canvas.className = "life-canvas";
    canvas.width = lifeScene.clientWidth;
    canvas.height = lifeScene.clientHeight;
    lifeScene.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#090c14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    lifeScene.onmousemove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ctx.fillStyle = "rgba(180,92,255,0.3)";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      simulation.nudge({ happiness: 0.4, freedom: 0.5, money: -0.1, stress: -0.2 });
    };
  }

  if (id === "corporate") {
    const inbox = document.createElement("div");
    inbox.className = "life-inbox";
    lifeScene.appendChild(inbox);
    const popper = setInterval(() => {
      if (state !== "life" || activeLife?.id !== "corporate") {
        clearInterval(popper);
        return;
      }
      const note = document.createElement("div");
      note.className = "mail";
      note.textContent = "Urgent: Request update";
      inbox.appendChild(note);
      if (inbox.children.length > 6) inbox.removeChild(inbox.firstChild);
      simulation.nudge({ stress: 0.6, money: 0.2, freedom: -0.3, happiness: -0.1 });
    }, 900);

    lifeScene.onclick = () => {
      simulation.nudge({ stress: -1, freedom: 0.4, happiness: 0.2, money: -0.2 });
    };
  }

  if (id === "entrepreneur") {
    const chart = document.createElement("div");
    chart.className = "life-chart";
    chart.innerHTML = "<div class=\"line\"></div>";
    lifeScene.appendChild(chart);

    lifeScene.onclick = () => {
      const delta = Math.random() > 0.5 ? 1 : -1;
      simulation.nudge({ money: delta * 1.2, stress: 0.6, happiness: delta * 0.4, freedom: 0.2 });
      chart.querySelector(".line").style.width = `${clamp(simulation.values.money + 10, 20, 90)}%`;
    };
  }

  if (id === "traveler") {
    const layer = document.createElement("div");
    layer.className = "life-travel";
    layer.innerHTML = "<div class=\"sky\"></div><div class=\"mountains\"></div><div class=\"ocean\"></div>";
    lifeScene.appendChild(layer);

    lifeScene.onwheel = (event) => {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      layer.style.transform = `translateX(${clamp((parseFloat(layer.dataset.offset || "0") || 0) - delta * 30, -400, 100)}px)`;
      layer.dataset.offset = layer.style.transform.replace("translateX(", "").replace("px)", "");
      simulation.nudge({ happiness: 0.6, freedom: 0.6, money: -0.3, stress: -0.4 });
    };
  }

  if (id === "scientist") {
    const board = document.createElement("div");
    board.className = "life-lab";
    board.innerHTML = "<div class=\"node\">A</div><div class=\"node\">B</div><div class=\"node\">C</div>";
    lifeScene.appendChild(board);
    const nodes = Array.from(board.querySelectorAll(".node"));

    nodes.forEach((node) => {
      node.onclick = () => {
        node.classList.toggle("active");
        const activeCount = nodes.filter((n) => n.classList.contains("active")).length;
        if (activeCount >= 2) {
          simulation.nudge({ happiness: 0.3, money: 0.4, stress: 0.2, freedom: -0.1 });
        }
      };
    });
  }
}

function buildCompare() {
  const grid = document.querySelector("#compareGrid");
  grid.innerHTML = "";
  lives.slice(0, 3).forEach((life) => {
    const card = document.createElement("div");
    card.className = "compare-card";
    card.innerHTML = `
      <h3>${life.label}</h3>
      <div class="compare-bars">
        <div>
          <label>Happiness</label>
          <div class="bar"><div class="fill" style="width:${life.base.happiness}%"></div></div>
        </div>
        <div>
          <label>Money</label>
          <div class="bar"><div class="fill" style="width:${life.base.money}%"></div></div>
        </div>
        <div>
          <label>Freedom</label>
          <div class="bar"><div class="fill" style="width:${life.base.freedom}%"></div></div>
        </div>
        <div>
          <label>Stress</label>
          <div class="bar"><div class="fill" style="width:${life.base.stress}%"></div></div>
        </div>
      </div>
    `;
    card.style.borderColor = life.color + "55";
    grid.appendChild(card);
  });
}

function playNote(ctx, destination, frequency, startTime, duration, type = "triangle", volume = 0.06) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function initAudio() {
  if (ambientAudio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const padOsc = ctx.createOscillator();
  const padLfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  filter.type = "lowpass";
  filter.frequency.value = 1200;
  gain.gain.value = 0.05;

  padOsc.type = "sawtooth";
  padOsc.frequency.value = 130.81;

  padLfo.type = "sine";
  padLfo.frequency.value = 0.2;
  lfoGain.gain.value = 7;

  padLfo.connect(lfoGain);
  lfoGain.connect(padOsc.frequency);

  padOsc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  padOsc.start();
  padLfo.start();

  const scale = [0, 3, 7, 10, 12, 10, 7, 3];
  let index = 0;
  const beatMs = 420;
  const base = 220;

  const timerId = window.setInterval(() => {
    if (!audioEnabled) return;
    const now = ctx.currentTime;
    const semitone = scale[index % scale.length];
    const freq = base * Math.pow(2, semitone / 12);

    playNote(ctx, gain, freq, now, 0.34, "triangle", 0.055);
    playNote(ctx, gain, freq * 2, now + 0.04, 0.2, "sine", 0.02);
    index += 1;
  }, beatMs);

  ambientAudio = { ctx, gain, padOsc, padLfo, timerId };
}

function toggleSound() {
  if (!ambientAudio) {
    initAudio();
  }

  audioEnabled = !audioEnabled;

  if (audioEnabled) {
    if (ambientAudio.ctx.state === "suspended") {
      ambientAudio.ctx.resume();
    }
    ambientAudio.gain.gain.setTargetAtTime(0.05, ambientAudio.ctx.currentTime, 0.12);
  } else {
    ambientAudio.gain.gain.setTargetAtTime(0.0001, ambientAudio.ctx.currentTime, 0.08);
  }

  soundToggle.textContent = `Sound: ${audioEnabled ? "On" : "Off"}`;
}

function handleClick(event) {
  if (state === "entry") {
    initAudio();
    enterHub();
    return;
  }

  if (state === "hub") {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(portals.items, true);
    if (intersects.length) {
      const parent = intersects[0].object.parent;
      enterLife(parent.userData.life);
    }
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const lifeCanvas = lifeScene.querySelector(".life-canvas");
  if (lifeCanvas) {
    lifeCanvas.width = lifeScene.clientWidth;
    lifeCanvas.height = lifeScene.clientHeight;
  }
});

window.addEventListener("mousemove", updatePointer);
window.addEventListener("click", handleClick);

compareBtn.addEventListener("click", () => {
  initAudio();
  openCompare();
});
backToHub.addEventListener("click", returnToHub);
exitCompare.addEventListener("click", exitCompareMode);
soundToggle.addEventListener("click", toggleSound);

setState("entry");
entryLayer.style.opacity = 1;

animate();
