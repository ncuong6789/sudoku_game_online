import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Crown, Smile, Star, Flame } from 'lucide-react';

const DIFF_INFO = {
    Easy: {
        label: 'Tân Binh',
        icon: <Smile size={16} />,
        color: '#22c55e',
        glow: 'rgba(34,197,94,0.35)',
        desc: 'AI mức cơ bản. Phù hợp người mới học cờ.',
    },
    Medium: {
        label: 'Nghiệp Dư',
        icon: <Star size={16} />,
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.35)',
        desc: 'AI tư duy chiến thuật. Cần suy nghĩ kỹ.',
    },
    Expert: {
        label: 'Đại Kiện Tướng',
        icon: <Flame size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'AI mức cao thủ. Gần như không thể thắng!',
    },
};

export default function ChessHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [isFlipping, setIsFlipping] = useState(false);
    const [assignedColor, setAssignedColor] = useState(null);
    const [soloColor, setSoloColor] = useState('random');

    const selectedDiff = DIFF_INFO[difficulty];

    const handleStartSolo = () => {
        setIsFlipping(true);
        setAssignedColor(null);

        if (soloColor === 'random') {
            let flips = 0;
            const interval = setInterval(() => {
                setAssignedColor(flips % 2 === 0 ? 'w' : 'b');
                flips++;
            }, 150);

            setTimeout(() => {
                clearInterval(interval);
                const finalColor = Math.random() < 0.5 ? 'w' : 'b';
                setAssignedColor(finalColor);
                setTimeout(() => {
                    navigate('/chess/game', { state: { mode: 'solo', difficulty, playerColor: finalColor } });
                }, 1000);
            }, 1500);
        } else {
            navigate('/chess/game', { state: { mode: 'solo', difficulty, playerColor: soloColor } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#9ca3af', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(156, 163, 175, 0.3)' }}>
                        <Crown size={36} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #e5e7eb, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        CỜ VUA
                    </h1>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', opacity: isFlipping ? 0.3 : 1, transition: 'opacity 0.3s', marginBottom: '1.5rem' }}>

                    {/* Difficulty */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <Flame size={18} /> Độ Khó AI
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            {Object.entries(DIFF_INFO).map(([key, info]) => (
                                <button
                                    key={key}
                                    onClick={() => setDifficulty(key)}
                                    disabled={isFlipping}
                                    style={{
                                        padding: '14px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
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

                    {/* Solo Color Selection */}
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Phe của bạn (Solo):</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <button
                                onClick={() => setSoloColor('w')}
                                disabled={isFlipping}
                                style={{
                                    flex: 1, padding: '10px 5px', fontSize: '0.9rem', fontWeight: 'bold',
                                    background: '#f8f9fa', color: '#111827',
                                    border: soloColor === 'w' ? '2px solid var(--primary-color, #4facfe)' : '2px solid transparent',
                                    outline: 'none',
                                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                    opacity: soloColor === 'w' ? 1 : 0.5,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    boxShadow: soloColor === 'w' ? '0 0 10px rgba(79, 172, 254, 0.4)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>♔</span> Trắng
                            </button>

                            <button
                                onClick={() => setSoloColor('random')}
                                disabled={isFlipping}
                                style={{
                                    width: '60px', flexShrink: 0, padding: '0', fontSize: '0.9rem', fontWeight: 'bold',
                                    background: soloColor === 'random' ? 'var(--primary-color, #4facfe)' : 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    outline: 'none',
                                    border: soloColor === 'random' ? '2px solid var(--primary-color, #4facfe)' : '2px solid rgba(255,255,255,0.2)',
                                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: soloColor === 'random' ? 1 : 0.6,
                                    boxShadow: soloColor === 'random' ? '0 0 10px rgba(79, 172, 254, 0.4)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🎲</span>
                            </button>

                            <button
                                onClick={() => setSoloColor('b')}
                                disabled={isFlipping}
                                style={{
                                    flex: 1, padding: '10px 5px', fontSize: '0.9rem', fontWeight: 'bold',
                                    background: '#1f2937', color: '#f8f9fa',
                                    border: soloColor === 'b' ? '2px solid var(--primary-color, #4facfe)' : '2px solid #4b5563',
                                    outline: 'none',
                                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                    opacity: soloColor === 'b' ? 1 : 0.5,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    boxShadow: soloColor === 'b' ? '0 0 10px rgba(79, 172, 254, 0.4)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>♚</span> Đen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', opacity: isFlipping ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    <button className="btn-primary" onClick={handleStartSolo} disabled={isFlipping} style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(156, 163, 175, 0.3)' }}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/chess/multiplayer', { state: { autoCreate: true } })} disabled={isFlipping} style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Users size={22} /> Tạo phòng Online
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/')} disabled={isFlipping} style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>

                {/* Random Color Overlay */}
                {isFlipping && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(20, 20, 30, 0.8)', zIndex: 10
                    }}>
                        <h3 style={{ marginBottom: '1rem' }}>Chọn phe ngẫu nhiên...</h3>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: assignedColor === 'w' ? '#f8f9fa' : '#212529',
                            border: '4px solid #4facfe',
                            boxShadow: '0 0 20px rgba(79, 172, 254, 0.5)',
                            transition: 'background 0.1s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '2rem' }}>{assignedColor === 'w' ? '♔' : '♚'}</span>
                        </div>
                        {assignedColor && <p style={{ marginTop: '1rem', fontWeight: 'bold', color: assignedColor === 'w' ? '#fff' : '#aaa' }}>
                            Bạn cầm quân {assignedColor === 'w' ? 'Trắng' : 'Đen'}!
                        </p>}
                    </div>
                )}
            </div>
        </div>
    );
}
