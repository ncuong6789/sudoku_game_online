import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { socket } from '../../utils/socket';

export default function SnakeLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const { mapSize } = location.state || { mapSize: 20 };

    const [status, setStatus] = useState('Đang kết nối tải dữ liệu phòng...');
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        // Gửi lệnh tìm phòng. Backend cần tự ghép các settings khác nhau hoặc ưu tiên người tạo phòng
        socket.emit('findMatch', { game: 'snake', mapSize });

        const handleMatchFound = (data) => {
            setRoomId(data.roomId);
            setStatus('Đã tìm thấy đối thủ! Trận đấu sẽ bắt đầu ngay...');
            setTimeout(() => {
                navigate('/snake/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: data.roomId,
                        mapSize: data.mapSize || mapSize, // Ưu tiên Map size của Server chốt
                        playerColor: data.color // p1 (green) or p2 (blue)
                    } 
                });
            }, 1000);
        };

        const handleWaiting = () => {
            setStatus(`Đang tìm đối thủ cho bản đồ ${mapSize}x${mapSize}...`);
        };

        socket.on('matchFound', handleMatchFound);
        socket.on('waitingForMatch', handleWaiting);

        return () => {
            socket.off('matchFound', handleMatchFound);
            socket.off('waitingForMatch', handleWaiting);
            socket.emit('leaveMatchmaking');
        };
    }, [navigate, mapSize]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '2rem', textAlign: 'center' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={24} /> Phòng Chờ Rắn (PvP)
                    </h2>
                    <button className="btn-secondary" onClick={() => navigate('/snake')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={16} /> Thoát
                    </button>
                </div>

                <div style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    {!roomId ? (
                        <>
                            <Loader2 size={48} className="spin-animation" style={{ color: 'var(--primary-color, #4facfe)' }} />
                            <h3 style={{ margin: 0 }}>{status}</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Vui lòng giữ tab này không tắt để tránh mất kết nối.</p>
                        </>
                    ) : (
                        <>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <Users size={30} color="#000" />
                            </div>
                            <h3 style={{ margin: 0, color: '#4ade80' }}>{status}</h3>
                        </>
                    )}
                </div>

                {/* Inline spin animation */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                    .spin-animation { animation: spin 2s linear infinite; }
                `}} />
            </div>
        </div>
    );
}
