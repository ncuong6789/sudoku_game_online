const { EVENTS } = require('../utils/constants');
const { Chess } = require('chess.js');

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.CHESS_COLOR_SELECT, ({ roomId, color, ready }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        socket.to(roomId).emit(EVENTS.CHESS_COLOR_UPDATE, { color, ready });
        
        if (!room.chessReady) room.chessReady = {};
        room.chessReady[socket.id] = { color, ready };
    });

    socket.on(EVENTS.START_CHESS_GAME, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && roomManager.isPlayerInRoom(roomId, socket.id)) {
            const players = room.players;
            let playerColors = {}; 
            
            const c1 = room.chessReady?.[players[0]]?.color || 'random';
            const c2 = room.chessReady?.[players[1]]?.color || 'random';

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
                const isP0White = Math.random() < 0.5;
                playerColors[players[0]] = isP0White ? 'w' : 'b';
                playerColors[players[1]] = isP0White ? 'b' : 'w';
            }

            room.chessInstance = new Chess();
            io.to(roomId).emit(EVENTS.CHESS_GAME_STARTED, { playerColors });
        }
    });

    socket.on(EVENTS.CHESS_MOVE, ({ roomId, move, fen }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id) || !room.chessInstance) return;

        try {
            const moveResult = room.chessInstance.move(move);
            if (moveResult) {
                socket.to(roomId).emit(EVENTS.CHESS_MOVED, { move, fen: room.chessInstance.fen() });
            }
        } catch (e) {
            // Nước đi không hợp lệ theo backend
        }
    });
};
