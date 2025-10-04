// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameMode = 'pvp'; // 'pvc', 'pvp', or 'online'
let gameRunning = false;
let gamePaused = false;
let animationId;

// Online game variables
let socket = null;
let currentRoom = null;
let playerNumber = null;
let playerName = '';
let isOnlineMode = false;
let onlineGameState = null;

// Game objects
class Paddle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.dy = 0;
    }

    update() {
        this.y += this.dy;
        
        // Keep paddle within canvas bounds
        if (this.y < 0) {
            this.y = 0;
        }
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
        }
    }

    draw() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // Get center Y position
    getCenterY() {
        return this.y + this.height / 2;
    }
}

class Ball {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseSpeed = 4;
        this.speed = this.baseSpeed;
        this.dx = this.speed;
        this.dy = this.speed;
        this.lastHit = null;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        // Bounce off top and bottom walls
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
            this.dy = -this.dy;
        }
    }

    draw() {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.speed = this.baseSpeed;
        
        // Random direction
        this.dx = (Math.random() > 0.5 ? 1 : -1) * this.speed;
        this.dy = (Math.random() > 0.5 ? 1 : -1) * this.speed;
        this.lastHit = null;
    }

    increaseSpeed() {
        this.speed += 0.5;
        const direction = this.dx > 0 ? 1 : -1;
        this.dx = direction * this.speed;
    }
}

// Game objects instances
const paddle1 = new Paddle(20, canvas.height / 2 - 50, 10, 100);
const paddle2 = new Paddle(canvas.width - 30, canvas.height / 2 - 50, 10, 100);
const ball = new Ball(canvas.width / 2, canvas.height / 2, 8);

// Score
let player1Score = 0;
let player2Score = 0;

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Pause/unpause with spacebar
    if (e.code === 'Space' && gameRunning) {
        e.preventDefault();
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Input processing
function handleInput() {
    if (gamePaused) return;

    // Player 1 controls (WASD)
    if (keys['w']) {
        paddle1.dy = -paddle1.speed;
    } else if (keys['s']) {
        paddle1.dy = paddle1.speed;
    } else {
        paddle1.dy = 0;
    }

    // Player 2 controls (Arrow keys) - only in PvP mode
    if (gameMode === 'pvp') {
        if (keys['arrowup']) {
            paddle2.dy = -paddle2.speed;
        } else if (keys['arrowdown']) {
            paddle2.dy = paddle2.speed;
        } else {
            paddle2.dy = 0;
        }
    }
}

// CPU AI (simple movement)
function updateCPU() {
    if (gameMode === 'pvc' && !gamePaused) {
        const paddleCenter = paddle2.getCenterY();
        const ballY = ball.y;
        const diff = ballY - paddleCenter;
        
        // Simple AI: move towards ball
        if (Math.abs(diff) > 10) {
            if (diff > 0) {
                paddle2.dy = paddle2.speed * 0.7; // Slightly slower than player
            } else {
                paddle2.dy = -paddle2.speed * 0.7;
            }
        } else {
            paddle2.dy = 0;
        }
    }
}

// Collision detection
function checkCollisions() {
    // Ball vs Paddle 1
    if (ball.x - ball.radius <= paddle1.x + paddle1.width &&
        ball.x - ball.radius >= paddle1.x &&
        ball.y >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height &&
        ball.dx < 0) {
        
        ball.dx = -ball.dx;
        ball.increaseSpeed();
        ball.lastHit = 'player1';
        
        // Add some angle based on where ball hits paddle
        const hitPos = (ball.y - paddle1.getCenterY()) / (paddle1.height / 2);
        ball.dy = hitPos * ball.speed * 0.5;
    }

    // Ball vs Paddle 2
    if (ball.x + ball.radius >= paddle2.x &&
        ball.x + ball.radius <= paddle2.x + paddle2.width &&
        ball.y >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height &&
        ball.dx > 0) {
        
        ball.dx = -ball.dx;
        ball.increaseSpeed();
        ball.lastHit = 'player2';
        
        // Add some angle based on where ball hits paddle
        const hitPos = (ball.y - paddle2.getCenterY()) / (paddle2.height / 2);
        ball.dy = hitPos * ball.speed * 0.5;
    }

    // Check for scoring
    if (ball.x < 0) {
        player2Score++;
        updateScore();
        ball.reset();
    } else if (ball.x > canvas.width) {
        player1Score++;
        updateScore();
        ball.reset();
    }
}

// Update score display
function updateScore() {
    document.getElementById('player1-score').textContent = player1Score;
    document.getElementById('player2-score').textContent = player2Score;
}

// Draw center line
function drawCenterLine() {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Main game loop
function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gamePaused) {
        // Handle input
        handleInput();
        updateCPU();

        // Update game objects
        paddle1.update();
        paddle2.update();
        ball.update();

        // Check collisions
        checkCollisions();
    }

    // Draw everything
    drawCenterLine();
    paddle1.draw();
    paddle2.draw();
    ball.draw();

    animationId = requestAnimationFrame(gameLoop);
}

// Game control functions
function startGame(mode) {
    gameMode = mode;
    gameRunning = true;
    gamePaused = false;
    
    // Reset scores
    player1Score = 0;
    player2Score = 0;
    updateScore();
    
    // Reset ball
    ball.reset();
    
    // Reset paddles
    paddle1.y = canvas.height / 2 - 50;
    paddle2.y = canvas.height / 2 - 50;
    
    // Update UI
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-mode').textContent = 
        mode === 'pvc' ? 'Jugador vs CPU' : 'Jugador vs Jugador';
    
    // Start game loop
    gameLoop();
}

function pauseGame() {
    gamePaused = true;
    document.getElementById('pause-overlay').classList.remove('hidden');
}

function unpauseGame() {
    gamePaused = false;
    document.getElementById('pause-overlay').classList.add('hidden');
}

function togglePause() {
    if (gamePaused) {
        unpauseGame();
    } else {
        pauseGame();
    }
}

function restartGame() {
    if (gameRunning) {
        startGame(gameMode);
    }
}

function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}

// Event listeners for menu and controls
document.getElementById('player-vs-cpu').addEventListener('click', () => {
    startGame('pvc');
});

document.getElementById('player-vs-player').addEventListener('click', () => {
    startGame('pvp');
});

document.getElementById('pause-btn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    restartGame();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    returnToMenu();
});

// Initialize the game
updateScore();

// ==================== ONLINE FUNCTIONALITY ====================

// Initialize socket connection
function initializeSocket() {
    if (socket) return;
    
    socket = io();
    
    socket.on('connect', () => {
        updateConnectionStatus('connected', 'Conectado');
    });
    
    socket.on('disconnect', () => {
        updateConnectionStatus('disconnected', 'Desconectado');
    });
    
    socket.on('room_created', (data) => {
        currentRoom = data.roomId;
        playerNumber = data.playerNumber;
        document.getElementById('room-code').textContent = data.roomId;
        showScreen('room-creation');
    });
    
    socket.on('room_joined', (data) => {
        currentRoom = data.roomId;
        playerNumber = data.playerNumber;
        startOnlineGame();
    });
    
    socket.on('player_joined', (data) => {
        startOnlineGame();
    });
    
    socket.on('room_ready', () => {
        // Both players are ready, game can start
    });
    
    socket.on('game_started', () => {
        isOnlineMode = true;
        gameMode = 'online';
        gameRunning = true;
        gamePaused = false;
        
        showScreen('game-container');
        document.getElementById('game-mode').textContent = `Online - ${playerName} (Jugador ${playerNumber.slice(-1)})`;
        
        // Start online game loop
        onlineGameLoop();
    });
    
    socket.on('game_update', (gameState) => {
        onlineGameState = gameState;
    });
    
    socket.on('score_update', (scores) => {
        player1Score = scores.player1;
        player2Score = scores.player2;
        updateScore();
    });
    
    socket.on('game_paused', (isPaused) => {
        gamePaused = isPaused;
        if (isPaused) {
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else {
            document.getElementById('pause-overlay').classList.add('hidden');
        }
    });
    
    socket.on('player_disconnected', () => {
        alert('El otro jugador se desconectó');
        returnToMenu();
    });
    
    socket.on('join_error', (message) => {
        alert(message);
        showScreen('join-room-menu');
    });
    
    socket.on('rooms_list', (rooms) => {
        displayAvailableRooms(rooms);
    });
}

// Update connection status indicator
function updateConnectionStatus(status, text) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
}

// Show specific screen
function showScreen(screenId) {
    const screens = ['menu', 'online-menu', 'room-creation', 'join-room-menu', 'game-container'];
    screens.forEach(screen => {
        document.getElementById(screen).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// Online game loop
function onlineGameLoop() {
    if (!gameRunning || !isOnlineMode) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (onlineGameState) {
        // Draw game state from server
        drawCenterLine();
        
        // Draw paddles
        ctx.fillStyle = '#ffffff';
        const p1 = onlineGameState.paddles.player1;
        const p2 = onlineGameState.paddles.player2;
        ctx.fillRect(p1.x, p1.y, p1.width, p1.height);
        ctx.fillRect(p2.x, p2.y, p2.width, p2.height);
        
        // Draw ball
        const ball = onlineGameState.ball;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    animationId = requestAnimationFrame(onlineGameLoop);
}

// Handle online input
function handleOnlineInput() {
    if (!socket || !currentRoom || gamePaused) return;
    
    let direction = null;
    
    if (playerNumber === 'player1') {
        if (keys['w']) direction = 'up';
        else if (keys['s']) direction = 'down';
    } else if (playerNumber === 'player2') {
        if (keys['arrowup']) direction = 'up';
        else if (keys['arrowdown']) direction = 'down';
    }
    
    if (direction) {
        socket.emit('player_input', { roomId: currentRoom, direction: direction });
    }
}

// Start online game
function startOnlineGame() {
    if (socket && currentRoom) {
        socket.emit('start_game', currentRoom);
    }
}

// Create room
function createRoom() {
    if (!playerName.trim()) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    if (!socket) initializeSocket();
    socket.emit('create_room', playerName.trim());
}

// Join room
function joinRoom(roomId = null) {
    if (!playerName.trim()) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    if (!socket) initializeSocket();
    
    const roomCode = roomId || document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!roomCode) {
        alert('Por favor ingresa un código de sala');
        return;
    }
    
    socket.emit('join_room', { roomId: roomCode, playerName: playerName.trim() });
}

// Display available rooms
function displayAvailableRooms(rooms) {
    const roomsList = document.getElementById('rooms-list');
    
    if (rooms.length === 0) {
        roomsList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No hay salas disponibles</p>';
        return;
    }
    
    roomsList.innerHTML = '';
    rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = 'room-item';
        roomElement.innerHTML = `
            <span>Sala: ${room.roomId}</span>
            <span>${room.players}/2 jugadores</span>
        `;
        roomElement.addEventListener('click', () => joinRoom(room.roomId));
        roomsList.appendChild(roomElement);
    });
}

// Refresh rooms list
function refreshRooms() {
    if (socket) {
        socket.emit('get_rooms');
    }
}

// Modified input handling for online mode
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Handle online input
    if (isOnlineMode) {
        handleOnlineInput();
    }
    
    // Pause/unpause with spacebar
    if (e.code === 'Space' && gameRunning) {
        e.preventDefault();
        if (isOnlineMode && socket && currentRoom) {
            socket.emit('pause_game', currentRoom);
        } else {
            togglePause();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    // Handle online input
    if (isOnlineMode) {
        handleOnlineInput();
    }
});

// Event listeners for online functionality
document.getElementById('online-mode').addEventListener('click', () => {
    initializeSocket();
    showScreen('online-menu');
});

document.getElementById('create-room-btn').addEventListener('click', () => {
    playerName = document.getElementById('player-name').value;
    createRoom();
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    playerName = document.getElementById('player-name').value;
    refreshRooms();
    showScreen('join-room-menu');
});

document.getElementById('join-room-confirm').addEventListener('click', () => {
    playerName = document.getElementById('player-name').value;
    joinRoom();
});

document.getElementById('back-to-menu').addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('back-to-online').addEventListener('click', () => {
    showScreen('online-menu');
});

document.getElementById('cancel-room').addEventListener('click', () => {
    if (socket && currentRoom) {
        socket.disconnect();
        socket = null;
        currentRoom = null;
    }
    showScreen('online-menu');
});

// Modified return to menu function
function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    isOnlineMode = false;
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (socket) {
        socket.disconnect();
        socket = null;
        currentRoom = null;
        playerNumber = null;
    }
    
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}