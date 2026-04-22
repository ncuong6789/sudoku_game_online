import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, ZoomIn, ZoomOut } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useTetris, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOES } from '../../utils/useTetris';
import { useAudio } from '../../utils/useAudio';
import { useTranslation } from 'react-i18next';

// Reference to shared AudioContext from useAudio
let audioCtx;

// A Cell component
const Cell = ({ type, cellState }) => {
    let color = 'rgba(10, 15, 25, 0.75)'; // Nền tối cho ô trống
    let hasBorder = type !== 0;
    if (hasBorder && TETROMINOES[type]) {
        color = TETROMINOES[type].color;
    }
    return (
        <div className={cellState === 'completing' ? 'flash-row' : ''} style={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            border: hasBorder ? '1px solid rgba(0,0,0,0.5)' : 'none',
            borderRadius: hasBorder ? '2px' : '0',
            boxShadow: hasBorder ? `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.5)` : 'none'
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
        background: 'rgba(255, 255, 255, 0.04)', // Màu nét đứt caro (lưới)
        padding: '1px',
        borderRadius: '4px',
        opacity: isOpponent ? 0.7 : 1
    }}>
        {stage.map(row => row.map((cell, x) => <Cell key={x} type={cell[0]} cellState={cell[1]} />))}
    </div>
);

// Next Piece display
const NextPiece = ({ type }) => {
    if(!type) return <div style={{width: '40px', height: '40px'}}/>;
    
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
            gridTemplateRows: `repeat(${shape.length}, 16px)`,
            gridTemplateColumns: `repeat(${shape[0]?.length || 1}, 16px)`,
            margin: '0 auto',
            flexShrink: 0
        }}>
            {shape.map(row => row.map((cell, x) => (
                <div key={x} style={{
                    width: '16px', height: '16px',
                    backgroundColor: cell ? TETROMINOES[type].color : 'transparent',
                    boxShadow: cell ? `inset 1.5px 1.5px 3px rgba(255,255,255,0.3)` : 'none',
                    borderRadius: '2px'
                }} />
            )))}
        </div>
    );
};

export default function TetrisGame() {
    const { t } = useTranslation();
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
        setGameOver, setDropTime, getBaseDropTime
    } = useTetris(pieceSequence, difficulty, playClearLineSound);
    
    // Pause state
    const [isPaused, setIsPaused] = useState(false);
    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    
    const togglePause = useCallback(() => {
        if (gameOver || !isStarted) return;
        setIsPaused(prev => !prev);
        setShowPauseMenu(prev => !prev);
    }, [gameOver, isStarted]);

    // Pause effect - pause/resume drop when isPaused changes
    useEffect(() => {
        if (isPaused) {
            setDropTime(null);
        } else if (isStarted && !gameOver) {
            setDropTime(getBaseDropTime() / (level + 1.2));
        }
    }, [isPaused, isStarted, gameOver, level]);

    // Opponent state
    const [opponentStage, setOpponentStage] = useState(Array.from(Array(STAGE_HEIGHT), () => Array(STAGE_WIDTH).fill([0, 'clear'])));
    const [opponentScore, setOpponentScore] = useState(0);
    const [gameResult, setGameResult] = useState(''); // 'Win', 'Lose', 'Draw'

    const [zoomLevel, setZoomLevel] = useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    // Keyboard handlers
    const move = useCallback((e) => {
        const { keyCode } = e;
        if (isStarted) {
            // Pause toggle with Enter (keyCode 13)
            if (keyCode === 13 && !gameOver && isStarted) {
                e.preventDefault();
                togglePause();
                return;
            }
            if (gameOver && mode === 'solo' && keyCode === 13) {
                e.preventDefault();
                startGame();
                return;
            }
            if (!gameOver && !isPaused && [37, 38, 39, 40, 32, 13].includes(keyCode)) {
                e.preventDefault();
            }
            if (isPaused) return;
            
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
            if ([37, 38, 39, 40, 32, 13].includes(keyCode)) {
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
            if (audioCtx) {
                audioCtx.close().catch(() => {});
                audioCtx = null;
            }
        };
    }, [roomId]);

    return (
        <div className="tetris-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
            outline: 'none'
        }} tabIndex="0">
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                
                {/* LEFT PANEL */}
                <div className="tetris-left-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    gap: '1rem', overflowY: 'auto', padding: '1.5rem',
                    borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    <div className="nav-item active" style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <span style={{fontSize: '1.4rem'}}>🧱</span> {t('tetris.title')}
                    </div>

                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {mode === 'solo' ? difficulty : `${t('tetris.room')}: ${roomId}`}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 10px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '1px' }}>{t('tetris.points')}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{score}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 10px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '1px' }}>{t('tetris.level')}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#a371f7' }}>{level}</div>
                        </div>
                    </div>
                    
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('tetris.cleared')}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ade80' }}>{rows}</span>
                    </div>

                    {/* Controls in Left Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {mode === 'solo' && (
                            <>
                                <button className="btn-primary" onClick={() => { startGame(); }} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                                    <RefreshCw size={18} /> Chơi mới
                                </button>
                                <button onClick={togglePause} disabled={!isStarted || gameOver} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', background: isPaused ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)', border: isPaused ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: isPaused ? '#38bdf8' : '#fff', cursor: !isStarted || gameOver ? 'default' : 'pointer', opacity: !isStarted || gameOver ? 0.5 : 1, fontSize: '0.95rem', fontWeight: 600 }}>
                                    {isPaused ? '▶ Tiếp tục (Enter)' : '⏸ Tạm dừng (Enter)'}
                                </button>
                            </>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '14px' }}>
                        <button onClick={() => navigate(mode === 'multiplayer' ? '/tetris/multiplayer' : '/tetris')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> Thoát khỏi phòng
                        </button>
                    </div>
                </div>

                {/* CENTER BOARD AREA */}
                <div className="tetris-board-area" style={{
                    flex: '1 1 auto', display: 'flex', justifyContent: 'center',
                    minWidth: 0, minHeight: 0, gap: '12px', padding: '1rem',
                    overflow: 'hidden', alignItems: 'center', position: 'relative'
                }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', transform: `scale(${zoomLevel/100})`, transition: 'transform 0.2s', transformOrigin: 'center center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.1rem' }}>{t('tetris.you')} ({score})</h3>
                            <Stage stage={stage} />
                        </div>
                        
                        {mode === 'multiplayer' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.1rem' }}>{t('tetris.opponent')} ({opponentScore})</h3>
                                <Stage stage={opponentStage} isOpponent={true} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="tetris-right-panel" style={{
                    flex: '0 0 200px', display: 'flex', flexDirection: 'column',
                    padding: '1.5rem 1rem',
                    borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    <div style={{ flex: 1 }} />

                    {/* Next Pieces — centered vertically */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.05)', padding: '1.2rem 0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.2rem', letterSpacing: '2px', fontWeight: 700 }}>KHỐI TIẾP THEO</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem' }}>
                            {nextPieces.map((type, idx) => (
                                <NextPiece key={idx} type={type} />
                            ))}
                        </div>
                    </div>

                    {/* Bottom Area: Spacer + Zoom Controls */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomOut size={16} />
                            </button>
                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, minWidth: '38px', textAlign: 'center', userSelect: 'none' }}>
                                {zoomLevel}%
                            </span>
                            <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomIn size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* GAME OVER BANNER OVERLAY FULL PANEL */}
                {gameOver && gameResult && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${gameResult === 'Win' ? 'rgba(74,222,128,0.4)' : gameResult === 'Draw' ? 'rgba(251,191,36,0.4)' : 'rgba(239,68,68,0.4)'}`, boxShadow: `0 0 40px ${gameResult === 'Win' ? 'rgba(74,222,128,0.3)' : gameResult === 'Draw' ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '3.5rem' }}>{gameResult === 'Win' ? '🏆' : gameResult === 'Draw' ? '🤝' : '💀'}</div>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: gameResult === 'Win' ? '#4ade80' : gameResult === 'Draw' ? '#fbbf24' : '#ef4444', fontWeight: 900 }}>
                                {gameResult === 'Win' ? 'THẮNG' : gameResult === 'Draw' ? 'HÒA' : 'THUA'}
                            </h2>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginTop: '4px' }}>Điểm: <span style={{ color: '#4ade80', fontWeight: 700 }}>{score}</span></div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                {mode === 'solo' && (
                                    <button onClick={startGame} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                        CHƠI LẠI
                                    </button>
                                )}
                                <button onClick={() => navigate('/tetris')} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                    THOÁT
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {gameOver && !gameResult && mode === 'solo' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 40px rgba(239,68,68,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '3.5rem' }}>💀</div>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#ef4444', fontWeight: 900 }}>THUA</h2>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginTop: '4px' }}>Điểm: <span style={{ color: '#4ade80', fontWeight: 700 }}>{score}</span></div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => startGame()} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    CHƠI LẠI
                                </button>
                                <button onClick={() => navigate('/tetris')} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                    THOÁT
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            <style>{`
                @media (max-width: 850px) {
                    .tetris-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .tetris-left-panel, .tetris-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-left: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        max-height: none !important;
                    }
                    .tetris-board-area {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        padding: 0.5rem !important;
                        min-height: 60vh;
                    }
                }
            `}</style>
        </div>
    );
}
