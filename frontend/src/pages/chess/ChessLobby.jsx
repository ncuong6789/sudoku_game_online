import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { User, Crown } from 'lucide-react';

export default function ChessLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    
    // Negotiation state
    const [myColor, setMyColor] = useState('random'); // w, b, random
    const [opponentColor, setOpponentColor] = useState('random');
    const [isOpponentReady, setIsOpponentReady] = useState(false);
    const [isMyReady, setIsMyReady] = useState(false);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'chess' }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
        });
    }, []);

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

    // Setup Room socket listeners
    useEffect(() => {
        if (!myRoom) return;

        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                // New opponent joined, reset ready states
                setIsOpponentReady(false);
                setOpponentColor('random');
                // Auto send our current preference
                socket.emit('chessColorSelect', { roomId: myRoom, color: myColor, ready: isMyReady });
            }
        };

        const handleColorUpdate = (data) => {
            setOpponentColor(data.color);
            setIsOpponentReady(data.ready);
        };

        const handleGameStarted = (data) => {
            navigate('/chess/game', { state: { mode: 'multiplayer', roomId: myRoom, playerColor: data.playerColors[socket.id] } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('chessColorUpdate', handleColorUpdate);
        socket.on('chessGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('chessColorUpdate', handleColorUpdate);
            socket.off('chessGameStarted', handleGameStarted);
        };
    }, [myRoom, myColor, isMyReady, navigate]);

    // Update our preference to others
    const updateMyColor = (c) => {
        setMyColor(c);
        setIsMyReady(false); // unready when changing color
        socket.emit('chessColorSelect', { roomId: myRoom, color: c, ready: false });
    };

    const toggleReady = () => {
        const newReady = !isMyReady;
        setIsMyReady(newReady);
        socket.emit('chessColorSelect', { roomId: myRoom, color: myColor, ready: newReady });
        
        // If both are ready, the server will trigger the game start. 
        if (newReady && isOpponentReady) {
            socket.emit('startChessGame', { roomId: myRoom });
        }
    };


    const hasConflict = myColor !== 'random' && opponentColor !== 'random' && myColor === opponentColor;
    const canReady = !hasConflict;

    if (inRoom) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 70%)' }}>
                <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Crown size={28} color="#a855f7" />
                        <h2 style={{ margin: 0, color: '#a855f7' }}>Chess Online</h2>
                    </div>

                    <div style={{ background: 'rgba(168,85,247,0.06)', border: '1.5px solid rgba(168,85,247,0.25)', borderRadius: '16px', padding: '15px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 5px 0' }}>Mã phòng của bạn</p>
                        <h1 style={{ letterSpacing: '4px', color: '#a855f7', margin: 0, fontSize: '2rem', fontFamily: 'monospace', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                    </div>

                    {/* Opponent Selection */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', marginBottom: '0.8rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}><User size={16}/> Đối thủ</span>
                            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: isOpponentReady ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)', color: isOpponentReady ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
                                {isOpponentReady ? 'SẴN SÀNG' : 'CHỜ...'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['w', 'b', 'random'].map(c => (
                                <div key={c} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                    background: opponentColor === c ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                                    border: opponentColor === c ? '1px solid #a855f7' : '1px solid transparent',
                                    color: opponentColor === c ? '#d8b4fe' : '#64748b',
                                    transition: 'all 0.2s'
                                }}>
                                    {c === 'w' ? 'Trắng' : c === 'b' ? 'Đen' : 'Random'}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VS divider */}
                    <div style={{ textAlign: 'center', color: '#475569', fontWeight: 900, margin: '0.8rem 0', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
                        <span style={{ background: '#0f172a', padding: '0 12px', position: 'relative', fontSize: '0.85rem', letterSpacing: '2px' }}>VS</span>
                    </div>

                    {/* My Selection */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1.2rem', border: hasConflict ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            <span>👉 Bạn chọn phe:</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['w', 'b', 'random'].map(c => (
                                <button key={c} onClick={() => updateMyColor(c)} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                    background: myColor === c ? '#a855f7' : 'rgba(255,255,255,0.05)',
                                    border: 'none', color: myColor === c ? '#fff' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: myColor === c ? '0 0 15px rgba(168,85,247,0.4)' : 'none'
                                }}>
                                    {c === 'w' ? 'Trắng' : c === 'b' ? 'Đen' : 'Random'}
                                </button>
                            ))}
                        </div>
                        {hasConflict && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '10px', textAlign: 'center', marginBottom: 0, fontWeight: 600 }}>Cả 2 không thể chọn cùng màu!</p>}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" style={{ flex: 1, padding: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }} onClick={() => {
                            setInRoom(false); setMyRoom(''); navigate('/chess');
                        }}>Rời phòng</button>
                        <button 
                            style={{ flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: canReady ? 'pointer' : 'not-allowed', color: '#000',
                                background: isMyReady ? '#4ade80' : (canReady ? '#a855f7' : '#475569'),
                                opacity: canReady ? 1 : 0.5, transition: 'all 0.2s'
                            }}
                            disabled={!canReady}
                            onClick={toggleReady}
                        >
                            {isMyReady ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 1.5rem 0' }}>Đang khởi tạo...</h2>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(168,85,247,0.2)', borderTopColor: '#a855f7', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠️ Đang kết nối server...</p>}
                <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '12px' }} onClick={() => navigate('/chess')}>Hủy</button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
