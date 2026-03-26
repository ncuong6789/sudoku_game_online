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

const broadcastStats = () => {
    const stats = {
        sudoku: { online: 0, rooms: 0 },
        caro: { online: 0, rooms: 0 },
        chess: { online: 0, rooms: 0 }
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
        if (!roomId && !rooms[roomId]) return;
        rooms[roomId].gameState = { puzzle, solution };
        io.to(roomId).emit('gameStarted', { puzzle, solution });
    });

    socket.on('startCaroGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            io.to(roomId).emit('caroGameStarted', { gridSize: room.gridSize });
        }
    });

    socket.on('caroMove', ({ r, c, roomId, grid }) => {
        socket.to(roomId).emit('caroMoved', { r, c, grid });
    });

    // --- CHESS MULTIPLAYER LOGIC ---

    // Chat trong phòng chờ (Dùng chung cho cả Caro nếu muốn sau này)
    socket.on('sendMessage', ({ roomId, text }) => {
        socket.to(roomId).emit('receiveMessage', { text, sender: 'opponent', id: Date.now() });
    });

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

    socket.on('sendMessage', ({ message }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('receiveMessage', { 
            message, 
            sender: socket.id 
        });
    });

    socket.on('getStats', () => {
        const stats = {
            sudoku: { online: 0, rooms: 0 },
            caro: { online: 0, rooms: 0 },
            chess: { online: 0, rooms: 0 }
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

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const index = rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[roomId].players.splice(index, 1);
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
