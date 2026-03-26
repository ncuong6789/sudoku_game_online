import { useState, useEffect, useCallback, useRef } from 'react';

export const TETROMINOES = {
    0: { shape: [[0]], color: 'transparent' }, // Empty
    I: { shape: [[0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0], [0, 'I', 0, 0]], color: '#00f0f0' }, // Cyan
    J: { shape: [[0, 'J', 0], [0, 'J', 0], ['J', 'J', 0]], color: '#0000f0' }, // Blue
    L: { shape: [[0, 'L', 0], [0, 'L', 0], [0, 'L', 'L']], color: '#f0a000' }, // Orange
    O: { shape: [['O', 'O'], ['O', 'O']], color: '#f0f000' }, // Yellow
    S: { shape: [[0, 'S', 'S'], ['S', 'S', 0], [0, 0, 0]], color: '#00f000' }, // Green
    T: { shape: [[0, 0, 0], ['T', 'T', 'T'], [0, 'T', 0]], color: '#a000f0' }, // Purple
    Z: { shape: [['Z', 'Z', 0], [0, 'Z', 'Z'], [0, 0, 0]], color: '#f00000' }  // Red
};
// Simple array for random generation
export const PIECES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// Better shapes for rotation center
const SHAPES = {
    I: [[0,0,0,0],['I','I','I','I'],[0,0,0,0],[0,0,0,0]],
    J: [['J',0,0],['J','J','J'],[0,0,0]],
    L: [[0,0,'L'],['L','L','L'],[0,0,0]],
    O: [['O','O'],['O','O']],
    S: [[0,'S','S'],['S','S',0],[0,0,0]],
    T: [[0,'T',0],['T','T','T'],[0,0,0]],
    Z: [['Z','Z',0],[0,'Z','Z'],[0,0,0]]
}

export const STAGE_WIDTH = 10;
export const STAGE_HEIGHT = 20;

export const createStage = () =>
    Array.from(Array(STAGE_HEIGHT), () => Array(STAGE_WIDTH).fill([0, 'clear']));

const randomPiece = () => PIECES[Math.floor(Math.random() * PIECES.length)];

export const useTetris = (initialPieceSequence = [], difficulty = 'Medium') => {
    const [stage, setStage] = useState(createStage());
    const [dropTime, setDropTime] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [rows, setRows] = useState(0);
    const [level, setLevel] = useState(0);

    const [player, setPlayer] = useState({
        pos: { x: 0, y: 0 },
        tetromino: SHAPES['I'], // Just a placeholder
        collided: false,
    });
    
    // Manage piece queue
    const pieceSequenceRef = useRef([...initialPieceSequence]);
    const nextPiecesRef = useRef([]);

    const getNextPieceType = useCallback(() => {
        if (pieceSequenceRef.current.length > 0) {
            return pieceSequenceRef.current.shift();
        }
        return randomPiece(); // Fallback in Solo mode
    }, []);

    const [nextPieces, setNextPieces] = useState([]);

    const pullNextPiece = useCallback(() => {
        if (nextPiecesRef.current.length === 0) {
            nextPiecesRef.current = [getNextPieceType(), getNextPieceType(), getNextPieceType()];
        }
        const type = nextPiecesRef.current.shift();
        nextPiecesRef.current.push(getNextPieceType());
        setNextPieces([...nextPiecesRef.current]);
        return type;
    }, [getNextPieceType]);

    const getBaseDropTime = () => {
        switch(difficulty) {
            case 'Easy': return 1000;
            case 'Hard': return 500;
            default: return 800;
        }
    }

    const resetPlayer = useCallback(() => {
        const type = pullNextPiece();
        // Căn giữa, tuỳ vào shape width
        const tetroWidth = SHAPES[type][0].length;
        setPlayer({
            pos: { x: Math.floor((STAGE_WIDTH - tetroWidth) / 2), y: 0 },
            tetromino: SHAPES[type],
            collided: false,
        });
    }, [pullNextPiece]);

    const startGame = useCallback(() => {
        // Reset everything
        setStage(createStage());
        setDropTime(getBaseDropTime());
        setScore(0);
        setLevel(0);
        setRows(0);
        setGameOver(false);
        pieceSequenceRef.current = [...initialPieceSequence];
        nextPiecesRef.current = [getNextPieceType(), getNextPieceType(), getNextPieceType()];
        setNextPieces([...nextPiecesRef.current]);
        resetPlayer();
    }, [initialPieceSequence, getNextPieceType, difficulty, resetPlayer]);

    const checkCollision = (player, stage, { x: moveX, y: moveY }) => {
        for (let y = 0; y < player.tetromino.length; y += 1) {
            for (let x = 0; x < player.tetromino[y].length; x += 1) {
                // Check that we're on an actual cell
                if (player.tetromino[y][x] !== 0) {
                    if (
                        // Check y boundaries (bottom)
                        !stage[y + player.pos.y + moveY] ||
                        // Check x boundaries
                        !stage[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
                        // Check cell isn't set to 'merged'
                        stage[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !== 'clear'
                    ) {
                        return true; // Collided
                    }
                }
            }
        }
        return false;
    };

    const updatePlayerPos = ({ x, y, collided }) => {
        setPlayer(prev => ({
            ...prev,
            pos: { x: (prev.pos.x + x), y: (prev.pos.y + y) },
            collided,
        }));
    };

    const drop = () => {
        // Increase level every 10 rows
        if (rows > (level + 1) * 10) {
            setLevel(prev => prev + 1);
            setDropTime(getBaseDropTime() / (level + 1.2)); // increase speed
        }

        if (!checkCollision(player, stage, { x: 0, y: 1 })) {
            updatePlayerPos({ x: 0, y: 1, collided: false });
        } else {
            // Game Over
            if (player.pos.y < 1) {
                setGameOver(true);
                setDropTime(null);
            }
            updatePlayerPos({ x: 0, y: 0, collided: true }); // Locks the piece
        }
    };

    const dropPlayer = () => {
        setDropTime(null);
        drop();
    };

    const movePlayer = dir => {
        if (!checkCollision(player, stage, { x: dir, y: 0 })) {
            updatePlayerPos({ x: dir, y: 0 });
        }
    };

    const rotate = (matrix, dir) => {
        // Transpose
        const rotatedTetro = matrix.map((_, index) => matrix.map(col => col[index]));
        // Reverse
        if (dir > 0) return rotatedTetro.map(row => row.reverse());
        return rotatedTetro.reverse();
    };

    const playerRotate = (stage, dir) => {
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

        // Wall kick logic
        const pos = clonedPlayer.pos.x;
        let offset = 1;
        while (checkCollision(clonedPlayer, stage, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            // Back out if too many attempts
            if (offset > clonedPlayer.tetromino[0].length) {
                rotate(clonedPlayer.tetromino, -dir); // Rotate back
                clonedPlayer.pos.x = pos; // Reset pos
                return;
            }
        }

        setPlayer(clonedPlayer);
    };

    const hardDrop = () => {
        setDropTime(null);
        let curPlayer = player;
        let dist = 0;
        while(!checkCollision(curPlayer, stage, {x:0, y:1})) {
            curPlayer = { ...curPlayer, pos: { x: curPlayer.pos.x, y: curPlayer.pos.y + 1}};
            dist++;
        }
        if(dist > 0) {
            updatePlayerPos({x:0, y:dist, collided: true});
        } else {
            updatePlayerPos({x:0, y:0, collided: true}); // lock immediately
        }
    };

    // Update Stage Hook
    useEffect(() => {
        let rowsCleared = 0;

        const sweepRows = newStage => {
            return newStage.reduce((ack, row) => {
                if (row.findIndex(cell => cell[0] === 0) === -1) {
                    rowsCleared += 1;
                    ack.unshift(new Array(STAGE_WIDTH).fill([0, 'clear'])); // Add empty row to top
                    return ack;
                }
                ack.push(row);
                return ack;
            }, []);
        };

        const updateStage = prevStage => {
            // First flush the stage from previous player pos
            const newStage = prevStage.map(row =>
                row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell))
            );

            // Draw tetro
            player.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        newStage[y + player.pos.y][x + player.pos.x] = [
                            value,
                            player.collided ? 'merged' : 'clear',
                        ];
                    }
                });
            });

            // Check if collided
            if (player.collided) {
                resetPlayer();
                const clearedStage = sweepRows(newStage);
                return clearedStage;
            }

            return newStage;
        };

        if(player.tetromino[0] && player.tetromino[0][0] !== undefined) {
            setStage(prev => updateStage(prev));
        }

        if (rowsCleared > 0) {
            const linePoints = [40, 100, 300, 1200];
            setScore(prev => prev + linePoints[rowsCleared - 1] * (level + 1));
            setRows(prev => prev + rowsCleared);
        }
    }, [player, resetPlayer, level]); // Dependency updates stage when player state changes

    // Custom useInterval internally to avoid re-renders resetting it
    const savedDrop = useRef();
    useEffect(() => {
        savedDrop.current = drop;
    }); // update ref on every render!
    
    useEffect(() => {
        if (dropTime !== null && !gameOver) {
            const id = setInterval(() => {
                if (savedDrop.current) savedDrop.current();
            }, dropTime);
            return () => {
                clearInterval(id);
            };
        }
    }, [dropTime, gameOver]);

    const resumeDrop = () => {
        if (!gameOver) {
            setDropTime(getBaseDropTime() / (level + 1.2));
        }
    };

    return { 
        stage, nextPieces, score, rows, level, gameOver, 
        startGame, movePlayer, dropPlayer, playerRotate, hardDrop, resumeDrop, 
        setGameOver // Expose for forcing game over
    };
};
