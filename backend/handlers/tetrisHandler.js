const { EVENTS } = require('../utils/constants');

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.START_TETRIS_GAME, ({ roomId }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (room && roomManager.isPlayerInRoom(roomId, socket.id) && room.players.length >= 2) {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            const sequence = Array.from({length: 500}, () => types[Math.floor(Math.random() * types.length)]);
            io.to(roomId).emit(EVENTS.TETRIS_GAME_STARTED, { pieceSequence: sequence });
        }
    });

    socket.on(EVENTS.TETRIS_UPDATE, ({ roomId, stage, score }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id)) return;
        
        if (!room.prevScores) room.prevScores = {};
        const oldScore = room.prevScores[socket.id] || 0;
        
        if (score < oldScore) return; 
        
        const validScoreIncrease = score - oldScore;
        if (validScoreIncrease > 100000) return;
        
        if (!room.tetrisScores) room.tetrisScores = {};
        room.tetrisScores[socket.id] = score;
        room.prevScores[socket.id] = score;
        socket.to(roomId).emit(EVENTS.OPPONENT_TETRIS_UPDATE, { stage, score });
    });

    socket.on(EVENTS.TETRIS_PLAYER_LOST, ({ roomId, score }) => {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !roomManager.isPlayerInRoom(roomId, socket.id) || room.tetrisGameOverProcessed) return;
        
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

        io.to(roomId).emit(EVENTS.TETRIS_GAME_OVER_RESULT, { winner, p1Score: s1, p2Score: s2 });
    });
};
