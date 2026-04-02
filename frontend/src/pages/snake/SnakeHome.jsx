import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Maximize, Gamepad, Zap, Smile, Star, Flame } from 'lucide-react';

const DIFF_INFO = {
    Easy: {
        label: 'Dễ',
        icon: <Smile size={16} />,
        color: '#22c55e',
        glow: 'rgba(34,197,94,0.35)',
        desc: 'Bot AI di chuyển thong thả. Dễ vượt qua.',
    },
    Medium: {
        label: 'Thường',
        icon: <Star size={16} />,
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.35)',
        desc: 'Bot AI linh hoạt. Cần tập trung.',
    },
    Expert: {
        label: 'Expert',
        icon: <Flame size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'Bot AI rất nhanh & thông minh. Khó thắng!',
    },
};

export default function SnakeHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [hasBot, setHasBot] = useState(true);
    const [mapSize, setMapSize] = useState(20);

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--accent-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)' }}>
                        <Zap size={36} color="#000" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        RẮN SĂN MỒI
                    </h1>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', marginBottom: '0.5rem' }}>
                    {/* Map Size Settings */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Kích Thước Bản Đồ
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[20, 30].map((size) => (
                                <button
                                    key={size}
                                    className={mapSize === size ? 'btn-primary' : 'btn-secondary'}
                                    onClick={() => setMapSize(size)}
                                    style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                                >
                                    {size} x {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bot AI Settings */}
                    <div style={{ textAlign: 'left' }}>
                        {/* Toggle Card */}
                        <div
                            onClick={() => setHasBot(!hasBot)}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: hasBot ? 'rgba(79,172,254,0.08)' : 'rgba(255,255,255,0.03)',
                                border: `2px solid ${hasBot ? 'rgba(79,172,254,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.25s',
                                marginBottom: '10px',
                                userSelect: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Flame size={18} color={hasBot ? '#4facfe' : 'var(--text-secondary)'} />
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: hasBot ? '#4facfe' : 'var(--text-secondary)' }}>
                                    Thách Đấu Bot AI
                                </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                                <div style={{
                                    width: '44px', height: '24px', borderRadius: '12px',
                                    background: hasBot ? '#4facfe' : '#334155',
                                    position: 'relative', transition: '0.3s',
                                    boxShadow: hasBot ? '0 0 10px rgba(79,172,254,0.4)' : 'none',
                                }}>
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: '3px', left: hasBot ? '23px' : '3px', transition: '0.3s',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {hasBot && (
                            <>
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
                            </>
                        )}
                    </div>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button
                        className="btn-primary"
                        style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(74, 222, 128, 0.3)' }}
                        onClick={() => navigate('/snake/game', { state: { mode: 'solo', mapSize, difficulty, hasBot } })}
                    >
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        onClick={() => navigate('/snake/multiplayer', { state: { autoCreate: true, mapSize } })}
                    >
                        <Users size={22} /> Tạo phòng Online
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
