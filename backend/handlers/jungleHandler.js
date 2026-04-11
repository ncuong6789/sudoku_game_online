const { EVENTS } = require('../utils/constants');
const { getBestMove, getMoveSuggestions } = require('./jungleAI');

/**
 * Jungle Chess (Cờ Thú) Handler
 * Board: 7 columns x 9 rows
 * Animals: 1:Rat, 2:Cat, 3:Dog, 4:Wolf, 5:Leopard, 6:Tiger, 7:Lion, 8:Elephant
 */

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 9;

const INITIAL_PIECES = [
    // Player 1 (Bottom, ID: 0)
    { type: 7, x: 0, y: 0, owner: 0 }, // Lion
    { type: 6, x: 6, y: 0, owner: 0 }, // Tiger
    { type: 3, x: 1, y: 1, owner: 0 }, // Dog
    { type: 2, x: 5, y: 1, owner: 0 }, // Cat
    { type: 1, x: 0, y: 2, owner: 0 }, // Rat
    { type: 5, x: 2, y: 2, owner: 0 }, // Leopard
    { type: 4, x: 4, y: 2, owner: 0 }, // Wolf
    { type: 8, x: 6, y: 2, owner: 0 }, // Elephant

    // Player 2 (Top, ID: 1)
    { type: 6, x: 0, y: 8, owner: 1 }, // Tiger
    { type: 7, x: 6, y: 8, owner: 1 }, // Lion
    { type: 2, x: 1, y: 7, owner: 1 }, // Cat
    { type: 3, x: 5, y: 7, owner: 1 }, // Dog
    { type: 8, x: 0, y: 6, owner: 1 }, // Elephant
    { type: 4, x: 2, y: 6, owner: 1 }, // Wolf
    { type: 5, x: 4, y: 6, owner: 1 }, // Leopard
    { type: 1, x: 6, y: 6, owner: 1 }, // Rat
];

const RIVERS = [
    { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
];

const TRAPS = [
    { x: 2, y: 0, owner: 0 }, { x: 4, y: 0, owner: 0 }, { x: 3, y: 1, owner: 0 },
    { x: 2, y: 8, owner: 1 }, { x: 4, y: 8, owner: 1 }, { x: 3, y: 7, owner: 1 }
];

const DENS = [
    { x: 3, y: 0, owner: 0 },
    { x: 3, y: 8, owner: 1 }
];

function isRiver(x, y) {
    return RIVERS.some(r => r.x === x && r.y === y);
}

function getTrapOwner(x, y) {
    const trap = TRAPS.find(t => t.x === x && t.y === y);
    return trap ? trap.owner : null;
}

const jungleHandler = (io, socket, roomManager) => {
    
    socket.on(EVENTS.START_JUNGLE_GAME, ({ roomId, mode, difficulty }) => {
        const rooms = roomManager.getAllRooms();
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        let room = rooms[actualRoomId];
        
        // Auto-initialize unique local room for Solo play if it doesn't exist
        if (!room && actualRoomId.startsWith('local_')) {
            socket.join(actualRoomId);
            rooms[actualRoomId] = {
                id: actualRoomId,
                gameType: 'jungle',
                players: [socket.id],
                mode: 'solo'
            };
            room = rooms[actualRoomId];
        }

        if (room && room.gameType === 'jungle') {
            socket.join(actualRoomId); // Ensure socket is in room
            const p1Id = room.players[0];
            const p2Id = mode === 'solo' ? 'CPU' : room.players[1];

            if (mode === 'solo' && !room.players.includes('CPU')) {
                room.players.push('CPU');
            }

            if (!room.jungleState || room.jungleState.status !== 'playing') {
                room.mode = mode || 'multiplayer';
                room.difficulty = difficulty || 'medium';
                room.jungleState = {
                    status: 'playing',
                    turn: p1Id,
                    pieces: JSON.parse(JSON.stringify(INITIAL_PIECES)).map(p => ({
                        ...p,
                        ownerId: p.owner === 0 ? p1Id : p2Id
                    }))
                };
            }

            io.to(actualRoomId).emit(EVENTS.JUNGLE_GAME_STARTED, {
                roomId: actualRoomId,
                turn: room.jungleState.turn,
                pieces: room.jungleState.pieces
            });

            if (room.mode === 'solo' && room.jungleState.turn === 'CPU') {
                handleAIMove(actualRoomId, io, roomManager);
            }
        }
    });

    function handleAIMove(roomId, io, roomManager) {
        const room = roomManager.getAllRooms()[roomId];
        if (!room || !room.jungleState || room.jungleState.status !== 'playing') return;

        const state = room.jungleState;
        const aiId = 'CPU';
        const oppId = room.players[0];

        setTimeout(() => {
            const bestMove = jungleAI.getBestMove(
                state.pieces, 
                aiId, 
                oppId, 
                1, // P2 Type
                0, // P1 Type
                room.difficulty
            );

            if (bestMove) {
                processMove(roomId, io, roomManager, aiId, bestMove.from, bestMove.to);
            }
        }, 1000);
    }

    function processMove(roomId, io, roomManager, playerId, from, to) {
        const rooms = roomManager.getAllRooms();
        const room = rooms[roomId];
        if (!room || !room.jungleState || room.jungleState.status !== 'playing') return;

        const state = room.jungleState;
        if (playerId !== state.turn) return;

        const piece = state.pieces.find(p => p.x === from.x && p.y === from.y);
        if (!piece || piece.ownerId !== playerId) return;

        // Validation
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        const distance = dx + dy;
        let validMove = false;

        if (distance === 1) {
            if (!isRiver(to.x, to.y) || piece.type === 1) validMove = true;
        } else if ((piece.type === 6 || piece.type === 7) && ((dx === 3 && dy === 0) || (dx === 0 && dy === 4))) {
            const isHorizontal = dx === 3;
            let blocked = false;
            if (isHorizontal) {
                for (let x = Math.min(from.x, to.x) + 1; x < Math.max(from.x, to.x); x++) {
                    if (!isRiver(x, from.y) || state.pieces.find(p => p.x === x && p.y === from.y)) { blocked = true; break; }
                }
            } else {
                for (let y = Math.min(from.y, to.y) + 1; y < Math.max(from.y, to.y); y++) {
                    if (!isRiver(from.x, y) || state.pieces.find(p => p.x === from.x && p.y === y)) { blocked = true; break; }
                }
            }
            if (!blocked) validMove = true;
        }

        if (!validMove) return;

        // Den/Trap/Capture Logic
        const targetDen = DENS.find(d => d.x === to.x && d.y === to.y);
        if (targetDen && targetDen.owner === piece.owner) return;

        const targetPiece = state.pieces.find(p => p.x === to.x && p.y === to.y);
        if (targetPiece) {
            if (targetPiece.ownerId === playerId) return;
            const trapOwner = getTrapOwner(to.x, to.y);
            let canCapture = false;
            if (trapOwner !== null && trapOwner !== targetPiece.owner) canCapture = true;
            else if (piece.type === 1 && targetPiece.type === 8 && !isRiver(from.x, from.y)) canCapture = true;
            else if (piece.type >= targetPiece.type && !(piece.type === 8 && targetPiece.type === 1)) {
                if (!isRiver(from.x, from.y) || isRiver(to.x, to.y)) canCapture = true; 
            }
            if (!canCapture) return;
            state.pieces = state.pieces.filter(p => p !== targetPiece);
            io.to(roomId).emit(EVENTS.JUNGLE_PIECE_CAPTURED, { 
                x: to.x, 
                y: to.y, 
                piece: targetPiece,
                attacker: piece
            });
        }

        piece.x = to.x;
        piece.y = to.y;

        const oppDen = DENS.find(d => d.owner !== piece.owner);
        if ((to.x === oppDen.x && to.y === oppDen.y) || state.pieces.filter(p => p.ownerId !== playerId).length === 0) {
            state.status = 'finished';
            io.to(roomId).emit(EVENTS.JUNGLE_GAME_OVER, { winner: playerId });
        } else {
            state.turn = room.players.find(id => id !== playerId);
            io.to(roomId).emit(EVENTS.JUNGLE_GAME_STATE, { pieces: state.pieces, turn: state.turn });
            if (room.mode === 'solo' && state.turn === 'CPU') handleAIMove(roomId, io, roomManager);
        }
    }

    socket.on(EVENTS.JUNGLE_MOVE_PIECE, ({ roomId, from, to }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        processMove(actualRoomId, io, roomManager, socket.id, from, to);
    });

    socket.on(EVENTS.JUNGLE_GET_HINT, ({ roomId }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        const room = roomManager.getAllRooms()[actualRoomId];
        if (!room || !room.jungleState || room.jungleState.status !== 'playing') return;
        const state = room.jungleState;
        
        const playerType = socket.id === room.players[0] ? 0 : 1;
        const suggestions = getMoveSuggestions(
            state.pieces,
            socket.id,
            playerType,
            'hard'
        );
        
        socket.emit(EVENTS.JUNGLE_HINT_RECEIVED, suggestions);
    });
};

module.exports = jungleHandler;
