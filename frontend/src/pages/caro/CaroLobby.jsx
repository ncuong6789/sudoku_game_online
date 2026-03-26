import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';

export default function CaroLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [difficulty, setDifficulty] = useState('Medium'); // Keep consistent with Sudoku even if hidden
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players.length === 2) {
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
        socket.emit('createRoom', { difficulty, gameType: 'caro' }, ({ roomId: id }) => {
            setMyRoom(id);
            setInRoom(true);
        });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        socket.emit('joinRoom', { roomId: roomId.toUpperCase(), gameType: 'caro' }, ({ success, message }) => {
            if (success) {
                setMyRoom(roomId.toUpperCase());
                setInRoom(true);
            } else {
                setError(message);
                setTimeout(() => setError(''), 3000);
            }
        });
    };

    if (inRoom) {
        return (
            <div className="glass-panel menu-container">
                <h2>Multiplayer</h2>
                <div style={{ margin: '2rem 0', textAlign: 'center' }}>
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
            <h2>Multiplayer</h2>
            
            <div style={{ width: '100%', textAlign: 'left', marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Tạo phòng</h3>
                <div className="glass-input" style={{ marginBottom: '1rem', padding: '12px', background: 'rgba(255,255,255,0.05)' }}>
                    Cơ bản (15x15)
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreateRoom}>Tạo phòng mới</button>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2rem 0' }}></div>

            <div style={{ width: '100%', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '1rem' }}>Tham gia phòng</h3>
                <input 
                    type="text" 
                    placeholder="NHẬP MÃ PHÒNG" 
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    className="glass-input"
                    style={{ padding: '12px', fontSize: '1.1rem', width: '100%', marginBottom: '1rem', textAlign: 'center', letterSpacing: '2px' }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleJoinRoom}>Tham gia ngay</button>
            </div>

            <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%' }} onClick={() => navigate('/caro')}>Quay lại</button>
        </div>
    );
}
