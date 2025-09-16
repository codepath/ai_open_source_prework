// Game client for Mini MMORPG
class GameClient {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.worldImage = null;
    this.worldWidth = 2048;
    this.worldHeight = 2048;

    // Game state
    this.playerId = null;
    this.players = {};
    this.avatars = {};
    this.myPlayer = null;

    // Camera/viewport
    this.camera = { x: 0, y: 0, width: 0, height: 0 };

    // WebSocket
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Rendering
    this.needsRedraw = true;
    this.animationFrame = null;

    // State flags
    this.worldImageLoaded = false;
    this.playerDataReceived = false;

    this.init();
  }

  init() {
    this.setupCanvas();
    this.loadWorldMap();
    this.setupEventListeners();
    this.connectToServer();
    this.startRenderLoop();
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.width = this.canvas.width;
    this.camera.height = this.canvas.height;

    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.camera.width = this.canvas.width;
      this.camera.height = this.canvas.height;
      // Re-center based on new size (still clamped to map bounds)
      if (this.myPlayer) this.centerCameraOnPlayer();
      this.needsRedraw = true;
    });
  }

  loadWorldMap() {
    this.worldImage = new Image();
    this.worldImage.onload = () => {
      this.worldImageLoaded = true;
      this.checkAndCenterCamera();
      this.needsRedraw = true;
    };
    this.worldImage.src = "world.jpg";
  }

  connectToServer() {
    try {
      this.ws = new WebSocket("wss://codepath-mmorg.onrender.com");

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.joinGame();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error("Error parsing server message:", error);
        }
      };

      this.ws.onclose = () => {
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect to server:", error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connectToServer(), 2000 * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  joinGame() {
    const joinMessage = { action: "join_game", username: "Blankey" };
    this.ws.send(JSON.stringify(joinMessage));
  }

  handleServerMessage(message) {
    switch (message.action) {
      case "join_game":
        if (message.success) this.handleJoinGameSuccess(message);
        else console.error("Join game failed:", message.error);
        break;
      case "player_joined":
        this.handlePlayerJoined(message);
        break;
      case "players_moved":
        this.handlePlayersMoved(message);
        break;
      case "player_left":
        this.handlePlayerLeft(message);
        break;
      default:
        break;
    }
  }

  handleJoinGameSuccess(message) {
    this.playerId = message.playerId;
    this.players = message.players;
    this.avatars = message.avatars;
    this.myPlayer = this.players[this.playerId] || null;

    this.playerDataReceived = true;
    this.checkAndCenterCamera();
    this.preloadAvatars();
    this.needsRedraw = true;
  }

  handlePlayerJoined(message) {
    this.players[message.player.id] = message.player;
    this.avatars[message.avatar.name] = message.avatar;
    this.preloadAvatar(message.avatar);
    this.needsRedraw = true;
  }

  handlePlayersMoved(message) {
    Object.keys(message.players).forEach((pid) => {
      if (this.players[pid])
        Object.assign(this.players[pid], message.players[pid]);
    });

    if (this.myPlayer && message.players[this.playerId]) {
      Object.assign(this.myPlayer, message.players[this.playerId]);
      this.centerCameraOnPlayer();
    }
    this.needsRedraw = true;
  }

  handlePlayerLeft(message) {
    delete this.players[message.playerId];
    this.needsRedraw = true;
  }

  preloadAvatars() {
    Object.values(this.avatars).forEach((avatar) => this.preloadAvatar(avatar));
  }

  preloadAvatar(avatar) {
    if (!avatar || !avatar.frames) return;
    avatar.loadedImagesByDir = avatar.loadedImagesByDir || {};
    Object.entries(avatar.frames).forEach(([dir, frames]) => {
      avatar.loadedImagesByDir[dir] = avatar.loadedImagesByDir[dir] || [];
      frames.forEach((dataUrl, idx) => {
        const img = new Image();
        img.src = dataUrl;
        avatar.loadedImagesByDir[dir][idx] = img;
      });
    });
  }

  checkAndCenterCamera() {
    if (this.worldImageLoaded && this.playerDataReceived && this.myPlayer) {
      this.centerCameraOnPlayer();
    }
  }

  centerCameraOnPlayer() {
    if (!this.myPlayer) return;
    const idealX = this.myPlayer.x - this.camera.width / 2;
    const idealY = this.myPlayer.y - this.camera.height / 2;
    // Clamp to world so we never show past edges
    this.camera.x = Math.max(
      0,
      Math.min(idealX, this.worldWidth - this.camera.width)
    );
    this.camera.y = Math.max(
      0,
      Math.min(idealY, this.worldHeight - this.camera.height)
    );
    // Snap to integers to avoid subpixel blurring
    this.camera.x = Math.round(this.camera.x);
    this.camera.y = Math.round(this.camera.y);
    this.needsRedraw = true;
  }

  startRenderLoop() {
    const render = () => {
      if (this.needsRedraw) {
        this.draw();
        this.needsRedraw = false;
      }
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    if (!this.worldImage) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawWorldMap();
    this.drawPlayers();
  }

  drawWorldMap() {
    const sx = Math.max(0, this.camera.x);
    const sy = Math.max(0, this.camera.y);
    const sw = Math.min(this.camera.width, this.worldWidth - sx);
    const sh = Math.min(this.camera.height, this.worldHeight - sy);
    const dx = sx - this.camera.x;
    const dy = sy - this.camera.y;
    this.ctx.drawImage(this.worldImage, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  drawPlayers() {
    Object.values(this.players).forEach((player) => this.drawPlayer(player));
  }

  drawPlayer(player) {
    const screenX = player.x - this.camera.x;
    const screenY = player.y - this.camera.y;
    if (
      screenX < -64 ||
      screenX > this.camera.width + 64 ||
      screenY < -64 ||
      screenY > this.camera.height + 64
    ) {
      return;
    }

    const avatar = this.avatars[player.avatar];
    if (!avatar || !avatar.loadedImagesByDir) return;

    // Choose frames by facing, fall back for west by flipping east
    let dir = player.facing || "south";
    let frames = avatar.loadedImagesByDir[dir];
    let flipX = false;
    if ((!frames || frames.length === 0) && dir === "west") {
      frames = avatar.loadedImagesByDir["east"];
      flipX = true;
    }
    if (!frames || frames.length === 0) return;

    const frameIdx = player.animationFrame || 0;
    const img = frames[Math.min(frameIdx, frames.length - 1)];
    if (!img || !img.complete) return;

    // Respect aspect ratio; use target height, compute width
    const targetHeight = 32; // logical avatar height in pixels
    const scale =
      targetHeight / (img.naturalHeight || img.height || targetHeight);
    const drawW = Math.max(
      1,
      Math.round((img.naturalWidth || img.width || targetHeight) * scale)
    );
    const drawH = Math.max(1, Math.round(targetHeight));
    const drawX = Math.round(screenX - drawW / 2);
    const drawY = Math.round(screenY - drawH / 2);

    if (flipX) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(img, -(drawX + drawW), drawY, drawW, drawH);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    this.drawPlayerLabel(player, Math.round(screenX), Math.round(screenY));
  }

  drawPlayerLabel(player, screenX, screenY) {
    this.ctx.save();
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    const text = player.username;
    const metrics = this.ctx.measureText(text);
    const w = Math.ceil(metrics.width) + 8;
    const h = 16;
    const x = Math.round(screenX - w / 2);
    const y = Math.round(screenY - 24 - h);

    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = "white";
    this.ctx.fillText(text, screenX, y + h - 4);
    this.ctx.restore();
  }

  setupEventListeners() {
    // Click-to-move: convert screen to world coordinates
    this.canvas.addEventListener("click", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const worldX = Math.round(x + this.camera.x);
      const worldY = Math.round(y + this.camera.y);
      this.sendMoveCommand({ x: worldX, y: worldY });
    });

    // Keyboard: WASD/Arrows
    document.addEventListener("keydown", (event) => {
      let direction = null;
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          direction = "up";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          direction = "down";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          direction = "left";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          direction = "right";
          break;
      }
      if (direction) {
        // prevent page scroll; do NOT suppress auto-repeat.
        event.preventDefault();
        this.sendMoveCommand({ direction });
      }
    });

    // Stop on keyup of any movement key
    document.addEventListener("keyup", (event) => {
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "W",
        "a",
        "A",
        "s",
        "S",
        "d",
        "D",
      ];
      if (keys.includes(event.key)) {
        this.sendStopCommand();
      }
    });

    // Also stop if window loses focus to avoid stuck movement
    window.addEventListener("blur", () => {
      this.sendStopCommand();
    });
  }

  sendMoveCommand(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let message;
    if (payload.direction) {
      message = { action: "move", direction: payload.direction };
    } else {
      message = { action: "move", x: payload.x, y: payload.y };
    }
    this.ws.send(JSON.stringify(message));
  }

  sendStopCommand() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ action: "stop" }));
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new GameClient();
});
