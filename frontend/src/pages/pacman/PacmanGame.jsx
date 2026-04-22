import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Heart, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import { usePacmanLogic } from './usePacmanLogic';
import { useTranslation } from 'react-i18next';

// ─── Custom Cute Ghost SVG ───────────────────────────────────────────────────
function GhostArt({ color = '#ef4444', dir = { x: 0, y: 0 }, state = 'chase', size = '95%', frightenedFlash = false }) {
    const isFr = state === 'frightened';
    const isDead = state === 'dead';
    const bodyColor = isDead ? 'transparent' : frightenedFlash ? '#ffffff' : isFr ? '#1d4ed8' : color;

    const px = dir.x * 2.5;
    const py = dir.y * 2.5;

    const eye = (cx, cy) => isFr
        ? <circle cx={cx} cy={cy} r={2.5} fill={frightenedFlash ? '#1d4ed8' : '#fff'} />
        : isDead
            ? (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1d4ed8' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>)
            : (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1a1a2e' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>);

    return (
        <svg width={size} height={size} viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg' style={{ display: 'block', overflow: 'visible' }}>
            <path
                d={['M 2 28', 'L 2 12', 'Q 2 2 14 2', 'Q 26 2 26 12', 'L 26 28', 'Q 23.7 24 21.3 28', 'Q 19 24 16.7 28', 'Q 14.3 24 12 28', 'Q 9.7 24 7.3 28', 'Q 5 24 2 28', 'Z',].join(' ')}
                fill={bodyColor}
                style={{ transition: 'fill 0.1s' }}
            />
            {!isDead && <>{eye(9.5, 12)}{eye(18.5, 12)}</>}
            {isDead && <>{eye(9.5, 14)}{eye(18.5, 14)}</>}
            {isFr && !isDead && (
                <path d='M 8 19 Q 10 17 12 19 Q 14 21 16 19 Q 18 17 20 19' stroke={frightenedFlash ? '#1d4ed8' : '#fff'} strokeWidth={1.5} fill='none' strokeLinecap='round' />
            )}
        </svg>
    );
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function PacmanGame() {
    const { t } = useTranslation();
    const { state = {} } = useLocation();
    const navigate = useNavigate();
    const { mapType = 'Classic', difficulty = 'medium' } = state;

    // Pause state (hoisted so we can pass to logic)
    const [isPaused, setIsPaused] = React.useState(false);
    const [showPauseMenu, setShowPauseMenu] = React.useState(false);

    const {
        mapGrid, pacman, ghosts, dots, pills, score, lives, phase,
        frightenedTimer, protectedTimer, totalDotsRef, handleRestart
    } = usePacmanLogic(mapType, difficulty, isPaused);

    const isPlaying = phase === 'playing' || phase === 'ready';
    
    const togglePause = React.useCallback(() => {
        if (phase === 'gameover' || phase === 'won') return;
        setIsPaused(prev => !prev);
        setShowPauseMenu(prev => !prev);
    }, [phase]);

    // Keyboard handler for pause
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && (phase === 'playing' || phase === 'ready')) {
                e.preventDefault();
                togglePause();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, togglePause]);

    // Global Mute Toggle (used by the UI buttons, but background piano is removed)
    const [muted, setMuted] = React.useState(false);
    const toggleMute = () => setMuted(m => !m);

    // Ghost Frightened Mode Background Sound
    const modeAudioRef = React.useRef(null);
    React.useEffect(() => {
        const audio = new window.Audio('/pacman_audio/gs_ghostblue.mp3');
        audio.loop = true;
        audio.volume = 0.15; // Nhỏ 1 chút như yêu cầu
        modeAudioRef.current = audio;

        return () => { audio.pause(); audio.src = ""; };
    }, []);

    React.useEffect(() => {
        if (!modeAudioRef.current) return;
        const isFrightened = frightenedTimer > 0;
        
        if (!isPlaying || muted || !isFrightened) {
            modeAudioRef.current.pause();
        } else {
            if (modeAudioRef.current.paused) modeAudioRef.current.play().catch(()=>{});
        }
    }, [phase, frightenedTimer, isPlaying, muted]);

    if (!mapGrid.length || !pacman) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>👾</div>
                <div style={{ color: '#fbbf24', marginTop: '1rem' }}>Loading...</div>
            </div>
        </div>
    );

    const cols = mapGrid[0].length, rows = mapGrid.length;
    const isDying = phase === 'dying';
    const isProtected = protectedTimer > 0;

    // Generate predefined neon colors based on map names preventing yellow conflict
    const getMapTheme = () => {
        const themes = {
            'Classic':   { border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)' }, // True Blue
            'Prototype': { border: '#e11d48', glow: 'rgba(225, 29, 72, 0.35)' },  // Crimson Red
            'MsMap1':    { border: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)' }, // Magenta Pink
            'MsMap2':    { border: '#10b981', glow: 'rgba(16, 185, 129, 0.35)' }, // Emerald Green
            'MsMap3':    { border: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.35)' }, // Ocean Cyan
            'MsMap4':    { border: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.35)' }  // Deep Violet
        };
        return themes[mapType] || themes['Classic'];
    };
    const mapTheme = getMapTheme();

    const [zoomLevel, setZoomLevel] = React.useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    return (
        <div className="pacman-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
            outline: 'none'
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                
                {/* LEFT PANEL */}
                <div className="pacman-left-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: '1rem', overflowY: 'auto', padding: '1.5rem',
                    borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', boxSizing: 'border-box' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 10px #fbbf24' }} />
                            {t('pacman.title')}
                        </div>
                        
                        <div style={{ padding: '12px', background: 'rgba(251,191,36,0.1)', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('pacman.score')}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>{score}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '8px 0' }}>
                            <Heart size={24} color={lives > 0 ? '#ef4444' : '#374151'} fill={lives > 0 ? '#ef4444' : 'none'} />
                            <Heart size={24} color={lives > 1 ? '#ef4444' : '#374151'} fill={lives > 1 ? '#ef4444' : 'none'} />
                            <Heart size={24} color={lives > 2 ? '#ef4444' : '#374151'} fill={lives > 2 ? '#ef4444' : 'none'} />
                        </div>

                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{t('pacman.map')}</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{mapType}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{t('pacman.difficulty')}</span>
                                <span style={{ fontWeight: 700, color: difficulty === 'hard' ? '#ef4444' : '#f59e0b' }}>
                                    {difficulty === 'hard' ? t('pacman.hard') : t('pacman.easy')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER BOARD AREA */}
                <div className="pacman-board-area" style={{
                    flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    minWidth: 0, minHeight: 0, padding: '1rem',
                    overflow: 'hidden', alignItems: 'center', position: 'relative'
                }}>
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15,23,42,0.8)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 110, backdropFilter: 'blur(8px)' }}>
                        <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                            <ZoomOut size={18} />
                        </button>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, minWidth: '45px', textAlign: 'center', userSelect: 'none' }}>
                            {zoomLevel}%
                        </span>
                        <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: phase === 'playing' ? '#4ade80' : '#94a3b8', marginBottom: '10px', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '12px' }}>
                        {phase === 'playing' ? t('pacman.playing') : phase === 'ready' ? t('pacman.ready') : phase === 'paused' ? t('pacman.paused') : t('pacman.ended')}
                    </div>

                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: `calc((85vh - 60px) * ${cols} / ${rows})`,
                        aspectRatio: `${cols}/${rows}`,
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        border: '4px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#000',
                        transform: `scale(${zoomLevel/100})`,
                        transition: 'transform 0.2s',
                        transformOrigin: 'center center'
                    }}>
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${cols},1fr)`, 
                            gridTemplateRows: `repeat(${rows},1fr)`
                        }}>
                            {mapGrid.map((row, y) => row.map((cell, x) => {
                                const isWall = cell === 'W' || cell === '|';
                                const isGate = cell === 'H' || cell === '-';
                                
                                if (isGate) {
                                    return (
                                        <div key={`c${x}${y}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ 
                                                width: '100%', 
                                                height: '25%', 
                                                background: '#fbcfe8',
                                                boxShadow: '0 0 6px #f43f5e'
                                            }} />
                                        </div>
                                    );
                                } else if (isWall) {
                                    const cW = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && (mapGrid[r][c] === 'W' || mapGrid[r][c] === '|');
                                    const tw = cW(y - 1, x);
                                    const bw = cW(y + 1, x);
                                    const lw = cW(y, x - 1);
                                    const rw = cW(y, x + 1);

                                    const bd = `2px solid ${mapTheme.border}`;
                                    const style = {
                                        width: '100%', height: '100%',
                                        boxSizing: 'border-box',
                                        background: '#000',
                                        borderTop: !tw ? bd : 'none',
                                        borderBottom: !bw ? bd : 'none',
                                        borderLeft: !lw ? bd : 'none',
                                        borderRight: !rw ? bd : 'none',
                                        borderTopLeftRadius: (!tw && !lw) ? '50%' : '0',
                                        borderTopRightRadius: (!tw && !rw) ? '50%' : '0',
                                        borderBottomLeftRadius: (!bw && !lw) ? '50%' : '0',
                                        borderBottomRightRadius: (!bw && !rw) ? '50%' : '0',
                                        boxShadow: `inset 0 0 12px ${mapTheme.glow}`,
                                        zIndex: 1
                                    };
                                    return <div key={`c${x}${y}`} style={style} />;
                                }
                                
                                return <div key={`c${x}${y}`} style={{ width: '100%', height: '100%', background: 'transparent' }} />;
                            }))}

                            {Array.from(dots).map(k => {
                                const [x, y] = k.split(',').map(Number); return (
                                    <div key={`d${k}`} style={{
                                        position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                        left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                    }}>
                                        <div style={{ width: '35%', height: '35%', background: '#fbbf24', borderRadius: '50%' }} />
                                    </div>
                                );
                            })}

                            {Array.from(pills).map(k => {
                                const [x, y] = k.split(',').map(Number); return (
                                    <div key={`p${k}`} style={{
                                        position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                        left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                    }}>
                                        <div style={{ width: '70%', height: '70%', background: '#ef4444', borderRadius: '50%', animation: 'pacPulse 0.6s infinite alternate', position: 'relative', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                                            <div style={{ position: 'absolute', top: '-25%', left: '40%', width: '20%', height: '40%', background: '#22c55e', borderRadius: '4px', transform: 'rotate(20deg)' }} />
                                        </div>
                                    </div>
                                );
                            })}

                            {ghosts.map(g => {
                                const fr = g.state === 'frightened';
                                const flash = fr && frightenedTimer < 8 && frightenedTimer % 2 === 0;
                                const skipTrans = Math.abs(g.x - (g.prevX ?? g.x)) > 1;
                                return (
                                    <div key={g.id} style={{
                                        position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                        left: `${(g.x / cols) * 100}%`, top: `${(g.y / rows) * 100}%`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                        transition: skipTrans ? 'none' : `left ${fr ? 0.3 : 0.1}s linear, top ${fr ? 0.3 : 0.1}s linear`, pointerEvents: 'none'
                                    }}>
                                        <GhostArt color={g.color} dir={g.dir} state={g.state} frightenedFlash={flash} size='95%' />
                                    </div>
                                );
                            })}

                            {(() => {
                                const skipTrans = Math.abs(pacman.x - (pacman.prevX ?? pacman.x)) > 1;
                                return (
                                    <div style={{
                                        position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                        left: `${(pacman.x / cols) * 100}%`, top: `${(pacman.y / rows) * 100}%`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11,
                                        transition: (isDying || skipTrans) ? 'none' : 'left 0.1s linear,top 0.1s linear',
                                        pointerEvents: 'none', animation: isDying ? 'pacDie 1.2s forwards' : isProtected ? 'pacFlash 0.25s infinite' : undefined
                                    }}>
                                        <svg width='88%' height='88%' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg' style={{ transform: `rotate(${pacman.dir.x === 1 ? 0 : pacman.dir.y === 1 ? 90 : pacman.dir.x === -1 ? 180 : -90}deg)`, display: 'block' }}>
                                            <path fill='#fbbf24' d='M14,14 L28,5 A13,13 0 1,0 28,23 Z'>
                                                {!isDying && !isProtected && (
                                                    <animate attributeName='d' values='M14,14 L28,5 A13,13 0 1,0 28,23 Z;M14,14 L28,13 A13,13 0 1,0 28,15 Z' dur='0.25s' repeatCount='indefinite' calcMode='linear' />
                                                )}
                                            </path>
                                        </svg>
                                    </div>
                                );
                            })()}

                            {phase === 'ready' && !isDying && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 20, borderRadius: '4px' }}>
                                    <h2 style={{ color: '#fbbf24', fontSize: 'clamp(1rem,4vw,2.5rem)', animation: 'pacFlash 0.8s infinite', margin: 0 }}>READY!</h2>
                                </div>
                            )}
                        </div>

                        {(phase === 'over' || phase === 'won') && (
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                zIndex: 100, gap: '16px'
                            }}>
                                <div style={{ fontSize: '5rem', marginBottom: '0.5rem', animation: phase === 'won' ? 'wonBounce 1s infinite' : 'none' }}>{phase === 'won' ? '🏆' : '💀'}</div>
                                <h2 style={{ fontSize: '3.5rem', margin: 0, color: phase === 'won' ? '#4ade80' : '#ef4444', fontWeight: 900, textShadow: phase === 'won' ? '0 0 20px rgba(74,222,128,0.5)' : '0 0 20px rgba(239,68,68,0.5)' }}>
                                    {phase === 'won' ? t('pacman.victory') : t('pacman.gameOver')}
                                </h2>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>{t('pacman.finalScore')}: </span>
                                    <b style={{ fontSize: '1.8rem', color: '#fbbf24' }}>{score}</b>
                                </div>
                                <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <button className="btn-primary" style={{ padding: '14px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', background: phase === 'won' ? '#4ade80' : '#ef4444', color: phase === 'won' ? '#000' : '#fff' }} onClick={handleRestart}>
                                        <RotateCcw size={22} /> {t('pacman.restart').toUpperCase()}
                                    </button>
                                    <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '14px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ArrowLeft size={22} /> {t('pacman.exit').toUpperCase()}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="pacman-right-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: '1rem', overflowY: 'auto', padding: '1.5rem',
                    borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    {frightenedTimer > 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(29,78,216,0.5)', background: 'rgba(29,78,216,0.1)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase' }}>⚡ {t('pacman.power')}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60b5fa' }}>{frightenedTimer}</div>
                        </div>
                    )}

                    {/* CONTROLS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={togglePause} disabled={phase === 'gameover' || phase === 'won'} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', fontSize: '0.9rem', background: isPaused ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)', border: isPaused ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: isPaused ? '#38bdf8' : '#fff', cursor: (phase === 'gameover' || phase === 'won') ? 'default' : 'pointer', opacity: (phase === 'gameover' || phase === 'won') ? 0.5 : 1 }}>
                                {isPaused ? t('pacman.resume') : t('pacman.pause')}
                            </button>
                            
                            <button className="btn-primary" onClick={handleRestart} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                <RotateCcw size={18} /> {t('pacman.restart')}
                            </button>
                            
                            <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                <ArrowLeft size={18} /> {t('pacman.exit')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pause Overlay */}
            {showPauseMenu && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(56,189,248,0.4)', boxShadow: '0 0 40px rgba(56,189,248,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '3rem' }}>⏸️</div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#38bdf8', fontWeight: 900 }}>TẠM DỪNG</h2>
                        <button onClick={togglePause} style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700, background: '#38bdf8', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                            TIẾP TỤC (Space)
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pacDie { 0% { transform:scale(1) rotate(0deg); opacity:1; } 60% { transform:scale(1.3) rotate(180deg); opacity:0.7; } 100%{ transform:scale(0) rotate(360deg); opacity:0; } }
                @keyframes pacFlash { 0%,100%{opacity:1} 50%{opacity:0.2} }
                @keyframes pacPulse { 0%{transform:scale(0.8)} 100%{transform:scale(1.2)} }
                @keyframes wonBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
                @media (max-width: 850px) {
                    .pacman-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .pacman-left-panel, .pacman-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-left: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        max-height: none !important;
                    }
                    .pacman-board-area {
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
