import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useTetris, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOES } from '../../utils/useTetris';
import { useAudio } from '../../utils/useAudio';

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
        gridTemplateRows: `repeat(${STAGE_HEIGHT}, min(calc((100vh - 32px) / ${STAGE_HEIGHT}), 28px))`,
        gridTemplateColumns: `repeat(${STAGE_WIDTH}, min(calc((100vh - 32px) / ${STAGE_HEIGHT}), 28px))`,
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

    const { playWinSound, playLoseSound, playClearLineSound, playTetrisMoveSound, playTetrisRotateSound, playTetrisDropSound } = useAudio();

    // Player hook
    const { 
        stage, nextPieces, score, rows, level, gameOver,
        startGame, movePlayer, dropPlayer, playerRotate, hardDrop, resumeDrop,
        setGameOver
    } = useTetris(pieceSequence, difficulty, playClearLineSound);

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
                playTetrisMoveSound();
            } else if (keyCode === 39) {
                movePlayer(1);
                playTetrisMoveSound();
            } else if (keyCode === 40) {
                dropPlayer();
                playTetrisMoveSound();
            } else if (keyCode === 38) {
                playerRotate(stage, 1);
                playTetrisRotateSound();
            } else if (keyCode === 32) {
                hardDrop();
                playTetrisDropSound();
            }
        }
    }, [gameOver, isStarted, movePlayer, dropPlayer, playerRotate, stage, hardDrop, playTetrisMoveSound, playTetrisRotateSound, playTetrisDropSound]);

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

        socket.on('opponentDisconnected', () => {
            if (!gameResult && isStarted) {
                setGameOver(true);
                setIsStarted(false);
                setGameResult('Win');
                playWinSound();
            }
        });

        socket.on('tetrisGameOverResult', (data) => {
            setGameOver(true);
            setIsStarted(false);
            if (data.winner === socket.id) {
                setGameResult('Win');
                playWinSound();
            } else if (data.winner === 'Draw') {
                setGameResult('Draw');
            } else {
                setGameResult('Lose');
                playLoseSound();
            }
        });

        return () => {
            socket.off('opponentTetrisUpdate');
            socket.off('opponentDisconnected');
            socket.off('tetrisGameOverResult');
        };
    }, [mode, gameResult, isStarted, playWinSound, playLoseSound, setGameOver]);

    useEffect(() => {
        if (gameOver && mode === 'multiplayer' && !gameResult && isStarted) {
            // Tell server I topped out, let it judge based on current score
            socket.emit('tetrisPlayerLost', { roomId, score });
        }
    }, [gameOver, mode, gameResult, roomId, score, isStarted]);

    // Play Lose Sound for Solo Mode
    useEffect(() => {
        if (gameOver && mode === 'solo' && !gameResult) {
            playLoseSound();
        }
    }, [gameOver, mode, gameResult, playLoseSound]);

    useEffect(() => {
        return () => {
            if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    return (
        <div className="game-container" style={{ outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', overflow: 'hidden', padding: '0', boxSizing: 'border-box' }} tabIndex="0">
            <div className="glass-panel" style={{ 
                position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'row', 
                padding: '1rem', gap: '1.5rem', alignItems: 'center', justifyContent: 'center',
                maxHeight: '100vh', maxWidth: '100vw',
            }}>
                
                {/* TRÁI: KHU VỰC BÀN CỜ (CẢ CỦA MÌNH & ĐỐI THỦ) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem' }}>Bạn ({score})</h3>
                        <Stage stage={stage} />
                    </div>
                    
                    {mode === 'multiplayer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.1rem' }}>Đối thủ ({opponentScore})</h3>
                            <Stage stage={opponentStage} isOpponent={true} />
                        </div>
                    )}
                </div>

                {/* PHẢI: BẢNG ĐIỀU KHIỂN ĐỒNG BỘ */}
                <div style={{ flex: '0 0 260px', width: '260px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '100vh', overflow: 'hidden' }}>
                    
                    {/* Header Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="nav-item active" style={{ padding: '10px', display: 'flex', alignSelf: 'center', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span style={{fontSize: '1.3rem'}}>🧱</span> Tetris {mode === 'multiplayer' ? 'PvP' : 'Solo'}
                        </div>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {mode === 'solo' ? `Chế độ: ${difficulty}` : `Phòng: ${roomId}`}
                        </div>

                        {/* Thông tin Điểm & Cấp */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ĐIỂM</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{score}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CẤP ĐỘ</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#a371f7' }}>{level}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0 5px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Số hàng đã xóa:</span>
                            <b style={{ color: '#4ade80' }}>{rows}</b>
                        </div>

                        {/* Nút điều khiển */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            {mode === 'solo' && (
                                <button className="btn-primary" onClick={() => { startGame(); }} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <RefreshCw size={18} /> Chơi ván mới
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/tetris/multiplayer' : '/tetris')} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <ArrowLeft size={18} /> Thoát
                            </button>
                        </div>
                    </div>

                    {/* Khối Tiếp Theo */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '120px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <span>🎯</span> Gạch Kế Tiếp
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '15px 10px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                            {nextPieces.map((type, idx) => (
                                <NextPiece key={idx} type={type} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* GAME OVER BANNER OVERLAY FULL PANEL */}
                {gameOver && gameResult && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '20px'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>
                            {gameResult === 'Win' ? '🏆' : gameResult === 'Draw' ? '🤝' : '💀'}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '3rem', textAlign: 'center', color: gameResult === 'Win' ? '#4ade80' : '#f87171', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            {gameResult === 'Win' ? 'CHIẾN THẮNG!' : gameResult === 'Draw' ? 'HÒA' : 'THẤT BẠI'}
                        </h2>
                        <p style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Điểm của bạn: <strong style={{color: '#4ade80'}}>{score}</strong></p>
                        
                        <div style={{ display: 'flex', gap: '20px' }}>
                            {mode === 'solo' && (
                                <button className="btn-primary" onClick={() => startGame()} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RefreshCw size={24} /> Chơi lại ngay
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/tetris/multiplayer' : '/tetris')} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)' }}>
                                <ArrowLeft size={24} /> Thoát ra
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Dành cho Solo khi GameOver */}
                {gameOver && !gameResult && mode === 'solo' && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '20px'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>💀</div>
                        <h2 style={{ margin: 0, fontSize: '3rem', textAlign: 'center', color: '#f87171', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            GAME OVER
                        </h2>
                        <p style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Điểm của bạn: <strong style={{color: '#4ade80'}}>{score}</strong></p>
                        
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <button className="btn-primary" onClick={() => startGame()} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <RefreshCw size={24} /> Chơi lại ngay
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/tetris')} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)' }}>
                                <ArrowLeft size={24} /> Thoát ra
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
