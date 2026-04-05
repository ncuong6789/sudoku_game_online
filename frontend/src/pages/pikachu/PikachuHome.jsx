import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Puzzle, Trophy, Zap, Clock, Flame } from 'lucide-react';

export default function PikachuHome() {
    const navigate = useNavigate();
    const [gameMode, setGameMode] = useState('classic');
    const [timeLimitEnabled, setTimeLimitEnabled] = useState(true);

    const handlePlay = () => {
        navigate('/pikachu/game', { state: { gameMode, timeLimitEnabled } });
    };

    const modeDesc = gameMode === 'classic'
        ? 'Bản đồ Cấp 1–7 tiêu chuẩn. 22 xáo & 9 gợi ý.'
        : 'Bản đồ Cấp 1–11 với trọng lực & dịch chuyển. Thưởng thêm mỗi màn!';

    return (
        <div className="full-page-mobile-scroll" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            width: '100vw', height: '100vh', padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '520px',
                padding: '2rem 2rem 1.5rem',
                borderRadius: '20px',
                background: 'rgba(23, 23, 33, 0.9)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '1.8rem' }}>
                    <div style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.3)', padding: '12px', borderRadius: '16px' }}>
                        <Puzzle size={36} color="#eab308" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#eab308', fontWeight: 900, letterSpacing: '0.03em', lineHeight: 1 }}>PIKACHU ONET</h1>
                </div>

                {/* Game Mode */}
                <div style={{ marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Trophy size={13} /> Chế độ chơi
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={() => setGameMode('classic')} style={{
                            padding: '11px', borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                            background: gameMode === 'classic' ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.04)',
                            borderColor: gameMode === 'classic' ? '#eab308' : 'rgba(255,255,255,0.1)',
                            color: gameMode === 'classic' ? '#eab308' : '#94a3b8',
                            fontWeight: gameMode === 'classic' ? 700 : 400,
                            fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            transition: 'all 0.15s ease'
                        }}>
                            <Trophy size={15} /> Classic
                        </button>
                        <button onClick={() => setGameMode('full')} style={{
                            padding: '11px', borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                            background: gameMode === 'full' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                            borderColor: gameMode === 'full' ? '#a855f7' : 'rgba(255,255,255,0.1)',
                            color: gameMode === 'full' ? '#a855f7' : '#94a3b8',
                            fontWeight: gameMode === 'full' ? 700 : 400,
                            fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            transition: 'all 0.15s ease'
                        }}>
                            <Zap size={15} /> Full Mode
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>{modeDesc}</p>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 1.2rem' }} />

                {/* Time Limit */}
                <div style={{ marginBottom: '1.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Clock size={13} /> Giới hạn thời gian
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <button onClick={() => setTimeLimitEnabled(true)} style={{
                            padding: '11px', borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                            background: timeLimitEnabled ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                            borderColor: timeLimitEnabled ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                            color: timeLimitEnabled ? '#38bdf8' : '#94a3b8',
                            fontWeight: timeLimitEnabled ? 700 : 400,
                            fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            transition: 'all 0.15s ease'
                        }}>
                            <Flame size={15} /> Có giới hạn
                        </button>
                        <button onClick={() => setTimeLimitEnabled(false)} style={{
                            padding: '11px', borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                            background: !timeLimitEnabled ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                            borderColor: !timeLimitEnabled ? '#a855f7' : 'rgba(255,255,255,0.1)',
                            color: !timeLimitEnabled ? '#a855f7' : '#94a3b8',
                            fontWeight: !timeLimitEnabled ? 700 : 400,
                            fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            transition: 'all 0.15s ease'
                        }}>
                            <Clock size={15} /> Tự do
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                        {timeLimitEnabled ? 'Nối sai bị trừ %. Hết giờ = thua.' : 'Không giới hạn — chơi thư giãn!'}
                    </p>
                </div>

                {/* Actions */}
                <button className="btn-primary" onClick={handlePlay} style={{
                    width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '10px', fontSize: '1.1rem', fontWeight: 800,
                    background: gameMode === 'classic' ? '#eab308' : '#a855f7',
                    color: gameMode === 'classic' ? '#000' : '#fff',
                    border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px',
                    transition: 'all 0.2s ease'
                }}>
                    <Play size={18} fill={gameMode === 'classic' ? '#000' : '#fff'} /> Chơi Ngay
                </button>
                <button className="btn-secondary" onClick={() => navigate('/')} style={{
                    width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', fontSize: '0.92rem', borderRadius: '10px'
                }}>
                    <ArrowLeft size={16} /> Quay lại Hub
                </button>
            </div>
        </div>
    );
}
