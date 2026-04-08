const crypto = require('crypto');
const { EVENTS } = require('../utils/constants');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = {};
        this.matchmakingQueues = {
            sudoku: [],
            caro: [],
            chess: [],
            snake: [],
            tetris: [],
            random: []
        };
        this.statsUpdateTimeout = null;
    }

    createRoomId() {
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    isPlayerInRoom(roomId, socketId) {
        const room = this.rooms[roomId];
        return room && room.players.includes(socketId);
    }

    getRoom(roomId) {
        return this.rooms[roomId];
    }

    getAllRooms() {
        return this.rooms;
    }

    getMatchmakingQueues() {
        return this.matchmakingQueues;
    }

    broadcastStats() {
        if (this.statsUpdateTimeout) return;
        this.statsUpdateTimeout = setTimeout(() => {
            this.statsUpdateTimeout = null;
            const stats = {
                sudoku: { online: 0, rooms: 0 },
                caro: { online: 0, rooms: 0 },
                chess: { online: 0, rooms: 0 },
                snake: { online: 0, rooms: 0 },
                tetris: { online: 0, rooms: 0 }
            };
            for (const roomId in this.rooms) {
                const room = this.rooms[roomId];
                const gameType = room.gameType || 'sudoku';
                if (stats[gameType]) {
                    stats[gameType].rooms++;
                    stats[gameType].online += room.players.length;
                }
            }
            this.io.emit(EVENTS.STATS_UPDATE, stats);
        }, 1500); // Throttling
    }

    handlePlayerDisconnect(socket) {
        for (const q in this.matchmakingQueues) {
            this.matchmakingQueues[q] = this.matchmakingQueues[q].filter(p => p.socket.id !== socket.id);
        }

        for (const roomId in this.rooms) {
            const index = this.rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                this.rooms[roomId].players.splice(index, 1);
                
                if (this.rooms[roomId].gameType === 'snake' && this.rooms[roomId].snakeState && this.rooms[roomId].snakeState.status !== 'finished') {
                    this.rooms[roomId].snakeState.status = 'finished';
                    if (this.rooms[roomId].snakeState.intervalId) clearInterval(this.rooms[roomId].snakeState.intervalId);
                }

                if (this.rooms[roomId].gameType === 'tank' && this.rooms[roomId].tankState) {
                    this.rooms[roomId].tankState.status = 'finished';
                    if (this.rooms[roomId].tankState.intervalId) {
                        clearInterval(this.rooms[roomId].tankState.intervalId);
                        this.rooms[roomId].tankState.intervalId = null;
                    }
                }

                socket.to(roomId).emit(EVENTS.OPPONENT_DISCONNECTED);
                if (this.rooms[roomId].players.length === 0) {
                    delete this.rooms[roomId];
                }
                this.broadcastStats();
            }
        }
    }
    
    handlePlayerLeave(socket, roomId) {
        if (this.rooms[roomId]) {
            const index = this.rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                this.rooms[roomId].players.splice(index, 1);
                
                if (this.rooms[roomId].gameType === 'snake' && this.rooms[roomId].snakeState && this.rooms[roomId].snakeState.status !== 'finished') {
                    this.rooms[roomId].snakeState.status = 'finished';
                    if (this.rooms[roomId].snakeState.intervalId) clearInterval(this.rooms[roomId].snakeState.intervalId);
                }

                if (this.rooms[roomId].gameType === 'tank' && this.rooms[roomId].tankState) {
                    this.rooms[roomId].tankState.status = 'finished';
                    if (this.rooms[roomId].tankState.intervalId) {
                        clearInterval(this.rooms[roomId].tankState.intervalId);
                        this.rooms[roomId].tankState.intervalId = null;
                    }
                }

                socket.to(roomId).emit(EVENTS.OPPONENT_DISCONNECTED);
                socket.leave(roomId);
                
                if (this.rooms[roomId].players.length === 0) {
                    delete this.rooms[roomId];
                }
                this.broadcastStats();
            }
        }
    }
}

module.exports = RoomManager;
