import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Shuffle, Trophy, Zap, CheckCircle, XCircle } from 'lucide-react';
import { usePikachuOnline } from './usePikachuOnline';
import { useBgMusic } from '../../hooks/useBgMusic';

const ROWS = 9;
const COLS = 16;

// ─── Tile/Path SVG line renderer ─────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

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
        handleTileClick,
        useHint, requestShuffle, respondToShuffle,
    } = usePikachuOnline({ roomId, isHost });

    const { muted, toggleMute } = useBgMusic('/pikachu_audio/backgroundMusic.mp3', gameStatus === 'playing', 0.12);

    const boardRef = useRef(null);
    const cellRefs = useRef({});

    if (!roomId) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <p>Không tìm thấy phòng chơi.</p>
                    <button onClick={() => navigate('/pikachu')} style={{ marginTop: '12px', padding: '10px 24px', background: '#eab308', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    // ── Tile style ────────────────────────────────────────────────────────────
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

    // ── Waiting screen ────────────────────────────────────────────────────────
    if (gameStatus === 'waiting') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f19' }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '3rem' }}>🎮</div>
                    <h2 style={{ color: '#eab308', margin: 0 }}>Đang tải trò chơi…</h2>
                    <div style={{ width: '40px', height: '40px', border: '4px solid rgba(234,179,8,0.2)', borderTopColor: '#eab308', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Room: <b style={{ color: '#fff' }}>{roomId}</b></p>
                    <button onClick={() => navigate('/pikachu')} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                        Hủy
                    </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── Game Over Screen ──────────────────────────────────────────────────────
    if (gameStatus === 'gameover' && gameResult) {
        const iWon = gameResult.winnerId === mySocketId;
        const disconnected = gameResult.disconnected;
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>
                <div style={{ background: 'rgba(15,15,25,0.98)', borderRadius: '24px', padding: '48px 56px', border: `1px solid ${iWon ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`, boxShadow: `0 0 60px ${iWon ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', minWidth: '320px', animation: 'fadeInUp 0.4s ease' }}>
                    <div style={{ fontSize: '4rem' }}>{iWon ? '🏆' : '💀'}</div>
                    <h2 style={{ fontSize: '2rem', color: iWon ? '#eab308' : '#ef4444', margin: 0, fontWeight: 900 }}>
                        {disconnected && iWon ? 'ĐỐI THỦ THOÁT!' : iWon ? 'CHIẾN THẮNG!' : 'THUA CUỘC!'}
                    </h2>
                    {!disconnected && gameResult.scores && (
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <ScoreBox label="Bạn" score={gameResult.scores[mySocketId] ?? myScore} color={MY_COLOR} isWin={iWon} />
                            <ScoreBox label="Đối thủ" score={gameResult.scores[Object.keys(gameResult.scores).find(k => k !== mySocketId)] ?? opponentScore} color={OPP_COLOR} isWin={!iWon} />
                        </div>
                    )}
                    <button onClick={() => navigate('/pikachu')} style={{ padding: '12px 36px', fontSize: '1rem', fontWeight: 800, background: iWon ? '#eab308' : '#ef4444', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '8px' }}>
                        Về Sảnh
                    </button>
                </div>
                <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
            </div>
        );
    }

    // ── Main Game UI ──────────────────────────────────────────────────────────
    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div className="glass-panel" style={{
                position: 'relative',
                width: 'min(calc(100vw - 2rem), calc((100vh - 2rem) * 1.35))',
                height: 'min(calc(100vh - 2rem), calc((100vw - 2rem) / 1.35))',
                maxWidth: '1200px', maxHeight: '880px',
                display: 'flex', flexDirection: 'column',
                padding: '0.5rem 0.8rem',
                borderRadius: '20px',
                background: 'rgba(23, 23, 33, 0.92)',
                boxShadow: '0 25px 60px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>

                {/* ── Top Bar ─────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '6px 14px', marginBottom: '4px', flexShrink: 0 }}>
                    {/* My score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: MY_COLOR, boxShadow: `0 0 8px ${MY_COLOR}` }} />
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: MY_COLOR }}>Bạn</span>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>{myScore}</span>
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>pts</span>
                    </div>
                    {/* VS + Room */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#475569', letterSpacing: '0.1em' }}>VS</span>
                        <span style={{ fontSize: '0.65rem', color: '#334155', letterSpacing: '0.05em' }}>#{roomId}</span>
                    </div>
                    {/* Opponent score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>pts</span>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>{opponentScore}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: OPP_COLOR }}>Đối thủ</span>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: OPP_COLOR, boxShadow: `0 0 8px ${OPP_COLOR}` }} />
                    </div>
                </div>

                {/* ── Penalty/hint flash bar ──────────────────────────── */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: '100%', background: penaltyFlash ? '#ef4444' : 'transparent', transition: penaltyFlash ? 'none' : 'background 0.5s ease', boxShadow: penaltyFlash ? '0 0 12px #ef4444' : 'none' }} />
                </div>

                {/* ── Body: Board + Controls ──────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                    {/* Board */}
                    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', background: 'rgba(5,10,20,0.45)', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px' }}>
                            <div
                                ref={boardRef}
                                style={{
                                    position: 'relative',
                                    maxWidth: '100%', maxHeight: '100%',
                                    aspectRatio: `${COLS + 2} / ${ROWS + 4}`,
                                    margin: 'auto',
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${COLS + 2}, 1fr)`,
                                    gridTemplateRows: `repeat(${ROWS + 4}, 1fr)`,
                                }}
                            >
                                {/* Extra top row */}
                                {Array.from({ length: COLS + 2 }, (_, c) => (
                                    <div key={`et-${c}`} style={{ width: '100%', height: '100%' }} />
                                ))}

                                {board.map((row, r) =>
                                    row.map((id, c) => (
                                        <div
                                            key={`cell-${r}-${c}`}
                                            ref={(el) => { if (el) cellRefs.current[`${r}-${c}`] = el; }}
                                            onClick={() => id !== 0 && handleTileClick(r, c)}
                                            style={{ width: '100%', height: '100%', margin: 0, padding: 0, cursor: id !== 0 ? 'pointer' : 'default' }}
                                        >
                                            {id !== 0 && (
                                                <img
                                                    src={getIconSrc(id)}
                                                    alt={`Tile ${id}`}
                                                    draggable="false"
                                                    loading="eager"
                                                    style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', margin: 0, padding: 0, ...getTileStyle(r, c, id) }}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}

                                {/* Extra bottom row */}
                                {Array.from({ length: COLS + 2 }, (_, c) => (
                                    <div key={`eb-${c}`} style={{ width: '100%', height: '100%' }} />
                                ))}

                                {/* My path line (red) */}
                                <BoardLines boardRef={boardRef} cellRefs={cellRefs} path={myPath} color={MY_COLOR} shadow="rgba(239,68,68,0.8)" />
                                {/* Opponent path line (blue) */}
                                <BoardLines boardRef={boardRef} cellRefs={cellRefs} path={opponentPath} color={OPP_COLOR} shadow="rgba(56,189,248,0.8)" />
                            </div>
                        </div>
                    </div>

                    {/* ── Right Panel ──────────────────────────────── */}
                    <div style={{ width: '175px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>

                        {/* Hint button */}
                        <button
                            onClick={useHint}
                            disabled={myHints <= 0 || gameStatus !== 'playing'}
                            style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', borderRadius: '10px', border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: myHints > 0 ? '#d8b4fe' : '#475569', cursor: myHints > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                            <HelpCircle size={22} />
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Gợi ý ({myHints})</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Đối thủ: {opponentHints}</div>
                        </button>

                        {/* Shuffle button */}
                        {shuffleRequest ? (
                            /* Incoming shuffle request from opponent */
                            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)', display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'center' }}>
                                <span style={{ color: '#eab308', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>Đối thủ muốn đảo bài!</span>
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{shuffleCountdown}s</span>
                                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                    <button onClick={() => respondToShuffle(true)} style={{ flex: 1, padding: '7px 4px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <CheckCircle size={13} /> Đồng ý
                                    </button>
                                    <button onClick={() => respondToShuffle(false)} style={{ flex: 1, padding: '7px 4px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        <XCircle size={13} /> Từ chối
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={requestShuffle}
                                disabled={shufflePending || gameStatus !== 'playing'}
                                style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', borderRadius: '10px', border: `1px solid ${shufflePending ? 'rgba(234,179,8,0.4)' : 'rgba(56,189,248,0.3)'}`, background: shufflePending ? 'rgba(234,179,8,0.1)' : 'rgba(56,189,248,0.08)', color: shufflePending ? '#eab308' : '#bae6fd', cursor: shufflePending ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                                <Shuffle size={22} />
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{shufflePending ? 'Đang chờ…' : 'Đảo Bài'}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cần 2/2 đồng ý</div>
                            </button>
                        )}

                        {/* Color legend mini */}
                        <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: MY_COLOR, boxShadow: `0 0 5px ${MY_COLOR}`, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bạn (đỏ)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: OPP_COLOR, boxShadow: `0 0 5px ${OPP_COLOR}`, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đối thủ (xanh)</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button onClick={toggleMute} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: muted ? '#ef4444' : '#4ade80', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                {muted ? '🔇 Bật nhạc' : '🔊 Tắt nhạc'}
                            </button>
                            <button onClick={() => navigate('/pikachu')} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <ArrowLeft size={14} /> Thoát
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
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
            `}</style>
        </div>
    );
}

function ScoreBox({ label, score, color, isWin }) {
    return (
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 24px', border: `1px solid ${isWin ? color : 'rgba(255,255,255,0.06)'}` }}>
            <div style={{ color, fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
            <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900 }}>{score}</div>
            {isWin && <div style={{ color, fontSize: '0.7rem', marginTop: '4px' }}>👑 Thắng</div>}
        </div>
    );
}
