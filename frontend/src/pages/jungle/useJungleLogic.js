import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';

export function useJungleLogic(roomId, mode = 'multiplayer', difficulty = 'medium', onHintReceived) {
    const [pieces, setPieces] = useState([]);
    const [turn, setTurn] = useState(null);
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [gameOver, setGameOver] = useState(null);
    const [myId, setMyId] = useState(socket.id);

    const initGame = useCallback((data) => {
        setPieces(data.pieces);
        setTurn(data.turn);
        setGameOver(null);
    }, []);

    useEffect(() => {
        const getEffectiveRoom = () => roomId === 'local' ? `local_${socket.id}` : roomId;

        const onConnect = () => {
            setMyId(socket.id);
            socket.emit(EVENTS.START_JUNGLE_GAME, { roomId: getEffectiveRoom(), mode, difficulty });
        };

        if (socket.connected) {
            setMyId(socket.id);
            socket.emit(EVENTS.START_JUNGLE_GAME, { roomId: getEffectiveRoom(), mode, difficulty });
        } else {
            socket.on('connect', onConnect);
        }

        socket.on(EVENTS.JUNGLE_GAME_STARTED, initGame);
        socket.on(EVENTS.JUNGLE_GAME_STATE, (data) => {
            setPieces(data.pieces);
            setTurn(data.turn);
        });
        socket.on(EVENTS.JUNGLE_PIECE_CAPTURED, (data) => {
            // Animation trigger could be here
        });
        socket.on(EVENTS.JUNGLE_HINT_RECEIVED, (move) => {
            if (onHintReceived) onHintReceived(move);
        });
        socket.on(EVENTS.JUNGLE_GAME_OVER, (data) => {
            setGameOver(data.winner);
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off(EVENTS.JUNGLE_GAME_STARTED);
            socket.off(EVENTS.JUNGLE_GAME_STATE);
            socket.off(EVENTS.JUNGLE_PIECE_CAPTURED);
            socket.off(EVENTS.JUNGLE_GAME_OVER);
            socket.off(EVENTS.JUNGLE_HINT_RECEIVED);
        };
    }, [roomId, mode, difficulty, initGame, onHintReceived]);

    const isRiver = (x, y) => {
        const rivers = [
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
            { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
            { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
        ];
        return rivers.some(r => r.x === x && r.y === y);
    };

    const getValidMoves = (piece) => {
        const moves = [];
        const directions = [{x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 0}, {x: -1, y: 0}];

        directions.forEach(d => {
            let nx = piece.x + d.x;
            let ny = piece.y + d.y;

            if (nx < 0 || nx >= 7 || ny < 0 || ny >= 9) return;

            // 1. Lion & Tiger jumping
            if ((piece.type === 6 || piece.type === 7) && isRiver(nx, ny)) {
                while (isRiver(nx, ny)) {
                    nx += d.x;
                    ny += d.y;
                }
                // Check if any Rat is in the way in the river
                let blocked = false;
                let tx = piece.x + d.x, ty = piece.y + d.y;
                while (tx !== nx || ty !== ny) {
                    if (pieces.find(p => p.x === tx && p.y === ty && p.type === 1)) {
                        blocked = true;
                        break;
                    }
                    tx += d.x; ty += d.y;
                }
                if (blocked) return;
            }

            // 2. River entry for non-rats
            if (isRiver(nx, ny) && piece.type !== 1) return;

            // 3. Den constraint
            const myDen = piece.owner === 0 ? { x: 3, y: 0 } : { x: 3, y: 8 };
            if (nx === myDen.x && ny === myDen.y) return;

            // 4. Capture rules
            const target = pieces.find(p => p.x === nx && p.y === ny);
            if (target) {
                if (target.ownerId === myId) return; // Own piece
                
                // Rat in water cannot capture piece on land
                if (isRiver(piece.x, piece.y) && !isRiver(nx, ny)) return;

                // Trap logic (Simplified, backend handles final)
                const oppTrap = piece.owner === 0 
                    ? [{x:2,y:8},{x:4,y:8},{x:3,y:7}] 
                    : [{x:2,y:0},{x:4,y:0},{x:3,y:1}];
                const isOppInTrap = oppTrap.some(t => t.x === nx && t.y === ny);

                if (!isOppInTrap) {
                    if (piece.type === 1 && target.type === 8) {
                        // Rat vs Elephant
                    } else if (piece.type === 8 && target.type === 1) {
                        return; // Elephant cannot eat Rat
                    } else if (piece.type < target.type) {
                        return;
                    }
                }
            }

            moves.push({ x: nx, y: ny });
        });

        return moves;
    };

    const handleSelect = (x, y) => {
        if (turn !== myId || gameOver) return;

        const piece = pieces.find(p => p.x === x && p.y === y);
        
        if (piece && piece.ownerId === myId) {
            setSelectedPiece(piece);
            setValidMoves(getValidMoves(piece));
        } else if (selectedPiece) {
            const isMoveValid = validMoves.some(m => m.x === x && m.y === y);
            if (isMoveValid) {
                socket.emit(EVENTS.JUNGLE_MOVE_PIECE, {
                    roomId,
                    from: { x: selectedPiece.x, y: selectedPiece.y },
                    to: { x, y }
                });
                setSelectedPiece(null);
                setValidMoves([]);
            } else {
                setSelectedPiece(null);
                setValidMoves([]);
            }
        }
    };

    return {
        pieces,
        turn,
        selectedPiece,
        validMoves,
        gameOver,
        handleSelect,
        myId
    };
}
