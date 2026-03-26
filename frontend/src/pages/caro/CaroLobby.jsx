import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';

const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '30x30', value: 30 }
];

export default function CaroLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [gridSize, setGridSize] = useState(15);
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                socket.emit('startCaroGame', { roomId: myRoom });
            }
        };

        const handleGameStarted = ({ gridSize: serverGridSize, playerSymbol }) => {
            navigate('/caro/game', { state: { mode: 'multiplayer', roomId: myRoom, gridSize: serverGridSize || gridSize, playerSymbol } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('caroGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('caroGameStarted', handleGameStarted);
        };
    }, [myRoom, navigate, gridSize]);

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'caro', gridSize }, (res) => {
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
                if (res.gridSize) setGridSize(res.gridSize);
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
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng - Size {gridSize}x{gridSize}:</p>
                    <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.5rem 0', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Đang chờ đối thủ...</p>
                </div>
                <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    navigate('/caro');
                }}>Hủy phòng</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '450px' }}>
            <h2>Multiplayer</h2>
            
            {!isConnected && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--error-color)', fontSize: '0.85rem' }}>
                    ⚠️ Server chưa kết nối.
                </div>
            )}

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Tạo phòng</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    {sizes.map((s) => (
                        <button 
                            key={s.label}
                            className={gridSize === s.value ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => setGridSize(s.value)}
                            style={{ padding: '8px', fontSize: '0.8rem' }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleCreateRoom}>Tạo phòng</button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', width: '100%' }}></div>

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Tham gia phòng</h3>
                <input
                    type="text"
                    placeholder="MÃ PHÒNG"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())}
                    className="glass-input"
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '8px', background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', 
                        textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px' 
                    }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}
                <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleJoinRoom}>Tham gia ngay</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '1rem', width: 'auto', padding: '10px' }} onClick={() => navigate('/caro')}>Quay lại</button>
        </div>
    );
}
