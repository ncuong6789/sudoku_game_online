import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Layers } from 'lucide-react';

export default function TetrisHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '70px', height: '70px', background: '#d946ef', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 30px rgba(217, 70, 239, 0.3)', marginTop: '0.5rem' }}>
                    <Layers size={40} color="#fff" />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', background: 'linear-gradient(135deg, #a855f7, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    TETRIS
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                    Trò chơi xếp hình khối thập niên 80, kinh điển mọi thời đại!
                </p>
            
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', marginBottom: '1.5rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tốc độ khởi điểm rớt khối:</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Easy', 'Medium', 'Hard'].map((d) => (
                            <button 
                                key={d}
                                className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setDifficulty(d)}
                                style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                            >
                                {d === 'Easy' ? 'Chậm' : d === 'Medium' ? 'Vừa' : 'Nhanh'}
                            </button>
                        ))}
                    </div>
                </div>
                </div>
                
                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)' }} onClick={() => navigate('/tetris/game', { state: { mode: 'solo', difficulty } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/tetris/multiplayer', { state: { autoCreate: true, difficulty } })}>
                        <Users size={22} /> Tạo phòng Online
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
