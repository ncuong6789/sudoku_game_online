import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Crown } from 'lucide-react';

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
            // Nếu đã chọn cố định, chuyển thẳng vào game luôn
            navigate('/chess/game', { state: { mode: 'solo', difficulty, playerColor: soloColor } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '70px', height: '70px', background: '#9ca3af', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 30px rgba(156, 163, 175, 0.3)', marginTop: '0.5rem' }}>
                    <Crown size={40} color="#fff" />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', background: 'linear-gradient(135deg, #e5e7eb, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    CỜ VUA
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                    Môn thể thao trí tuệ đỉnh cao của nhân loại!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', opacity: isFlipping ? 0.3 : 1, transition: 'opacity 0.3s', marginBottom: '1.5rem' }}>
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
                        <button 
                            onClick={() => setSoloColor('w')}
                            disabled={isFlipping}
                            style={{ 
                                flex: 1, padding: '10px 5px', fontSize: '0.85rem', fontWeight: 'bold',
                                background: '#f8f9fa', color: '#212529',
                                border: soloColor === 'w' ? '2px solid #212529' : '2px solid transparent',
                                outline: 'none',
                                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                opacity: soloColor === 'w' ? 1 : 0.6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>♔</span> Trắng
                        </button>
                        
                        <button 
                            onClick={() => setSoloColor('b')}
                            disabled={isFlipping}
                            style={{ 
                                flex: 1, padding: '10px 5px', fontSize: '0.85rem', fontWeight: 'bold',
                                background: '#212529', color: '#f8f9fa',
                                border: soloColor === 'b' ? '2px solid #f8f9fa' : '2px solid transparent',
                                outline: 'none',
                                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                opacity: soloColor === 'b' ? 1 : 0.6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>♚</span> Đen
                        </button>

                        <button 
                            onClick={() => setSoloColor('random')}
                            disabled={isFlipping}
                            style={{ 
                                width: '50px', flexShrink: 0, padding: '10px 0', fontSize: '0.85rem', fontWeight: 'bold',
                                background: soloColor === 'random' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', 
                                color: '#fff',
                                outline: 'none',
                                border: soloColor === 'random' ? '2px solid var(--primary-color)' : '2px solid transparent',
                                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: soloColor === 'random' ? 1 : 0.6
                            }}
                        >
                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎲</span>
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
