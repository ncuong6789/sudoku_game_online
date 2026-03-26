import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Skull } from 'lucide-react';
import { socket } from '../../utils/socket';

// --- UTILS ---
// Flood Fill (BFS) tìm vùng không gian mà Rắn có thể di chuyển tới
function getReachableCells(head, occupiedSet, mapSize) {
    const queue = [head];
    const reachable = new Set();
    const visited = new Set();
    visited.add(`${head.x},${head.y}`);

    const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];

    while (queue.length > 0) {
        const curr = queue.shift();
        for (const dir of dirs) {
            const nx = curr.x + dir.x;
            const ny = curr.y + dir.y;
            const key = `${nx},${ny}`;

            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupiedSet.has(key) && !visited.has(key)) {
                visited.add(key);
                reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return Array.from(reachable).map(str => {
        const [x, y] = str.split(',').map(Number);
        return { x, y };
    });
}

function spawnItemIntelligently(snakePositions, deadBodies, mapSize) {
    const occupiedSet = new Set();
    snakePositions.forEach(p => occupiedSet.add(`${p.x},${p.y}`));
    deadBodies.forEach(p => occupiedSet.add(`${p.x},${p.y}`));

    const head = snakePositions[0];
    const reachableEmptyCells = getReachableCells(head, occupiedSet, mapSize);

    if (reachableEmptyCells.length > 0) {
        // Có đường tới mồi
        return reachableEmptyCells[Math.floor(Math.random() * reachableEmptyCells.length)];
    } else {
        // Bị kẹt hoàn toàn (Softlock), sinh random tạm một chỗ rỗng bất kỳ
        const allEmpty = [];
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                if (!occupiedSet.has(`${x},${y}`)) allEmpty.push({x, y});
            }
        }
        if (allEmpty.length > 0) return allEmpty[Math.floor(Math.random() * allEmpty.length)];
        return { x: 0, y: 0 }; // Full map
    }
}

const INITIAL_SPEED = 180;
const MAX_SPEED = 60;

export default function SnakeGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, mapSize, roomId, playerColor } = location.state || { mode: 'solo', mapSize: 20, roomId: null };

    // --- SOLO STATE ---
    const [snake, setSnake] = useState([{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]); // Mặc định 3 đốt
    const [direction, setDirection] = useState({x: 1, y: 0});
    const nextDirRef = useRef({x: 1, y: 0});
    const [item, setItem] = useState({x: 15, y: 15});
    const [deadBodies, setDeadBodies] = useState([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false); // Chưa dùng trong snake nhưng giữ chuẩn
    const [statusMessage, setStatusMessage] = useState('Đang chơi...');
    
    // --- MULTIPLAYER STATE ---
    const [gameState, setGameState] = useState(null); 
    // gameState = { snakes: { id1: {...}, id2: {...} }, deadBodies: [], item: {x,y}, status: 'playing' }

    // --- KEYBOARD LISTENER ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent default scroll
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            const currentObj = mode === 'solo' ? direction : (gameState?.snakes[socket.id]?.direction || {x:1, y:0});
            // Lấy State mới nhất để check quay đầu (180 độ)
            const nd = nextDirRef.current;
            let newDir = null;

            if (e.key === 'ArrowUp' && nd.y === 0) newDir = {x: 0, y: -1};
            if (e.key === 'ArrowDown' && nd.y === 0) newDir = {x: 0, y: 1};
            if (e.key === 'ArrowLeft' && nd.x === 0) newDir = {x: -1, y: 0};
            if (e.key === 'ArrowRight' && nd.x === 0) newDir = {x: 1, y: 0};

            if (newDir) {
                nextDirRef.current = newDir;
                if (mode === 'multiplayer' && roomId) {
                    socket.emit('snakeChangeDirection', { roomId, direction: newDir });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, roomId, direction, gameState]); // React state warning safe

    // --- SOLO GAME LOOP ---
    useEffect(() => {
        if (mode !== 'solo' || gameOver) return;

        const currentSpeed = Math.max(MAX_SPEED, INITIAL_SPEED - score * 5); // Càng ăn càng nhanh

        const moveSnake = () => {
            setSnake(prevSnake => {
                const head = prevSnake[0];
                const dir = nextDirRef.current;
                setDirection(dir); // Sync for next turn check

                const nx = head.x + dir.x;
                const ny = head.y + dir.y;

                // 1. Va chạm tường
                if (nx < 0 || nx >= mapSize || ny < 0 || ny >= mapSize) {
                    handleDeath(prevSnake);
                    return prevSnake;
                }

                // 2. Va chạm bản thân (Trừ đuôi vì đuôi sẽ di chuyển đi)
                if (prevSnake.some((segment, idx) => idx !== prevSnake.length - 1 && segment.x === nx && segment.y === ny)) {
                    handleDeath(prevSnake);
                    return prevSnake;
                }

                // 3. Va chạm xác chết
                if (deadBodies.some(body => body.x === nx && body.y === ny)) {
                    handleDeath(prevSnake);
                    return prevSnake;
                }

                const newHead = { x: nx, y: ny };
                const newSnake = [newHead, ...prevSnake];

                // 4. Ăn mồi
                setItem(prevItem => {
                    if (nx === prevItem.x && ny === prevItem.y) {
                        setScore(s => s + 1);
                        // Rắn tăng 2 đốt khi ăn (Luật: không pop đuôi 2 lần liên tiếp, ta dùng thủ thuật add thêm đuôi ảo)
                        newSnake.push({ ...prevSnake[prevSnake.length - 1] }); // Đốt được cộng thêm ngay lập tức
                        return spawnItemIntelligently(newSnake, deadBodies, mapSize);
                    } else {
                        newSnake.pop(); // Không ăn thì xoá đuôi để di chuyển
                        return prevItem;
                    }
                });

                return newSnake;
            });
        };

        const interval = setInterval(moveSnake, currentSpeed);
        return () => clearInterval(interval);
    }, [mode, gameOver, mapSize, deadBodies, score]);

    const handleDeath = (finalSnakeRef) => {
        setGameOver(true);
        setStatusMessage(`Game Over! Điểm của bạn: ${score}`);
        // Rắn chết biến thành xác
        setDeadBodies(prev => [...prev, ...finalSnakeRef]);
    };

    const handleRestartSolo = () => {
        setSnake([{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
        setDirection({x: 1, y: 0});
        nextDirRef.current = {x: 1, y: 0};
        setItem({x: 15, y: 15});
        setScore(0);
        setGameOver(false);
        setStatusMessage('Đang chơi...');
        setDeadBodies([]); // Reset map hoàn toàn cho ván mới
    };

    // --- MULTIPLAYER LISTENER ---
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            socket.on('snakeGameState', (state) => {
                setGameState(state);
                if (state.status === 'finished') {
                    setGameOver(true);
                    
                    const mySnake = state.snakes[socket.id];
                    const oppId = Object.keys(state.snakes).find(id => id !== socket.id);
                    const oppSnake = state.snakes[oppId];

                    if (!mySnake) return;

                    if (mySnake.isDead && oppSnake?.isDead) {
                        setStatusMessage(mySnake.score > oppSnake.score ? 'Bạn Thắng (Nhiều điểm hơn)!' : (mySnake.score < oppSnake.score ? 'Bạn Thua!' : 'Hòa Cờ!'));
                    } else if (mySnake.isDead) {
                        setStatusMessage('Bạn đã TỬ NẠN!');
                    } else if (oppSnake?.isDead) {
                        setStatusMessage('Đối thủ đâm đầu vào dậu! BẠN THẮNG!');
                    } else {
                        // So điểm
                        setStatusMessage(mySnake.score > oppSnake?.score ? 'Bạn Thắng!' : 'Bạn Thua!');
                    }
                }
            });

            socket.on('opponentDisconnected', () => {
                if (!gameOver) {
                    setGameOver(true);
                    setStatusMessage('Bạn Thắng! Đối thủ đã thoái lui.');
                }
            });

            return () => {
                socket.off('snakeGameState');
                socket.off('opponentDisconnected');
            };
        }
    }, [mode, roomId, gameOver]);

    useEffect(() => {
        return () => {
            if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    // RENDER HELPER MAPPING
    // Gộp trạng thái để render chung bằng 1 function cho dễ
    const renderData = mode === 'solo' ? {
        snakes: [{ id: 'me', positions: snake, color: '#4ade80', isDead: gameOver }],
        deadBodies,
        item,
        score
    } : (gameState ? {
        snakes: Object.values(gameState.snakes).map(s => ({
            id: s.id,
            positions: s.positions,
            color: s.color === 'green' ? '#4ade80' : '#60a5fa', // Xanh lá vs Xanh dương
            isDead: s.isDead,
            isMe: s.id === socket.id
        })),
        deadBodies: gameState.deadBodies,
        item: gameState.item,
        score: gameState.snakes[socket.id]?.score || 0
    } : { snakes: [], deadBodies: [], item: {x: -10, y: -10}, score: 0 });

    const getOpponentInfo = () => {
        if (mode !== 'multiplayer' || !gameState) return null;
        const opp = Object.values(gameState.snakes).find(s => s.id !== socket.id);
        return opp ? opp.score : 0;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div className="nav-item active" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} /> Snake {mapSize}x{mapSize}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {mode === 'solo' ? 'Thực chiến Sinh Tồn' : `Phòng PvP: ${roomId}`}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {mode === 'solo' && (
                            <button className="btn-secondary" onClick={handleRestartSolo} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <RotateCcw size={16} /> Chơi lại
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Trophy size={20} color="#fbbf24" />
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Điểm: <span style={{ color: '#4ade80' }}>{renderData.score}</span></span>
                    </div>
                    {mode === 'multiplayer' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Địch: <span style={{ color: '#60a5fa' }}>{getOpponentInfo()}</span></span>
                            <Skull size={20} color="#f87171" />
                        </div>
                    )}
                    <span style={{ fontWeight: 'bold', color: gameOver ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {statusMessage}
                    </span>
                </div>

                {/* GAME BOARD: Absolute Positioning Rendering */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div 
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '70vh', // Responsive Square
                            aspectRatio: '1 / 1',
                            background: '#1a1f2e', // Nền tối
                            backgroundImage: `
                                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                            `,
                            backgroundSize: `${100 / mapSize}% ${100 / mapSize}%`,
                            border: '4px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* 1. Mồi (Item) */}
                        <div style={{
                            position: 'absolute',
                            width: `${100 / mapSize}%`,
                            height: `${100 / mapSize}%`,
                            left: `${(renderData.item.x / mapSize) * 100}%`,
                            top: `${(renderData.item.y / mapSize) * 100}%`,
                            background: 'radial-gradient(circle, #f87171 20%, #dc2626 80%)',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #f87171',
                            transform: 'scale(0.8)'
                        }} />

                        {/* 2. Xác rắn (Dead Bodies Obstacles) */}
                        {renderData.deadBodies.map((body, i) => (
                            <div key={`dead-${i}`} style={{
                                position: 'absolute',
                                width: `${100 / mapSize}%`,
                                height: `${100 / mapSize}%`,
                                left: `${(body.x / mapSize) * 100}%`,
                                top: `${(body.y / mapSize) * 100}%`,
                                background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 18A2 2 0 0018 20a2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2z\' fill=\'%23a1a1aa\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
                                backgroundColor: '#3f3f46', // Xám đậm
                                borderRadius: '4px',
                                border: '1px solid #27272a'
                            }} />
                        ))}

                        {/* 3. Các con Rắn sống */}
                        {renderData.snakes.map((s) => (
                            s.positions.map((segment, idx) => {
                                const isHead = idx === 0;
                                return (
                                    <div key={`${s.id}-${idx}`} style={{
                                        position: 'absolute',
                                        width: `${100 / mapSize}%`,
                                        height: `${100 / mapSize}%`,
                                        left: `${(segment.x / mapSize) * 100}%`,
                                        top: `${(segment.y / mapSize) * 100}%`,
                                        background: isHead ? '#ffffff' : s.color, // Đầu trắng tinh / sáng màu
                                        opacity: s.isDead ? 0.3 : 1, // Mờ đi nếu vừa chết
                                        borderRadius: isHead ? '50%' : '4px', // Đầu thì tròn 50%, thân và đuôi thì khối vuông bo cong nhẹ 4px
                                        boxShadow: isHead ? `0 0 10px ${s.color}` : 'none',
                                        transform: 'scale(0.95)', // Để hở viền caro
                                        zIndex: isHead ? 10 : 5
                                    }} />
                                );
                            })
                        ))}

                        {/* GAME OVER OVERLAY */}
                        {gameOver && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                zIndex: 50, backdropFilter: 'blur(3px)'
                            }}>
                                <h2 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: '#f87171' }}>GAME OVER</h2>
                                <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Điểm của bạn: <strong style={{color: '#4ade80'}}>{renderData.score}</strong></p>
                                
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {mode === 'solo' && (
                                        <button className="btn-primary" onClick={handleRestartSolo} style={{ padding: '12px 24px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <RotateCcw size={20} /> Chơi lại ngay
                                        </button>
                                    )}
                                    <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ padding: '12px 24px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)' }}>
                                        <ArrowLeft size={20} /> Thoát ra
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
