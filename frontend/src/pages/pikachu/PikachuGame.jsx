import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Shuffle, HelpCircle, Target, Clock, Volume2, VolumeX, Pause, Play, ShieldAlert, Award, Bell, BellOff, ZoomIn, ZoomOut } from 'lucide-react';
import { usePikachuLogic } from './usePikachuLogic';
import { useBgMusic } from '../../hooks/useBgMusic';
import { useTranslation } from 'react-i18next';

export default function PikachuGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state || {};
    const gameMode = state.gameMode || 'classic';
    const timeLimitEnabled = state.timeLimitEnabled !== undefined ? state.timeLimitEnabled : true;
    const resume = state.resume === true;

    const {
        board, ROWS, COLS, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair, penaltyFlash, isPaused, togglePause,
        sfxMuted, toggleSfx,
        handleTileClick, useHint, handleShuffle, initGame
    } = usePikachuLogic(gameMode, timeLimitEnabled, resume);

    const { muted, toggleMute } = useBgMusic('/pikachu_audio/backgroundMusic.mp3', status === 'playing', 0.12);

    const getIconSrc = (id) => `/pikachu_sprites/${id - 1}.png`;

    const [zoomLevel, setZoomLevel] = React.useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    const boardRef = React.useRef(null);
    const cellRefs = React.useRef({});
    const [linePoints, setLinePoints] = React.useState('');

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

    if (!board) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#fff' }}>Đang tải...</div>;

    return (
        <div className="sudoku-main-container full-page-mobile-scroll" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        }}>
            {/* Main content wrapper */}
            <div className="sudoku-layout-wrapper" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* LEFT PANEL - Stats */}
                <div className="sudoku-left-panel" style={{
                    flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '1rem',
                    padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        {/* Level Card */}
                        <div className="gp-card" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(59,130,246,0.2)', padding: '8px', borderRadius: '8px' }}>
                                <Target size={20} color="#60a5fa" />
                            </div>
                            <div>
                                <div className="gp-micro" style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Cấp độ</div>
                                <div className="gp-score" style={{ color: '#f8fafc', fontSize: '1.1rem' }}>{level}</div>
                            </div>
                        </div>

                        {/* Score Card */}
                        <div className="gp-card" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(234,179,8,0.2)', padding: '8px', borderRadius: '8px' }}>
                                <Award size={20} color="#fcd34d" />
                            </div>
                            <div>
                                <div className="gp-micro" style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Điểm số</div>
                                <div className="gp-score" style={{ color: '#fcd34d', fontSize: '1.1rem' }}>{score}</div>
                            </div>
                        </div>

                        {/* Time Card with integrated Progress */}
                        <div className="gp-card" style={{ 
                            background: penaltyFlash ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)', 
                            border: `1px solid ${penaltyFlash ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.05)'}`, 
                            padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px',
                            transition: penaltyFlash ? 'none' : 'all 0.3s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                                    <Clock size={20} color={timeLimitEnabled ? (timeLeft < 20 ? "#ef4444" : "#38bdf8") : "#a855f7"} />
                                </div>
                                <div>
                                    <div className="gp-micro" style={{ color: '#94a3b8', textTransform: 'uppercase' }}>
                                        {timeLimitEnabled ? t('pikachu.time') : t('pikachu.relax')}
                                    </div>
                                    <div className="gp-ui" style={{ color: '#94a3b8' }}>
                                        {timeLimitEnabled ? t('pikachu.limit') : ''}
                                    </div>
                                </div>
                            </div>
                            {timeLimitEnabled && (
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', width: `${timeLeft}%`, 
                                        background: timeLeft < 20 ? '#ef4444' : 'linear-gradient(90deg, #4ade80, #38bdf8)',
                                        transition: 'width 0.1s linear'
                                    }} />
                                </div>
                            )}
                        </div>
                        
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '10px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="gp-btn" onClick={() => initGame()} style={{ padding: '11px', color: '#fff' }}>
                                <RotateCcw size={16} /> Bắt đầu ván mới
                            </button>
                            <button className="gp-btn" onClick={togglePause} style={{ padding: '11px', background: isPaused ? 'rgba(56,189,248,0.2)' : 'transparent', border: isPaused ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', color: isPaused ? '#38bdf8' : '#fff' }}>
                                {isPaused ? <Play size={16} fill="#38bdf8" /> : <Pause size={16} fill="#fff" />}
                                {t('pikachu.pause')}
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="gp-btn" onClick={toggleMute} style={{ flex: 1, padding: '10px 4px', flexDirection: 'column', gap: '4px', color: muted ? '#ef4444' : '#4ade80' }}>
                                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    <span className="gp-micro">Nhạc Nền</span>
                                </button>
                                <button className="gp-btn" onClick={toggleSfx} style={{ flex: 1, padding: '10px 4px', flexDirection: 'column', gap: '4px', color: sfxMuted ? '#ef4444' : '#4ade80' }}>
                                    {sfxMuted ? <BellOff size={16} /> : <Bell size={16} />}
                                    <span className="gp-micro">Âm Hiệu</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '14px' }}>
                        <button className="gp-btn" onClick={() => navigate('/pikachu')} style={{ padding: '12px' }}>
                            <ArrowLeft size={16} /> Thoát khỏi phòng
                        </button>
                    </div>
                </div>

                {/* CENTER - BOARD */}
                <div className="sudoku-board-area" style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'auto', position: 'relative' }}>
                    
                    <div style={{ 
                        position: 'relative', width: `${zoomLevel}%`, height: `${zoomLevel}%`, 
                        maxHeight: zoomLevel > 100 ? 'none' : '860px', maxWidth: zoomLevel > 100 ? 'none' : '1150px',
                        minHeight: zoomLevel > 100 ? `${8.6 * zoomLevel}px` : 'auto',
                        minWidth: zoomLevel > 100 ? `${11.5 * zoomLevel}px` : 'auto',
                        background: 'rgba(5, 10, 20, 0.45)', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.07)', 
                        overflow: 'hidden', display: 'flex', padding: '20px 20px 30px 20px', boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.6)',
                        transition: 'width 0.2s, height 0.2s, min-width 0.2s, min-height 0.2s'
                    }}>
                        
                        {/* Board Grid */}
                        <div
                            ref={boardRef}
                            style={{
                                position: 'relative', width: '100%', height: '100%',
                                aspectRatio: `${COLS + 2} / ${ROWS + 4}`,
                                margin: 'auto', display: 'grid',
                                gridTemplateColumns: `repeat(${COLS + 2}, 1fr)`,
                                gridTemplateRows: `repeat(${ROWS + 4}, 1fr)`,
                            }}
                        >
                            {/* Extra top border row */}
                            {Array.from({ length: COLS + 2 }, (_, c) => <div key={`extra-top-${c}`} />)}
                            
                            {board.map((row, r) =>
                                row.map((id, c) => (
                                    <div
                                        key={`cell-${r}-${c}`}
                                        ref={(el) => { if (el) cellRefs.current[`${r}-${c}`] = el; }}
                                        onClick={() => handleTileClick(r, c)}
                                        style={{ width: '100%', height: '100%', cursor: id !== 0 ? 'pointer' : 'default' }}
                                    >
                                        {id !== 0 && (
                                            <img
                                                src={getIconSrc(id)}
                                                alt={`Tile ${id}`}
                                                style={{
                                                    width: '100%', height: '100%', objectFit: 'fill', display: 'block',
                                                    ...getTileStyle(r, c, id),
                                                }}
                                                draggable="false"
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                            
                            {/* Extra bottom border row */}
                            {Array.from({ length: COLS + 2 }, (_, c) => <div key={`extra-bot-${c}`} />)}

                            {/* SVG Lines */}
                            {connectedPath && linePoints && (
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100, overflow: 'visible' }}>
                                    <polyline
                                        points={linePoints} fill="none" stroke="#ef4444" strokeWidth="5"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,1))' }}
                                    />
                                </svg>
                            )}
                        </div>

                        {/* Overlays */}
                        {isPaused && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', zIndex: 60, backdropFilter: 'blur(8px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                                    <button onClick={togglePause} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 30px rgba(56,189,248,0.5)', transition: 'transform 0.2s' }}>
                                        <Play size={36} fill="#fff" />
                                    </button>
                                    <div className="gp-title" style={{ color: '#fff' }}>{t('pikachu.continue')}</div>
                                </div>
                            </div>
                        )}

                        {status === 'won' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                                <div className="gp-card" style={{ background: 'rgba(20,20,30,0.95)', padding: '40px 50px', border: '1px solid rgba(74,222,128,0.3)', boxShadow: '0 0 40px rgba(74,222,128,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'wonBounce 0.5s ease' }}>
                                    <div style={{ fontSize: '4rem' }}>🏆</div>
                                    <div style={{ fontSize: '1.8rem', color: '#4ade80', margin: 0, fontWeight: 900 }}>{t('pikachu.won')}</div>
                                    <div className="gp-body" style={{ margin: 0 }}>{t('pikachu.levelComplete')} {level}</div>
                                    <button className="gp-btn" onClick={() => initGame(true)} style={{ marginTop: '8px', padding: '12px 32px', background: '#4ade80', color: '#000', border: 'none', boxShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                                        {t('pikachu.continue').toUpperCase()}
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'finished' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 50, backdropFilter: 'blur(12px)' }}>
                                <div className="gp-card" style={{ background: 'rgba(20,20,30,0.95)', padding: '40px 50px', border: '1px solid rgba(234,179,8,0.3)', boxShadow: '0 0 40px rgba(234,179,8,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '4rem' }}>👑</div>
                                    <div style={{ fontSize: '1.8rem', color: '#eab308', margin: 0, fontWeight: 900 }}>{t('pikachu.finished')}</div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 32px', borderRadius: '12px', textAlign: 'center' }}>
                                        <div className="gp-micro">{t('pikachu.totalScore')}</div>
                                        <div style={{ color: '#eab308', fontSize: '2rem', fontWeight: 900 }}>{score}</div>
                                    </div>
                                    <button className="gp-btn" onClick={() => navigate('/pikachu')} style={{ marginTop: '8px', padding: '12px 32px', background: '#eab308', color: '#000', border: 'none' }}>
                                        {t('common.returnToMenu').toUpperCase()}
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'gameover' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                                <div className="gp-card" style={{ background: 'rgba(20,20,30,0.95)', padding: '40px 50px', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 40px rgba(239,68,68,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '4rem' }}>💀</div>
                                    <div style={{ fontSize: '1.8rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>{t('pikachu.gameover')}</div>
                                    <div className="gp-body">{t('pikachu.score')}: <span style={{ color: '#fff', fontWeight: 700 }}>{score}</span></div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button className="gp-btn" onClick={() => initGame()} style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none' }}>
                                            <RotateCcw size={16} /> {t('pikachu.retry').toUpperCase()}
                                        </button>
                                        <button className="gp-btn" onClick={() => navigate('/pikachu')} style={{ padding: '10px 24px' }}>
                                            {t('common.exit').toUpperCase()}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - Hint, Shuffle centered + Zoom at bottom */}
                <div className="sudoku-right-panel" style={{
                    flex: '0 0 190px', display: 'flex', flexDirection: 'column', gap: '12px',
                    padding: '4rem 1rem 1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    {/* Hint + Shuffle centered */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                        <button className="gp-btn" onClick={useHint} disabled={hints <= 0 || status !== 'playing'} style={{
                            padding: '20px 10px', flexDirection: 'column', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe',
                            opacity: hints <= 0 || status !== 'playing' ? 0.5 : 1
                        }}>
                            <HelpCircle size={28} />
                            <div className="gp-ui" style={{ fontWeight: 700 }}>{t('pikachu.hintBtn')} ({hints})</div>
                        </button>

                        <button className="gp-btn" onClick={handleShuffle} disabled={shuffles <= 0 || status !== 'playing'} style={{
                            padding: '20px 10px', flexDirection: 'column', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#bae6fd',
                            opacity: shuffles <= 0 || status !== 'playing' ? 0.5 : 1
                        }}>
                            <Shuffle size={28} />
                            <div className="gp-ui" style={{ fontWeight: 700 }}>{t('pikachu.shuffleBtn')} ({shuffles})</div>
                        </button>
                    </div>

                    {/* Zoom Controls — bottom of right panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '1rem' }}>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                            <div className="gp-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '8px 10px' }}>
                                <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                    <ZoomOut size={16} />
                                </button>
                                <span className="gp-ui" style={{ minWidth: '38px', textAlign: 'center', userSelect: 'none' }}>
                                    {zoomLevel}%
                                </span>
                                <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                    <ZoomIn size={16} />
                                </button>
                            </div>
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
