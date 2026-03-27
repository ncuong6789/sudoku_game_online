import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Maximize, Play } from 'lucide-react';

export default function SnakeHome() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('solo');
    const [difficulty, setDifficulty] = useState('Medium');
    const [hasBot, setHasBot] = useState(true);
    const [mapSize, setMapSize] = useState(20);

    const handleStart = () => {
        if (mode === 'solo') {
            navigate('/snake/game', { state: { mode: 'solo', mapSize, difficulty, hasBot } });
        } else {
            navigate('/snake/multiplayer', { state: { autoCreate: true, mapSize } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        🐍 Rắn Săn Mồi
                    </h2>
                    <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto', flexShrink: 0 }}>
                        <ArrowLeft size={16} /> Thoát
                    </button>
                </div>

                {/* Chế độ chơi */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>Chọn chế độ</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div 
                            onClick={() => setMode('solo')}
                            style={{ 
                                flex: 1, padding: '1.2rem', borderRadius: '12px', cursor: 'pointer',
                                background: mode === 'solo' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `2px solid ${mode === 'solo' ? 'var(--primary-color, #4facfe)' : 'transparent'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <User size={24} color={mode === 'solo' ? '#4facfe' : '#94a3b8'} />
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Solo (Có Bot)</span>
                        </div>
                        <div 
                            onClick={() => setMode('multiplayer')}
                            style={{ 
                                flex: 1, padding: '1.2rem', borderRadius: '12px', cursor: 'pointer',
                                background: mode === 'multiplayer' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `2px solid ${mode === 'multiplayer' ? 'var(--primary-color, #4facfe)' : 'transparent'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Users size={24} color={mode === 'multiplayer' ? '#4facfe' : '#94a3b8'} />
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Multiplayer</span>
                        </div>
                    </div>
                </div>

                {/* Cấu hình Solo */}
                {mode === 'solo' && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 'bold' }}>Thách đấu Bot AI</span>
                            <div 
                                onClick={() => setHasBot(!hasBot)}
                                style={{ 
                                    width: '50px', height: '26px', borderRadius: '13px', 
                                    background: hasBot ? 'var(--primary-color)' : '#334155',
                                    position: 'relative', cursor: 'pointer', transition: '0.3s'
                                }}
                            >
                                <div style={{ 
                                    width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                    position: 'absolute', top: '3px', left: hasBot ? '27px' : '3px', transition: '0.3s'
                                }} />
                            </div>
                        </div>

                        {hasBot && (
                            <div>
                                <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Độ khó của Bot</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['Easy', 'Medium', 'Hard'].map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                                background: difficulty === d ? 'rgba(79, 172, 254, 0.2)' : 'transparent',
                                                color: difficulty === d ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                border: `1px solid ${difficulty === d ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'}`,
                                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                                            }}
                                        >
                                            {d === 'Easy' ? 'Dễ' : d === 'Medium' ? 'Vừa' : 'Khó'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Maximize size={16} /> Kích thước Bản đồ
                    </h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[20, 30].map(size => (
                            <button
                                key={size}
                                onClick={() => setMapSize(size)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                    background: mapSize === size ? 'var(--primary-color, #4facfe)' : 'rgba(255,255,255,0.1)',
                                    color: mapSize === size ? '#fff' : 'var(--text-secondary)',
                                    fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
                                }}
                            >
                                {size} x {size}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn-primary" onClick={handleStart} style={{ padding: '14px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <Play size={20} /> {mode === 'solo' ? 'Bắt Đầu Solo' : 'Tìm Đối Thủ Online'}
                </button>

            </div>
        </div>
    );
}
