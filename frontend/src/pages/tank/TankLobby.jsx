import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';

export default function TankLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const { difficulty = 'medium' } = location.state || {};
    
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [playerCount, setPlayerCount] = useState(1);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const onConnect = () => {
            setIsConnected(true);
            const roomId = `local_${socket.id}`;
            setMyRoom(roomId);
            setInRoom(true);
            socket.emit(EVENTS.START_TANK_GAME, { roomId });
        };
        
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    useEffect(() => {
        const handleGameStarted = (data) => {
            navigate('/tank/game', { state: { roomId: myRoom, mode: 'solo', difficulty } });
        };

        socket.on(EVENTS.TANK_GAME_STARTED, handleGameStarted);
        
        return () => {
            socket.off(EVENTS.TANK_GAME_STARTED, handleGameStarted);
        };
    }, [myRoom, difficulty, navigate]);

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #1a1a2e 0%, #05050a 100%)'
        }}>
            <div className="glass-panel" style={{
                padding: '2rem', borderRadius: '20px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '1rem', maxWidth: '400px', textAlign: 'center'
            }}>
                <h2 style={{ color: '#ffd700', margin: 0 }}>TANK WARS</h2>
                <p style={{ color: '#888' }}>Đang kết nối...</p>
                <div className="loader" style={{ width: '30px', height: '30px', border: '3px solid #333', borderTopColor: '#ffd700', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444' }}>⚠️ Mất kết nối server</p>}
                <button className="btn-secondary" onClick={() => navigate('/tank')}>Hủy</button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
