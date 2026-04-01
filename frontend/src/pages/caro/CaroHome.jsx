import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Swords } from 'lucide-react';

const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '20x20', value: 20 }
];

export default function CaroHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [gridSize, setGridSize] = useState(15);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '70px', height: '70px', background: '#14b8a6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 30px rgba(20, 184, 166, 0.3)', marginTop: '0.5rem' }}>
                    <Swords size={40} color="#fff" />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    CARO
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                    Cờ ca-rô truyền thống - đơn giản nhưng đầy chiến thuật!
                </p>
            
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', marginBottom: '1.5rem' }}>
                {/* Difficulty */}
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Độ khó Solo:</p>
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
                </div>
                
                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(20, 184, 166, 0.3)' }} onClick={() => navigate('/caro/game', { state: { mode: 'solo', difficulty, gridSize } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/caro/multiplayer', { state: { autoCreate: true, gridSize } })}>
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
