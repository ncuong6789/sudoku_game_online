import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Heart } from 'lucide-react';

// ─── Custom Cute Ghost SVG ───────────────────────────────────────────────────
function GhostArt({ color = '#ef4444', dir = { x: 0, y: 0 }, state = 'chase', size = '95%', frightenedFlash = false }) {
    const isFr = state === 'frightened';
    const isDead = state === 'dead';
    const bodyColor = isDead ? 'transparent' : frightenedFlash ? '#ffffff' : isFr ? '#1d4ed8' : color;

    // Pupil offset based on direction
    const px = dir.x * 2.5;
    const py = dir.y * 2.5;

    const eye = (cx, cy) => isFr
        ? <circle cx={cx} cy={cy} r={2.5} fill={frightenedFlash ? '#1d4ed8' : '#fff'} />
        : isDead
            ? (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1d4ed8' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>)
            : (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1a1a2e' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>);

    return (
        <svg width={size} height={size} viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg' style={{ display: 'block', overflow: 'visible' }}>
            {/* Body */}
            <path
                d={[
                    'M 2 28',
                    'L 2 12',
                    'Q 2 2 14 2',
                    'Q 26 2 26 12',
                    'L 26 28',
                    'Q 23.7 24 21.3 28',
                    'Q 19 24 16.7 28',
                    'Q 14.3 24 12 28',
                    'Q 9.7 24 7.3 28',
                    'Q 5 24 2 28',
                    'Z',
                ].join(' ')}
                fill={bodyColor}
                style={{ transition: 'fill 0.1s' }}
            />
            {/* Eyes */}
            {!isDead && <>{eye(9.5, 12)}{eye(18.5, 12)}</>}
            {isDead && <>{eye(9.5, 14)}{eye(18.5, 14)}</>}
            {/* Frightened mouth squiggle */}
            {isFr && !isDead && (
                <path d='M 8 19 Q 10 17 12 19 Q 14 21 16 19 Q 18 17 20 19'
                    stroke={frightenedFlash ? '#1d4ed8' : '#fff'} strokeWidth={1.5} fill='none'
                    strokeLinecap='round' />
            )}
        </svg>
    );
}
import { useAudio } from '../../utils/useAudio';

// ─── Maps: 21 cols × 22 rows ─────────────────────────────────────────────────
// |=wall  .=dot  P=PowerPill  _=floor  H=gate(ghost only)  S=Pacman start
// Ghost house: rows 7-9, cols 6-13. Gate H at (10,7). Interior floor at row 8.
// Left corridor: cols 1-5 (rows 7-9). Right corridor: cols 14-19 (rows 7-9).

const CLASSIC = [
    "||||||||||||||||||||||||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|P|__|.|___|.||.|___|.|__|P|",
    "|.||||.|||||.||.|||||.||||.|",
    "|..........................|",
    "|.||||.||.||||||||.||.||||.|",
    "|.||||.||.||||||||.||.||||.|",
    "|......||....||....||......|",
    "||||||.|||||.||.|||||.||||||",
    "_____|.|||||.||.|||||.|_____",
    "_____|.||..........||.|_____",
    "_____|.||.|||--|||.||.|_____",
    "||||||.||.|______|.||.||||||",
    "..........|______|..........",
    "||||||.||.|______|.||.||||||",
    "_____|.||.||||||||.||.|_____",
    "_____|.||..........||.|_____",
    "_____|.||.||||||||.||.|_____",
    "||||||.||.||||||||.||.||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|...||.......S........||...|",
    "|||.||.||.||||||||.||.||.|||",
    "|||.||.||.||||||||.||.||.|||",
    "|......||....||....||......|",
    "|P||||||||||.||.||||||||||P|",
    "|.||||||||||.||.||||||||||.|",
    "|..........................|",
    "||||||||||||||||||||||||||||",
];

const PROTOTYPE = [
    "||||||||||||||||||||||||||||",
    "|............||............|",
    "|.|||||.||||.||.||||.|||||.|",
    "|P|||||.||||.||.||||.|||||P|",
    "|.|||||.||||.||.||||.|||||.|",
    "|..........................|",
    "|.||||.||.||||||||.||.||||.|",
    "|.||||.||.||||||||.||.||||.|",
    "|..||..||....||....||..||..|",
    "||.||.|||||| || ||||||.||.||",
    "||.||.|||||| || ||||||.||.||",
    "|..||..................||..|",
    "|.|||.|||.|||--|||.|||.|||.|",
    "|.|||.|||.|______|.|||.|||.|",
    "..........|______|..........",
    "|.|||.|||.|______|.|||.|||.|",
    "|.|||.|||.||||||||.|||.|||.|",
    "|..........................|",
    "|.||||||.|||.||.|||.||||||.|",
    "|.||||||.|||.||.|||.||||||.|",
    "|............||............|",
    "|.|||||.||||.||.||||.|||||.|",
    "|.|||||.||||.||.||||.|||||.|",
    "|P.||........S.........||.P|",
    "||.||.||.||||||||||.||.||.||",
    "||.||.||.||||||||||.||.||.||",
    "|.....||.....||.....||.....|",
    "|.||||||||||.||.||||||||||.|",
    "|.||||||||||.||.||||||||||.|",
    "|..........................|",
    "||||||||||||||||||||||||||||",
];

const MSMAP1 = [
    "||||||||||||||||||||||||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|P|__|.|___|.||.|___|.|__|P|",
    "|.||||.|||||.||.|||||.||||.|",
    "|..........................|",
    "|.|||||.||.||||||.||.|||||.|",
    "|.|||||.||.||||||.||.|||||.|",
    "|.......||...||...||.......|",
    "||||||.|||||.||.|||||.||||||",
    "_____|.|||||.||.|||||.|_____",
    "_____|.||..........||.|_____",
    "_____|.||.|||--|||.||.|_____",
    "||||||.||.|______|.||.||||||",
    "..........|______|..........",
    "||||||.||.|______|.||.||||||",
    "_____|.||.||||||||.||.|_____",
    "_____|.||..........||.|_____",
    "_____|.||.||||||||.||.|_____",
    "||||||.||.||||||||.||.||||||",
    "|............||............|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|...||.......S........||...|",
    "|||.||.||.||||||||.||.||.|||",
    "|||.||.||.||||||||.||.||.|||",
    "|P.....||....||....||.....P|",
    "|.||||||||||.||.||||||||||.|",
    "|.||||||||||.||.||||||||||.|",
    "|..........................|",
    "||||||||||||||||||||||||||||",
];

const MSMAP2 = [
    "||||||||||||||||||||||||||||",
    ".......||..........||.......",
    "||||||.||.||||||||.||.||||||",
    "||||||.||.||||||||.||.||||||",
    "|P...........||...........P|",
    "|.|||||||.||.||.||.|||||||.|",
    "|.|||||||.||.||.||.|||||||.|",
    "|.||......||.||.||......||.|",
    "|.||.||||.||....||.||||.||.|",
    "|.||.||||.||||||||.||||.||.|",
    "|......||.||||||||.||......|",
    "||||||.||..........||.||||||",
    "||||||.||.|||--|||.||.||||||",
    "|......||.|______|.||......|",
    "|.||||.||.|______|.||.||||.|",
    "|.||||....|______|....||||.|",
    "|...||.||.||||||||.||.||...|",
    "|||.||.||..........||.||.|||",
    "__|.||.||||.||||.||||.||.|__",
    "__|.||.||||.|__|.||||.||.|__",
    "__|.........|__|.........|__",
    "__|.|||||||.|__|.|||||||.|__",
    "|||.|||||||.||||.|||||||.|||",
    ".......||..........||.......",
    "|||.||.||.||||||||.||.||.|||",
    "|||.||.||.||||||||.||.||.|||",
    "|P..||......S||.......||..P|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|..........................|",
    "||||||||||||||||||||||||||||",
];

const MSMAP3 = [
    "||||||||||||||||||||||||||||",
    "|.........||....||.........|",
    "|.|||||||.||.||.||.|||||||.|",
    "|P|||||||.||.||.||.|||||||P|",
    "|.||.........||.........||.|",
    "|.||.||.||||.||.||||.||.||.|",
    "|....||.||||.||.||||.||....|",
    "||||.||.||||.||.||||.||.||||",
    "||||.||..............||.||||",
    ".....||||.||||||||.||||.....",
    "|.||.||||.||||||||.||||.||.|",
    "|.||....................||.|",
    "|.||||.||.||----||.||.||||.|",
    "|.||||.||.|______|.||.||||.|",
    "|......||.|______|.||......|",
    "|.||.||||.|______|.||||.||.|",
    "|.||.||||.||||||||.||||.||.|",
    "|.||....................||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|......||....||....||......|",
    "|||.||.||.||||||||.||.||.|||",
    "|||.||.||.||||||||.||.||.|||",
    "|...||.......S........||...|",
    "|.||||.|||||.||.|||||.||||.|",
    "|.||||.|||||.||.|||||.||||.|",
    "|P.....||....||....||.....P|",
    "|.||||.||.||.||.||.||.||||.|",
    "|.||||.||.||.||.||.||.||||.|",
    "|.........||....||.........|",
    "||||||||||||||||||||||||||||",
];

const MSMAP4 = [
    "||||||||||||||||||||||||||||",
    "|..........................|",
    "|.||.||||.||||||||.||||.||.|",
    "|.||.||||.||||||||.||||.||.|",
    "|P||.||||.||....||.||||.||P|",
    "|.||......||.||.||......||.|",
    "|.||||.||.||.||.||.||.||||.|",
    "|.||||.||.||.||.||.||.||||.|",
    "|......||....||....||......|",
    "|||.||||||||.||.||||||||.|||",
    "__|.||||||||.||.||||||||.|__",
    "__|....||..........||....|__",
    "|||.||.||.|||--|||.||.||.|||",
    "....||.||.|______|.||.||....",
    "||||||....|______|....||||||",
    "||||||.||.|______|.||.||||||",
    "....||.||.||||||||.||.||....",
    "|||.||.||..........||.||.|||",
    "_||....|||||.||.|||||....||_",
    "_||.||.|||||.||.|||||.||.||_",
    "_||.||.......||.......||.||_",
    "_||.|||||.||.||.||.|||||.||_",
    "|||.|||||.||.||.||.|||||.|||",
    "|.........||....||.........|",
    "|.||||.||.||||||||.||.||||.|",
    "|.||||.||.||||||||.||.||||.|",
    "|P||...||....S.....||...||P|",
    "|.||.|||||||.||.|||||||.||.|",
    "|.||.|||||||.||.|||||||.||.|",
    "|............||............|",
    "||||||||||||||||||||||||||||",
];

const ALL_MAPS = { Classic: CLASSIC, Prototype: PROTOTYPE, MsMap1: MSMAP1, MsMap2: MSMAP2, MsMap3: MSMAP3, MsMap4: MSMAP4 };

const MODE_TIMES = [
    { mode: 'SCATTER', time: 7 },
    { mode: 'CHASE', time: 20 },
    { mode: 'SCATTER', time: 7 },
    { mode: 'CHASE', time: 20 },
    { mode: 'SCATTER', time: 5 },
    { mode: 'CHASE', time: 20 },
    { mode: 'SCATTER', time: 5 },
    { mode: 'CHASE', time: Infinity }
];

const getGlobalMode = (totalTicks) => {
    let elapsed = totalTicks / 6; // 6 ticks per second
    let current = 0;
    for (let m of MODE_TIMES) {
        if (elapsed < current + m.time) return m.mode;
        current += m.time;
    }
    return 'CHASE';
};

// Ghost release logic (classic arcade):
// Blinky: always outside | Pinky: immediately | Inky: 30 dots OR ~4s | Clyde: 60 dots OR ~6s
const GHOST_STARTS = [
    { id: 'BLINKY', color: '#ef4444', x: 13, y: 11, dir: { x: -1, y: 0 }, exitDelay: 0, dotThreshold: 0, fallbackDelay: 0, scatter: { x: 26, y: 1 } },
    { id: 'PINKY', color: '#f9a8d4', x: 12, y: 14, dir: { x: 0, y: -1 }, exitDelay: 0, dotThreshold: 0, fallbackDelay: 0, scatter: { x: 1, y: 1 } },
    { id: 'INKY', color: '#06b6d4', x: 13, y: 14, dir: { x: 0, y: -1 }, exitDelay: 9999, dotThreshold: 30, fallbackDelay: 24, scatter: { x: 26, y: 29 } },
    { id: 'CLYDE', color: '#fb923c', x: 14, y: 14, dir: { x: 0, y: -1 }, exitDelay: 9999, dotThreshold: 60, fallbackDelay: 36, scatter: { x: 1, y: 29 } },
];

const DIRS = { UP: { x: 0, y: -1 }, LEFT: { x: -1, y: 0 }, DOWN: { x: 0, y: 1 }, RIGHT: { x: 1, y: 0 } };
const DIR_LIST = [DIRS.UP, DIRS.LEFT, DIRS.DOWN, DIRS.RIGHT];
const GHOST_RANGES = { BLINKY: 99, PINKY: 99, INKY: 99, CLYDE: 99 };

const isSameDir = (a, b) => a?.x === b?.x && a?.y === b?.y;
const getOpp = d => ({ x: -d.x, y: -d.y });

const distSq = (a, b) => Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);

function getRandomDir(ghost, grid) {
    const rows = grid.length, cols = grid[0].length;
    const opp = getOpp(ghost.dir);
    const valid = DIR_LIST.filter(d => {
        if (isSameDir(d, opp)) return false;
        let nx = (ghost.x + d.x + cols) % cols;
        let ny = ghost.y + d.y;
        if (ny < 0 || ny >= rows) return false;
        const cell = grid[ny][nx];
        return cell !== 'W' && cell !== '|';
    });
    if (valid.length === 0) return ghost.dir;
    return valid[Math.floor(Math.random() * valid.length)];
}

function chooseDirectionClassic(ghost, target, grid, canPassH = false) {
    const rows = grid.length, cols = grid[0].length;
    const opp = getOpp(ghost.dir);

    const validDirs = DIR_LIST.filter(d => {
        if (isSameDir(d, opp)) return false;
        let nx = (ghost.x + d.x + cols) % cols;
        let ny = ghost.y + d.y;
        if (ny < 0 || ny >= rows) return false;
        const cell = grid[ny][nx];
        return cell !== 'W' && cell !== '|' && (cell !== 'H' && cell !== '-' && cell !== '_' || canPassH);
    });

    if (validDirs.length === 0) return ghost.dir;

    let bestDir = validDirs[0], minDist = Infinity;
    validDirs.forEach(d => {
        const nx = (ghost.x + d.x + cols) % cols;
        const ny = ghost.y + d.y;
        const d2 = distSq({ x: nx, y: ny }, target);
        if (d2 < minDist) {
            minDist = d2;
            bestDir = d;
        }
    });

    return bestDir;
}

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
    const { mapType = 'Classic', difficulty = 'medium' } = state;

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
    const [protectedTimer, setProtectedTimer] = useState(0);
    const [tickCount, setTickCount] = useState(0); // for ghost exit

    // Live refs (avoid stale closure in setInterval)
    const ref = useRef({});
    useEffect(() => {
        ref.current = { pacman, ghosts, dots, pills, score, lives, phase, frightenedTimer, protectedTimer, mapGrid, tickCount };
    });

    const snd = useRef({});
    useEffect(() => {
        snd.current = {
            playWinSound, playLoseSound, playPacmanWakaSound,
            playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound
        };
    }, [playWinSound, playLoseSound, playPacmanWakaSound, playPacmanPowerPillSound, playPacmanEatGhostSound, playPacmanDieSound]);

    const nextDir = useRef({ x: -1, y: 0 }); // LEFT
    const totalDotsRef = useRef(0); // track initial dot count for ghost release

    const initGame = useCallback(() => {
        const raw = ALL_MAPS[mapType] ?? CLASSIC;
        const { grid, dots: d, pills: p, pStart } = parseMap(raw);
        setMapGrid(grid);
        setPacman({ ...pStart, startX: pStart.x, startY: pStart.y, dir: { x: -1, y: 0 }, isProtected: false });
        setDots(d); setPills(p);
        totalDotsRef.current = d.size;

        // Compute dot thresholds based on difficulty
        // Index matches GHOST_STARTS order: 0=Blinky, 1=Pinky, 2=Inky, 3=Clyde
        const total = d.size;
        const ghostDotThresholds =
            difficulty === 'hard'
                ? [0, Math.floor(total * 0.10), Math.floor(total * 0.20), Math.floor(total * 0.30)]
                : /* medium */
                [0, Math.floor(total * 0.20), Math.floor(total * 0.40), Math.floor(total * 0.60)];
        // Blinky (index 0) = 0 → immediate (always outside)
        // Pinky/Inky/Clyde use dot threshold

        setGhosts(GHOST_STARTS.map((g, i) => {
            const threshold = ghostDotThresholds[i] ?? 9999;
            const immediate = threshold === 0;
            return {
                ...g, startX: g.x, startY: g.y,
                state: immediate ? (g.id === 'PINKY' ? 'exiting' : 'chase') : 'house',
                dotThreshold: threshold,
                fallbackDelay: 9999, // difficulty modes use dot-only logic, no time fallback
            };
        }));

        setScore(0); setLives(3); setFrightenedTimer(0); setProtectedTimer(0); setTickCount(0);
        nextDir.current = { x: -1, y: 0 };
        setPhase('ready');
        try { playPacmanStartSound(); } catch (e) { }
        setTimeout(() => setPhase('playing'), 2000);
    }, [mapType, difficulty, playPacmanStartSound]);

    useEffect(() => { initGame(); }, [mapType]); // eslint-disable-line

    useEffect(() => {
        const m = { ArrowUp: DIRS.UP, ArrowDown: DIRS.DOWN, ArrowLeft: DIRS.LEFT, ArrowRight: DIRS.RIGHT };
        const h = e => {
            if (e.key === ' ' && (ref.current.phase === 'over' || ref.current.phase === 'won')) {
                e.preventDefault();
                handleRestart();
                return;
            }
            if (m[e.key]) { e.preventDefault(); nextDir.current = m[e.key]; }
        };
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

            const passable = (x, y, forGhost = false) => {
                const nx = (x + cols) % cols;
                if (y < 0 || y >= rows) return false;
                const c = grid[y][nx];
                if (c === 'W' || c === '|') return false;
                if (c === 'H' || c === '_' || c === '-') return forGhost;
                return true;
            };

            // Move Pacman
            let np = { ...s.pacman, prevX: s.pacman.x, prevY: s.pacman.y };
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
            // Only flip on real scatter/chase mode transitions (NOT on power pill)
            const modeFlip = (gm !== prevGm);

            const newGhosts = s.ghosts.map(g => {
                let cg = { ...g, prevX: g.x, prevY: g.y };

                // Spawning Logic: classic arcade rules
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
                        cg.state = 'chase'; // immediate transition
                    } else {
                        const step = chooseDirectionClassic(cg, gateOut, grid, true);
                        if (step) { cg.dir = step; cg.x = (cg.x + step.x + cols) % cols; cg.y += step.y; }
                        return cg;
                    }
                }

                // Reverse direction only — no position update (prevents teleport)
                if (modeFlip && cg.state !== 'dead') {
                    const rev = { x: -cg.dir.x, y: -cg.dir.y };
                    const rx = (cg.x + rev.x + cols) % cols, ry = cg.y + rev.y;
                    const canRev = ry >= 0 && ry < rows && grid[ry][rx] !== 'W' && grid[ry][rx] !== '|';
                    if (canRev) cg.dir = rev; // direction only, position unchanged
                }

                if (isFr && cg.state !== 'dead') cg.state = 'frightened';
                else if (!isFr && cg.state === 'frightened') cg.state = 'chase';
                else if (cg.state !== 'dead') cg.state = gm.toLowerCase();

                if (cg.state === 'dead' && cg.x === 13 && cg.y === 14) cg.state = 'exiting';

                // SLO-MO Logic: Frightened ghosts move at 50% speed (every even tick)
                const isFrightened = cg.state === 'frightened';
                const shouldMove = !isFrightened || (tc % 2 === 0);

                // Pathfinding Target
                let target = { x: np.x, y: np.y };

                if (cg.state === 'dead') {
                    target = { x: 13, y: 14 }; // House interior
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
                    if (isFrightened) {
                        cg.dir = getRandomDir(cg, grid);
                    } else {
                        cg.dir = chooseDirectionClassic(cg, target, grid, cg.state === 'dead' || cg.state === 'exiting');
                    }
                    cg.x = (cg.x + cg.dir.x + cols) % cols;
                    cg.y += cg.dir.y;
                }
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
                                ...g,
                                x: g.startX,
                                y: g.startY,
                                dir: initG.dir,
                                state: g.dotThreshold === 0 ? (g.id === 'PINKY' ? 'exiting' : 'chase') : 'house'
                            };
                        }));
                        setFrightenedTimer(0);
                        setProtectedTimer(12);
                        setPhase('ready');
                        try { playPacmanStartSound(); } catch (e) { }
                        setTimeout(() => setPhase('playing'), 2000);
                    }
                }, 1200);
                // CRITICAL: Do NOT use 'np' which contains the next-tile jump
                setGhosts(finalGhosts);
                return;
            }

            setPacman(np); setGhosts(finalGhosts);
            setDots(newDots); setPills(newPills);
            setFrightenedTimer(newFr);
            setProtectedTimer(newProt);
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
    const isProtected = protectedTimer > 0;

    return (
        <div className="glass-panel" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'stretch',
            width: 'fit-content', height: 'fit-content',
            maxHeight: '94vh', maxWidth: '98vw',
            margin: 'auto',
            padding: '1.2rem',
            boxSizing: 'border-box', gap: '1.5rem',
            overflow: 'hidden', minWidth: 0,
            background: 'rgba(23, 23, 33, 0.85)',
            backdropFilter: 'blur(25px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        }}>
            {/* ── BOARD ── */}
            <div style={{
                position: 'relative',
                height: 'min(85vh, 800px)',
                width: 'min(calc(85vh * 0.9), 720px)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%', height: '100%',
                    display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`,
                    background: '#000', borderRadius: '4px', boxSizing: 'border-box'
                }}>
                    {mapGrid.map((row, y) => row.map((cell, x) => {
                        const isWall = cell === 'W' || cell === '|';
                        const isGate = cell === 'H' || cell === '-';
                        return (
                            <div key={`c${x}${y}`} style={{
                                background: isWall ? '#1e3a8a' : isGate ? '#78350f' : '#000',
                                border: isWall ? '0.5px solid #1e40af' : 'none', boxSizing: 'border-box'
                            }} />
                        );
                    }))}

                    {Array.from(dots).map(k => {
                        const [x, y] = k.split(',').map(Number); return (
                            <div key={`d${k}`} style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                            }}>
                                <div style={{ width: '35%', height: '35%', background: '#fbbf24', borderRadius: '50%' }} />
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
                                <div style={{
                                    width: '70%', height: '70%', background: '#ef4444', borderRadius: '50%',
                                    animation: 'pacPulse 0.6s infinite alternate', position: 'relative',
                                    boxShadow: '0 0 10px rgba(239,68,68,0.5)'
                                }}>
                                    <div style={{ position: 'absolute', top: '-25%', left: '40%', width: '20%', height: '40%', background: '#22c55e', borderRadius: '4px', transform: 'rotate(20deg)' }} />
                                </div>
                            </div>
                        );
                    })}

                    {ghosts.map(g => {
                        const fr = g.state === 'frightened';
                        const flash = fr && frightenedTimer < 8 && frightenedTimer % 2 === 0;
                        const skipTrans = Math.abs(g.x - (g.prevX ?? g.x)) > 1;
                        return (
                            <div key={g.id} style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(g.x / cols) * 100}%`, top: `${(g.y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 10,
                                transition: skipTrans ? 'none' : `left ${fr ? 0.3 : 0.1}s linear, top ${fr ? 0.3 : 0.1}s linear`,
                                pointerEvents: 'none'
                            }}>
                                <GhostArt
                                    color={g.color}
                                    dir={g.dir}
                                    state={g.state}
                                    frightenedFlash={flash}
                                    size='95%'
                                />
                            </div>
                        );
                    })}

                    {/* Pacman */}
                    {(() => {
                        const skipTrans = Math.abs(pacman.x - (pacman.prevX ?? pacman.x)) > 1;
                        return (
                            <div style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(pacman.x / cols) * 100}%`, top: `${(pacman.y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 11, transition: (isDying || skipTrans) ? 'none' : 'left 0.1s linear,top 0.1s linear',
                                pointerEvents: 'none',
                                animation: isDying ? 'pacDie 1.2s forwards' : isProtected ? 'pacFlash 0.25s infinite' : undefined
                            }}>
                                <svg width='88%' height='88%' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'
                                    style={{
                                        transform: `rotate(${pacman.dir.x === 1 ? 0 : pacman.dir.y === 1 ? 90 : pacman.dir.x === -1 ? 180 : -90}deg)`,
                                        display: 'block'
                                    }}>
                                    {/* Pacman body — mouth animated via SMIL */}
                                    <path fill='#fbbf24' d='M14,14 L28,5 A13,13 0 1,0 28,23 Z'>
                                        {!isDying && !isProtected && (
                                            <animate
                                                attributeName='d'
                                                values='M14,14 L28,5 A13,13 0 1,0 28,23 Z;M14,14 L28,13 A13,13 0 1,0 28,15 Z'
                                                dur='0.25s'
                                                repeatCount='indefinite'
                                                calcMode='linear'
                                            />
                                        )}
                                    </path>
                                </svg>
                            </div>
                        );
                    })()}

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
                            <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} onClick={handleRestart}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RotateCcw size={24} /> Chơi Lại
                                </div>
                                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>(Phím Space)</span>
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeft size={18} /> Về Sảnh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── SIDEBAR ── */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.8rem',
                width: '240px', flexShrink: 0, height: '100%', overflowY: 'auto'
            }}>

                <div style={{ padding: 'clamp(0.8rem,1.5vw,1.2rem)', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Map</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{mapType}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Độ khó</span>
                            <span style={{ fontWeight: 700, fontSize: '0.72rem', color: difficulty === 'hard' ? '#ef4444' : '#f59e0b' }}>
                                {difficulty === 'hard' ? '🔥 Khó' : '⚡ TB'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Chấm còn</span>
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>{dots.size}</span>
                        </div>
                        {totalDotsRef.current > 0 && (() => {
                            const eaten = totalDotsRef.current - dots.size;
                            const pct = Math.round((eaten / totalDotsRef.current) * 100);
                            return (
                                <div style={{ marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                        <span>Ăn được</span><span>{pct}%</span>
                                    </div>
                                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: '3px',
                                            width: `${pct}%`,
                                            background: pct >= 60 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#4ade80',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Ghosts</div>
                    {ghosts.map(g => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                            <div style={{ width: 18, height: 18, flexShrink: 0 }}>
                                <GhostArt color={g.color} dir={g.dir} state={g.state} size='100%' frightenedFlash={false} />
                            </div>
                            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{g.id[0] + g.id.slice(1).toLowerCase()}</span>
                            <span style={{ fontSize: '0.65rem' }}>
                                {g.state === 'frightened' ? '😱' : g.state === 'dead' ? '💀' : g.state === 'house' ? '🏠' : g.state === 'exiting' ? '🚪' : '🎯'}
                            </span>
                        </div>
                    ))}
                </div>

                {frightenedTimer > 0 && (
                    <div style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(29,78,216,0.5)', background: 'rgba(29,78,216,0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginBottom: '2px' }}>⚡ POWER</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa' }}>{frightenedTimer}</div>
                    </div>
                )}

                {isProtected && phase === 'playing' && (
                    <div style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)' }}>
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
