const { EVENTS } = require('../utils/constants');
const { BATTLE_CITY_MAPS } = require('../data/tankStages');

const MAP_COLS = 26;
const MAP_ROWS = 26;
const TANK_SIZE = 1.8;
const TANK_SPEED_BASIC = 0.15;
const TANK_SPEED_FAST = 0.25;
const BULLET_SPEED_BASIC = 0.4;
const BULLET_SPEED_FAST = 0.6;

const TILE_MAP = {
    '.': 0, '#': 1, '@': 2, '~': 3, '%': 4, '-': 5
};

class TankServer {
    constructor(level = 1) {
        this.status = 'playing';
        this.intervalId = null;
        this.level = level;
        this.currentMapIndex = Math.min(level, BATTLE_CITY_MAPS.length - 1);
        this.map = this.parseMap(BATTLE_CITY_MAPS[this.currentMapIndex]);
        this.baseId = 'base';
        this.base = { x: 12, y: 24, w: 2, h: 2, destroyed: false };
        this.players = {};
        this.enemies = {};
        this.bullets = [];
        this.items = {};
        
        this.enemySpawnPoints = [ {x:0,y:0}, {x:12,y:0}, {x:24,y:0} ];
        this.enemySpawnQueue = 20;
        this.enemiesOnScreen = 0;
        this.lastEnemySpawnTime = 0;
        this.enemyIdCounter = 0;
        this.itemIdCounter = 0;
    }

    nextLevel() {
        this.level++;
        this.currentMapIndex = Math.min(this.level, BATTLE_CITY_MAPS.length - 1);
        this.map = this.parseMap(BATTLE_CITY_MAPS[this.currentMapIndex]);
        this.base = { x: 12, y: 24, w: 2, h: 2, destroyed: false };
        this.enemies = {};
        this.bullets = [];
        this.items = {};
        this.enemySpawnQueue = 20;
        this.enemiesOnScreen = 0;
        this.status = 'playing';
        this.lastEnemySpawnTime = 0;
        this.enemyIdCounter = 0;
        this.itemIdCounter = 0;
    }

    parseMap(strArr) {
        const m = [];
        for (let r = 0; r < MAP_ROWS; r++) {
            const row = [];
            for (let c = 0; c < MAP_COLS; c++) {
                row.push(TILE_MAP[strArr[r][c]] || 0);
            }
            m.push(row);
        }
        return m;
    }

    addPlayer(id, spawnIdx) {
        const spawns = [ {x: 8, y: 24}, {x: 16, y: 24} ];
        const sp = spawns[spawnIdx % 2];
        this.players[id] = {
            id, type: 'player', isCPU: false,
            x: sp.x, y: sp.y, w: TANK_SIZE, h: TANK_SIZE,
            dir: 'up', speed: TANK_SPEED_BASIC,
            lives: 3, hp: 1, invulnerableTime: Date.now() + 3000,
            starLevel: 0, // 0: basic, 1: fast bullet, 2: 2 bullets, 3: armor piercing
        };
    }

    spawnEnemy() {
        if (this.enemySpawnQueue <= 0 || this.enemiesOnScreen >= 4) return;
        const now = Date.now();
        if (now - this.lastEnemySpawnTime < 3000) return;
        
        const sp = this.enemySpawnPoints[this.enemySpawnQueue % 3];
        // Check if spawn point is occupied
        if (this.checkTankCollisions(sp.x, sp.y, TANK_SIZE, TANK_SIZE, 'dummy')) {
            return; // point occupied, try again next tick
        }
        
        let randType = Math.random();
        let eType = 'basic';
        let hp = 1, spd = TANK_SPEED_BASIC;
        let isFlashing = Math.random() < 0.2; // 20% drops item

        if (randType < 0.5) { eType = 'basic'; }
        else if (randType < 0.75) { eType = 'fast'; spd = TANK_SPEED_FAST; }
        else if (randType < 0.9) { eType = 'power'; }
        else { eType = 'armor'; hp = 4; }

        const eid = 'cpu_' + (++this.enemyIdCounter);
        this.enemies[eid] = {
            id: eid, type: eType, isCPU: true,
            x: sp.x, y: sp.y, w: TANK_SIZE, h: TANK_SIZE,
            dir: 'down', speed: spd, hp: hp,
            isFlashing: isFlashing,
            lastShootTime: 0, lastTurnTime: now
        };
        
        this.enemySpawnQueue--;
        this.enemiesOnScreen++;
        this.lastEnemySpawnTime = now;
    }

    rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    checkWallCollision(x, y, w, h, tank) {
        // Bounds
        if (x < 0 || x + w > MAP_COLS || y < 0 || y + h > MAP_ROWS) return true;
        
        // Grid tiles
        const sr = Math.floor(y), er = Math.floor(y + h - 0.01);
        const sc = Math.floor(x), ec = Math.floor(x + w - 0.01);
        
        for (let r = sr; r <= er; r++) {
            for (let c = sc; c <= ec; c++) {
                if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
                    const t = this.map[r][c];
                    // 1: Brick, 2: Stone, 3: Water (Blocks tanks)
                    if (t === 1 || t === 2 || (t === 3 && !tank.canCrossWater)) return true;
                }
            }
        }

        // Check base
        if (!this.base.destroyed && this.rectIntersect(x, y, w, h, this.base.x, this.base.y, this.base.w, this.base.h)) {
            return true;
        }

        return false;
    }

    checkTankCollisions(x, y, w, h, ignoreId) {
        const allTanks = [...Object.values(this.players), ...Object.values(this.enemies)];
        for (const t of allTanks) {
            if (t.id === ignoreId || t.hp <= 0) continue;
            // Use smaller collision box to avoid edge cases
            if (this.rectIntersect(x + 0.1, y + 0.1, w - 0.2, h - 0.2, t.x + 0.1, t.y + 0.1, t.w - 0.2, t.h - 0.2)) return true;
        }
        return false;
    }

    moveTank(tank, targetX, targetY, force = false) {
        // For players, validate on server side
        if (!force) {
            if (!this.checkWallCollision(targetX, targetY, tank.w, tank.h, tank) &&
                !this.checkTankCollisions(targetX, targetY, tank.w, tank.h, tank.id)) {
                tank.x = targetX;
                tank.y = targetY;
                return true;
            }
            return false;
        }
        // For AI or forced moves
        tank.x = targetX;
        tank.y = targetY;
        return true;
    }

    updateAI(now, io, roomId) {
        this.spawnEnemy();

        const targets = [
            { x: this.base.x, y: this.base.y, w: 2, h: 2 }, // Base
            ...Object.values(this.players).filter(p => p.hp > 0).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h }))
        ];

        for (let eid in this.enemies) {
            const e = this.enemies[eid];
            if (e.hp <= 0) continue;

            // 1. Line of Sight Shooting Logic
            let shouldShoot = false;
            for (let t of targets) {
                const centerX = t.x + t.w/2;
                const centerY = t.y + t.h/2;
                const myCenterX = e.x + e.w/2;
                const myCenterY = e.y + e.h/2;

                if (e.dir === 'up' && Math.abs(myCenterX - centerX) < 1.5 && centerY < myCenterY) shouldShoot = true;
                if (e.dir === 'down' && Math.abs(myCenterX - centerX) < 1.5 && centerY > myCenterY) shouldShoot = true;
                if (e.dir === 'left' && Math.abs(myCenterY - centerY) < 1.5 && centerX < myCenterX) shouldShoot = true;
                if (e.dir === 'right' && Math.abs(myCenterY - centerY) < 1.5 && centerX > myCenterX) shouldShoot = true;
                
                if (shouldShoot) break;
            }

            // Normal random fire + LOS fire
            const fireCooldown = e.type === 'power' ? 800 : 1500;
            if (now - e.lastShootTime > fireCooldown && (shouldShoot || Math.random() < 0.02)) {
                e.lastShootTime = now;
                
                // Calculate bullet spawn position based on direction (from gun, not center)
                let bx = e.x + e.w/2 - 0.25;
                let by = e.y + e.h/2 - 0.25;
                const barrelOffset = e.w * 0.5;
                if (e.dir === 'up') by -= barrelOffset;
                else if (e.dir === 'down') by += barrelOffset;
                else if (e.dir === 'left') bx -= barrelOffset;
                else if (e.dir === 'right') bx += barrelOffset;
                
                this.bullets.push({
                    ownerId: e.id, isCPU: true,
                    x: bx, y: by,
                    dir: e.dir, type: e.type === 'power' ? 'fast' : 'basic',
                    speed: e.type === 'power' ? BULLET_SPEED_FAST : BULLET_SPEED_BASIC
                });
                io.to(roomId).emit(EVENTS.TANK_SHOOT, { ownerId: e.id, x: bx, y: by, dir: e.dir });
            }

            // 2. Movement & Intelligence
            let nx = e.x, ny = e.y;
            if (e.dir === 'up') ny -= e.speed;
            else if (e.dir === 'down') ny += e.speed;
            else if (e.dir === 'left') nx -= e.speed;
            else if (e.dir === 'right') nx += e.speed;

            const moved = this.moveTank(e, nx, ny, false);

            // Change direction if stuck OR randomly (more frequent for fast tanks)
            const turnFreq = e.type === 'fast' ? 0.08 : 0.03;
            if (!moved || (now - e.lastTurnTime > 1500 && Math.random() < turnFreq)) {
                e.lastTurnTime = now;
                
                // Smart Pathfinding: Weigh choices towards the Base (12, 24)
                const dirs = ['up', 'down', 'left', 'right'];
                let weights = [1, 1, 1, 1]; // up, down, left, right
                
                // Target the eagle base at (12, 24)
                if (e.y < 24) weights[1] += 3; // weight DOWN
                if (e.x < 12) weights[3] += 2; // weight RIGHT
                if (e.x > 12) weights[2] += 2; // weight LEFT
                
                // If stuck, try to go around - add extra weight to opposite direction
                if (!moved) {
                    if (e.dir === 'down' || e.dir === 'up') { weights[2] += 5; weights[3] += 5; }
                    else { weights[0] += 5; weights[1] += 5; }
                    
                    // Try to find a clear direction by testing small movements
                    for (let testDir of dirs) {
                        let tx = e.x, ty = e.y;
                        if (testDir === 'up') ty -= 0.5;
                        else if (testDir === 'down') ty += 0.5;
                        else if (testDir === 'left') tx -= 0.5;
                        else if (testDir === 'right') tx += 0.5;
                        
                        if (!this.checkWallCollision(tx, ty, e.w, e.h, e) && 
                            !this.checkTankCollisions(tx, ty, e.w, e.h, e.id)) {
                            // Found a clear direction - boost its weight significantly
                            if (testDir === 'up') weights[0] += 20;
                            else if (testDir === 'down') weights[1] += 20;
                            else if (testDir === 'left') weights[2] += 20;
                            else if (testDir === 'right') weights[3] += 20;
                        }
                    }
                }

                // Avoid other enemies - add negative weights for occupied paths
                for (let otherId in this.enemies) {
                    if (otherId === eid) continue;
                    const other = this.enemies[otherId];
                    if (other.hp <= 0) continue;
                    
                    const dx = other.x - e.x;
                    const dy = other.y - e.y;
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                        // Horizontal collision - avoid going same direction
                        if (dx > 0) weights[3] -= 3; // right blocked
                        else weights[2] -= 3; // left blocked
                    } else {
                        // Vertical collision
                        if (dy > 0) weights[1] -= 3; // down blocked
                        else weights[0] -= 3; // up blocked
                    }
                }
                
                // Weighted random pick
                let total = weights.reduce((a, b) => a + Math.max(0, b), 0);
                if (total <= 0) total = 1; // Fallback
                
                let rand = Math.random() * total;
                for (let i = 0; i < dirs.length; i++) {
                    if (weights[i] > 0 && rand < weights[i]) {
                        e.dir = dirs[i];
                        break;
                    }
                    rand -= Math.max(0, weights[i]);
                }

                // Grid Snapping helper: alignment to 0.5 units helps path through narrow 1-tile bricks
                e.x = Math.round(e.x * 2) / 2;
                e.y = Math.round(e.y * 2) / 2;
            }
        }
    }

    updateBullets(io, roomId) {
        this.bullets = this.bullets.filter(b => {
            b.x += (b.dir === 'left' ? -b.speed : b.dir === 'right' ? b.speed : 0);
            b.y += (b.dir === 'up' ? -b.speed : b.dir === 'down' ? b.speed : 0);

            // Bounds
            let bw = 0.5, bh = 0.5;
            if (b.x < 0 || b.x > MAP_COLS || b.y < 0 || b.y > MAP_ROWS) return false;

            // Hit Map
            const r = Math.floor(b.y), c = Math.floor(b.x);
            if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
                const t = this.map[r][c];
                if (t === 1 || t === 2) {
                    if (t === 1) this.map[r][c] = 0; // Destroy brick
                    else if (t === 2 && b.pierce) this.map[r][c] = 0; // Destroy stone if pierce
                    io.to(roomId).emit(EVENTS.TANK_EXPLOSION, { x: b.x, y: b.y, isSmall: true });
                    return false;
                }
            }

            // Hit Base
            if (!this.base.destroyed && this.rectIntersect(b.x, b.y, bw, bh, this.base.x, this.base.y, this.base.w, this.base.h)) {
                this.base.destroyed = true;
                this.status = 'finished';
                io.to(roomId).emit(EVENTS.TANK_EXPLOSION, { x: this.base.x + 1, y: this.base.y + 1, isBase: true });
                return false;
            }

            // Hit Tanks
            const allTanks = [...Object.values(this.players), ...Object.values(this.enemies)];
            for (const t of allTanks) {
                if (t.hp > 0 && t.id !== b.ownerId && b.isCPU !== t.isCPU) {
                    if (this.rectIntersect(b.x, b.y, bw, bh, t.x, t.y, t.w, t.h)) {
                        // Ignore if invulnerable
                        if (t.isCPU || Date.now() > t.invulnerableTime) {
                            t.hp -= 1;
                            io.to(roomId).emit(EVENTS.TANK_EXPLOSION, { x: t.x + 1, y: t.y + 1 });
                            if (t.hp <= 0 && t.isCPU) {
                                this.enemiesOnScreen--;
                                if (t.isFlashing) this.spawnItem();
                            } else if (t.hp <= 0 && !t.isCPU) {
                                t.lives -= 1;
                                t.starLevel = 0;
                                if (t.lives > 0) {
                                    // Respawn logic
                                    t.hp = 1;
                                    t.invulnerableTime = Date.now() + 3000;
                                    // Reset pos
                                    t.x = Object.keys(this.players).indexOf(t.id) === 0 ? 8 : 16;
                                    t.y = 24;
                                } else {
                                    // Check if all players dead
                                    if (Object.values(this.players).every(p => p.lives <= 0)) {
                                        this.status = 'finished';
                                    }
                                }
                            }
                        }
                        return false;
                    }
                }
            }

            return true;
        });

        // Check level win - advance to next level
        if (this.enemySpawnQueue === 0 && this.enemiesOnScreen === 0 && this.status === 'playing') {
            io.to(roomId).emit(EVENTS.TANK_EXPLOSION, { x: 12, y: 24, isBase: true });
            // Check if there are more levels
            if (this.level < BATTLE_CITY_MAPS.length) {
                this.nextLevel();
                // Notify client about level advance
                io.to(roomId).emit(EVENTS.TANK_GAME_STARTED, {
                    roomId,
                    map: this.map,
                    players: this.players,
                    level: this.level,
                    isLevelComplete: true
                });
            } else {
                this.status = 'win'; // All levels completed
            }
        }
    }

    spawnItem() {
        const types = ['star', 'grenade', 'helmet', 'tank', 'clock', 'shovel'];
        const t = types[Math.floor(Math.random() * types.length)];
        const id = 'item_' + (++this.itemIdCounter);
        // Random blank space
        let c, r;
        do {
            c = Math.floor(Math.random() * (MAP_COLS - 2));
            r = Math.floor(Math.random() * (MAP_ROWS - 2));
        } while(this.map[r][c] !== 0);

        this.items[id] = { id, type: t, x: c, y: r, w: 1.5, h: 1.5 };
    }

    checkItems() {
        for (let pid in this.players) {
            const p = this.players[pid];
            if (p.hp <= 0) continue;
            for (let iid in this.items) {
                const item = this.items[iid];
                if (this.rectIntersect(p.x, p.y, p.w, p.h, item.x, item.y, item.w, item.h)) {
                    // Collect item
                    this.applyItem(p, item.type);
                    delete this.items[iid];
                }
            }
        }
    }

    applyItem(player, type) {
        if (type === 'star') {
            player.starLevel = Math.min(3, player.starLevel + 1);
        } else if (type === 'helmet') {
            player.invulnerableTime = Date.now() + 10000;
        } else if (type === 'tank') {
            player.lives++;
        } else if (type === 'grenade') {
            for (let eid in this.enemies) {
                this.enemies[eid].hp = 0;
                this.enemiesOnScreen--;
            }
        } else if (type === 'clock') {
            for (let eid in this.enemies) {
                this.enemies[eid].lastTurnTime = Date.now() + 5000;
            }
        } else if (type === 'shovel') {
            const surrounds = [[23,11],[23,12],[23,13],[23,14], [24,11],[24,14], [25,11],[25,14]];
            for (let s of surrounds) {
                this.map[s[0]][s[1]] = 2; // Stone
            }
            setTimeout(() => {
                if(this.status !== 'playing') return;
                for (let s of surrounds) {
                    if(this.map[s[0]][s[1]] === 2) this.map[s[0]][s[1]] = 1; // back to brick
                }
            }, 10000);
        }
    }
}

const startTankGameLoop = (roomId, io, roomManager) => {
    const rooms = roomManager.getAllRooms();
    const room = rooms[roomId];
    if (!room || !room.tankState) return;

    const loop = () => {
        const server = room.tankState;
        if (server.status === 'finished' || server.status === 'win') {
            io.to(roomId).emit(EVENTS.TANK_GAME_STATE, {
                players: server.players, enemies: server.enemies,
                bullets: server.bullets, items: server.items,
                base: server.base, status: server.status, map: server.map
            });
            if (server.intervalId) clearInterval(server.intervalId);
            return;
        }

        const now = Date.now();
        server.updateAI(now, io, roomId);
        server.updateBullets(io, roomId);
        server.checkItems();

        io.to(roomId).emit(EVENTS.TANK_GAME_STATE, {
            players: server.players,
            enemies: server.enemies,
            bullets: server.bullets,
            items: server.items,
            base: server.base,
            status: server.status,
            map: server.map, // Map might change if destroyed
            enemiesLeft: server.enemySpawnQueue + server.enemiesOnScreen
        });
    };

    room.tankState.intervalId = setInterval(loop, 1000 / 20); // 20 FPS — stays under server rate limit (20 events/sec)
};

const registerTankHandler = (io, socket, roomManager) => {
    socket.on(EVENTS.TANK_UPDATE, ({ roomId, x, y, dir }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        const rooms = roomManager.getAllRooms();
        const room = rooms[actualRoomId];
        if (room && room.tankState && room.tankState.players[socket.id]) {
            const tank = room.tankState.players[socket.id];
            if (tank.hp > 0 && room.tankState.status === 'playing') {
                // Validate the movement - check for wall collisions and tank collisions
                const dx = Math.abs(x - tank.x);
                const dy = Math.abs(y - tank.y);
                const maxMove = TANK_SPEED_BASIC * 6; // Increased to 0.9 to prevent lag/high-FPS rubberbanding
                
                // If move is too large, it's likely cheating or lag - clamp it
                let newX = x;
                let newY = y;
                if (dx > maxMove || dy > maxMove) {
                    // Keep old position, just update direction
                    newX = tank.x;
                    newY = tank.y;
                } else {
                    // Validate wall collision
                    if (!room.tankState.checkWallCollision(x, y, tank.w, tank.h, tank) &&
                        !room.tankState.checkTankCollisions(x, y, tank.w, tank.h, tank.id)) {
                        newX = x;
                        newY = y;
                    } else {
                        // Can't move there, keep old position
                        newX = tank.x;
                        newY = tank.y;
                    }
                }
                
                tank.x = newX;
                tank.y = newY;
                tank.dir = dir;
            }
        }
    });

    socket.on(EVENTS.TANK_SHOOT, ({ roomId, x, y, dir }) => {
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        const rooms = roomManager.getAllRooms();
        const room = rooms[actualRoomId];
        if (room && room.tankState && room.tankState.players[socket.id]) {
            const tank = room.tankState.players[socket.id];
            const server = room.tankState;
            if (tank.hp > 0 && server.status === 'playing') {
                const now = Date.now();
                let cooldown = tank.starLevel >= 1 ? 200 : 300;
                if (!tank.lastShootTime || now - tank.lastShootTime > cooldown) {
                    tank.lastShootTime = now;
                    
                    // Calculate bullet spawn position based on direction (from gun)
                    let bx = x + tank.w/2 - 0.25;
                    let by = y + tank.h/2 - 0.25;
                    const barrelOffset = tank.w * 0.5;
                    if (dir === 'up') by -= barrelOffset;
                    else if (dir === 'down') by += barrelOffset;
                    else if (dir === 'left') bx -= barrelOffset;
                    else if (dir === 'right') bx += barrelOffset;
                    
                    server.bullets.push({
                        ownerId: socket.id, isCPU: false,
                        x: bx, y: by,
                        dir: dir,
                        type: tank.starLevel >= 1 ? 'fast' : 'basic',
                        speed: tank.starLevel >= 1 ? BULLET_SPEED_FAST : BULLET_SPEED_BASIC,
                        pierce: tank.starLevel >= 3
                    });
                    socket.to(actualRoomId).emit(EVENTS.TANK_SHOOT, { ownerId: socket.id, x: bx, y: by, dir });
                }
            }
        }
    });

    socket.on(EVENTS.START_TANK_GAME, ({ roomId, level }) => {
        const rooms = roomManager.getAllRooms();
        const actualRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        let room = rooms[actualRoomId];

        if (!room && actualRoomId.startsWith('local_')) {
            socket.join(actualRoomId);
            rooms[actualRoomId] = {
                id: actualRoomId,
                gameType: 'tank',
                players: [socket.id]
            };
            room = rooms[actualRoomId];
        }

        if (room && room.gameType === 'tank') {
            socket.join(actualRoomId);

            if (!room.tankState || (room.tankState.status !== 'playing' && room.tankState.status !== 'win')) {
                if (room.tankState && room.tankState.intervalId) {
                    clearInterval(room.tankState.intervalId);
                }

                const startLevel = level || 1;
                room.tankState = new TankServer(startLevel);
                
                let idx = 0;
                for (let pid of room.players) {
                    if (pid && pid !== 'CPU') {
                        room.tankState.addPlayer(pid, idx++);
                    }
                }

                setTimeout(() => {
                    startTankGameLoop(actualRoomId, io, roomManager);
                }, 1000);
            }

            io.to(actualRoomId).emit(EVENTS.TANK_GAME_STARTED, { 
                roomId: actualRoomId, 
                map: room.tankState.map,
                players: room.tankState.players,
                level: room.tankState.level,
                maxLevel: BATTLE_CITY_MAPS.length
            });
        }
    });
    // Clean up tank game loop on disconnect
    socket.on('disconnect', () => {
        const rooms = roomManager.getAllRooms();
        for (const rId in rooms) {
            const room = rooms[rId];
            if (room && room.tankState && room.tankState.players && room.tankState.players[socket.id]) {
                if (room.tankState.intervalId) {
                    clearInterval(room.tankState.intervalId);
                    room.tankState.intervalId = null;
                }
                break;
            }
        }
    });
};

module.exports = registerTankHandler;
module.exports.startTankGameLoop = startTankGameLoop;
