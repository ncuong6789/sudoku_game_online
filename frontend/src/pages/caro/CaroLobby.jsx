import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';

export default function CaroLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                socket.emit('startCaroGame', { roomId: myRoom });
            }
        };

        const handleGameStarted = () => {
            navigate('/caro/game', { state: { mode: 'multiplayer', roomId: myRoom } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('caroGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('caroGameStarted', handleGameStarted);
        };
    }, [myRoom, navigate]);

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'caro' }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
        });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        socket.emit('joinRoom', { roomId: roomId.toUpperCase(), gameType: 'caro' }, (res) => {
            if (res.success) {
                setMyRoom(roomId.toUpperCase());
                setInRoom(true);
            } else {
                setError(res.message);
                setTimeout(() => setError(''), 3000);
            }
        });
    };

    if (inRoom) {
        return (
            <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
                <h2>Multiplayer</h2>
                <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng:</p>
                    <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.5rem 0' }}>{myRoom}</h1>
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Đang chờ đối thủ...</p>
                </div>
                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    navigate('/caro');
                }}>Hủy phòng</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Multiplayer</h2>
            
            {!isConnected && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--error-color)', fontSize: '0.85rem' }}>
                    ⚠️ Server chưa kết nối.
                </div>
            )}

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Tạo phòng</h3>
                <div className="glass-input" style={{ width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '12px', background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', boxSizing: 'border-box', fontSize: '0.9rem' }}>
                    Cơ bản (15x15)
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreateRoom}>Tạo phòng mới</button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.5rem 0', width: '100%' }}></div>

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Tham gia phòng</h3>
                <input
                    type="text"
                    placeholder="NHẬP MÃ PHÒNG"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        marginBottom: '12px', 
                        background: '#1e293b', 
                        color: 'white', 
                        border: '1px solid var(--border-color)', 
                        textTransform: 'uppercase', 
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        letterSpacing: '2px'
                    }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{error}</p>}
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleJoinRoom}>Tham gia ngay</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => navigate('/caro')}>Quay lại</button>
        </div>
    );
}
