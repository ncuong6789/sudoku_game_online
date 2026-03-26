import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChessHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [isFlipping, setIsFlipping] = useState(false);
    const [assignedColor, setAssignedColor] = useState(null); // 'w' or 'b'

    const [soloColor, setSoloColor] = useState('random');

    const handleStartSolo = () => {
        setIsFlipping(true);
        setAssignedColor(null);

        if (soloColor === 'random') {
            // Hiệu ứng "lật màu" giả lập trong 1.5 giây
            let flips = 0;
            const interval = setInterval(() => {
                setAssignedColor(flips % 2 === 0 ? 'w' : 'b');
                flips++;
            }, 150);

            setTimeout(() => {
                clearInterval(interval);
                const finalColor = Math.random() < 0.5 ? 'w' : 'b';
                setAssignedColor(finalColor);
                
                // Giữ màn hình kết quả lật màu thêm 1 giây trước khi vào game
                setTimeout(() => {
                    navigate('/chess/game', { state: { mode: 'solo', difficulty, playerColor: finalColor } });
                }, 1000);
            }, 1500);
        } else {
            // Nếu đã chọn cố định, chuyển thẳng vào game sau một animation ngắn
            setAssignedColor(soloColor);
            setTimeout(() => {
                navigate('/chess/game', { state: { mode: 'solo', difficulty, playerColor: soloColor } });
            }, 800);
        }
    };

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px', position: 'relative' }}>
            <h1 style={{ margin: '0 0 0.5rem 0', padding: 0 }}>Cờ vua</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Đấu trí chiến thuật</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', opacity: isFlipping ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                {/* Difficulty */}
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Độ khó AI:</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Easy', 'Medium', 'Hard'].map((d) => (
                            <button 
                                key={d}
                                className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setDifficulty(d)}
                                disabled={isFlipping}
                                style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                            >
                                {d === 'Easy' ? 'Tân binh' : d === 'Medium' ? 'Nghiệp dư' : 'Đại kiện tướng'}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Solo Color Selection */}
                <div style={{ textAlign: 'left', marginTop: '0.2rem' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Phe của bạn (Solo):</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['w', 'b', 'random'].map((c) => (
                            <button 
                                key={c}
                                className={soloColor === c ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setSoloColor(c)}
                                disabled={isFlipping}
                                style={{ flex: 1, padding: '10px', fontSize: '0.8rem', ...(soloColor === c ? { background: 'var(--primary-color)' } : {}) }}
                            >
                                {c === 'w' ? 'Trắng' : c === 'b' ? 'Đen' : 'N.Nhiên'}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn-primary" style={{ padding: '14px', marginTop: '0.5rem' }} onClick={handleStartSolo} disabled={isFlipping}>
                    Bắt đầu chơi Solo
                </button>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.2rem 0' }}></div>
                <button className="btn-secondary" style={{ padding: '14px' }} onClick={() => navigate('/chess/multiplayer')} disabled={isFlipping}>
                    Chế độ Multiplayer
                </button>
                <button className="btn-secondary" style={{ marginTop: '0.5rem', padding: '14px', opacity: 0.7 }} onClick={() => navigate('/')} disabled={isFlipping}>
                    Quay lại Hub
                </button>
            </div>

            {/* Random Color Overlay */}
            {isFlipping && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(20, 20, 30, 0.6)', borderRadius: '24px', zIndex: 10
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
    );
}
