import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, Users, Plus } from 'lucide-react';

export default function CaroLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players.length === 2) {
                // Game starts when 2 players are in
                // For Caro, we don't need to generate a puzzle
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
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        setMyRoom(id);
        setInRoom(true);
        socket.emit('createRoom', { roomId: id, gameType: 'caro' });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        setMyRoom(roomId.toUpperCase());
        setInRoom(true);
        socket.emit('joinRoom', { roomId: roomId.toUpperCase(), gameType: 'caro' });
    };

    if (inRoom) {
        return (
            <div className="glass-panel menu-container">
                <h2>Phòng chờ Caro</h2>
                <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng của bạn:</p>
                    <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)' }}>{myRoom}</h1>
                </div>
                <p>Đang đợi đối thủ tham gia...</p>
                <button className="btn-secondary" style={{ marginTop: '2rem' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    navigate('/caro');
                }}>Hủy phòng</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', marginBottom: '2rem' }}>
                <button className="btn-secondary" onClick={() => navigate('/caro')} style={{ padding: '10px' }}>
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0 }}>Chơi Multiplayer</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                <button className="btn-primary" onClick={handleCreateRoom} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Plus size={20} /> Tạo phòng mới
                </button>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tham gia bằng mã phòng:</label>
                    <input 
                        type="text" 
                        placeholder="Nhập mã phòng..." 
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="glass-input"
                        style={{ padding: '12px', fontSize: '1.1rem' }}
                    />
                </div>
                <button className="btn-secondary" onClick={handleJoinRoom}>Tham gia ngay</button>
            </div>
        </div>
    );
}
