const { EVENTS } = require('../utils/constants');

module.exports = (io, socket, roomManager) => {
    // Color negotiation — relay preference to opponent
    socket.on(EVENTS.XIANGQI_COLOR_SELECT, ({ roomId, color, ready }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        socket.to(roomId).emit(EVENTS.XIANGQI_COLOR_UPDATE, { color, ready });

        if (!room.xiangqiReady) room.xiangqiReady = {};
        room.xiangqiReady[socket.id] = { color, ready };
    });

    // Start game — resolve colors and broadcast
    socket.on(EVENTS.START_XIANGQI_GAME, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && roomManager.isPlayerInRoom(roomId, socket.id)) {
            const players = room.players;
            let playerColors = {};

            // color values: 'r' (red/first), 'b' (black/second), 'random'
            const c1 = room.xiangqiReady?.[players[0]]?.color || 'random';
            const c2 = room.xiangqiReady?.[players[1]]?.color || 'random';

            if (c1 === 'r' && c2 === 'b') {
                playerColors[players[0]] = 'r';
                playerColors[players[1]] = 'b';
            } else if (c1 === 'b' && c2 === 'r') {
                playerColors[players[0]] = 'b';
                playerColors[players[1]] = 'r';
            } else if (c1 === 'r' && c2 === 'random') {
                playerColors[players[0]] = 'r';
                playerColors[players[1]] = 'b';
            } else if (c1 === 'b' && c2 === 'random') {
                playerColors[players[0]] = 'b';
                playerColors[players[1]] = 'r';
            } else if (c2 === 'r' && c1 === 'random') {
                playerColors[players[1]] = 'r';
                playerColors[players[0]] = 'b';
            } else if (c2 === 'b' && c1 === 'random') {
                playerColors[players[1]] = 'b';
                playerColors[players[0]] = 'r';
            } else {
                // Both random
                const isP0Red = Math.random() < 0.5;
                playerColors[players[0]] = isP0Red ? 'r' : 'b';
                playerColors[players[1]] = isP0Red ? 'b' : 'r';
            }

            io.to(roomId).emit(EVENTS.XIANGQI_GAME_STARTED, { playerColors });
        }
    });

    // Move relay — just forward to opponent (no server-side validation for xiangqi)
    socket.on(EVENTS.XIANGQI_MOVE, ({ roomId, from, to, board }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        socket.to(roomId).emit(EVENTS.XIANGQI_MOVED, { from, to, board });
    });
};
