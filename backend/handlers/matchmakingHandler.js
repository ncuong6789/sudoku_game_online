const crypto = require('crypto');
const { EVENTS } = require('../utils/constants');
const { startSnakeGameLoop } = require('./snakeHandler');

module.exports = (io, socket, roomManager) => {
    socket.on(EVENTS.FIND_MATCH, ({ gameType, ...params }) => {
        const queues = roomManager.getMatchmakingQueues();
        for (const q in queues) {
            queues[q] = queues[q].filter(p => p.socket.id !== socket.id);
        }

        const queue = queues[gameType];
        if (!queue) return;

        if (queue.length > 0) {
            const opponent = queue.shift();
            const roomId = roomManager.createRoomId();
            const rooms = roomManager.getAllRooms();
            
            let finalGameType = gameType;
            if (gameType === 'random') {
                const types = ['sudoku', 'caro', 'chess', 'snake', 'tetris', 'tank', 'jungle'];
                finalGameType = types[Math.floor(Math.random() * types.length)];
            }

            rooms[roomId] = {
                id: roomId,
                players: [opponent.socket.id, socket.id],
                gameType: finalGameType,
                difficulty: params.difficulty || 'Medium',
                gridSize: params.gridSize || 15,
                mapSize: params.mapSize || 20,
                gameState: null,
                progress: { [opponent.socket.id]: 0, [socket.id]: 0 }
            };

            opponent.socket.join(roomId);
            socket.join(roomId);

            let matchData = { roomId, gameType: finalGameType };
            
            if (finalGameType === 'snake') {
                const mapSize = params.mapSize || 20;
                const INITIAL_SPEED = 180;
                rooms[roomId].snakeState = {
                    status: 'playing',
                    intervalId: null,
                    speed: INITIAL_SPEED,
                    deadBodies: [],
                    item: { x: Math.floor(mapSize/2), y: Math.floor(mapSize/2) },
                    goldenItem: null,
                    snakes: {
                        [opponent.socket.id]: { id: opponent.socket.id, positions: [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}], direction: {x: 1, y: 0}, nextDir: {x: 1, y: 0}, directionsQueue: [], score: 0, isDead: false, color: 'green' },
                        [socket.id]: { id: socket.id, positions: [{x: mapSize-6, y: mapSize-6}, {x: mapSize-5, y: mapSize-6}, {x: mapSize-4, y: mapSize-6}], direction: {x: -1, y: 0}, nextDir: {x: -1, y: 0}, directionsQueue: [], score: 0, isDead: false, color: 'blue' }
                    }
                };
                io.to(opponent.socket.id).emit(EVENTS.MATCH_FOUND, { ...matchData, mapSize, color: 'green' });
                io.to(socket.id).emit(EVENTS.MATCH_FOUND, { ...matchData, mapSize, color: 'blue' });
                setTimeout(() => startSnakeGameLoop(roomId, io, roomManager), 2000);
            } else {
                io.to(roomId).emit(EVENTS.MATCH_FOUND, matchData);
            }

            roomManager.broadcastStats();
        } else {
            queue.push({ socket, ...params });
            socket.emit(EVENTS.WAITING_FOR_MATCH);
        }
    });

    socket.on(EVENTS.LEAVE_MATCHMAKING, () => {
        const queues = roomManager.getMatchmakingQueues();
        for (const q in queues) {
            queues[q] = queues[q].filter(p => p.socket.id !== socket.id);
        }
    });
};
