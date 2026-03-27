import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Heart, Ghost as GhostIcon } from 'lucide-react';
import { usePacmanSound } from '../../utils/useAudio';

const MAPS = {
    Classic: [
        "WWWWWWWWWWWWWWWWWWWWW",
        "WP........W........PW",
        "W.WWW.WWW.W.WWW.WWW.W",
        "W.WWW.WWW.W.WWW.WWW.W",
        "W...................W",
        "W.WWW.W.WWWWW.W.WWW.W",
        "W.....W...W...W.....W",
        "WWWWWWW_W_WWWWW_WWWWW",
        "      W_W_____W_W    ",
        "WWWWWWW_WW_H_WW_WWWWW",
        "_______W_GGG_W_______",
        "WWWWWWW_WWWWWWW_WWWWW",
        "      W_________W    ",
        "WWWWWWW_W_WWW_W_WWWWW",
        "W.........W.........W",
        "W.WWW.WWW.W.WWW.WWW.W",
        "WP..W.....S.....W..PW",
        "WWW.W.W.WWWWW.W.W.WWW",
        "W.....W...W...W.....W",
        "W.WWWWWWW.W.WWWWWWW.W",
        "W...................W",
        "WWWWWWWWWWWWWWWWWWWWW"
    ],
    Labyrinth: [
        "WWWWWWWWWWWWWWWWWWWWW",
        "WP.................PW",
        "W.W.WWWWWW.WWWWWW.W.W",
        "W.W...............W.W",
        "W.W.W.WWWW_WWWW.W.W.W",
        "W.W.W.W.......W.W.W.W",
        "W...W...W.W.W...W...W",
        "W.WWWWW.W_S_W.WWWWW.W",
        "W.......W_W_W.......W",
        "WWWWWWW_WW_H_WW_WWWWW",
        "      W_W_GGG_W_W    ",
        "WWWWWWW_WWWWWWW_WWWWW",
        "W.........W.........W",
        "W.WWWWW.W.W.W.WWWWW.W",
        "W...W...W.W.W...W...W",
        "W.W.W.WWWWW_WWWWW.W.W",
        "W.W.W...............W",
        "W.W.WWWWWWWWWWWWW.W.W",
        "WP.................PW",
        "WWWWWWWWWWWWWWWWWWWWW"
    ]
};

const DIRS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

const GHOST_COLORS = {
    BLINKY: '#ef4444', // Red (Chaser)
    PINKY: '#f9a8d4',  // Pink (Ambusher)
    INKY: '#06b6d4',   // Cyan (Fickle)
    CLYDE: '#fb923c'   // Orange (Feigned Ignorance)
};

const GHOST_NAMES = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

const getOppositeDir = (dir) => ({ x: -dir.x, y: -dir.y });
const isSameDir = (d1, d2) => d1.x === d2.x && d1.y === d2.y;

// BFS Pathfinding for ghosts
const getPath = (start, target, mapGrid) => {
    const queue = [{ ...start, path: [] }];
    const visited = new Set([`${start.x},${start.y}`]);
    
    while(queue.length > 0) {
        const curr = queue.shift();
        if (curr.x === target.x && curr.y === target.y) return curr.path;
        
        for (const dir of Object.values(DIRS)) {
            const nx = curr.x + dir.x, ny = curr.y + dir.y;
            // Map wrapping horizontally
            let wrappedX = nx;
            if (nx < 0) wrappedX = mapGrid[0].length - 1;
            if (nx >= mapGrid[0].length) wrappedX = 0;
            
            if (ny >= 0 && ny < mapGrid.length && mapGrid[ny][wrappedX] !== 'W' && !visited.has(`${wrappedX},${ny}`)) {
                visited.add(`${wrappedX},${ny}`);
                queue.push({ x: wrappedX, y: ny, path: [...curr.path, dir] });
            }
        }
    }
    return null;
};

export default function PacmanGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mapType = 'Classic', difficulty = 'Medium', mode = 'solo' } = location.state || {};
    const playSound = usePacmanSound();
    
    const [mapGrid, setMapGrid] = useState([]);
    const [pacman, setPacman] = useState({ x: 1, y: 1, dir: DIRS.RIGHT, nextDir: DIRS.RIGHT });
    const [ghosts, setGhosts] = useState([]);
    const [dots, setDots] = useState(new Set());
    const [powerPills, setPowerPills] = useState(new Set());
    
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    
    const [frightenedTimer, setFrightenedTimer] = useState(0);
    const [ghostEatCombo, setGhostEatCombo] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    
    // Parse Map
    useEffect(() => {
        const rawMap = MAPS[mapType] || MAPS['Classic'];
        const grid = [];
        let pStart = {x: 1, y: 1};
        const initialDots = new Set();
        const initialPills = new Set();
        const initialGhosts = [];
        
        rawMap.forEach((rowStr, y) => {
            const row = [];
            for (let x = 0; x < rowStr.length; x++) {
                const char = rowStr[x];
                row.push(char);
                if (char === '.') initialDots.add(`${x},${y}`);
                if (char === 'P') initialPills.add(`${x},${y}`);
                if (char === 'S') pStart = { x, y };
                if (char === 'G') {
                    if (initialGhosts.length < 4) {
                        const name = GHOST_NAMES[initialGhosts.length];
                        initialGhosts.push({
                            id: name, color: GHOST_COLORS[name], x, y, startX: x, startY: y,
                            dir: DIRS.UP, state: 'house' // house -> scatter -> chase -> frightened -> dead
                        });
                    }
                }
            }
            grid.push(row);
        });
        
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: DIRS.LEFT, nextDir: DIRS.LEFT });
        setDots(initialDots);
        setPowerPills(initialPills);
        setGhosts(initialGhosts);
        playSound('pacmanStart');
        
        setTimeout(() => setGameStarted(true), 1500);
    }, [mapType]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
            if (!gameStarted || gameOver || gameWon) return;
            
            setPacman(p => {
                let nextDir = p.dir;
                if (e.key === 'ArrowUp') nextDir = DIRS.UP;
                if (e.key === 'ArrowDown') nextDir = DIRS.DOWN;
                if (e.key === 'ArrowLeft') nextDir = DIRS.LEFT;
                if (e.key === 'ArrowRight') nextDir = DIRS.RIGHT;
                return { ...p, nextDir };
            });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStarted, gameOver, gameWon]);

    // Game Loop
    useEffect(() => {
        if (!gameStarted || gameOver || gameWon || mapGrid.length === 0) return;
        
        let speed = 150;
        if (difficulty === 'Hard') speed = 120;
        if (difficulty === 'Easy') speed = 180;
        
        const loop = setInterval(() => {
            // Update Pacman
            setPacman(prev => {
                let p = { ...prev };
                const tryMove = (dir) => {
                    let nx = p.x + dir.x;
                    let ny = p.y + dir.y;
                    if (nx < 0) nx = mapGrid[0].length - 1;
                    if (nx >= mapGrid[0].length) nx = 0;
                    
                    if (mapGrid[ny][nx] !== 'W' && mapGrid[ny][nx] !== 'H') {
                        return { x: nx, y: ny, valid: true };
                    }
                    return { x: p.x, y: p.y, valid: false };
                };
                
                // Try nextDir (cornering)
                let move = tryMove(p.nextDir);
                if (move.valid) {
                    p.x = move.x; p.y = move.y; p.dir = p.nextDir;
                } else {
                    // Try current dir
                    move = tryMove(p.dir);
                    if (move.valid) {
                        p.x = move.x; p.y = move.y;
                    }
                }
                
                // Eat Dots
                const posKey = `${p.x},${p.y}`;
                if (dots.has(posKey)) {
                    setDots(d => {
                        const newD = new Set(d);
                        newD.delete(posKey);
                        if (newD.size === 0) setGameWon(true);
                        return newD;
                    });
                    setScore(s => s + 10);
                    playSound('pacmanWaka');
                }
                
                // Eat Power Pill
                if (powerPills.has(posKey)) {
                    setPowerPills(pl => {
                        const newPl = new Set(pl);
                        newPl.delete(posKey);
                        return newPl;
                    });
                    setScore(s => s + 50);
                    setFrightenedTimer(difficulty === 'Hard' ? 25 : 40); // Ticks
                    setGhostEatCombo(0);
                    playSound('pacmanPowerPill');
                }
                
                return p;
            });

            // Frightened Timer decrements
            let isFrightenedNow = false;
            setFrightenedTimer(prev => {
                if (prev > 0) isFrightenedNow = true;
                return prev > 0 ? prev - 1 : 0;
            });

            // Update Ghosts
            setGhosts(prevGhosts => {
                return prevGhosts.map(g => {
                    let cg = { ...g };
                    
                    // State transitions
                    if (cg.state === 'house') {
                        // Leave house
                        if (mapGrid[cg.y-1][cg.x] === 'H') cg.y -= 2;
                        else if (mapGrid[cg.y][cg.x] === 'G') cg.x += (Math.random() > 0.5 ? 1 : -1);
                        cg.state = 'chase';
                        return cg;
                    }
                    
                    if (isFrightenedNow && cg.state !== 'dead') {
                        cg.state = 'frightened';
                    } else if (!isFrightenedNow && cg.state === 'frightened') {
                        cg.state = 'chase';
                    }
                    
                    // Get valid moves (cannot reverse unless state changed to frightened)
                    const validDirs = Object.values(DIRS).filter(d => {
                        if (isSameDir(d, getOppositeDir(cg.dir))) return false;
                        let nx = cg.x + d.x, ny = cg.y + d.y;
                        if (nx < 0 || nx >= mapGrid[0].length) return true; // tunnels
                        return mapGrid[ny][nx] !== 'W' && mapGrid[ny][nx] !== 'H';
                    });
                    
                    // Fallback to reverse if stuck (e.g. dead end)
                    if (validDirs.length === 0) {
                        validDirs.push(getOppositeDir(cg.dir));
                    }
                    
                    // Decide Direction based on state
                    let chosenDir = validDirs[0];
                    if (validDirs.length > 1) {
                        if (cg.state === 'frightened') {
                            chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                        } else if (cg.state === 'dead') {
                            // Find house logic (Simplified A*)
                            const houseTarget = { x: cg.startX, y: cg.startY };
                            const path = getPath(cg, houseTarget, mapGrid);
                            if (path && path.length > 0) chosenDir = path[0];
                            else if (cg.x === cg.startX && cg.y === cg.startY) {
                                cg.state = 'chase'; // Resurrected
                            }
                        } else {
                            // Chase AI
                            let target = { x: pacman.x, y: pacman.y }; // Blinky
                            if (cg.id === 'PINKY') {
                                target = { x: pacman.x + pacman.dir.x * 4, y: pacman.y + pacman.dir.y * 4 };
                            } else if (cg.id === 'INKY') {
                                target = Math.random() > 0.5 ? { x: pacman.x, y: pacman.y } : { x: pacman.x - pacman.dir.x * 2, y: pacman.y - pacman.dir.y * 2 };
                            } else if (cg.id === 'CLYDE') {
                                const dist = Math.abs(cg.x - pacman.x) + Math.abs(cg.y - pacman.y);
                                if (dist < 5) target = { x: 1, y: 1 }; // Run to corner
                            }
                            
                            // Pick dir that minimizes distance to target
                            let minDist = Infinity;
                            for (let d of validDirs) {
                                let nx = cg.x + d.x, ny = cg.y + d.y;
                                let dist = Math.abs(nx - target.x) + Math.abs(ny - target.y);
                                if (dist < minDist) {
                                    minDist = dist;
                                    chosenDir = d;
                                }
                            }
                        }
                    }
                    
                    cg.dir = chosenDir;
                    cg.x += cg.dir.x;
                    cg.y += cg.dir.y;
                    
                    // Tunnel wrap
                    if (cg.x < 0) cg.x = mapGrid[0].length - 1;
                    if (cg.x >= mapGrid[0].length) cg.x = 0;
                    
                    // Collision with Pacman
                    if (cg.x === pacman.x && cg.y === pacman.y) {
                        if (cg.state === 'frightened') {
                            cg.state = 'dead';
                            setGhostEatCombo(c => {
                                const nc = c + 1;
                                setScore(s => s + (200 * Math.pow(2, nc-1)));
                                return nc;
                            });
                            playSound('pacmanEatGhost');
                        } else if (cg.state !== 'dead') {
                            // PACMAN DIES
                            playSound('pacmanDie');
                            setLives(l => {
                                if (l <= 1) {
                                    setGameOver(true);
                                    return 0;
                                }
                                // Reset positions
                                setGameStarted(false);
                                setTimeout(() => setGameStarted(true), 1500);
                                setPacman(p => ({ ...p, x: p.startX, y: p.startY, dir: DIRS.LEFT, nextDir: DIRS.LEFT }));
                                setGhosts(initialGhosts => initialGhosts.map(ig => ({ ...ig, x: ig.startX, y: ig.startY, state: 'chase' }))); // simplified restore
                                return l - 1;
                            });
                        }
                    }
                    
                    return cg;
                });
            });
            
        }, speed);
        
        return () => clearInterval(loop);
    }, [gameStarted, gameOver, gameWon, difficulty, mapGrid, dots, powerPills, pacman, playSound]);

    const handleRestart = () => {
        setMapGrid([]); // triger reload map
        setScore(0);
        setLives(3);
        setGameOver(false);
        setGameWon(false);
        setTimeout(() => setMapGrid([...mapGrid]), 10); // Force effect
    };

    if (mapGrid.length === 0) return <div>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="#fbbf24" />
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>{score}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {[...Array(3)].map((_, i) => (
                            <Heart key={i} size={20} color={i < lives ? '#ef4444' : '#4b5563'} fill={i < lives ? '#ef4444' : 'none'} />
                        ))}
                    </div>
                </div>

                {/* GAME BOARD */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${mapGrid[0].length}, 1fr)`,
                    gridTemplateRows: `repeat(${mapGrid.length}, 1fr)`,
                    width: '100%', maxWidth: '600px', aspectRatio: `${mapGrid[0].length} / ${mapGrid.length}`,
                    background: '#000', borderRadius: '8px', border: '5px solid #1e40af', position: 'relative'
                }}>
                    {/* Render Static Map */}
                    {mapGrid.map((row, y) => row.map((cell, x) => (
                        <div key={`cell-${x}-${y}`} style={{
                            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: cell === 'W' ? '#1e3a8a' : cell === 'H' ? 'rgba(255,255,255,0.2)' : 'transparent',
                            borderRadius: cell === 'W' ? '4px' : '0'
                        }}>
                            {cell === 'W' && <div style={{ width: '80%', height: '80%', background: '#1e40af', borderRadius: '2px' }} />}
                            {cell === 'H' && <div style={{ width: '100%', height: '20%', background: '#fb923c' }} />}
                        </div>
                    )))}

                    {/* Render Dots */}
                    {Array.from(dots).map(d => {
                        const [x, y] = d.split(',').map(Number);
                        return (
                            <div key={`dot-${d}`} style={{
                                position: 'absolute', width: `${100/mapGrid[0].length}%`, height: `${100/mapGrid.length}%`,
                                left: `${(x/mapGrid[0].length)*100}%`, top: `${(y/mapGrid.length)*100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ width: '25%', height: '25%', background: '#fbbf24', borderRadius: '50%' }} />
                            </div>
                        );
                    })}

                    {/* Render Power Pills */}
                    {Array.from(powerPills).map(p => {
                        const [x, y] = p.split(',').map(Number);
                        return (
                            <div key={`pill-${p}`} style={{
                                position: 'absolute', width: `${100/mapGrid[0].length}%`, height: `${100/mapGrid.length}%`,
                                left: `${(x/mapGrid[0].length)*100}%`, top: `${(y/mapGrid.length)*100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ width: '60%', height: '60%', background: '#fbbf24', borderRadius: '50%', animation: 'pulse 0.5s infinite alternate' }} />
                            </div>
                        );
                    })}

                    {/* Render Ghosts */}
                    {ghosts.map(g => (
                        <div key={g.id} style={{
                            position: 'absolute', width: `${100/mapGrid[0].length}%`, height: `${100/mapGrid.length}%`,
                            left: `${(g.x/mapGrid[0].length)*100}%`, top: `${(g.y/mapGrid.length)*100}%`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                            transition: 'left 0.15s linear, top 0.15s linear'
                        }}>
                            {g.state === 'dead' ? (
                                <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>👀</div>
                            ) : (
                                <GhostIcon size="80%" color={g.state === 'frightened' ? (frightenedTimer < 10 && frightenedTimer % 2 === 0 ? '#fff' : '#1d4ed8') : g.color} fill={g.state === 'frightened' ? (frightenedTimer < 10 && frightenedTimer % 2 === 0 ? '#fff' : '#1d4ed8') : g.color} />
                            )}
                        </div>
                    ))}

                    {/* Render Pacman */}
                    <div style={{
                        position: 'absolute', width: `${100/mapGrid[0].length}%`, height: `${100/mapGrid.length}%`,
                        left: `${(pacman.x/mapGrid[0].length)*100}%`, top: `${(pacman.y/mapGrid.length)*100}%`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11,
                        transition: 'left 0.15s linear, top 0.15s linear'
                    }}>
                        <div style={{
                            width: '85%', height: '85%', background: '#fbbf24', borderRadius: '50%',
                            clipPath: 'polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%)',
                            transform: `rotate(${pacman.dir === DIRS.RIGHT ? 0 : pacman.dir === DIRS.DOWN ? 90 : pacman.dir === DIRS.LEFT ? 180 : -90}deg)`,
                            animation: 'pacmanChomp 0.3s infinite alternate'
                        }} />
                    </div>

                    {/* Overlay Start */}
                    {!gameStarted && !gameOver && !gameWon && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                            <h2 style={{ color: '#fbbf24', fontSize: '2rem', animation: 'flash 1s infinite' }}>READY!</h2>
                        </div>
                    )}
                </div>

                {/* GAME OVER & WIN SCREENS */}
                {(gameOver || gameWon) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, backdropFilter: 'blur(8px)', gap: '15px'
                    }}>
                        <div style={{ fontSize: '5rem' }}>{gameWon ? '🏆' : '💀'}</div>
                        <h2 style={{ fontSize: '3rem', margin: '0', color: gameWon ? '#4ade80' : '#f87171' }}>
                            {gameWon ? 'VICTORY!' : 'GAME OVER!'}
                        </h2>
                        <p style={{ fontSize: '1.5rem', color: '#fbbf24' }}>SCORE: {score}</p>
                        
                        <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
                            <button className="btn-primary" onClick={handleRestart} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RotateCcw size={20} /> Chơi Lại
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeft size={20} /> Về Sảnh
                            </button>
                        </div>
                    </div>
                )}
                
                {/* CSS Animations */}
                <style>{`
                    @keyframes pacmanChomp {
                        0% { clip-path: polygon(100% 74%, 50% 50%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%); }
                        100% { clip-path: polygon(100% 50%, 50% 50%, 100% 50%, 100% 0, 0 0, 0 100%, 100% 100%); }
                    }
                    @keyframes flash {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0; }
                    }
                    @keyframes pulse {
                        0% { transform: scale(0.8); }
                        100% { transform: scale(1.2); }
                    }
                `}</style>
            </div>
        </div>
    );
}
