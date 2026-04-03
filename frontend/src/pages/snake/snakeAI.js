export const INITIAL_SPEED = 180;
export const MAX_SPEED = 60;
export const DASH_COOLDOWN = 3000;
export const DASH_DISTANCE = 3;

export function bfsReachable(start, occupied, mapSize) {
    const q = [start], vis = new Set([`${start.x},${start.y}`]);
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    while (q.length) {
        const c = q.shift();
        for (const d of dirs) {
            const nx = c.x + d.x, ny = c.y + d.y, k = `${nx},${ny}`;
            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize && !occupied.has(k) && !vis.has(k)) { vis.add(k); q.push({ x: nx, y: ny }); }
        }
    }
    return vis;
}

export function spawnItem(snakes, deadBodies, mapSize, blockedCells) {
    const occ = new Set();
    snakes.forEach(s => s.forEach(p => occ.add(`${p.x},${p.y}`)));
    deadBodies.forEach(p => occ.add(`${p.x},${p.y}`));
    if (blockedCells) blockedCells.forEach(k => occ.add(k));
    const valid = [];
    for (let y = 0; y < mapSize; y++) for (let x = 0; x < mapSize; x++) if (!occ.has(`${x},${y}`)) valid.push({ x, y });
    return valid.length ? valid[Math.floor(Math.random() * valid.length)] : { x: 0, y: 0 };
}

export function computeBlockedCells(g, mapSize) {
    const occ = new Set();
    g.deadBodies.forEach(b => occ.add(`${b.x},${b.y}`));
    g.snake.forEach(s => occ.add(`${s.x},${s.y}`));
    if (g.botSnake) g.botSnake.forEach(s => occ.add(`${s.x},${s.y}`));
    const all = new Set();
    for (let y = 0; y < mapSize; y++) for (let x = 0; x < mapSize; x++) if (!occ.has(`${x},${y}`)) all.add(`${x},${y}`);
    if (!all.size) return new Set();
    const first = [...all][0].split(',').map(Number);
    const reachable = bfsReachable({ x: first[0], y: first[1] }, occ, mapSize);
    const blocked = new Set();
    for (const k of all) if (!reachable.has(k)) blocked.add(k);
    return blocked;
}

export function performDash(g, mapSize, isBot = false) {
    const snake = isBot ? g.botSnake : g.snake;
    const dir = isBot ? g.botDirection : (g.nextDir || g.direction);
    const ck = isBot ? 'botDashCooldownEnd' : 'dashCooldownEnd';
    const fk = isBot ? 'botDashFlash' : 'dashFlash';
    const now = performance.now();
    if (g[ck] && now < g[ck]) return 'cooldown';
    const score = isBot ? g.botScore : g.score;
    if (score < 5) return 'too_short';
    const h = snake[0];

    for (let i = 1; i <= DASH_DISTANCE; i++) {
        const nx = h.x + dir.x * i, ny = h.y + dir.y * i;
        if (nx < 0 || nx >= mapSize || ny < 0 || ny >= mapSize) return 'wall';
        if (g.deadBodies.some(b => b.x === nx && b.y === ny)) return 'wall';
    }
    const newHead = { x: h.x + dir.x * DASH_DISTANCE, y: h.y + dir.y * DASH_DISTANCE };
    const other = isBot ? g.snake : g.botSnake;
    if (other && other.length && other.some(s => s.x === newHead.x && s.y === newHead.y)) return 'dead';

    const newSnake = [
        { x: h.x + dir.x * 3, y: h.y + dir.y * 3 },
        { x: h.x + dir.x * 2, y: h.y + dir.y * 2 },
        { x: h.x + dir.x, y: h.y + dir.y },
        { x: h.x, y: h.y },
    ];
    const detached = snake.slice(1);
    g.deadBodies = [...g.deadBodies, ...detached];
    if (isBot) {
        g.botSnake = newSnake;
        g.botScore = 2;
    } else {
        g.snake = newSnake;
        g.score = 2;
    }
    g[ck] = now + DASH_COOLDOWN;
    g[fk] = now + 300;
    return 'ok';
}

export function astar(start, target, occ, ms, oppDir = null) {
    const open = [{ ...start, g: 0, h: Math.abs(start.x - target.x) + Math.abs(start.y - target.y), p: null }];
    const closed = new Set();
    while (open.length) {
        let minIndex = 0;
        let minF = open[0].g + open[0].h;
        for (let i = 1; i < open.length; i++) {
            const f = open[i].g + open[i].h;
            if (f < minF) { minF = f; minIndex = i; }
        }
        const c = open[minIndex];
        open.splice(minIndex, 1);
        const k = `${c.x},${c.y}`;
        if (c.x === target.x && c.y === target.y) {
            const path = []; let t = c; while (t.p) { path.push({ x: t.x - t.p.x, y: t.y - t.p.y }); t = t.p; } return path.reverse();
        }
        closed.add(k);
        for (const d of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]) {
            if (c.p === null && oppDir && d.x === oppDir.x && d.y === oppDir.y) continue;
            const nx = c.x + d.x, ny = c.y + d.y, nk = `${nx},${ny}`;
            if (nx >= 0 && nx < ms && ny >= 0 && ny < ms && !occ.has(nk) && !closed.has(nk)) {
                const g2 = c.g + 1, h2 = Math.abs(nx - target.x) + Math.abs(ny - target.y);
                const ex = open.find(o => o.x === nx && o.y === ny);
                if (!ex) open.push({ x: nx, y: ny, g: g2, h: h2, p: c }); else if (g2 < ex.g) { ex.g = g2; ex.p = c; }
            }
        }
    } return null;
}
