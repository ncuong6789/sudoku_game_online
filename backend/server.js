const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // We will restrict this to your Vercel URL once deployed
        methods: ['GET', 'POST']
    },
    transports: ['websocket']
});

const rooms = {};

// --- MULTIPLAYER SNAKE QUEUE & STATE ---
let snakeWaitingPlayers = []; // { socket, mapSize }
const INITIAL_SPEED = 180;
const MAX_SPEED = 60;

// Helper: Flood Fill (BFS) tìm vùng không gian mà Rắn có thể di chuyển tới
function getReachableCells(head, occupiedSet, mapSize) {
    const queue = [head];
    const reachable = new Set();
    const visited = new Set();
    visited.add(`${head.x},${head.y}`);

    const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];

    while (queue.length > 0) {
        const curr = queue.shift();
        for (const dir of dirs) {
            const nx = curr.x + dir.x;
            const ny = curr.y + dir.y;
            const key = `${nx},${ny}`;

            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupiedSet.has(key) && !visited.has(key)) {
                visited.add(key);
                reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return Array.from(reachable).map(str => {
        const [x, y] = str.split(',').map(Number);
        return { x, y };
    });
}

function spawnItemIntelligently(snakePositions, deadBodies, mapSize) {
    const occupiedSet = new Set();
    snakePositions.forEach(p => occupiedSet.add(`${p.x},${p.y}`));
    deadBodies.forEach(p => occupiedSet.add(`${p.x},${p.y}`));

    if (snakePositions.length === 0) return {x: 0, y: 0};
    const head = snakePositions[0];
    const reachableEmptyCells = getReachableCells(head, occupiedSet, mapSize);

    if (reachableEmptyCells.length > 0) {
        return reachableEmptyCells[Math.floor(Math.random() * reachableEmptyCells.length)];
    } else {
        const allEmpty = [];
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                if (!occupiedSet.has(`${x},${y}`)) allEmpty.push({x, y});
            }
        }
        if (allEmpty.length > 0) return allEmpty[Math.floor(Math.random() * allEmpty.length)];
        return { x: 0, y: 0 };
    }
}

const broadcastStats = () => {
    const stats = {
        sudoku: { online: 0, rooms: 0 },
        caro: { online: 0, rooms: 0 },
        chess: { online: 0, rooms: 0 },
        snake: { online: 0, rooms: 0 }
    };
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const gameType = room.gameType || 'sudoku';
        if (stats[gameType]) {
            stats[gameType].rooms++;
            stats[gameType].online += room.players.length;
        }
    }
    io.emit('statsUpdate', stats);
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ difficulty, gameType, gridSize }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
            id: roomId,
            players: [socket.id],
            difficulty,
            gameType: gameType || 'sudoku',
            gridSize: gridSize || 15, // Added gridSize here
            gameState: null,
            progress: {
                [socket.id]: 0
            }
        };
        socket.join(roomId);
        broadcastStats();
        callback({ roomId });
    });

    socket.on('joinRoom', ({ roomId, gameType }, callback) => {
        roomId = roomId.toUpperCase();
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
            // Optional: check if gameType matches
            room.players.push(socket.id);
            room.progress[socket.id] = 0;
            socket.join(roomId);
            io.to(roomId).emit('playerJoined', { players: room.players.length });
            broadcastStats();
            callback({ success: true, difficulty: room.difficulty, gridSize: room.gridSize });
        } else {
            callback({ success: false, message: 'Phòng không tồn tại hoặc đã đầy' });
        }
    });

    socket.on('startGame', ({ puzzle, solution }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId || !rooms[roomId]) return;
        rooms[roomId].gameState = { puzzle, solution };
        io.to(roomId).emit('gameStarted', { puzzle, solution });
    });

    socket.on('startCaroGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 2) {
            io.to(room.players[0]).emit('caroGameStarted', { gridSize: room.gridSize, playerSymbol: 'X' });
            io.to(room.players[1]).emit('caroGameStarted', { gridSize: room.gridSize, playerSymbol: 'O' });
        }
    });

    socket.on('caroMove', ({ r, c, roomId, grid }) => {
        socket.to(roomId).emit('caroMoved', { r, c, grid });
    });

    // --- TETRIS LOGIC ---
    socket.on('startTetrisGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 2) {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            const sequence = Array.from({length: 500}, () => types[Math.floor(Math.random() * types.length)]);
            io.to(roomId).emit('tetrisGameStarted', { pieceSequence: sequence });
        }
    });

    socket.on('tetrisUpdate', ({ roomId, stage, score }) => {
        const room = rooms[roomId];
        if (room) {
            if (!room.tetrisScores) room.tetrisScores = {};
            room.tetrisScores[socket.id] = score;
        }
        socket.to(roomId).emit('opponentTetrisUpdate', { stage, score });
    });

    socket.on('tetrisPlayerLost', ({ roomId, score }) => {
        const room = rooms[roomId];
        if (!room || room.tetrisGameOverProcessed) return;
        
        if (!room.tetrisScores) room.tetrisScores = {};
        room.tetrisScores[socket.id] = score;

        room.tetrisGameOverProcessed = true;
        const p1 = room.players[0];
        const p2 = room.players[1];
        const s1 = room.tetrisScores[p1] || 0;
        const s2 = room.tetrisScores[p2] || 0;

        let winner = 'Draw';
        if (s1 > s2) winner = p1;
        else if (s2 > s1) winner = p2;

        io.to(roomId).emit('tetrisGameOverResult', { winner, p1Score: s1, p2Score: s2 });
    });

    // --- CHESS MULTIPLAYER LOGIC ---

    // Chat trong phòng chờ (Dùng chung cho cả Caro nếu muốn sau này)

    // Cập nhật tùy chọn màu phe
    socket.on('chessColorSelect', ({ roomId, color, ready }) => {
        socket.to(roomId).emit('chessColorUpdate', { color, ready });
        
        // Cập nhật trạng thái người chơi trong phòng (tuỳ chọn lưu lại nếu muốn backend quyết định)
        const room = rooms[roomId];
        if (room) {
            if (!room.chessReady) room.chessReady = {};
            room.chessReady[socket.id] = { color, ready };
        }
    });

    socket.on('startChessGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            // Xác định màu quân cho từng người
            const players = room.players;
            let playerColors = {}; // socket.id -> 'w' or 'b'
            
            // Lấy lựa chọn
            const c1 = room.chessReady?.[players[0]]?.color || 'random';
            const c2 = room.chessReady?.[players[1]]?.color || 'random';

            // Nếu 1 người chọn W và 1 người chọn B
            if (c1 === 'w' && c2 === 'b') {
                playerColors[players[0]] = 'w';
                playerColors[players[1]] = 'b';
            } else if (c1 === 'b' && c2 === 'w') {
                playerColors[players[0]] = 'b';
                playerColors[players[1]] = 'w';
            } else if (c1 === 'w' && c2 === 'random') {
                playerColors[players[0]] = 'w';
                playerColors[players[1]] = 'b';
            } else if (c1 === 'b' && c2 === 'random') {
                playerColors[players[0]] = 'b';
                playerColors[players[1]] = 'w';
            } else if (c2 === 'w' && c1 === 'random') {
                playerColors[players[1]] = 'w';
                playerColors[players[0]] = 'b';
            } else if (c2 === 'b' && c1 === 'random') {
                playerColors[players[1]] = 'b';
                playerColors[players[0]] = 'w';
            } else {
                // Default random phân phát
                const isP0White = Math.random() < 0.5;
                playerColors[players[0]] = isP0White ? 'w' : 'b';
                playerColors[players[1]] = isP0White ? 'b' : 'w';
            }

            io.to(roomId).emit('chessGameStarted', { playerColors });
        }
    });

    socket.on('chessMove', ({ roomId, fen }) => {
        socket.to(roomId).emit('chessMoved', { fen });
    });

    socket.on('updateProgress', (stats) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        if (rooms[roomId]) {
            rooms[roomId].progress[socket.id] = stats.progress;
        }
        socket.to(roomId).emit('opponentProgress', stats);
    });

    socket.on('gameOver', ({ won }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('opponentGameOver', { won });
    });

    socket.on('sendMessage', (data) => {
        const roomId = data.roomId || Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('receiveMessage', { 
            ...data,
            sender: data.sender || socket.id 
        });
    });

    socket.on('getStats', () => {
        const stats = {
            sudoku: { online: 0, rooms: 0 },
            caro: { online: 0, rooms: 0 },
            chess: { online: 0, rooms: 0 },
            snake: { online: 0, rooms: 0 }
        };

        for (const roomId in rooms) {
            const room = rooms[roomId];
            const gameType = room.gameType || 'sudoku';
            if (stats[gameType]) {
                stats[gameType].rooms++;
                stats[gameType].online += room.players.length;
            }
        }
        
        // Also account for solo players or players in lobby if needed, 
        // but for now, rooms + players in rooms is a good metric.
        socket.emit('statsUpdate', stats);
    });

    // --- SNAKE MULTIPLAYER LOGIC ---
    socket.on('findMatch', ({ game, mapSize }) => {
        if (game === 'snake') {
            socket.emit('waitingForMatch');
            // Check if there is someone waiting for the same mapSize
            const index = snakeWaitingPlayers.findIndex(p => p.mapSize === mapSize && p.socket.id !== socket.id);
            if (index !== -1) {
                const p1 = snakeWaitingPlayers.splice(index, 1)[0];
                const p2 = { socket, mapSize };
                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                
                rooms[roomId] = {
                    id: roomId,
                    players: [p1.socket.id, p2.socket.id],
                    gameType: 'snake',
                    mapSize: mapSize,
                    snakeState: {
                        status: 'playing',
                        intervalId: null,
                        speed: INITIAL_SPEED,
                        deadBodies: [],
                        item: { x: Math.floor(mapSize/2), y: Math.floor(mapSize/2) },
                        snakes: {
                            [p1.socket.id]: { id: p1.socket.id, positions: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: {x: 1, y: 0}, nextDir: {x: 1, y: 0}, score: 0, isDead: false, color: 'green' },
                            [p2.socket.id]: { id: p2.socket.id, positions: [{x: mapSize-6, y: mapSize-6}, {x: mapSize-5, y: mapSize-6}, {x: mapSize-4, y: mapSize-6}], direction: {x: -1, y: 0}, nextDir: {x: -1, y: 0}, score: 0, isDead: false, color: 'blue' }
                        }
                    }
                };

                p1.socket.join(roomId);
                p2.socket.join(roomId);

                p1.socket.emit('matchFound', { roomId, mapSize, color: 'green' });
                p2.socket.emit('matchFound', { roomId, mapSize, color: 'blue' });

                broadcastStats();

                // Start game loop after delay to allow client to load
                setTimeout(() => {
                    startSnakeGameLoop(roomId);
                }, 2000);
            } else {
                snakeWaitingPlayers.push({ socket, mapSize });
            }
        }
    });

    socket.on('leaveMatchmaking', () => {
        snakeWaitingPlayers = snakeWaitingPlayers.filter(p => p.socket.id !== socket.id);
    });

    socket.on('snakeChangeDirection', ({ roomId, direction }) => {
        const room = rooms[roomId];
        if (room && room.snakeState && room.snakeState.snakes[socket.id] && !room.snakeState.snakes[socket.id].isDead) {
            room.snakeState.snakes[socket.id].nextDir = direction;
        }
    });

    socket.on('startSnakeGame', ({ roomId, mapSize }) => {
        const room = rooms[roomId];
        if (room && room.players.length === 2 && room.gameType === 'snake') {
            const p1Id = room.players[0];
            const p2Id = room.players[1];
            room.mapSize = mapSize || 20;

            room.snakeState = {
                status: 'playing',
                intervalId: null,
                speed: INITIAL_SPEED,
                deadBodies: [],
                item: { x: Math.floor(room.mapSize/2), y: Math.floor(room.mapSize/2) },
                snakes: {
                    [p1Id]: { id: p1Id, positions: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: {x: 1, y: 0}, nextDir: {x: 1, y: 0}, score: 0, isDead: false, color: 'green' },
                    [p2Id]: { id: p2Id, positions: [{x: room.mapSize-6, y: room.mapSize-6}, {x: room.mapSize-5, y: room.mapSize-6}, {x: room.mapSize-4, y: room.mapSize-6}], direction: {x: -1, y: 0}, nextDir: {x: -1, y: 0}, score: 0, isDead: false, color: 'blue' }
                }
            };
            
            // Thay vì dùng matchFound (bị trùng logic với Random Queue), ta tạo event riêng
            io.to(p1Id).emit('snakeGameStarted', { roomId, mapSize: room.mapSize, color: 'green' });
            io.to(p2Id).emit('snakeGameStarted', { roomId, mapSize: room.mapSize, color: 'blue' });

            setTimeout(() => {
                startSnakeGameLoop(roomId);
            }, 2000);
        }
    });

    const startSnakeGameLoop = (roomId) => {
        const room = rooms[roomId];
        if (!room || !room.snakeState) return;

        const loop = () => {
            const state = room.snakeState;
            if (state.status === 'finished') {
                clearInterval(state.intervalId);
                return;
            }

            let someoneAte = false;
            let diedThisTurn = [];

            // Move snakes
            for (const id in state.snakes) {
                const s = state.snakes[id];
                if (s.isDead) continue;

                s.direction = s.nextDir;
                const head = s.positions[0];
                const nx = head.x + s.direction.x;
                const ny = head.y + s.direction.y;

                let died = false;
                // Wall collision
                if (nx < 0 || nx >= room.mapSize || ny < 0 || ny >= room.mapSize) died = true;
                
                // Dead body collision
                if (!died && state.deadBodies.some(b => b.x === nx && b.y === ny)) died = true;

                // Self / Other snake collision (excluding tails that will move, but simply check all for now)
                if (!died) {
                    for (const otherId in state.snakes) {
                        const otherS = state.snakes[otherId];
                        if (otherS.positions.some((seg, idx) => {
                            if (otherId === id && idx === otherS.positions.length - 1) return false; // Thả đuôi
                            return seg.x === nx && seg.y === ny;
                        })) {
                            died = true;
                            break;
                        }
                    }
                }

                if (died) {
                    diedThisTurn.push(id);
                } else {
                    const newHead = { x: nx, y: ny };
                    s.positions.unshift(newHead); // Push new head
                    
                    if (nx === state.item.x && ny === state.item.y) {
                        s.score += 1;
                        s.positions.push({ ...s.positions[s.positions.length - 1] }); // Add virtual tail to grow by 2!
                        someoneAte = true;
                    } else {
                        s.positions.pop(); // Remove tail
                    }
                }
            }

            // Process deaths
            diedThisTurn.forEach(id => {
                const s = state.snakes[id];
                s.isDead = true;
                state.deadBodies.push(...s.positions); // Hóa thành vật cản vĩnh viễn
            });

            // Process Item Spawn & Speed Up
            if (someoneAte) {
                // Find living snakes positions
                const livingPositions = [];
                for (const id in state.snakes) {
                    if (!state.snakes[id].isDead) livingPositions.push(...state.snakes[id].positions);
                }
                state.item = spawnItemIntelligently(livingPositions, state.deadBodies, room.mapSize);
                
                // Tăng tốc
                let maxScore = Math.max(...Object.values(state.snakes).map(s => s.score));
                state.speed = Math.max(MAX_SPEED, INITIAL_SPEED - maxScore * 5);
                
                // Reset interval with new speed
                clearInterval(state.intervalId);
                state.intervalId = setInterval(loop, state.speed);
            }

            // Check game over
            const deadCount = Object.values(state.snakes).filter(s => s.isDead).length;
            const totalSnakes = Object.values(state.snakes).length;
            if (deadCount > 0 || totalSnakes < 2) {
                state.status = 'finished';
                clearInterval(state.intervalId);
            }

            io.to(roomId).emit('snakeGameState', {
                snakes: state.snakes,
                deadBodies: state.deadBodies,
                item: state.item,
                status: state.status
            });
        };

        room.snakeState.intervalId = setInterval(loop, room.snakeState.speed);
    };

    socket.on('disconnect', () => {
        snakeWaitingPlayers = snakeWaitingPlayers.filter(p => p.socket.id !== socket.id); // Remove from queue

        for (const roomId in rooms) {
            const index = rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[roomId].players.splice(index, 1);
                
                if (rooms[roomId].gameType === 'snake' && rooms[roomId].snakeState && rooms[roomId].snakeState.status !== 'finished') {
                    rooms[roomId].snakeState.status = 'finished';
                    if (rooms[roomId].snakeState.intervalId) clearInterval(rooms[roomId].snakeState.intervalId);
                }

                socket.to(roomId).emit('opponentDisconnected');
                if (rooms[roomId].players.length === 0) {
                    delete rooms[roomId];
                }
                broadcastStats();
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
