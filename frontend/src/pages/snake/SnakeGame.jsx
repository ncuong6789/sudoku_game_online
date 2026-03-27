import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Skull } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useAudio } from '../../utils/useAudio';

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
    const { mode, mapSize, roomId, playerColor, difficulty, hasBot } = location.state || { mode: 'solo', mapSize: 20, roomId: null, difficulty: 'Medium', hasBot: false };
    const { playWinSound, playLoseSound } = useAudio();

    // --- A* PATHFINDING FOR BOT ---
    const getAStarPath = (start, target, occupiedSet, mapSize) => {
        const openSet = [{ ...start, g: 0, h: Math.abs(start.x - target.x) + Math.abs(start.y - target.y), parent: null }];
        const closedSet = new Set();

        while (openSet.length > 0) {
            openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const curr = openSet.shift();
            const key = `${curr.x},${curr.y}`;

            if (curr.x === target.x && curr.y === target.y) {
                const path = [];
                let temp = curr;
                while (temp.parent) {
                    path.push({ x: temp.x - temp.parent.x, y: temp.y - temp.parent.y });
                    temp = temp.parent;
                }
                return path.reverse();
            }

            closedSet.add(key);

            const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
            for (const dir of dirs) {
                const nx = curr.x + dir.x, ny = curr.y + dir.y;
                const nKey = `${nx},${ny}`;
                if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupiedSet.has(nKey) && !closedSet.has(nKey)) {
                    const g = curr.g + 1;
                    const h = Math.abs(nx - target.x) + Math.abs(ny - target.y);
                    const existing = openSet.find(o => o.x === nx && o.y === ny);
                    if (!existing) {
                        openSet.push({ x: nx, y: ny, g, h, parent: curr });
                    } else if (g < existing.g) {
                        existing.g = g;
                        existing.parent = curr;
                    }
                }
            }
        }
        return null;
    };

    // --- SOLO STATE ---
    const [snake, setSnake] = useState(() => {
        const startX = Math.max(2, Math.floor(mapSize / 4));
        const startY = Math.floor(mapSize / 4);
        return [{ x: startX, y: startY }, { x: startX - 1, y: startY }];
    });
    const [botSnake, setBotSnake] = useState(() => {
        if (!hasBot) return [];
        const startX = Math.min(mapSize - 3, Math.floor(mapSize * 3 / 4));
        const startY = Math.floor(mapSize * 3 / 4);
        return [{ x: startX, y: startY }, { x: startX + 1, y: startY }];
    });
    const [botDirection, setBotDirection] = useState({x: -1, y: 0});
    
    // ... rest of states
    const [direction, setDirection] = useState({x: 1, y: 0});
    const nextDirRef = useRef({x: 1, y: 0});
    const [item, setItem] = useState({x: Math.floor(mapSize/2), y: Math.floor(mapSize/2)});
    const [deadBodies, setDeadBodies] = useState([]);
    const [score, setScore] = useState(0);
    const [botScore, setBotScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false); // Chưa dùng trong snake nhưng giữ chuẩn
    const [statusMessage, setStatusMessage] = useState('Đang chơi...');
    const [showArrow, setShowArrow] = useState(true);
    const [goldenItem, setGoldenItem] = useState(null); // {x, y, timer}
    
    // --- MULTIPLAYER STATE ---
    const [gameState, setGameState] = useState(null); 
    // gameState = { snakes: { id1: {...}, id2: {...} }, deadBodies: [], item: {x,y}, goldenItem: {x,y}, status: 'playing' }

    // --- INDICATOR ARROW TIMER ---
    useEffect(() => {
        const timer = setTimeout(() => setShowArrow(false), 3000);
        return () => clearTimeout(timer);
    }, [gameOver]); // Reset khi chơi lại
    
    // --- COUNTDOWN STATE ---
    const [countdown, setCountdown] = useState(mode === 'multiplayer' ? 3 : null); // null = không đếm
    const myColor = playerColor === 'green' ? '#4ade80' : '#60a5fa';
    const myColorLabel = playerColor === 'green' ? 'Xanh' : 'Lam';


    // --- COUNTDOWN EFFECT (chỉ dùng cho Multiplayer) ---
    useEffect(() => {
        if (mode !== 'multiplayer') return;
        if (countdown === null || countdown <= 0) return;
        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [countdown, mode]);

    // Khi countdown về 0 thì countdown = 0 và game bắt đầu (lưu ý: 0 vẫn hiển thị "BẮt đầu!")
    useEffect(() => {
        if (countdown === 0) {
            const timer = setTimeout(() => setCountdown(null), 800);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

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
        if (mode !== 'solo' || gameOver || countdown !== null) return;

        // Tốc độ: Nếu có Item Vàng đang hoạt động hoặc hiệu ứng Item Vàng? 
        // Thay vì biến speed toàn cục, ta dùng bonus.
        const baseSpeed = Math.max(MAX_SPEED, INITIAL_SPEED - score * 5);
        const currentSpeed = goldenItem ? baseSpeed + 40 : baseSpeed; // Golden Item làm rắn đi chậm lại (dễ ăn hơn)

        const moveSnake = () => {
            if (snake.length === 0) return;

            // --- 1. PREDICT PLAYER ---
            const pHead = snake[0];
            const pDir = nextDirRef.current;
            const pnx = pHead.x + pDir.x;
            const pny = pHead.y + pDir.y;
            const newPHead = { x: pnx, y: pny };

            // --- 2. PREDICT BOT ---
            let bnx = null, bny = null, newBHead = null, bDir = botDirection;
            if (hasBot && botSnake.length > 0) {
                const bHead = botSnake[0];
                    
                const obstacles = new Set();
                // Both old body and NEW player head are obstacles
                snake.forEach(p => obstacles.add(`${p.x},${p.y}`));
                obstacles.add(`${pnx},${pny}`);

                // Bot's own body (except tail since it moves forward, but we must protect neck)
                botSnake.slice(0, -1).forEach(p => obstacles.add(`${p.x},${p.y}`));
                if (botSnake.length > 1) {
                    obstacles.add(`${botSnake[1].x},${botSnake[1].y}`); // Explicitly block 180 degree neck turn
                }
                deadBodies.forEach(p => obstacles.add(`${p.x},${p.y}`));

                const target = goldenItem || item;
                let path = getAStarPath(bHead, target, obstacles, mapSize);
                
                // Difficulty Adjustment
                if (difficulty === 'Easy' && Math.random() < 0.4) path = null;
                if (difficulty === 'Medium' && Math.random() < 0.1) path = null;

                if (path && path.length > 0) {
                    bDir = path[0];
                } else {
                    // Safe Move: Try to reach tail or just any free square
                    const tail = botSnake[botSnake.length - 1];
                    path = getAStarPath(bHead, tail, obstacles, mapSize);
                    if (path && path.length > 0) {
                        bDir = path[0];
                    } else {
                        // Random available move safely avoiding neck and obstacles
                        const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
                        const neck = botSnake.length > 1 ? botSnake[1] : null;
                        
                        const validDirs = dirs.filter(d => {
                            const nx = bHead.x + d.x, ny = bHead.y + d.y;
                            if (neck && nx === neck.x && ny === neck.y) return false;
                            return nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !obstacles.has(`${nx},${ny}`);
                        });
                        
                        if (validDirs.length > 0) {
                            bDir = validDirs[Math.floor(Math.random() * validDirs.length)]; // Pick random instead of always [0]
                        }
                    }
                }

                bnx = bHead.x + bDir.x;
                bny = bHead.y + bDir.y;
                newBHead = { x: bnx, y: bny };
            }

            // --- 3. RESOLVE COLLISIONS ---
            let pDied = false;
            let bDied = false;

            // Player vs Walls, Old Self, DeadBodies
            if (pnx < 0 || pnx >= mapSize || pny < 0 || pny >= mapSize || 
                snake.some((s, idx) => idx !== snake.length - 1 && s.x === pnx && s.y === pny) ||
                deadBodies.some(b => b.x === pnx && b.y === pny)) {
                pDied = true;
            }
            
            // Bot vs Walls, Bot Old Self, Player Old Self, DeadBodies
            if (hasBot && botSnake.length > 0) {
                if (bnx < 0 || bnx >= mapSize || bny < 0 || bny >= mapSize ||
                    botSnake.some((s, idx) => idx !== botSnake.length - 1 && s.x === bnx && s.y === bny) ||
                    snake.some((s, idx) => idx !== snake.length - 1 && s.x === bnx && s.y === bny) ||
                    deadBodies.some(b => b.x === bnx && b.y === bny)) {
                    bDied = true;
                }
            }

            // Head-to-head or overlap collisions between the two
            // Bắt đâm chéo trực diện (Cross-collision)
            if (hasBot && botSnake.length > 0) {
                if (pnx === bnx && pny === bny) {
                    pDied = true;
                    bDied = true; // Cùng lao chung vào 1 ô trống!
                }
                if (botSnake.some(s => s.x === pnx && s.y === pny)) {
                    pDied = true; // Rắn đâm vào Bot (Bao gồm cả đầu hiện tại của Bot)
                }
                if (snake.some(s => s.x === bnx && s.y === bny)) {
                    bDied = true; // Bot đâm vào Rắn (Bao gồm cả đầu hiện tại của Rắn)
                }
            }

            // --- 4. APPLY DEATHS & END GAME ---
            if (pDied || (bDied && hasBot)) {
                let newDeadBodies = [...deadBodies];
                if (pDied) {
                    newDeadBodies = [...newDeadBodies, ...snake];
                    setSnake([]);
                }
                if (bDied && hasBot) {
                    newDeadBodies = [...newDeadBodies, ...botSnake];
                    setBotSnake([]);
                }
                
                setDeadBodies(newDeadBodies);
                setGameOver(true);
                
                if (hasBot) {
                    if (pDied && !bDied) {
                        setStatusMessage(`THẤT BẠI! Bạn đã bỏ mạng đi trước. (Bạn: ${score} - Bot: ${botScore})`);
                        playLoseSound();
                    } else if (!pDied && bDied) {
                        setStatusMessage(`CHIẾN THẮNG! Bot lóng ngóng đâm đầu. (Bạn: ${score} - Bot: ${botScore})`);
                        playWinSound();
                    } else {
                        // Cả hai cùng chết ở 1 frame
                        if (score > botScore) {
                            setStatusMessage(`CHIẾN THẮNG! Cùng tử nạn nhưng hơn điểm. (Bạn: ${score} - Bot: ${botScore})`);
                            playWinSound();
                        } else if (score < botScore) {
                            setStatusMessage(`THẤT BẠI! Cùng tử nạn và thua điểm. (Bạn: ${score} - Bot: ${botScore})`);
                            playLoseSound();
                        } else {
                            setStatusMessage(`HÒA CỜ! Đồng quy ư tận với số điểm bằng nhau. (Cùng ${score} điểm)`);
                        }
                    }
                } else {
                    // Chơi một mình Solo cổ điển
                    setStatusMessage(`Game Over! Điểm của bạn: ${score}`);
                    playLoseSound();
                }
                return; // Stop processing frame entirely
            }

            // --- 5. EXECUTE MOVEMENT & ITEMS ---
            let newPScore = score;
            let newP = [newPHead, ...snake];
            let newItem = item;
            let newGolden = goldenItem;

            // Player eats items
            if (pnx === item.x && pny === item.y) {
                newPScore++;
                newP.push({ ...snake[snake.length - 1] });
                newItem = spawnItemIntelligently(newP, deadBodies, mapSize);
                if (Math.random() < 0.15 && !goldenItem) {
                    const gPos = spawnItemIntelligently(newP, deadBodies, mapSize);
                    newGolden = { ...gPos, timeLeft: 5 };
                }
            } else if (goldenItem && pnx === goldenItem.x && pny === goldenItem.y) {
                newPScore += 2;
                newGolden = null;
                newP.pop();
                if (newP.length > 2) newP.pop(); // Shrink effect from golden item
            } else {
                newP.pop();
            }

            // Bot eats items
            if (hasBot && botSnake.length > 0 && !bDied) {
                let newB = [newBHead, ...botSnake];
                let newBScore = botScore;

                if (bnx === newItem.x && bny === newItem.y) {
                    newBScore++;
                    newB.push({ ...botSnake[botSnake.length - 1] });
                    newItem = spawnItemIntelligently(newP.concat(newB), deadBodies, mapSize);
                } else if (newGolden && bnx === newGolden.x && bny === newGolden.y) {
                    newBScore += 2;
                    newGolden = null;
                    newB.pop(); 
                } else {
                    newB.pop();
                }

                setBotDirection(bDir);
                setBotSnake(newB);
                setBotScore(newBScore);
            }

            // FINAL STATE COMMIT
            setDirection(pDir);
            setSnake(newP);
            setScore(newPScore);
            setItem(newItem);
            if (newGolden !== undefined) setGoldenItem(newGolden);
        };

        const interval = setInterval(moveSnake, currentSpeed);
        return () => clearInterval(interval);
    }, [mode, gameOver, mapSize, deadBodies, score, item, goldenItem, snake, botSnake, botDirection, hasBot, difficulty]);

    // Timer cho Item Vàng biến mất
    useEffect(() => {
        if (mode === 'solo' && goldenItem) {
            const timer = setInterval(() => {
                setGoldenItem(prev => {
                    if (!prev) return null;
                    if (prev.timeLeft <= 1) return null;
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [goldenItem, mode]);

    const handleDeath = (finalSnakeRef) => {
        setGameOver(true);
        setStatusMessage(`Game Over! Điểm: ${score} - Bot: ${botScore}`);
        setDeadBodies(prev => [...prev, ...finalSnakeRef]);
    };

    const handleRestartSolo = () => {
        const startX = Math.max(1, Math.floor(mapSize / 4));
        const startY = Math.floor(mapSize / 4);
        setSnake([{ x: startX, y: startY }, { x: startX - 1, y: startY }]);

        const botStartX = Math.min(mapSize - 2, Math.floor(mapSize * 3 / 4));
        const botStartY = Math.floor(mapSize * 3 / 4);
        setBotSnake(hasBot ? [{ x: botStartX, y: botStartY }, { x: botStartX + 1, y: botStartY }] : []);
        
        setBotDirection({x: -1, y: 0});
        setDirection({x: 1, y: 0});
        nextDirRef.current = {x: 1, y: 0};
        setItem({x: Math.floor(mapSize/2), y: Math.floor(mapSize/2)});
        setScore(0);
        setBotScore(0);
        setGameOver(false);
        setStatusMessage('Đang chơi...');
        setDeadBodies([]);
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
                        const win = mySnake.score > oppSnake.score;
                        setStatusMessage(win ? 'Bạn Thắng (Nhiều điểm hơn)!' : (mySnake.score < oppSnake.score ? 'Bạn Thua!' : 'Hòa Cờ!'));
                        if (win) playWinSound(); else if (mySnake.score < oppSnake.score) playLoseSound();
                    } else if (mySnake.isDead) {
                        setStatusMessage('Bạn đã TỬ NẠN!');
                        playLoseSound();
                    } else if (oppSnake?.isDead) {
                        setStatusMessage('Đối thủ đâm đầu vào dậu! BẠN THẮNG!');
                        playWinSound();
                    } else {
                        // So điểm
                        const win = mySnake.score > oppSnake?.score;
                        setStatusMessage(win ? 'Bạn Thắng!' : 'Bạn Thua!');
                        if (win) playWinSound(); else playLoseSound();
                    }
                }
            });

            socket.on('opponentDisconnected', () => {
                if (!gameOver) {
                    setGameOver(true);
                    setStatusMessage('Bạn Thắng! Đối thủ đã thoái lui.');
                    playWinSound();
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

    const mySnakeData = mode === 'multiplayer' && gameState ? gameState.snakes[socket.id] : null;

    const renderData = mode === 'solo' ? {
        snakes: [
            { id: 'me', positions: snake, color: '#4ade80', isDead: gameOver, isMe: true },
            ...(hasBot && botSnake.length > 0 ? [{ id: 'bot', positions: botSnake, color: '#60a5fa', isDead: false, isMe: false }] : [])
        ],
        deadBodies,
        item,
        score
    } : (gameState ? {
        snakes: Object.values(gameState.snakes).map(s => ({
            id: s.id,
            positions: s.positions,
            color: s.color === 'green' ? '#4ade80' : '#60a5fa', 
            isDead: s.isDead,
            isMe: s.id === socket.id
        })),
        deadBodies: gameState.deadBodies,
        item: gameState.item,
        score: gameState.snakes[socket.id]?.score || 0
    } : { snakes: [], deadBodies: [], item: {x: -10, y: -10}, score: 0 });

    const getOpponentInfo = () => {
        if (mode === 'solo') return hasBot ? botScore : null;
        if (mode !== 'multiplayer' || !gameState) return null;
        const opp = Object.values(gameState.snakes).find(s => s.id !== socket.id);
        return opp ? opp.score : 0;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                        <div className="nav-item active" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <Activity size={16} /> Snake {mapSize}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mode === 'solo' ? `Thử thách AI (${difficulty})` : `${roomId}`}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {mode === 'solo' && (
                            <button className="btn-secondary" onClick={handleRestartSolo} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                                <RotateCcw size={14} /> Chơi lại
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                            <ArrowLeft size={14} /> Thoát
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Trophy size={18} color="#fbbf24" />
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Bạn: <span style={{ color: '#4ade80' }}>{renderData.score}</span></span>
                        </div>
                        {hasBot && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#60a5fa' }} />
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Bot ({difficulty}): <span style={{ color: '#60a5fa' }}>{botScore}</span></span>
                            </div>
                        )}
                    </div>
                    {mode === 'multiplayer' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${myColor}44` }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myColor }} />
                                <span style={{ fontSize: '0.8rem', color: myColor, fontWeight: 600 }}>{playerColor === 'green' ? 'Xanh' : 'Lam'}</span>
                            </div>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Địch: <span style={{ color: '#60a5fa' }}>{getOpponentInfo()}</span></span>
                            <Skull size={18} color="#f87171" />
                        </div>
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: gameOver ? 'var(--error-color)' : 'var(--text-primary)' }}>
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
                        {/* 1. Mồi Thường */}
                        <div style={{
                            position: 'absolute',
                            width: `${100 / mapSize}%`,
                            height: `${100 / mapSize}%`,
                            left: `${(renderData.item.x / mapSize) * 100}%`,
                            top: `${(renderData.item.y / mapSize) * 100}%`,
                            background: 'radial-gradient(circle, #f87171 20%, #dc2626 80%)',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #f87171',
                            transform: 'scale(0.8)',
                            zIndex: 15
                        }} />

                        {/* 2. Item Vàng (Đặc biệt) */}
                        {(goldenItem || (mode === 'multiplayer' && gameState?.goldenItem)) && (
                            <div style={{
                                position: 'absolute',
                                width: `${100 / mapSize}%`,
                                height: `${100 / mapSize}%`,
                                left: `${((goldenItem ? goldenItem.x : gameState.goldenItem.x) / mapSize) * 100}%`,
                                top: `${((goldenItem ? goldenItem.y : gameState.goldenItem.y) / mapSize) * 100}%`,
                                background: 'radial-gradient(circle, #fbbf24 20%, #d97706 80%)',
                                borderRadius: '50%',
                                boxShadow: '0 0 15px #fbbf24',
                                transform: 'scale(0.9)',
                                zIndex: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-25px', left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.85)', color: '#fbbf24',
                                    padding: '2px 8px', borderRadius: '10px',
                                    fontSize: '0.8rem', fontWeight: 'bold',
                                    border: '1px solid #fbbf24', whiteSpace: 'nowrap',
                                    zIndex: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                }}>
                                    ⏳ {goldenItem ? goldenItem.timeLeft : (gameState?.goldenItem?.timeLeft || '')}
                                </div>
                            </div>
                        )}

                        {/* 3. Xác rắn (Dead Bodies Obstacles) */}
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

                        {/* 4. Các con Rắn sống + mũi tên chỉ vào rắn của mình */}
                        {renderData.snakes.map((s) => (
                            s.positions.map((segment, idx) => {
                                const isHead = idx === 0;
                                return (
                                    <React.Fragment key={`${s.id}-${idx}`}>
                                        <div style={{
                                            position: 'absolute',
                                            width: `${100 / mapSize}%`,
                                            height: `${100 / mapSize}%`,
                                            left: `${(segment.x / mapSize) * 100}%`,
                                            top: `${(segment.y / mapSize) * 100}%`,
                                            background: isHead ? '#ffffff' : s.color,
                                            opacity: s.isDead ? 0.3 : 1,
                                            borderRadius: isHead ? '50%' : '4px',
                                            boxShadow: isHead ? `0 0 10px ${s.color}` : 'none',
                                            transform: 'scale(0.95)',
                                            zIndex: isHead ? 10 : 5
                                        }} />
                                        {/* Mũi tên chỉ xuống đầu rắn của mình - Chỉ hiện lúc đầu */}
                                        {isHead && s.isMe && !s.isDead && showArrow && (
                                            <div style={{
                                                position: 'absolute',
                                                left: `${(segment.x / mapSize) * 100}%`,
                                                top: `${(segment.y / mapSize) * 100}%`,
                                                width: `${100 / mapSize}%`,
                                                height: `${100 / mapSize}%`,
                                                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                                                zIndex: 20,
                                                transform: 'translateY(-100%) scale(0.95)',
                                                pointerEvents: 'none',
                                                fontSize: `min(${100/mapSize * 0.8}vw, ${100/mapSize * 0.8}vh)`,
                                                animation: 'arrow-bounce 0.8s ease-in-out infinite alternate'
                                            }}>
                                                ▼
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ))}

                        {/* COUNTDOWN OVERLAY */}
                        {mode === 'multiplayer' && countdown !== null && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                zIndex: 60, gap: '16px'
                            }}>
                                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Rắn của bạn:</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: myColor, boxShadow: `0 0 10px ${myColor}` }} />
                                        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: myColor }}>{myColorLabel}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: countdown === 0 ? '2.5rem' : '6rem', fontWeight: 900, color: countdown === 0 ? '#4ade80' : '#ffffff', textShadow: '0 0 20px currentColor', transition: 'all 0.3s' }}>
                                    {countdown === 0 ? 'BẮt đầu!' : countdown}
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Đối thủ đã sẵn sàng!</p>
                            </div>
                        )}

                    </div>
                </div>

                {/* GAME OVER OVERLAY BLOCK HIỆU ỨNG FULL PANEL */}
                {gameOver && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, backdropFilter: 'blur(8px)', gap: '15px', padding: '2rem', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>
                            {statusMessage.includes('Thắng') ? '🏆' : statusMessage.includes('Hòa') ? '🤝' : '💀'}
                        </div>
                        <h2 style={{ fontSize: '2.5rem', margin: '0', color: statusMessage.includes('Thắng') ? '#4ade80' : statusMessage.includes('Hòa') ? '#fbbf24' : '#f87171' }}>
                            {statusMessage.split('!')[0]}!
                        </h2>
                        <p style={{ fontSize: '1.4rem', marginBottom: '10px' }}>
                            {statusMessage.includes('(') ? statusMessage.split('(')[1].replace(')', '') : statusMessage.split('!')[1] || ''}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            {mode === 'solo' && (
                                <button className="btn-primary" onClick={handleRestartSolo} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RotateCcw size={24} /> Chơi lại ngay
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)' }}>
                                <ArrowLeft size={24} /> Thoát ra
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
