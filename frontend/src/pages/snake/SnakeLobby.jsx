import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { socket } from '../../utils/socket';

const sizes = [
    { label: '20x20', value: 20 },
    { label: '30x30', value: 30 }
];

export default function SnakeLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const initialMapSize = location.state?.mapSize || 20;

    const [mapSize, setMapSize] = useState(initialMapSize);
    
    // States: 'idle', 'finding_match', 'hosting', 'guest'
    const [lobbyState, setLobbyState] = useState('idle');
    const [myRoom, setMyRoom] = useState('');
    const [status, setStatus] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'snake', gridSize: mapSize }, (res) => {
            setMyRoom(res.roomId);
            setLobbyState('hosting');
            setStatus('Đang chờ bạn bè kết nối...');
        });
    }, [mapSize]);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Auto create if requested
        if (location.state?.autoCreate && lobbyState === 'idle' && !myRoom) {
            if (socket.connected) {
                handleCreateRoom();
            }
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, lobbyState, myRoom, handleCreateRoom]);

    useEffect(() => {
        // MATCH FINDING LOGIC
        const handleMatchFound = (data) => {
            setMyRoom(data.roomId);
            setStatus('Đã tìm thấy đối thủ! Trận đấu sẽ bắt đầu ngay...');
            setTimeout(() => {
                navigate('/snake/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: data.roomId,
                        mapSize: data.mapSize || mapSize,
                        playerColor: data.color 
                    } 
                });
            }, 1000);
        };

        const handleWaiting = () => {
            setStatus(`Đang tìm đối thủ cho bản đồ ${mapSize}x${mapSize}...`);
        };

        // PRIVATE ROOM LOGIC
        const handlePlayerJoined = ({ players }) => {
            if (players === 2 && lobbyState === 'hosting') {
                setStatus('Bạn bè đã vào phòng! Đang khởi động...');
                socket.emit('startSnakeGame', { roomId: myRoom, mapSize });
            }
        };

        const handleGameStarted = (data) => {
            setStatus('Trận đấu bắt đầu...');
            setTimeout(() => {
                navigate('/snake/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: data.roomId,
                        mapSize: data.mapSize,
                        playerColor: data.color 
                    } 
                });
            }, 500);
        };

        socket.on('matchFound', handleMatchFound);
        socket.on('waitingForMatch', handleWaiting);
        socket.on('playerJoined', handlePlayerJoined);
        socket.on('snakeGameStarted', handleGameStarted);

        return () => {
            socket.off('matchFound', handleMatchFound);
            socket.off('waitingForMatch', handleWaiting);
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('snakeGameStarted', handleGameStarted);
            // Ignore cancel matching on unmount if game is starting
        };
    }, [navigate, mapSize, lobbyState, myRoom]);


    const handleCancel = () => {
        if (lobbyState === 'finding_match') socket.emit('leaveMatchmaking');
        if (lobbyState === 'hosting' && myRoom) socket.emit('leaveRoom', { roomId: myRoom });
        setLobbyState('idle');
        setMyRoom('');
        navigate('/snake');
    };

    if (lobbyState !== 'idle') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '2rem', textAlign: 'center' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', userSelect: 'none' }}>
                            <Users size={24} /> {lobbyState === 'finding_match' ? 'Tìm trận' : 'Phòng Riêng'}
                        </h2>
                        <button className="btn-secondary" onClick={handleCancel} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto', flexShrink: 0 }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>

                    <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        {lobbyState === 'hosting' && (
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng (Map {mapSize}x{mapSize}):</p>
                                <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.5rem 0', fontSize: '3rem', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                                <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Gửi mã này cho bạn bè...</p>
                            </div>
                        )}

                        <Loader2 size={48} className="spin-animation" style={{ color: 'var(--primary-color, #4facfe)' }} />
                        <h3 style={{ margin: 0 }}>{status}</h3>
                        {lobbyState === 'finding_match' && <p style={{ color: 'var(--text-secondary)' }}>Hệ thống đang dò tìm cao thủ...</p>}
                    </div>

                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        .spin-animation { animation: spin 2s linear infinite; }
                    `}} />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Đang tạo phòng...</h2>
            <div className="loader" style={{ margin: '20px auto' }}></div>
            {!isConnected && <p style={{ color: 'var(--error-color)' }}>⚠️ Mất kết nối server...</p>}
            <button className="btn-secondary" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => navigate('/snake')}>Hủy</button>
        </div>
    );
}
