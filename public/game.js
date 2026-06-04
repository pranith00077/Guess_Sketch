const socket = io();

const playerName = localStorage.getItem("playerName");
const roomCode   = localStorage.getItem("roomCode");

if (!playerName || !roomCode) {
  window.location.href = "index.html";
}

// UI elements
const roomInfo     = document.getElementById("roomInfo");
const turnText     = document.getElementById("turnText");
const wordText     = document.getElementById("wordText");
const playersList  = document.getElementById("playersList");
const timerDisplay = document.getElementById("timerDisplay");

const chatMessages = document.getElementById("chatMessages");
const chatInput    = document.getElementById("chatInput");
const sendBtn      = document.getElementById("sendBtn");
const leaveBtn     = document.getElementById("leaveBtn");
const muteBtn      = document.getElementById("muteBtn");

const canvas = document.getElementById("drawingCanvas");
const ctx    = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const brushSize   = document.getElementById("brushSize");
const clearBtn    = document.getElementById("clearBtn");

roomInfo.textContent = `Room: ${roomCode}`;

let isDrawing        = false;
let isDrawer         = false;
let currentColor     = "#000000";
let currentBrushSize = 4;

// Join room
socket.emit("join-room", { name: playerName, roomCode });

// Canvas defaults
ctx.lineCap  = "round";
ctx.lineJoin = "round";

function resizeCanvas() {
  const rect      = canvas.getBoundingClientRect();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = rect.width;
  canvas.height = rect.height;
  ctx.putImageData(imageData, 0, 0);
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";
}

setTimeout(resizeCanvas, 100);
window.addEventListener("resize", resizeCanvas);

function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const src  = event.touches && event.touches.length > 0 ? event.touches[0] : event;
  return {
    x: src.clientX - rect.left,
    y: src.clientY - rect.top,
  };
}

function drawLine(data) {
  ctx.strokeStyle = data.color;
  ctx.lineWidth   = data.size;
  ctx.beginPath();
  ctx.moveTo(data.prevX, data.prevY);
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
}

let lastX = 0;
let lastY = 0;

function startDrawing(event) {
  if (!isDrawer) return;
  isDrawing = true;
  const pos = getCanvasPosition(event);
  lastX = pos.x;
  lastY = pos.y;
}

function drawing(event) {
  if (!isDrawing || !isDrawer) return;
  event.preventDefault();

  const pos = getCanvasPosition(event);
  const drawData = {
    prevX: lastX, prevY: lastY,
    x: pos.x, y: pos.y,
    color: currentColor,
    size:  currentBrushSize,
  };

  drawLine(drawData);
  socket.emit("draw", drawData);

  lastX = pos.x;
  lastY = pos.y;
}

function stopDrawing() { isDrawing = false; }

// Mouse
canvas.addEventListener("mousedown",  startDrawing);
canvas.addEventListener("mousemove",  drawing);
canvas.addEventListener("mouseup",    stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

// Touch
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove",  drawing,      { passive: false });
canvas.addEventListener("touchend",   stopDrawing);

// Tools
colorPicker.addEventListener("input", () => { currentColor     = colorPicker.value; });
brushSize.addEventListener("input",   () => { currentBrushSize = brushSize.value;   });

clearBtn.addEventListener("click", () => {
  if (!isDrawer) {
    addSystemMessage("Only the drawer can clear the canvas.");
    return;
  }
  clearCanvas();
  socket.emit("clear-canvas-request");
});

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Chat
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  socket.emit("send-message", message);
  chatInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

function addChatMessage(name, message) {
  const div     = document.createElement("div");
  div.className = "chat-message";
  div.innerHTML = `<strong>${name}:</strong> ${message}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(message) {
  const div     = document.createElement("div");
  div.className = "system-message";
  div.textContent = message;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Timer display
function updateTimerDisplay(timeLeft) {
  if (!timerDisplay) return;
  timerDisplay.textContent = `⏱ ${timeLeft}s`;
  timerDisplay.classList.remove("timer-warning", "timer-danger");
  if (timeLeft <= 10) {
    timerDisplay.classList.add("timer-danger");
  } else if (timeLeft <= 20) {
    timerDisplay.classList.add("timer-warning");
  }
}

// Leave button
leaveBtn.addEventListener("click", () => {
  socket.emit("leave-room");
  localStorage.removeItem("playerName");
  localStorage.removeItem("roomCode");
  stopBgMusic();
  socket.disconnect();
  window.location.href = "index.html";
});

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
let audioCtx       = null;
let isMuted        = false;
let bgMusicStarted = false;
let bgLoopTimeout  = null;
let bgGain         = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ── Helper: play a single tone ──
function playTone(freq, type, startTime, duration, peakVolume) {
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// ── Correct guess: bright ascending chime C5→E5→G5→C6 ──
function playCorrectSound() {
  if (isMuted) return;
  const ctx   = getAudioCtx();
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    playTone(freq, "sine", ctx.currentTime + i * 0.13, 0.55, 0.4);
  });
}

// ── Time's up: urgent descending alarm ──
function playTimeUpSound() {
  if (isMuted) return;
  const ctx = getAudioCtx();
  // Three rapid double-beeps followed by a long falling tone
  [880, 880, 698, 698, 554].forEach((freq, i) => {
    playTone(freq, "square", ctx.currentTime + i * 0.15, 0.12, 0.25);
  });
  // Final long descending sweep
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  const t = ctx.currentTime + 0.85;
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.linearRampToValueAtTime(220, t + 0.8);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
  osc.start(t);
  osc.stop(t + 0.9);
}

// ── Background music: looping chiptune melody + bassline ──
// Melody: upbeat 16-note loop in C major
const BG_MELODY = [
  { f: 523.25, d: 0.18 }, // C5
  { f: 587.33, d: 0.18 }, // D5
  { f: 659.25, d: 0.18 }, // E5
  { f: 523.25, d: 0.18 }, // C5
  { f: 659.25, d: 0.18 }, // E5
  { f: 783.99, d: 0.36 }, // G5 (held)
  { f: 0,      d: 0.18 }, // rest
  { f: 783.99, d: 0.18 }, // G5
  { f: 880.00, d: 0.18 }, // A5
  { f: 783.99, d: 0.18 }, // G5
  { f: 659.25, d: 0.18 }, // E5
  { f: 523.25, d: 0.36 }, // C5 (held)
  { f: 0,      d: 0.18 }, // rest
  { f: 392.00, d: 0.18 }, // G4
  { f: 440.00, d: 0.18 }, // A4
  { f: 523.25, d: 0.36 }, // C5 (held)
];

// Bass: simple root-fifth pattern
const BG_BASS = [
  { f: 130.81, d: 0.36 }, // C2
  { f: 196.00, d: 0.36 }, // G2
  { f: 130.81, d: 0.36 }, // C2
  { f: 174.61, d: 0.36 }, // F2
  { f: 130.81, d: 0.36 }, // C2
  { f: 196.00, d: 0.36 }, // G2
  { f: 164.81, d: 0.36 }, // E2
  { f: 130.81, d: 0.36 }, // C2
];

function scheduleBgLoop() {
  if (isMuted || !bgMusicStarted) return;
  const ctx = getAudioCtx();

  // Create a shared gain for background (lower volume)
  if (!bgGain) {
    bgGain = ctx.createGain();
    bgGain.gain.value = 0.12;
    bgGain.connect(ctx.destination);
  }

  let melodyTime = ctx.currentTime;
  BG_MELODY.forEach(({ f, d }) => {
    if (f > 0) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(bgGain);
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, melodyTime);
      gain.gain.linearRampToValueAtTime(1, melodyTime + 0.02);
      gain.gain.setValueAtTime(1, melodyTime + d * 0.7);
      gain.gain.linearRampToValueAtTime(0, melodyTime + d * 0.95);
      osc.start(melodyTime);
      osc.stop(melodyTime + d);
    }
    melodyTime += d;
  });

  let bassTime = ctx.currentTime;
  BG_BASS.forEach(({ f, d }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(bgGain);
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, bassTime);
    gain.gain.linearRampToValueAtTime(0.6, bassTime + 0.03);
    gain.gain.setValueAtTime(0.6, bassTime + d * 0.6);
    gain.gain.linearRampToValueAtTime(0, bassTime + d * 0.9);
    osc.start(bassTime);
    osc.stop(bassTime + d);
    bassTime += d;
  });

  // Loop — total melody duration
  const loopDuration = BG_MELODY.reduce((sum, n) => sum + n.d, 0) * 1000;
  bgLoopTimeout = setTimeout(scheduleBgLoop, loopDuration - 50);
}

function startBgMusic() {
  if (isMuted || !bgMusicStarted) return;
  scheduleBgLoop();
}

function stopBgMusic() {
  if (bgLoopTimeout) {
    clearTimeout(bgLoopTimeout);
    bgLoopTimeout = null;
  }
  // Fade out the gain node so it doesn't click
  if (bgGain && audioCtx) {
    bgGain.gain.setValueAtTime(bgGain.gain.value, audioCtx.currentTime);
    bgGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
    setTimeout(() => { bgGain = null; }, 300);
  }
}

// ── Mute / unmute ──
function toggleMute() {
  // First click: unlock AudioContext and start music
  if (!bgMusicStarted) {
    bgMusicStarted = true;
    isMuted = false;
    getAudioCtx(); // unlock
    startBgMusic();
    if (muteBtn) muteBtn.textContent = "🔊 Music";
    return;
  }

  isMuted = !isMuted;
  if (isMuted) {
    stopBgMusic();
    if (muteBtn) muteBtn.textContent = "🔇 Muted";
  } else {
    startBgMusic();
    if (muteBtn) muteBtn.textContent = "🔊 Music";
  }
}

if (muteBtn) {
  muteBtn.textContent = "▶ Play Music";
  muteBtn.addEventListener("click", toggleMute);
}

// ─── Socket events ─────────────────────────────────────────────────────────
socket.on("players-updated", (players) => {
  playersList.innerHTML = "";
  players.forEach((player, index) => {
    const li   = document.createElement("li");
    const rank = index + 1;
    const isMe = player.name === playerName;
    li.innerHTML = `
      <span class="player-rank">${rank}.</span>
      <span class="player-name-text${isMe ? ' player-me' : ''}">${player.name}</span>
      <span class="player-score">${player.score} pts</span>
    `;
    playersList.appendChild(li);
  });
});

socket.on("turn-started", ({ drawerId, drawerName, timeLeft }) => {
  isDrawer = socket.id === drawerId;
  turnText.textContent = `${drawerName} is drawing`;
  if (timeLeft !== undefined) updateTimerDisplay(timeLeft);
  if (isDrawer) {
    wordText.textContent = "Word: loading…";
    canvas.style.cursor  = "crosshair";
    addSystemMessage("✏️ Your turn to draw!");
  } else {
    wordText.textContent = "Word: Guess it!";
    canvas.style.cursor  = "not-allowed";
    addSystemMessage(`🎨 ${drawerName} is drawing — start guessing!`);
  }
});

socket.on("your-word", (word) => {
  wordText.textContent = `Word: ${word}`;
});

socket.on("timer-update", ({ timeLeft }) => {
  updateTimerDisplay(timeLeft);
});

socket.on("draw",         (data) => { drawLine(data); });
socket.on("clear-canvas", ()     => { clearCanvas();  });

socket.on("chat-message", ({ name, message }) => {
  addChatMessage(name, message);
  // Play time-up sound when server broadcasts the time-up system message
  if (name === "System" && message.startsWith("Time is up!")) {
    playTimeUpSound();
  }
});

socket.on("correct-guess", ({ message }) => {
  addSystemMessage(`🎉 ${message}`);
  playCorrectSound();
});