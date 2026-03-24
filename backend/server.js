const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ difficulty }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
            id: roomId,
            players: [socket.id],
            difficulty,
            gameState: null,
            progress: {
                [socket.id]: 0
            }
        };
        socket.join(roomId);
        callback({ roomId });
    });

    socket.on('joinRoom', ({ roomId }, callback) => {
        roomId = roomId.toUpperCase();
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            room.progress[socket.id] = 0;
            socket.join(roomId);
            io.to(roomId).emit('playerJoined', { players: room.players.length });
            callback({ success: true, difficulty: room.difficulty });
        } else {
            callback({ success: false, message: 'Room not found or full' });
        }
    });

    socket.on('startGame', ({ puzzle, solution }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;
        rooms[roomId].gameState = { puzzle, solution };
        io.to(roomId).emit('gameStarted', { puzzle, solution });
    });

    socket.on('updateProgress', ({ progress }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        rooms[roomId].progress[socket.id] = progress;
        socket.to(roomId).emit('opponentProgress', progress);
    });

    socket.on('gameOver', ({ won }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId) return;

        socket.to(roomId).emit('opponentGameOver', { won });
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
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
