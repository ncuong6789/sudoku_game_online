import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../utils/socket';
import { useAudio } from '../../utils/useAudio';
import { INITIAL_SPEED, MAX_SPEED, spawnItem, computeBlockedCells, performDash, astar } from './snakeAI';

export function useSnakeLogic(mode, mapSize, roomId, hasBot, difficulty) {
    const gameRef = useRef(null);
    const [uiState, setUiState] = useState({ score: 0, botScore: 0, gameOver: false, statusMessage: 'Đang chơi...' });
    const [gameState, setGameState] = useState(null);
    const [countdown, setCountdown] = useState(mode === 'multiplayer' ? 3 : null);
    
    const { playWinSound, playLoseSound } = useAudio();

    function buildSnakeList(g) {
        const list = [];
        if (g.snake.length) list.push({ id: 'me', positions: g.snake, prevPositions: g.prevSnakePlayer, color: '#4ade80', direction: g.direction, nextDir: g.nextDir, isDead: false, isMe: true, dashFlashEnd: g.dashFlash });
        if (hasBot && g.botSnake.length) list.push({ id: 'bot', positions: g.botSnake, prevPositions: g.prevSnakeBot, color: '#60a5fa', direction: g.botDirection, nextDir: g.botDirection, isDead: false, isMe: false, dashFlashEnd: g.botDashFlash });
        return list;
    }

    const initGame = useCallback(() => {
        const sx = Math.max(2, Math.floor(mapSize / 4)), sy = Math.floor(mapSize / 4);
        const bx = Math.min(mapSize - 3, Math.floor(mapSize * 3 / 4)), by = Math.floor(mapSize * 3 / 4);
        const g = {
            snake: [{ x: sx, y: sy }, { x: sx - 1, y: sy }],
            botSnake: hasBot ? [{ x: bx, y: by }, { x: bx + 1, y: by }] : [],
            direction: { x: 1, y: 0 }, botDirection: { x: -1, y: 0 }, nextDir: { x: 1, y: 0 },
            directionsQueue: [],
            item: { x: Math.floor(mapSize / 2), y: Math.floor(mapSize / 2) },
            goldenItem: null, deadBodies: [], blockedCells: new Set(),
            score: 0, botScore: 0, gameOver: false, botDead: false,
            statusMessage: 'Đang chơi...', currentSpeed: INITIAL_SPEED,
            lastTickTime: performance.now(), snakes: [],
            prevSnakePlayer: null, prevSnakeBot: null,
            dashCooldownEnd: null, botDashCooldownEnd: null,
            dashFlash: null, botDashFlash: null,
        };
        g.snakes = buildSnakeList(g);
        gameRef.current = g;
    }, [mapSize, hasBot]);

    useEffect(() => { initGame(); }, [initGame]);

    const handleRestart = useCallback(() => { 
        initGame(); 
        setUiState({ score: 0, botScore: 0, gameOver: false, statusMessage: 'Đang chơi...' }); 
    }, [initGame]);

    useEffect(() => {
        const onKey = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) || e.code === 'Space') e.preventDefault();
            const g = gameRef.current;
            if (!g) return;

            if (g.gameOver && mode === 'solo' && (e.code === 'Space' || e.key === ' ')) {
                handleRestart();
                return;
            }
            if (g.gameOver || countdown > 0) return;

            if (!g.directionsQueue) g.directionsQueue = [];
            const lastDir = g.directionsQueue.length > 0 ? g.directionsQueue[g.directionsQueue.length - 1] : g.direction;

            let newDir = null;
            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && lastDir.y === 0) newDir = { x: 0, y: -1 };
            if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && lastDir.y === 0) newDir = { x: 0, y: 1 };
            if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && lastDir.x === 0) newDir = { x: -1, y: 0 };
            if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && lastDir.x === 0) newDir = { x: 1, y: 0 };

            if (newDir) {
                if (g.directionsQueue.length < 3) g.directionsQueue.push(newDir);
                g.nextDir = newDir;
            }
            if (e.code === 'Space' || e.key === ' ') {
                const res = performDash(g, mapSize, false);
                if (res === 'ok') {
                    g.blockedCells = computeBlockedCells(g, mapSize);
                    g.snakes = buildSnakeList(g);
                    setUiState(p => ({ ...p, score: g.score }));
                }
                if (res === 'dead') {
                    g.deadBodies = [...g.deadBodies, ...g.snake];
                    g.snake = []; g.gameOver = true;
                    const msg = `Game Over! Điểm: ${g.score}`;
                    g.statusMessage = msg; g.snakes = [];
                    setUiState({ score: g.score, botScore: g.botScore, gameOver: true, statusMessage: msg });
                    playLoseSound();
                }
            }
            if (mode === 'multiplayer' && roomId) {
                if (e.code === 'Space' || e.key === ' ') {
                    socket.emit('snakeDash', { roomId });
                } else if (newDir) {
                    socket.emit('snakeChangeDirection', { roomId, direction: newDir });
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode, roomId, mapSize, countdown, handleRestart, playLoseSound]);

    useEffect(() => {
        if (mode !== 'solo') return;
        const tick = () => {
            const g = gameRef.current;
            if (!g || g.gameOver || countdown > 0) return;
            g.prevSnakePlayer = g.snake.map(p => ({ ...p }));
            if (hasBot) g.prevSnakeBot = g.botSnake.map(p => ({ ...p }));
            g.lastTickTime = performance.now();
            g.currentSpeed = Math.max(MAX_SPEED, INITIAL_SPEED - g.score * 5) * (g.goldenItem ? 1.3 : 1);

            if (g.directionsQueue && g.directionsQueue.length > 0) {
                g.nextDir = g.directionsQueue.shift();
            } else {
                g.nextDir = g.direction;
            }

            const pDir = g.nextDir, h = g.snake[0];
            const pnx = h.x + pDir.x, pny = h.y + pDir.y;

            let bnx = null, bny = null, newBHead = null, bDir = g.botDirection;
            if (hasBot && !g.botDead && g.botSnake.length > 0) {
                const bh = g.botSnake[0];
                const obs = new Set();
                g.snake.forEach(p => obs.add(`${p.x},${p.y}`));
                obs.add(`${pnx},${pny}`);
                g.botSnake.slice(0, -1).forEach(p => obs.add(`${p.x},${p.y}`));
                g.deadBodies.forEach(p => obs.add(`${p.x},${p.y}`));
                const tgt = g.goldenItem || g.item;
                const oppBotDir = { x: -g.botDirection.x, y: -g.botDirection.y };
                let path = astar(bh, tgt, obs, mapSize, oppBotDir);
                if (difficulty === 'Easy' && Math.random() < 0.4) path = null;
                if (difficulty === 'Medium' && Math.random() < 0.1) path = null;
                if (path?.length) bDir = path[0];
                else {
                    const tail = g.botSnake[g.botSnake.length - 1];
                    path = astar(bh, tail, obs, mapSize, oppBotDir);
                    if (path?.length) bDir = path[0];
                    else {
                        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
                        const neck = g.botSnake.length > 1 ? g.botSnake[1] : null;
                        const valids = dirs.filter(d => {
                            if (d.x === oppBotDir.x && d.y === oppBotDir.y) return false;
                            const nx = bh.x + d.x, ny = bh.y + d.y;
                            if (neck && nx === neck.x && ny === neck.y) return false;
                            return nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !obs.has(`${nx},${ny}`);
                        });
                        if (valids.length === 0 && g.botScore >= 5) {
                            performDash(g, mapSize, true);
                            g.blockedCells = computeBlockedCells(g, mapSize);
                        } else if (valids.length > 0) bDir = valids[Math.floor(Math.random() * valids.length)];
                    }
                }
                if (!g.botDashCooldownEnd || performance.now() > g.botDashCooldownEnd) {
                    const nextBotHead = { x: bh.x + bDir.x, y: bh.y + bDir.y };
                    if (nextBotHead.x === pnx && nextBotHead.y === pny && g.botScore >= 5) {
                        performDash(g, mapSize, true);
                        g.blockedCells = computeBlockedCells(g, mapSize);
                    }
                }
                if (g.botSnake.length > 0) {
                    bnx = g.botSnake[0].x + bDir.x; bny = g.botSnake[0].y + bDir.y;
                    newBHead = { x: bnx, y: bny };
                }
            }

            let pDied = false, bDied = false;
            if (g.snake.length > 0) {
                if (pnx < 0 || pnx >= mapSize || pny < 0 || pny >= mapSize ||
                    g.snake.some((s, i) => i !== g.snake.length - 1 && s.x === pnx && s.y === pny) ||
                    g.deadBodies.some(b => b.x === pnx && b.y === pny)) pDied = true;
            }
            if (hasBot && !g.botDead && g.botSnake.length > 0 && newBHead) {
                if (bnx < 0 || bnx >= mapSize || bny < 0 || bny >= mapSize ||
                    g.botSnake.some((s, i) => i !== g.botSnake.length - 1 && s.x === bnx && s.y === bny) ||
                    g.snake.some(s => s.x === bnx && s.y === bny) ||
                    g.deadBodies.some(b => b.x === bnx && b.y === bny)) bDied = true;
                if (pnx === bnx && pny === bny) { pDied = true; bDied = true; }
                if (g.botSnake.some(s => s.x === pnx && s.y === pny)) pDied = true;
                if (g.snake.some(s => s.x === bnx && s.y === bny)) bDied = true;
            }

            if (bDied && !g.botDead) {
                g.deadBodies = [...g.deadBodies, ...g.botSnake];
                g.botSnake = []; g.botDead = true;
                g.blockedCells = computeBlockedCells(g, mapSize);
            }

            if (pDied) {
                g.deadBodies = [...g.deadBodies, ...g.snake];
                g.snake = []; g.gameOver = true;
                let msg;
                if (hasBot) {
                    if (!g.botDead && bDied) {
                        msg = g.score > g.botScore ? `CHIẾN THẮNG! (Bạn:${g.score} - Bot:${g.botScore})` : g.score < g.botScore ? `THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})` : `HÒA! (Cùng ${g.score} điểm)`;
                    } else if (g.botDead) {
                        msg = g.score > g.botScore ? `CHIẾN THẮNG! (Bạn:${g.score} - Bot:${g.botScore})` : g.score < g.botScore ? `THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})` : `HÒA! (Cùng ${g.score} điểm)`;
                    } else {
                        msg = `THẤT BẠI! (Bạn:${g.score} - Bot:${g.botScore})`;
                    }
                    if (msg.includes('THẮNG')) playWinSound(); else if (msg.includes('THẤT')) playLoseSound();
                } else {
                    msg = `Game Over! Điểm: ${g.score}`; playLoseSound();
                }
                g.statusMessage = msg; g.snakes = buildSnakeList(g);
                setUiState({ score: g.score, botScore: g.botScore, gameOver: true, statusMessage: msg });
                return;
            }

            const newPHead = { x: pnx, y: pny };
            let newP = [newPHead, ...g.snake];
            let newItem = g.item, newGold = g.goldenItem, newScore = g.score;
            if (pnx === newItem.x && pny === newItem.y) {
                newScore++;
                newP.push({ ...g.snake[g.snake.length - 1] });
                newItem = spawnItem([newP, g.botSnake], g.deadBodies, mapSize, g.blockedCells);
                if (Math.random() < 0.15 && !newGold) newGold = { ...spawnItem([newP, g.botSnake], g.deadBodies, mapSize, g.blockedCells), timeLeft: 5 };
            } else if (newGold && pnx === newGold.x && pny === newGold.y) {
                newScore += 2; newGold = null;
                newP.pop(); if (newP.length > 2) newP.pop();
            } else { newP.pop(); }

            if (hasBot && !g.botDead && g.botSnake.length > 0 && newBHead && !bDied) {
                let newB = [newBHead, ...g.botSnake];
                let newBScore = g.botScore;
                if (bnx === newItem.x && bny === newItem.y) {
                    newBScore++; newB.push({ ...g.botSnake[g.botSnake.length - 1] });
                    newItem = spawnItem([newP, newB], g.deadBodies, mapSize, g.blockedCells);
                } else if (newGold && bnx === newGold.x && bny === newGold.y) {
                    newBScore += 2; newGold = null; newB.pop();
                } else { newB.pop(); }
                g.botDirection = bDir; g.botSnake = newB; g.botScore = newBScore;
            }

            g.direction = pDir; g.nextDir = pDir; g.snake = newP;
            g.score = newScore; g.item = newItem; g.goldenItem = newGold;
            g.snakes = buildSnakeList(g);

            setUiState(p => {
                if (p.score !== g.score || p.botScore !== g.botScore)
                    return { ...p, score: g.score, botScore: g.botScore };
                return p;
            });
        };
        const id = setInterval(tick, INITIAL_SPEED);
        return () => clearInterval(id);
    }, [mode, hasBot, difficulty, mapSize, countdown, playWinSound, playLoseSound]);

    useEffect(() => {
        if (mode !== 'solo') return;
        const t = setInterval(() => {
            if (gameRef.current?.goldenItem) {
                const gi = gameRef.current.goldenItem;
                gameRef.current.goldenItem = gi.timeLeft <= 1 ? null : { ...gi, timeLeft: gi.timeLeft - 1 };
            }
        }, 1000);
        return () => clearInterval(t);
    }, [mode]);

    useEffect(() => {
        if (mode !== 'multiplayer' || countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, mode]);

    useEffect(() => { 
        if (countdown === 0) { const t = setTimeout(() => setCountdown(null), 800); return () => clearTimeout(t); } 
    }, [countdown]);

    useEffect(() => {
        if (mode !== 'multiplayer' || !roomId) return;
        socket.on('snakeGameState', (state) => {
            setGameState(state);
            if (state.status === 'finished') {
                const my = state.snakes[socket.id];
                const op = Object.values(state.snakes).find(s => s.id !== socket.id);
                let msg = 'Game Over';
                if (my?.isDead && op?.isDead) { msg = my.score > op.score ? 'Bạn Thắng!' : my.score < op.score ? 'Bạn Thua!' : 'Hòa!'; if (my.score > op.score) playWinSound(); else playLoseSound(); }
                else if (my?.isDead) { msg = 'Bạn TỬ NẠN!'; playLoseSound(); }
                else if (op?.isDead) { msg = 'Đối thủ chết! THẮNG!'; playWinSound(); }
                setUiState(p => ({ ...p, gameOver: true, statusMessage: msg }));
            }
        });
        socket.on('opponentDisconnected', () => { setUiState(p => p.gameOver ? p : { ...p, gameOver: true, statusMessage: 'Bạn Thắng! Đối thủ thoát.' }); playWinSound(); });
        return () => { socket.off('snakeGameState'); socket.off('opponentDisconnected'); };
    }, [mode, roomId, playWinSound, playLoseSound]);

    useEffect(() => () => { if (roomId) socket.emit('leaveRoom', roomId); }, [roomId]);

    return { gameRef, uiState, gameState, countdown, handleRestart, setUiState };
}
