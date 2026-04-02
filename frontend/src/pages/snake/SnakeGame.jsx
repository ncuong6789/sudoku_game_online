import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Skull } from 'lucide-react';
import { socket } from '../../utils/socket';
import { useAudio } from '../../utils/useAudio';

// --- UTILS ---
function getReachableCells(head, occupiedSet, mapSize) {
    const queue = [head];
    const reachable = new Set();
    const visited = new Set();
    visited.add(`${head.x},${head.y}`);
    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    while (queue.length > 0) {
        const curr = queue.shift();
        for (const dir of dirs) {
            const nx = curr.x + dir.x, ny = curr.y + dir.y;
            const key = `${nx},${ny}`;
            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupiedSet.has(key) && !visited.has(key)) {
                visited.add(key); reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return Array.from(reachable).map(s => { const [x,y] = s.split(',').map(Number); return {x,y}; });
}

function spawnItemIntelligently(snakePositions, deadBodies, mapSize) {
    const occupiedSet = new Set();
    snakePositions.forEach(p => occupiedSet.add(`${p.x},${p.y}`));
    deadBodies.forEach(p => occupiedSet.add(`${p.x},${p.y}`));
    const head = snakePositions[0];
    const reachable = getReachableCells(head, occupiedSet, mapSize);
    if (reachable.length > 0) return reachable[Math.floor(Math.random() * reachable.length)];
    const allEmpty = [];
    for (let y = 0; y < mapSize; y++)
        for (let x = 0; x < mapSize; x++)
            if (!occupiedSet.has(`${x},${y}`)) allEmpty.push({x,y});
    return allEmpty.length > 0 ? allEmpty[Math.floor(Math.random() * allEmpty.length)] : {x:0,y:0};
}

const INITIAL_SPEED = 180;
const MAX_SPEED = 60;

// ─── CANVAS RENDERER ────────────────────────────────────────────────────────
function SnakeCanvas({ gameRef, mapSize }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const lastTickRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const draw = (timestamp) => {
            rafRef.current = requestAnimationFrame(draw);
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const cell = size / mapSize;

            // ── Background ──
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(0, 0, size, size);

            // ── Grid ──
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= mapSize; i++) {
                ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
            }

            const g = gameRef.current;
            if (!g) return;

            // ── Tick progress for interpolation (0..1) ──
            const now = performance.now();
            const elapsed = now - g.lastTickTime;
            const speed = g.currentSpeed || INITIAL_SPEED;
            const t = Math.min(elapsed / speed, 1); // interpolation factor

            // ── Dead bodies ──
            ctx.fillStyle = '#3f3f46';
            for (const b of g.deadBodies) {
                const px = b.x * cell + 1, py = b.y * cell + 1;
                roundRect(ctx, px, py, cell - 2, cell - 2, 3);
                ctx.fill();
            }

            // ── Item (red) ──
            const item = g.item;
            if (item) {
                const cx = item.x * cell + cell / 2;
                const cy = item.y * cell + cell / 2;
                const pulse = 0.78 + 0.08 * Math.sin(timestamp / 300);
                const r = (cell / 2) * pulse;
                const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
                grad.addColorStop(0, '#f87171');
                grad.addColorStop(1, '#dc2626');
                ctx.shadowColor = '#f87171';
                ctx.shadowBlur = 10;
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // ── Golden item ──
            const gi = g.goldenItem;
            if (gi) {
                const cx2 = gi.x * cell + cell / 2;
                const cy2 = gi.y * cell + cell / 2;
                const pulse2 = 0.85 + 0.1 * Math.sin(timestamp / 200);
                const r2 = (cell / 2) * pulse2;
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 18;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                // Timer label
                if (gi.timeLeft !== undefined) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = `bold ${Math.max(10, cell * 0.6)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`⏳${gi.timeLeft}`, cx2, cy2 - r2 - 4);
                }
            }

            // ── Snakes ──
            for (const s of g.snakes) {
                if (!s.positions || s.positions.length === 0) continue;
                const alpha = s.isDead ? 0.3 : 1;
                ctx.globalAlpha = alpha;

                for (let i = s.positions.length - 1; i >= 0; i--) {
                    const seg = s.positions[i];
                    const isHead = i === 0;
                    let drawX = seg.x * cell;
                    let drawY = seg.y * cell;

                    // Interpolate head movement
                    if (isHead && s.prevHead && !s.isDead) {
                        const dx = seg.x - s.prevHead.x;
                        const dy = seg.y - s.prevHead.y;
                        // Handle wrap-around: if moving more than 1 cell skip interp
                        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                            drawX = (s.prevHead.x + dx * t) * cell;
                            drawY = (s.prevHead.y + dy * t) * cell;
                        }
                    }

                    const padding = isHead ? 0 : 1;
                    const segX = drawX + padding;
                    const segY = drawY + padding;
                    const segW = cell - padding * 2;
                    const segH = cell - padding * 2;

                    if (isHead) {
                        // Head: bright white circle
                        ctx.shadowColor = s.color;
                        ctx.shadowBlur = 12;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(drawX + cell / 2, drawY + cell / 2, cell * 0.45, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;

                        // Eyes
                        const dir = s.direction || {x:1,y:0};
                        drawEyes(ctx, drawX + cell/2, drawY + cell/2, cell, dir, s.color);
                    } else {
                        // Body segment with gradient fade toward tail
                        const fadeFactor = 1 - (i / s.positions.length) * 0.35;
                        ctx.fillStyle = s.color;
                        ctx.globalAlpha = alpha * fadeFactor;
                        roundRect(ctx, segX, segY, segW, segH, Math.max(2, cell * 0.25));
                        ctx.fill();
                        ctx.globalAlpha = alpha;
                    }
                }
            }
            ctx.globalAlpha = 1;
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [mapSize, gameRef]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={600}
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                imageRendering: 'pixelated'
            }}
        />
    );
}

function drawEyes(ctx, cx, cy, cell, dir, color) {
    const eyeOffset = cell * 0.22;
    let e1, e2;
    if (dir.x === 1)       { e1 = {x: cx + eyeOffset, y: cy - eyeOffset}; e2 = {x: cx + eyeOffset, y: cy + eyeOffset}; }
    else if (dir.x === -1) { e1 = {x: cx - eyeOffset, y: cy - eyeOffset}; e2 = {x: cx - eyeOffset, y: cy + eyeOffset}; }
    else if (dir.y === -1) { e1 = {x: cx - eyeOffset, y: cy - eyeOffset}; e2 = {x: cx + eyeOffset, y: cy - eyeOffset}; }
    else                   { e1 = {x: cx - eyeOffset, y: cy + eyeOffset}; e2 = {x: cx + eyeOffset, y: cy + eyeOffset}; }
    const r = cell * 0.12;
    ctx.fillStyle = color || '#000';
    ctx.beginPath(); ctx.arc(e1.x, e1.y, r, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2.x, e2.y, r, 0, Math.PI*2); ctx.fill();
    // Shine
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e1.x + r*0.3, e1.y - r*0.3, r*0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2.x + r*0.3, e2.y - r*0.3, r*0.4, 0, Math.PI*2); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ─── MAIN GAME ──────────────────────────────────────────────────────────────
export default function SnakeGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, mapSize, roomId, playerColor, difficulty, hasBot } = location.state || { mode: 'solo', mapSize: 20, roomId: null, difficulty: 'Medium', hasBot: false };
    const { playWinSound, playLoseSound } = useAudio();

    // Ref that stores the entire game state — mutated in place, read by canvas RAF
    const gameRef = useRef(null);

    // React state — minimal, only for UI overlays
    const [uiState, setUiState] = useState({
        score: 0,
        botScore: 0,
        gameOver: false,
        statusMessage: 'Đang chơi...',
    });
    const [gameState, setGameState] = useState(null); // multiplayer
    const [countdown, setCountdown] = useState(mode === 'multiplayer' ? 3 : null);
    const [showArrow, setShowArrow] = useState(true);

    const myColor = playerColor === 'green' ? '#4ade80' : '#60a5fa';
    const myColorLabel = playerColor === 'green' ? 'Xanh' : 'Lam';

    // A* pathfinding (unchanged)
    const getAStarPath = useCallback((start, target, occupiedSet, ms) => {
        const openSet = [{ ...start, g: 0, h: Math.abs(start.x - target.x) + Math.abs(start.y - target.y), parent: null }];
        const closedSet = new Set();
        while (openSet.length > 0) {
            openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            const curr = openSet.shift();
            const key = `${curr.x},${curr.y}`;
            if (curr.x === target.x && curr.y === target.y) {
                const path = []; let temp = curr;
                while (temp.parent) { path.push({ x: temp.x - temp.parent.x, y: temp.y - temp.parent.y }); temp = temp.parent; }
                return path.reverse();
            }
            closedSet.add(key);
            for (const dir of [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}]) {
                const nx = curr.x + dir.x, ny = curr.y + dir.y;
                const nKey = `${nx},${ny}`;
                if (nx >= 0 && nx < ms && ny >= 0 && ny < ms && !occupiedSet.has(nKey) && !closedSet.has(nKey)) {
                    const g = curr.g + 1, h = Math.abs(nx - target.x) + Math.abs(ny - target.y);
                    const ex = openSet.find(o => o.x === nx && o.y === ny);
                    if (!ex) openSet.push({ x: nx, y: ny, g, h, parent: curr });
                    else if (g < ex.g) { ex.g = g; ex.parent = curr; }
                }
            }
        }
        return null;
    }, []);

    // ── Initialize game state ref ──
    const initGameRef = useCallback(() => {
        const startX = Math.max(2, Math.floor(mapSize / 4));
        const startY = Math.floor(mapSize / 4);
        const botStartX = Math.min(mapSize - 3, Math.floor(mapSize * 3 / 4));
        const botStartY = Math.floor(mapSize * 3 / 4);

        gameRef.current = {
            snake: [{ x: startX, y: startY }, { x: startX - 1, y: startY }],
            botSnake: hasBot ? [{ x: botStartX, y: botStartY }, { x: botStartX + 1, y: botStartY }] : [],
            direction: { x: 1, y: 0 },
            botDirection: { x: -1, y: 0 },
            nextDir: { x: 1, y: 0 },
            item: { x: Math.floor(mapSize / 2), y: Math.floor(mapSize / 2) },
            goldenItem: null,
            deadBodies: [],
            score: 0,
            botScore: 0,
            gameOver: false,
            statusMessage: 'Đang chơi...',
            currentSpeed: INITIAL_SPEED,
            lastTickTime: performance.now(),
            // For canvas: computed render list
            snakes: [],
            prevHeads: {},
        };
        gameRef.current.snakes = buildSnakeRenderList(gameRef.current);
    }, [mapSize, hasBot]);

    function buildSnakeRenderList(g) {
        const list = [];
        if (g.snake && g.snake.length > 0) {
            list.push({
                id: 'me',
                positions: g.snake,
                prevHead: g.prevHeadPlayer,
                color: '#4ade80',
                direction: g.direction,
                isDead: false,
                isMe: true,
            });
        }
        if (hasBot && g.botSnake && g.botSnake.length > 0) {
            list.push({
                id: 'bot',
                positions: g.botSnake,
                prevHead: g.prevHeadBot,
                color: '#60a5fa',
                direction: g.botDirection,
                isDead: false,
                isMe: false,
            });
        }
        return list;
    }

    useEffect(() => {
        initGameRef();
    }, [initGameRef]);

    // ── Arrow hide timer ──
    useEffect(() => {
        const t = setTimeout(() => setShowArrow(false), 3000);
        return () => clearTimeout(t);
    }, [uiState.gameOver]);

    // ── Keyboard ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
            const nd = gameRef.current?.nextDir || { x:1, y:0 };
            let newDir = null;
            if (e.key === 'ArrowUp' && nd.y === 0) newDir = {x:0,y:-1};
            if (e.key === 'ArrowDown' && nd.y === 0) newDir = {x:0,y:1};
            if (e.key === 'ArrowLeft' && nd.x === 0) newDir = {x:-1,y:0};
            if (e.key === 'ArrowRight' && nd.x === 0) newDir = {x:1,y:0};
            if (newDir && gameRef.current) {
                gameRef.current.nextDir = newDir;
                if (mode === 'multiplayer' && roomId) socket.emit('snakeChangeDirection', { roomId, direction: newDir });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, roomId]);

    // ── SOLO GAME LOOP (setInterval for logic, RAF for rendering) ──
    useEffect(() => {
        if (mode !== 'solo' || !gameRef.current) return;

        const tick = () => {
            const g = gameRef.current;
            if (!g || g.gameOver) return;

            // Save prev heads for interpolation
            g.prevHeadPlayer = g.snake[0] ? { ...g.snake[0] } : null;
            g.prevHeadBot = g.botSnake[0] ? { ...g.botSnake[0] } : null;
            g.lastTickTime = performance.now();

            const baseSpeed = Math.max(MAX_SPEED, INITIAL_SPEED - g.score * 5);
            g.currentSpeed = g.goldenItem ? baseSpeed + 40 : baseSpeed;

            const pHead = g.snake[0];
            const pDir = g.nextDir;
            const pnx = pHead.x + pDir.x, pny = pHead.y + pDir.y;

            // ── Bot AI ──
            let bnx = null, bny = null, newBHead = null, bDir = g.botDirection;
            if (hasBot && g.botSnake.length > 0) {
                const bHead = g.botSnake[0];
                const obstacles = new Set();
                g.snake.forEach(p => obstacles.add(`${p.x},${p.y}`));
                obstacles.add(`${pnx},${pny}`);
                g.botSnake.slice(0, -1).forEach(p => obstacles.add(`${p.x},${p.y}`));
                if (g.botSnake.length > 1) obstacles.add(`${g.botSnake[1].x},${g.botSnake[1].y}`);
                g.deadBodies.forEach(p => obstacles.add(`${p.x},${p.y}`));

                const target = g.goldenItem || g.item;
                let path = getAStarPath(bHead, target, obstacles, mapSize);
                if (difficulty === 'Easy' && Math.random() < 0.4) path = null;
                if (difficulty === 'Medium' && Math.random() < 0.1) path = null;

                if (path && path.length > 0) {
                    bDir = path[0];
                } else {
                    const tail = g.botSnake[g.botSnake.length - 1];
                    path = getAStarPath(bHead, tail, obstacles, mapSize);
                    if (path && path.length > 0) {
                        bDir = path[0];
                    } else {
                        const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                        const neck = g.botSnake.length > 1 ? g.botSnake[1] : null;
                        const validDirs = dirs.filter(d => {
                            const nx = bHead.x + d.x, ny = bHead.y + d.y;
                            if (neck && nx === neck.x && ny === neck.y) return false;
                            return nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !obstacles.has(`${nx},${ny}`);
                        });
                        if (validDirs.length > 0) bDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                    }
                }
                bnx = bHead.x + bDir.x; bny = bHead.y + bDir.y;
                newBHead = { x: bnx, y: bny };
            }

            // ── Collisions ──
            let pDied = false, bDied = false;
            if (pnx < 0 || pnx >= mapSize || pny < 0 || pny >= mapSize ||
                g.snake.some((s, i) => i !== g.snake.length - 1 && s.x === pnx && s.y === pny) ||
                g.deadBodies.some(b => b.x === pnx && b.y === pny)) pDied = true;

            if (hasBot && g.botSnake.length > 0) {
                if (bnx < 0 || bnx >= mapSize || bny < 0 || bny >= mapSize ||
                    g.botSnake.some((s, i) => i !== g.botSnake.length - 1 && s.x === bnx && s.y === bny) ||
                    g.snake.some((s, i) => i !== g.snake.length - 1 && s.x === bnx && s.y === bny) ||
                    g.deadBodies.some(b => b.x === bnx && b.y === bny)) bDied = true;
                if (pnx === bnx && pny === bny) { pDied = true; bDied = true; }
                if (g.botSnake.some(s => s.x === pnx && s.y === pny)) pDied = true;
                if (g.snake.some(s => s.x === bnx && s.y === bny)) bDied = true;
            }

            // ── Deaths ──
            if (pDied || (bDied && hasBot)) {
                let newDead = [...g.deadBodies];
                if (pDied) { newDead = [...newDead, ...g.snake]; g.snake = []; }
                if (bDied && hasBot) { newDead = [...newDead, ...g.botSnake]; g.botSnake = []; }
                g.deadBodies = newDead;
                g.gameOver = true;

                let msg;
                if (hasBot) {
                    if (pDied && !bDied) { msg = `THẤT BẠI! (Bạn: ${g.score} - Bot: ${g.botScore})`; playLoseSound(); }
                    else if (!pDied && bDied) { msg = `CHIẾN THẮNG! (Bạn: ${g.score} - Bot: ${g.botScore})`; playWinSound(); }
                    else {
                        if (g.score > g.botScore) { msg = `CHIẾN THẮNG! (Bạn: ${g.score} - Bot: ${g.botScore})`; playWinSound(); }
                        else if (g.score < g.botScore) { msg = `THẤT BẠI! (Bạn: ${g.score} - Bot: ${g.botScore})`; playLoseSound(); }
                        else { msg = `HÒA CỜ! (Cùng ${g.score} điểm)`; }
                    }
                } else { msg = `Game Over! Điểm của bạn: ${g.score}`; playLoseSound(); }

                g.statusMessage = msg;
                g.snakes = buildSnakeRenderList(g);
                setUiState({ score: g.score, botScore: g.botScore, gameOver: true, statusMessage: msg });
                return;
            }

            // ── Move player ──
            const newPHead = { x: pnx, y: pny };
            let newP = [newPHead, ...g.snake];
            let newItem = g.item;
            let newGolden = g.goldenItem;
            let newPScore = g.score;

            if (pnx === newItem.x && pny === newItem.y) {
                newPScore++;
                newP.push({ ...g.snake[g.snake.length - 1] });
                newItem = spawnItemIntelligently(newP, g.deadBodies, mapSize);
                if (Math.random() < 0.15 && !newGolden) {
                    newGolden = { ...spawnItemIntelligently(newP, g.deadBodies, mapSize), timeLeft: 5 };
                }
            } else if (newGolden && pnx === newGolden.x && pny === newGolden.y) {
                newPScore += 2; newGolden = null;
                newP.pop(); if (newP.length > 2) newP.pop();
            } else { newP.pop(); }

            // ── Move bot ──
            if (hasBot && g.botSnake.length > 0 && !bDied) {
                let newB = [newBHead, ...g.botSnake];
                let newBScore = g.botScore;
                if (bnx === newItem.x && bny === newItem.y) {
                    newBScore++; newB.push({ ...g.botSnake[g.botSnake.length - 1] });
                    newItem = spawnItemIntelligently(newP.concat(newB), g.deadBodies, mapSize);
                } else if (newGolden && bnx === newGolden.x && bny === newGolden.y) {
                    newBScore += 2; newGolden = null; newB.pop();
                } else { newB.pop(); }
                g.botDirection = bDir;
                g.botSnake = newB;
                g.botScore = newBScore;
            }

            g.direction = pDir;
            g.nextDir = pDir;
            g.snake = newP;
            g.score = newPScore;
            g.item = newItem;
            g.goldenItem = newGolden;
            g.snakes = buildSnakeRenderList(g);

            // Only update React UI score (not full re-render)
            setUiState(prev => {
                if (prev.score !== g.score || prev.botScore !== g.botScore) {
                    return { ...prev, score: g.score, botScore: g.botScore };
                }
                return prev;
            });
        };

        // Tick interval (logic only)
        const interval = setInterval(tick, gameRef.current?.currentSpeed || INITIAL_SPEED);
        // Dynamic speed: restart interval when speed changes (debounce via scoring)
        return () => clearInterval(interval);
    }, [mode, hasBot, difficulty, mapSize, getAStarPath, playWinSound, playLoseSound]);

    // ── Golden item countdown ──
    useEffect(() => {
        if (mode !== 'solo') return;
        const t = setInterval(() => {
            if (gameRef.current?.goldenItem) {
                gameRef.current.goldenItem = gameRef.current.goldenItem.timeLeft <= 1
                    ? null
                    : { ...gameRef.current.goldenItem, timeLeft: gameRef.current.goldenItem.timeLeft - 1 };
            }
        }, 1000);
        return () => clearInterval(t);
    }, [mode]);

    // ── Countdown (multiplayer) ──
    useEffect(() => {
        if (mode !== 'multiplayer') return;
        if (countdown === null || countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, mode]);
    useEffect(() => {
        if (countdown === 0) { const t = setTimeout(() => setCountdown(null), 800); return () => clearTimeout(t); }
    }, [countdown]);

    // ── Multiplayer listener ──
    useEffect(() => {
        if (mode !== 'multiplayer' || !roomId) return;
        socket.on('snakeGameState', (state) => {
            setGameState(state);
            if (state.status === 'finished') {
                const mySnake = state.snakes[socket.id];
                const oppSnake = Object.values(state.snakes).find(s => s.id !== socket.id);
                let msg = 'Game Over';
                if (mySnake?.isDead && oppSnake?.isDead) {
                    msg = mySnake.score > oppSnake.score ? 'Bạn Thắng (Nhiều điểm hơn)!' : mySnake.score < oppSnake.score ? 'Bạn Thua!' : 'Hòa Cờ!';
                    if (mySnake.score > oppSnake.score) playWinSound(); else if (mySnake.score < oppSnake.score) playLoseSound();
                } else if (mySnake?.isDead) { msg = 'Bạn đã TỬ NẠN!'; playLoseSound(); }
                else if (oppSnake?.isDead) { msg = 'Đối thủ đâm đầu! BẠN THẮNG!'; playWinSound(); }
                setUiState(prev => ({ ...prev, gameOver: true, statusMessage: msg }));
            }
        });
        socket.on('opponentDisconnected', () => {
            setUiState(prev => { if (!prev.gameOver) return { ...prev, gameOver: true, statusMessage: 'Bạn Thắng! Đối thủ đã thoái lui.' }; return prev; });
            playWinSound();
        });
        return () => { socket.off('snakeGameState'); socket.off('opponentDisconnected'); };
    }, [mode, roomId, playWinSound, playLoseSound]);

    useEffect(() => { return () => { if (roomId) socket.emit('leaveRoom', roomId); }; }, [roomId]);

    const handleRestartSolo = () => {
        initGameRef();
        setUiState({ score: 0, botScore: 0, gameOver: false, statusMessage: 'Đang chơi...' });
        setShowArrow(true);
    };

    // Multiplayer render data
    const mpRenderSnakes = mode === 'multiplayer' && gameState
        ? Object.values(gameState.snakes).map(s => ({
            id: s.id, positions: s.positions, prevHead: null,
            color: s.color === 'green' ? '#4ade80' : '#60a5fa',
            direction: s.direction || {x:1,y:0},
            isDead: s.isDead, isMe: s.id === socket.id
        })) : [];

    // Build gameRef.current for multiplayer rendering
    const mpGameData = mode === 'multiplayer' && gameState ? {
        snakes: mpRenderSnakes,
        deadBodies: gameState.deadBodies || [],
        item: gameState.item || {x:-10,y:-10},
        goldenItem: gameState.goldenItem || null,
        currentSpeed: INITIAL_SPEED,
        lastTickTime: performance.now(),
    } : null;

    const canvasGameRef = mode === 'multiplayer' ? { current: mpGameData } : gameRef;
    const oppScore = mode === 'solo' ? uiState.botScore : (gameState ? Object.values(gameState.snakes).find(s => s.id !== socket.id)?.score ?? 0 : 0);

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
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Bạn: <span style={{ color: '#4ade80' }}>{uiState.score}</span></span>
                        </div>
                        {(hasBot || mode === 'multiplayer') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#60a5fa' }} />
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {mode === 'solo' ? `Bot (${difficulty})` : 'Địch'}: <span style={{ color: '#60a5fa' }}>{oppScore}</span>
                                </span>
                            </div>
                        )}
                    </div>
                    {mode === 'multiplayer' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${myColor}44` }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myColor }} />
                            <span style={{ fontSize: '0.8rem', color: myColor, fontWeight: 600 }}>{myColorLabel}</span>
                        </div>
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: uiState.gameOver ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {uiState.statusMessage}
                    </span>
                </div>

                {/* CANVAS BOARD */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '70vh', aspectRatio: '1 / 1',
                        border: '4px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        <SnakeCanvas gameRef={canvasGameRef} mapSize={mapSize} />

                        {/* Arrow indicator */}
                        {mode === 'solo' && showArrow && !uiState.gameOver && gameRef.current?.snake[0] && (() => {
                            const head = gameRef.current.snake[0];
                            return (
                                <div style={{
                                    position: 'absolute',
                                    left: `${(head.x / mapSize) * 100}%`,
                                    top: `${(head.y / mapSize) * 100}%`,
                                    width: `${100 / mapSize}%`,
                                    height: `${100 / mapSize}%`,
                                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                                    zIndex: 20, pointerEvents: 'none',
                                    transform: 'translateY(-100%)',
                                    animation: 'arrow-bounce 0.8s ease-in-out infinite alternate'
                                }}>▼</div>
                            );
                        })()}

                        {/* Countdown overlay (multiplayer) */}
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
                                    {countdown === 0 ? 'BẮT ĐẦU!' : countdown}
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Đối thủ đã sẵn sàng!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* GAME OVER OVERLAY */}
                {uiState.gameOver && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '15px', padding: '2rem', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>
                            {uiState.statusMessage.includes('Thắng') ? '🏆' : uiState.statusMessage.includes('Hòa') ? '🤝' : '💀'}
                        </div>
                        <h2 style={{ fontSize: '2.5rem', margin: '0', color: uiState.statusMessage.includes('Thắng') ? '#4ade80' : uiState.statusMessage.includes('Hòa') ? '#fbbf24' : '#f87171' }}>
                            {uiState.statusMessage.split('!')[0]}!
                        </h2>
                        <p style={{ fontSize: '1.4rem', marginBottom: '10px' }}>
                            {uiState.statusMessage.includes('(') ? uiState.statusMessage.split('(')[1]?.replace(')', '') : uiState.statusMessage.split('!')[1] || ''}
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
