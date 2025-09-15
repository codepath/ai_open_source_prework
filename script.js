// Game state
let gameState = {
    playerId: null,
    playerPosition: { x: 0, y: 0 },
    playerAvatar: null,
    viewportOffset: { x: 0, y: 0 },
    worldImage: null,
    avatarImages: new Map(), // Cache for loaded avatar images
    canvas: null,
    ctx: null,
    ws: null,
    keysPressed: new Set(), // Track currently pressed keys
    isMoving: false,
    otherPlayers: new Map(), // Store other players data by playerId
    allAvatars: new Map(), // Store all avatar data by avatar name
    animationFrame: 0 // Current animation frame for our player
};

// Constants
const WORLD_SIZE = 2048;
const AVATAR_SIZE = 48;
const ANIMATION_SPEED = 200; // Milliseconds per frame
const MINIMAP_SIZE = 200; // Size of mini-map in pixels
const MINIMAP_SCALE = MINIMAP_SIZE / WORLD_SIZE; // Scale factor for mini-map

// Get the canvas and context
gameState.canvas = document.getElementById('gameCanvas');
gameState.ctx = gameState.canvas.getContext('2d');

// Set canvas size to fill the browser window
function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
    updateViewport();
    draw();
}

// Initialize canvas size
resizeCanvas();

// Listen for window resize
window.addEventListener('resize', resizeCanvas);

// Animation system - only animate when moving
let animationInterval = null;

function startAnimation() {
    if (animationInterval) return; // Already animating
    
    animationInterval = setInterval(() => {
        gameState.animationFrame = (gameState.animationFrame + 1) % 3;
        draw(); // Only redraw when animation changes
    }, ANIMATION_SPEED);
}

function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

// Load the world map
gameState.worldImage = new Image();
gameState.worldImage.onload = function() {
    draw();
};

// Load the world image
gameState.worldImage.src = 'world.jpg';

// WebSocket connection
function connectToServer() {
    gameState.ws = new WebSocket('wss://codepath-mmorg.onrender.com');
    
    gameState.ws.onopen = function() {
        console.log('Connected to game server');
        // Send join game message
        const joinMessage = {
            action: 'join_game',
            username: 'Dylan'
        };
        gameState.ws.send(JSON.stringify(joinMessage));
    };
    
    gameState.ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
    };
    
    gameState.ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    gameState.ws.onclose = function() {
        console.log('Disconnected from server');
    };
}

// Handle messages from server
function handleServerMessage(message) {
    console.log('Received message:', message);
    
    switch (message.action) {
        case 'join_game':
            if (message.success) {
                gameState.playerId = message.playerId;
                
                // Store all avatars
                Object.values(message.avatars).forEach(avatar => {
                    gameState.allAvatars.set(avatar.name, avatar);
                    loadAvatarImages(avatar);
                });
                
                // Store all other players (excluding ourselves)
                Object.entries(message.players).forEach(([playerId, playerData]) => {
                    if (playerId !== message.playerId) {
                        gameState.otherPlayers.set(playerId, playerData);
                    }
                });
                
                // Find our player data
                const ourPlayer = message.players[message.playerId];
                if (ourPlayer) {
                    gameState.playerPosition = { x: ourPlayer.x, y: ourPlayer.y };
                    gameState.playerAvatar = message.avatars[ourPlayer.avatar];
                    updateViewport();
                    draw();
                }
            } else {
                console.error('Failed to join game:', message.error);
            }
            break;
            
        case 'players_moved':
            // Update all moved players (including ourselves)
            Object.entries(message.players).forEach(([playerId, playerData]) => {
                if (playerId === gameState.playerId) {
                    // Update our position
                    gameState.playerPosition = { x: playerData.x, y: playerData.y };
                    updateViewport();
                    
                    // Start animation if moving, stop if not
                    if (playerData.isMoving) {
                        startAnimation();
                    } else {
                        stopAnimation();
                        gameState.animationFrame = 0; // Reset to standing frame
                    }
                } else {
                    // Update other players
                    gameState.otherPlayers.set(playerId, playerData);
                }
            });
            draw();
            break;
            
        case 'player_joined':
            // Add new player and their avatar
            if (message.player && message.avatar) {
                gameState.otherPlayers.set(message.player.id, message.player);
                gameState.allAvatars.set(message.avatar.name, message.avatar);
                loadAvatarImages(message.avatar);
                draw();
            }
            break;
            
        case 'player_left':
            // Remove player who left
            if (message.playerId) {
                gameState.otherPlayers.delete(message.playerId);
                draw();
            }
            break;
    }
}

// Load avatar images into cache
function loadAvatarImages(avatarData) {
    if (!avatarData) return;
    
    const avatarName = avatarData.name;
    
    // Load images for each direction
    ['north', 'south', 'east'].forEach(direction => {
        avatarData.frames[direction].forEach((frameData, frameIndex) => {
            const img = new Image();
            img.onload = function() {
                draw(); // Redraw when image loads
            };
            img.src = frameData;
            
            const key = `${avatarName}_${direction}_${frameIndex}`;
            gameState.avatarImages.set(key, img);
        });
    });
}

// Update viewport to center player
function updateViewport() {
    const canvasWidth = gameState.canvas.width;
    const canvasHeight = gameState.canvas.height;
    
    // Center the player in the viewport
    gameState.viewportOffset.x = gameState.playerPosition.x - canvasWidth / 2;
    gameState.viewportOffset.y = gameState.playerPosition.y - canvasHeight / 2;
    
    // Clamp to world bounds
    gameState.viewportOffset.x = Math.max(0, Math.min(gameState.viewportOffset.x, WORLD_SIZE - canvasWidth));
    gameState.viewportOffset.y = Math.max(0, Math.min(gameState.viewportOffset.y, WORLD_SIZE - canvasHeight));
}

// Draw everything
function draw() {
    if (!gameState.worldImage) return;
    
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw world map with viewport offset
    ctx.drawImage(
        gameState.worldImage,
        gameState.viewportOffset.x, gameState.viewportOffset.y,
        Math.min(canvas.width, WORLD_SIZE - gameState.viewportOffset.x),
        Math.min(canvas.height, WORLD_SIZE - gameState.viewportOffset.y),
        0, 0,
        Math.min(canvas.width, WORLD_SIZE - gameState.viewportOffset.x),
        Math.min(canvas.height, WORLD_SIZE - gameState.viewportOffset.y)
    );
    
    // Draw all players
    drawAllPlayers();
    
    // Draw mini-map
    drawMiniMap();
}

// Draw all players (our player + other players)
function drawAllPlayers() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Draw our player at center of screen
    if (gameState.playerAvatar && gameState.playerId) {
        drawPlayer(ctx, canvas.width / 2, canvas.height / 2, 'Dylan', gameState.playerAvatar, 'south', gameState.animationFrame);
    }
    
    // Draw other players
    gameState.otherPlayers.forEach(playerData => {
        const avatar = gameState.allAvatars.get(playerData.avatar);
        if (avatar) {
            // Convert world coordinates to screen coordinates
            const screenX = playerData.x - gameState.viewportOffset.x;
            const screenY = playerData.y - gameState.viewportOffset.y;
            
            // Only draw if player is visible on screen
            if (screenX >= -AVATAR_SIZE && screenX <= canvas.width + AVATAR_SIZE &&
                screenY >= -AVATAR_SIZE && screenY <= canvas.height + AVATAR_SIZE) {
                
                drawPlayer(ctx, screenX, screenY, playerData.username, avatar, playerData.facing, playerData.animationFrame);
            }
        }
    });
}

// Draw a single player
function drawPlayer(ctx, screenX, screenY, username, avatar, facing, animationFrame) {
    // Get avatar image based on facing direction and animation frame
    const avatarKey = `${avatar.name}_${facing}_${animationFrame}`;
    const avatarImg = gameState.avatarImages.get(avatarKey);
    
    if (avatarImg) {
        // Calculate avatar size maintaining aspect ratio
        const aspectRatio = avatarImg.width / avatarImg.height;
        let avatarWidth = AVATAR_SIZE;
        let avatarHeight = AVATAR_SIZE / aspectRatio;
        
        // Draw avatar centered
        ctx.drawImage(
            avatarImg,
            screenX - avatarWidth / 2,
            screenY - avatarHeight / 2,
            avatarWidth,
            avatarHeight
        );
    }
    
    // Draw username label
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    
    const textY = screenY - avatarHeight / 2 - 10;
    
    // Draw text outline
    ctx.strokeText(username, screenX, textY);
    // Draw text fill
    ctx.fillText(username, screenX, textY);
}

// Draw mini-map
function drawMiniMap() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Mini-map position (top-right corner)
    const minimapX = canvas.width - MINIMAP_SIZE - 20;
    const minimapY = 20;
    
    // Draw mini-map background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw mini-map border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw world map on mini-map
    if (gameState.worldImage) {
        ctx.drawImage(
            gameState.worldImage,
            0, 0, WORLD_SIZE, WORLD_SIZE,
            minimapX, minimapY, MINIMAP_SIZE, MINIMAP_SIZE
        );
    }
    
    // Draw viewport rectangle on mini-map
    const viewportMinimapX = minimapX + (gameState.viewportOffset.x * MINIMAP_SCALE);
    const viewportMinimapY = minimapY + (gameState.viewportOffset.y * MINIMAP_SCALE);
    const viewportMinimapWidth = canvas.width * MINIMAP_SCALE;
    const viewportMinimapHeight = canvas.height * MINIMAP_SCALE;
    
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportMinimapX, viewportMinimapY, viewportMinimapWidth, viewportMinimapHeight);
    
    // Draw our player on mini-map
    const playerMinimapX = minimapX + (gameState.playerPosition.x * MINIMAP_SCALE);
    const playerMinimapY = minimapY + (gameState.playerPosition.y * MINIMAP_SCALE);
    
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(playerMinimapX, playerMinimapY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw other players on mini-map
    gameState.otherPlayers.forEach(playerData => {
        const otherPlayerMinimapX = minimapX + (playerData.x * MINIMAP_SCALE);
        const otherPlayerMinimapY = minimapY + (playerData.y * MINIMAP_SCALE);
        
        // Only draw if player is visible on mini-map
        if (otherPlayerMinimapX >= minimapX && otherPlayerMinimapX <= minimapX + MINIMAP_SIZE &&
            otherPlayerMinimapY >= minimapY && otherPlayerMinimapY <= minimapY + MINIMAP_SIZE) {
            
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(otherPlayerMinimapX, otherPlayerMinimapY, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// Keyboard event handling
function handleKeyDown(event) {
    const key = event.code;
    
    // Only handle arrow keys
    if (key.startsWith('Arrow')) {
        event.preventDefault(); // Prevent page scrolling
        
        // Add key to pressed keys
        gameState.keysPressed.add(key);
        
        // Send move command
        sendMoveCommand();
        
        console.log('Key pressed:', key, 'Keys pressed:', Array.from(gameState.keysPressed));
    }
}

function handleKeyUp(event) {
    const key = event.code;
    
    if (key.startsWith('Arrow')) {
        event.preventDefault();
        
        // Remove key from pressed keys
        gameState.keysPressed.delete(key);
        
        console.log('Key released:', key, 'Keys pressed:', Array.from(gameState.keysPressed));
        
        // Send stop command if no keys are pressed
        if (gameState.keysPressed.size === 0) {
            sendStopCommand();
        }
    }
}

// Send move command to server
function sendMoveCommand() {
    if (!gameState.ws || gameState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    // Determine movement direction based on pressed keys
    let direction = null;
    
    if (gameState.keysPressed.has('ArrowUp')) {
        direction = 'up';
    } else if (gameState.keysPressed.has('ArrowDown')) {
        direction = 'down';
    } else if (gameState.keysPressed.has('ArrowLeft')) {
        direction = 'left';
    } else if (gameState.keysPressed.has('ArrowRight')) {
        direction = 'right';
    }
    
    if (direction && !gameState.isMoving) {
        const moveMessage = {
            action: 'move',
            direction: direction
        };
        console.log('Sending move command:', moveMessage);
        gameState.ws.send(JSON.stringify(moveMessage));
        gameState.isMoving = true;
    }
}

// Send stop command to server
function sendStopCommand() {
    if (!gameState.ws || gameState.ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    if (gameState.isMoving) {
        const stopMessage = {
            action: 'stop'
        };
        gameState.ws.send(JSON.stringify(stopMessage));
        gameState.isMoving = false;
    }
}

// Connect to server when page loads
window.addEventListener('load', function() {
    connectToServer();
    
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
});
