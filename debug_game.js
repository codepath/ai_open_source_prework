// Debug version of GameClient to trace the issue
class GameClient {
    constructor() {
        console.log('=== GameClient Constructor ===');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = null;
        this.worldWidth = 2048;
        this.worldHeight = 2048;
        
        // Game state
        this.playerId = null;
        this.players = {};
        this.avatars = {};
        this.myPlayer = null;
        
        // Camera/viewport
        this.camera = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
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
        
        console.log('Initial camera state:', this.camera);
        this.init();
    }
    
    init() {
        console.log('=== Init Called ===');
        this.setupCanvas();
        this.loadWorldMap();
        this.setupEventListeners();
        this.connectToServer();
        this.startRenderLoop();
    }
    
    setupCanvas() {
        console.log('=== Setup Canvas ===');
        // Set canvas size to fill the browser window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update camera dimensions
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
        
        console.log('Canvas size:', this.canvas.width, this.canvas.height);
        console.log('Camera dimensions set to:', this.camera.width, this.camera.height);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.camera.width = this.canvas.width;
            this.camera.height = this.canvas.height;
            this.needsRedraw = true;
        });
    }
    
    loadWorldMap() {
        console.log('=== Loading World Map ===');
        this.worldImage = new Image();
        this.worldImage.onload = () => {
            console.log('=== World Map Loaded ===');
            console.log('World image dimensions:', this.worldImage.width, this.worldImage.height);
            this.worldImageLoaded = true;
            this.checkAndCenterCamera();
            this.needsRedraw = true;
        };
        this.worldImage.src = 'world.jpg';
    }
    
    connectToServer() {
        console.log('=== Connecting to Server ===');
        try {
            this.ws = new WebSocket('wss://codepath-mmorg.onrender.com');
            
            this.ws.onopen = () => {
                console.log('=== WebSocket Connected ===');
                this.reconnectAttempts = 0;
                this.joinGame();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('=== Server Message Received ===', message);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error parsing server message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('=== WebSocket Disconnected ===');
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('=== WebSocket Error ===', error);
            };
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.attemptReconnect();
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.connectToServer();
            }, 2000 * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
    
    joinGame() {
        const joinMessage = {
            action: 'join_game',
            username: 'Blankey'
        };
        
        this.ws.send(JSON.stringify(joinMessage));
        console.log('=== Join Game Message Sent ===', joinMessage);
    }
    
    handleServerMessage(message) {
        console.log('=== Handling Server Message ===', message.action);
        switch (message.action) {
            case 'join_game':
                if (message.success) {
                    this.handleJoinGameSuccess(message);
                } else {
                    console.error('Join game failed:', message.error);
                }
                break;
                
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
                
            case 'players_moved':
                this.handlePlayersMoved(message);
                break;
                
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
                
            default:
                console.log('Unknown message:', message);
        }
    }
    
    handleJoinGameSuccess(message) {
        console.log('=== Join Game Success ===');
        console.log('Full server response:', message);
        
        this.playerId = message.playerId;
        this.players = message.players;
        this.avatars = message.avatars;
        
        // Find my player
        this.myPlayer = this.players[this.playerId];
        console.log('My player data:', this.myPlayer);
        console.log('Player position:', this.myPlayer ? `${this.myPlayer.x}, ${this.myPlayer.y}` : 'NO PLAYER DATA');
        
        this.playerDataReceived = true;
        this.checkAndCenterCamera();
        
        // Preload avatar images
        this.preloadAvatars();
        
        this.needsRedraw = true;
    }
    
    checkAndCenterCamera() {
        console.log('=== Check And Center Camera ===');
        console.log('World image loaded:', this.worldImageLoaded);
        console.log('Player data received:', this.playerDataReceived);
        console.log('My player exists:', !!this.myPlayer);
        
        if (this.myPlayer) {
            console.log('Player position from server:', this.myPlayer.x, this.myPlayer.y);
        }
        
        // Only center camera when both world image and player data are loaded
        if (this.worldImageLoaded && this.playerDataReceived && this.myPlayer) {
            console.log('=== Centering Camera ===');
            this.centerCameraOnPlayer();
        } else {
            console.log('Not centering camera yet - missing requirements');
        }
    }
    
    centerCameraOnPlayer() {
        if (!this.myPlayer) {
            console.log('No player data available for centering');
            return;
        }
        
        console.log('=== Center Camera On Player ===');
        console.log('Player world position:', this.myPlayer.x, this.myPlayer.y);
        console.log('Camera dimensions before centering:', this.camera.width, this.camera.height);
        
        // Center camera on player
        this.camera.x = this.myPlayer.x - this.camera.width / 2;
        this.camera.y = this.myPlayer.y - this.camera.height / 2;
        
        console.log('Camera position before clamping:', this.camera.x, this.camera.y);
        
        // Clamp camera to world bounds
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.worldWidth - this.camera.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.worldHeight - this.camera.height));
        
        console.log('Final camera position:', this.camera.x, this.camera.y);
        console.log('Camera should show world area from', this.camera.x, this.camera.y, 'to', this.camera.x + this.camera.width, this.camera.y + this.camera.height);
        
        this.needsRedraw = true;
    }
    
    handlePlayerJoined(message) {
        console.log('Player joined:', message.player.username);
        this.players[message.player.id] = message.player;
        this.avatars[message.avatar.name] = message.avatar;
        this.preloadAvatar(message.avatar);
        this.needsRedraw = true;
    }
    
    handlePlayersMoved(message) {
        // Update player positions
        Object.keys(message.players).forEach(playerId => {
            if (this.players[playerId]) {
                Object.assign(this.players[playerId], message.players[playerId]);
            }
        });
        
        // Update my player if it moved
        if (this.myPlayer && message.players[this.playerId]) {
            Object.assign(this.myPlayer, message.players[this.playerId]);
            this.centerCameraOnPlayer();
        }
        
        this.needsRedraw = true;
    }
    
    handlePlayerLeft(message) {
        console.log('Player left:', message.playerId);
        delete this.players[message.playerId];
        this.needsRedraw = true;
    }
    
    preloadAvatars() {
        Object.values(this.avatars).forEach(avatar => {
            this.preloadAvatar(avatar);
        });
    }
    
    preloadAvatar(avatar) {
        // Preload all avatar frames
        Object.values(avatar.frames).forEach(frames => {
            frames.forEach(frameData => {
                const img = new Image();
                img.src = frameData;
                // Store in avatar object for easy access
                if (!avatar.loadedImages) {
                    avatar.loadedImages = {};
                }
                const frameKey = frames.indexOf(frameData);
                avatar.loadedImages[frameKey] = img;
            });
        });
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
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw world map
        this.drawWorldMap();
        
        // Draw all players
        this.drawPlayers();
    }
    
    drawWorldMap() {
        // Calculate which part of the world map to draw
        const sourceX = Math.max(0, this.camera.x);
        const sourceY = Math.max(0, this.camera.y);
        const sourceWidth = Math.min(this.camera.width, this.worldWidth - sourceX);
        const sourceHeight = Math.min(this.camera.height, this.worldHeight - sourceY);
        
        // Calculate destination position (offset by camera)
        const destX = sourceX - this.camera.x;
        const destY = sourceY - this.camera.y;
        
        console.log('Drawing world map - source:', sourceX, sourceY, sourceWidth, sourceHeight, 'dest:', destX, destY);
        
        this.ctx.drawImage(
            this.worldImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            destX, destY, sourceWidth, sourceHeight
        );
    }
    
    drawPlayers() {
        Object.values(this.players).forEach(player => {
            this.drawPlayer(player);
        });
    }
    
    drawPlayer(player) {
        // Convert world coordinates to screen coordinates
        const screenX = player.x - this.camera.x;
        const screenY = player.y - this.camera.y;
        
        console.log(`Drawing player ${player.username} at world (${player.x}, ${player.y}) -> screen (${screenX}, ${screenY})`);
        
        // Skip if player is outside viewport
        if (screenX < -50 || screenX > this.camera.width + 50 || 
            screenY < -50 || screenY > this.camera.height + 50) {
            console.log(`Player ${player.username} is outside viewport`);
            return;
        }
        
        // Get avatar data
        const avatar = this.avatars[player.avatar];
        if (!avatar || !avatar.loadedImages) return;
        
        // Get the appropriate frame based on facing direction
        let frames = avatar.frames[player.facing];
        if (!frames && player.facing === 'west') {
            // Use east frames flipped for west
            frames = avatar.frames.east;
        }
        
        if (!frames) return;
        
        // Get the current animation frame
        const frameIndex = player.animationFrame || 0;
        const frameData = frames[frameIndex];
        
        if (!frameData) return;
        
        // Draw avatar
        const img = avatar.loadedImages[frameIndex];
        if (img && img.complete) {
            const avatarSize = 32; // Fixed avatar size
            const avatarX = screenX - avatarSize / 2;
            const avatarY = screenY - avatarSize / 2;
            
            console.log(`Drawing avatar at screen position (${avatarX}, ${avatarY})`);
            
            // Flip horizontally for west direction
            if (player.facing === 'west') {
                this.ctx.save();
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(img, -(avatarX + avatarSize), avatarY, avatarSize, avatarSize);
                this.ctx.restore();
            } else {
                this.ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
            }
        }
        
        // Draw username label
        this.drawPlayerLabel(player, screenX, screenY);
    }
    
    drawPlayerLabel(player, screenX, screenY) {
        this.ctx.save();
        
        // Set label style
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // Measure text for background
        const text = player.username;
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 14;
        
        // Draw background
        const labelX = screenX;
        const labelY = screenY - 25; // Above the avatar
        const padding = 4;
        
        this.ctx.fillRect(
            labelX - textWidth / 2 - padding,
            labelY - textHeight - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        
        // Draw text
        this.ctx.strokeText(text, labelX, labelY);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(text, labelX, labelY);
        
        this.ctx.restore();
    }
    
    setupEventListeners() {
        // Click to move functionality
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const worldX = x + this.camera.x;
            const worldY = y + this.camera.y;
            
            console.log(`Clicked at world position: (${worldX}, ${worldY})`);
            this.sendMoveCommand(worldX, worldY);
        });
        
        // Keyboard movement
        document.addEventListener('keydown', (event) => {
            let direction = null;
            
            switch(event.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    direction = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    direction = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    direction = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    direction = 'right';
                    break;
            }
            
            if (direction) {
                event.preventDefault();
                this.sendMoveCommand(direction);
            }
        });
    }
    
    sendMoveCommand(x, y) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('Not connected to server');
            return;
        }
        
        let message;
        if (typeof x === 'string') {
            // Keyboard movement
            message = {
                action: 'move',
                direction: x
            };
        } else {
            // Click movement
            message = {
                action: 'move',
                x: Math.round(x),
                y: Math.round(y)
            };
        }
        
        this.ws.send(JSON.stringify(message));
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM Content Loaded ===');
    new GameClient();
});
