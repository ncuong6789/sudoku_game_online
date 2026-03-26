import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TetrisHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px', position: 'relative' }}>
            <h1 style={{ margin: '0 0 0.5rem 0', padding: 0, whiteSpace: 'nowrap', userSelect: 'none' }}>Tetris</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Classic Block Puzzle</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tốc độ khởi điểm rớt (Level):</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Easy', 'Medium', 'Hard'].map((d) => (
                            <button 
                                key={d}
                                className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setDifficulty(d)}
                                style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                            >
                                {d === 'Easy' ? 'Chậm' : d === 'Medium' ? 'Vừa' : 'Nhanh'}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>
                
                <button className="btn-primary" style={{ padding: '14px' }} onClick={() => navigate('/tetris/game', { state: { mode: 'solo', difficulty } })}>
                    Chơi Solo (Huấn luyện)
                </button>
                <button className="btn-secondary" style={{ padding: '14px' }} onClick={() => navigate('/tetris/multiplayer')}>
                    Chế độ Multiplayer
                </button>
                <button className="btn-secondary" style={{ marginTop: '0.5rem', padding: '14px', opacity: 0.7, width: 'auto' }} onClick={() => navigate('/')}>
                    Quay lại Hub
                </button>
            </div>
        </div>
    );
}
