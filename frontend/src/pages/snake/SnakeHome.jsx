import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Maximize, Play, Zap, Gamepad } from 'lucide-react';

export default function SnakeHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [hasBot, setHasBot] = useState(true);
    const [mapSize, setMapSize] = useState(20);

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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', marginBottom: '1.5rem' }}>
                    {/* Map Size Settings (General) */}
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Kích thước Bản đồ (Chung):</p>
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

                    {/* Bot AI Settings (Solo) */}
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Thách đấu Bot AI (Solo):</p>
                            <div
                                onClick={() => setHasBot(!hasBot)}
                                style={{
                                    width: '40px', height: '22px', borderRadius: '11px',
                                    background: hasBot ? 'var(--primary-color)' : '#334155',
                                    position: 'relative', cursor: 'pointer', transition: '0.3s'
                                }}
                            >
                                <div style={{
                                    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                                    position: 'absolute', top: '3px', left: hasBot ? '21px' : '3px', transition: '0.3s'
                                }} />
                            </div>
                        </div>
                        {hasBot && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['Easy', 'Medium', 'Hard'].map((d) => (
                                    <button
                                        key={d}
                                        className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                        onClick={() => setDifficulty(d)}
                                        style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                                    >
                                        {d === 'Easy' ? 'Dễ' : d === 'Medium' ? 'Vừa' : 'Khó'}
                                    </button>
                                ))}
                            </div>
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
