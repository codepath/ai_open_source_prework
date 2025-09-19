// ===== CONFIG =====
const NAME = "Tim";                       // 👈 put your display name
const MAP_IMG_SRC = "./world.jpg";        // keep next to index.html
const WS_URL = "wss://YOUR_SERVER_HERE";  // 👈 fill from README (e.g., wss://...)

// ===== CANVAS & DPI =====
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d", { alpha: false });
const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

function resizeCanvas() {
  canvas.width  = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width  = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}
resizeCanvas();
window.addEventListener("resize", () => { resizeCanvas(); draw(); });

// ===== MAP (Milestone 1) =====
const mapImg = new Image();
mapImg.src = MAP_IMG_SRC;
let mapReady = false;
mapImg.onload = () => { mapReady = true; draw(); };

// ===== GAME STATE =====
let ws;
let myId = null;
let myAvatarUrl = null;
let myPos = { x: 0, y: 0 };               // world coords from server
let players = new Map();                  // id -> {x,y,name,avatarUrl}
const avatarCache = new Map();            // url -> HTMLImageElement

// viewport (top-left of what we show) at native scale (no map scaling)
const viewport = { x: 0, y: 0 };

// HUD
const elStatus  = document.getElementById("status");
const elCoords  = document.getElementById("coords");
const elPlayers = document.getElementById("players");

// ===== IMAGE CACHE =====
function getAvatar(url) {
  if (!url) return null;
  if (avatarCache.has(url)) return avatarCache.get(url);
  const img = new Image();
  img.src = url;
  avatarCache.set(url, img);
  return img;
}

// ===== DRAW LOOP =====
function clampViewportToMap() {
  if (!mapReady) return;
  const viewW = canvas.width / DPR;
  const viewH = canvas.height / DPR;
  viewport.x = Math.max(0, Math.min(viewport.x, mapImg.width  - viewW));
  viewport.y = Math.max(0, Math.min(viewport.y, mapImg.height - viewH));
}

function centerViewportOn(pos) {
  const viewW = canvas.width / DPR;
  const viewH = canvas.height / DPR;
  viewport.x = Math.round(pos.x - viewW / 2);
  viewport.y = Math.round(pos.y - viewH / 2);
  clampViewportToMap();
}

function drawMap() {
  const viewW = Math.min(canvas.width / DPR, mapImg.width);
  const viewH = Math.min(canvas.height / DPR, mapImg.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    mapImg,
    viewport.x, viewport.y, viewW, viewH,     // src (map)
    0, 0, viewW * DPR, viewH * DPR            // dest (canvas)
  );
}

function drawPlayers() {
  for (const [id, p] of players) {
    const screenX = (p.x - viewport.x) * DPR;
    const screenY = (p.y - viewport.y) * DPR;

    // avatar image if available; fallback to a circle
    const img = getAvatar(p.avatarUrl);
    if (img && img.complete) {
      const w = 24 * DPR, h = 24 * DPR;
      ctx.drawImage(img, screenX - w/2, screenY - h/2, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, 12 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = id === myId ? "#5cff5c" : "#ffd46b";
      ctx.fill();
    }

    // name label
    ctx.font = `${12*DPR}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#e6ffd8";
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.lineWidth = 3 * DPR;
    ctx.strokeText(p.name, screenX, screenY - 18 * DPR);
    ctx.fillText(p.name, screenX, screenY - 18 * DPR);
  }
}

function draw() {
  if (!mapReady) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayers();
}

// ===== WEBSOCKET (Milestone 2) =====
function connect() {
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    elStatus.textContent = "Invalid WS URL. Edit WS_URL in main.js.";
    return;
  }

  ws.addEventListener("open", () => {
    elStatus.textContent = "Connected";
    // Shape below is a reasonable default; tweak if README differs
    ws.send(JSON.stringify({ type: "join", name: NAME }));
  });

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);

    // Example message shapes — adjust names if README uses different keys
    if (msg.type === "joined") {
      // { type, id, you: { x,y, avatarUrl, name }, players: [...] }
      myId = msg.id;
      myPos = { x: msg.you.x, y: msg.you.y };
      myAvatarUrl = msg.you.avatarUrl || null;

      players.clear();
      for (const pl of msg.players || []) {
        players.set(pl.id, { x: pl.x, y: pl.y, name: pl.name, avatarUrl: pl.avatarUrl || null });
      }
      // ensure we include ourselves
      players.set(myId, { x: myPos.x, y: myPos.y, name: NAME, avatarUrl: myAvatarUrl });

      centerViewportOn(myPos);
      draw();
      updateHud();
    }

    if (msg.type === "state") {
      // periodic world update: { type, players:[{id,x,y,avatarUrl,name}] }
      for (const pl of msg.players) {
        players.set(pl.id, { x: pl.x, y: pl.y, name: pl.name, avatarUrl: pl.avatarUrl || null });
        if (pl.id === myId) myPos = { x: pl.x, y: pl.y };
      }
      centerViewportOn(myPos);
      draw();
      updateHud();
    }

    if (msg.type === "moved") {
      // immediate echo: { type, id, x, y }
      const p = players.get(msg.id);
      if (p) { p.x = msg.x; p.y = msg.y; }
      if (msg.id === myId) {
        myPos = { x: msg.x, y: msg.y };
        centerViewportOn(myPos);
      }
      draw();
      updateHud();
    }

    if (msg.type === "players") {
      // full refresh list
      players.clear();
      for (const pl of msg.players) {
        players.set(pl.id, { x: pl.x, y: pl.y, name: pl.name, avatarUrl: pl.avatarUrl || null });
      }
      draw();
      updateHud();
    }
  });

  ws.addEventListener("close", () => {
    elStatus.textContent = "Disconnected (retrying…)";
    // optional: small backoff; for the prework you can reconnect manually
  });

  ws.addEventListener("error", () => {
    elStatus.textContent = "WebSocket error";
  });
}

function updateHud() {
  elCoords.textContent = `Pos: (${Math.round(myPos.x)}, ${Math.round(myPos.y)})`;
  elPlayers.textContent = `Players: ${players.size}`;
}

connect();

// ===== MOVEMENT (Milestone 3) =====
// The prompt says: “Send one move command per key down event” (no rate limit).
// We’ll send immediately on keydown; server will broadcast updated state.
window.addEventListener("keydown", (e) => {
  if (!myId || !ws || ws.readyState !== 1) return;

  const step = 16; // world pixels per keypress (tweak as needed)
  let dx = 0, dy = 0;
  if (e.key === "ArrowUp"   || e.key === "w") dy = -step;
  if (e.key === "ArrowDown" || e.key === "s") dy =  step;
  if (e.key === "ArrowLeft" || e.key === "a") dx = -step;
  if (e.key === "ArrowRight"|| e.key === "d") dx =  step;
  if (dx === 0 && dy === 0) return;

  // optimistic prediction (feels snappier while waiting for server)
  myPos.x += dx; myPos.y += dy;
  const me = players.get(myId);
  if (me) { me.x = myPos.x; me.y = myPos.y; }
  centerViewportOn(myPos);
  draw();
  updateHud();

  ws.send(JSON.stringify({ type: "move", id: myId, dx, dy }));
});
