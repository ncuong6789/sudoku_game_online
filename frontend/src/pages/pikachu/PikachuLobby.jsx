import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, Users, Hash, Wifi, WifiOff, Copy, Check, Puzzle } from 'lucide-react';

const EVENTS = {
    CREATE_ROOM: 'createRoom',
    JOIN_ROOM: 'joinRoom',
    PLAYER_JOINED: 'playerJoined',
    LEAVE_ROOM: 'leaveRoom',
};

export default function PikachuLobby() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('create'); // 'create' | 'join'
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [playerCount, setPlayerCount] = useState(1);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [copied, setCopied] = useState(false);
    const [joining, setJoining] = useState(false);

    // ── Connection ────────────────────────────────────────────────────────────
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

    // ── Player joined → start when 2 ─────────────────────────────────────────
    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            setPlayerCount(players);
            if (players === 2 && isHost && myRoom) {
                navigate('/pikachu/online-game', {
                    state: { roomId: myRoom, isHost: true },
                });
            }
        };
        socket.on(EVENTS.PLAYER_JOINED, handlePlayerJoined);
        return () => socket.off(EVENTS.PLAYER_JOINED, handlePlayerJoined);
    }, [isHost, myRoom, navigate]);

    // ── Create Room ───────────────────────────────────────────────────────────
    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit(EVENTS.CREATE_ROOM, { gameType: 'pikachu' }, (res) => {
            if (res?.roomId) {
                setMyRoom(res.roomId);
                setInRoom(true);
                setIsHost(true);
                setPlayerCount(1);
            }
        });
    }, []);

    // ── Join Room ─────────────────────────────────────────────────────────────
    const handleJoinRoom = useCallback(() => {
        const code = joinCode.trim().toUpperCase();
        if (!code || code.length < 4) {
            setJoinError('Nhập mã phòng hợp lệ (4–6 ký tự)');
            return;
        }
        if (!socket.connected) {
            setJoinError('Chưa kết nối server');
            return;
        }
        setJoining(true);
        socket.emit(EVENTS.JOIN_ROOM, { roomId: code, gameType: 'pikachu' }, (res) => {
            setJoining(false);
            if (res?.success) {
                navigate('/pikachu/online-game', {
                    state: { roomId: code, isHost: false },
                });
            } else {
                setJoinError(res?.message || 'Mã phòng không hợp lệ hoặc phòng đã đầy');
            }
        });
    }, [joinCode, navigate]);

    // ── Copy room code ────────────────────────────────────────────────────────
    const copyCode = () => {
        navigator.clipboard.writeText(myRoom).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Leave room ────────────────────────────────────────────────────────────
    const leaveRoom = () => {
        socket.emit(EVENTS.LEAVE_ROOM, myRoom);
        setInRoom(false);
        setMyRoom('');
        setIsHost(false);
        setPlayerCount(1);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UI: Waiting in created room
    // ─────────────────────────────────────────────────────────────────────────
    if (inRoom) {
        return (
            <div style={styles.overlay}>
                <div style={styles.panel}>
                    {/* Header */}
                    <div style={styles.headerRow}>
                        <div style={styles.iconBox}>
                            <Puzzle size={28} color="#eab308" />
                        </div>
                        <div>
                            <h2 style={styles.title}>PIKACHU ONLINE</h2>
                            <p style={styles.subtitle}>Chờ đối thủ vào phòng…</p>
                        </div>
                    </div>

                    {/* Room Code */}
                    <div style={styles.roomCodeBox}>
                        <div style={styles.roomCodeLabel}>MÃ PHÒNG</div>
                        <div style={styles.roomCodeRow}>
                            <span style={styles.roomCode}>{myRoom}</span>
                            <button style={styles.copyBtn} onClick={copyCode}>
                                {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} color="#94a3b8" />}
                            </button>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0', textAlign: 'center' }}>
                            Gửi mã này cho bạn bè để vào cùng phòng
                        </p>
                    </div>

                    {/* Player Status */}
                    <div style={styles.playersRow}>
                        <div style={{ ...styles.playerSlot, borderColor: '#ef4444' }}>
                            <div style={{ ...styles.playerDot, background: '#ef4444' }} />
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>Bạn</span>
                        </div>
                        <span style={{ color: '#475569', fontSize: '1.2rem', fontWeight: 900 }}>VS</span>
                        <div style={{
                            ...styles.playerSlot,
                            borderColor: playerCount >= 2 ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                            opacity: playerCount >= 2 ? 1 : 0.5
                        }}>
                            {playerCount >= 2
                                ? <><div style={{ ...styles.playerDot, background: '#38bdf8' }} />
                                    <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>Đối thủ</span></>
                                : <>
                                    <div style={styles.waitingDot} />
                                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>Đang chờ…</span>
                                </>
                            }
                        </div>
                    </div>

                    {playerCount >= 2 && (
                        <div style={styles.readyBadge}>🎮 Cả 2 đã vào! Đang khởi động…</div>
                    )}

                    <button style={styles.leaveBtn} onClick={leaveRoom}>
                        <ArrowLeft size={15} /> Rời phòng
                    </button>
                </div>
                <style>{`
                    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
                    @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
                `}</style>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI: Main Lobby
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={styles.overlay}>
            <div style={styles.panel}>
                {/* Header */}
                <div style={styles.headerRow}>
                    <div style={styles.iconBox}>
                        <Puzzle size={28} color="#eab308" />
                    </div>
                    <div>
                        <h2 style={styles.title}>PIKACHU ONLINE</h2>
                        <p style={styles.subtitle}>Chơi 2 người – Real-time</p>
                    </div>
                </div>

                {/* Connection indicator */}
                <div style={styles.connBadge}>
                    {isConnected
                        ? <><Wifi size={13} color="#4ade80" /> <span style={{ color: '#4ade80' }}>Đã kết nối server</span></>
                        : <><WifiOff size={13} color="#ef4444" /> <span style={{ color: '#ef4444' }}>Mất kết nối – thử lại…</span></>
                    }
                </div>

                {/* Tabs */}
                <div style={styles.tabs}>
                    <button style={{ ...styles.tab, ...(tab === 'create' ? styles.tabActive : {}) }}
                        onClick={() => { setTab('create'); setJoinError(''); }}>
                        <Users size={15} /> Tạo Phòng
                    </button>
                    <button style={{ ...styles.tab, ...(tab === 'join' ? styles.tabActive : {}) }}
                        onClick={() => { setTab('join'); setJoinError(''); }}>
                        <Hash size={15} /> Nhập Mã
                    </button>
                </div>

                {tab === 'create' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={styles.infoCard}>
                            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>🎮</div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                Tạo phòng riêng rồi gửi <b style={{ color: '#eab308' }}>mã phòng</b> cho bạn bè để chơi cùng nhau.
                            </div>
                        </div>
                        <button
                            style={{ ...styles.primaryBtn, opacity: isConnected ? 1 : 0.5 }}
                            disabled={!isConnected}
                            onClick={handleCreateRoom}
                        >
                            <Users size={16} /> Tạo Phòng Mới
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                style={styles.input}
                                maxLength={6}
                                value={joinCode}
                                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                                placeholder="Nhập mã phòng (VD: A1B2C3)"
                                autoFocus
                            />
                        </div>
                        {joinError && (
                            <div style={styles.errorMsg}>⚠ {joinError}</div>
                        )}
                        <button
                            style={{ ...styles.primaryBtn, opacity: (isConnected && !joining) ? 1 : 0.5 }}
                            disabled={!isConnected || joining}
                            onClick={handleJoinRoom}
                        >
                            {joining ? 'Đang vào phòng…' : <><Hash size={16} /> Vào Phòng</>}
                        </button>
                    </div>
                )}

                {/* Divider */}
                <div style={styles.divider} />

                {/* Color legend */}
                <div style={styles.legendBox}>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.colorDot, background: '#ef4444' }} />
                        <span>Màu đỏ = Bạn</span>
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.colorDot, background: '#38bdf8' }} />
                        <span>Màu xanh = Đối thủ</span>
                    </div>
                </div>

                <button style={styles.backBtn} onClick={() => navigate('/pikachu')}>
                    <ArrowLeft size={15} /> Quay lại
                </button>
            </div>
            <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
    overlay: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        width: '100vw', height: '100vh', padding: '1rem', boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.08) 0%, transparent 70%)',
    },
    panel: {
        width: '100%', maxWidth: '440px',
        background: 'rgba(15,15,25,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '2rem 2rem 1.5rem',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        animation: 'fadeInUp 0.3s ease',
    },
    headerRow: {
        display: 'flex', alignItems: 'center', gap: '14px',
    },
    iconBox: {
        background: 'rgba(234,179,8,0.15)',
        border: '1px solid rgba(234,179,8,0.3)',
        borderRadius: '14px', padding: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        margin: 0, fontSize: '1.5rem', color: '#eab308', fontWeight: 900, letterSpacing: '0.04em',
    },
    subtitle: {
        margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b',
    },
    connBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px', padding: '6px 12px',
        fontSize: '0.8rem', fontWeight: 600,
    },
    tabs: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px',
    },
    tab: {
        padding: '9px', borderRadius: '9px', border: 'none', cursor: 'pointer',
        background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.85rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        transition: 'all 0.15s ease',
    },
    tabActive: {
        background: 'rgba(234,179,8,0.15)', color: '#eab308',
        boxShadow: '0 0 0 1px rgba(234,179,8,0.2)',
    },
    infoCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', padding: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
    },
    primaryBtn: {
        width: '100%', padding: '13px',
        background: 'linear-gradient(135deg, #eab308, #ca8a04)',
        color: '#000', fontWeight: 800, fontSize: '0.95rem',
        border: 'none', borderRadius: '12px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'transform 0.1s ease, box-shadow 0.15s ease',
        boxShadow: '0 4px 20px rgba(234,179,8,0.3)',
    },
    input: {
        width: '100%', boxSizing: 'border-box',
        padding: '13px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', color: '#fff', fontSize: '1.1rem',
        fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
        outline: 'none',
    },
    errorMsg: {
        color: '#ef4444', fontSize: '0.82rem', fontWeight: 600,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '8px', padding: '8px 12px',
    },
    divider: {
        height: '1px', background: 'rgba(255,255,255,0.06)',
    },
    legendBox: {
        display: 'flex', gap: '24px', justifyContent: 'center',
    },
    legendItem: {
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '0.8rem', color: '#64748b', fontWeight: 600,
    },
    colorDot: {
        width: '12px', height: '12px', borderRadius: '50%',
        boxShadow: '0 0 6px currentColor',
    },
    backBtn: {
        width: '100%', padding: '11px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '10px', color: '#94a3b8', fontWeight: 700,
        fontSize: '0.88rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    },
    // Waiting room styles
    roomCodeBox: {
        background: 'rgba(234,179,8,0.06)',
        border: '1.5px solid rgba(234,179,8,0.25)',
        borderRadius: '16px', padding: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    },
    roomCodeLabel: {
        color: '#64748b', fontSize: '0.7rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
    },
    roomCodeRow: {
        display: 'flex', alignItems: 'center', gap: '10px',
    },
    roomCode: {
        fontSize: '2.2rem', fontWeight: 900, color: '#eab308',
        letterSpacing: '0.25em', fontFamily: 'monospace',
    },
    copyBtn: {
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    playersRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
    },
    playerSlot: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px solid',
        borderRadius: '12px', padding: '12px 16px',
        transition: 'border-color 0.3s ease',
    },
    playerDot: {
        width: '10px', height: '10px', borderRadius: '50%',
    },
    waitingDot: {
        width: '10px', height: '10px', borderRadius: '50%',
        background: '#475569', animation: 'pulse-dot 1.2s infinite',
    },
    readyBadge: {
        textAlign: 'center', padding: '10px',
        background: 'rgba(74,222,128,0.1)',
        border: '1px solid rgba(74,222,128,0.25)',
        borderRadius: '10px', color: '#4ade80',
        fontWeight: 700, fontSize: '0.88rem',
    },
    leaveBtn: {
        width: '100%', padding: '11px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '10px', color: '#ef4444',
        fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    },
};
