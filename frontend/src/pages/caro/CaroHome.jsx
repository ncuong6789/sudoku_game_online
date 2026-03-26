import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Users, User, ArrowLeft } from 'lucide-react';

export default function CaroHome() {
    const navigate = useNavigate();

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '10px' }}>
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ margin: 0 }}>Cờ Caro 15x15</h1>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
                Trò chơi trí tuệ kinh điển. Hãy xếp đủ 5 quân để chiến thắng!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="stat-card" style={{ cursor: 'pointer', border: '1px solid rgba(var(--primary-color-rgb), 0.3)' }} onClick={() => navigate('/caro/game', { state: { mode: 'solo' } })}>
                    <User size={32} color="var(--primary-color)" />
                    <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Chơi Solo</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Luyện tập với AI</p>
                </div>

                <div className="stat-card" style={{ cursor: 'pointer', border: '1px solid rgba(var(--primary-color-rgb), 0.3)' }} onClick={() => navigate('/caro/multiplayer')}>
                    <Users size={32} color="var(--primary-color)" />
                    <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Multiplayer</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thách đấu bạn bè</p>
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem', fontSize: '0.9rem', textAlign: 'left' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Luật chơi cơ bản:</h4>
                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                    <li>Bàn cờ kích thước 15x15.</li>
                    <li>Người chơi thay phiên nhau đặt quân X và O.</li>
                    <li>Ai xếp đủ 5 quân liên tiếp (ngang, dọc, chéo) trước sẽ thắng.</li>
                </ul>
            </div>
        </div>
    );
}
