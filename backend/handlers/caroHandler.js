const { EVENTS } = require('../utils/constants');

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.START_CARO_GAME, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && roomManager.isPlayerInRoom(roomId, socket.id) && room.players.length >= 2) {
            room.caroTurn = 1; // 1 = X; 2 = O
            room.caroGrid = Array(room.gridSize).fill(null).map(() => Array(room.gridSize).fill(0));
            io.to(room.players[0]).emit(EVENTS.CARO_GAME_STARTED, { gridSize: room.gridSize, playerSymbol: 'X' });
            io.to(room.players[1]).emit(EVENTS.CARO_GAME_STARTED, { gridSize: room.gridSize, playerSymbol: 'O' });
        }
    });

    socket.on(EVENTS.CARO_MOVE, ({ r, c, roomId, grid }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        
        const playerSymbol = room.players[0] === socket.id ? 1 : 2;
        if (room.caroTurn !== playerSymbol) return;

        if (r >= 0 && r < room.gridSize && c >= 0 && c < room.gridSize && room.caroGrid[r][c] === 0) {
            room.caroGrid[r][c] = playerSymbol;
            room.caroTurn = playerSymbol === 1 ? 2 : 1;
            socket.to(roomId).emit(EVENTS.CARO_MOVED, { r, c, grid: room.caroGrid });
        }
    });
};
