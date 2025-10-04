const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuración para producción
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

const io = socketIo(server, {
    cors: {
        origin: isDev ? "*" : false,
        methods: ["GET", "POST"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// Middleware
if (isDev) {
    app.use(cors());
}

// Security headers for production
if (!isDev) {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}

app.use(express.static(path.join(__dirname), {
    maxAge: isDev ? 0 : '1d',
    etag: !isDev
}));

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state management
class GameRoom {
    constructor(roomId, hostId) {
        this.roomId = roomId;
        this.hostId = hostId;
        this.players = {};
        this.gameState = {
            ball: {
                x: 400,
                y: 200,
                dx: 4,
                dy: 4,
                radius: 8,
                speed: 4
            },
            paddles: {
                player1: { x: 20, y: 150, width: 10, height: 100 },
                player2: { x: 770, y: 150, width: 10, height: 100 }
            },
            scores: { player1: 0, player2: 0 },
            gameRunning: false,
            gamePaused: false
        };
        this.lastUpdate = Date.now();
    }

    addPlayer(playerId, socketId) {
        if (Object.keys(this.players).length >= 2) {
            return false; // Room full
        }
        
        const playerNumber = Object.keys(this.players).length === 0 ? 'player1' : 'player2';
        this.players[playerId] = {
            socketId: socketId,
            playerNumber: playerNumber,
            ready: false
        };
        
        return playerNumber;
    }

    removePlayer(playerId) {
        delete this.players[playerId];
        this.gameState.gameRunning = false;
    }

    updatePaddle(playerId, direction) {
        const player = this.players[playerId];
        if (!player) return;
        
        const paddle = this.gameState.paddles[player.playerNumber];
        const speed = 7; // Increased speed for responsiveness
        
        if (direction === 'up') {
            paddle.y = Math.max(0, paddle.y - speed);
        } else if (direction === 'down') {
            paddle.y = Math.min(300, paddle.y + speed);
        }
        
        // Mark that this paddle was updated
        paddle.lastUpdate = Date.now();
    }

    updateBall() {
        if (!this.gameState.gameRunning || this.gameState.gamePaused) return;
        
        const ball = this.gameState.ball;
        const paddles = this.gameState.paddles;
        
        // Update ball position
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Bounce off top and bottom walls
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= 400) {
            ball.dy = -ball.dy;
        }
        
        // Check paddle collisions
        // Player 1 paddle collision
        if (ball.x - ball.radius <= paddles.player1.x + paddles.player1.width &&
            ball.x - ball.radius >= paddles.player1.x &&
            ball.y >= paddles.player1.y &&
            ball.y <= paddles.player1.y + paddles.player1.height &&
            ball.dx < 0) {
            
            ball.dx = -ball.dx;
            ball.speed += 0.3;
            ball.dx = ball.dx > 0 ? ball.speed : -ball.speed;
            
            // Add angle based on hit position
            const hitPos = (ball.y - (paddles.player1.y + paddles.player1.height / 2)) / (paddles.player1.height / 2);
            ball.dy = hitPos * ball.speed * 0.5;
        }
        
        // Player 2 paddle collision
        if (ball.x + ball.radius >= paddles.player2.x &&
            ball.x + ball.radius <= paddles.player2.x + paddles.player2.width &&
            ball.y >= paddles.player2.y &&
            ball.y <= paddles.player2.y + paddles.player2.height &&
            ball.dx > 0) {
            
            ball.dx = -ball.dx;
            ball.speed += 0.3;
            ball.dx = ball.dx > 0 ? ball.speed : -ball.speed;
            
            // Add angle based on hit position
            const hitPos = (ball.y - (paddles.player2.y + paddles.player2.height / 2)) / (paddles.player2.height / 2);
            ball.dy = hitPos * ball.speed * 0.5;
        }
        
        // Check for scoring
        if (ball.x < 0) {
            this.gameState.scores.player2++;
            this.resetBall();
            return 'player2_score';
        } else if (ball.x > 800) {
            this.gameState.scores.player1++;
            this.resetBall();
            return 'player1_score';
        }
        
        return null;
    }
    
    resetBall() {
        this.gameState.ball = {
            x: 400,
            y: 200,
            dx: (Math.random() > 0.5 ? 1 : -1) * 4,
            dy: (Math.random() > 0.5 ? 1 : -1) * 4,
            radius: 8,
            speed: 4
        };
    }
    
    startGame() {
        this.gameState.gameRunning = true;
        this.gameState.gamePaused = false;
        this.resetBall();
    }
    
    pauseGame() {
        this.gameState.gamePaused = !this.gameState.gamePaused;
    }
    
    isFull() {
        return Object.keys(this.players).length >= 2;
    }
    
    isEmpty() {
        return Object.keys(this.players).length === 0;
    }
}

// Store active rooms
const gameRooms = new Map();

// Generate random room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    // Create room
    socket.on('create_room', (playerName) => {
        const roomId = generateRoomId();
        const room = new GameRoom(roomId, socket.id);
        gameRooms.set(roomId, room);
        
        const playerNumber = room.addPlayer(socket.id, socket.id);
        socket.join(roomId);
        
        socket.emit('room_created', {
            roomId: roomId,
            playerNumber: playerNumber,
            playerName: playerName
        });
        
        console.log(`Sala creada: ${roomId} por ${playerName}`);
    });
    
    // Join room
    socket.on('join_room', (data) => {
        const { roomId, playerName } = data;
        const room = gameRooms.get(roomId);
        
        if (!room) {
            socket.emit('join_error', 'Sala no encontrada');
            return;
        }
        
        if (room.isFull()) {
            socket.emit('join_error', 'Sala llena');
            return;
        }
        
        const playerNumber = room.addPlayer(socket.id, socket.id);
        socket.join(roomId);
        
        socket.emit('room_joined', {
            roomId: roomId,
            playerNumber: playerNumber,
            playerName: playerName
        });
        
        // Notify other players
        socket.to(roomId).emit('player_joined', {
            playerName: playerName,
            playerNumber: playerNumber
        });
        
        // If room is full, notify both players
        if (room.isFull()) {
            io.to(roomId).emit('room_ready');
        }
        
        console.log(`${playerName} se unió a la sala: ${roomId}`);
    });
    
    // Start game
    socket.on('start_game', (roomId) => {
        const room = gameRooms.get(roomId);
        if (room && room.isFull()) {
            room.startGame();
            io.to(roomId).emit('game_started');
            
            // Optimized game loop for this room
            let lastBallUpdate = Date.now();
            const gameInterval = setInterval(() => {
                if (!gameRooms.has(roomId) || room.isEmpty()) {
                    clearInterval(gameInterval);
                    return;
                }
                
                const now = Date.now();
                
                // Update ball less frequently for better performance
                if (now - lastBallUpdate >= 16) { // ~60 FPS for ball
                    const scoreEvent = room.updateBall();
                    lastBallUpdate = now;
                    
                    if (scoreEvent) {
                        io.to(roomId).emit('score_update', room.gameState.scores);
                    }
                }
                
                // Send game state updates
                io.to(roomId).emit('game_update', {
                    ball: room.gameState.ball,
                    paddles: room.gameState.paddles,
                    timestamp: now
                });
                
            }, 16); // ~60 FPS
        }
    });
    
    // Handle player input with throttling
    let inputCooldowns = new Map();
    
    socket.on('player_input', (data) => {
        const { roomId, direction } = data;
        const room = gameRooms.get(roomId);
        
        if (room) {
            // Throttle input to prevent spam
            const now = Date.now();
            const lastInput = inputCooldowns.get(socket.id) || 0;
            
            if (now - lastInput >= 10) { // 100 updates per second max
                room.updatePaddle(socket.id, direction);
                inputCooldowns.set(socket.id, now);
                
                // Immediately broadcast paddle update for responsiveness
                const player = room.players[socket.id];
                if (player) {
                    const paddleUpdate = {
                        playerNumber: player.playerNumber,
                        y: room.gameState.paddles[player.playerNumber].y,
                        timestamp: now
                    };
                    io.to(roomId).emit('paddle_update', paddleUpdate);
                }
            }
        }
    });
    
    // Pause game
    socket.on('pause_game', (roomId) => {
        const room = gameRooms.get(roomId);
        if (room) {
            room.pauseGame();
            io.to(roomId).emit('game_paused', room.gameState.gamePaused);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        
        // Remove player from all rooms
        for (const [roomId, room] of gameRooms.entries()) {
            if (room.players[socket.id]) {
                room.removePlayer(socket.id);
                socket.to(roomId).emit('player_disconnected');
                
                // Remove empty rooms
                if (room.isEmpty()) {
                    gameRooms.delete(roomId);
                    console.log(`Sala eliminada: ${roomId}`);
                }
                break;
            }
        }
    });
    
    // Get room list
    socket.on('get_rooms', () => {
        const availableRooms = [];
        for (const [roomId, room] of gameRooms.entries()) {
            if (!room.isFull()) {
                availableRooms.push({
                    roomId: roomId,
                    players: Object.keys(room.players).length
                });
            }
        }
        socket.emit('rooms_list', availableRooms);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

server.listen(PORT, () => {
    console.log(`🎮 Servidor Pong ejecutándose en puerto ${PORT}`);
    if (isDev) {
        console.log(`🌐 Accede al juego en: http://localhost:${PORT}`);
    } else {
        console.log(`🌐 Servidor en producción corriendo correctamente`);
    }
});