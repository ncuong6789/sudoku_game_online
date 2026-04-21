/**
 * pikachuHandler.js
 * Server-side Socket.IO handler cho Pikachu Onet Online 2-player.
 *
 * Màu sắc:
 *   - Người chơi tự nhìn mình = ĐỎ  (#ef4444)
 *   - Đối thủ (nhìn từ client) = XANH DƯƠNG (#38bdf8)
 *   Server phân công: player[0] nhận myColor='red', player[1] nhận myColor='red' cả 2 —
 *   nhưng server gán playerColors[socketId] = 'red' (first) | 'blue' (second).
 *   Client nhận myColor rồi tự map: myColor→red, opponentColor→blue (và ngược lại).
 *   THỰC TẾ: Server chỉ cần gửi myColor cho từng socket —
 *     player[0] → myColor: 'red', player[1] → myColor: 'red'  (cả 2 đều thấy mình màu đỏ)
 *   Còn khi broadcast tileSelected, server gửi kèm colorCode của người đang chọn.
 *   Client nếu colorCode === myOwnColor → bỏ qua (là của mình), còn lại → hiển thị màu xanh dương.
 */

const { EVENTS } = require('../utils/constants');
const {
    generateInitialBoard,
    findPath,
    hasValidPair,
    shuffleBoard,
    checkAndFixDeadlock,
    removePair,
} = require('../utils/pikachuGameLogic');

const HINTS_PER_PLAYER = 3;
const SHUFFLE_TIMEOUT_MS = 15000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoomId(socket) {
    return Array.from(socket.rooms).find(r => r !== socket.id);
}

function buildInitialPikachuState(playerIds) {
    const { board } = checkAndFixDeadlock(generateInitialBoard());
    const [p0, p1] = playerIds;
    return {
        status: 'playing',
        board,
        scores: { [p0]: 0, [p1]: 0 },
        hints: { [p0]: HINTS_PER_PLAYER, [p1]: HINTS_PER_PLAYER },
        selectedTiles: { [p0]: null, [p1]: null },
        // colorCodes: p0 = 'red0', p1 = 'red1' — both see themselves as red
        // We use socketId as color tag so client distinguishes own vs opponent
        playerIds,
        shuffleVotes: null, // { requestedBy, votes: {p0: bool|null, p1: bool|null}, timeoutId }
    };
}

function getOpponent(state, socketId) {
    return state.playerIds.find(id => id !== socketId);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

module.exports = (io, socket, roomManager) => {

    // ── START GAME ────────────────────────────────────────────────────────────
    socket.on(EVENTS.PIKACHU_START_GAME, ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.players.length < 2) return;
        if (!roomManager.isPlayerInRoom(roomId, socket.id)) return;
        // Only host (first player) triggers start
        if (room.players[0] !== socket.id) return;
        if (room.pikachuState && room.pikachuState.status === 'playing') return;

        const state = buildInitialPikachuState(room.players);
        room.pikachuState = state;
        room.gameType = 'pikachu';

        // Send each player their own color assignment
        // Both players see THEMSELVES as red → myColor = 'red'
        // The opponent distinction is done via socketId tag on events
        const [p0, p1] = room.players;
        io.to(p0).emit(EVENTS.PIKACHU_GAME_STARTED, {
            board: state.board,
            myColor: 'red',        // always see yourself as red
            mySocketId: p0,
            opponentSocketId: p1,
            scores: state.scores,
            hints: { mine: HINTS_PER_PLAYER, opponent: HINTS_PER_PLAYER },
        });
        io.to(p1).emit(EVENTS.PIKACHU_GAME_STARTED, {
            board: state.board,
            myColor: 'red',
            mySocketId: p1,
            opponentSocketId: p0,
            scores: state.scores,
            hints: { mine: HINTS_PER_PLAYER, opponent: HINTS_PER_PLAYER },
        });
    });

    // ── SELECT TILE ───────────────────────────────────────────────────────────
    // Client gửi khi chọn ô đầu tiên (chưa có selected trước) hoặc bỏ chọn (r==c==-1)
    socket.on(EVENTS.PIKACHU_SELECT_TILE, ({ roomId, r, c }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.pikachuState) return;
        if (!roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const state = room.pikachuState;
        if (state.status !== 'playing') return;

        // Deselect intent (r === -1)
        if (r === -1) {
            state.selectedTiles[socket.id] = null;
            io.to(roomId).emit(EVENTS.PIKACHU_TILE_DESELECTED, {
                by: socket.id,
            });
            return;
        }

        const board = state.board;
        if (board[r][c] === 0) return; // empty cell

        const opponentId = getOpponent(state, socket.id);
        const opponentSel = state.selectedTiles[opponentId];

        // Block if opponent already selected this exact tile
        if (opponentSel && opponentSel.r === r && opponentSel.c === c) return;

        // If player already has a tile selected → this is their 2nd click → matchAttempt
        const mySel = state.selectedTiles[socket.id];
        if (mySel) {
            if (mySel.r === r && mySel.c === c) {
                // Clicked same tile again → deselect
                state.selectedTiles[socket.id] = null;
                io.to(roomId).emit(EVENTS.PIKACHU_TILE_DESELECTED, { by: socket.id });
                return;
            }

            // Attempt match
            const path = findPath(board, mySel, { r, c });
            if (path) {
                // Valid match!
                const newBoard = removePair(board, mySel, { r, c });
                const fixResult = checkAndFixDeadlock(newBoard);
                state.board = fixResult.board;
                state.scores[socket.id] += 10;
                state.selectedTiles[socket.id] = null;

                // If opponent had a tile selected that was just removed, deselect it
                if (opponentSel && (
                    (opponentSel.r === mySel.r && opponentSel.c === mySel.c) ||
                    (opponentSel.r === r && opponentSel.c === c)
                )) {
                    state.selectedTiles[opponentId] = null;
                }

                const payload = {
                    by: socket.id,
                    path,
                    board: state.board,
                    scores: state.scores,
                    isWin: fixResult.isWin,
                };
                io.to(roomId).emit(EVENTS.PIKACHU_MATCHED_PAIR, payload);

                // Check game over
                if (fixResult.isWin) {
                    const winnerId = state.scores[socket.id] >= state.scores[opponentId]
                        ? socket.id : opponentId;
                    state.status = 'finished';
                    setTimeout(() => {
                        io.to(roomId).emit(EVENTS.PIKACHU_GAME_OVER, {
                            scores: state.scores,
                            winnerId,
                        });
                    }, 600);
                }
            } else {
                // Invalid pair
                state.selectedTiles[socket.id] = null;
                socket.emit(EVENTS.PIKACHU_MATCH_FAILED, { r1: mySel.r, c1: mySel.c, r2: r, c2: c });
                io.to(roomId).emit(EVENTS.PIKACHU_TILE_DESELECTED, { by: socket.id });
            }
        } else {
            // First tile selection
            state.selectedTiles[socket.id] = { r, c };
            io.to(roomId).emit(EVENTS.PIKACHU_TILE_SELECTED, {
                by: socket.id,
                r, c,
            });
        }
    });

    // ── USE HINT ──────────────────────────────────────────────────────────────
    socket.on(EVENTS.PIKACHU_USE_HINT, ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.pikachuState) return;
        if (!roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const state = room.pikachuState;
        if (state.status !== 'playing') return;
        if (state.hints[socket.id] <= 0) return;

        const pair = hasValidPair(state.board);
        if (!pair || pair === 'win') return;

        state.hints[socket.id]--;
        // Only send hint back to the requesting player
        socket.emit(EVENTS.PIKACHU_HINT_RESULT, {
            pair,
            hintsLeft: state.hints[socket.id],
        });
        // Tell opponent that the other player used a hint (for display)
        const opponentId = getOpponent(state, socket.id);
        io.to(opponentId).emit('pikachu:opponentHintUsed', {
            opponentHintsLeft: state.hints[socket.id],
        });
    });

    // ── REQUEST SHUFFLE ───────────────────────────────────────────────────────
    socket.on(EVENTS.PIKACHU_REQUEST_SHUFFLE, ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.pikachuState) return;
        if (!roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const state = room.pikachuState;
        if (state.status !== 'playing') return;
        // Already a pending shuffle vote
        if (state.shuffleVotes) return;

        const opponentId = getOpponent(state, socket.id);
        const timeoutId = setTimeout(() => {
            if (room.pikachuState && room.pikachuState.shuffleVotes) {
                room.pikachuState.shuffleVotes = null;
                io.to(roomId).emit(EVENTS.PIKACHU_SHUFFLE_REJECTED, {
                    reason: 'timeout',
                    requestedBy: socket.id,
                });
            }
        }, SHUFFLE_TIMEOUT_MS);

        state.shuffleVotes = {
            requestedBy: socket.id,
            votes: { [socket.id]: true, [opponentId]: null },
            timeoutId,
        };

        // Notify opponent
        io.to(opponentId).emit(EVENTS.PIKACHU_SHUFFLE_REQUEST_RECEIVED, {
            requestedBy: socket.id,
            timeoutMs: SHUFFLE_TIMEOUT_MS,
        });
        // Ack to requester
        socket.emit('pikachu:shuffleRequestSent');
    });

    // ── SHUFFLE CONSENT ───────────────────────────────────────────────────────
    socket.on(EVENTS.PIKACHU_SHUFFLE_CONSENT, ({ roomId, agree }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.pikachuState) return;
        if (!roomManager.isPlayerInRoom(roomId, socket.id)) return;
        const state = room.pikachuState;
        if (!state.shuffleVotes) return;
        // Only the opponent (non-requester) can vote
        if (state.shuffleVotes.requestedBy === socket.id) return;

        clearTimeout(state.shuffleVotes.timeoutId);
        state.shuffleVotes.votes[socket.id] = agree;

        if (agree) {
            // Both agree → shuffle
            let newBoard = shuffleBoard(state.board);
            const fix = checkAndFixDeadlock(newBoard);
            state.board = fix.board;
            state.shuffleVotes = null;
            io.to(roomId).emit(EVENTS.PIKACHU_BOARD_SHUFFLED, { board: state.board });
        } else {
            state.shuffleVotes = null;
            io.to(roomId).emit(EVENTS.PIKACHU_SHUFFLE_REJECTED, {
                reason: 'declined',
                requestedBy: state.shuffleVotes?.requestedBy || socket.id,
            });
        }
    });
};
