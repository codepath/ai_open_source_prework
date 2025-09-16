const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let myPlayerId = null;
const players = {};
const avatars = {};
let worldLoaded = false;

// Create player list UI
const playerListUI = document.createElement('div');
playerListUI.className = 'player-list';

const playerListTitle = document.createElement('h3');
playerListTitle.textContent = 'Online Players';
playerListUI.appendChild(playerListTitle);

const playerListContent = document.createElement('div');
playerListContent.className = 'player-list-content';
playerListUI.appendChild(playerListContent);

document.body.appendChild(playerListUI);

// Movement state
const keysPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

// Make canvas fill the browser window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

// Viewport coordinates – start at (0,0) to show upper-left
const viewport = { x: 0, y: 0 };

// Load the world map
const world = new Image();
world.src = 'world.jpg'; 

world.onload = () => {
  worldLoaded = true;
  draw();
};

// Connect to game server
const ws = new WebSocket('wss://codepath-mmorg.onrender.com');

ws.onopen = () => {
  console.log('Connected to game server');
  // Send join game message
  ws.send(JSON.stringify({
    action: 'join_game',
    username: 'Armaghan'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.action) {
    case 'join_game':
      if (message.success) {
        myPlayerId = message.playerId;
        // Store all players and avatars
        Object.assign(players, message.players);
        Object.assign(avatars, message.avatars);
        updateViewport();
        draw();
      } else {
        console.error('Failed to join game:', message.error);
      }
      break;
      
    case 'player_joined':
      players[message.player.id] = message.player;
      if (message.avatar) {
        avatars[message.avatar.name] = message.avatar;
      }
      draw();
      break;
      
    case 'players_moved':
      Object.assign(players, message.players);
      if (message.players[myPlayerId]) {
        updateViewport();
      }
      draw();
      break;
      
    case 'player_left':
      delete players[message.playerId];
      draw();
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from game server');
};

// Movement functions
function sendMoveCommand(direction) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    action: 'move',
    direction: direction
  }));
}

function sendStopCommand() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    action: 'stop'
  }));
}

// Handle keyboard input
window.addEventListener('keydown', (event) => {
  if (!myPlayerId) return; // Don't handle movement until joined
  
  let direction = null;
  switch (event.key) {
    case 'ArrowUp':
      direction = 'up';
      break;
    case 'ArrowDown':
      direction = 'down';
      break;
    case 'ArrowLeft':
      direction = 'left';
      break;
    case 'ArrowRight':
      direction = 'right';
      break;
    default:
      return; // Ignore other keys
  }
  
  // Only send move command if key wasn't already pressed
  if (!keysPressed[event.key]) {
    keysPressed[event.key] = true;
    sendMoveCommand(direction);
  }
});

window.addEventListener('keyup', (event) => {
  if (!myPlayerId) return;
  
  if (keysPressed[event.key]) {
    keysPressed[event.key] = false;
    
    // If no movement keys are pressed, send stop command
    if (!Object.values(keysPressed).some(pressed => pressed)) {
      sendStopCommand();
    } else {
      // If other keys are still pressed, send move command for the last pressed key
      for (const [key, pressed] of Object.entries(keysPressed)) {
        if (pressed) {
          const direction = key.toLowerCase().replace('arrow', '');
          sendMoveCommand(direction);
          break;
        }
      }
    }
  }
});

function updateViewport() {
  if (!myPlayerId || !players[myPlayerId]) return;
  
  const player = players[myPlayerId];
  
  // Center viewport on player
  viewport.x = player.x - canvas.width / 2;
  viewport.y = player.y - canvas.height / 2;
  
  // Don't show beyond map edges (assuming 2048x2048 map)
  viewport.x = Math.max(0, Math.min(viewport.x, 2048 - canvas.width));
  viewport.y = Math.max(0, Math.min(viewport.y, 2048 - canvas.height));
}

function drawPlayer(player) {
  const avatar = avatars[player.avatar];
  if (!avatar) return;
  
  // Get the correct frame based on direction and animation
  const frames = avatar.frames[player.facing];
  if (!frames || !frames[player.animationFrame]) return;
  
  // Load the frame image if not already loaded
  let frameImg = avatar.loadedFrames?.[player.facing]?.[player.animationFrame];
  if (!frameImg) {
    frameImg = new Image();
    frameImg.src = frames[player.animationFrame];
    if (!avatar.loadedFrames) avatar.loadedFrames = {};
    if (!avatar.loadedFrames[player.facing]) avatar.loadedFrames[player.facing] = [];
    avatar.loadedFrames[player.facing][player.animationFrame] = frameImg;
  }
  
  // Draw avatar
  const x = player.x - viewport.x;
  const y = player.y - viewport.y;
  ctx.drawImage(frameImg, x - frameImg.width/2, y - frameImg.height/2);
  
  // Draw username
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.strokeText(player.username, x, y - frameImg.height/2 - 10);
  ctx.fillText(player.username, x, y - frameImg.height/2 - 10);
}

function updatePlayerList() {
  playerListContent.innerHTML = '';
  
  // Sort players by username
  const sortedPlayers = Object.values(players).sort((a, b) => 
    a.username.localeCompare(b.username)
  );
  
  sortedPlayers.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = `player-item${player.id === myPlayerId ? ' self' : ''}`;
    
    // Status dot
    const statusDot = document.createElement('div');
    statusDot.className = `status-dot${player.isMoving ? ' moving' : ' idle'}`;
    playerItem.appendChild(statusDot);
    
    // Username
    const username = document.createElement('span');
    username.textContent = player.username;
    username.className = `player-username${player.id === myPlayerId ? ' self' : ''}`;
    playerItem.appendChild(username);
    
    // Distance (if not self)
    if (player.id !== myPlayerId && players[myPlayerId]) {
      const dx = player.x - players[myPlayerId].x;
      const dy = player.y - players[myPlayerId].y;
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
      
      const distanceText = document.createElement('span');
      distanceText.textContent = `${distance}px`;
      distanceText.className = 'player-distance';
      playerItem.appendChild(distanceText);
    }
    
    playerListContent.appendChild(playerItem);
  });
  
  // Update player count in title
  playerListTitle.textContent = `Online Players (${sortedPlayers.length})`;
}

function draw() {
  if (!worldLoaded) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw world
  ctx.drawImage(world, -viewport.x, -viewport.y);
  
  // Draw all players
  Object.values(players).forEach(drawPlayer);
  
  // Update player list
  updatePlayerList();
}
