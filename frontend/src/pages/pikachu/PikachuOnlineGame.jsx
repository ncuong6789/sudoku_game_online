import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Shuffle, Award, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';
import { usePikachuOnline } from './usePikachuOnline';
import { useBgMusic } from '../../hooks/useBgMusic';

const ROWS = 9;
const COLS = 16;

function BoardLines({ boardRef, cellRefs, path, color, shadow }) {
    const [linePoints, setLinePoints] = React.useState('');

    React.useEffect(() => {
        if (!path || path.length < 2 || !boardRef.current) { setLinePoints(''); return; }
        const compute = () => {
            const parentRect = boardRef.current.getBoundingClientRect();
            const pts = path.map(p => {
                const cell = cellRefs.current[`${p.r}-${p.c}`];
                if (!cell) return null;
                const r = cell.getBoundingClientRect();
                return `${r.left - parentRect.left + r.width / 2},${r.top - parentRect.top + r.height / 2}`;
            }).filter(Boolean).join(' ');
            setLinePoints(pts);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [path, boardRef, cellRefs]);

    if (!linePoints) return null;
    return (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100, overflow: 'visible' }}>
            <polyline
                points={linePoints}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${shadow})` }}
            />
        </svg>
    );
}

export default function PikachuOnlineGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, isHost } = location.state || {};

    const {
        board, gameStatus,
        mySocketId,
        MY_COLOR, OPP_COLOR,
        mySelected, opponentSelected,
        myPath, opponentPath,
        myScore, opponentScore,
        myHints, opponentHints,
        hintPair,
        shufflePending, shuffleRequest, shuffleCountdown,
        gameResult, penaltyFlash,
        sfxMuted, toggleSfx,
        handleTileClick,
        useHint, requestShuffle, respondToShuffle,
    } = usePikachuOnline({ roomId, isHost });

    const { muted, toggleMute } = useBgMusic('/pikachu_audio/backgroundMusic.mp3', gameStatus === 'playing', 0.12);

    const boardRef = useRef(null);
    const cellRefs = useRef({});

    if (!roomId) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <p>Không tìm thấy phòng chơi.</p>
                    <button onClick={() => navigate('/pikachu')} style={{ marginTop: '12px', padding: '10px 24px', background: '#eab308', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    const getTileStyle = (r, c, id) => {
        if (id === 0) return { opacity: 0 };

        const isMine = mySelected?.r === r && mySelected?.c === c;
        const isOpponent = opponentSelected?.r === r && opponentSelected?.c === c;
        const isHint = hintPair && ((hintPair[0].r === r && hintPair[0].c === c) || (hintPair[1].r === r && hintPair[1].c === c));
        const isMyPath = myPath?.some(p => p.r === r && p.c === c);
        const isOppPath = opponentPath?.some(p => p.r === r && p.c === c);

        if (isMine) return {
            opacity: 1, transform: 'scale(1.12)', zIndex: 10,
            filter: `drop-shadow(0 0 10px ${MY_COLOR}) brightness(1.2)`,
            outline: `2.5px solid ${MY_COLOR}`, outlineOffset: '-2px',
            transition: 'all 0.12s ease',
        };
        if (isOpponent) return {
            opacity: 0.85, transform: 'scale(1.04)', zIndex: 8,
            filter: `drop-shadow(0 0 8px ${OPP_COLOR}) brightness(0.9)`,
            outline: `2.5px solid ${OPP_COLOR}`, outlineOffset: '-2px',
            transition: 'all 0.12s ease',
        };
        if (isHint) return {
            opacity: 1, transform: 'scale(1.06)', zIndex: 5,
            filter: 'drop-shadow(0 0 10px #ff2020) brightness(1.2)',
            outline: '3px solid #ff2020', outlineOffset: '-3px',
            animation: 'hintPulse 0.8s infinite alternate',
            transition: 'all 0.15s ease',
        };
        if (isMyPath || isOppPath) return {
            opacity: 1, transform: 'scale(1)', zIndex: 20,
            filter: 'brightness(1.4)',
            transition: 'all 0.1s ease',
        };
        return {
            opacity: 1, transform: 'scale(1)', zIndex: 1,
            transition: 'all 0.1s ease',
        };
    };

    const getIconSrc = (id) => `/pikachu_sprites/${id - 1}.png`;

    if (gameStatus === 'waiting') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '3rem' }}>🎮</div>
                    <h2 style={{ color: '#eab308', margin: 0 }}>Đang tải trò chơi…</h2>
                    <div style={{ width: '40px', height: '40px', border: '4px solid rgba(234,179,8,0.2)', borderTopColor: '#eab308', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Phòng: <b style={{ color: '#fff' }}>{roomId}</b></p>
                    <button onClick={() => navigate('/pikachu')} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                        Hủy
                    </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="sudoku-main-container full-page-mobile-scroll" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        }}>
            <div className="sudoku-layout-wrapper" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* LEFT PANEL - Stats */}
                <div className="sudoku-left-panel" style={{
                    flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '1rem',
                    padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Phòng Đấu</span>
                            <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 800 }}>#{roomId}</div>
                        </div>

                        {/* Penalty Flash bar */}
                        <div style={{ width: '100%', height: '4px', background: penaltyFlash ? '#ef4444' : 'rgba(255,255,255,0.05)', borderRadius: '4px', transition: penaltyFlash ? 'none' : 'background 0.5s ease', boxShadow: penaltyFlash ? '0 0 12px #ef4444' : 'none', marginBottom: '8px' }} />

                        {/* My Score Card */}
                        <div style={{ background: 'rgba(234,179,8,0.1)', border: `1px solid ${MY_COLOR}`, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: `inset 0 0 10px rgba(234,179,8,0.05)` }}>
                            <div style={{ background: MY_COLOR, padding: '8px', borderRadius: '8px' }}>
                                <Award size={20} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: MY_COLOR, fontWeight: 700, textTransform: 'uppercase' }}>Bạn</div>
                                <div style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 900 }}>{myScore} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>pts</span></div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', margin: '4px 0', fontSize: '0.8rem', fontWeight: 900, color: '#475569', letterSpacing: '2px' }}>VS</div>

                        {/* Opponent Score Card */}
                        <div style={{ background: 'rgba(56,189,248,0.1)', border: `1px solid ${OPP_COLOR}`, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: `inset 0 0 10px rgba(56,189,248,0.05)` }}>
                            <div style={{ background: OPP_COLOR, padding: '8px', borderRadius: '8px' }}>
                                <Award size={20} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: OPP_COLOR, fontWeight: 700, textTransform: 'uppercase' }}>Đối thủ</div>
                                <div style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 900 }}>{opponentScore} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>pts</span></div>
                            </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <button onClick={() => navigate('/pikachu')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                                <ArrowLeft size={16} /> Thoát khỏi phòng
                            </button>
                        </div>
                    </div>
                </div>

                {/* CENTER - BOARD */}
                <div className="sudoku-board-area" style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'auto', position: 'relative' }}>


                    <div style={{ 
                        position: 'relative', width: `${zoomLevel}%`, height: `${zoomLevel}%`, 
                        maxHeight: zoomLevel > 100 ? 'none' : '880px', maxWidth: zoomLevel > 100 ? 'none' : '1200px',
                        minHeight: zoomLevel > 100 ? `${8.8 * zoomLevel}px` : 'auto',
                        minWidth: zoomLevel > 100 ? `${12.0 * zoomLevel}px` : 'auto',
                        background: 'rgba(5, 10, 20, 0.45)', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.07)', 
                        overflow: 'hidden', display: 'flex', padding: '20px 20px 30px 20px', boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.6)',
                        transition: 'width 0.2s, height 0.2s, min-width 0.2s, min-height 0.2s'
                    }}>
                        <div
                            ref={boardRef}
                            style={{
                                position: 'relative', width: '100%',
                                aspectRatio: `${COLS + 2} / ${ROWS + 4}`,
                                margin: 'auto', display: 'grid',
                                gridTemplateColumns: `repeat(${COLS + 2}, 1fr)`,
                                gridTemplateRows: `repeat(${ROWS + 4}, 1fr)`,
                            }}
                        >
                            {Array.from({ length: COLS + 2 }, (_, c) => <div key={`et-${c}`} />)}
                            
                            {board.map((row, r) =>
                                row.map((id, c) => (
                                    <div
                                        key={`cell-${r}-${c}`}
                                        ref={(el) => { if (el) cellRefs.current[`${r}-${c}`] = el; }}
                                        onClick={() => id !== 0 && handleTileClick(r, c)}
                                        style={{ width: '100%', height: '100%', cursor: id !== 0 ? 'pointer' : 'default' }}
                                    >
                                        {id !== 0 && (
                                            <img
                                                src={getIconSrc(id)}
                                                alt={`Tile ${id}`}
                                                draggable="false"
                                                loading="eager"
                                                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', ...getTileStyle(r, c, id) }}
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                            
                            {Array.from({ length: COLS + 2 }, (_, c) => <div key={`eb-${c}`} />)}

                            <BoardLines boardRef={boardRef} cellRefs={cellRefs} path={myPath} color={MY_COLOR} shadow="rgba(234,179,8,0.8)" />
                            <BoardLines boardRef={boardRef} cellRefs={cellRefs} path={opponentPath} color={OPP_COLOR} shadow="rgba(56,189,248,0.8)" />
                        </div>

                        {/* Game Over Screen */}
                        {gameStatus === 'gameover' && gameResult && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 50, backdropFilter: 'blur(8px)' }}>
                                <div style={{ background: 'rgba(15,15,25,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${gameResult.winnerId === mySocketId ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`, boxShadow: `0 0 60px ${gameResult.winnerId === mySocketId ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'fadeInUp 0.4s ease' }}>
                                    <div style={{ fontSize: '4rem' }}>{gameResult.winnerId === mySocketId ? '🏆' : '💀'}</div>
                                    <h2 style={{ fontSize: '2rem', color: gameResult.winnerId === mySocketId ? '#eab308' : '#ef4444', margin: 0, fontWeight: 900 }}>
                                        {gameResult.disconnected && gameResult.winnerId === mySocketId ? 'ĐỐI THỦ THOÁT!' : gameResult.winnerId === mySocketId ? 'CHIẾN THẮNG!' : 'THUA CUỘC!'}
                                    </h2>
                                    {!gameResult.disconnected && gameResult.scores && (
                                        <div style={{ display: 'flex', gap: '24px' }}>
                                            <ScoreBox label="Bạn" score={gameResult.scores[mySocketId] ?? myScore} color={MY_COLOR} isWin={gameResult.winnerId === mySocketId} />
                                            <ScoreBox label="Đối thủ" score={gameResult.scores[Object.keys(gameResult.scores).find(k => k !== mySocketId)] ?? opponentScore} color={OPP_COLOR} isWin={gameResult.winnerId !== mySocketId} />
                                        </div>
                                    )}
                                    <button onClick={() => navigate('/pikachu')} style={{ padding: '12px 36px', fontSize: '1rem', fontWeight: 800, background: gameResult.winnerId === mySocketId ? '#eab308' : '#ef4444', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '8px' }}>
                                        Về Sảnh
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - CONTROLS */}
                <div className="sudoku-right-panel" style={{
                    flex: '0 0 220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px',
                    padding: '1.5rem', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <button
                        onClick={useHint}
                        disabled={myHints <= 0 || gameStatus !== 'playing'}
                        style={{ width: '100%', padding: '18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: myHints > 0 ? '#d8b4fe' : '#475569', borderRadius: '12px', cursor: myHints > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', opacity: myHints <= 0 || gameStatus !== 'playing' ? 0.5 : 1 }}>
                        <HelpCircle size={26} />
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Gợi ý ({myHints})</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Đối thủ: {opponentHints}</div>
                    </button>

                    {shuffleRequest ? (
                        <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                            <span style={{ color: '#eab308', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>Đối thủ muốn đảo bài!</span>
                            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>{shuffleCountdown}s</span>
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <button onClick={() => respondToShuffle(true)} style={{ flex: 1, padding: '10px 4px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(74,222,128,0.25)'} onMouseLeave={e => e.currentTarget.style.background='rgba(74,222,128,0.15)'}>
                                    <CheckCircle size={14} /> Đồng ý
                                </button>
                                <button onClick={() => respondToShuffle(false)} style={{ flex: 1, padding: '10px 4px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                    <XCircle size={14} /> Từ chối
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={requestShuffle}
                            disabled={shufflePending || gameStatus !== 'playing'}
                            style={{ width: '100%', padding: '18px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: shufflePending ? 'rgba(234,179,8,0.1)' : 'rgba(56, 189, 248, 0.1)', border: `1px solid ${shufflePending ? 'rgba(234,179,8,0.4)' : 'rgba(56, 189, 248, 0.3)'}`, color: shufflePending ? '#eab308' : '#bae6fd', borderRadius: '12px', cursor: shufflePending || gameStatus !== 'playing' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: gameStatus !== 'playing' ? 0.5 : 1 }}>
                            <Shuffle size={26} />
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{shufflePending ? 'Đang chờ…' : 'Đảo Bài'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cần 2/2 đồng ý</div>
                        </button>
                    )}

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={toggleMute} title={muted ? 'Bật nhạc nền' : 'Tắt nhạc nền'} style={{
                                padding: '12px 6px', borderRadius: '10px',
                                border: `1px solid ${muted ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.25)'}`,
                                background: muted ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
                                color: muted ? '#ef4444' : '#4ade80',
                                fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background=muted?'rgba(239,68,68,0.15)':'rgba(74,222,128,0.15)'} onMouseLeave={e => e.currentTarget.style.background=muted?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)'}>
                                <span style={{ fontSize: '1.2rem' }}>{muted ? '🔇' : '🎵'}</span>
                                <span>{muted ? 'Nhạc OFF' : 'Nhạc ON'}</span>
                            </button>
                            <button onClick={toggleSfx} title={sfxMuted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'} style={{
                                padding: '12px 6px', borderRadius: '10px',
                                border: `1px solid ${sfxMuted ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                background: sfxMuted ? 'rgba(239,68,68,0.08)' : 'rgba(56,189,248,0.08)',
                                color: sfxMuted ? '#ef4444' : '#38bdf8',
                                fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background=sfxMuted?'rgba(239,68,68,0.15)':'rgba(56,189,248,0.15)'} onMouseLeave={e => e.currentTarget.style.background=sfxMuted?'rgba(239,68,68,0.08)':'rgba(56,189,248,0.08)'}>
                                <span style={{ fontSize: '1.2rem' }}>{sfxMuted ? '🔕' : '🔔'}</span>
                                <span>{sfxMuted ? 'SFX OFF' : 'SFX ON'}</span>
                            </button>
                        </div>
                        <button onClick={() => navigate('/pikachu')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', marginTop: '4px' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> Thoát khỏi phòng
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes hintPulse {
                    0% { box-shadow: 0 0 5px #ff2020; outline-color: rgba(255,32,32,0.5); }
                    100% { box-shadow: 0 0 20px #ff2020; outline-color: rgba(255,32,32,1); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
            `}</style>
        </div>
    );
}

function ScoreBox({ label, score, color, isWin }) {
    return (
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px 28px', border: `1px solid ${isWin ? color : 'rgba(255,255,255,0.06)'}` }}>
            <div style={{ color, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 900 }}>{score}</div>
            {isWin && <div style={{ color, fontSize: '0.8rem', marginTop: '6px', fontWeight: 700 }}>👑 Thắng</div>}
        </div>
    );
}
