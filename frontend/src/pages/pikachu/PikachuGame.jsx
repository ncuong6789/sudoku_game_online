import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Shuffle, HelpCircle, Activity, Clock, LayoutGrid, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { usePikachuLogic } from './usePikachuLogic';
import { useBgMusic } from '../../hooks/useBgMusic';

export default function PikachuGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state || {};
    const gameMode = state.gameMode || 'classic';
    const timeLimitEnabled = state.timeLimitEnabled !== undefined ? state.timeLimitEnabled : true;

    const {
        board, ROWS, COLS, activeRows, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair, penaltyFlash, isPaused, togglePause,
        handleTileClick, useHint, handleShuffle, initGame, checkAndFixDeadlock
    } = usePikachuLogic(gameMode, timeLimitEnabled);

    const { muted, toggleMute } = useBgMusic('/pikachu_audio/backgroundMusic.mp3', status === 'playing', 0.12);

    // Mảng lưới board sẽ có size (ROWS+2) x (COLS+2) (Padding)
    // Map tile ID sang icon (sg11 used 0-35, but we use 1-36 internally to reserve 0 for empty space)
    const getIconSrc = (id) => `/pikachu_sprites_hd_from_sheet/${id - 1}.png`;
    
    // Optimized sprite loading with proper sizing
    const SPRITE_SIZE = 64; // Base size for sprites
    const getSpriteStyle = (id) => ({
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        imageRendering: 'auto',
        WebkitImageSmoothing: 'high',
        MozOsxFontSmoothing: 'grayscale',
    });

    const boardRef = React.useRef(null);
    const cellRefs = React.useRef({});
    const [linePoints, setLinePoints] = React.useState('');

    // Bắt chước logic temp_sg11 LinesDrawer.cs (dùng Position/DOM absolute tracking) để đường line 100% trúng tâm Icon mà k bị ảnh hưởng bởi Grid.
    React.useEffect(() => {
        if (!connectedPath || connectedPath.length < 2 || !boardRef.current) {
            setLinePoints('');
            return;
        }

        const computePoints = () => {
            const parentRect = boardRef.current.getBoundingClientRect();
            const pts = connectedPath.map(p => {
                const cell = cellRefs.current[`${p.r}-${p.c}`];
                if (!cell) return null;
                const r = cell.getBoundingClientRect();
                return `${r.left - parentRect.left + r.width / 2},${r.top - parentRect.top + r.height / 2}`;
            }).filter(Boolean).join(' ');
            setLinePoints(pts);
        };

        // Render point exactly onto elements
        computePoints();
        window.addEventListener('resize', computePoints);
        return () => window.removeEventListener('resize', computePoints);
    }, [connectedPath]);

    const getTileStyle = (r, c, id) => {
        let isSelected = selected?.r === r && selected?.c === c;
        let isHint = hintPair && ((hintPair[0].r === r && hintPair[0].c === c) || (hintPair[1].r === r && hintPair[1].c === c));
        let isPath = connectedPath && connectedPath.some(p => p.r === r && p.c === c);

        let opacity = id === 0 ? 0 : 1;
        let scale = 1;
        let zIndex = 1;
        let filter = '';
        let transform = '';

        if (id !== 0) {
            if (isSelected) {
                scale = 1.12;
                zIndex = 10;
                filter = 'drop-shadow(0 0 8px rgba(56,189,248,0.9)) brightness(1.15)';
            } else if (isHint) {
                scale = 1.05;
                zIndex = 5;
                filter = 'drop-shadow(0 0 10px #ff2020) brightness(1.2)';
                transform = 'scale(1.05)';
            } else if (isPath) {
                scale = 1.0;
                zIndex = 20;
                filter = 'brightness(1.4) drop-shadow(0 0 6px rgba(255,50,50,0.9))';
            }
        }

        return {
            opacity,
            transform: `scale(${scale})`,
            zIndex,
            filter,
            transition: 'all 0.15s ease',
            outline: isHint ? '3px solid #ff2020' : 'none',
            outlineOffset: '-3px',
            animation: isHint ? 'hintPulse 0.8s infinite alternate' : 'none'
        };
    };

    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', padding: '2rem 1rem', boxSizing: 'border-box' }}>
            <div className="glass-panel" style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                height: '88vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.2rem',
                borderRadius: '20px',
                background: 'rgba(23, 23, 33, 0.85)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '8px 14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={16} color="var(--primary-color)" />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Level: {level}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>· {gameMode === 'classic' ? 'Classic' : 'Full'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#eab308' }}>Score: {score}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a855f7' }}>
                            <HelpCircle size={15} /> <b>{hints}</b>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                            <Shuffle size={15} /> <b>{shuffles}</b>
                        </div>
                    </div>
                </div>

                {/* Progress Bar for Time */}
                <div style={{
                    width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', position: 'relative'
                }}>
                    <div style={{
                        height: '100%',
                        width: timeLimitEnabled ? `${timeLeft}%` : '100%',
                        background: penaltyFlash ? ('#ef4444') : (timeLeft < 20 && timeLimitEnabled ? '#ef4444' : 'linear-gradient(90deg, #4ade80, #38bdf8)'),
                        transition: penaltyFlash ? 'none' : 'width 0.1s linear, background 0.3s ease',
                        boxShadow: penaltyFlash ? '0 0 10px #ef4444' : 'none'
                    }} />
                    {!timeLimitEnabled && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                    {/* Main Board - inner panel background */}
                    <div style={{
                        flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                        background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '3px solid rgba(255,255,255,0.06)', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {/* Combined Grid and Overlays Container */}
                            <div
                                ref={boardRef}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${COLS + 2}, 1fr)`,
                                    gridTemplateRows: `repeat(${activeRows + 2}, 1fr)`,
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '8px',
                                    gap: 0,
                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.1)'
                                }}
                            >
                                {board.slice(0, activeRows + 2).map((row, r) =>
                                    row.map((id, c) => (
                                        <div
                                            key={`cell-${r}-${c}`}
                                            ref={(el) => {
                                                if (el) cellRefs.current[`${r}-${c}`] = el;
                                            }}
                                            onClick={() => handleTileClick(r, c)}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                cursor: id !== 0 ? 'pointer' : 'default',
                                                boxSizing: 'border-box',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative',
                                                willChange: 'transform',
                                            }}
                                        >
                                            <div style={{
                                                width: '98%', 
                                                height: '98%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                ...getTileStyle(r, c, id)
                                            }}>
                                                {id !== 0 && (
                                                    <img
                                                        src={getIconSrc(id)}
                                                        alt={`Tile ${id}`}
                                                        style={getSpriteStyle(id)}
                                                        draggable="false"
                                                        loading="eager"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* SVG Overlays - Pixel absolute line renderer like temp_sg11 LinesDrawer.cs */}
                                {connectedPath && linePoints && (
                                    <svg
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none',
                                            zIndex: 100,
                                            overflow: 'visible'
                                        }}
                                    >
                                        <polyline
                                            points={linePoints}
                                            fill="none"
                                            stroke="#ef4444"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,1))' }}
                                        />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {isPaused && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', zIndex: 60, backdropFilter: 'blur(8px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                                    <button onClick={togglePause} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 30px rgba(56,189,248,0.5)', transition: 'transform 0.2s' }}>
                                        <Play size={36} fill="#fff" />
                                    </button>
                                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Tiếp tục</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Nhấn để chơi tiếp</div>
                                </div>
                            </div>
                        )}

                        {status === 'won' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                                <div style={{ background: 'rgba(20,20,30,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 0 40px rgba(74,222,128,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '4rem' }}>🏆</div>
                                    <h2 style={{ fontSize: '1.8rem', color: '#4ade80', margin: 0, fontWeight: 900 }}>HOÀN THÀNH!</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: 0 }}>Màn {level}</p>
                                    <button onClick={() => initGame(true)} style={{ marginTop: '8px', padding: '12px 32px', fontSize: '1rem', fontWeight: 700, background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                                        TIẾP TỤC
                                    </button>
                                </div>
                            </div>
                        )}
                        {status === 'finished' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 50, backdropFilter: 'blur(12px)' }}>
                                <div style={{ background: 'rgba(20,20,30,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(234,179,8,0.3)', boxShadow: '0 0 40px rgba(234,179,8,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '4rem' }}>👑</div>
                                    <h2 style={{ fontSize: '1.8rem', color: '#eab308', margin: 0, fontWeight: 900 }}>PHÁ ĐẢO!</h2>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 32px', borderRadius: '12px' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>TỔNG ĐIỂM</div>
                                        <div style={{ color: '#eab308', fontSize: '2rem', fontWeight: 900 }}>{score}</div>
                                    </div>
                                    <button onClick={() => navigate('/pikachu')} style={{ marginTop: '8px', padding: '12px 32px', fontSize: '1rem', fontWeight: 700, background: '#eab308', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                                        VỀ SẢNH
                                    </button>
                                </div>
                            </div>
                        )}
                        {status === 'gameover' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                                <div style={{ background: 'rgba(20,20,30,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 40px rgba(239,68,68,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '4rem' }}>💀</div>
                                    <h2 style={{ fontSize: '1.8rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>HẾT GIỜ</h2>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>Điểm: <span style={{ color: '#fff', fontWeight: 700 }}>{score}</span></div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button onClick={() => initGame()} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <RotateCcw size={16} /> THỬ LẠI
                                        </button>
                                        <button onClick={() => navigate('/pikachu')} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                            THOÁT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel Controls */}
                    <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button className="btn-secondary" onClick={useHint} disabled={hints <= 0 || status !== 'playing'} style={{
                                padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', borderRadius: '10px'
                            }}>
                                <HelpCircle size={22} />
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Gợi ý ({hints})</div>
                            </button>

                            <button className="btn-secondary" onClick={handleShuffle} disabled={shuffles <= 0 || status !== 'playing'} style={{
                                padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#bae6fd', borderRadius: '10px'
                            }}>
                                <Shuffle size={22} />
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Đảo ({shuffles})</div>
                            </button>
                        </div>

                        <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> {timeLimitEnabled ? 'Thời Gian (Limit)' : 'Thời Gian (Tự Do)'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: timeLimitEnabled ? '#38bdf8' : '#a855f7', fontWeight: 600 }}>
                                {timeLimitEnabled ? 'Penalty: Trừ -5% / nhát' : 'Mode Rảnh Tay'}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={togglePause} style={{
                                width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase',
                                background: isPaused ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                                border: isPaused ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: isPaused ? '#38bdf8' : '#fff', cursor: 'pointer'
                            }}>
                                {isPaused ? <Play size={20} fill="#38bdf8" /> : <Pause size={20} fill="#fff" />}
                                Tạm dừng
                            </button>
                            <button onClick={toggleMute} style={{
                                width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                                color: muted ? '#ef4444' : '#4ade80', cursor: 'pointer'
                            }}>
                                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                {muted ? 'BẬT NHẠC' : 'TẮT NHẠC'}
                            </button>
                            <button className="btn-secondary" onClick={() => initGame()} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                                fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase'
                            }}>
                                <RotateCcw size={18} /> Chơi lại màn mới
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/pikachu')} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                                fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase'
                            }}>
                                <ArrowLeft size={18} /> Thoát Game
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes hintPulse {
                    0% { box-shadow: 0 0 5px #ff2020; outline-color: rgba(255,32,32,0.5); }
                    100% { box-shadow: 0 0 20px #ff2020; outline-color: rgba(255,32,32,1); }
                }
                @keyframes wonBounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
            `}</style>
        </div>
    );
}
