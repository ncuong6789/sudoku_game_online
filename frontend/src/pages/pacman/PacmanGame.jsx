import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Heart, Ghost as GhostIcon } from 'lucide-react';
import { useAudio } from '../../utils/useAudio';

// ─── Maps: 21 cols × 22 rows ─────────────────────────────────────────────────
// W=wall  .=dot  P=PowerPill  _=floor  H=gate(ghost only)  S=Pacman start
// Ghost house: rows 7-9, cols 6-13. Gate H at (10,7). Interior floor at row 8.
// Left corridor: cols 1-5 (rows 7-9). Right corridor: cols 14-19 (rows 7-9).

const CLASSIC = [
    "WWWWWWWWWWWWWWWWWWWWW",  // 0
    "W.........W.........W",  // 1
    "W.WWW.WWW.W.WWW.WWW.W",  // 2
    "WP.WW.WWW.W.WWW.WW.PW",  // 3  power pills: (1,3) (19,3)
    "W...................W",  // 4
    "W.WWW.W.WWWWW.W.WWW.W",  // 5
    "W.....W.......W.....W",  // 6
    "W.....WWWWHWWW......W",  // 7  ghost house top (H at col 10)
    "W.....W______W......W",  // 8  ghost house floor (cols 7-12)
    "W.....WWWWWWWW......W",  // 9  ghost house bottom (cols 6-13 = 8 W's)
    "W...................W",  // 10
    "W.WWW.W.WWWWW.W.WWW.W",  // 11
    "W.....W.......W.....W",  // 12
    "WWWWWWW.WWWWWWW.WWWWW",  // 13  gaps at col 7 and col 15
    "W..........S........W",  // 14  Pacman: col 11
    "W.WWW.WWW.W.WWW.WWW.W",  // 15
    "WP..W.....W.....W..PW",  // 16  power pills: (1,16) (19,16)
    "WWW.W.W.WWWWW.W.W.WWW",  // 17
    "W.....W.......W.....W",  // 18
    "W.WWWWWWW.W.WWWWWWW.W",  // 19
    "W...................W",  // 20
    "WWWWWWWWWWWWWWWWWWWWW",  // 21
];

const LABYRINTH = [
    "WWWWWWWWWWWWWWWWWWWWW",  // 0
    "WP.................PW",  // 1  power pills at each end
    "W.W.WWWWWW.WWWWWW.W.W",  // 2
    "W.W...........W...W.W",  // 3
    "W...WWWWW.W.WWWWW...W",  // 4
    "W.W.W...W.W.W...W.W.W",  // 5
    "W.W.W.WWW.W.WWW.W.W.W",  // 6
    "W.....WWWWHWWW......W",  // 7  ghost house top (same gate position)
    "W.....W______W......W",  // 8  ghost house floor
    "W.....WWWWWWWW......W",  // 9  ghost house bottom
    "W.W.W.W.......W.W.W.W",  // 10
    "W.W.W.WWWWWWWWW.W.W.W",  // 11
    "W.....W.......W.....W",  // 12
    "WWWWWWW.WWWWWWW.WWWWW",  // 13  gaps at col 7 and col 15
    "W..........S........W",  // 14  Pacman: col 11
    "W.W.W.W.......W.W.W.W",  // 15
    "WP.W...W.W.W.W...W.PW",  // 16  power pills
    "W.WW.WW.W.W.W.WW.WW.W",  // 17
    "W...W...W.W.W...W...W",  // 18
    "W.WWWWW...W...WWWWW.W",  // 19
    "W...................W",  // 20
    "WWWWWWWWWWWWWWWWWWWWW",  // 21
];

const ALL_MAPS = { Classic: CLASSIC, Labyrinth: LABYRINTH };

// Ghost start positions (hardcoded, not from map)
// BLINKY starts outside house already; others inside
const GHOST_STARTS = [
    { id: 'BLINKY', color: '#ef4444', x: 10, y: 6, dir: { x: -1, y: 0 }, exitDelay: 0 },
    { id: 'PINKY', color: '#f9a8d4', x: 9, y: 8, dir: { x: 0, y: -1 }, exitDelay: 80 },
    { id: 'INKY', color: '#06b6d4', x: 10, y: 8, dir: { x: 0, y: -1 }, exitDelay: 160 },
    { id: 'CLYDE', color: '#fb923c', x: 11, y: 8, dir: { x: 0, y: -1 }, exitDelay: 240 },
];

const DIRS = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
const DIR_LIST = Object.values(DIRS);
const GHOST_RANGES = { BLINKY: 30, PINKY: 10, INKY: 7, CLYDE: 12 };

const isSameDir = (a, b) => a?.x === b?.x && a?.y === b?.y;
const getOpp = d => ({ x: -d.x, y: -d.y });

function bfsStep(start, target, grid, canPassH = false) {
    const rows = grid.length, cols = grid[0].length;
    const visited = new Set([`${start.x},${start.y}`]);
    const queue = [{ x: start.x, y: start.y, first: null }];
    while (queue.length) {
        const cur = queue.shift();
        if (cur.x === target.x && cur.y === target.y) return cur.first;
        for (const d of DIR_LIST) {
            let nx = cur.x + d.x, ny = cur.y + d.y;
            if (nx < 0) nx = cols - 1; if (nx >= cols) nx = 0;
            if (ny < 0 || ny >= rows) continue;
            const cell = grid[ny][nx];
            if (cell === 'W') continue;
            if (cell === 'H' && !canPassH) continue;
            const k = `${nx},${ny}`;
            if (!visited.has(k)) {
                visited.add(k);
                queue.push({ x: nx, y: ny, first: cur.first ?? d });
            }
        }
    }
    return null;
}

function parseMap(raw) {
    const maxLen = Math.max(...raw.map(r => r.length));
    const grid = [], dots = new Set(), pills = new Set();
    let pStart = null;
    raw.forEach((row, y) => {
        const cells = row.padEnd(maxLen, '_').split('');
        cells.forEach((ch, x) => {
            if (ch === '.') dots.add(`${x},${y}`);
            else if (ch === 'P') pills.add(`${x},${y}`);
            else if (ch === 'S') pStart = { x, y };
        });
        grid.push(cells);
    });
    if (!pStart) pStart = { x: 11, y: 14 };
    return { grid, dots, pills, pStart };
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function PacmanGame() {
    const { state = {} } = useLocation();
    const navigate = useNavigate();
    const { mapType = 'Classic' } = state;

    const { playWinSound, playLoseSound, playPacmanStartSound,
        playPacmanWakaSound, playPacmanPowerPillSound,
        playPacmanEatGhostSound, playPacmanDieSound } = useAudio();

    const [mapGrid, setMapGrid] = useState([]);
    const [pacman, setPacman] = useState(null);
    const [ghosts, setGhosts] = useState([]);
    const [dots, setDots] = useState(new Set());
    const [pills, setPills] = useState(new Set());
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [phase, setPhase] = useState('ready'); // ready|playing|dying|won|over
    const [frightenedTimer, setFrightenedTimer] = useState(0);
    const [tickCount, setTickCount] = useState(0); // for ghost exit

    // Live refs (avoid stale closure in setInterval)
    const ref = useRef({});
    useEffect(() => {
        ref.current = { pacman, ghosts, dots, pills, score, lives, phase, frightenedTimer, mapGrid, tickCount };
    });

    const snd = useRef({});
    useEffect(() => {
        snd.current = {
            playWinSound, playLoseSound, playPacmanWakaSound,
            playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound
        };
    }, [playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound]);

    const nextDir = useRef({ x: -1, y: 0 }); // LEFT

    const initGame = useCallback(() => {
        const raw = ALL_MAPS[mapType] ?? CLASSIC;
        const { grid, dots: d, pills: p, pStart } = parseMap(raw);
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: { x: -1, y: 0 }, isProtected: false });
        setDots(d); setPills(p);
        setGhosts(GHOST_STARTS.map(g => ({
            ...g, startX: g.x, startY: g.y,
            state: g.exitDelay === 0 ? 'chase' : 'house'
        })));
        setScore(0); setLives(3); setFrightenedTimer(0); setTickCount(0);
        nextDir.current = { x: -1, y: 0 };
        setPhase('ready');
        try { playPacmanStartSound(); } catch (e) { }
        setTimeout(() => setPhase('playing'), 2000);
    }, [mapType, playPacmanStartSound]);

    useEffect(() => { initGame(); }, [mapType]); // eslint-disable-line

    useEffect(() => {
        const m = { ArrowUp: DIRS.UP, ArrowDown: DIRS.DOWN, ArrowLeft: DIRS.LEFT, ArrowRight: DIRS.RIGHT };
        const h = e => { if (m[e.key]) { e.preventDefault(); nextDir.current = m[e.key]; } };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // ── Game Loop ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'playing') return;
        const id = setInterval(() => {
            const s = ref.current;
            if (s.phase !== 'playing' || !s.pacman || !s.mapGrid.length) return;
            const grid = s.mapGrid, cols = grid[0].length, rows = grid.length;
            const tc = s.tickCount + 1;
            setTickCount(tc);

            const passable = (x, y, forGhost = false, isDead = false) => {
                if (x < 0) x = cols - 1; if (x >= cols) x = 0;
                if (y < 0 || y >= rows) return false;
                const c = grid[y][x];
                if (c === 'W') return false;
                if (c === 'H') return isDead; // only dead ghost passes gate
                if (c === '_') return true;
                return true;
            };

            // Move Pacman
            let np = { ...s.pacman };
            const wantX = np.x + nextDir.current.x, wantY = np.y + nextDir.current.y;
            if (passable(wantX, wantY)) {
                np.x = (wantX + cols) % cols; np.y = wantY; np.dir = nextDir.current;
            } else {
                const cx = np.x + np.dir.x, cy = np.y + np.dir.y;
                if (passable(cx, cy)) { np.x = (cx + cols) % cols; np.y = cy; }
            }

            // Eat dot/pill
            const pk = `${np.x},${np.y}`;
            let newDots = s.dots, newPills = s.pills, sd = 0;
            let newFr = s.frightenedTimer > 0 ? s.frightenedTimer - 1 : 0;

            if (s.dots.has(pk)) {
                newDots = new Set(s.dots); newDots.delete(pk); sd += 10;
                try { snd.current.playPacmanWakaSound(); } catch (e) { }
                if (newDots.size === 0) { setGameWon(sd, newDots); return; }
            }
            if (s.pills.has(pk)) {
                newPills = new Set(s.pills); newPills.delete(pk); sd += 50;
                newFr = 35;
                try { snd.current.playPacmanPowerPillSound(); } catch (e) { }
            }

            const isFr = newFr > 0;

            // Move Ghosts
            const newGhosts = s.ghosts.map(g => {
                if (g.state === 'house') {
                    // Exit when timer fires
                    if (tc >= g.exitDelay) {
                        // Navigate toward gate (10,7) then out
                        return { ...g, state: 'exiting' };
                    }
                    return g;
                }
                let cg = { ...g };
                // Exiting: pathfind to outside (10,6)
                if (cg.state === 'exiting') {
                    const target = { x: 10, y: 6 };
                    if (cg.x === target.x && cg.y === target.y) { cg.state = 'chase'; return cg; }
                    const step = bfsStep(cg, target, grid, true);
                    if (step) { cg.x += step.x; cg.y += step.y; cg.dir = step; }
                    return cg;
                }
                // State transitions
                if (isFr && cg.state !== 'dead') cg.state = 'frightened';
                else if (!isFr && cg.state === 'frightened') cg.state = 'chase';
                if (cg.state === 'dead' && cg.x === cg.startX && cg.y === cg.startY) cg.state = 'chase';

                // Valid dirs (no reversal unless dead)
                const opp = getOpp(cg.dir);
                const valid = DIR_LIST.filter(d => {
                    if (cg.state !== 'dead' && isSameDir(d, opp)) return false;
                    let nx = cg.x + d.x, ny = cg.y + d.y;
                    if (nx < 0) nx = cols - 1; if (nx >= cols) nx = 0;
                    return passable(nx, ny, true, cg.state === 'dead');
                });
                if (!valid.length) valid.push(opp);

                let chosen = valid[Math.floor(Math.random() * valid.length)];
                if (cg.state === 'dead') {
                    const step = bfsStep(cg, { x: cg.startX, y: cg.startY }, grid, true);
                    if (step && valid.some(d => isSameDir(d, step))) chosen = step;
                } else if (cg.state === 'chase') {
                    const dist = Math.abs(cg.x - np.x) + Math.abs(cg.y - np.y);
                    if (dist <= GHOST_RANGES[cg.id] ?? 8) {
                        let tgt = { x: np.x, y: np.y };
                        if (cg.id === 'PINKY') tgt = { x: np.x + np.dir.x * 4, y: np.y + np.dir.y * 4 };
                        else if (cg.id === 'CLYDE' && dist < 5) tgt = { x: 1, y: rows - 2 };
                        const step = bfsStep(cg, tgt, grid, false);
                        if (step && valid.some(d => isSameDir(d, step))) chosen = step;
                    }
                }
                cg.dir = chosen;
                cg.x += chosen.x; cg.y += chosen.y;
                if (cg.x < 0) cg.x = cols - 1; if (cg.x >= cols) cg.x = 0;
                return cg;
            });

            // Collision
            let pacDied = false, eatCombo = 0;
            const finalGhosts = newGhosts.map(cg => {
                if ((cg.x === np.x && cg.y === np.y) || (s.pacman && cg.x === s.pacman.x && cg.y === s.pacman.y)) {
                    if (cg.state === 'frightened') {
                        eatCombo++; sd += 200 * Math.pow(2, eatCombo - 1);
                        try { snd.current.playPacmanEatGhostSound(); } catch (e) { }
                        return { ...cg, state: 'dead' };
                    } else if (cg.state !== 'dead' && cg.state !== 'house' && cg.state !== 'exiting') {
                        if (!np.isProtected) pacDied = true;
                    }
                }
                return cg;
            });

            if (pacDied) {
                try { snd.current.playPacmanDieSound(); } catch (e) { }
                const nl = s.lives - 1;
                setPhase('dying');
                setTimeout(() => {
                    if (nl <= 0) {
                        setLives(0); setPhase('over');
                        try { snd.current.playLoseSound(); } catch (e) { }
                    } else {
                        setLives(nl);
                        // Pacman stays at death position but becomes protected
                        setPacman(p => ({ ...p, isProtected: true }));
                        setGhosts(GHOST_STARTS.map(g => ({
                            ...g, startX: g.x, startY: g.y,
                            state: g.exitDelay === 0 ? 'chase' : 'house'
                        })));
                        setFrightenedTimer(0);
                        setPhase('ready');
                        try { playPacmanStartSound(); } catch (e) { }
                        setTimeout(() => {
                            setPhase('playing');
                            // Remove protection after 2s
                            setTimeout(() => setPacman(p => p ? { ...p, isProtected: false } : p), 2000);
                        }, 2000);
                    }
                }, 1200);
                setPacman(np); setGhosts(finalGhosts);
                return;
            }

            setPacman(np); setGhosts(finalGhosts);
            setDots(newDots); setPills(newPills);
            setFrightenedTimer(newFr);
            if (sd) setScore(sc => sc + sd);
        }, 165);
        return () => clearInterval(id);
    }, [phase]); // eslint-disable-line

    const setGameWon = useCallback((sd, newDots) => {
        setDots(newDots);
        if (sd) setScore(sc => sc + sd);
        setPhase('won');
        try { snd.current.playWinSound(); } catch (e) { }
    }, []);

    const handleRestart = useCallback(() => initGame(), [initGame]);

    // ── Render ─────────────────────────────────────────────────────────────────
    if (!mapGrid.length || !pacman) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>👾</div>
                <div style={{ color: '#fbbf24', marginTop: '1rem' }}>Loading...</div>
            </div>
        </div>
    );

    const cols = mapGrid[0].length, rows = mapGrid.length;
    const isDying = phase === 'dying';
    const isProtected = pacman.isProtected;

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            width: '100%', height: 'calc(100vh - 80px)',
            padding: 'clamp(0.5rem,1.5vw,1rem)',
            boxSizing: 'border-box', gap: 'clamp(0.5rem,1vw,1rem)',
            overflow: 'hidden', minWidth: 0
        }}>
            {/* ── BOARD ── */}
            <div style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: '100%', maxHeight: '100%', aspectRatio: `${cols}/${rows}`, maxWidth: '100%', flexShrink: 0 }}>
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`,
                        background: '#000', borderRadius: '8px', border: '4px solid #1e40af', boxSizing: 'border-box'
                    }}>
                        {mapGrid.map((row, y) => row.map((cell, x) => (
                            <div key={`c${x}${y}`} style={{
                                background: cell === 'W' ? '#1e3a8a' : cell === 'H' ? 'rgba(249,115,22,0.5)' : '#000',
                                border: cell === 'W' ? '0.5px solid #1e40af' : 'none', boxSizing: 'border-box'
                            }} />
                        )))}

                        {Array.from(dots).map(k => {
                            const [x, y] = k.split(',').map(Number); return (
                                <div key={`d${k}`} style={{
                                    position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                    left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                }}>
                                    <div style={{ width: '22%', height: '22%', background: '#fbbf24', borderRadius: '50%' }} />
                                </div>
                            );
                        })}

                        {Array.from(pills).map(k => {
                            const [x, y] = k.split(',').map(Number); return (
                                <div key={`p${k}`} style={{
                                    position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                    left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                }}>
                                    <div style={{ width: '60%', height: '60%', background: '#fbbf24', borderRadius: '50%', animation: 'pacPulse 0.6s infinite alternate' }} />
                                </div>
                            );
                        })}

                        {ghosts.filter(g => g.state !== 'house').map(g => {
                            const fr = g.state === 'frightened';
                            const flash = fr && frightenedTimer < 8 && frightenedTimer % 2 === 0;
                            const c = g.state === 'dead' ? 'transparent' : flash ? '#fff' : fr ? '#1d4ed8' : g.color;
                            return (
                                <div key={g.id} style={{
                                    position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                    left: `${(g.x / cols) * 100}%`, top: `${(g.y / rows) * 100}%`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 10, transition: 'left 0.1s linear,top 0.1s linear', pointerEvents: 'none'
                                }}>
                                    {g.state === 'dead'
                                        ? <span style={{ lineHeight: 1, fontSize: `clamp(6px,${80 / rows}cqw,20px)` }}>👀</span>
                                        : <GhostIcon width="80%" height="80%" color={c} fill={c} />
                                    }
                                </div>
                            );
                        })}

                        {/* Pacman */}
                        <div style={{
                            position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                            left: `${(pacman.x / cols) * 100}%`, top: `${(pacman.y / rows) * 100}%`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 11, transition: isDying ? 'none' : 'left 0.1s linear,top 0.1s linear',
                            pointerEvents: 'none',
                            animation: isDying ? 'pacDie 1.2s forwards' : isProtected ? 'pacFlash 0.25s infinite' : undefined
                        }}>
                            <div style={{
                                width: '88%', height: '88%', background: '#fbbf24', borderRadius: '50%',
                                clipPath: 'polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%)',
                                transform: `rotate(${pacman.dir.x === 1 ? 0 : pacman.dir.y === 1 ? 90 : pacman.dir.x === -1 ? 180 : -90}deg)`,
                                animation: isDying ? 'none' : isProtected ? undefined : 'pacmanChomp 0.25s infinite alternate'
                            }} />
                        </div>

                        {phase === 'ready' && !isDying && (
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.65)', zIndex: 20, borderRadius: '4px'
                            }}>
                                <h2 style={{ color: '#fbbf24', fontSize: 'clamp(1rem,4vw,2.5rem)', animation: 'pacFlash 0.8s infinite', margin: 0 }}>READY!</h2>
                            </div>
                        )}
                    </div>

                    {/* Win / Over overlay */}
                    {(phase === 'over' || phase === 'won') && (
                        <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            zIndex: 100, gap: '16px', borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: 'clamp(3rem,8vw,5rem)' }}>{phase === 'won' ? '🏆' : '💀'}</div>
                            <h2 style={{ fontSize: 'clamp(1.5rem,5vw,3rem)', margin: 0, color: phase === 'won' ? '#4ade80' : '#f87171' }}>
                                {phase === 'won' ? 'VICTORY!' : 'GAME OVER!'}
                            </h2>
                            <p style={{ fontSize: 'clamp(1rem,3vw,1.5rem)', color: '#fbbf24', margin: 0 }}>SCORE: {score}</p>
                            <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button className="btn-primary" onClick={handleRestart} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RotateCcw size={18} /> Chơi Lại
                                </button>
                                <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowLeft size={18} /> Về Sảnh
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── SIDEBAR ── */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: 'clamp(0.4rem,0.8vw,0.8rem)',
                width: 'clamp(150px,18vw,220px)', flexShrink: 0, height: '100%', overflowY: 'auto'
            }}>

                <div className="glass-panel" style={{ padding: 'clamp(0.8rem,1.5vw,1.2rem)', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Score</div>
                        <div style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{score}</div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Lives</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            {[...Array(3)].map((_, i) => (
                                <Heart key={i} size={22} color={i < lives ? '#ef4444' : '#374151'} fill={i < lives ? '#ef4444' : 'none'} />
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Map</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{mapType}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Dots</span>
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>{dots.size}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Ghosts</div>
                    {ghosts.map(g => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                            <GhostIcon size={14} color={g.state === 'dead' ? '#6b7280' : g.state === 'frightened' ? '#1d4ed8' : g.color}
                                fill={g.state === 'dead' ? '#6b7280' : g.state === 'frightened' ? '#1d4ed8' : g.color} />
                            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{g.id[0] + g.id.slice(1).toLowerCase()}</span>
                            <span style={{ fontSize: '0.65rem' }}>
                                {g.state === 'frightened' ? '😱' : g.state === 'dead' ? '💀' : g.state === 'house' ? '🏠' : g.state === 'exiting' ? '🚪' : '🎯'}
                            </span>
                        </div>
                    ))}
                </div>

                {frightenedTimer > 0 && (
                    <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', border: '1px solid rgba(29,78,216,0.5)', background: 'rgba(29,78,216,0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginBottom: '2px' }}>⚡ POWER</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa' }}>{frightenedTimer}</div>
                    </div>
                )}

                {isProtected && phase === 'playing' && (
                    <div className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center', border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', animation: 'pacFlash 0.5s infinite' }}>🛡️ Bất Tử</div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                    <button className="btn-primary" onClick={handleRestart}
                        style={{ padding: '9px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%', fontSize: '0.9rem' }}>
                        <RotateCcw size={15} /> Chơi Lại
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/pacman')}
                        style={{ padding: '9px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%', fontSize: '0.9rem' }}>
                        <ArrowLeft size={15} /> Về Sảnh
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pacmanChomp {
                    0%  { clip-path: polygon(100% 74%, 44% 48%, 100% 21%, 100% 0, 0 0, 0 100%, 100% 100%); }
                    100%{ clip-path: polygon(100% 50%, 50% 50%, 100% 50%, 100% 0, 0 0, 0 100%, 100% 100%); }
                }
                @keyframes pacDie {
                    0%  { transform:scale(1) rotate(0deg); opacity:1; }
                    60% { transform:scale(1.3) rotate(180deg); opacity:0.7; }
                    100%{ transform:scale(0) rotate(360deg); opacity:0; }
                }
                @keyframes pacFlash { 0%,100%{opacity:1} 50%{opacity:0.2} }
                @keyframes pacPulse { 0%{transform:scale(0.8)} 100%{transform:scale(1.2)} }
            `}</style>
        </div>
    );
}
