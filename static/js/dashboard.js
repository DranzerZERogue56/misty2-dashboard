// ── State ────────────────────────────────────────────────────────────────────
const state = {
  connected: false,
  cameraOn: false,
  cameraInterval: null,
  batteryInterval: null,
  headPitch: 0,
  headRoll: 0,
  headYaw: 0,
  leftArm: 90,
  rightArm: 90,
  keysDown: new Set(),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(path, opts);
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function log(msg, type = "info") {
  const el = document.getElementById("log");
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span class="log-time">${now}</span><span class="log-${type}">${msg}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function setConnected(yes) {
  state.connected = yes;
  document.getElementById("status-dot").className = "status-dot " + (yes ? "online" : "offline");
  document.getElementById("btn-connect").textContent = yes ? "Disconnect" : "Connect";
  document.getElementById("btn-connect").style.background = yes ? "var(--red)" : "";
  document.getElementById("controls").classList.toggle("controls-disabled", !yes);
  document.getElementById("status-robot").textContent = yes ? "Connected" : "Disconnected";
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ── Connect / Disconnect ─────────────────────────────────────────────────────
document.getElementById("btn-connect").addEventListener("click", async () => {
  if (state.connected) {
    await api("/api/disconnect", "POST");
    setConnected(false);
    stopCamera();
    stopBatteryPoll();
    document.getElementById("status-battery").textContent = "";
    log("Disconnected.", "warn");
    return;
  }
  const ip = document.getElementById("ip-input").value.trim();
  if (!ip) { log("Enter robot IP address.", "err"); return; }
  log(`Connecting to ${ip}…`);
  const r = await api("/api/connect", "POST", { ip });
  if (r.success) {
    setConnected(true);
    log(`Connected! Robot: ${r.data?.name || ip}`, "ok");
    startBatteryPoll();
    document.getElementById("ip-input").value = ip;
  } else {
    log(`Connection failed: ${r.error}`, "err");
  }
});

// Also connect on Enter key in IP field
document.getElementById("ip-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-connect").click();
});

// ── Battery polling ──────────────────────────────────────────────────────────
function startBatteryPoll() {
  fetchBattery();
  state.batteryInterval = setInterval(fetchBattery, 15000);
}
function stopBatteryPoll() {
  clearInterval(state.batteryInterval);
}
async function fetchBattery() {
  const r = await api("/api/battery");
  if (!r.success) return;
  const pct = Math.round((r.data?.chargePercent ?? 0) * 100);
  const charging = r.data?.isCharging ? " ⚡" : "";
  document.getElementById("status-battery").textContent = `Battery: ${pct}%${charging}`;
}

// ── Drive ────────────────────────────────────────────────────────────────────
const DRIVE_SPEED = 40;
const DRIVE_TURN  = 50;

async function drive(linear, angular) {
  if (!state.connected) return;
  await api("/api/drive", "POST", { linear, angular });
}

async function stopDrive() {
  if (!state.connected) return;
  await api("/api/stop", "POST");
}

// D-pad buttons
document.getElementById("btn-fwd").addEventListener("mousedown",  () => { drive(DRIVE_SPEED, 0); log("Drive forward", "info"); });
document.getElementById("btn-back").addEventListener("mousedown", () => { drive(-DRIVE_SPEED, 0); log("Drive backward", "info"); });
document.getElementById("btn-left").addEventListener("mousedown", () => { drive(0, DRIVE_TURN); log("Turn left", "info"); });
document.getElementById("btn-right").addEventListener("mousedown",() => { drive(0, -DRIVE_TURN); log("Turn right", "info"); });
["btn-fwd","btn-back","btn-left","btn-right"].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener("mouseup",    stopDrive);
  el.addEventListener("mouseleave", stopDrive);
  el.addEventListener("touchstart", e => { e.preventDefault(); el.dispatchEvent(new Event("mousedown")); }, { passive: false });
  el.addEventListener("touchend",   () => stopDrive());
});

// ── Keyboard controls ────────────────────────────────────────────────────────
const KEY_MAP = {
  "w": "btn-fwd", "ArrowUp":    "btn-fwd",
  "s": "btn-back","ArrowDown":  "btn-back",
  "a": "btn-left","ArrowLeft":  "btn-left",
  "d": "btn-right","ArrowRight": "btn-right",
};

document.addEventListener("keydown", e => {
  if (document.activeElement.tagName === "INPUT") return;
  const id = KEY_MAP[e.key];
  if (id && !state.keysDown.has(e.key)) {
    state.keysDown.add(e.key);
    document.getElementById(id)?.classList.add("pressed");
    document.getElementById(id)?.dispatchEvent(new Event("mousedown"));
  }
  if (e.key === " ") {
    e.preventDefault();
    stopDrive();
    log("STOP", "warn");
  }
});

document.addEventListener("keyup", e => {
  const id = KEY_MAP[e.key];
  if (id) {
    state.keysDown.delete(e.key);
    document.getElementById(id)?.classList.remove("pressed");
    stopDrive();
  }
});

// Emergency stop button
document.getElementById("btn-stop").addEventListener("click", async () => {
  await stopDrive();
  log("Emergency stop.", "warn");
});

// ── Head sliders ─────────────────────────────────────────────────────────────
let headDebounce = null;

function setupHeadSlider(id, valId, stateKey) {
  const slider = document.getElementById(id);
  const valEl  = document.getElementById(valId);
  slider.addEventListener("input", () => {
    state[stateKey] = parseInt(slider.value);
    valEl.textContent = slider.value + "°";
    clearTimeout(headDebounce);
    headDebounce = setTimeout(sendHead, 120);
  });
}

setupHeadSlider("head-pitch", "head-pitch-val", "headPitch");
setupHeadSlider("head-roll",  "head-roll-val",  "headRoll");
setupHeadSlider("head-yaw",   "head-yaw-val",   "headYaw");

async function sendHead() {
  if (!state.connected) return;
  await api("/api/head", "POST", {
    pitch: state.headPitch,
    roll:  state.headRoll,
    yaw:   state.headYaw,
    velocity: 50,
  });
}

document.getElementById("btn-head-center").addEventListener("click", () => {
  ["head-pitch","head-roll","head-yaw"].forEach(id => {
    document.getElementById(id).value = 0;
  });
  ["head-pitch-val","head-roll-val","head-yaw-val"].forEach(id => {
    document.getElementById(id).textContent = "0°";
  });
  state.headPitch = state.headRoll = state.headYaw = 0;
  sendHead();
  log("Head centered.", "ok");
});

// ── Arm sliders ───────────────────────────────────────────────────────────────
let armDebounce = null;

function setupArmSlider(id, valId, stateKey) {
  const slider = document.getElementById(id);
  const valEl  = document.getElementById(valId);
  slider.addEventListener("input", () => {
    state[stateKey] = parseInt(slider.value);
    valEl.textContent = slider.value + "°";
    clearTimeout(armDebounce);
    armDebounce = setTimeout(sendArms, 120);
  });
}

setupArmSlider("arm-left",  "arm-left-val",  "leftArm");
setupArmSlider("arm-right", "arm-right-val", "rightArm");

async function sendArms() {
  if (!state.connected) return;
  await api("/api/arms", "POST", { left: state.leftArm, right: state.rightArm });
}

// ── Expressions ───────────────────────────────────────────────────────────────
document.querySelectorAll(".expr-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const file = btn.dataset.file;
    const name = btn.dataset.name;
    const r = await api("/api/expression", "POST", { file, timeout: 10 });
    log(r.success ? `Expression: ${name}` : `Expression failed: ${r.error}`, r.success ? "ok" : "err");
  });
});

// ── LED ────────────────────────────────────────────────────────────────────────
document.querySelectorAll(".led-dot").forEach(dot => {
  dot.addEventListener("click", async () => {
    document.querySelectorAll(".led-dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    const r = parseInt(dot.dataset.r), g = parseInt(dot.dataset.g), b = parseInt(dot.dataset.b);
    const res = await api("/api/led", "POST", { r, g, b });
    log(res.success ? `LED set to rgb(${r},${g},${b})` : `LED failed: ${res.error}`, res.success ? "ok" : "err");
  });
});

document.getElementById("btn-led-custom").addEventListener("click", async () => {
  const hex = document.getElementById("led-color").value;
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  document.querySelectorAll(".led-dot").forEach(d => d.classList.remove("active"));
  const res = await api("/api/led", "POST", { r, g, b });
  log(res.success ? `LED custom: rgb(${r},${g},${b})` : `LED failed: ${res.error}`, res.success ? "ok" : "err");
});

document.getElementById("btn-led-off").addEventListener("click", async () => {
  document.querySelectorAll(".led-dot").forEach(d => d.classList.remove("active"));
  const res = await api("/api/led", "POST", { r: 0, g: 0, b: 0 });
  log(res.success ? "LED off" : `LED failed: ${res.error}`, res.success ? "ok" : "err");
});

// ── Speech ─────────────────────────────────────────────────────────────────────
document.getElementById("btn-speak").addEventListener("click", sendSpeak);
document.getElementById("speak-input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendSpeak();
});

async function sendSpeak() {
  const text = document.getElementById("speak-input").value.trim();
  if (!text) return;
  const r = await api("/api/speak", "POST", { text });
  log(r.success ? `Spoke: "${text}"` : `Speak failed: ${r.error}`, r.success ? "ok" : "err");
  if (r.success) document.getElementById("speak-input").value = "";
}

// ── Camera ─────────────────────────────────────────────────────────────────────
document.getElementById("btn-camera").addEventListener("click", () => {
  if (state.cameraOn) { stopCamera(); } else { startCamera(); }
});

function startCamera() {
  if (!state.connected) { log("Connect first.", "err"); return; }
  state.cameraOn = true;
  document.getElementById("camera-placeholder").style.display = "none";
  document.getElementById("camera-img").style.display = "block";
  document.getElementById("btn-camera").textContent = "Stop Camera";
  document.getElementById("btn-camera").classList.add("btn-danger");
  document.getElementById("btn-camera").classList.remove("btn-ghost");
  log("Camera started.", "ok");
  fetchFrame();
  state.cameraInterval = setInterval(fetchFrame, 200);
}

function stopCamera() {
  state.cameraOn = false;
  clearInterval(state.cameraInterval);
  document.getElementById("camera-img").style.display = "none";
  document.getElementById("camera-placeholder").style.display = "flex";
  document.getElementById("btn-camera").textContent = "Start Camera";
  document.getElementById("btn-camera").classList.remove("btn-danger");
  document.getElementById("btn-camera").classList.add("btn-ghost");
  if (state.connected) log("Camera stopped.", "info");
}

async function fetchFrame() {
  if (!state.cameraOn || !state.connected) return;
  const img = document.getElementById("camera-img");
  const ts = Date.now();
  img.src = `/api/camera/frame?t=${ts}`;
}

// ── Init ───────────────────────────────────────────────────────────────────────
setConnected(false);
log("Dashboard ready. Enter robot IP to connect.", "info");
log("Keyboard: WASD or Arrow keys to drive, Space = stop.", "info");
