import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Gamepad, Map, Zap, Shield, Swords, TreePine, Waves } from 'lucide-react';

export default function JungleHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('medium');

    const DIFF_INFO = {
        easy: {
            label: 'Tập sự',
            icon: <Shield size={16} />,
            color: '#4ade80',
            glow: 'rgba(74,222,128,0.2)',
            desc: 'Gợi ý nước đi chi tiết. Phù hợp để làm quen với cấp bậc các loài thú.',
        },
        medium: {
            label: 'Thợ săn',
            icon: <Zap size={16} />,
            color: '#fbbf24',
            glow: 'rgba(251,191,36,0.2)',
            desc: 'Độ khó tiêu chuẩn cho những trận đấu trí căng thẳng.',
        },
        hard: {
            label: 'Vua Rừng Xanh',
            icon: <Swords size={16} />,
            color: '#ef4444',
            glow: 'rgba(239,68,68,0.2)',
            desc: 'Thử thách trí tuệ đỉnh cao. Sai một ly đi một dặm.',
        },
    };

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                padding: '2.5rem', 
                width: '100%', 
                maxWidth: '650px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}>

                {/* Decorative Background Icons */}
                <TreePine size={120} style={{ position: 'absolute', top: -20, left: -20, opacity: 0.05, transform: 'rotate(-15deg)' }} />
                <Waves size={100} style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.05 }} />

                {/* Header Section */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
                        borderRadius: '24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)' 
                    }}>
                        <Target size={48} color="#000" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ 
                            fontSize: '3.2rem', 
                            margin: 0, 
                            lineHeight: 0.9,
                            background: 'linear-gradient(135deg, #fff, #4ade80)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent', 
                            fontWeight: 900,
                            letterSpacing: '-2px'
                        }}>
                            CỜ THÚ
                        </h1>
                        <span style={{ fontSize: '1rem', color: '#4ade80', fontWeight: 800, letterSpacing: '4px', marginTop: '5px' }}>
                            JUNGLE CHESS
                        </span>
                    </div>
                </div>

                <p style={{ 
                    fontSize: '1.05rem', 
                    color: 'var(--text-secondary)', 
                    textAlign: 'center', 
                    lineHeight: '1.7', 
                    marginBottom: '2.5rem',
                    maxWidth: '500px'
                }}>
                    Vận dụng cấp bậc của 8 loài mãnh thú để chinh phục hang ổ đối phương. 
                    Chuột có thể hạ Voi, Sư tử có thể nhảy qua sông - Chiến thuật là chìa khóa!
                </p>

                {/* Difficulty Grid */}
                <div style={{ width: '100%', marginBottom: '2.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        <Map size={18} /> Cấp Độ Thử Thách
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        {Object.entries(DIFF_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                style={{
                                    padding: '16px 10px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: difficulty === key ? `${info.color}15` : 'rgba(255,255,255,0.03)',
                                    color: difficulty === key ? info.color : 'var(--text-secondary)',
                                    border: `2px solid ${difficulty === key ? info.color : 'rgba(255,255,255,0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: difficulty === key ? `0 0 25px ${info.glow}` : 'none',
                                    transform: difficulty === key ? 'translateY(-4px)' : 'none'
                                }}
                            >
                                {info.icon}
                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{info.label}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ 
                        fontSize: '0.85rem', 
                        color: 'rgba(255,255,255,0.5)', 
                        textAlign: 'center', 
                        padding: '15px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        minHeight: '3.5em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {selectedDiff.desc}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', maxWidth: '450px' }}>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/jungle/game', { state: { roomId: 'local', mode: 'single', difficulty } })}
                        style={{
                            padding: '16px', fontSize: '1.2rem', fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)'
                        }}
                    >
                        <Gamepad size={24} /> BẮT ĐẦU CHIẾN ĐẤU
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ 
                            padding: '14px', 
                            fontSize: '1.1rem', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '10px',
                            background: 'rgba(255,255,255,0.02)'
                        }}
                    >
                        <ArrowLeft size={20} /> QUAY LẠI SẢNH CHỜ
                    </button>
                </div>

                <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    Sử dụng tính năng <b>Matchmaking</b> tại trang chủ để thi đấu Online
                </div>
            </div>
        </div>
    );
}
