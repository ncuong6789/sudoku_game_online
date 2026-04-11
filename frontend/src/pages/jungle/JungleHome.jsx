import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Gamepad, Users, Shield, Zap, Swords, Info } from 'lucide-react';

const PIECE_NAMES = { 1: 'Chuột', 2: 'Mèo', 3: 'Chó', 4: 'Sói', 5: 'Báo', 6: 'Hổ', 7: 'Sư tử', 8: 'Voi' };
const PIECE_ICONS = { 1: '🐀', 2: '🐱', 3: '🐕', 4: '🐺', 5: '🐆', 6: '🐅', 7: '🦁', 8: '🐘' };

const DIFF_INFO = {
    easy: {
        label: 'Tập sự',
        icon: <Shield size={16} />,
        color: '#4ade80',
        glow: 'rgba(74,222,128,0.35)',
        desc: 'Gợi ý nước đi chi tiết. Phù hợp cho người mới bắt đầu.',
    },
    medium: {
        label: 'Thợ săn',
        icon: <Zap size={16} />,
        color: '#fbbf24',
        glow: 'rgba(251,191,36,0.35)',
        desc: 'Độ khó tiêu chuẩn cho những trận đấu trí căng thẳng.',
    },
    hard: {
        label: 'Vua Rừng Xanh',
        icon: <Swords size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'Thử thách trí tuệ đỉnh cao. Sai một ly đi một dặm.',
    },
};

export default function JungleHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('medium');
    const [showRules, setShowRules] = useState(false);

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#22c55e', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)' }}>
                        <Target size={36} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #4ade80, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none', lineHeight: 1 }}>
                            CỜ THÚ
                        </h1>
                        <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 800, letterSpacing: '4px', marginTop: '4px' }}>
                            JUNGLE CHESS
                        </span>
                    </div>
                    <button onClick={() => setShowRules(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: '#4ade80' }}>
                        <Info size={24} />
                    </button>
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Target size={18} /> Cấp Độ Thử Thách
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {Object.entries(DIFF_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                style={{
                                    padding: '14px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    background: difficulty === key
                                        ? `linear-gradient(135deg, ${info.color}33, ${info.color}22)`
                                        : 'rgba(255,255,255,0.05)',
                                    color: difficulty === key ? info.color : 'var(--text-secondary)',
                                    border: `2px solid ${difficulty === key ? info.color : 'rgba(255,255,255,0.1)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: difficulty === key ? `0 0 18px ${info.glow}` : 'none',
                                }}
                            >
                                {info.icon}
                                <span>{info.label}</span>
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: selectedDiff.color, textAlign: 'center', minHeight: '1.5em', margin: '0.3rem 0', opacity: 0.85 }}>
                        {selectedDiff.desc}
                    </p>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(34, 197, 94, 0.3)', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }} onClick={() => navigate('/jungle/game', { state: { roomId: 'local', mode: 'solo', difficulty } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/jungle/multiplayer', { state: { autoCreate: true, difficulty } })}>
                        <Users size={22} /> Tạo phòng Online
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>

                {showRules && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRules(false)}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '16px', padding: '24px', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ color: '#4ade80', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>📜 Luật Chơi Cờ Thú</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[8,7,6,5,4,3,2,1].map(v => (
                                    <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{PIECE_ICONS[v]}</span>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>{v}. {PIECE_NAMES[v]}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{v===1?'Bơi trong sông, ăn Voi':v===6||v===7?'Nhảy qua sông 2 ô':v===8?'Bị Chuột ăn, k vào sông':'Bình thường'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', fontSize: '0.85rem', color: '#fbbf24' }}>
                                <strong>Quy tắc:</strong> Quân lớn ăn quân nhỏ (8 vs 1 là ngoại lệ). Vào Hang đối phương = THẮNG.
                            </div>
                            <button className="btn-primary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setShowRules(false)}>Đã hiểu</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
