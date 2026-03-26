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

    socket.on('createRoom', ({ difficulty, gameType }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
            id: roomId,
            players: [socket.id],
            difficulty,
            gameType: gameType || 'sudoku',
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
            callback({ success: true, difficulty: room.difficulty });
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
        io.to(roomId).emit('caroGameStarted');
    });

    socket.on('caroMove', ({ r, c, roomId, grid }) => {
        // Send to other player in the room
        socket.to(roomId).emit('caroUpdateMove', { 
            r, c, grid, 
            nextSymbol: grid[r][c] === 1 ? 'O' : 'X' 
        });
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
