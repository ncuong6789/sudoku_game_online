import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '../../utils/useAudio';
import { ALL_MAPS, CLASSIC, DIRS, GHOST_STARTS, chooseDirectionClassic, getGlobalMode, getRandomDir, manhattan, parseMap } from './pacmanAI';

export function usePacmanLogic(mapType, difficulty) {
    const { playWinSound, playLoseSound, playPacmanStartSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound } = useAudio();

    const [mapGrid, setMapGrid] = useState([]);
    const [pacman, setPacman] = useState(null);
    const [ghosts, setGhosts] = useState([]);
    const [dots, setDots] = useState(new Set());
    const [pills, setPills] = useState(new Set());
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [phase, setPhase] = useState('ready'); // ready|playing|dying|won|over
    const [frightenedTimer, setFrightenedTimer] = useState(0);
    const [protectedTimer, setProtectedTimer] = useState(0);
    const [tickCount, setTickCount] = useState(0);

    const ref = useRef({});
    useEffect(() => {
        ref.current = { pacman, ghosts, dots, pills, score, lives, phase, frightenedTimer, protectedTimer, mapGrid, tickCount };
    });

    const snd = useRef({});
    useEffect(() => {
        snd.current = { playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound };
    }, [playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound]);

    const nextDir = useRef({ x: -1, y: 0 });
    const totalDotsRef = useRef(0);

    const initGame = useCallback(() => {
        const raw = ALL_MAPS[mapType] ?? CLASSIC;
        const { grid, dots: d, pills: p, pStart } = parseMap(raw);
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: { x: -1, y: 0 }, isProtected: false });
        setDots(d); setPills(p);
        totalDotsRef.current = d.size;

        const total = d.size;
        const ghostDotThresholds = difficulty === 'hard'
            ? [0, Math.floor(total * 0.10), Math.floor(total * 0.20), Math.floor(total * 0.30)]
            : [0, Math.floor(total * 0.20), Math.floor(total * 0.40), Math.floor(total * 0.60)];

        setGhosts(GHOST_STARTS.map((g, i) => {
            const threshold = ghostDotThresholds[i] ?? 9999;
            const immediate = threshold === 0;
            return {
                ...g, startX: g.x, startY: g.y,
                state: immediate ? (g.id === 'PINKY' ? 'exiting' : 'chase') : 'house',
                dotThreshold: threshold,
                fallbackDelay: 9999,
            };
        }));

        setScore(0); setLives(3); setFrightenedTimer(0); setProtectedTimer(0); setTickCount(0);
        nextDir.current = { x: -1, y: 0 };
        setPhase('ready');
        try { playPacmanStartSound(); } catch (e) { }
        setTimeout(() => setPhase('playing'), 4300);
    }, [mapType, difficulty, playPacmanStartSound]);

    useEffect(() => { initGame(); }, [initGame]); 

    const handleRestart = useCallback(() => initGame(), [initGame]);

    useEffect(() => {
        const m = { ArrowUp: DIRS.UP, ArrowDown: DIRS.DOWN, ArrowLeft: DIRS.LEFT, ArrowRight: DIRS.RIGHT };
        const h = e => {
            if (e.key === ' ' && (ref.current.phase === 'over' || ref.current.phase === 'won')) {
                e.preventDefault();
                handleRestart();
                return;
            }
            if (m[e.key]) { e.preventDefault(); nextDir.current = m[e.key]; }
            if (['w', 'W'].includes(e.key)) { e.preventDefault(); nextDir.current = DIRS.UP; }
            if (['s', 'S'].includes(e.key)) { e.preventDefault(); nextDir.current = DIRS.DOWN; }
            if (['a', 'A'].includes(e.key)) { e.preventDefault(); nextDir.current = DIRS.LEFT; }
            if (['d', 'D'].includes(e.key)) { e.preventDefault(); nextDir.current = DIRS.RIGHT; }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [handleRestart]);

    const setGameWon = useCallback((sd, newDots) => {
        setDots(newDots);
        if (sd) setScore(sc => sc + sd);
        setPhase('won');
        try { snd.current.playWinSound(); } catch (e) { }
    }, []);

    useEffect(() => {
        if (phase !== 'playing') return;
        const id = setInterval(() => {
            const s = ref.current;
            if (s.phase !== 'playing' || !s.pacman || !s.mapGrid.length) return;
            const grid = s.mapGrid, cols = grid[0].length, rows = grid.length;
            const tc = s.tickCount + 1;
            setTickCount(tc);

            const passable = (x, y, forGhost = false) => {
                const nx = (x + cols) % cols;
                if (y < 0 || y >= rows) return false;
                const c = grid[y][nx];
                if (c === 'W' || c === '|') return false;
                if (c === 'H' || c === '_' || c === '-') return forGhost;
                return true;
            };

            let np = { ...s.pacman, prevX: s.pacman.x, prevY: s.pacman.y };
            const wantX = np.x + nextDir.current.x, wantY = np.y + nextDir.current.y;
            if (passable(wantX, wantY)) {
                np.x = (wantX + cols) % cols; np.y = wantY; np.dir = nextDir.current;
            } else {
                const cx = np.x + np.dir.x, cy = np.y + np.dir.y;
                if (passable(cx, cy)) { np.x = (cx + cols) % cols; np.y = cy; }
            }

            const pk = `${np.x},${np.y}`;
            let newDots = s.dots, newPills = s.pills, sd = 0;
            let newFr = s.frightenedTimer > 0 ? s.frightenedTimer - 1 : 0;
            let newProt = s.protectedTimer > 0 ? s.protectedTimer - 1 : 0;

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
            const gm = getGlobalMode(tc);
            const prevGm = getGlobalMode(tc - 1);
            const modeFlip = (gm !== prevGm);

            const newGhosts = s.ghosts.map(g => {
                let cg = { ...g, prevX: g.x, prevY: g.y };

                if (cg.state === 'house') {
                    const dotsEaten = totalDotsRef.current - newDots.size;
                    const dotOk = cg.dotThreshold !== undefined && dotsEaten >= cg.dotThreshold;
                    const timeOk = cg.fallbackDelay !== undefined && tc >= cg.fallbackDelay;
                    if (dotOk || timeOk) cg.state = 'exiting';
                    else return cg;
                }

                if (cg.state === 'exiting') {
                    const gateOut = { x: 13, y: 11 };
                    if (cg.x === gateOut.x && cg.y === gateOut.y) {
                        cg.state = 'chase'; 
                    } else {
                        const step = chooseDirectionClassic(cg, gateOut, grid, true);
                        if (step) { cg.dir = step; cg.x = (cg.x + step.x + cols) % cols; cg.y += step.y; }
                        return cg;
                    }
                }

                if (modeFlip && cg.state !== 'dead') {
                    const rev = { x: -cg.dir.x, y: -cg.dir.y };
                    const rx = (cg.x + rev.x + cols) % cols, ry = cg.y + rev.y;
                    const canRev = ry >= 0 && ry < rows && grid[ry][rx] !== 'W' && grid[ry][rx] !== '|';
                    if (canRev) cg.dir = rev; 
                }

                if (isFr && cg.state !== 'dead') cg.state = 'frightened';
                else if (!isFr && cg.state === 'frightened') cg.state = 'chase';
                else if (cg.state !== 'dead') cg.state = gm.toLowerCase();

                if (cg.state === 'dead' && cg.x === 13 && cg.y === 14) cg.state = 'exiting';

                const isFrightened = cg.state === 'frightened';
                const shouldMove = !isFrightened || (tc % 2 === 0);

                let target = { x: np.x, y: np.y };

                if (cg.state === 'dead') {
                    target = { x: 13, y: 14 }; 
                } else if (isFrightened) {
                    const corners = [{ x: 1, y: 1 }, { x: cols - 2, y: 1 }, { x: 1, y: rows - 2 }, { x: cols - 2, y: rows - 2 }];
                    let maxDist = -1, bestCorner = corners[0];
                    corners.forEach(c => {
                        const d = manhattan(c, np);
                        if (d > maxDist) { maxDist = d; bestCorner = c; }
                    });
                    target = bestCorner;
                } else if (cg.state === 'scatter') {
                    target = cg.scatter || { x: 1, y: 1 };
                } else if (cg.state === 'chase') {
                    if (cg.id === 'BLINKY') target = { x: np.x, y: np.y };
                    else if (cg.id === 'PINKY') target = { x: np.x + np.dir.x * 4, y: np.y + np.dir.y * 4 };
                    else if (cg.id === 'INKY') {
                        const blinky = s.ghosts.find(gx => gx.id === 'BLINKY') || cg;
                        const p2 = { x: np.x + np.dir.x * 2, y: np.y + np.dir.y * 2 };
                        target = { x: p2.x + (p2.x - blinky.x), y: p2.y + (p2.y - blinky.y) };
                    } else if (cg.id === 'CLYDE') {
                        const d = manhattan(cg, np);
                        target = d > 8 ? { x: np.x, y: np.y } : (cg.scatter || { x: 1, y: rows - 2 });
                    }
                }

                if (shouldMove) {
                    if (isFrightened) cg.dir = getRandomDir(cg, grid);
                    else cg.dir = chooseDirectionClassic(cg, target, grid, cg.state === 'dead' || cg.state === 'exiting');
                    cg.x = (cg.x + cg.dir.x + cols) % cols;
                    cg.y += cg.dir.y;
                }
                return cg;
            });

            let pacDied = false, eatCombo = 0;
            const finalGhosts = newGhosts.map(cg => {
                if ((cg.x === np.x && cg.y === np.y) || (s.pacman && cg.x === s.pacman.x && cg.y === s.pacman.y)) {
                    if (cg.state === 'frightened') {
                        eatCombo++; sd += 200 * Math.pow(2, eatCombo - 1);
                        try { snd.current.playPacmanEatGhostSound(); } catch (e) { }
                        return { ...cg, state: 'dead' };
                    } else if (cg.state !== 'dead' && cg.state !== 'house' && cg.state !== 'exiting') {
                        if (newProt === 0) pacDied = true;
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
                        setPacman(p => ({ ...p, isProtected: true, x: p.startX, y: p.startY, dir: { x: -1, y: 0 } }));
                        setGhosts(s.ghosts.map(g => {
                            const initG = GHOST_STARTS.find(gs => gs.id === g.id);
                            return {
                                ...g, x: g.startX, y: g.startY, dir: initG.dir,
                                state: g.dotThreshold === 0 ? (g.id === 'PINKY' ? 'exiting' : 'chase') : 'house'
                            };
                        }));
                        setFrightenedTimer(0); setProtectedTimer(12); setPhase('ready');
                        try { playPacmanStartSound(); } catch (e) { }
                        setTimeout(() => setPhase('playing'), 4300);
                    }
                }, 1200);
                setGhosts(finalGhosts);
                return;
            }

            setPacman(np); setGhosts(finalGhosts);
            setDots(newDots); setPills(newPills);
            setFrightenedTimer(newFr); setProtectedTimer(newProt);
            if (sd) setScore(sc => sc + sd);
        }, 165);
        return () => clearInterval(id);
    }, [phase, setGameWon]);

    return {
        mapGrid, pacman, ghosts, dots, pills, score, lives, phase,
        frightenedTimer, protectedTimer, tickCount, totalDotsRef, handleRestart
    };
}
