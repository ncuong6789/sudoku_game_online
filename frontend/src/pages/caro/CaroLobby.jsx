import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';

const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '30x30', value: 30 }
];

export default function CaroLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [gridSize, setGridSize] = useState(location.state?.gridSize || 15);
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'caro', gridSize }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
        });
    }, [gridSize]);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Auto create if requested
        if (location.state?.autoCreate && !inRoom && !myRoom) {
            if (socket.connected) {
                handleCreateRoom();
            }
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, inRoom, myRoom, handleCreateRoom]);

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
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Đang tạo phòng...</h2>
            <div className="loader" style={{ margin: '20px auto' }}></div>
            {!isConnected && <p style={{ color: 'var(--error-color)' }}>⚠️ Mất kết nối server...</p>}
            <button className="btn-secondary" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => navigate('/caro')}>Hủy</button>
        </div>
    );
}
