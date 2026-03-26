import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '30x30', value: 30 }
];

export default function CaroHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [gridSize, setGridSize] = useState(15);

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h1 style={{ margin: '0 0 0.5rem 0', padding: 0 }}>Caro</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Thử thách trí tuệ</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                {/* Difficulty */}
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Độ khó Solo:</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Easy', 'Medium', 'Hard'].map((d) => (
                            <button 
                                key={d}
                                className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setDifficulty(d)}
                                style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                            >
                                {d === 'Easy' ? 'Dễ' : d === 'Medium' ? 'Vừa' : 'Khó'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Size */}
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Kích thước bàn cờ:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {sizes.map((s) => (
                            <button 
                                key={s.label}
                                className={gridSize === s.value ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setGridSize(s.value)}
                                style={{ padding: '12px 10px', fontSize: '0.8rem' }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                <button className="btn-primary" style={{ padding: '14px', marginTop: '0.5rem' }} onClick={() => navigate('/caro/game', { state: { mode: 'solo', difficulty, gridSize } })}>
                    Chế độ Solo
                </button>
                <button className="btn-secondary" style={{ padding: '14px' }} onClick={() => navigate('/caro/multiplayer')}>
                    Chế độ Multiplayer
                </button>
                <button className="btn-secondary" style={{ marginTop: '0.5rem', padding: '14px', opacity: 0.7 }} onClick={() => navigate('/')}>
                    Quay lại Hub
                </button>
            </div>
        </div>
    );
}
