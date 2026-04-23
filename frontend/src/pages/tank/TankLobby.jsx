import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';
import { ShieldAlert } from 'lucide-react';

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(100,116,139,0.08) 0%, transparent 70%)' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <ShieldAlert size={28} color="#64748b" />
                    <h2 style={{ margin: 0, color: '#64748b' }}>Tank Wars</h2>
                </div>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#cbd5e1' }}>Đang khởi tạo...</h3>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(100,116,139,0.2)', borderTopColor: '#64748b', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠️ Mất kết nối server...</p>}
                <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '12px' }} onClick={() => navigate('/tank')}>Hủy</button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
