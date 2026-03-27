import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Heart, Ghost as GhostIcon } from 'lucide-react';
import { useAudio } from '../../utils/useAudio';

// ─── Maps ──────────────────────────────────────────────────────────────────────
const MAPS = {
    Classic: [
        "WWWWWWWWWWWWWWWWWWWWW",
        "W........W........W",  // padding fix below
        "W.WWW.WWW.W.WWW.WWW.W",
        "WP.WWW.WWW.W.WWW.WWW.PW",
        "W...................W",
        "W.WWW.W.WWWWW.W.WWW.W",
        "W.....W...W...W.....W",
        "WWWWWWW_W_WWWWW_WWWWW",
        "_______W_W___W_W_____",
        "WWWWWWW_WW_H_WW_WWWWW",
        "_______W_GGG_W_______",
        "WWWWWWW_WWWWWWW_WWWWW",
        "_______W_____W_______",
        "WWWWWWW_W_WWW_W_WWWWW",
        "W..........W.........W",
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
        "_______W_W_GGG_W_____",
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

// Standard Classic map (fixed, consistent width)
const CLASSIC_MAP = [
    "WWWWWWWWWWWWWWWWWWWWW",
    "W.........W.........W",
    "W.WWW.WWW.W.WWW.WWW.W",
    "WP.WW.WWW.W.WWW.WW.PW",
    "W...................W",
    "W.WWW.W.WWWWW.W.WWW.W",
    "W.....W...W...W.....W",
    "WWWWWWW_W___W_WWWWWWW",
    "_______W_____W_______",
    "WWWWWWW_W_H_W_WWWWWWW",
    "_______W_GGG_W_______",
    "WWWWWWW_WWSWWW_WWWWWW",
    "_______W_____W_______",
    "WWWWWWW_W_W_W_WWWWWWW",
    "W.........W.........W",
    "W.WWW.WWW.W.WWW.WWW.W",
    "WP..W.............W.PW",
    "WWW.W.W.WWWWW.W.W.WWW",
    "W.....W...W...W.....W",
    "W.WWWWWWW.W.WWWWWWW.W",
    "W...................W",
    "WWWWWWWWWWWWWWWWWWWWW"
];

const LABYRINTH_MAP = [
    "WWWWWWWWWWWWWWWWWWWWW",
    "WP.................PW",
    "W.W.WWWWWW.WWWWWW.W.W",
    "W.W...............W.W",
    "W.W.W.WWWWWWWWW.W.W.W",
    "W.W.W.W.......W.W.W.W",
    "W...W...W.W.W...W...W",
    "W.WWWWW.W_S_W.WWWWW.W",
    "W.......W___W.......W",
    "WWWWWWW_WW_H_WW_WWWWW",
    "_______W__GGG__W_____",
    "WWWWWWW_WWWWWWW_WWWWW",
    "W.........W.........W",
    "W.WWWWW.W.W.W.WWWWW.W",
    "W...W...W.W.W...W...W",
    "W.W.W.WWWWWWWWWWW.W.W",
    "W.W.W...............W",
    "W.W.WWWWWWWWWWWWW.W.W",
    "WP.................PW",
    "WWWWWWWWWWWWWWWWWWWWW"
];

const ALL_MAPS = { Classic: CLASSIC_MAP, Labyrinth: LABYRINTH_MAP };

const DIRS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};
const DIR_LIST = Object.values(DIRS);

const GHOST_COLORS = {
    BLINKY: '#ef4444',
    PINKY: '#f9a8d4',
    INKY: '#06b6d4',
    CLYDE: '#fb923c'
};
const GHOST_NAMES = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

const isSameDir = (d1, d2) => d1.x === d2.x && d1.y === d2.y;
const getOppositeDir = (dir) => ({ x: -dir.x, y: -dir.y });

// ─── Parse map helper ──────────────────────────────────────────────────────────
function parseMap(rawMap) {
    const grid = [];
    let pStart = null;
    const dots = new Set();
    const pills = new Set();
    const ghosts = [];

    rawMap.forEach((rowStr, y) => {
        const row = [];
        for (let x = 0; x < rowStr.length; x++) {
            const ch = rowStr[x];
            row.push(ch);
            if (ch === '.') dots.add(`${x},${y}`);
            else if (ch === 'P') pills.add(`${x},${y}`);
            else if (ch === 'S') pStart = { x, y };
            else if (ch === 'G' && ghosts.length < 4) {
                const name = GHOST_NAMES[ghosts.length];
                ghosts.push({ id: name, color: GHOST_COLORS[name], x, y, startX: x, startY: y, dir: DIRS.UP, state: 'chase' });
            } else if (ch === 'H' && !pStart) {
                // fallback start near H
            }
        }
        grid.push(row);
    });

    if (!pStart) pStart = { x: 1, y: 1 };
    return { grid, pStart, dots, pills, ghosts };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PacmanGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mapType = 'Classic', difficulty = 'Medium' } = location.state || {};

    const {
        playWinSound, playLoseSound,
        playPacmanStartSound, playPacmanWakaSound,
        playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound
    } = useAudio();

    // ── State ──────────────────────────────────────────────────────────────────
    const [mapGrid, setMapGrid] = useState([]);
    const [pacman, setPacman] = useState(null);
    const [ghosts, setGhosts] = useState([]);
    const [dots, setDots] = useState(new Set());
    const [powerPills, setPowerPills] = useState(new Set());
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [frightenedTimer, setFrightenedTimer] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);

    // ── Refs (used inside interval to avoid stale closures) ────────────────────
    const stateRef = useRef({});
    useEffect(() => {
        stateRef.current = { pacman, ghosts, dots, powerPills, score, lives, gameOver, gameWon, frightenedTimer, gameStarted, mapGrid };
    });

    const soundRefs = useRef({});
    useEffect(() => {
        soundRefs.current = { playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound };
    }, [playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound]);

    // ── Input ref ──────────────────────────────────────────────────────────────
    const nextDirRef = useRef(DIRS.LEFT);

    // ── Init map ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const rawMap = ALL_MAPS[mapType] || CLASSIC_MAP;
        const { grid, pStart, dots: d, pills, ghosts: g } = parseMap(rawMap);
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: DIRS.LEFT });
        setDots(d);
        setPowerPills(pills);
        setGhosts(g);
        setScore(0);
        setLives(3);
        setGameOver(false);
        setGameWon(false);
        setFrightenedTimer(0);
        nextDirRef.current = DIRS.LEFT;
        setGameStarted(false);

        try { playPacmanStartSound(); } catch(e) {}
        const t = setTimeout(() => setGameStarted(true), 1500);
        return () => clearTimeout(t);
    }, [mapType]); // eslint-disable-line

    // ── Keyboard ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowUp')    { e.preventDefault(); nextDirRef.current = DIRS.UP; }
            if (e.key === 'ArrowDown')  { e.preventDefault(); nextDirRef.current = DIRS.DOWN; }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); nextDirRef.current = DIRS.LEFT; }
            if (e.key === 'ArrowRight') { e.preventDefault(); nextDirRef.current = DIRS.RIGHT; }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── Game Loop ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!gameStarted) return;

        const speed = difficulty === 'Hard' ? 120 : difficulty === 'Easy' ? 200 : 160;

        const tick = () => {
            const s = stateRef.current;
            if (!s.gameStarted || s.gameOver || s.gameWon || !s.pacman || s.mapGrid.length === 0) return;

            const grid = s.mapGrid;
            const cols = grid[0].length;
            const rows = grid.length;

            // ── Move Pacman ──────────────────────────────────────────────────
            let newPac = { ...s.pacman };
            const tryMove = (p, dir) => {
                let nx = p.x + dir.x;
                let ny = p.y + dir.y;
                if (nx < 0) nx = cols - 1;
                if (nx >= cols) nx = 0;
                if (ny < 0 || ny >= rows) return null;
                const cell = grid[ny][nx];
                if (cell !== 'W' && cell !== 'H') return { x: nx, y: ny };
                return null;
            };

            const wantedMove = tryMove(newPac, nextDirRef.current);
            if (wantedMove) {
                newPac.x = wantedMove.x;
                newPac.y = wantedMove.y;
                newPac.dir = nextDirRef.current;
            } else {
                const cont = tryMove(newPac, newPac.dir);
                if (cont) { newPac.x = cont.x; newPac.y = cont.y; }
            }

            const posKey = `${newPac.x},${newPac.y}`;
            let newDots = s.dots;
            let newPills = s.powerPills;
            let scoreDelta = 0;
            let newFrightened = s.frightenedTimer > 0 ? s.frightenedTimer - 1 : 0;
            let newLives = s.lives;
            let newGameOver = false;
            let newGameWon = false;

            if (s.dots.has(posKey)) {
                newDots = new Set(s.dots);
                newDots.delete(posKey);
                scoreDelta += 10;
                try { soundRefs.current.playPacmanWakaSound(); } catch(e) {}
                if (newDots.size === 0) { newGameWon = true; try { soundRefs.current.playWinSound(); } catch(e) {} }
            }
            if (s.powerPills.has(posKey)) {
                newPills = new Set(s.powerPills);
                newPills.delete(posKey);
                scoreDelta += 50;
                newFrightened = difficulty === 'Hard' ? 20 : 35;
                try { soundRefs.current.playPacmanPowerPillSound(); } catch(e) {}
            }

            // ── Move Ghosts ──────────────────────────────────────────────────
            const isFrightened = newFrightened > 0;
            let comboRef = 0;
            const newGhosts = s.ghosts.map(g => {
                let cg = { ...g };

                // Update state
                if (isFrightened && cg.state !== 'dead') cg.state = 'frightened';
                else if (!isFrightened && cg.state === 'frightened') cg.state = 'chase';

                // Revive dead ghosts at home
                if (cg.state === 'dead' && cg.x === cg.startX && cg.y === cg.startY) {
                    cg.state = 'chase';
                }

                // Get valid directions
                const opposite = getOppositeDir(cg.dir);
                const validDirs = DIR_LIST.filter(d => {
                    if (isSameDir(d, opposite) && cg.state !== 'dead') return false;
                    let nx = cg.x + d.x, ny = cg.y + d.y;
                    if (nx < 0) nx = cols - 1;
                    if (nx >= cols) nx = 0;
                    if (ny < 0 || ny >= rows) return false;
                    const cell = grid[ny][nx];
                    if (cell === 'W') return false;
                    if (cell === 'H' && cg.state !== 'dead') return false;
                    return true;
                });

                if (validDirs.length === 0) validDirs.push(opposite);

                // Choose direction
                let chosen = validDirs[0];
                if (validDirs.length > 1) {
                    if (cg.state === 'frightened') {
                        chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
                    } else if (cg.state === 'dead') {
                        // Go back to spawn
                        let minD = Infinity;
                        for (const d of validDirs) {
                            const nx = cg.x + d.x, ny = cg.y + d.y;
                            const dist = Math.abs(nx - cg.startX) + Math.abs(ny - cg.startY);
                            if (dist < minD) { minD = dist; chosen = d; }
                        }
                    } else {
                        // Chase target
                        let target = { x: newPac.x, y: newPac.y };
                        if (cg.id === 'PINKY') {
                            target = { x: newPac.x + newPac.dir.x * 4, y: newPac.y + newPac.dir.y * 4 };
                        } else if (cg.id === 'CLYDE') {
                            const dist = Math.abs(cg.x - newPac.x) + Math.abs(cg.y - newPac.y);
                            if (dist < 5) target = { x: 1, y: 1 };
                        }
                        let minD = Infinity;
                        for (const d of validDirs) {
                            const nx = cg.x + d.x, ny = cg.y + d.y;
                            const dist = Math.abs(nx - target.x) + Math.abs(ny - target.y);
                            if (dist < minD) { minD = dist; chosen = d; }
                        }
                    }
                }

                cg.dir = chosen;
                cg.x += chosen.x;
                cg.y += chosen.y;
                if (cg.x < 0) cg.x = cols - 1;
                if (cg.x >= cols) cg.x = 0;

                return cg;
            });

            // ── Collision Detection ──────────────────────────────────────────
            let pacDied = false;
            const finalGhosts = newGhosts.map(cg => {
                if (cg.x === newPac.x && cg.y === newPac.y) {
                    if (cg.state === 'frightened') {
                        cg = { ...cg, state: 'dead' };
                        comboRef++;
                        scoreDelta += 200 * Math.pow(2, comboRef - 1);
                        try { soundRefs.current.playPacmanEatGhostSound(); } catch(e) {}
                    } else if (cg.state !== 'dead') {
                        pacDied = true;
                    }
                }
                return cg;
            });

            if (pacDied && !newGameOver && !newGameWon) {
                try { soundRefs.current.playPacmanDieSound(); } catch(e) {}
                newLives = s.lives - 1;
                if (newLives <= 0) {
                    newGameOver = true;
                    try { soundRefs.current.playLoseSound(); } catch(e) {}
                } else {
                    // Reset positions
                    newPac = { ...s.pacman, x: s.pacman.startX, y: s.pacman.startY, dir: DIRS.LEFT };
                    nextDirRef.current = DIRS.LEFT;
                    setGameStarted(false);
                    setTimeout(() => setGameStarted(true), 1500);
                }
            }

            // ── Apply state updates ──────────────────────────────────────────
            setPacman(newPac);
            setGhosts(finalGhosts);
            setDots(newDots);
            setPowerPills(newPills);
            setFrightenedTimer(newFrightened);
            if (scoreDelta) setScore(sc => sc + scoreDelta);
            if (newLives !== s.lives) setLives(newLives);
            if (newGameOver) setGameOver(true);
            if (newGameWon) setGameWon(true);
        };

        const id = setInterval(tick, speed);
        return () => clearInterval(id);
    }, [gameStarted, difficulty]); // minimal deps - read live state via stateRef

    // ── Restart ────────────────────────────────────────────────────────────────
    const handleRestart = useCallback(() => {
        const rawMap = ALL_MAPS[mapType] || CLASSIC_MAP;
        const { grid, pStart, dots: d, pills, ghosts: g } = parseMap(rawMap);
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: DIRS.LEFT });
        setDots(d);
        setPowerPills(pills);
        setGhosts(g);
        setScore(0);
        setLives(3);
        setGameOver(false);
        setGameWon(false);
        setFrightenedTimer(0);
        nextDirRef.current = DIRS.LEFT;
        setGameStarted(false);
        try { playPacmanStartSound(); } catch(e) {}
        setTimeout(() => setGameStarted(true), 1500);
    }, [mapType, playPacmanStartSound]);

    // ── Render guard ───────────────────────────────────────────────────────────
    if (mapGrid.length === 0 || !pacman) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👾</div>
                    <div style={{ fontSize: '1.2rem', color: '#fbbf24' }}>Loading Pacman...</div>
                </div>
            </div>
        );
    }

    const cols = mapGrid[0].length;
    const rows = mapGrid.length;

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '820px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={20} color="#fbbf24" />
                        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fbbf24' }}>{score}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {mapType} · {difficulty}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[...Array(3)].map((_, i) => (
                            <Heart key={i} size={20} color={i < lives ? '#ef4444' : '#4b5563'} fill={i < lives ? '#ef4444' : 'none'} />
                        ))}
                    </div>
                </div>

                {/* Game Board */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    width: '100%',
                    maxWidth: '600px',
                    aspectRatio: `${cols} / ${rows}`,
                    background: '#000',
                    borderRadius: '8px',
                    border: '4px solid #1e40af',
                    position: 'relative'
                }}>
                    {/* Static Map Cells */}
                    {mapGrid.map((row, y) => row.map((cell, x) => (
                        <div key={`c-${x}-${y}`} style={{
                            width: '100%', height: '100%',
                            background: cell === 'W' ? '#1e3a8a' : cell === 'H' ? 'rgba(250,120,0,0.25)' : 'transparent',
                            boxSizing: 'border-box',
                            border: cell === 'W' ? '1px solid #1e40af' : 'none'
                        }} />
                    )))}

                    {/* Dots */}
                    {Array.from(dots).map(key => {
                        const [x, y] = key.split(',').map(Number);
                        return (
                            <div key={`dot-${key}`} style={{
                                position: 'absolute',
                                width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none'
                            }}>
                                <div style={{ width: '25%', height: '25%', background: '#fbbf24', borderRadius: '50%' }} />
                            </div>
                        );
                    })}

                    {/* Power Pills */}
                    {Array.from(powerPills).map(key => {
                        const [x, y] = key.split(',').map(Number);
                        return (
                            <div key={`pill-${key}`} style={{
                                position: 'absolute',
                                width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none'
                            }}>
                                <div style={{ width: '60%', height: '60%', background: '#fbbf24', borderRadius: '50%', animation: 'pacPulse 0.6s infinite alternate' }} />
                            </div>
                        );
                    })}

                    {/* Ghosts */}
                    {ghosts.map(g => (
                        <div key={g.id} style={{
                            position: 'absolute',
                            width: `${100 / cols}%`, height: `${100 / rows}%`,
                            left: `${(g.x / cols) * 100}%`, top: `${(g.y / rows) * 100}%`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10, transition: 'left 0.12s linear, top 0.12s linear',
                            pointerEvents: 'none'
                        }}>
                            {g.state === 'dead'
                                ? <span style={{ fontSize: `calc(min(600px, 90vw) / ${cols} * 0.7)` }}>👀</span>
                                : <GhostIcon
                                    width="80%" height="80%"
                                    color={g.state === 'frightened'
                                        ? (frightenedTimer < 8 && frightenedTimer % 2 === 0 ? '#fff' : '#1d4ed8')
                                        : g.color}
                                    fill={g.state === 'frightened'
                                        ? (frightenedTimer < 8 && frightenedTimer % 2 === 0 ? '#fff' : '#1d4ed8')
                                        : g.color}
                                  />
                            }
                        </div>
                    ))}

                    {/* Pacman */}
                    <div style={{
                        position: 'absolute',
                        width: `${100 / cols}%`, height: `${100 / rows}%`,
                        left: `${(pacman.x / cols) * 100}%`, top: `${(pacman.y / rows) * 100}%`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 11, transition: 'left 0.12s linear, top 0.12s linear',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            width: '85%', height: '85%',
                            background: '#fbbf24', borderRadius: '50%',
                            clipPath: 'polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%)',
                            transform: `rotate(${pacman.dir.x === 1 ? 0 : pacman.dir.y === 1 ? 90 : pacman.dir.x === -1 ? 180 : -90}deg)`,
                            animation: 'pacmanChomp 0.25s infinite alternate'
                        }} />
                    </div>

                    {/* Ready Overlay */}
                    {!gameStarted && !gameOver && !gameWon && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 20 }}>
                            <h2 style={{ color: '#fbbf24', fontSize: '2rem', animation: 'pacFlash 0.8s infinite' }}>READY!</h2>
                        </div>
                    )}
                </div>

                {/* Controls hint */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                    <span>⬆️⬇️⬅️➡️ Di chuyển</span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={handleRestart} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCcw size={16} /> Chơi Lại
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={16} /> Về Sảnh
                    </button>
                </div>

                {/* Game Over / Win Overlay */}
                {(gameOver || gameWon) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, backdropFilter: 'blur(8px)', gap: '15px'
                    }}>
                        <div style={{ fontSize: '5rem' }}>{gameWon ? '🏆' : '💀'}</div>
                        <h2 style={{ fontSize: '3rem', margin: 0, color: gameWon ? '#4ade80' : '#f87171' }}>
                            {gameWon ? 'VICTORY!' : 'GAME OVER!'}
                        </h2>
                        <p style={{ fontSize: '1.5rem', color: '#fbbf24', margin: 0 }}>SCORE: {score}</p>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
                            <button className="btn-primary" onClick={handleRestart} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RotateCcw size={20} /> Chơi Lại
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeft size={20} /> Về Sảnh
                            </button>
                        </div>
                    </div>
                )}

                {/* CSS */}
                <style>{`
                    @keyframes pacmanChomp {
                        0%   { clip-path: polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%); }
                        100% { clip-path: polygon(100% 50%, 50% 50%, 100% 50%, 100% 0, 0 0, 0 100%, 100% 100%); }
                    }
                    @keyframes pacFlash { 0%,100%{opacity:1} 50%{opacity:0} }
                    @keyframes pacPulse { 0%{transform:scale(0.8)} 100%{transform:scale(1.2)} }
                `}</style>
            </div>
        </div>
    );
}
