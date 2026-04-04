import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Puzzle } from 'lucide-react';

export default function PikachuHome() {
    const navigate = useNavigate();

    return (
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(234, 179, 8, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '1.5rem' }}>
                    <Puzzle size={64} color="#eab308" />
                </div>
                <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: '#eab308' }}>Pikachu Onet</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Trò chơi nối thú cổ điển đã quay trở lại! Đi qua các màn chơi thử thách với đa dạng các bản đồ Static, Gravity, Shift và hơn thế nữa. Thiết kế dành riêng cho bạn với đồ họa pixel chuẩn nguyên bản.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowLeft size={20} /> Quay lại
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/pikachu/game')} style={{ background: '#eab308', color: '#000', padding: '15px 40px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                        <Play size={20} fill="#000" /> Vào chơi luôn
                    </button>
                </div>
            </div>
        </div>
    );
}
