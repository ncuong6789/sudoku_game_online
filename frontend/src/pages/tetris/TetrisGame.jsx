import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useTetris, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOES } from '../../utils/useTetris';

// A Cell component
const Cell = ({ type, cellState }) => {
    let color = 'rgba(255, 255, 255, 0.05)';
    if (type !== 0 && TETROMINOES[type]) {
        color = TETROMINOES[type].color;
    }
    return (
        <div className={cellState === 'completing' ? 'flash-row' : ''} style={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            border: `1px solid ${type === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0,0,0,0.5)'}`,
            borderRadius: '2px',
            boxShadow: type === 0 ? 'none' : `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.5)`
        }} />
    );
};

// Stage component rendering the grid
const Stage = ({ stage, isOpponent }) => (
    <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${STAGE_HEIGHT}, calc((min(70vh, 500px)) / ${STAGE_HEIGHT}))`,
        gridTemplateColumns: `repeat(${STAGE_WIDTH}, calc((min(70vh, 500px) * 0.5) / ${STAGE_WIDTH}))`,
        gridGap: '1px',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '2px',
        borderRadius: '4px',
        opacity: isOpponent ? 0.7 : 1
    }}>
        {stage.map(row => row.map((cell, x) => <Cell key={x} type={cell[0]} cellState={cell[1]} />))}
    </div>
);

// Next Piece display
const NextPiece = ({ type }) => {
    if(!type) return <div style={{width: '60px', height: '60px'}}/>;
    
    // Quick shape mappings for preview
    const shapes = {
        I: [[0,0,0,0],[1,1,1,1]],
        J: [[1,0,0],[1,1,1]],
        L: [[0,0,1],[1,1,1]],
        O: [[1,1],[1,1]],
        S: [[0,1,1],[1,1,0]],
        T: [[0,1,0],[1,1,1]],
        Z: [[1,1,0],[0,1,1]]
    };
    const shape = shapes[type] || [];
    
    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateRows: `repeat(${shape.length}, 15px)`,
            gridTemplateColumns: `repeat(${shape[0]?.length || 1}, 15px)`,
            margin: '0 auto'
        }}>
            {shape.map(row => row.map((cell, x) => (
                <div key={x} style={{
                    width: '15px', height: '15px',
                    backgroundColor: cell ? TETROMINOES[type].color : 'transparent',
                    boxShadow: cell ? `inset 1px 1px 2px rgba(255,255,255,0.3)` : 'none',
                    borderRadius: '1px'
                }} />
            )))}
        </div>
    );
};

export default function TetrisGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};
    const mode = locationState.mode || 'solo';
    const roomId = locationState.roomId;
    const difficulty = locationState.difficulty || 'Medium';
    
    // Stable reference for empty array to prevent infinite re-renders
    const defaultSeq = useRef([]);
    const pieceSequence = locationState.pieceSequence || defaultSeq.current;

    // Player hook
    const { 
        stage, nextPieces, score, rows, level, gameOver,
        startGame, movePlayer, dropPlayer, playerRotate, hardDrop, resumeDrop,
        setGameOver
    } = useTetris(pieceSequence, difficulty);

    // Opponent state
    const [opponentStage, setOpponentStage] = useState(Array.from(Array(STAGE_HEIGHT), () => Array(STAGE_WIDTH).fill([0, 'clear'])));
    const [opponentScore, setOpponentScore] = useState(0);
    const [gameResult, setGameResult] = useState(''); // 'Win', 'Lose', 'Draw'
    
    const [isStarted, setIsStarted] = useState(false);

    // Keyboard handlers
    const move = useCallback((e) => {
        const { keyCode } = e;
        if (!gameOver && isStarted) {
            if ([37, 38, 39, 40, 32].includes(keyCode)) {
                e.preventDefault();
            }
            if (keyCode === 37) {
                movePlayer(-1);
            } else if (keyCode === 39) {
                movePlayer(1);
            } else if (keyCode === 40) {
                dropPlayer();
            } else if (keyCode === 38) {
                playerRotate(stage, 1);
            } else if (keyCode === 32) {
                hardDrop();
            }
        }
    }, [gameOver, isStarted, movePlayer, dropPlayer, playerRotate, stage, hardDrop]);

    const keyUp = useCallback((e) => {
        const { keyCode } = e;
        if (!gameOver) {
            if ([37, 38, 39, 40, 32].includes(keyCode)) {
                e.preventDefault();
            }
            if (keyCode === 40) {
                resumeDrop();
            }
        }
    }, [gameOver, resumeDrop]);

    // Global listener
    useEffect(() => {
        window.addEventListener('keydown', move);
        window.addEventListener('keyup', keyUp);
        return () => {
            window.removeEventListener('keydown', move);
            window.removeEventListener('keyup', keyUp);
        };
    }, [move, keyUp]);

    // Sync to backend periodically or on score change
    useEffect(() => {
        if (mode === 'multiplayer' && isStarted) {
            socket.emit('tetrisUpdate', { roomId, stage, score });
        }
    }, [stage, score, isStarted, mode, roomId]);

    // Handle initial start
    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (!hasStartedRef.current) {
            startGame();
            setIsStarted(true);
            hasStartedRef.current = true;
        }
    }, [startGame]);

    // Listen to Opponent in Multiplayer
    useEffect(() => {
        if (mode !== 'multiplayer') return;

        socket.on('opponentTetrisUpdate', (data) => {
            setOpponentStage(data.stage);
            setOpponentScore(data.score);
        });

        socket.on('tetrisGameOverResult', (data) => {
            setGameOver(true);
            setIsStarted(false);
            if (data.winner === socket.id) {
                setGameResult('Win');
            } else if (data.winner === 'Draw') {
                setGameResult('Draw');
            } else {
                setGameResult('Lose');
            }
        });

        return () => {
            socket.off('opponentTetrisUpdate');
            socket.off('tetrisGameOverResult');
        };
    }, [mode, setGameOver]);

    // Emit GameOver state
    useEffect(() => {
        if (gameOver && mode === 'multiplayer' && !gameResult && isStarted) {
            // Tell server I topped out, let it judge based on current score
            socket.emit('tetrisPlayerLost', { roomId, score });
        }
    }, [gameOver, mode, gameResult, roomId, score, isStarted]);

    return (
        <div style={{ outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '1rem' }} tabIndex="0">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '800px', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, whiteSpace: 'nowrap', userSelect: 'none' }}>Tetris {mode === 'multiplayer' ? 'PvP' : 'Solo'}</h2>
                <button className="btn-secondary" onClick={() => navigate('/tetris')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto' }}>
                    <ArrowLeft size={16} /> Thoát
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
                
                {/* PLAYER BOARD */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>Bạn ({score})</h3>
                    <Stage stage={stage} />
                </div>

                {/* INFO PANEL (MIDDLE) */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', minWidth: '150px' }}>
                    
                    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>ĐIỂM</h4>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{score}</div>
                    </div>

                    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>KẾ TIẾP</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                            {nextPieces.map((type, idx) => (
                                <NextPiece key={idx} type={type} />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>CẤP:</span>
                        <b>{level}</b>
                    </div>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>HÀNG:</span>
                        <b>{rows}</b>
                    </div>

                    {mode === 'solo' && gameOver && (
                        <button className="btn-primary" onClick={() => startGame()} style={{ marginTop: '20px', padding: '10px', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}>
                            <RefreshCw size={16} /> Chơi lại
                        </button>
                    )}
                </div>

                {/* OPPONENT BOARD (PvP) */}
                {mode === 'multiplayer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, color: 'var(--error-color)' }}>Đối thủ ({opponentScore})</h3>
                        <Stage stage={opponentStage} isOpponent={true} />
                    </div>
                )}
            </div>

            {/* GAME OVER BANNER */}
            {gameOver && gameResult && (
                <div style={{ 
                    position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', 
                    background: 'rgba(15, 23, 42, 0.95)', padding: '3rem', borderRadius: '20px', 
                    boxShadow: '0 0 50px rgba(0,0,0,0.8)', border: `2px solid ${gameResult==='Win' ? 'var(--success-color)' : 'var(--error-color)'}`,
                    textAlign: 'center', zIndex: 100, backdropFilter: 'blur(10px)'
                }}>
                    <Trophy size={64} color={gameResult==='Win' ? '#4ade80' : '#f87171'} style={{ marginBottom: '1rem' }} />
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '3rem', color: gameResult==='Win'?'var(--success-color)':'var(--error-color)' }}>
                        {gameResult === 'Win' ? 'CHIẾN THẮNG!' : gameResult === 'Draw' ? 'HÒA' : 'THẤT BẠI'}
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Điểm của bạn: {score}</p>
                    <button className="btn-secondary" onClick={() => navigate('/tetris')} style={{ padding: '12px 24px', fontSize: '1.2rem', width: '100%' }}>
                        Rời phòng
                    </button>
                </div>
            )}
            
            {!gameResult && gameOver && mode === 'solo' && (
                <div style={{ position: 'fixed', top: '50%', background: 'rgba(239, 68, 68, 0.9)', padding: '10px 20px', borderRadius: '10px', color: 'white', fontWeight: 'bold' }}>
                    GAME OVER
                </div>
            )}
        </div>
    );
}
