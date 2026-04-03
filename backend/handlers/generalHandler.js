const { EVENTS } = require('../utils/constants');

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.CREATE_ROOM, ({ difficulty, gameType, gridSize }, callback) => {
        const roomId = roomManager.createRoomId();
        const rooms = roomManager.getAllRooms();
        rooms[roomId] = {
            id: roomId,
            players: [socket.id],
            difficulty,
            gameType: gameType || 'sudoku',
            gridSize: gridSize || 15,
            gameState: null,
            progress: {
                [socket.id]: 0
            }
        };
        socket.join(roomId);
        roomManager.broadcastStats();
        callback({ roomId });
    });

    socket.on(EVENTS.JOIN_ROOM, ({ roomId, gameType }, callback) => {
        roomId = roomId?.toUpperCase();
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            room.progress[socket.id] = 0;
            socket.join(roomId);
            io.to(roomId).emit(EVENTS.PLAYER_JOINED, { players: room.players.length });
            roomManager.broadcastStats();
            callback({ success: true, difficulty: room.difficulty, gridSize: room.gridSize, gameType: room.gameType });
        } else {
            callback({ success: false, message: 'Phòng không tồn tại hoặc đã đầy' });
        }
    });

    socket.on(EVENTS.LOOKUP_ROOM, ({ roomId }, callback) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId?.toUpperCase()];
        if (room) {
            callback({ success: true, gameType: room.gameType, gridSize: room.gridSize, difficulty: room.difficulty });
        } else {
            callback({ success: false, message: 'Mã phòng không hợp lệ hoặc đã hết hạn.' });
        }
    });

    socket.on(EVENTS.LEAVE_ROOM, (roomId) => {
        roomManager.handlePlayerLeave(socket, roomId);
    });

    socket.on(EVENTS.GET_STATS, () => {
        // Stats are broadcasted, but if actively requested, we trigger broadcast
        roomManager.broadcastStats();
    });

    // Chat
    socket.on(EVENTS.SEND_MESSAGE, (data) => {
        const rooms = roomManager.getAllRooms();
        const roomId = data.roomId || Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId || (rooms[roomId] && !roomManager.isPlayerInRoom(roomId, socket.id))) return;

        socket.to(roomId).emit(EVENTS.RECEIVE_MESSAGE, { 
            ...data,
            sender: data.sender || socket.id 
        });
    });

    // General Game Flow
    socket.on(EVENTS.START_GAME, ({ puzzle, solution }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const rooms = roomManager.getAllRooms();
        rooms[roomId].gameState = { puzzle, solution };
        io.to(roomId).emit(EVENTS.GAME_STARTED, { puzzle, solution });
    });

    socket.on(EVENTS.UPDATE_PROGRESS, (stats) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const rooms = roomManager.getAllRooms();
        if (rooms[roomId]) {
            rooms[roomId].progress[socket.id] = stats.progress;
        }
        socket.to(roomId).emit(EVENTS.OPPONENT_PROGRESS, stats);
    });

    socket.on(EVENTS.GAME_OVER, ({ won }) => {
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        if (!roomId || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        socket.to(roomId).emit(EVENTS.OPPONENT_GAME_OVER, { won });
    });
};
